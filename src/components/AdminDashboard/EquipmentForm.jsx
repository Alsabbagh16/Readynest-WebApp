import React, { useEffect, useState } from 'react';
import { ImagePlus, Loader2, Paperclip, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EQUIPMENT_PLACEHOLDER_IMAGE } from '@/lib/equipmentUtils';
import { createEquipmentManufacturer, getEquipmentManufacturers } from '@/lib/storage/equipmentStorage';
import { useToast } from '@/components/ui/use-toast';

const emptyFields = {
  item_name: '',
  item_type: '',
  manufacturer: '',
  cost: '',
  description: '',
  date_purchased: '',
  warranty_months: '',
};

const EquipmentForm = ({ initialData = null, onSubmit, onCancel, isSubmitting = false }) => {
  const [fields, setFields] = useState(emptyFields);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(EQUIPMENT_PLACEHOLDER_IMAGE);
  const [removeImage, setRemoveImage] = useState(false);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [showNewManufacturer, setShowNewManufacturer] = useState(false);
  const [newManufacturer, setNewManufacturer] = useState('');
  const [savingManufacturer, setSavingManufacturer] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    getEquipmentManufacturers()
      .then((data) => { if (active) setManufacturers(data); })
      .catch((error) => toast({ title: 'Unable to Load Manufacturers', description: error.message, variant: 'destructive' }));
    return () => { active = false; };
  }, [toast]);

  useEffect(() => {
    setFields(initialData ? {
      item_name: initialData.item_name || '',
      item_type: initialData.item_type || '',
      manufacturer: initialData.manufacturer || '',
      cost: initialData.cost ?? '',
      description: initialData.description || '',
      date_purchased: initialData.date_purchased || '',
      warranty_months: initialData.warranty_months ?? '',
    } : emptyFields);
    setImageFile(null);
    setImagePreview(initialData?.image_url || EQUIPMENT_PLACEHOLDER_IMAGE);
    setRemoveImage(false);
    setDocumentFiles([]);
  }, [initialData]);

  useEffect(() => () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const selectImage = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  const clearImage = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(EQUIPMENT_PLACEHOLDER_IMAGE);
    setRemoveImage(Boolean(initialData?.image_path));
  };

  const submit = (event) => {
    event.preventDefault();
    onSubmit({
      fields: {
        item_name: fields.item_name.trim() || null,
        item_type: fields.item_type || null,
        manufacturer: fields.manufacturer.trim() || null,
        cost: fields.cost === '' ? null : Number(fields.cost),
        description: fields.description.trim() || null,
        date_purchased: fields.date_purchased || null,
        warranty_months: fields.warranty_months === '' ? null : Number(fields.warranty_months),
      },
      imageFile,
      removeImage,
      documentFiles,
    });
  };

  const addManufacturer = async () => {
    const name = newManufacturer.trim();
    if (!name) return;
    setSavingManufacturer(true);
    try {
      const manufacturer = await createEquipmentManufacturer(name);
      setManufacturers((current) => [...current.filter((item) => item.id !== manufacturer.id), manufacturer].sort((left, right) => left.name.localeCompare(right.name)));
      setFields((current) => ({ ...current, manufacturer: manufacturer.name }));
      setNewManufacturer('');
      setShowNewManufacturer(false);
      toast({ title: 'Manufacturer Added' });
    } catch (error) {
      toast({ title: 'Unable to Add Manufacturer', description: error.message, variant: 'destructive' });
    } finally {
      setSavingManufacturer(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
        <div className="space-y-2">
          <Label>Thumbnail</Label>
          <div className="relative aspect-square overflow-hidden rounded-xl border bg-slate-50">
            <img src={imagePreview} alt="Equipment preview" className="h-full w-full object-contain" />
            {(imageFile || initialData?.image_path) && <button type="button" onClick={clearImage} className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-slate-600 shadow hover:text-red-600" aria-label="Remove equipment image"><X className="h-4 w-4" /></button>}
          </div>
          <Label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-white px-3 text-sm hover:bg-slate-50">
            <ImagePlus className="h-4 w-4" /> Choose Image
            <Input type="file" accept="image/*" className="hidden" onChange={selectImage} />
          </Label>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Manufacturer</Label>
            <Select value={fields.manufacturer ? `manufacturer:${fields.manufacturer}` : 'none'} onValueChange={(value) => {
              if (value === 'add-new') { setShowNewManufacturer(true); return; }
              setShowNewManufacturer(false);
              setFields((current) => ({ ...current, manufacturer: value === 'none' ? '' : value.replace(/^manufacturer:/, '') }));
            }}>
              <SelectTrigger><SelectValue placeholder="Select manufacturer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {fields.manufacturer && !manufacturers.some((item) => item.name === fields.manufacturer) && <SelectItem value={`manufacturer:${fields.manufacturer}`}>{fields.manufacturer}</SelectItem>}
                {manufacturers.map((manufacturer) => <SelectItem key={manufacturer.id} value={`manufacturer:${manufacturer.name}`}>{manufacturer.name}</SelectItem>)}
                <SelectItem value="add-new"><span className="flex items-center gap-2 text-blue-600"><Plus className="h-4 w-4" /> Add manufacturer</span></SelectItem>
              </SelectContent>
            </Select>
            {showNewManufacturer && <div className="flex gap-2"><Input value={newManufacturer} onChange={(event) => setNewManufacturer(event.target.value)} placeholder="Manufacturer name" autoFocus /><Button type="button" size="sm" onClick={addManufacturer} disabled={!newManufacturer.trim() || savingManufacturer}>{savingManufacturer ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}</Button></div>}
          </div>
          <div className="space-y-2"><Label htmlFor="equipment-name">Item Name</Label><Input id="equipment-name" value={fields.item_name} onChange={(event) => setFields((current) => ({ ...current, item_name: event.target.value }))} placeholder="e.g. Steam Cleaner" /></div>
          <div className="space-y-2"><Label>Item Type</Label><Select value={fields.item_type || 'none'} onValueChange={(value) => setFields((current) => ({ ...current, item_type: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent><SelectItem value="none">Not specified</SelectItem><SelectItem value="Machine">Machine</SelectItem><SelectItem value="Equipment">Equipment</SelectItem><SelectItem value="Accessory">Accessory</SelectItem></SelectContent></Select></div>
        </div>
      </div>

      <div className="space-y-2"><Label htmlFor="equipment-cost">Cost (BHD)</Label><Input id="equipment-cost" type="number" min="0" step="0.001" value={fields.cost} onChange={(event) => setFields((current) => ({ ...current, cost: event.target.value }))} placeholder="0.000" /></div>

      <div className="space-y-2"><Label htmlFor="equipment-description">Description</Label><Textarea id="equipment-description" rows={4} value={fields.description} onChange={(event) => setFields((current) => ({ ...current, description: event.target.value }))} placeholder="Optional equipment details" /></div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="equipment-purchased">Date Purchased</Label><Input id="equipment-purchased" type="date" value={fields.date_purchased} onChange={(event) => setFields((current) => ({ ...current, date_purchased: event.target.value }))} /></div>
        <div className="space-y-2"><Label htmlFor="equipment-warranty">Warranty Duration (months)</Label><Input id="equipment-warranty" type="number" min="0" step="1" value={fields.warranty_months} onChange={(event) => setFields((current) => ({ ...current, warranty_months: event.target.value }))} placeholder="e.g. 24" /></div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2"><Paperclip className="h-4 w-4" /> Related Documents</Label>
        <Input type="file" multiple onChange={(event) => setDocumentFiles(Array.from(event.target.files || []))} />
        {documentFiles.length > 0 && <div className="rounded-md bg-slate-50 p-2 text-sm text-slate-600">{documentFiles.map((file) => <p key={`${file.name}-${file.lastModified}`} className="truncate">{file.name}</p>)}</div>}
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{initialData ? 'Save Equipment' : 'Create Equipment'}</Button>
      </div>
    </form>
  );
};

export default EquipmentForm;
