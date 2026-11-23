import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import PermissionGate from '@/components/PermissionGate';
import EquipmentForm from './EquipmentForm';
import { createEquipment, getAllEquipment } from '@/lib/storage/equipmentStorage';
import { getWarrantyBadgeClass, getWarrantyDetails } from '@/lib/equipmentUtils';

const EquipmentGallery = () => {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const loadEquipment = useCallback(async () => {
    setLoading(true);
    try { setEquipment(await getAllEquipment()); }
    catch (error) { toast({ title: 'Unable to Load Equipment', description: error.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { loadEquipment(); }, [loadEquipment]);

  const submit = async (payload) => {
    setSubmitting(true);
    try {
      await createEquipment(payload);
      toast({ title: 'Equipment Created', description: 'The equipment record is ready.' });
      setDialogOpen(false);
      await loadEquipment();
    } catch (error) {
      toast({ title: 'Unable to Create Equipment', description: error.message, variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex h-56 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;

  return <>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <PermissionGate permission="inventory.create_item">
        <button type="button" onClick={() => setDialogOpen(true)} className="group flex min-h-[310px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-6 text-blue-700 transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm transition group-hover:scale-105"><Plus className="h-8 w-8" /></span>
          <span className="text-base font-bold">Add Equipment</span>
          <span className="mt-1 text-sm text-blue-600/70">Create a new equipment record</span>
        </button>
      </PermissionGate>

      {equipment.map((item) => {
        const warranty = getWarrantyDetails(item.date_purchased, item.warranty_months);
        return <Link key={item.id} to={`/admin-dashboard/inventory/equipment/${item.equipment_code}`} className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
          <div className="aspect-[4/3] overflow-hidden bg-slate-50"><img src={item.image_url} alt={item.item_name || item.equipment_code} className="h-full w-full object-contain p-4 transition group-hover:scale-[1.03]" /></div>
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-blue-600">{item.equipment_code}</p><h3 className="truncate text-base font-bold text-slate-900">{item.item_name || 'Untitled Equipment'}</h3></div><Badge variant="outline" className={getWarrantyBadgeClass(warranty.status)}>{warranty.status}</Badge></div>
            <p className="flex items-center gap-2 text-sm text-slate-500"><Wrench className="h-4 w-4" /> {item.item_type || 'Type not specified'}</p>
          </div>
        </Link>;
      })}
    </div>
    {equipment.length === 0 && <p className="mt-5 text-center text-sm text-slate-500">No equipment records yet. Use the Add Equipment card to create the first one.</p>}

    <Dialog open={dialogOpen} onOpenChange={(open) => !submitting && setDialogOpen(open)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Create Equipment</DialogTitle><DialogDescription>All fields are optional. A short equipment ID is generated automatically.</DialogDescription></DialogHeader><EquipmentForm onSubmit={submit} onCancel={() => setDialogOpen(false)} isSubmitting={submitting} /></DialogContent></Dialog>
  </>;
};

export default EquipmentGallery;
