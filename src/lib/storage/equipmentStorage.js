import { supabase } from '@/lib/supabase';
import { EQUIPMENT_PLACEHOLDER_IMAGE } from '@/lib/equipmentUtils';

const BUCKET = 'equipment-files';
const SIGNED_URL_TTL = 3600;
const safeName = (name = 'file') => name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'file';

const signedUrl = async (path) => {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error) throw error;
  return data.signedUrl;
};

const decorateEquipment = async (equipment, includeDocuments = false) => {
  if (!equipment) return null;
  const imageUrl = equipment.image_path ? await signedUrl(equipment.image_path) : EQUIPMENT_PLACEHOLDER_IMAGE;
  const documents = includeDocuments
    ? await Promise.all((equipment.documents || []).map(async (document) => ({ ...document, url: await signedUrl(document.storage_path) })))
    : undefined;
  return { ...equipment, image_url: imageUrl, ...(includeDocuments ? { documents } : {}) };
};

export const getAllEquipment = async () => {
  const { data, error } = await supabase
    .from('inventory_equipment')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return Promise.all((data || []).map((item) => decorateEquipment(item)));
};

export const getEquipmentByCode = async (equipmentCode) => {
  const { data, error } = await supabase
    .from('inventory_equipment')
    .select('*, documents:inventory_equipment_documents(*)')
    .eq('equipment_code', equipmentCode)
    .maybeSingle();
  if (error) throw error;
  return decorateEquipment(data, true);
};

export const getEquipmentManufacturers = async () => {
  const { data, error } = await supabase
    .from('inventory_equipment_manufacturers')
    .select('id, name')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const createEquipmentManufacturer = async (name) => {
  const normalizedName = name.trim();
  const { data, error } = await supabase
    .from('inventory_equipment_manufacturers')
    .insert({ name: normalizedName })
    .select('id, name')
    .single();

  if (!error) return data;
  if (error.code !== '23505') throw error;

  const { data: existing, error: existingError } = await supabase
    .from('inventory_equipment_manufacturers')
    .select('id, name')
    .ilike('name', normalizedName)
    .limit(1)
    .single();
  if (existingError) throw existingError;
  return existing;
};

const uploadFile = async (equipmentId, folder, file) => {
  const path = `${equipmentId}/${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
};

const insertDocument = async (equipmentId, file, storagePath) => {
  const { error } = await supabase.from('inventory_equipment_documents').insert({
    equipment_id: equipmentId,
    storage_path: storagePath,
    original_name: file.name,
    mime_type: file.type || null,
    file_size: file.size,
  });
  if (error) throw error;
};

export const createEquipment = async ({ fields, imageFile, documentFiles = [] }) => {
  const { data: equipment, error } = await supabase
    .from('inventory_equipment')
    .insert(fields)
    .select()
    .single();
  if (error) throw error;

  const uploadedPaths = [];
  try {
    if (imageFile) {
      const imagePath = await uploadFile(equipment.id, 'image', imageFile);
      uploadedPaths.push(imagePath);
      const { error: updateError } = await supabase
        .from('inventory_equipment')
        .update({ image_path: imagePath })
        .eq('id', equipment.id);
      if (updateError) throw updateError;
      equipment.image_path = imagePath;
    }

    for (const file of documentFiles) {
      const documentPath = await uploadFile(equipment.id, 'documents', file);
      uploadedPaths.push(documentPath);
      await insertDocument(equipment.id, file, documentPath);
    }

    return decorateEquipment(equipment);
  } catch (uploadError) {
    if (uploadedPaths.length) await supabase.storage.from(BUCKET).remove(uploadedPaths);
    await supabase.from('inventory_equipment').delete().eq('id', equipment.id);
    throw uploadError;
  }
};

export const updateEquipment = async (equipment, { fields, imageFile, removeImage = false, documentFiles = [] }) => {
  let nextImagePath = equipment.image_path || null;
  let newlyUploadedImage = null;

  try {
    if (imageFile) {
      newlyUploadedImage = await uploadFile(equipment.id, 'image', imageFile);
      nextImagePath = newlyUploadedImage;
    } else if (removeImage) {
      nextImagePath = null;
    }

    const { error } = await supabase
      .from('inventory_equipment')
      .update({ ...fields, image_path: nextImagePath })
      .eq('id', equipment.id);
    if (error) throw error;

    // The new image is now the committed database value and must not be removed
    // if a later document upload fails.
    newlyUploadedImage = null;

    if ((imageFile || removeImage) && equipment.image_path) {
      const { error: removeError } = await supabase.storage.from(BUCKET).remove([equipment.image_path]);
      if (removeError) console.warn('Unable to remove previous equipment image:', removeError);
    }

    for (const file of documentFiles) {
      const documentPath = await uploadFile(equipment.id, 'documents', file);
      try {
        await insertDocument(equipment.id, file, documentPath);
      } catch (documentError) {
        await supabase.storage.from(BUCKET).remove([documentPath]);
        throw documentError;
      }
    }
  } catch (updateError) {
    if (newlyUploadedImage) await supabase.storage.from(BUCKET).remove([newlyUploadedImage]);
    throw updateError;
  }
};

export const deleteEquipmentDocument = async (document) => {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([document.storage_path]);
  if (storageError) throw storageError;
  const { error } = await supabase.from('inventory_equipment_documents').delete().eq('id', document.id);
  if (error) throw error;
};

export const downloadEquipmentDocument = async (document) => {
  const { data, error } = await supabase.storage.from(BUCKET).download(document.storage_path);
  if (error) throw error;
  return data;
};

export const deleteEquipment = async (equipment) => {
  const paths = [equipment.image_path, ...(equipment.documents || []).map((document) => document.storage_path)].filter(Boolean);
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths);
    if (storageError) throw storageError;
  }
  const { error } = await supabase.from('inventory_equipment').delete().eq('id', equipment.id);
  if (error) throw error;
};
