import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    findUserById, 
    adminUpdateUserProfile, 
    getUserNotes, 
    saveUserNotes,
    uploadUserDocumentFile,
    getUserDocumentsList,
    deleteUserDocumentFile
} from '@/lib/storage/userStorage';
import { getPurchasesByUserId } from '@/lib/storage/bookingStorage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Mail, Calendar, CreditCard, Edit, MapPin, FileText, UploadCloud, Save, ShieldAlert, Phone, ShoppingCart, Trash2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import EditUserForm from '@/components/AdminDashboard/EditUserForm';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

const formatDateSafe = (dateString) => {
    try {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return format(date, 'MMM d, yyyy');
    } catch (error) {
        console.error("Error formatting date:", dateString, error);
        return 'Invalid Date';
    }
};

const getStatusBadgeVariant = (status) => {
    switch (status?.toLowerCase()) {
        case 'completed': 
        case 'confirmed':
            return 'success';
        case 'in-progress': 
        case 'processing':
            return 'default';
        case 'scheduled': 
        case 'pending assignment':
            return 'outline';
        case 'pending': 
        case 'pending confirmation':
        case 'pending payment':
            return 'secondary';
        case 'cancelled': 
        case 'failed':
        case 'refunded': 
            return 'destructive';
        case 'quote requested': return 'secondary';
        default: return 'secondary';
    }
};

const UserInfoSection = ({ user }) => (
    <section>
        <h3 className="font-semibold text-lg border-b pb-2 mb-3 dark:text-slate-100 dark:border-slate-700">User Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center dark:text-slate-300"><Mail className="h-4 w-4 mr-1 text-gray-500 dark:text-slate-400" /> <strong>Email:</strong> {user.email}</div>
            <div className="flex items-center dark:text-slate-300"><Phone className="h-4 w-4 mr-1 text-gray-500 dark:text-slate-400" /> <strong>Phone:</strong> {user.phone || 'N/A'}</div>
            <div className="flex items-center dark:text-slate-300"><Calendar className="h-4 w-4 mr-1 text-gray-500 dark:text-slate-400" /> <strong>DOB:</strong> {formatDateSafe(user.dob)}</div>
            <div className="flex items-center dark:text-slate-300"><Calendar className="h-4 w-4 mr-1 text-gray-500 dark:text-slate-400" /> <strong>Joined:</strong> {formatDateSafe(user.created_at)}</div>
            <div className="flex items-center dark:text-slate-300"><CreditCard className="h-4 w-4 mr-1 text-gray-500 dark:text-slate-400" /> <strong>Credits:</strong> {user.credits || 0}</div>
        </div>
    </section>
);

const SavedAddressesSection = ({ addresses }) => {
    return (
        <section>
            <h3 className="font-semibold text-lg border-b pb-2 mb-3 dark:text-slate-100 dark:border-slate-700">Saved Addresses</h3>
            {addresses && addresses.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                    {addresses.map((addr) => (
                        <div key={addr.id} className="text-sm p-3 border rounded bg-gray-50/50 dark:bg-slate-800/30 dark:border-slate-700">
                            <p className="font-medium flex items-center dark:text-slate-200">
                                <MapPin className="h-4 w-4 mr-1 text-gray-500 dark:text-slate-400" />
                                {addr.label || addr.street || 'Address'}
                            </p>
                            <p className="text-xs text-muted-foreground dark:text-slate-400 pl-5">
                                {addr.street}<br />
                                {addr.city}, {addr.state} {addr.zip_code || addr.zip}
                            </p>
                            {addr.phone && (
                                <p className="text-xs text-muted-foreground dark:text-slate-400 pl-5 mt-1 flex items-center">
                                    <Phone className="h-3 w-3 mr-1" /> {addr.phone}
                                </p>
                            )}
                            {addr.alt_phone && (
                                <p className="text-xs text-muted-foreground dark:text-slate-400 pl-5 mt-0.5 flex items-center">
                                    <Phone className="h-3 w-3 mr-1" /> {addr.alt_phone} (Alt)
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            ) : <p className="text-sm text-gray-500 dark:text-slate-400">No saved addresses found.</p>}
        </section>
    );
};

const AdminNotesSection = ({ notes, setNotes, handleSaveNotes }) => (
    <section>
        <div className="flex justify-between items-center border-b pb-2 mb-3 dark:border-slate-700">
           <h3 className="font-semibold text-lg dark:text-slate-100">Admin Notes</h3>
           <Button size="sm" variant="outline" onClick={handleSaveNotes} className="dark:border-slate-600 dark:hover:bg-slate-700">
               <Save className="mr-2 h-4 w-4" /> Save Notes
           </Button>
        </div>
        <Textarea
            placeholder="Enter private notes for this user (visible to admins only)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        />
    </section>
);


const PurchaseHistorySection = ({ purchaseHistory }) => {
    return (
        <section>
            <h3 className="font-semibold text-lg border-b pb-2 mb-3 flex items-center dark:text-slate-100 dark:border-slate-700">
                <ShoppingCart className="mr-2 h-5 w-5 text-primary" /> Purchase History
            </h3>
            {purchaseHistory.length > 0 ? (
                <div className="overflow-x-auto border rounded-md dark:border-slate-700">
                    <Table>
                        <TableHeader>
                            <TableRow className="dark:border-slate-700">
                                <TableHead className="dark:text-slate-300">Ref No.</TableHead>
                                <TableHead className="dark:text-slate-300">Date</TableHead>
                                <TableHead className="dark:text-slate-300">Product/Service</TableHead>
                                <TableHead className="dark:text-slate-300">Amount</TableHead>
                                <TableHead className="dark:text-slate-300">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchaseHistory.map(purchase => (
                                <TableRow key={purchase.purchase_ref_id || purchase.id} className="dark:border-slate-700">
                                    <TableCell>
                                        <Link 
                                            to={`/admin-dashboard/purchase/${purchase.purchase_ref_id}`} 
                                            className="text-primary hover:underline font-mono"
                                        >
                                            {purchase.purchase_ref_id}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="dark:text-slate-400">{formatDateSafe(purchase.created_at)}</TableCell>
                                    <TableCell className="dark:text-slate-400">{purchase.product_name || 'N/A'}</TableCell>
                                    <TableCell className="dark:text-slate-400">
                                        ${(purchase.paid_amount)?.toFixed(2) || '0.00'}
                                        {purchase.status === 'refunded' && <span className="text-red-600 ml-1">(R)</span>}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusBadgeVariant(purchase.status)} className="capitalize">
                                            {purchase.status || 'Unknown'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : <p className="text-sm text-gray-500 dark:text-slate-400">No purchase history found for this user.</p>}
        </section>
    );
};

const UserDocumentsManager = ({ userId, initialDocuments = [], onDocumentsUpdate, canManage }) => {
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
                const uploadedFile = await uploadUserDocumentFile(userId, file);
                uploadedFileObjects.push({ name: file.name, path: uploadedFile.path, publicURL: uploadedFile.publicURL, filePath: uploadedFile.path, id: uploadedFile.id || uploadedFile.path });
            }
            
            const newDocumentPaths = uploadedFileObjects.map(f => f.path);
            const existingPaths = currentDocuments.map(d => d.filePath || d.path);
            const updatedDocumentUrls = [...existingPaths, ...newDocumentPaths];
            
            await adminUpdateUserProfile(userId, { document_urls: updatedDocumentUrls });

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
            await deleteUserDocumentFile(filePathToDelete);
            const updatedDocs = currentDocuments.filter(doc => (doc.filePath || doc.path) !== filePathToDelete);
            setCurrentDocuments(updatedDocs);
            
            const updatedDocumentUrls = updatedDocs.map(d => d.filePath || d.path);
            await adminUpdateUserProfile(userId, { document_urls: updatedDocumentUrls });

            toast({ title: "Document Deleted", description: `${documentName} has been deleted.` });
            if (onDocumentsUpdate) onDocumentsUpdate();
        } catch (error) {
            console.error("Error deleting document:", error);
            toast({ title: "Delete Error", description: `Could not delete document: ${error.message}`, variant: "destructive" });
        }
    };

    return (
        <section>
            <h3 className="font-semibold text-lg border-b pb-2 mb-3 dark:text-slate-100 dark:border-slate-700">User Documents</h3>
            {canManage && (
                <div className="mb-4 space-x-2">
                    <Input
                        id={`user-document-upload-${userId}`}
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

            {selectedFiles.length > 0 && canManage && (
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
                <p className="text-sm text-muted-foreground dark:text-slate-400">No documents uploaded for this user yet.</p>
            )}
        </section>
    );
};


const AdminUserProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [user, setUser] = useState(null);
    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const [userDocuments, setUserDocuments] = useState([]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const { adminProfile } = useAdminAuth();

    const canEditUser = adminProfile && (adminProfile.role === 'admin' || adminProfile.role === 'superadmin');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const userData = await findUserById(id);
            if (userData) {
                setUser(userData);
                const userNotes = await getUserNotes(id);
                setNotes(userNotes || '');
                
                const purchasesData = await getPurchasesByUserId(id); 
                purchasesData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setPurchaseHistory(purchasesData);

                const documents = await getUserDocumentsList(id);
                setUserDocuments(documents || []);

            } else {
                toast({ title: "Error", description: "User not found.", variant: "destructive" });
                navigate('/admin-dashboard/accounts');
            }
        } catch (error) {
             toast({ title: "Error", description: `Failed to fetch user data: ${error.message}`, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [id, toast, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    const handleSaveUser = async (userData) => {
        if (!canEditUser) {
            toast({ title: "Permission Denied", description: "You do not have permission to edit this user.", variant: "destructive" });
            return;
        }
        try {
            const dataToSave = { ...userData };
            if (userData.phone === undefined && user?.phone) { 
                dataToSave.phone = user.phone;
            }
            // Preserve existing document_urls if not explicitly changed by form
            if (dataToSave.document_urls === undefined && user?.document_urls) {
                dataToSave.document_urls = user.document_urls;
            }


            await adminUpdateUserProfile(dataToSave.id, dataToSave);
            toast({ title: "User Updated", description: `Details for ${dataToSave.email} saved.` });
            setIsEditDialogOpen(false); 
            fetchData();
        } catch (error) {
            toast({ title: "Error", description: `Could not update user: ${error.message}`, variant: "destructive" });
        }
    };

    const handleSaveNotes = async () => {
        try {
            await saveUserNotes(id, notes);
            toast({ title: "Notes Saved", description: "User notes have been updated." });
        } catch (error) {
            toast({ title: "Error Saving Notes", description: error.message, variant: "destructive" });
        }
    };

    if (loading) return <div className="p-6 text-center dark:text-slate-300">Loading user profile...</div>;
    if (!user) return <div className="p-6 text-center dark:text-slate-300">User not found.</div>;
    
    return (
        <div className="p-6 space-y-6 dark:text-slate-300">
            <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={() => navigate('/admin-dashboard/accounts')} className="dark:border-slate-600 dark:hover:bg-slate-700">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Accounts List
                </Button>
                {canEditUser && (
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="dark:border-slate-600 dark:hover:bg-slate-700">
                                <Edit className="mr-2 h-4 w-4" /> Edit User
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg dark:bg-slate-800 dark:border-slate-700">
                            <DialogHeader>
                                <DialogTitle className="dark:text-white">Edit User</DialogTitle>
                                <DialogDescription className="dark:text-slate-400">Update the details for {user.email}.</DialogDescription>
                            </DialogHeader>
                            <EditUserForm user={user} onSave={handleSaveUser} onCancel={() => setIsEditDialogOpen(false)} />
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {!canEditUser && (
                <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md flex items-center dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-600">
                    <ShieldAlert className="h-5 w-5 mr-2" />
                    <p className="text-sm">Your role does not permit editing this user's profile.</p>
                </div>
            )}

            <Card className="dark:bg-slate-800/50 dark:border-slate-700">
                <CardHeader>
                    <CardTitle className="text-2xl dark:text-slate-100">{user.name}</CardTitle>
                    <CardDescription className="dark:text-slate-400">{user.user_type || 'Personal'} User</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <UserInfoSection user={user} />
                    <SavedAddressesSection addresses={user.addresses || []} />
                    <AdminNotesSection notes={notes} setNotes={setNotes} handleSaveNotes={handleSaveNotes} />
                    <PurchaseHistorySection purchaseHistory={purchaseHistory} />
                    <UserDocumentsManager 
                        userId={user.id}
                        initialDocuments={userDocuments}
                        onDocumentsUpdate={fetchData}
                        canManage={canEditUser}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminUserProfilePage;