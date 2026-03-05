import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    findEmployeeById, 
    updateEmployee, 
    uploadEmployeeDocumentFile, 
    getEmployeeDocumentsList, 
    deleteEmployeeDocumentFile 
} from '@/lib/storage/employeeStorage';
import { getBookingsByEmployeeId } from '@/lib/storage/bookingStorage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Phone, Mail, Briefcase, CalendarDays, Edit3, UploadCloud, FileText, ShieldAlert, MapPin, Trash2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import EmployeeDialog from '@/components/AdminDashboard/EmployeeDialog';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

const InfoRow = ({ icon, label, value, className }) => (
  <div className={`flex items-start space-x-3 ${className}`}>
    <div className="flex-shrink-0 text-primary pt-0.5">{icon}</div>
    <div>
      <p className="text-sm font-medium text-gray-600 dark:text-slate-400">{label}</p>
      <p className="text-sm text-gray-800 dark:text-slate-200 break-words">{value || 'N/A'}</p>
    </div>
  </div>
);

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

const getStatusBadgeVariant = (status) => {
    switch (status?.toLowerCase()) {
        case 'completed': return 'success';
        case 'in-progress': return 'default';
        case 'scheduled': return 'outline';
        case 'pending': return 'secondary';
        case 'cancelled': return 'destructive';
        case 'quote requested': return 'secondary';
        default: return 'secondary';
    }
};

const getInitials = (name) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
};

const EmployeeDocumentsManager = ({ employeeId, initialDocuments = [], onDocumentsUpdate, canManage }) => {
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

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Documents</CardTitle>
                {canManage && (
                    <div className="space-x-2">
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
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="dark:border-slate-600 dark:hover:bg-slate-700"
                        >
                            <UploadCloud className="mr-2 h-4 w-4" /> Select Files
                        </Button>
                        {selectedFiles.length > 0 && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleUploadSelectedFiles}
                                disabled={isUploading || selectedFiles.length === 0}
                            >
                                {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length}`}
                            </Button>
                        )}
                    </div>
                )}
            </CardHeader>
            <CardContent>
                {selectedFiles.length > 0 && (
                    <div className="mb-4 p-3 border rounded-md bg-slate-50 dark:bg-slate-800/30 dark:border-slate-700">
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
                                    > <Trash2 className="h-4 w-4" /> </Button>
                                </li>
                            ))}
                        </ul>
                         <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Max file size: 5MB. Allowed: PDF, DOC(X), JPG, PNG.</p>
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
                                {canManage && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleDeleteDocument(doc.filePath || doc.path, doc.name)}
                                        className="text-red-500 hover:text-red-700 px-1 dark:hover:bg-slate-700"
                                        title={`Delete ${doc.name}`}
                                    > <Trash2 className="h-4 w-4" /> </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground dark:text-slate-400">No documents uploaded yet.</p>
                )}
            </CardContent>
        </Card>
    );
};


const AdminEmployeeProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { adminProfile } = useAdminAuth();

    const [employee, setEmployee] = useState(null);
    const [assignedServices, setAssignedServices] = useState([]);
    const [employeeDocuments, setEmployeeDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [formError, setFormError] = useState(null);

    const canManageEmployees = adminProfile && (adminProfile.role === 'admin' || adminProfile.role === 'superadmin');

    const fetchEmployeeData = useCallback(async () => {
        setLoading(true);
        try {
            const empData = await findEmployeeById(id);
            if (empData) {
                setEmployee(empData);
                const bookings = await getBookingsByEmployeeId(id);
                setAssignedServices(bookings || []);
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
    }, [id, navigate, toast]);

    useEffect(() => {
        fetchEmployeeData();
    }, [fetchEmployeeData]);

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
    
    if (loading) {
        return <div className="p-6 text-center dark:text-slate-300">Loading employee profile...</div>;
    }

    if (!employee) {
        return <div className="p-6 text-center dark:text-slate-300">Employee not found.</div>;
    }

    return (
        <div className="p-6 space-y-6 dark:text-slate-300">
            <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={() => navigate('/admin-dashboard/employees')} className="dark:border-slate-600 dark:hover:bg-slate-700">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Employees
                </Button>
                {canManageEmployees && (
                    <Button size="sm" onClick={() => setIsEditDialogOpen(true)}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit Employee
                    </Button>
                )}
            </div>
             {!canManageEmployees && (
                 <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md flex items-center dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-600">
                    <ShieldAlert className="h-5 w-5 mr-2" />
                    <p className="text-sm">Your role ('staff') does not permit editing employee details.</p>
                </div>
            )}

            <Card className="overflow-hidden shadow-lg border-primary/20 dark:bg-slate-800/50 dark:border-slate-700">
                <CardHeader className="bg-gradient-to-r from-primary/80 to-primary/60 text-primary-foreground p-6">
                    <div className="flex items-center space-x-4">
                        <Avatar className="h-20 w-20 border-2 border-white">
                            <AvatarImage src={employee.photo_url || undefined} alt={employee.full_name || 'Employee'} />
                            <AvatarFallback className="text-2xl bg-primary-foreground text-primary">{getInitials(employee.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-3xl font-bold">{employee.full_name || 'Employee'}</CardTitle>
                            <CardDescription className="text-primary-foreground/80 text-lg">{employee.position || 'N/A'}</CardDescription>
                            <Badge variant={employee.role === 'superadmin' || employee.role === 'admin' ? 'default' : 'secondary'} className="capitalize mt-1">
                                {employee.role}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <InfoRow icon={<Mail size={18} />} label="Email Address" value={employee.email} />
                    <InfoRow icon={<Phone size={18} />} label="Mobile" value={employee.mobile} />
                    <InfoRow icon={<User size={18} />} label="Employee ID" value={employee.id} className="md:col-span-2"/>
                    <InfoRow icon={<MapPin size={18} />} label="Address" value={employee.address} className="md:col-span-2"/>
                </CardContent>
            </Card>

            <Card className="dark:bg-slate-800/50 dark:border-slate-700">
                <CardHeader>
                    <CardTitle className="dark:text-slate-100">Personal & Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <InfoRow icon={<User size={18} />} label="Origin Country" value={employee.origin} />
                    <InfoRow icon={<User size={18} />} label="Sex" value={employee.sex} />
                    <InfoRow icon={<CalendarDays size={18} />} label="Date of Birth" value={formatDateSafe(employee.date_of_birth)} />
                    <InfoRow icon={<CalendarDays size={18} />} label="Hire Date" value={formatDateSafe(employee.hire_date)} />
                    <InfoRow icon={<FileText size={18} />} label="Passport Number" value={employee.passport_number} />
                    <InfoRow icon={<CalendarDays size={18} />} label="Passport Issue Date" value={formatDateSafe(employee.passport_issue_date)} />
                    <InfoRow icon={<CalendarDays size={18} />} label="Passport Expiry Date" value={formatDateSafe(employee.passport_expiry_date)} />
                    <InfoRow icon={<FileText size={18} />} label="Visa Number" value={employee.visa_number || 'N/A'} />
                    <InfoRow icon={<CalendarDays size={18} />} label="Visa Issuance Date" value={formatDateSafe(employee.visa_issuance_date)} />
                    <InfoRow icon={<CalendarDays size={18} />} label="Visa Expiry Date" value={formatDateSafe(employee.visa_expiry_date)} />
                </CardContent>
            </Card>
            
            <EmployeeDocumentsManager 
                employeeId={employee.id}
                initialDocuments={employeeDocuments}
                onDocumentsUpdate={fetchEmployeeData}
                canManage={canManageEmployees}
            />

            <Card className="dark:bg-slate-800/50 dark:border-slate-700">
                <CardHeader>
                    <CardTitle className="dark:text-slate-100">Recent Assigned Services</CardTitle>
                </CardHeader>
                <CardContent>
                    {assignedServices.length > 0 ? (
                        <div className="overflow-x-auto border rounded-md dark:border-slate-700">
                            <Table>
                                <TableHeader>
                                    <TableRow className="dark:border-slate-700">
                                        <TableHead className="dark:text-slate-300">Ref No.</TableHead>
                                        <TableHead className="dark:text-slate-300">Date</TableHead>
                                        <TableHead className="dark:text-slate-300">Time</TableHead>
                                        <TableHead className="dark:text-slate-300">Address</TableHead>
                                        <TableHead className="dark:text-slate-300">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assignedServices.slice(0, 10).map(service => (
                                        <TableRow key={service.id} className="dark:border-slate-700">
                                            <TableCell>
                                                <Link to={`/admin-dashboard/service/${service.id}`} className="text-primary hover:underline">
                                                    {service.id.substring(0, 8)}...
                                                </Link>
                                            </TableCell>
                                            <TableCell className="dark:text-slate-400">{formatDateSafe(service.date)}</TableCell>
                                            <TableCell className="dark:text-slate-400">{service.time || 'N/A'}</TableCell>
                                            <TableCell className="truncate max-w-[200px] dark:text-slate-400">{service.address}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusBadgeVariant(service.service_status)} className="capitalize">
                                                    {service.service_status || 'Unknown'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-slate-400">No services assigned recently.</p>
                    )}
                </CardContent>
            </Card>

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