import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ArrowLeft, Save, UserCircle, Package, CalendarDays, DollarSign, MapPin, Tag, List, Edit2, Users, Briefcase, Phone, UploadCloud, FileText, Trash2, Download, Timer, Play, Pause, ShoppingBag } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { uploadJobDocument, getJobDocuments, deleteJobDocument, updateJob, getJobByRefId } from '@/lib/storage/jobStorage';
import StartJobModal from "@/components/StartJobModal";
import { cn } from "@/lib/utils";

// Format date treating it as "Face Value" by stripping timezone info before parsing.
// This prevents new Date() from applying local timezone offsets to the displayed time.
const formatDateSafe = (dateString, includeTime = false, placeholder = 'N/A') => {
  try {
    if (!dateString) return placeholder;
    // Remove timezone info to ensure wall-clock time display
    const cleanDateString = dateString.replace(/(Z|[+-]\d{2}:?\d{2})$/, '');
    const date = new Date(cleanDateString);
    if (isNaN(date.getTime())) return placeholder;
    return format(date, includeTime ? 'MMM d, yyyy, HH:mm' : 'MMM d, yyyy');
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'Invalid Date';
  }
};

// Format for input value by stripping timezone and milliseconds
const formatForDateTimeLocal = (dateString) => {
  if (!dateString) return '';
  // Ensure we just take the ISO string parts for local input, stripping Z and offsets
  return dateString.replace(/(Z|[+-]\d{2}:?\d{2})$/, '').substring(0, 16);
};

const getStatusBadgeVariant = (status) => {
    switch (status?.toLowerCase()) {
        case 'completed': return 'success';
        case 'pending assignment': case 'scheduled': return 'default';
        case 'assigned': case 'in progress': return 'outline';
        case 'cancelled': case 'on hold': case 'failed': return 'destructive';
        default: return 'secondary';
    }
};

const availableStatuses = ["Pending Assignment", "Scheduled", "Assigned", "In Progress", "On Hold", "Completed", "Cancelled", "Failed"];

const Section = ({ title, icon, children, className = "" }) => (
    <div className={`py-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${className}`}>
        <h3 className="text-md font-semibold mb-3 flex items-center text-gray-800 dark:text-gray-200">
            {icon && <span className="mr-2">{icon}</span>}
            {title}
        </h3>
        <div className="space-y-2 pl-2">{children}</div>
    </div>
);

const DetailItem = ({ label, value, icon }) => (
    <div className="flex items-start text-sm py-1"> 
        <dt className="font-medium text-gray-500 dark:text-gray-400 w-40 shrink-0">{label}:</dt>
        <dd className="text-gray-700 dark:text-gray-300 flex items-center">
            {icon && <span className="mr-1.5 mt-0.5">{icon}</span>}
            {value}
        </dd>
    </div>
);

const JobCustomerInfoSection = ({ job, purchaseDetails, isEditing, editableFields, handleInputChange }) => {
    const displayPhone = isEditing ? editableFields.user_phone : job.user_phone || purchaseDetails?.user_phone;
    return (
        <Section title="Customer Information" icon={<UserCircle className="h-5 w-5 text-primary"/>}>
            <DetailItem label="Name" value={job.user_name || 'N/A'} />
            <DetailItem label="Email" value={job.user_email || 'N/A'} />
            {isEditing ? (
                 <div>
                    <Label htmlFor="user_phone_edit" className="font-medium text-gray-500 dark:text-gray-400 w-40 shrink-0 py-1">Customer Phone</Label>
                    <Input 
                        id="user_phone_edit" 
                        name="user_phone" 
                        type="tel" 
                        value={editableFields.user_phone} 
                        onChange={handleInputChange} 
                        placeholder="Customer's phone number" 
                        className="mt-1"
                    />
                </div>
            ) : (
                <DetailItem label="Phone" value={displayPhone || 'N/A'} icon={<Phone className="h-4 w-4 text-muted-foreground"/>} />
            )}
            {job.user_id && <DetailItem label="Registered User ID" value={job.user_id} />}
        </Section>
    );
};

const JobServiceDetailsSection = ({ job, purchaseDetails, canViewPurchaseDetails }) => (
    <Section title="Service Details" icon={<Package className="h-5 w-5 text-primary"/>}>
        {job.purchase_ref_id && purchaseDetails && canViewPurchaseDetails && (
            <>
                <DetailItem label="Linked Purchase" value={
                    <Link to={`/admin-dashboard/purchase/${job.purchase_ref_id}`} className="text-primary hover:underline">
                        {job.purchase_ref_id}
                    </Link>
                } />
                <DetailItem label="Product Name" value={purchaseDetails.product_name || 'N/A'} />
                <DetailItem label="Purchase Amount" value={`BHD ${purchaseDetails.paid_amount?.toFixed(2) || '0.00'}`} />
            </>
        )}
        {job.purchase_ref_id && !canViewPurchaseDetails && (
            <DetailItem label="Linked Purchase Ref" value={job.purchase_ref_id} />
        )}
        {!job.purchase_ref_id && <DetailItem label="Product Name" value="Direct Job (No Purchase)" />}
        <DetailItem label="Preferred Date" value={formatDateSafe(job.preferred_date, true)} icon={<CalendarDays className="h-4 w-4 text-muted-foreground"/>}/>
    </Section>
);

const JobAddonsSection = ({ job, purchaseDetails }) => {
    const addons = (job.addons && job.addons.length > 0) ? job.addons : purchaseDetails?.selected_addons;
    if (!addons || addons.length === 0) return null;

    return (
        <Section title="Add-ons" icon={<List className="h-5 w-5 text-primary"/>}>
            <ul className="list-disc pl-5 space-y-1">
            {addons.map((addon, index) => (
                <li key={index} className="text-sm">
                    {addon.name} - BHD {Number(addon.price).toFixed(2)} (Qty: {addon.quantity || 1})
                </li>
            ))}
            </ul>
        </Section>
    );
};


const JobAddressInfoSection = ({ job }) => {
  const address = job.user_address;
  if (!address) return (
    <Section title="Service Address" icon={<MapPin className="h-5 w-5 text-primary"/>}>
      <p className="text-sm text-gray-700 dark:text-gray-300">N/A</p>
    </Section>
  );

  const addressString = `${address.street || ''}, ${address.city || ''}, ${address.zip || ''}`.replace(/, , /g, ', ').replace(/, $/,'').trim() || 'N/A';

  return (
    <Section title="Service Address" icon={<MapPin className="h-5 w-5 text-primary"/>}>
      <p className="text-sm text-gray-700 dark:text-gray-300">{addressString}</p>
      {address.phone && (
        <DetailItem label="Address Phone" value={address.phone} icon={<Phone className="h-4 w-4 text-muted-foreground"/>} />
      )}
      {address.alt_phone && (
        <DetailItem label="Address Alt. Phone" value={address.alt_phone} icon={<Phone className="h-4 w-4 text-muted-foreground"/>} />
      )}
    </Section>
  );
};

const JobAssignedEmployeesSection = ({ assignedEmployeeDetails, isEditing, editableFields, allEmployees, handleEmployeeSelect }) => (
    <Section title="Assigned Employees" icon={<Users className="h-5 w-5 text-primary"/>}>
        {isEditing ? (
            <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-2 border rounded-md max-h-60 overflow-y-auto dark:border-slate-700">
                {allEmployees.map(emp => (
                    <div key={emp.id} className="flex items-center space-x-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded">
                    <Checkbox
                        id={`edit-emp-${emp.id}`}
                        checked={editableFields.assigned_employees_ids.includes(emp.id)}
                        onCheckedChange={() => handleEmployeeSelect(emp.id)}
                        className="dark:border-slate-600 dark:data-[state=checked]:bg-primary"
                    />
                    <Label htmlFor={`edit-emp-${emp.id}`} className="text-sm font-normal leading-none">
                        {emp.full_name} <span className="text-xs text-muted-foreground">({emp.position || 'Employee'})</span>
                    </Label>
                    </div>
                ))}
                </div>
            </div>
        ) : assignedEmployeeDetails.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1">
            {assignedEmployeeDetails.map(emp => (
                <li key={emp.id} className="text-sm">
                {emp.full_name} <span className="text-xs text-muted-foreground">({emp.position || 'Employee'})</span>
                </li>
            ))}
            </ul>
        ) : (
            <p className="text-sm text-muted-foreground">No employees assigned yet.</p>
        )}
    </Section>
);

const JobInternalNotesSection = ({ job, isEditing, editableFields, handleInputChange }) => {
    if (!isEditing && !job.notes) return null;
    return (
        <Section title="Internal Notes" icon={<Tag className="h-5 w-5 text-primary"/>}>
            {isEditing ? (
                 <Textarea 
                    id="notes" 
                    name="notes" 
                    value={editableFields.notes} 
                    onChange={handleInputChange} 
                    placeholder="Update internal notes..."
                    className="dark:bg-slate-800 dark:border-slate-700"
                />
            ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{job.notes}</p>
            )}
        </Section>
    );
};


const JobDocumentsManagerSection = ({ jobRefId, initialDocuments = [], onDocumentsUpdate }) => {
    const { toast } = useToast();
    const fileInputRef = useRef(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [currentDocuments, setCurrentDocuments] = useState(initialDocuments);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        setCurrentDocuments(initialDocuments);
    }, [initialDocuments]);

    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files);
        setSelectedFiles(prev => [...prev, ...files]);
    };

    const handleRemoveSelectedFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUploadSelectedFiles = async () => {
        if (selectedFiles.length === 0) {
            toast({ title: "No files selected", description: "Please select files to upload.", variant: "default" });
            return;
        }
        setIsUploading(true);
        const uploadedFileObjects = [];
        try {
            for (const file of selectedFiles) {
                const uploadedFile = await uploadJobDocument(jobRefId, file);
                uploadedFileObjects.push({ name: file.name, path: uploadedFile.path, publicURL: uploadedFile.publicURL, filePath: uploadedFile.path });
            }
            
            const newDocumentPaths = uploadedFileObjects.map(f => f.path);
            const existingPaths = currentDocuments.map(d => d.filePath || d.path);
            const updatedDocumentUrls = [...existingPaths, ...newDocumentPaths];
            
            await updateJob(jobRefId, { document_urls: updatedDocumentUrls });

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
        if (!window.confirm(`Are you sure you want to delete ${documentName}? This action cannot be undone.`)) return;
        
        try {
            await deleteJobDocument(filePathToDelete);
            const updatedDocs = currentDocuments.filter(doc => (doc.filePath || doc.path) !== filePathToDelete);
            setCurrentDocuments(updatedDocs);
            
            const updatedDocumentUrls = updatedDocs.map(d => d.filePath || d.path);
            await updateJob(jobRefId, { document_urls: updatedDocumentUrls });

            toast({ title: "Document Deleted", description: `${documentName} has been deleted.` });
            if (onDocumentsUpdate) onDocumentsUpdate();
        } catch (error) {
            console.error("Error deleting document:", error);
            toast({ title: "Delete Error", description: `Could not delete document: ${error.message}`, variant: "destructive" });
        }
    };
    
    return (
        <Section title="Job Documents" icon={<FileText className="h-5 w-5 text-primary"/>}>
            <div className="mb-4 space-x-2">
                <Input
                    id={`job-documents-upload-${jobRefId}`}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    className="hidden"
                    disabled={isUploading}
                />
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="dark:border-slate-600 dark:hover:bg-slate-700"
                >
                    <UploadCloud className="mr-2 h-4 w-4" /> Select Files
                </Button>
                {selectedFiles.length > 0 && (
                    <Button
                        type="button"
                        onClick={handleUploadSelectedFiles}
                        disabled={isUploading || selectedFiles.length === 0}
                    >
                        {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
                    </Button>
                )}
            </div>

            {selectedFiles.length > 0 && (
                <div className="mb-4 p-3 border rounded-md bg-slate-50 dark:bg-slate-800/30">
                    <p className="text-sm font-medium mb-1 dark:text-slate-300">Files to upload:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        {selectedFiles.map((file, index) => (
                            <li key={index} className="flex justify-between items-center dark:text-slate-400">
                                <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveSelectedFile(index)}
                                    disabled={isUploading}
                                    className="text-red-500 hover:text-red-700 px-1 dark:hover:bg-slate-700"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {currentDocuments.length > 0 ? (
                <ul className="space-y-2">
                    {currentDocuments.map((doc, index) => (
                        <li key={doc.id || index} className="flex items-center justify-between p-2 border rounded-md hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
                            <a 
                                href={doc.publicURL} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-sm text-primary hover:underline flex items-center"
                                title={doc.name}
                            >
                                <Download className="mr-2 h-4 w-4 shrink-0" />
                                <span className="truncate max-w-xs sm:max-w-sm md:max-w-md">{doc.name}</span>
                            </a>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteDocument(doc.filePath || doc.path, doc.name)}
                                className="text-red-500 hover:text-red-700 px-1 dark:hover:bg-slate-700"
                                title={`Delete ${doc.name}`}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground dark:text-slate-400">No documents uploaded for this job yet.</p>
            )}
        </Section>
    );
};

const JobEditForm = ({ editableFields, handleInputChange, handleStatusChange, allEmployees, handleEmployeeSelect, handleSaveChanges, cancelEdit, isSubmitting, availablePurchases, handlePurchaseSelect }) => (
    <div className="space-y-4 p-4 border rounded-md bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700">
        <h3 className="text-lg font-semibold mb-2 dark:text-white">Edit Job Details</h3>
        
        {/* Linked Purchase Section */}
        <div className="mb-4 p-4 border rounded bg-white dark:bg-slate-800 dark:border-slate-600">
            <Label htmlFor="purchase_select_edit" className="flex items-center dark:text-slate-300 mb-2">
                <ShoppingBag className="h-4 w-4 mr-2" /> Linked Purchase
            </Label>
            <Select 
                value={editableFields.purchase_ref_id || "none"} 
                onValueChange={(val) => handlePurchaseSelect(val === "none" ? null : val)}
            >
                <SelectTrigger id="purchase_select_edit" className="dark:bg-slate-700 dark:border-slate-600 dark:text-white w-full">
                    <SelectValue placeholder="Select a purchase..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                    <SelectItem value="none">None (Unlink Purchase)</SelectItem>
                    {availablePurchases.map((p) => {
                        const displayName = p.name || (p.profiles ? `${p.profiles.first_name || ''} ${p.profiles.last_name || ''}`.trim() : p.email);
                        const displayAmount = p.paid_amount ? `BHD ${Number(p.paid_amount).toFixed(2)}` : '';
                        return (
                            <SelectItem key={p.purchase_ref_id} value={p.purchase_ref_id}>
                                {`Purchase #${p.purchase_ref_id} - ${displayName} - ${displayAmount}`}
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
                Changing this will update the link reference.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label htmlFor="preferred_date_edit" className="dark:text-slate-300">Scheduled Date & Time</Label>
                <Input 
                    id="preferred_date_edit" 
                    name="preferred_date" 
                    type="datetime-local" 
                    value={editableFields.preferred_date} 
                    onChange={handleInputChange} 
                    step="60"
                    className="dark:bg-slate-700 dark:border-slate-600"
                />
                <p className="text-xs text-muted-foreground mt-1">Select the scheduled date and time for this job.</p>
            </div>
            <div>
                <Label htmlFor="status_edit" className="dark:text-slate-300">Status</Label>
                <Select value={editableFields.status} onValueChange={handleStatusChange}>
                    <SelectTrigger id="status_edit" className="dark:bg-slate-700 dark:border-slate-600"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                        {availableStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="space-y-4 p-4 border rounded bg-white dark:bg-slate-800 dark:border-slate-600">
            <Label className="flex items-center dark:text-slate-300 mb-2">
                <MapPin className="h-4 w-4 mr-2" /> Service Address
            </Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="user_address_street_edit" className="dark:text-slate-300">Street</Label>
                    <Input
                        id="user_address_street_edit"
                        name="user_address_street"
                        value={editableFields.user_address_street}
                        onChange={handleInputChange}
                        className="mt-1 dark:bg-slate-700 dark:border-slate-600"
                    />
                </div>

                <div>
                    <Label htmlFor="user_address_city_edit" className="dark:text-slate-300">City</Label>
                    <Input
                        id="user_address_city_edit"
                        name="user_address_city"
                        value={editableFields.user_address_city}
                        onChange={handleInputChange}
                        className="mt-1 dark:bg-slate-700 dark:border-slate-600"
                    />
                </div>

                <div>
                    <Label htmlFor="user_address_zip_edit" className="dark:text-slate-300">Block</Label>
                    <Input
                        id="user_address_zip_edit"
                        name="user_address_zip"
                        value={editableFields.user_address_zip}
                        onChange={handleInputChange}
                        className="mt-1 dark:bg-slate-700 dark:border-slate-600"
                    />
                </div>

                <div>
                    <Label htmlFor="user_address_phone_edit" className="dark:text-slate-300">Address Phone</Label>
                    <Input
                        id="user_address_phone_edit"
                        name="user_address_phone"
                        value={editableFields.user_address_phone}
                        onChange={handleInputChange}
                        className="mt-1 dark:bg-slate-700 dark:border-slate-600"
                    />
                </div>

                <div>
                    <Label htmlFor="user_address_alt_phone_edit" className="dark:text-slate-300">Alt. Phone</Label>
                    <Input
                        id="user_address_alt_phone_edit"
                        name="user_address_alt_phone"
                        value={editableFields.user_address_alt_phone}
                        onChange={handleInputChange}
                        className="mt-1 dark:bg-slate-700 dark:border-slate-600"
                    />
                </div>
            </div>
        </div>

        <JobCustomerInfoSection job={{}} purchaseDetails={{}} isEditing={true} editableFields={editableFields} handleInputChange={handleInputChange} />
        <JobAssignedEmployeesSection isEditing={true} editableFields={editableFields} allEmployees={allEmployees} handleEmployeeSelect={handleEmployeeSelect} />
        <JobInternalNotesSection job={{}} isEditing={true} editableFields={editableFields} handleInputChange={handleInputChange} />

        <div className="flex justify-end flex-wrap gap-2 mt-6">
        <Button variant="outline" onClick={cancelEdit} className="dark:border-slate-600 dark:hover:bg-slate-700 admin-button-wrap">Cancel</Button>
        <Button onClick={handleSaveChanges} disabled={isSubmitting} className="admin-button-wrap">
            {isSubmitting ? 'Saving...' : <><Save className="mr-2 h-4 w-4 button-icon"/> Save</>}
        </Button>
        </div>
    </div>
);


const AdminJobDetailPage = () => {
  const { jobRefId } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { adminProfile } = useAdminAuth();
  
  const [job, setJob] = useState(null);
  const [purchaseDetails, setPurchaseDetails] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [assignedEmployeeDetails, setAssignedEmployeeDetails] = useState([]);
  const [jobDocuments, setJobDocuments] = useState([]);
  const [availablePurchases, setAvailablePurchases] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [activeJobModal, setActiveJobModal] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [editableFields, setEditableFields] = useState({
    status: '',
    preferred_date: '',
    assigned_employees_ids: [],
    notes: '',
    user_phone: '', 
    user_address_street: '',
    user_address_city: '',
    user_address_zip: '',
    user_address_phone: '',
    user_address_alt_phone: '',
    purchase_ref_id: null,
  });
  
  const canEditJob = adminProfile && (adminProfile.role === 'admin' || adminProfile.role === 'superadmin');
  const canViewPurchaseDetails = adminProfile && (adminProfile.role === 'admin' || adminProfile.role === 'superadmin');


  const fetchJobAndRelatedData = useCallback(async () => {
    setLoading(true);
    try {
      const jobData = await getJobByRefId(jobRefId);
      if (!jobData) throw new Error("Job not found");
      setJob(jobData);

      setEditableFields({
        status: jobData.status || '',
        // Read "Face Value": Strip Z to use in input without conversion
        preferred_date: jobData.preferred_date ? formatForDateTimeLocal(jobData.preferred_date) : '',
        assigned_employees_ids: jobData.assigned_employees_ids || [],
        notes: jobData.notes || '',
        user_phone: jobData.user_phone || '',
        user_address_street: jobData.user_address?.street || '',
        user_address_city: jobData.user_address?.city || '',
        user_address_zip: jobData.user_address?.zip || '',
        user_address_phone: jobData.user_address?.phone || '',
        user_address_alt_phone: jobData.user_address?.alt_phone || '',
        purchase_ref_id: jobData.purchase_ref_id || null,
      });

      if (jobData.purchase_ref_id) {
        const { data: purchaseData, error: purchaseError } = await supabase
          .from('purchases')
          .select('product_name, paid_amount, selected_addons, user_phone')
          .eq('purchase_ref_id', jobData.purchase_ref_id)
          .single();
        if (purchaseError) console.warn("Could not fetch linked purchase:", purchaseError.message);
        else {
            setPurchaseDetails(purchaseData);
            if (!jobData.user_phone && purchaseData && purchaseData.user_phone) {
                 setEditableFields(prev => ({...prev, user_phone: purchaseData.user_phone}));
                 setJob(currentJob => ({...currentJob, user_phone: purchaseData.user_phone }));
            }
        }
      } else {
        setPurchaseDetails(null);
      }

      // Fetch employees for assignment
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, full_name, position');
      if (employeesError) throw employeesError;
      setAllEmployees(employeesData || []);
      
      // Fetch currently assigned employee details
      if (jobData.assigned_employees_ids && jobData.assigned_employees_ids.length > 0) {
          const { data: assignedEmpsData, error: assignedEmpsError } = await supabase
            .from('employees')
            .select('id, full_name, position')
            .in('id', jobData.assigned_employees_ids);
          if (assignedEmpsError) console.warn("Could not fetch assigned employee details:", assignedEmpsError.message);
          else setAssignedEmployeeDetails(assignedEmpsData || []);
      } else {
          setAssignedEmployeeDetails([]);
      }

      // Fetch available purchases for editing link
      if (canEditJob) {
        const { data: purchasesData, error: purchasesError } = await supabase
            .from('purchases')
            .select('purchase_ref_id, name, email, user_phone, address, product_name, paid_amount, profiles(first_name, last_name, phone)')
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (purchasesError) console.error("Error fetching purchases list:", purchasesError);
        else setAvailablePurchases(purchasesData || []);
      }

      const documents = await getJobDocuments(jobRefId);
      setJobDocuments(documents || []);

    } catch (error) {
      console.error("Error fetching job details:", error);
      toast({ title: "Error", description: `Could not fetch job details: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [jobRefId, toast, canEditJob]);

  useEffect(() => {
    fetchJobAndRelatedData();
  }, [fetchJobAndRelatedData, refreshTrigger]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditableFields(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value) => {
    setEditableFields(prev => ({ ...prev, status: value }));
  };
  
  const handlePurchaseSelect = (value) => {
    setEditableFields(prev => ({ ...prev, purchase_ref_id: value }));
  };

  const handleEmployeeSelect = (employeeId) => {
    setEditableFields(prev => {
      const newAssignedIds = prev.assigned_employees_ids.includes(employeeId)
        ? prev.assigned_employees_ids.filter(id => id !== employeeId)
        : [...prev.assigned_employees_ids, employeeId];
      return { ...prev, assigned_employees_ids: newAssignedIds };
    });
  };

  const handleSaveChanges = async () => {
    if (!canEditJob) {
        toast({ title: "Permission Denied", description: "You do not have permission to edit jobs.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
      // Store "Face Value" by appending 'Z' to local input string. 
      // This saves "10:00" as "10:00Z", which the DB sees as UTC but we interpret as wall clock.
      const formattedDateForStorage = editableFields.preferred_date ? `${editableFields.preferred_date}:00Z` : null;

      // Handle null purchase_ref_id properly
      let finalPurchaseId = editableFields.purchase_ref_id;

      // Trim if string to remove accidental whitespace
      if (typeof finalPurchaseId === 'string') {
          finalPurchaseId = finalPurchaseId.trim();
      }

      // Explicitly set to NULL if empty string or "none"
      if (!finalPurchaseId || finalPurchaseId === "none") {
          finalPurchaseId = null;
      }

      console.log("[Job Update] purchase_ref_id:", finalPurchaseId, "type:", typeof finalPurchaseId);

      const updatePayload = {
        status: editableFields.status,
        preferred_date: formattedDateForStorage,
        assigned_employees_ids: editableFields.assigned_employees_ids,
        notes: editableFields.notes,
        user_phone: editableFields.user_phone,
        user_address: {
          ...(job?.user_address || {}),
          street: editableFields.user_address_street,
          city: editableFields.user_address_city,
          zip: editableFields.user_address_zip,
          phone: editableFields.user_address_phone,
          alt_phone: editableFields.user_address_alt_phone,
        },
        purchase_ref_id: finalPurchaseId
      };

      console.log("[Job Update] payload:", updatePayload);

      await updateJob(jobRefId, updatePayload);
      
      toast({ title: "Success", description: "Job details updated successfully." });
      setIsEditing(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("[Job Update] error:", error);
      toast({ title: "Error", description: `Could not update job details: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    if(job) {
        setEditableFields({
            status: job.status || '',
            preferred_date: job.preferred_date ? formatForDateTimeLocal(job.preferred_date) : '',
            assigned_employees_ids: job.assigned_employees_ids || [],
            notes: job.notes || '',
            user_phone: job.user_phone || (purchaseDetails?.user_phone) || '',
            user_address_street: job.user_address?.street || '',
            user_address_city: job.user_address?.city || '',
            user_address_zip: job.user_address?.zip || '',
            user_address_phone: job.user_address?.phone || '',
            user_address_alt_phone: job.user_address?.alt_phone || '',
            purchase_ref_id: job.purchase_ref_id || null,
        });
    }
  };

  const handleStartJob = async () => {
    if (!job) return;
    try {
        const timestamp = new Date().toISOString();
        const startNote = `[${adminProfile?.full_name || 'Staff'}] started the job at ${format(new Date(), 'PPpp')}`;
        
        // Only update if not already in progress to avoid overwriting state
        if (job.status !== 'In Progress') {
            await updateJob(job.job_ref_id, {
                status: 'In Progress',
                notes: job.notes ? `${job.notes}\n${startNote}` : startNote
            });
            toast({ title: "Job Started", description: "Job status updated to In Progress." });
            setRefreshTrigger(prev => prev + 1);
        }
        
        setActiveJobModal(job);

    } catch (error) {
        console.error("Error starting job:", error);
        toast({ title: "Error", description: "Failed to start job. Please try again.", variant: "destructive" });
    }
  };

  const handleJobComplete = async (durationString) => {
    if (!activeJobModal) return;
    try {
        const completionNote = `Job completed at ${format(new Date(), 'PPpp')}. Total duration: ${durationString}`;
        const previousNotes = activeJobModal.notes || '';

        await updateJob(activeJobModal.job_ref_id, {
            status: 'Completed',
            notes: `${previousNotes}\n${completionNote}`
        });

        toast({ title: "Job Completed!", description: `Duration: ${durationString}`, className: "bg-green-50 border-green-200 text-green-900" });
        setActiveJobModal(null);
        setRefreshTrigger(prev => prev + 1);

    } catch (error) {
        console.error("Error completing job:", error);
        toast({ title: "Error", description: "Failed to complete job.", variant: "destructive" });
    }
  };

  if (loading && !job) {
    return <div className="p-6 text-center dark:text-slate-300">Loading job details...</div>;
  }

  if (!job) {
    return (
      <div className="p-6 text-center dark:text-slate-300">
        <p className="mb-4">Job not found or an error occurred.</p>
        <Button asChild variant="outline" className="dark:border-slate-600 dark:hover:bg-slate-700"><Link to="/admin-dashboard/jobs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs</Link></Button>
      </div>
    );
  }
  
  const currentStatus = isEditing ? editableFields.status : job.status;

  return (
    <div className="space-y-6 dark:text-slate-300">
      <div className="flex flex-wrap gap-2 justify-end">
        <Button asChild variant="outline" size="sm" className="dark:border-slate-600 dark:hover:bg-slate-700 admin-button-wrap">
          <Link to="/admin-dashboard/jobs"><ArrowLeft className="mr-2 h-4 w-4 button-icon" /> Back</Link>
        </Button>
        {canEditJob && !isEditing && (
          <Button onClick={() => setIsEditing(true)} size="sm" className="admin-button-wrap">
            <Edit2 className="mr-2 h-4 w-4 button-icon" /> Edit
          </Button>
        )}
      </div>

      <Card className="dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center text-2xl dark:text-white">
                <Briefcase className="mr-3 h-7 w-7 text-primary"/> Job: {job.job_ref_id}
              </CardTitle>
              <CardDescription className="dark:text-slate-400">Created on: {formatDateSafe(job.created_at, true)}</CardDescription>
            </div>
            <Badge variant={getStatusBadgeVariant(currentStatus)} className="text-sm px-3 py-1 capitalize">{currentStatus}</Badge>
          </div>
        </CardHeader>

        {/* Start Job Module - Task 2 Enhancement */}
        { !isEditing && (canEditJob || adminProfile?.role === 'staff') && ['Scheduled', 'Assigned', 'In Progress', 'Pending Assignment'].includes(currentStatus) && (
            <div className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                     <div className="bg-primary/10 p-3 rounded-full text-primary shrink-0">
                        <Timer className="w-6 h-6" />
                     </div>
                     <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">Job Actions</h4>
                        <p className="text-sm text-slate-500">Track working time and complete service checklist</p>
                     </div>
                </div>
                <Button 
                    onClick={handleStartJob} 
                    size="lg" 
                    className={cn(
                        "w-full sm:w-auto gap-2 font-bold shadow-md transition-all hover:scale-105",
                        currentStatus === 'In Progress' 
                            ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200" 
                            : "bg-green-600 hover:bg-green-700 text-white shadow-green-200"
                    )}
                >
                    {currentStatus === 'In Progress' ? (
                        <>
                            <Pause className="w-5 h-5 fill-current"/> Resume Job
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5 fill-current"/> Start Job
                        </>
                    )}
                </Button>
            </div>
        )}

        <CardContent className="space-y-6 pt-6">
          {isEditing && canEditJob ? (
             <JobEditForm
                editableFields={editableFields}
                handleInputChange={handleInputChange}
                handleStatusChange={handleStatusChange}
                allEmployees={allEmployees}
                handleEmployeeSelect={handleEmployeeSelect}
                handleSaveChanges={handleSaveChanges}
                cancelEdit={cancelEdit}
                isSubmitting={isSubmitting}
                availablePurchases={availablePurchases}
                handlePurchaseSelect={handlePurchaseSelect}
            />
          ) : (
            <>
              <JobCustomerInfoSection job={job} purchaseDetails={purchaseDetails} isEditing={false} editableFields={{}} handleInputChange={()=>{}}/>
              <JobServiceDetailsSection job={job} purchaseDetails={purchaseDetails} canViewPurchaseDetails={canViewPurchaseDetails} />
              <JobAddonsSection job={job} purchaseDetails={purchaseDetails} />
              <JobAddressInfoSection job={job} />
              <JobAssignedEmployeesSection assignedEmployeeDetails={assignedEmployeeDetails} isEditing={false} editableFields={{}} allEmployees={[]} handleEmployeeSelect={()=>{}} />
              <JobInternalNotesSection job={job} isEditing={false} editableFields={{}} handleInputChange={()=>{}} />
              <JobDocumentsManagerSection 
                jobRefId={job.job_ref_id} 
                initialDocuments={jobDocuments}
                onDocumentsUpdate={fetchJobAndRelatedData}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Admin Start Job Modal Integration */}
      {activeJobModal && (
        <StartJobModal 
            isOpen={!!activeJobModal}
            onClose={() => setActiveJobModal(null)}
            onComplete={handleJobComplete}
            job={activeJobModal}
        />
      )}
    </div>
  );
};

export default AdminJobDetailPage;