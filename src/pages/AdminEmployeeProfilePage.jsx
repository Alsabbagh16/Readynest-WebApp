import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    findEmployeeById, 
    updateEmployee, 
    uploadEmployeeDocumentFile, 
    getEmployeeDocumentsList, 
    deleteEmployeeDocumentFile 
} from '@/lib/storage/employeeStorage';
import { getBookingsByEmployeeId } from '@/lib/storage/bookingStorage';
import {
    getJobsByEmployeeId,
    getPartTimeApplicationsByEmployee,
    getPartTimePayoutsByEmployee,
    settlePartTimePayout,
    undoPartTimePayoutSettlement,
    updatePartTimePayoutAmount,
} from '@/lib/storage/jobStorage';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Check, ChevronDown, Edit3, ShieldAlert, Trash2, Download, MessageCircle, Plus, File, Pencil, Undo2, X } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import EmployeeDialog from '@/components/AdminDashboard/EmployeeDialog';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

const formatDateSafe = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return format(date, 'MMMM d, yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
};

const formatDateTimeSafe = (dateString) => {
    if (!dateString) return 'Flexible';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Flexible';
      return format(date, 'MMM d, yyyy - h:mm a');
    } catch (error) {
      return 'Flexible';
    }
};

const formatCurrency = (amount) => `${Number(amount || 0).toFixed(3)} BD`;

const getDateInputValue = (date) => format(date, 'yyyy-MM-dd');

const getCurrentMonthStartInput = () => {
    const today = new Date();
    return getDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1));
};

const getCurrentMonthEndInput = () => {
    const today = new Date();
    return getDateInputValue(new Date(today.getFullYear(), today.getMonth() + 1, 0));
};

const getCurrentDayInput = () => getDateInputValue(new Date());

const formatHours = (hours) => {
    const numericHours = Number(hours || 0);
    return `${numericHours.toFixed(numericHours % 1 ? 1 : 0)}h`;
};

const getJobHours = (service) => {
    const hoursValue = service?.hours_needed
        ?? service?.duration_hours
        ?? service?.estimated_hours
        ?? service?.service_hours
        ?? 0;
    const parsedHours = Number(hoursValue);
    return Number.isFinite(parsedHours) && parsedHours > 0 ? parsedHours : 0;
};

const filterServicesByDateRange = (services, startDateInput, endDateInput) => {
    const startDate = startDateInput ? new Date(`${startDateInput}T00:00:00`) : null;
    const endDate = endDateInput ? new Date(`${endDateInput}T23:59:59.999`) : null;

    return services.filter((service) => {
        const serviceDate = new Date(getServiceDate(service));
        if (Number.isNaN(serviceDate.getTime())) return false;
        if (startDate && serviceDate < startDate) return false;
        if (endDate && serviceDate > endDate) return false;
        return true;
    });
};

const sumServiceHours = (services) => (
    services.reduce((total, service) => total + getJobHours(service), 0)
);

const buildHoursMetric = (services) => ({
    hours: sumServiceHours(services),
    jobs: services.length,
});

const getInitials = (name) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
};

const getServiceDate = (service) => service.preferred_date || service.booking_date || service.date || service.created_at;

const isCompletedService = (service) => {
    const status = String(service.service_status || service.status || '').toLowerCase();
    return status.includes('completed') || status.includes('done');
};

const getTimelineDetailPath = (service) => (
    service.source_type === 'job'
        ? `/admin-dashboard/job/${service.job_ref_id}`
        : `/admin-dashboard/service/${service.id}`
);

const normalizeBookingAssignment = (booking) => ({
    ...booking,
    source_type: 'booking',
    timeline_id: `booking-${booking.id}`,
    service_type: booking.service_type || booking.product_name || 'Booking',
    contact_name: booking.contact_name || booking.customerName || 'Client',
    contact_address: booking.contact_address || booking.address || 'N/A',
});

const normalizeJobAssignment = (job) => ({
    ...job,
    source_type: 'job',
    timeline_id: `job-${job.job_ref_id || job.id}`,
    service_type: job.product_name || job.purchase?.product_name || 'Service Job',
    contact_name: job.user_name || job.customerName || 'Client',
    contact_address: job.user_address?.city || job.user_address?.street || job.address || 'N/A',
});

const DetailField = ({ label, value }) => (
    <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value || 'N/A'}</p>
    </div>
);

const MobileSectionToggle = ({ title, isOpen, onToggle }) => (
    <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left lg:hidden"
        onClick={onToggle}
        aria-expanded={isOpen}
    >
        <span className="text-sm font-bold text-slate-900">{title}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
);

const ProfileSkeleton = () => (
    <div className="min-h-screen w-full min-w-0 max-w-full overflow-x-hidden bg-slate-50 p-3 sm:p-6">
        <div className="grid min-w-0 gap-5 lg:grid-cols-12">
            {[...Array(5)].map((_, index) => (
                <div
                    key={index}
                    className={`h-64 animate-pulse rounded-2xl bg-white shadow-sm ${index === 3 ? 'lg:col-span-9' : 'lg:col-span-3'}`}
                />
            ))}
        </div>
    </div>
);

const EmployeeDocumentsManager = ({ employeeId, initialDocuments = [], onDocumentsUpdate, canManage }) => {
    const { toast } = useToast();
    const fileInputRef = useRef(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [currentDocuments, setCurrentDocuments] = useState(initialDocuments);
    const [isUploading, setIsUploading] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    useEffect(() => {
        setCurrentDocuments(initialDocuments);
    }, [initialDocuments]);

    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files);
        setSelectedFiles(prev => [...prev, ...files.filter(f => f.size <= 5 * 1024 * 1024)]); // Max 5MB
        if (files.some(f => f.size > 5 * 1024 * 1024)) {
            toast({ title: "File too large", description: "Some files exceed the 5MB limit and were not added.", variant: "warning" });
        }
    };

    const handleRemoveSelectedFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUploadSelectedFiles = async () => {
        if (!canManage) {
            toast({ title: "Permission Denied", description: "You do not have permission to upload documents.", variant: "destructive" });
            return;
        }
        if (selectedFiles.length === 0) {
            toast({ title: "No files selected", description: "Please select files to upload.", variant: "default" });
            return;
        }
        setIsUploading(true);
        const uploadedFileObjects = [];
        try {
            for (const file of selectedFiles) {
                const uploadedFile = await uploadEmployeeDocumentFile(employeeId, file);
                uploadedFileObjects.push({ name: file.name, path: uploadedFile.path, publicURL: uploadedFile.publicURL, filePath: uploadedFile.path, id: uploadedFile.id || uploadedFile.path });
            }
            
            const newDocumentPaths = uploadedFileObjects.map(f => f.path);
            const existingPaths = currentDocuments.map(d => d.filePath || d.path);
            const updatedDocumentUrls = [...existingPaths, ...newDocumentPaths];
            
            await updateEmployee({ id: employeeId, document_urls: updatedDocumentUrls });

            setCurrentDocuments(prev => [...prev, ...uploadedFileObjects]);
            setSelectedFiles([]);
            toast({ title: "Files Uploaded", description: `${uploadedFileObjects.length} file(s) uploaded successfully.` });
            if (onDocumentsUpdate) onDocumentsUpdate();
        } catch (error) {
            console.error("Error uploading files:", error);
            toast({ title: "File Upload Error", description: `Could not upload files: ${error.message}`, variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteDocument = async (filePathToDelete, documentName) => {
        if (!canManage) {
            toast({ title: "Permission Denied", description: "You do not have permission to delete documents.", variant: "destructive" });
            return;
        }
        if (!window.confirm(`Are you sure you want to delete ${documentName}? This action cannot be undone.`)) return;
        
        try {
            await deleteEmployeeDocumentFile(filePathToDelete);
            const updatedDocs = currentDocuments.filter(doc => (doc.filePath || doc.path) !== filePathToDelete);
            setCurrentDocuments(updatedDocs);
            
            const updatedDocumentUrls = updatedDocs.map(d => d.filePath || d.path);
            await updateEmployee({ id: employeeId, document_urls: updatedDocumentUrls });

            toast({ title: "Document Deleted", description: `${documentName} has been deleted.` });
            if (onDocumentsUpdate) onDocumentsUpdate();
        } catch (error) {
            console.error("Error deleting document:", error);
            toast({ title: "Delete Error", description: `Could not delete document: ${error.message}`, variant: "destructive" });
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'File';
        if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} kb`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} mb`;
    };

    return (
        <Card className="order-6 min-w-0 max-w-full rounded-2xl border-0 bg-white shadow-sm lg:order-none">
            <CardHeader className="flex flex-col items-start justify-between gap-3 pb-3 sm:flex-row sm:items-center">
                <MobileSectionToggle title="Files / Documents" isOpen={isMobileOpen} onToggle={() => setIsMobileOpen((isOpen) => !isOpen)} />
                <CardTitle className="hidden text-sm font-bold text-slate-900 lg:block">Files / Documents</CardTitle>
                {canManage && (
                    <div className={`${isMobileOpen ? 'flex' : 'hidden'} w-full flex-wrap items-center gap-2 sm:w-auto lg:flex`}>
                        <Input
                            id={`employee-document-upload-${employeeId}`}
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                            ref={fileInputRef}
                            className="hidden"
                            disabled={isUploading}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="h-8 rounded-xl px-3 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        >
                            <Plus className="mr-1 h-3.5 w-3.5" /> Add files
                        </Button>
                        {selectedFiles.length > 0 && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleUploadSelectedFiles}
                                disabled={isUploading || selectedFiles.length === 0}
                                className="h-8 rounded-xl bg-blue-600 px-3 text-xs hover:bg-blue-700"
                            >
                                {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length}`}
                            </Button>
                        )}
                    </div>
                )}
            </CardHeader>
            <CardContent className={`${isMobileOpen ? 'block' : 'hidden'} space-y-3 lg:block`}>
                {selectedFiles.length > 0 && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                        <p className="mb-2 text-xs font-semibold text-blue-800">Ready to upload</p>
                        <ul className="space-y-2 text-sm">
                            {selectedFiles.map((file, index) => (
                                <li key={index} className="flex items-center justify-between gap-2 text-slate-700">
                                    <span className="truncate">{file.name} ({formatFileSize(file.size)})</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveSelectedFile(index)}
                                        disabled={isUploading}
                                        className="h-7 px-1 text-red-500 hover:text-red-700"
                                    > <Trash2 className="h-4 w-4" /> </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {currentDocuments.length > 0 ? (
                    <ul className="space-y-2">
                        {currentDocuments.map((doc, index) => (
                            <li key={doc.id || index} className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                                <a 
                                    href={doc.publicURL} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex w-full min-w-0 items-center gap-3 text-sm text-slate-700 hover:text-blue-600 sm:w-auto"
                                    title={doc.name}
                                >
                                    <span className="rounded-lg bg-white p-2 text-slate-500 shadow-sm">
                                        <File className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate font-medium">{doc.name}</span>
                                        <span className="text-xs text-slate-400">{formatFileSize(doc.metadata?.size)}</span>
                                    </span>
                                </a>
                                <div className="flex items-center justify-end gap-1">
                                    <Button asChild variant="ghost" size="sm" className="h-8 w-8 px-0 text-slate-400 hover:text-blue-600">
                                        <a href={doc.publicURL} target="_blank" rel="noopener noreferrer" title={`Download ${doc.name}`}>
                                            <Download className="h-4 w-4" />
                                        </a>
                                    </Button>
                                    {canManage && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleDeleteDocument(doc.filePath || doc.path, doc.name)}
                                        className="h-8 w-8 px-0 text-red-400 hover:text-red-600"
                                        title={`Delete ${doc.name}`}
                                    > <Trash2 className="h-4 w-4" /> </Button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                        No documents uploaded yet.
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const EmployeeOtherDetailsCard = ({ employee }) => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <Card className="order-2 min-w-0 max-w-full rounded-2xl border-0 bg-white shadow-sm lg:order-none">
            <CardHeader className="pb-3">
                <MobileSectionToggle title="Other Details" isOpen={isMobileOpen} onToggle={() => setIsMobileOpen((isOpen) => !isOpen)} />
                <CardTitle className="hidden text-sm font-bold text-slate-900 lg:block">Other Details</CardTitle>
            </CardHeader>
            <CardContent className={`${isMobileOpen ? 'block' : 'hidden'} lg:block`}>
                <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                    <DetailField label="Origin Country" value={employee.origin} />
                    <DetailField label="Date of Birth" value={formatDateSafe(employee.date_of_birth)} />
                    <DetailField label="Passport Number" value={employee.passport_number} />
                    <DetailField label="Passport Issue" value={formatDateSafe(employee.passport_issue_date)} />
                    <DetailField label="Passport Expiry" value={formatDateSafe(employee.passport_expiry_date)} />
                    <DetailField label="Visa Number" value={employee.visa_number} />
                    <DetailField label="Visa Issued" value={formatDateSafe(employee.visa_issuance_date)} />
                    <DetailField label="Visa Expiry" value={formatDateSafe(employee.visa_expiry_date)} />
                    <div className="col-span-2">
                        <DetailField label="Address" value={employee.address} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const EmployeeIdentityCard = ({ employee, pastJobsCount, upcomingJobsCount, showMessaging = true }) => {
    const employmentType = employee.is_part_timer ? 'Part-Time' : 'Regular';
    const status = employee.role === 'suspended' || employee.status === 'suspended' ? 'Suspended' : 'Active';
    const whatsAppPhone = String(employee.mobile || '').replace(/[^\d]/g, '');
    const whatsAppHref = whatsAppPhone
        ? `https://wa.me/${whatsAppPhone}?text=${encodeURIComponent(`Hi ${employee.full_name || ''}, this is ReadyNest.`)}`
        : null;

    return (
        <Card className="order-1 min-w-0 max-w-full rounded-2xl border-0 bg-white shadow-sm lg:order-none lg:col-span-3">
            <CardContent className="p-5">
                <div className="flex flex-col items-center text-center">
                    <Avatar className="h-20 w-20 rounded-2xl border border-slate-100 shadow-sm">
                        <AvatarImage src={employee.photo_url || undefined} alt={employee.full_name || 'Employee'} />
                        <AvatarFallback className="rounded-2xl bg-blue-50 text-xl font-bold text-blue-700">
                            {getInitials(employee.full_name)}
                        </AvatarFallback>
                    </Avatar>
                    <h1 className="mt-4 text-lg font-bold text-slate-950">{employee.full_name || 'Employee'}</h1>
                    <p className="max-w-full break-all text-sm text-slate-400">{employee.email || 'No email'}</p>
                </div>

                <div className="my-5 grid grid-cols-2 divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50 py-4 text-center">
                    <div>
                        <p className="text-2xl font-bold text-slate-950">{pastJobsCount}</p>
                        <p className="text-xs text-slate-400">Past Jobs</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-950">{upcomingJobsCount}</p>
                        <p className="text-xs text-slate-400">Upcoming Jobs</p>
                    </div>
                </div>

                {showMessaging && <Button asChild={Boolean(whatsAppHref)} className="h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold hover:bg-blue-700">
                    {whatsAppHref ? (
                        <a href={whatsAppHref} target="_blank" rel="noreferrer">
                            <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp Employee
                        </a>
                    ) : (
                        <span>Send Message</span>
                    )}
                </Button>}

                <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-slate-100 pt-5">
                    <DetailField label="Gender" value={employee.sex} />
                    <DetailField label="Mobile Number" value={employee.mobile} />
                    <DetailField label="Joining Date" value={formatDateSafe(employee.hire_date || employee.created_at)} />
                    <DetailField label="Employment Type" value={employmentType} />
                    <DetailField label="Status" value={status} />
                    <DetailField label="Position" value={employee.position || (employee.is_part_timer ? 'Part Timer' : 'Employee')} />
                </div>
            </CardContent>
        </Card>
    );
};

const EmployeeNotesCard = ({ notes, noteDraft, setNoteDraft, onSaveNote, canManage, savingNote }) => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
    <Card className="order-7 min-w-0 max-w-full rounded-2xl border-0 bg-white shadow-sm lg:order-none">
        <CardHeader className="pb-3">
            <MobileSectionToggle title="Admin / Internal Notes" isOpen={isMobileOpen} onToggle={() => setIsMobileOpen((isOpen) => !isOpen)} />
            <div className="hidden flex-row items-center justify-between lg:flex">
                <CardTitle className="text-sm font-bold text-slate-900">Admin / Internal Notes</CardTitle>
                <span className="text-xs font-medium text-blue-600">See all</span>
            </div>
        </CardHeader>
        <CardContent className={`${isMobileOpen ? 'flex' : 'hidden'} min-h-[320px] flex-col lg:flex`}>
            <div className="max-h-36 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4">
                {notes.length > 0 ? notes.map((note, index) => (
                    <div key={`${note.created_at || index}-${index}`} className="rounded-xl bg-white p-3 shadow-sm">
                        <p className="text-sm leading-6 text-slate-700">{note.text || note}</p>
                        <p className="mt-2 text-[11px] text-slate-400">{formatDateTimeSafe(note.created_at)}</p>
                    </div>
                )) : (
                    <p className="text-sm text-slate-500">No internal notes yet.</p>
                )}
            </div>
            <div className="mt-4 space-y-3">
                <Textarea
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    placeholder="Add performance, scheduling, or HR note..."
                    className="min-h-[86px] resize-none rounded-2xl border-slate-200 bg-white"
                    disabled={!canManage}
                />
                <div className="flex justify-end">
                    <Button onClick={onSaveNote} disabled={!canManage || savingNote || !noteDraft.trim()} className="rounded-xl bg-blue-600 px-5 hover:bg-blue-700">
                        {savingNote ? 'Saving...' : 'Save note'}
                    </Button>
                </div>
            </div>
        </CardContent>
    </Card>
    );
};

const HoursWorkedCard = ({
    activeMetric,
    filterMode,
    rangeStartDate,
    rangeEndDate,
    setFilterMode,
    setRangeStartDate,
    setRangeEndDate,
    showFilters = true,
}) => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
    <Card className="order-3 min-w-0 max-w-full rounded-2xl border-0 bg-white shadow-sm lg:order-none">
        <CardHeader className="pb-3">
            <MobileSectionToggle title="Hours Worked" isOpen={isMobileOpen} onToggle={() => setIsMobileOpen((isOpen) => !isOpen)} />
            <CardTitle className="hidden text-sm font-bold text-slate-900 lg:block">Hours Worked</CardTitle>
        </CardHeader>
        <CardContent className={`${isMobileOpen ? 'block' : 'hidden'} space-y-4 lg:block`}>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">
                            {filterMode === 'all' ? 'All Time' : filterMode === 'range' ? 'Date Range' : 'This Month'}
                        </p>
                        <p className="mt-2 flex flex-wrap items-baseline text-4xl font-bold text-blue-700">
                            {formatHours(activeMetric.hours)}
                            <span className="ml-2 text-base font-semibold text-blue-500">
                                {activeMetric.jobs} Job{activeMetric.jobs === 1 ? '' : 's'}
                            </span>
                        </p>
                    </div>
                    {showFilters && <div className="grid grid-cols-3 rounded-xl border border-blue-100 bg-white p-1 text-xs font-semibold text-slate-500 shadow-sm">
                        {[
                            ['monthly', 'Monthly'],
                            ['range', 'Range'],
                            ['all', 'All Time'],
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setFilterMode(value)}
                                className={`rounded-lg px-3 py-2 transition ${
                                    filterMode === value
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'hover:bg-blue-50 hover:text-blue-700'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>}
                </div>
            </div>
            {showFilters && filterMode === 'range' && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="hours-range-start">Range start</label>
                        <Input
                            id="hours-range-start"
                            type="date"
                            value={rangeStartDate}
                            onChange={(event) => setRangeStartDate(event.target.value)}
                            className="h-10 rounded-xl border-slate-200 bg-white"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="hours-range-end">Range end</label>
                        <Input
                            id="hours-range-end"
                            type="date"
                            value={rangeEndDate}
                            onChange={(event) => setRangeEndDate(event.target.value)}
                            className="h-10 rounded-xl border-slate-200 bg-white"
                        />
                    </div>
                </div>
            )}
            <p className="text-xs leading-5 text-slate-400">
                Totals use assigned jobs and the jobs.hours_needed value.
            </p>
        </CardContent>
    </Card>
    );
};

const getActivityCellClassName = (jobs) => {
    if (jobs >= 8) return 'bg-red-500';
    if (jobs === 7) return 'bg-orange-500';
    if (jobs === 6) return 'bg-yellow-400';
    if (jobs === 5) return 'bg-blue-700';
    if (jobs >= 3) return 'bg-blue-500';
    if (jobs >= 1) return 'bg-blue-200';
    return 'bg-slate-100';
};

const normalizeDateOnly = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const buildActivityDays = ({ data, filterMode, rangeEndDate, rangeStartDate }) => {
    const jobsByDay = new Map(data.map((point) => [point.dayKey, point.jobs]));
    const today = normalizeDateOnly(new Date());
    let startDate = null;
    let endDate = null;

    if (filterMode === 'monthly') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (filterMode === 'range') {
        startDate = rangeStartDate ? normalizeDateOnly(new Date(`${rangeStartDate}T00:00:00`)) : null;
        endDate = rangeEndDate ? normalizeDateOnly(new Date(`${rangeEndDate}T00:00:00`)) : null;
    } else if (data.length > 0) {
        startDate = normalizeDateOnly(new Date(`${data[0].dayKey}T00:00:00`));
        endDate = normalizeDateOnly(new Date(`${data[data.length - 1].dayKey}T00:00:00`));
    }

    if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return [];
    }

    if (startDate > endDate) {
        [startDate, endDate] = [endDate, startDate];
    }

    const days = [];
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
        const dayKey = format(cursor, 'yyyy-MM-dd');
        days.push({
            dayKey,
            label: format(cursor, 'MMM d'),
            jobs: jobsByDay.get(dayKey) || 0,
        });
        cursor.setDate(cursor.getDate() + 1);
    }

    return days;
};

const ActivityGraph = ({ data, filterMode, rangeEndDate, rangeStartDate }) => {
    const activityDays = buildActivityDays({ data, filterMode, rangeEndDate, rangeStartDate });
    const leadingEmptyCells = activityDays.length > 0 ? new Array(new Date(`${activityDays[0].dayKey}T00:00:00`).getDay()).fill(null) : [];
    const cells = [...leadingEmptyCells, ...activityDays];
    const weeks = [];

    for (let index = 0; index < cells.length; index += 7) {
        weeks.push(cells.slice(index, index + 7));
    }

    const monthLabels = weeks.map((week, weekIndex) => {
        const firstDayInWeek = week.find(Boolean);
        if (!firstDayInWeek) return '';

        const currentMonth = firstDayInWeek.dayKey.slice(0, 7);
        const previousWeek = weeks[weekIndex - 1] || [];
        const previousDay = previousWeek.find(Boolean);
        const previousMonth = previousDay?.dayKey?.slice(0, 7);

        return weekIndex === 0 || currentMonth !== previousMonth
            ? format(new Date(`${firstDayInWeek.dayKey}T00:00:00`), 'MMM')
            : '';
    });

    if (activityDays.length === 0) return null;

    return (
        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="text-sm font-bold text-slate-900">Activity Graph</p>
                    <p className="text-xs text-slate-400">Daily completed jobs intensity</p>
                </div>
                <div className="flex items-end gap-2 text-[11px] text-slate-400">
                    {[
                        { jobs: 0, label: '0' },
                        { jobs: 1, label: '1' },
                        { jobs: 3, label: '3' },
                        { jobs: 5, label: '5' },
                        { jobs: 6, label: '6' },
                        { jobs: 7, label: '7' },
                        { jobs: 8, label: '8+' },
                    ].map((item) => (
                        <div key={item.label} className="flex flex-col items-center gap-1">
                            <span>{item.label}</span>
                            <span className={`h-3 w-3 rounded-sm ${getActivityCellClassName(item.jobs)}`} title={`${item.label} jobs`} />
                        </div>
                    ))}
                </div>
            </div>
            <div className="overflow-x-auto">
                <div className="mb-1 flex min-w-max gap-1 pl-0">
                    {monthLabels.map((label, index) => (
                        <span key={`${label || 'blank'}-${index}`} className="h-4 w-4 text-[10px] font-semibold text-slate-400">
                            {label}
                        </span>
                    ))}
                </div>
                <div className="flex min-w-max gap-1">
                    {weeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="grid grid-rows-7 gap-1">
                            {Array.from({ length: 7 }).map((_, dayIndex) => {
                                const day = week[dayIndex];
                                return (
                                    <span
                                        key={`${weekIndex}-${dayIndex}`}
                                        className={`h-4 w-4 rounded-sm ${day ? getActivityCellClassName(day.jobs) : 'bg-transparent'}`}
                                        title={day ? `${day.label}: ${day.jobs} completed job${day.jobs === 1 ? '' : 's'}` : ''}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const PerformanceFilterControls = ({
    filterMode,
    rangeEndDate,
    rangeStartDate,
    setFilterMode,
    setRangeEndDate,
    setRangeStartDate,
    totalJobs,
}) => (
    <>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="flex max-w-full overflow-x-auto rounded-xl bg-white p-1 shadow-sm">
                {[
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'range', label: 'Date Range' },
                    { value: 'all', label: 'All Time' },
                ].map((option) => (
                    <Button
                        key={option.value}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilterMode(option.value)}
                        className={`h-8 rounded-lg px-3 text-xs ${filterMode === option.value ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        {option.label}
                    </Button>
                ))}
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                {totalJobs} jobs total
            </span>
        </div>
        {filterMode === 'range' && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                <div className="w-full space-y-1 sm:w-auto">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">From</p>
                    <Input
                        type="date"
                        value={rangeStartDate}
                        onChange={(event) => setRangeStartDate(event.target.value)}
                            className="h-9 w-full rounded-xl border-slate-200 text-sm sm:w-auto"
                    />
                </div>
                <div className="w-full space-y-1 sm:w-auto">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">To</p>
                    <Input
                        type="date"
                        value={rangeEndDate}
                        onChange={(event) => setRangeEndDate(event.target.value)}
                            className="h-9 w-full rounded-xl border-slate-200 text-sm sm:w-auto"
                    />
                </div>
            </div>
        )}
    </>
);

const PerformanceLineChart = ({
    data,
    filterMode,
    rangeEndDate,
    rangeStartDate,
    setFilterMode,
    setRangeEndDate,
    setRangeStartDate,
}) => {
    const chartWidth = 720;
    const chartHeight = 320;
    const leftPadding = 54;
    const rightPadding = 28;
    const topPadding = 28;
    const bottomPadding = 72;
    const maxJobs = Math.max(1, ...data.map((point) => point.jobs));
    const plotWidth = chartWidth - leftPadding - rightPadding;
    const plotHeight = chartHeight - topPadding - bottomPadding;
    const points = data.map((point, index) => {
        const x = leftPadding + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
        const y = topPadding + plotHeight - (point.jobs / maxJobs) * plotHeight;
        return { ...point, x, y };
    });
    const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
    const yAxisTicks = Array.from({ length: maxJobs + 1 }, (_, index) => index);
    const xAxisY = topPadding + plotHeight;

    return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row">
                <div>
                    <p className="text-sm font-bold text-slate-900">Completed Jobs by Day</p>
                    <p className="text-xs text-slate-400">X axis: days. Y axis: number of jobs done.</p>
                </div>
                <PerformanceFilterControls
                    filterMode={filterMode}
                    rangeEndDate={rangeEndDate}
                    rangeStartDate={rangeStartDate}
                    setFilterMode={setFilterMode}
                    setRangeEndDate={setRangeEndDate}
                    setRangeStartDate={setRangeStartDate}
                    totalJobs={data.reduce((total, point) => total + point.jobs, 0)}
                />
            </div>
            {data.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                    No completed jobs available for this filter.
                </div>
            ) : (
            <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="min-w-[560px] sm:min-w-[680px]">
                    {yAxisTicks.map((tick) => {
                        const y = topPadding + plotHeight - (tick / maxJobs) * plotHeight;
                        return (
                            <g key={tick}>
                                <line x1={leftPadding} y1={y} x2={chartWidth - rightPadding} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                                <text x={leftPadding - 14} y={y + 4} textAnchor="end" className="fill-slate-400 text-[11px]">
                                    {tick}
                                </text>
                            </g>
                        );
                    })}
                    <line x1={leftPadding} y1={topPadding} x2={leftPadding} y2={xAxisY} stroke="#cbd5e1" strokeWidth="1.5" />
                    <line x1={leftPadding} y1={xAxisY} x2={chartWidth - rightPadding} y2={xAxisY} stroke="#cbd5e1" strokeWidth="1.5" />
                    {points.map((point) => (
                        <g key={point.dayKey}>
                            <line x1={point.x} y1={topPadding} x2={point.x} y2={xAxisY} stroke="#f1f5f9" strokeWidth="1" />
                            <text x={point.x} y={xAxisY + 22} textAnchor="middle" className="fill-slate-500 text-[11px] font-medium">
                                {point.label}
                            </text>
                        </g>
                    ))}
                    <polyline points={polylinePoints} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((point) => (
                        <g key={`${point.dayKey}-point`}>
                            <circle cx={point.x} cy={point.y} r="6" fill="#2563eb" />
                            <circle cx={point.x} cy={point.y} r="10" fill="#2563eb" opacity="0.12" />
                            <text x={point.x} y={point.y - 12} textAnchor="middle" className="fill-slate-700 text-[12px] font-semibold">
                                {point.jobs}
                            </text>
                        </g>
                    ))}
                    <text x={(leftPadding + chartWidth - rightPadding) / 2} y={chartHeight - 16} textAnchor="middle" className="fill-slate-500 text-[11px] font-medium">
                        Days
                    </text>
                    <text x="18" y={(topPadding + xAxisY) / 2} textAnchor="middle" transform={`rotate(-90 18 ${(topPadding + xAxisY) / 2})`} className="fill-slate-500 text-[11px] font-medium">
                        Jobs done
                    </text>
                </svg>
            </div>
            )}
        </div>
    );
};

const ActivityGraphPanel = ({
    data,
    filterMode,
    rangeEndDate,
    rangeStartDate,
    setFilterMode,
    setRangeEndDate,
    setRangeStartDate,
}) => {
    const totalJobs = data.reduce((total, point) => total + point.jobs, 0);

    return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row">
                <div>
                    <p className="text-sm font-bold text-slate-900">Activity Graph</p>
                    <p className="text-xs text-slate-400">Daily completed jobs contribution view</p>
                </div>
                <PerformanceFilterControls
                    filterMode={filterMode}
                    rangeEndDate={rangeEndDate}
                    rangeStartDate={rangeStartDate}
                    setFilterMode={setFilterMode}
                    setRangeEndDate={setRangeEndDate}
                    setRangeStartDate={setRangeStartDate}
                    totalJobs={totalJobs}
                />
            </div>
            {data.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                    No completed jobs available for this filter.
                </div>
            ) : (
                <ActivityGraph
                    data={data}
                    filterMode={filterMode}
                    rangeEndDate={rangeEndDate}
                    rangeStartDate={rangeStartDate}
                />
            )}
        </div>
    );
};

const JobTimelineCard = ({
    activeTab,
    currentPage,
    filterMode,
    items,
    pageCount,
    paginatedItems,
    performanceData,
    rangeEndDate,
    rangeStartDate,
    setActiveTab,
    setCurrentPage,
    setFilterMode,
    setRangeEndDate,
    setRangeStartDate,
}) => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const mobileTitle = activeTab === 'completed'
        ? 'Completed Jobs'
        : activeTab === 'performance'
            ? 'Performance Log'
            : activeTab === 'activity'
                ? 'Activity Graph'
                : 'Upcoming Jobs';

    return (
    <Card className="order-4 min-w-0 max-w-full rounded-2xl border-0 bg-white shadow-sm lg:order-none lg:col-span-9">
        <CardHeader className="min-w-0 max-w-full pb-2">
            <MobileSectionToggle title={mobileTitle} isOpen={isMobileOpen} onToggle={() => setIsMobileOpen((isOpen) => !isOpen)} />
            <div className={`${isMobileOpen ? 'block' : 'hidden'} max-w-full overflow-x-auto pt-3 lg:block lg:pt-0`}>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="h-10 min-w-max rounded-xl bg-slate-100 p-1">
                        <TabsTrigger value="upcoming" className="rounded-lg px-3 text-xs sm:px-4">Upcoming Jobs</TabsTrigger>
                        <TabsTrigger value="completed" className="rounded-lg px-3 text-xs sm:px-4">Completed Jobs</TabsTrigger>
                        <TabsTrigger value="performance" className="rounded-lg px-3 text-xs sm:px-4">Performance Log</TabsTrigger>
                        <TabsTrigger value="activity" className="rounded-lg px-3 text-xs sm:px-4">Activity Graph</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </CardHeader>
        <CardContent className={`${isMobileOpen ? 'block' : 'hidden'} lg:block`}>
            {activeTab === 'performance' ? (
                <PerformanceLineChart
                    data={performanceData}
                    filterMode={filterMode}
                    rangeEndDate={rangeEndDate}
                    rangeStartDate={rangeStartDate}
                    setFilterMode={setFilterMode}
                    setRangeEndDate={setRangeEndDate}
                    setRangeStartDate={setRangeStartDate}
                />
            ) : activeTab === 'activity' ? (
                <ActivityGraphPanel
                    data={performanceData}
                    filterMode={filterMode}
                    rangeEndDate={rangeEndDate}
                    rangeStartDate={rangeStartDate}
                    setFilterMode={setFilterMode}
                    setRangeEndDate={setRangeEndDate}
                    setRangeStartDate={setRangeStartDate}
                />
            ) : items.length > 0 ? (
                <>
                    <div className="relative space-y-4 pl-7 before:absolute before:left-3 before:top-3 before:h-[calc(100%-24px)] before:w-px before:bg-blue-100">
                        {paginatedItems.map((service, index) => (
                            <div key={service.timeline_id || service.id || index} className="relative rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                <span className="absolute -left-[25px] top-5 h-4 w-4 rounded-full border-4 border-white bg-blue-500 shadow" />
                                <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto] md:items-center">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{formatDateTimeSafe(getServiceDate(service))}</p>
                                        <p className="text-xs text-slate-400">Date / Time</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{service.service_type || service.product_name || 'Service Job'}</p>
                                        <p className="text-xs text-slate-400">Job Type</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{service.contact_name || service.customerName || 'Client'}</p>
                                        <p className="text-xs text-slate-400">Client Name</p>
                                    </div>
                                    <div>
                                        <p className="truncate text-sm font-semibold text-slate-800">{service.contact_address || service.address || 'N/A'}</p>
                                        <p className="text-xs text-slate-400">Location / Area</p>
                                    </div>
                                    <Button asChild variant="outline" size="sm" className="rounded-xl border-blue-100 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
                                        <Link to={getTimelineDetailPath(service)}>View Details</Link>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <p className="text-xs font-medium text-slate-400">
                            Showing {paginatedItems.length} of {items.length} records
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-xl"
                                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                disabled={currentPage <= 1}
                            >
                                Previous
                            </Button>
                            <span className="text-xs font-semibold text-slate-500">Page {currentPage} of {pageCount}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-xl"
                                onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                                disabled={currentPage >= pageCount}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
                    No records available for this view.
                </div>
            )}
        </CardContent>
    </Card>
    );
};

const EarningsCard = ({ payouts, totalEarned, onSettle, onUndoSettle, onUpdateAmount, payoutActionId }) => {
    const [editingPayoutId, setEditingPayoutId] = useState(null);
    const [amountDraft, setAmountDraft] = useState('');
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const startEditingAmount = (payout) => {
        setEditingPayoutId(payout.applicationId);
        setAmountDraft(String(Number(payout.amount || 0).toFixed(3)));
    };

    const cancelEditingAmount = () => {
        setEditingPayoutId(null);
        setAmountDraft('');
    };

    const saveAmount = async (payout) => {
        const saved = await onUpdateAmount?.(payout, amountDraft);
        if (saved) cancelEditingAmount();
    };

    return (
        <Card className="order-5 min-w-0 max-w-full rounded-2xl border-0 bg-white shadow-sm lg:order-none lg:col-span-3">
            <CardHeader className="pb-3">
                <MobileSectionToggle title="Earnings & Payouts" isOpen={isMobileOpen} onToggle={() => setIsMobileOpen((isOpen) => !isOpen)} />
                <CardTitle className="hidden text-sm font-bold text-slate-900 lg:block">Earnings & Payouts</CardTitle>
            </CardHeader>
            <CardContent className={`${isMobileOpen ? 'block' : 'hidden'} lg:block`}>
                {payouts.length > 0 ? (
                    <div className="space-y-3">
                        {payouts.map((payout) => (
                            <div key={payout.id} className="relative flex min-w-0 items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                                {payout.status === 'Settled' && payout.applicationId && onUndoSettle && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1 h-7 w-7 text-slate-400 hover:text-amber-600"
                                        onClick={() => onUndoSettle(payout)}
                                        disabled={payoutActionId === payout.applicationId}
                                        title="Undo settlement"
                                        aria-label={`Undo settlement for ${payout.jobRefId || payout.description}`}
                                    >
                                        <Undo2 className="h-4 w-4" />
                                    </Button>
                                )}
                                <div className="flex min-w-0 items-center gap-3 pr-5">
                                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${payout.status === 'Settled' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-800">{payout.description}</p>
                                        <p className="text-xs text-slate-400">{payout.status}</p>
                                        {payout.jobRefId && (
                                            <Link
                                                to={`/admin-dashboard/job/${payout.jobRefId}`}
                                                className="mt-1 block text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                                            >
                                                {payout.jobRefId}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                                <div className="flex min-w-0 shrink-0 items-center justify-center gap-2 lg:self-center lg:flex-col lg:items-center lg:gap-1">
                                    {editingPayoutId === payout.applicationId ? (
                                        <div className="flex min-w-0 items-center justify-end gap-1">
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.001"
                                                value={amountDraft}
                                                onChange={(event) => setAmountDraft(event.target.value)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter') saveAmount(payout);
                                                    if (event.key === 'Escape') cancelEditingAmount();
                                                }}
                                                className="h-8 w-24 px-2 text-right text-sm"
                                                autoFocus
                                                aria-label="Payout amount"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-emerald-600"
                                                onClick={() => saveAmount(payout)}
                                                disabled={payoutActionId === payout.applicationId}
                                                title="Save amount"
                                            >
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={cancelEditingAmount} title="Cancel editing">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : payout.applicationId && onUpdateAmount ? (
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 text-sm font-bold text-slate-900 hover:text-blue-600"
                                            onClick={() => startEditingAmount(payout)}
                                            title="Edit earning amount"
                                        >
                                            {formatCurrency(payout.amount)} <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                    ) : (
                                        <p className="text-sm font-bold text-slate-900">{formatCurrency(payout.amount)}</p>
                                    )}
                                    {payout.status === 'Pending' && payout.applicationId && onSettle && editingPayoutId !== payout.applicationId && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="h-8 bg-blue-600 text-white hover:bg-blue-700"
                                            onClick={() => onSettle(payout)}
                                            disabled={payoutActionId === payout.applicationId}
                                        >
                                            {payoutActionId === payout.applicationId ? 'Saving...' : 'Settle'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                        No payout history yet.
                    </div>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-sm font-bold text-slate-900">Total Earned</span>
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(totalEarned)}</span>
                </div>
            </CardContent>
        </Card>
    );
};


const AdminEmployeeProfilePage = ({ employeeId = null, selfService = false }) => {
    const { id: routeEmployeeId } = useParams();
    const id = employeeId || routeEmployeeId;
    const navigate = useNavigate();
    const { toast } = useToast();
    const { adminProfile } = useAdminAuth();

    const [employee, setEmployee] = useState(null);
    const [assignedServices, setAssignedServices] = useState([]);
    const [employeeDocuments, setEmployeeDocuments] = useState([]);
    const [partTimePayouts, setPartTimePayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [formError, setFormError] = useState(null);
    const [timelineTab, setTimelineTab] = useState('upcoming');
    const [timelinePage, setTimelinePage] = useState(1);
    const [performanceFilterMode, setPerformanceFilterMode] = useState('monthly');
    const [performanceRangeStartDate, setPerformanceRangeStartDate] = useState(getCurrentMonthStartInput);
    const [performanceRangeEndDate, setPerformanceRangeEndDate] = useState(getCurrentDayInput);
    const [hoursFilterMode, setHoursFilterMode] = useState('monthly');
    const [hoursRangeStartDate, setHoursRangeStartDate] = useState(getCurrentMonthStartInput);
    const [hoursRangeEndDate, setHoursRangeEndDate] = useState(getCurrentDayInput);
    const [noteDraft, setNoteDraft] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [settlingPayoutId, setSettlingPayoutId] = useState(null);

    const timelinePageSize = 5;

    const canManageEmployees = !selfService && adminProfile && (adminProfile.role === 'admin' || adminProfile.role === 'superadmin');

    const fetchEmployeeData = useCallback(async () => {
        setLoading(true);
        try {
            const empData = await findEmployeeById(id);
            if (empData) {
                setEmployee(empData);
                const [bookings, jobs, partTimeApplications, employeePayouts] = await Promise.all([
                    getBookingsByEmployeeId(id),
                    getJobsByEmployeeId(id),
                    empData.is_part_timer ? getPartTimeApplicationsByEmployee(id) : Promise.resolve([]),
                    !selfService && empData.is_part_timer ? getPartTimePayoutsByEmployee(id) : Promise.resolve([]),
                ]);

                const acceptedPartTimeJobs = (partTimeApplications || [])
                    .filter((application) => application.status === 'accepted')
                    .map((application) => normalizeJobAssignment({
                        ...application,
                        status: application.job_status,
                        service_status: application.job_status,
                    }));
                const normalizedJobs = (jobs || []).map(normalizeJobAssignment);
                const uniqueJobs = Array.from(
                    new Map(
                        [...acceptedPartTimeJobs, ...normalizedJobs]
                            .map((job) => [job.job_ref_id || job.timeline_id, job])
                    ).values()
                );

                setAssignedServices([
                    ...(bookings || []).map(normalizeBookingAssignment),
                    ...uniqueJobs,
                ]);
                setPartTimePayouts(employeePayouts || []);
                const documents = await getEmployeeDocumentsList(id);
                setEmployeeDocuments(documents || []);
            } else {
                toast({ title: "Error", description: "Employee not found.", variant: "destructive" });
                navigate('/admin-dashboard/employees');
            }
        } catch (error) {
            toast({ title: "Error Fetching Data", description: error.message, variant: "destructive" });
            // navigate('/admin-dashboard/employees'); // Keep user on page if some data fails
        } finally {
            setLoading(false);
        }
    }, [id, navigate, selfService, toast]);

    useEffect(() => {
        fetchEmployeeData();
    }, [fetchEmployeeData]);

    useEffect(() => {
        setTimelinePage(1);
    }, [timelineTab]);

    const handleSaveEmployee = async (employeeData) => {
        if (!canManageEmployees) {
            toast({ title: "Permission Denied", description: "You do not have permission to edit employees.", variant: "destructive" });
            return;
        }
        setFormError(null);
        try {
            await updateEmployee(employeeData);
            toast({ title: "Employee Updated", description: `Details for ${employeeData.fullName || employeeData.email} saved.` });
            setIsEditDialogOpen(false);
            fetchEmployeeData(); 
        } catch (error) {
            let errorMessage = error.message || "An unexpected error occurred.";
            toast({ title: "Error Saving Employee", description: errorMessage, variant: "destructive" });
            setFormError(errorMessage);
        }
    };

    const normalizedNotes = useMemo(() => {
        if (!employee?.internal_notes) return [];
        if (Array.isArray(employee.internal_notes)) return employee.internal_notes;
        if (typeof employee.internal_notes === 'string') {
            try {
                const parsedNotes = JSON.parse(employee.internal_notes);
                return Array.isArray(parsedNotes) ? parsedNotes : [];
            } catch (error) {
                return employee.internal_notes ? [{ text: employee.internal_notes, created_at: employee.updated_at }] : [];
            }
        }
        return [];
    }, [employee]);

    const sortedServices = useMemo(() => (
        [...assignedServices].sort((a, b) => new Date(getServiceDate(b) || 0) - new Date(getServiceDate(a) || 0))
    ), [assignedServices]);

    const upcomingJobs = useMemo(() => (
        sortedServices.filter((service) => !isCompletedService(service))
    ), [sortedServices]);

    const completedJobs = useMemo(() => (
        sortedServices.filter(isCompletedService)
    ), [sortedServices]);

    const assignedJobsWithHours = useMemo(() => (
        sortedServices.filter((service) => service.source_type === 'job')
    ), [sortedServices]);

    const filteredHoursMetric = useMemo(() => {
        if (hoursFilterMode === 'all') {
            return buildHoursMetric(assignedJobsWithHours);
        }

        if (hoursFilterMode === 'range') {
            return buildHoursMetric(filterServicesByDateRange(assignedJobsWithHours, hoursRangeStartDate, hoursRangeEndDate));
        }

        return buildHoursMetric(filterServicesByDateRange(assignedJobsWithHours, getCurrentMonthStartInput(), getCurrentMonthEndInput()));
    }, [assignedJobsWithHours, hoursFilterMode, hoursRangeEndDate, hoursRangeStartDate]);

    const performanceFilteredJobs = useMemo(() => {
        if (performanceFilterMode === 'all') return completedJobs;

        const now = new Date();
        const startDate = performanceFilterMode === 'monthly'
            ? new Date(now.getFullYear(), now.getMonth(), 1)
            : performanceRangeStartDate
                ? new Date(`${performanceRangeStartDate}T00:00:00`)
                : null;
        const endDate = performanceFilterMode === 'monthly'
            ? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
            : performanceRangeEndDate
                ? new Date(`${performanceRangeEndDate}T23:59:59.999`)
                : null;

        return completedJobs.filter((service) => {
            const serviceDate = new Date(getServiceDate(service));
            if (Number.isNaN(serviceDate.getTime())) return false;
            if (startDate && serviceDate < startDate) return false;
            if (endDate && serviceDate > endDate) return false;
            return true;
        });
    }, [completedJobs, performanceFilterMode, performanceRangeEndDate, performanceRangeStartDate]);

    const performanceData = useMemo(() => {
        const jobsByDay = performanceFilteredJobs.reduce((accumulator, service) => {
            const date = new Date(getServiceDate(service));
            if (Number.isNaN(date.getTime())) return accumulator;

            const dayKey = format(date, 'yyyy-MM-dd');
            const label = format(date, 'MMM d');
            const currentDay = accumulator.get(dayKey) || { dayKey, label, jobs: 0, sortTime: date.getTime() };
            currentDay.jobs += 1;
            accumulator.set(dayKey, currentDay);
            return accumulator;
        }, new Map());

        return Array.from(jobsByDay.values())
            .sort((a, b) => a.sortTime - b.sortTime);
    }, [performanceFilteredJobs]);

    const visibleTimelineItems = timelineTab === 'completed'
        ? completedJobs
        : timelineTab === 'performance' || timelineTab === 'activity'
            ? completedJobs
            : upcomingJobs;

    const timelinePageCount = Math.max(1, Math.ceil(visibleTimelineItems.length / timelinePageSize));
    const safeTimelinePage = Math.min(timelinePage, timelinePageCount);
    const paginatedTimelineItems = visibleTimelineItems.slice(
        (safeTimelinePage - 1) * timelinePageSize,
        safeTimelinePage * timelinePageSize
    );

    const payoutRows = useMemo(() => {
        if (employee?.is_part_timer) {
            return partTimePayouts.map((payout) => ({
                id: `part-time-${payout.application_id}`,
                applicationId: payout.application_id,
                jobRefId: payout.job_ref_id,
                description: `${payout.description || payout.job_ref_id || 'Service'} payout`,
                status: payout.payout_status === 'settled' ? 'Settled' : 'Pending',
                amount: Number(payout.amount || 0),
            }));
        }

        return completedJobs.map((service, index) => {
        const amount = Number(service.employee_payout || service.payout_amount || service.price || 0);
        return {
            id: service.id || index,
            jobRefId: service.source_type === 'job' ? service.job_ref_id : null,
            description: `${service.reference_number || service.id || 'Service'} payout`,
            status: String(service.payout_status || service.payment_status || '').toLowerCase().includes('pending') ? 'Pending' : 'Settled',
            amount,
        };
        });
    }, [completedJobs, employee?.is_part_timer, partTimePayouts]);

    const totalEarned = useMemo(() => (
        payoutRows.reduce((total, payout) => total + Number(payout.amount || 0), 0)
    ), [payoutRows]);

    const handleSettlePayout = async (payout) => {
        if (!canManageEmployees || !payout?.applicationId) return;

        setSettlingPayoutId(payout.applicationId);
        try {
            const settledPayout = await settlePartTimePayout(payout.applicationId);
            setPartTimePayouts((currentPayouts) => currentPayouts.map((currentPayout) => (
                currentPayout.application_id === payout.applicationId
                    ? {
                        ...currentPayout,
                        payout_status: settledPayout.payout_status,
                        settled_at: settledPayout.settled_at,
                    }
                    : currentPayout
            )));
            toast({
                title: 'Payout Settled',
                description: `${payout.description} has been marked as settled.`,
            });
        } catch (error) {
            toast({
                title: 'Unable to Settle Payout',
                description: error.message || 'Please try again.',
                variant: 'destructive',
            });
        } finally {
            setSettlingPayoutId(null);
        }
    };

    const handleUndoSettlePayout = async (payout) => {
        if (!canManageEmployees || !payout?.applicationId) return;

        setSettlingPayoutId(payout.applicationId);
        try {
            const updatedPayout = await undoPartTimePayoutSettlement(payout.applicationId);
            setPartTimePayouts((currentPayouts) => currentPayouts.map((currentPayout) => (
                currentPayout.application_id === payout.applicationId
                    ? {
                        ...currentPayout,
                        payout_status: updatedPayout.payout_status,
                        settled_at: updatedPayout.settled_at,
                    }
                    : currentPayout
            )));
            toast({
                title: 'Settlement Undone',
                description: `${payout.description} is pending again.`,
            });
        } catch (error) {
            toast({
                title: 'Unable to Undo Settlement',
                description: error.message || 'Please try again.',
                variant: 'destructive',
            });
        } finally {
            setSettlingPayoutId(null);
        }
    };

    const handleUpdatePayoutAmount = async (payout, amount) => {
        if (!canManageEmployees || !payout?.applicationId) return false;

        setSettlingPayoutId(payout.applicationId);
        try {
            const updatedPayout = await updatePartTimePayoutAmount(payout.applicationId, amount);
            setPartTimePayouts((currentPayouts) => currentPayouts.map((currentPayout) => (
                currentPayout.application_id === payout.applicationId
                    ? { ...currentPayout, amount: Number(updatedPayout.amount) }
                    : currentPayout
            )));
            toast({
                title: 'Earning Updated',
                description: `${payout.description} is now ${formatCurrency(updatedPayout.amount)}.`,
            });
            return true;
        } catch (error) {
            toast({
                title: 'Unable to Update Earning',
                description: error.message || 'Please enter a valid amount.',
                variant: 'destructive',
            });
            return false;
        } finally {
            setSettlingPayoutId(null);
        }
    };

    const handleSaveNote = async () => {
        if (!canManageEmployees || !noteDraft.trim() || !employee) return;

        setSavingNote(true);
        try {
            const nextNotes = [
                {
                    text: noteDraft.trim(),
                    created_at: new Date().toISOString(),
                    created_by: adminProfile?.full_name || adminProfile?.email || 'Admin',
                },
                ...normalizedNotes,
            ];
            const updatedEmployee = await updateEmployee({ id: employee.id, internal_notes: nextNotes });
            setEmployee(updatedEmployee);
            setNoteDraft('');
            toast({ title: "Note Saved", description: "Employee note was added." });
        } catch (error) {
            toast({ title: "Error Saving Note", description: error.message, variant: "destructive" });
        } finally {
            setSavingNote(false);
        }
    };
    
    if (loading) {
        return <ProfileSkeleton />;
    }

    if (!employee) {
        return <div className="p-6 text-center dark:text-slate-300">Employee not found.</div>;
    }

    return (
        <div className="min-h-screen w-full min-w-0 max-w-full overflow-x-hidden bg-slate-50 p-3 text-slate-900 sm:p-4 md:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                {selfService ? (
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">My Account</h1>
                        <p className="mt-1 text-sm text-slate-500">Profile, schedule, and performance</p>
                    </div>
                ) : <div className="flex min-w-0 max-w-full items-center gap-2 text-sm text-slate-500">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/admin-dashboard/employees')} className="h-8 rounded-xl px-2 text-slate-500 hover:bg-white">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Employees
                    </Button>
                    <span>/</span>
                    <span className="min-w-0 truncate font-semibold text-slate-800">{employee.full_name || 'Employee Profile'}</span>
                </div>}
                {!selfService && canManageEmployees && (
                    <Button size="sm" onClick={() => setIsEditDialogOpen(true)} className="rounded-xl bg-white text-slate-700 shadow-sm hover:bg-slate-100">
                        <Edit3 className="mr-2 h-4 w-4" /> Edit Employee
                    </Button>
                )}
            </div>

            {!selfService && !canManageEmployees && (
                <div className="mb-5 flex items-center rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    <ShieldAlert className="mr-2 h-5 w-5" />
                    Your role does not permit editing employee details.
                </div>
            )}

            <div className="grid min-w-0 max-w-full gap-5 lg:grid-cols-12">
                <EmployeeIdentityCard
                    employee={employee}
                    pastJobsCount={completedJobs.length}
                    upcomingJobsCount={upcomingJobs.length}
                    showMessaging={!selfService}
                />
                <div className="contents min-w-0 max-w-full lg:block lg:col-span-5 lg:space-y-5">
                    {!selfService && <EmployeeNotesCard
                        notes={normalizedNotes}
                        noteDraft={noteDraft}
                        setNoteDraft={setNoteDraft}
                        onSaveNote={handleSaveNote}
                        canManage={canManageEmployees}
                        savingNote={savingNote}
                    />}
                    <HoursWorkedCard
                        activeMetric={filteredHoursMetric}
                        filterMode={hoursFilterMode}
                        rangeStartDate={hoursRangeStartDate}
                        rangeEndDate={hoursRangeEndDate}
                        setFilterMode={setHoursFilterMode}
                        setRangeStartDate={setHoursRangeStartDate}
                        setRangeEndDate={setHoursRangeEndDate}
                        showFilters={!selfService}
                    />
                </div>
                <div className="contents min-w-0 max-w-full lg:block lg:col-span-4 lg:space-y-5">
                    <EmployeeDocumentsManager
                        employeeId={employee.id}
                        initialDocuments={employeeDocuments}
                        onDocumentsUpdate={fetchEmployeeData}
                        canManage={canManageEmployees}
                    />
                    <EmployeeOtherDetailsCard employee={employee} />
                </div>

                <JobTimelineCard
                    activeTab={timelineTab}
                    filterMode={performanceFilterMode}
                    items={visibleTimelineItems}
                    currentPage={safeTimelinePage}
                    pageCount={timelinePageCount}
                    paginatedItems={paginatedTimelineItems}
                    performanceData={performanceData}
                    rangeEndDate={performanceRangeEndDate}
                    rangeStartDate={performanceRangeStartDate}
                    setActiveTab={setTimelineTab}
                    setCurrentPage={setTimelinePage}
                    setFilterMode={setPerformanceFilterMode}
                    setRangeEndDate={setPerformanceRangeEndDate}
                    setRangeStartDate={setPerformanceRangeStartDate}
                />
                {!selfService && <EarningsCard
                    payouts={payoutRows}
                    totalEarned={totalEarned}
                    onSettle={canManageEmployees ? handleSettlePayout : null}
                    onUndoSettle={canManageEmployees ? handleUndoSettlePayout : null}
                    onUpdateAmount={canManageEmployees ? handleUpdatePayoutAmount : null}
                    payoutActionId={settlingPayoutId}
                />}
            </div>

            {isEditDialogOpen && canManageEmployees && (
                <EmployeeDialog
                    isOpen={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    editingEmployee={employee}
                    onSave={handleSaveEmployee}
                    formError={formError}
                    setFormError={setFormError}
                />
            )}
        </div>
    );
};

export default AdminEmployeeProfilePage;
