import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all users (getAllUsers):', error);
    throw error; 
  }
  console.log('[userStorage] getAllUsers fetched:', data);
  return data.map(u => ({
    ...u,
    createdAt: u.created_at ? new Date(u.created_at) : null,
    dob: u.dob ? u.dob : null, 
    name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Unnamed User',
    userType: u.user_type || 'Personal',
    createdByAdmin: u.created_by_admin || null
  }));
};

export const createUser = async (userData) => {
  try {
    // Get current admin session before creating user
    const { data: { session } } = await supabase.auth.getSession();
    const adminName = session?.user?.user_metadata?.first_name || session?.user?.email || 'Unknown Admin';

    // Call the Edge Function to create user without auto-login
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        userData: {
          ...userData,
          createdByAdmin: adminName
        }
      }
    });

    if (error) {
      console.error('Error calling create-user function:', error);
      let functionMessage = '';
      try {
        const errorPayload = await error.context?.json();
        functionMessage = errorPayload?.error || errorPayload?.message || '';
      } catch (contextError) {
        console.warn('Could not parse create-user error response:', contextError);
      }
      throw new Error(functionMessage || `Failed to create user account: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to create user account');
    }

    return data.user;
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
};

export const findUserById = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      addresses (*),
      user_notes (*)
    `)
    .eq('id', userId)
    .single();

  if (error) {
    console.error(`Error fetching user ${userId}:`, error);
    return null;
  }
  return data ? { 
    ...data, 
    createdAt: data.created_at ? new Date(data.created_at) : null,
    dob: data.dob ? data.dob : null,
    name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email || 'Unnamed User',
    notes: data.user_notes && data.user_notes.length > 0 ? data.user_notes[0].notes : '',
    userType: data.user_type || 'Personal',
    addresses: data.addresses || [], 
    document_urls: data.document_urls || [],
    createdByAdmin: data.created_by_admin || null,
  } : null;
};

export const findUserByEmail = async (email) => {
  if (!email) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      addresses (*),
      user_notes (*)
    `)
    .eq('email', email)
    .maybeSingle(); 

  if (error) {
    console.error(`Error fetching user by email ${email}:`, error);
    return null;
  }
  return data ? { 
    ...data, 
    createdAt: data.created_at ? new Date(data.created_at) : null,
    dob: data.dob ? data.dob : null,
    name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email || 'Unnamed User',
    notes: data.user_notes && data.user_notes.length > 0 ? data.user_notes[0].notes : '',
    userType: data.user_type || 'Personal',
    addresses: data.addresses || [],
    document_urls: data.document_urls || [],
  } : null;
};


export const adminUpdateUserProfile = async (userId, updatedData) => {
  const {
    firstName,
    lastName,
    userType,
    first_name: firstNameSnake,
    last_name: lastNameSnake,
    user_type: userTypeSnake,
    ...restOfData
  } = updatedData;
  
  const dataToUpdate = {
    ...restOfData,
    first_name: firstNameSnake ?? firstName,
    last_name: lastNameSnake ?? lastName,
    user_type: userTypeSnake ?? userType,
    updated_at: new Date().toISOString()
  };

  if (dataToUpdate.password === '' || dataToUpdate.password === null || dataToUpdate.password === undefined) {
    delete dataToUpdate.password;
  }
  
  delete dataToUpdate.name; 
  delete dataToUpdate.createdAt; 
  delete dataToUpdate.id;
  delete dataToUpdate.password;

  // PostgreSQL date/number-backed optional columns cannot accept an empty string.
  ['dob', 'phone'].forEach((field) => {
    if (typeof dataToUpdate[field] === 'string' && dataToUpdate[field].trim() === '') {
      dataToUpdate[field] = null;
    }
  });
  Object.keys(dataToUpdate).forEach((field) => {
    if (dataToUpdate[field] === undefined) delete dataToUpdate[field];
  });

  const { data, error } = await supabase.rpc('admin_update_customer_profile', {
    p_user_id: userId,
    p_updates: dataToUpdate,
  });

  if (error) {
    console.error(`Error updating profile for user ${userId}:`, error);
    throw error;
  }
  if (data !== true) throw new Error('The customer profile update was not confirmed.');
  return { id: userId, ...dataToUpdate };
};

export const adminAddAddress = async (userId, addressData) => {
  const { data, error } = await supabase.rpc('admin_add_customer_address', {
    p_user_id: userId,
    p_address: {
      label: addressData.label?.trim() || null,
      street: addressData.street?.trim(),
      city: addressData.city?.trim(),
      zip: addressData.zip?.trim(),
      phone: addressData.phone?.trim(),
      alt_phone: addressData.alt_phone?.trim() || null,
      is_default: Boolean(addressData.is_default),
    },
  });
  if (error) throw error;
  return data;
};

export const adminUpdateAddress = async (userId, addressId, addressData) => {
  const { data, error } = await supabase.rpc('admin_update_customer_address', {
    p_user_id: userId,
    p_address_id: addressId,
    p_address: {
      label: addressData.label?.trim() || null,
      street: addressData.street?.trim(),
      city: addressData.city?.trim(),
      zip: addressData.zip?.trim(),
      phone: addressData.phone?.trim(),
      alt_phone: addressData.alt_phone?.trim() || null,
      is_default: Boolean(addressData.is_default),
    },
  });
  if (error) throw error;
  return data;
};

export const adminDeleteAddress = async (addressId) => {
  const { error } = await supabase
    .from('addresses')
    .delete()
    .eq('id', addressId);
  if (error) throw error;
  return true;
};

export const adminUpdateCredits = async (userId, newCreditsTotal) => {
  if (newCreditsTotal < 0) throw new Error("Credits cannot be negative.");
  const { data, error } = await supabase
    .from('profiles')
    .update({ credits: newCreditsTotal, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('id, credits')
    .single();
  if (error) throw error;
  return data.credits;
};

export const deleteUser = async (userId) => {
  try {
    // Call the Edge Function to delete the user completely
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { userId }
    });

    if (error) {
      console.error(`Error calling delete-user function:`, error);
      
      // Fallback: try to delete just the profile data
      console.log('Falling back to profile-only deletion...');
      await supabase.from('addresses').delete().eq('user_id', userId);
      await supabase.from('user_notes').delete().eq('user_id', userId);
      await supabase.from('bookings').update({ user_id: null }).eq('user_id', userId); 

      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        throw new Error(`Error deleting profile: ${profileError.message}`);
      }
    }

    return true;
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
};

export const saveUserNotes = async (userId, notes) => {
  const { data: existingNotes, error: fetchError } = await supabase
    .from('user_notes')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') { 
     console.error('Error fetching user notes:', fetchError);
     throw fetchError;
  }

  if (existingNotes) {
    const { error: updateError } = await supabase
      .from('user_notes')
      .update({ notes: notes, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await supabase
      .from('user_notes')
      .insert({ user_id: userId, notes: notes });
    if (insertError) throw insertError;
  }
};

export const getUserNotes = async (userId) => {
  const { data, error } = await supabase
    .from('user_notes')
    .select('notes')
    .eq('user_id', userId)
    .maybeSingle(); 

  if (error && error.code !== 'PGRST116') { 
    console.error('Error fetching user notes:', error);
    return ''; 
  }
  return data ? data.notes : '';
};

// Document Management Functions for Users
const USER_DOCUMENTS_BUCKET = 'user-documents';

export const uploadUserDocumentFile = async (userId, file) => {
  if (!userId || !file) {
    throw new Error('User ID and file are required for upload.');
  }
  const fileName = `${userId}/${uuidv4()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from(USER_DOCUMENTS_BUCKET)
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) {
    console.error('Error uploading user document to Supabase Storage:', error);
    throw error;
  }
  const { data: publicUrlData } = supabase.storage.from(USER_DOCUMENTS_BUCKET).getPublicUrl(data.path);
  return { ...data, publicURL: publicUrlData.publicUrl, path: data.path, name: file.name };
};

export const getUserDocumentsList = async (userId) => {
  if (!userId) return [];
  const { data, error } = await supabase.storage
    .from(USER_DOCUMENTS_BUCKET)
    .list(userId, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });

  if (error) {
    console.error('Error listing user documents:', error);
    throw error;
  }
  if (!data) return [];
  return data.map(file => ({
    ...file,
    publicURL: supabase.storage.from(USER_DOCUMENTS_BUCKET).getPublicUrl(`${userId}/${file.name}`).data.publicUrl,
    filePath: `${userId}/${file.name}`
  }));
};

export const deleteUserDocumentFile = async (filePath) => {
  const { data, error } = await supabase.storage
    .from(USER_DOCUMENTS_BUCKET)
    .remove([filePath]);
  if (error) {
    console.error('Error deleting user document:', error);
    throw error;
  }
  return data;
};
