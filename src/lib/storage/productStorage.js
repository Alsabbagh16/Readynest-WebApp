import { supabase } from '@/lib/supabase';

export const fetchCategories = async () => {
  const { data, error } = await supabase.from('categories').select('id, name');
  if (error) {
    console.error('Error fetching categories:', error);
    throw error; 
  }
  return data;
};

export const createCategory = async (categoryName, categoryDescription = '') => {
  const newCategoryId = crypto.randomUUID();
  const { data, error } = await supabase
    .from('categories')
    .insert([{ id: newCategoryId, name: categoryName, description: categoryDescription, created_at: new Date().toISOString() }])
    .select()
    .single();
  if (error) {
    console.error('Error creating category:', error);
    throw error;
  }
  return data;
};

export const createProduct = async (productData, selectedAddonTemplateIds = []) => {
  const newProductId = crypto.randomUUID();
  const fullProductData = {
    ...productData,
    id: newProductId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: product, error: productError } = await supabase
    .from('products')
    .insert([fullProductData])
    .select()
    .single();

  if (productError) {
    console.error('Error creating product:', productError);
    throw productError;
  }

  if (selectedAddonTemplateIds.length > 0 && product) {
    const linksToInsert = selectedAddonTemplateIds.map(addonId => ({
      product_id: product.id,
      addon_id: addonId,
    }));

    if (linksToInsert.length > 0) {
      const { error: linkInsertError } = await supabase
        .from('product_addon_links')
        .insert(linksToInsert);

      if (linkInsertError) {
        console.error('Error inserting product addon links:', linkInsertError);
        await supabase.from('products').delete().eq('id', product.id);
        throw linkInsertError;
      }
    }
  }
  return product;
};

export const fetchProductsWithCategories = async () => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      price,
      type,
      image_url,
      value,
      isActive,
      created_at,
      updated_at,
      categories (id, name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products with categories:', error);
    throw error;
  }
  return data;
};

export const updateProduct = async (productId, updatedData, selectedAddonTemplateIds = []) => {
  const { data: product, error: productError } = await supabase
    .from('products')
    .update({ ...updatedData, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .select()
    .single();

  if (productError) {
    console.error('Error updating product:', productError);
    throw productError;
  }

  const { error: deleteLinksError } = await supabase
    .from('product_addon_links')
    .delete()
    .eq('product_id', productId);

  if (deleteLinksError) {
    console.error('Error deleting old product addon links:', deleteLinksError);
    throw deleteLinksError;
  }

  if (selectedAddonTemplateIds.length > 0 && product) {
    const linksToInsert = selectedAddonTemplateIds.map(addonId => ({
      product_id: product.id,
      addon_id: addonId,
    }));

    if (linksToInsert.length > 0) {
      const { error: linkInsertError } = await supabase
        .from('product_addon_links')
        .insert(linksToInsert);

      if (linkInsertError) {
        console.error('Error inserting updated product addon links:', linkInsertError);
        throw linkInsertError;
      }
    }
  }
  return product;
};


export const fetchAddonTemplates = async () => {
  const { data, error } = await supabase
    .from('addon_templates')
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    console.error('Error fetching addon templates:', error);
    throw error;
  }
  return data;
};

export const createAddonTemplate = async (addonTemplateData) => {
  const newAddonId = crypto.randomUUID();
  const { data, error } = await supabase
    .from('addon_templates')
    .insert([{ ...addonTemplateData, id: newAddonId, created_at: new Date().toISOString() }])
    .select()
    .single();
  if (error) {
    console.error('Error creating addon template:', error);
    throw error;
  }
  return data;
};

export const fetchProductById = async (productId) => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories (id, name),
      product_addon_links ( addon_id )
    `)
    .eq('id', productId)
    .single();

  if (error) {
    console.error('Error fetching product by ID:', error);
    throw error;
  }

  if (data && data.product_addon_links) {
    const addonTemplateIds = data.product_addon_links.map(link => link.addon_id);
    if (addonTemplateIds.length > 0) {
      const { data: addons, error: addonsError } = await supabase
        .from('addon_templates')
        .select('*')
        .in('id', addonTemplateIds);
      
      if (addonsError) {
        console.error('Error fetching linked addon templates:', addonsError);
      } else {
        data.linked_addons = addons; 
      }
    } else {
      data.linked_addons = [];
    }
  } else if (data) {
    data.linked_addons = [];
  }
  
  return data;
};