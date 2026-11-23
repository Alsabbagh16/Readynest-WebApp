import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Download, Edit2, FileText, Loader2, Paperclip, ShieldCheck, Trash2, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import EquipmentForm from '@/components/AdminDashboard/EquipmentForm';
import PermissionGate from '@/components/PermissionGate';
import { deleteEquipment, deleteEquipmentDocument, downloadEquipmentDocument, getEquipmentByCode, updateEquipment } from '@/lib/storage/equipmentStorage';
import { getWarrantyBadgeClass, getWarrantyDetails } from '@/lib/equipmentUtils';

const AdminEquipmentDetailPage = () => {
  const { equipmentCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setEquipment(await getEquipmentByCode(equipmentCode)); }
    catch (error) { toast({ title: 'Unable to Load Equipment', description: error.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [equipmentCode, toast]);

  useEffect(() => { load(); }, [load]);

  const save = async (payload) => {
    setSaving(true);
    try { await updateEquipment(equipment, payload); toast({ title: 'Equipment Updated' }); setEditing(false); await load(); }
    catch (error) { toast({ title: 'Unable to Update Equipment', description: error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const removeDocument = async () => {
    if (!documentToDelete) return;
    try { await deleteEquipmentDocument(documentToDelete); toast({ title: 'Document Removed' }); setDocumentToDelete(null); await load(); }
    catch (error) { toast({ title: 'Unable to Remove Document', description: error.message, variant: 'destructive' }); }
  };

  const downloadDocument = async (document) => {
    try {
      const blob = await downloadEquipmentDocument(document);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = document.original_name;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: 'Unable to Download Document', description: error.message, variant: 'destructive' });
    }
  };

  const removeEquipment = async () => {
    setDeleting(true);
    try { await deleteEquipment(equipment); toast({ title: 'Equipment Deleted', description: `${equipment.equipment_code} was permanently deleted.` }); navigate('/admin-dashboard/inventory', { replace: true }); }
    catch (error) { toast({ title: 'Unable to Delete Equipment', description: error.message, variant: 'destructive' }); setDeleting(false); setDeleteOpen(false); }
  };

  if (loading) return <div className="flex h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!equipment) return <div className="p-8 text-center"><Wrench className="mx-auto mb-3 h-12 w-12 text-slate-300" /><h2 className="text-xl font-bold">Equipment Not Found</h2><p className="mt-2 text-slate-500">This equipment record may have been removed.</p><Button asChild className="mt-5"><Link to="/admin-dashboard/inventory">Back to Inventory</Link></Button></div>;
  const warranty = getWarrantyDetails(equipment.date_purchased, equipment.warranty_months);

  return <div className="space-y-6 p-1">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="outline" size="sm"><Link to="/admin-dashboard/inventory"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory</Link></Button><div className="flex gap-2"><PermissionGate permission="inventory.edit_item"><Button size="sm" onClick={() => setEditing(true)}><Edit2 className="mr-2 h-4 w-4" /> Edit</Button></PermissionGate><PermissionGate permission="inventory.delete_item"><Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button></PermissionGate></div></div>

    <Card className="overflow-hidden"><div className="grid lg:grid-cols-[360px_1fr]"><div className="flex min-h-[320px] items-center justify-center bg-slate-50 p-6"><img src={equipment.image_url} alt={equipment.item_name || equipment.equipment_code} className="max-h-[360px] w-full object-contain" /></div><div><CardHeader className="border-b"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-wide text-blue-600">{equipment.equipment_code}</p><CardTitle className="mt-1 text-2xl">{equipment.item_name || 'Untitled Equipment'}</CardTitle><p className="mt-2 flex items-center gap-2 text-slate-500"><Wrench className="h-4 w-4" /> {equipment.item_type || 'Type not specified'}</p></div><Badge variant="outline" className={`px-3 py-1 ${getWarrantyBadgeClass(warranty.status)}`}>{warranty.status}</Badge></div></CardHeader><CardContent className="space-y-6 p-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Manufacturer</p><p className="mt-1 font-semibold">{equipment.manufacturer || 'Not specified'}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Cost</p><p className="mt-1 font-semibold">{equipment.cost == null ? 'Not specified' : `BHD ${Number(equipment.cost).toFixed(3)}`}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="flex items-center gap-2 text-sm text-slate-500"><CalendarDays className="h-4 w-4" /> Date Purchased</p><p className="mt-1 font-semibold">{equipment.date_purchased || 'Not specified'}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="h-4 w-4" /> Warranty</p><p className="mt-1 font-semibold">{equipment.warranty_months == null ? 'Not specified' : `${equipment.warranty_months} months`}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Warranty Expiry</p><p className="mt-1 font-semibold">{warranty.expiryDate || 'Unknown'}</p></div></div><div><h3 className="font-semibold">Description</h3><p className="mt-2 whitespace-pre-wrap text-slate-600">{equipment.description || 'No description provided.'}</p></div></CardContent></div></div></Card>

    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Paperclip className="h-5 w-5 text-blue-600" /> Related Documents</CardTitle></CardHeader><CardContent>{equipment.documents?.length ? <div className="divide-y rounded-xl border">{equipment.documents.map((document) => <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="flex min-w-0 items-center gap-3"><span className="rounded-lg bg-blue-50 p-2 text-blue-600"><FileText className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate font-semibold">{document.original_name}</p><p className="text-sm text-slate-500">{document.file_size == null ? 'Size unknown' : `${(document.file_size / 1024).toFixed(1)} KB`}</p></div></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => downloadDocument(document)}><Download className="mr-2 h-4 w-4" /> Download</Button><PermissionGate permission="inventory.edit_item"><Button variant="ghost" size="icon" className="text-red-600" onClick={() => setDocumentToDelete(document)} aria-label={`Delete ${document.original_name}`}><Trash2 className="h-4 w-4" /></Button></PermissionGate></div></div>)}</div> : <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">No documents uploaded.</div>}</CardContent></Card>

    <Dialog open={editing} onOpenChange={(open) => !saving && setEditing(open)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Edit {equipment.equipment_code}</DialogTitle><DialogDescription>Update details, replace the image, or add more documents.</DialogDescription></DialogHeader><EquipmentForm initialData={equipment} onSubmit={save} onCancel={() => setEditing(false)} isSubmitting={saving} /></DialogContent></Dialog>
    <Dialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}><DialogContent><DialogHeader><DialogTitle>Delete Equipment?</DialogTitle><DialogDescription>This permanently deletes {equipment.equipment_code}, its image, and all related documents. This action cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button><Button variant="destructive" onClick={removeEquipment} disabled={deleting}>{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete Equipment</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(documentToDelete)} onOpenChange={(open) => !open && setDocumentToDelete(null)}><DialogContent><DialogHeader><DialogTitle>Delete Document?</DialogTitle><DialogDescription>Permanently remove {documentToDelete?.original_name} from this equipment record?</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDocumentToDelete(null)}>Cancel</Button><Button variant="destructive" onClick={removeDocument}>Delete Document</Button></DialogFooter></DialogContent></Dialog>
  </div>;
};

export default AdminEquipmentDetailPage;
