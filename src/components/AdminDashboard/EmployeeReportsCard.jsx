import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Download, FileText, Loader2, Plus, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { createEmployeeReport, getEmployeeReports } from '@/lib/employeeReportService';

const REPORT_TYPES = ['Warning', 'Incident', 'Performance Issue', 'Attendance', 'Customer Complaint', 'Safety Issue', 'Conduct', 'Other'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Final Warning'];
const ACTIONS = ['Verbal Warning', 'Written Warning', 'Suspension', 'Training Required', 'No Action', 'Other'];
const STATUSES = ['Open', 'Under Review', 'Resolved', 'Closed'];
const EMPTY_FORM = {
  report_type: '', reason: '', description: '', date_issued: '', incident_date: '', severity_level: '',
  action_taken: '', follow_up_required: null, follow_up_date: '', employee_response: '', status: '',
};

const optionalValue = (value) => value || '__none__';
const fromOptionalValue = (value) => value === '__none__' ? '' : value;

const SelectField = ({ id, label, value, onChange, options }) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <Select value={optionalValue(value)} onValueChange={(nextValue) => onChange(fromOptionalValue(nextValue))}>
      <SelectTrigger id={id}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">Not specified</SelectItem>
        {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);

const severityClassName = {
  Low: 'border-blue-200 bg-blue-50 text-blue-700',
  Medium: 'border-amber-200 bg-amber-50 text-amber-700',
  High: 'border-orange-200 bg-orange-50 text-orange-700',
  'Final Warning': 'border-red-200 bg-red-50 text-red-700',
};

const EmployeeReportsCard = ({ employee, adminProfile, canManage }) => {
  const { toast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState([]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      setReports(await getEmployeeReports(employee.id));
    } catch (error) {
      toast({ title: 'Unable to Load Reports', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [employee.id, toast]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const openDialog = () => {
    setForm(EMPTY_FORM);
    setFiles([]);
    setOpen(true);
  };

  const saveReport = async () => {
    setSaving(true);
    try {
      await createEmployeeReport({
        employee,
        adminProfile,
        values: {
          ...form,
          report_type: form.report_type || null,
          reason: form.reason.trim() || null,
          description: form.description.trim() || null,
          date_issued: form.date_issued || null,
          incident_date: form.incident_date || null,
          severity_level: form.severity_level || null,
          action_taken: form.action_taken || null,
          follow_up_date: form.follow_up_required === true ? form.follow_up_date || null : null,
          employee_response: form.employee_response.trim() || null,
          status: form.status || null,
        },
        files,
      });
      setOpen(false);
      await loadReports();
      toast({ title: 'Report Generated', description: 'The employee record and PDF were saved.' });
    } catch (error) {
      toast({ title: 'Unable to Create Report', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="min-w-0 max-w-full rounded-2xl border-0 bg-white shadow-sm lg:col-span-12">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900"><AlertTriangle className="h-4 w-4 text-amber-500" /> Reports &amp; Warnings</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Formal employee reports, warnings, and supporting evidence</p>
          </div>
          {canManage && <Button size="sm" onClick={openDialog} className="shrink-0 rounded-xl"><Plus className="mr-1.5 h-4 w-4" /> Create Report</Button>}
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div> : reports.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {reports.map((report) => <article key={report.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{report.reason || report.report_type || 'Employee Report'}</p><p className="mt-1 text-xs text-slate-400">{report.date_issued || new Date(report.created_at).toLocaleDateString()}</p></div>
                  {report.severity_level && <Badge variant="outline" className={severityClassName[report.severity_level]}>{report.severity_level}</Badge>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">{report.report_type && <Badge variant="secondary">{report.report_type}</Badge>}{report.status && <Badge variant="outline">{report.status}</Badge>}</div>
                {report.description && <p className="mt-3 line-clamp-3 text-sm text-slate-600">{report.description}</p>}
                <p className="mt-3 text-xs text-slate-400">Issued by {report.issued_by_name || 'Administrator'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {report.pdf_url && <Button asChild size="sm" variant="outline" className="h-8"><a href={report.pdf_url} target="_blank" rel="noreferrer"><Download className="mr-1.5 h-3.5 w-3.5" /> PDF</a></Button>}
                  {canManage && report.attachments.map((attachment) => <Button key={attachment.path} asChild size="sm" variant="ghost" className="h-8 max-w-full"><a href={attachment.url} target="_blank" rel="noreferrer"><FileText className="mr-1.5 h-3.5 w-3.5" /><span className="max-w-32 truncate">{attachment.name}</span></a></Button>)}
                </div>
              </article>)}
            </div>
          ) : <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">No reports or warnings recorded.</div>}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(nextOpen) => !saving && setOpen(nextOpen)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>Create Report or Warning</DialogTitle><DialogDescription>All report fields are optional. Issued By is filled from your signed-in administrator account.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <SelectField id="report-type" label="Type of Report" value={form.report_type} onChange={(value) => updateField('report_type', value)} options={REPORT_TYPES} />
            <div className="space-y-2"><Label htmlFor="report-reason">Reason</Label><Input id="report-reason" value={form.reason} onChange={(event) => updateField('reason', event.target.value)} placeholder="Short title or summary" /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="report-description">Description / Details</Label><Textarea id="report-description" rows={5} value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Full explanation of what happened" /></div>
            <div className="space-y-2"><Label htmlFor="date-issued">Date Issued</Label><Input id="date-issued" type="date" value={form.date_issued} onChange={(event) => updateField('date_issued', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="incident-date">Incident Date</Label><Input id="incident-date" type="date" value={form.incident_date} onChange={(event) => updateField('incident_date', event.target.value)} /></div>
            <SelectField id="severity-level" label="Severity Level" value={form.severity_level} onChange={(value) => updateField('severity_level', value)} options={SEVERITIES} />
            <SelectField id="action-taken" label="Action Taken" value={form.action_taken} onChange={(value) => updateField('action_taken', value)} options={ACTIONS} />
            <SelectField id="follow-up-required" label="Follow-up Required" value={form.follow_up_required === null ? '' : form.follow_up_required ? 'Yes' : 'No'} onChange={(value) => updateField('follow_up_required', value === '' ? null : value === 'Yes')} options={['Yes', 'No']} />
            <div className="space-y-2"><Label htmlFor="follow-up-date">Follow-up Date</Label><Input id="follow-up-date" type="date" value={form.follow_up_date} onChange={(event) => updateField('follow_up_date', event.target.value)} disabled={form.follow_up_required !== true} /></div>
            <div className="space-y-2"><Label>Issued By</Label><Input value={adminProfile?.full_name || adminProfile?.email || 'Administrator'} readOnly className="bg-slate-50" /></div>
            <SelectField id="report-status" label="Status" value={form.status} onChange={(value) => updateField('status', value)} options={STATUSES} />
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="employee-response">Employee Response / Notes</Label><Textarea id="employee-response" rows={3} value={form.employee_response} onChange={(event) => updateField('employee_response', event.target.value)} placeholder="Optional employee response or notes" /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="report-evidence">Attachment / Evidence</Label><Input id="report-evidence" type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={(event) => setFiles(Array.from(event.target.files || []))} /><p className="text-xs text-slate-500"><Upload className="mr-1 inline h-3.5 w-3.5" />Photos, screenshots, PDFs, or documents. {files.length ? `${files.length} selected.` : ''}</p></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button><Button onClick={saveReport} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{saving ? 'Generating PDF...' : 'Generate & Save PDF'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmployeeReportsCard;
