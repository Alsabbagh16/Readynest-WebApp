import { supabase } from '@/lib/supabase';

// ============ INVENTORY CATEGORIES ============

export const getAllInventoryCategories = async () => {
  const { data, error } = await supabase
    .from('inventory_categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const createInventoryCategory = async (categoryData) => {
  const { data, error } = await supabase
    .from('inventory_categories')
    .insert([categoryData])
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
};

export const updateInventoryCategory = async (id, categoryData) => {
  const { data, error } = await supabase
    .from('inventory_categories')
    .update(categoryData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
};

export const deleteInventoryCategory = async (id) => {
  // Check if category has items
  const { data: items } = await supabase
    .from('inventory_items')
    .select('id')
    .eq('category_id', id)
    .limit(1);

  if (items && items.length > 0) {
    return { success: false, error: 'Cannot delete category with existing items. Please reassign or delete items first.' };
  }

  const { error } = await supabase
    .from('inventory_categories')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
};

// ============ INVENTORY SUPPLIERS ============

export const getAllInventorySuppliers = async () => {
  const { data, error } = await supabase
    .from('inventory_suppliers')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const createInventorySupplier = async (supplierData) => {
  const { data, error } = await supabase
    .from('inventory_suppliers')
    .insert([supplierData])
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
};

export const updateInventorySupplier = async (id, supplierData) => {
  const { data, error } = await supabase
    .from('inventory_suppliers')
    .update(supplierData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
};

export const deleteInventorySupplier = async (id) => {
  // Check if supplier has items
  const { data: items } = await supabase
    .from('inventory_items')
    .select('id')
    .eq('supplier_id', id)
    .limit(1);

  if (items && items.length > 0) {
    return { success: false, error: 'Cannot delete supplier with existing items. Please reassign or delete items first.' };
  }

  const { error } = await supabase
    .from('inventory_suppliers')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
};

// ============ INVENTORY ITEMS ============

export const getAllInventoryItems = async () => {
  const { data, error } = await supabase
    .from('inventory_items')
    .select(`
      *,
      category:inventory_categories(id, name),
      supplier:inventory_suppliers(id, name)
    `)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getInventoryItemById = async (id) => {
  const { data, error } = await supabase
    .from('inventory_items')
    .select(`
      *,
      category:inventory_categories(id, name),
      supplier:inventory_suppliers(id, name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createInventoryItem = async (itemData) => {
  const { data, error } = await supabase
    .from('inventory_items')
    .insert([itemData])
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
};

export const updateInventoryItem = async (id, itemData) => {
  const { data, error } = await supabase
    .from('inventory_items')
    .update(itemData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
};

export const deleteInventoryItem = async (id) => {
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
};

export const getLowStockItems = async (threshold = 5) => {
  const { data, error } = await supabase
    .from('inventory_items')
    .select(`
      *,
      category:inventory_categories(id, name),
      supplier:inventory_suppliers(id, name)
    `)
    .lt('quantity', threshold)
    .order('quantity', { ascending: true });

  if (error) throw error;
  return data || [];
};
