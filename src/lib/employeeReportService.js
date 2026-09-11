import jsPDF from 'jspdf';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';

const BUCKET = 'employee-documents';
const COMPANY_ADDRESS = 'Block 213, Road 51, Building 564, Flat 21, Muharraq, Bahrain';
const COMPANY_CR = 'CR: 183715-1';
const RECORD_NOTICE = 'This letter serves as a formal record of the matter described below. It is issued to ensure the relevant details are properly documented and acknowledged by all parties involved.';

const displayValue = (value) => {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return value || 'Not specified';
};

const loadLogo = async () => {
  try {
    const response = await fetch('/web-app-manifest-192x192.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const generateEmployeeReportPdf = async ({ employee, report, attachmentNames }) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await loadLogo();
  if (logo) pdf.addImage(logo, 'PNG', 16, 12, 24, 24);
  pdf.setTextColor(24, 119, 242);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('READY NEST', 46, 20);
  pdf.setTextColor(70, 70, 70);
  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(COMPANY_ADDRESS, 46, 26);
  pdf.text(COMPANY_CR, 46, 31);
  pdf.setDrawColor(24, 119, 242);
  pdf.line(16, 40, 194, 40);

  pdf.setTextColor(25, 35, 50);
  pdf.setFontSize(15);
  pdf.setFont('helvetica', 'bold');
  pdf.text('EMPLOYEE REPORT / WARNING', 105, 51, { align: 'center' });
  pdf.setFontSize(9.5);
  pdf.setFont('helvetica', 'normal');
  const noticeLines = pdf.splitTextToSize(RECORD_NOTICE, 178);
  pdf.text(noticeLines, 16, 60);

  let y = 60 + noticeLines.length * 4.5 + 7;
  const rows = [
    ['Employee', employee.full_name || employee.email],
    ['Employee ID', employee.id],
    ['Type of Report', report.report_type],
    ['Reason', report.reason],
    ['Description / Details', report.description],
    ['Date Issued', report.date_issued],
    ['Incident Date', report.incident_date],
    ['Severity Level', report.severity_level],
    ['Action Taken', report.action_taken],
    ['Follow-up Required', report.follow_up_required],
    ['Follow-up Date', report.follow_up_date],
    ['Issued By', report.issued_by_name],
    ['Employee Response / Notes', report.employee_response],
    ['Attachment / Evidence', attachmentNames.length ? attachmentNames.join(', ') : null],
    ['Status', report.status],
  ];

  rows.forEach(([label, value]) => {
    const valueLines = pdf.splitTextToSize(displayValue(value), 122);
    const rowHeight = Math.max(8, valueLines.length * 4.5 + 3);
    if (y + rowHeight > 268) {
      pdf.addPage();
      y = 18;
    }
    pdf.setFillColor(246, 248, 251);
    pdf.rect(16, y - 4.5, 178, rowHeight, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(label, 19, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(valueLines, 69, y);
    y += rowHeight + 2;
  });

  if (y > 235) {
    pdf.addPage();
    y = 25;
  } else {
    y += 12;
  }
  pdf.setFont('helvetica', 'normal');
  pdf.text('Employee Signature', 25, y + 22);
  pdf.text('Issued By Signature', 125, y + 22);
  pdf.line(20, y + 17, 85, y + 17);
  pdf.line(115, y + 17, 180, y + 17);
  pdf.setFontSize(8);
  pdf.text('Date: ____________________', 20, y + 30);
  pdf.text('Date: ____________________', 115, y + 30);
  return pdf.output('blob');
};

export const getEmployeeReports = async (employeeId) => {
  const { data, error } = await supabase.from('employee_reports').select('*').eq('employee_id', employeeId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((report) => ({
    ...report,
    pdf_url: report.pdf_path ? supabase.storage.from(BUCKET).getPublicUrl(report.pdf_path).data.publicUrl : null,
    attachments: (report.attachment_paths || []).map((item) => ({ ...item, url: supabase.storage.from(BUCKET).getPublicUrl(item.path).data.publicUrl })),
  }));
};

export const createEmployeeReport = async ({ employee, adminProfile, values, files }) => {
  const reportId = uuidv4();
  const folder = `${employee.id}/reports/${reportId}`;
  const attachmentPaths = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
    const path = `${folder}/evidence-${uuidv4()}-${safeName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) throw error;
    attachmentPaths.push({ name: file.name, path, type: file.type, size: file.size });
  }

  const report = {
    ...values,
    id: reportId,
    employee_id: employee.id,
    issued_by: adminProfile?.id || null,
    issued_by_name: adminProfile?.full_name || adminProfile?.email || 'Administrator',
    attachment_paths: attachmentPaths,
  };
  const pdfBlob = await generateEmployeeReportPdf({ employee, report, attachmentNames: files.map((file) => file.name) });
  const pdfPath = `${folder}/employee-report-${reportId}.pdf`;
  const { error: pdfError } = await supabase.storage.from(BUCKET).upload(pdfPath, pdfBlob, { upsert: false, contentType: 'application/pdf' });
  if (pdfError) throw pdfError;

  const { data, error } = await supabase.from('employee_reports').insert({ ...report, pdf_path: pdfPath }).select().single();
  if (error) throw error;
  return data;
};
