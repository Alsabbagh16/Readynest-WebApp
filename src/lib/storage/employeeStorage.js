import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const getEmployees = async () => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching employees:', error);
    if (error.message.includes("infinite recursion")) {
        throw new Error("Failed to fetch employees due to a Supabase RLS policy issue (infinite recursion). Please check your 'employees' table policies.");
    }
    throw error;
  }
  return data;
};

export const addEmployee = async (employeeData) => {
  if (!employeeData.email) {
    throw new Error("Email is required for new employees.");
  }
  
  // We no longer require password here since we are not creating the auth user manually anymore
  // The user is expected to provide the UUID of an EXISTING auth user.

  if (!employeeData.id) {
      throw new Error("Employee ID (Supabase Auth User UUID) is required.");
  }

  try {
    // We strictly use the provided ID. We do NOT create an auth user here anymore as per request imply
    // or at least we prioritize the provided ID.
    // However, the prompt says "Fix the employee table to use the provided UUID instead of generating a new one".
    // It also says "remove the create password fields". This strongly implies the Auth User ALREADY exists (e.g. invited via Supabase Dashboard or signed up separately)
    // and we are just linking a profile to it.

    const authUserId = employeeData.id;
    console.log('[employeeStorage] Using provided auth user ID:', authUserId);

    const employeePayload = {
        id: authUserId, // Use provided UUID
        email: employeeData.email,
        full_name: employeeData.fullName || null,
        mobile: employeeData.mobile || null,
        address: employeeData.address || null,
        position: employeeData.position || null,
        origin: employeeData.origin || null,
        sex: employeeData.sex || null,
        passport_number: employeeData.passportNumber || null,
        passport_issue_date: employeeData.passportIssueDate || null,
        passport_expiry_date: employeeData.passportExpiryDate || null,
        date_of_birth: employeeData.dateOfBirth || null,
        hire_date: employeeData.hireDate || null,
        visa_number: employeeData.visaNumber || null,
        visa_issuance_date: employeeData.visaIssuanceDate || null,
        visa_expiry_date: employeeData.visaExpiryDate || null,
        photo_url: employeeData.photoUrl || null,
        role: employeeData.role || 'employee',
        document_urls: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { data: employeeProfile, error: profileError } = await supabase
        .from('employees')
        .insert(employeePayload)
        .select()
        .single();

    if (profileError) {
        console.error('Error adding employee profile:', profileError);
        throw new Error(`Failed to save employee profile: ${profileError.message}`);
    }
    
    console.log('[employeeStorage] Successfully created employee profile:', employeeProfile);
    return employeeProfile;

  } catch (error) {
      console.error('Full error in addEmployee:', error);
      throw error;
  }
};

export const updateEmployee = async (updatedData) => {
  // Removed password update logic since we removed password fields
  const { id, ...employeeDetails } = updatedData;

  if (!id) {
    throw new Error("Employee ID is required for updates.");
  }

  const payloadToUpdate = {
    ...employeeDetails,
    full_name: updatedData.fullName || updatedData.full_name,
    passport_number: updatedData.passportNumber || updatedData.passport_number,
    passport_issue_date: updatedData.passportIssueDate || updatedData.passport_issue_date || null,
    passport_expiry_date: updatedData.passportExpiryDate || updatedData.passport_expiry_date || null,
    date_of_birth: updatedData.dateOfBirth || updatedData.date_of_birth || null,
    hire_date: updatedData.hireDate || updatedData.hire_date || null,
    visa_number: updatedData.visaNumber || updatedData.visa_number,
    visa_issuance_date: updatedData.visaIssuanceDate || updatedData.visa_issuance_date || null,
    visa_expiry_date: updatedData.visaExpiryDate || updatedData.visa_expiry_date || null,
    photo_url: updatedData.photoUrl || updatedData.photo_url,
    document_urls: updatedData.document_urls,
    updated_at: new Date().toISOString(),
  };
  
  const validColumns = [
    'email', 'full_name', 'mobile', 'address', 'position', 'origin', 'sex', 
    'passport_number', 'passport_issue_date', 'passport_expiry_date', 
    'date_of_birth', 'hire_date', 'visa_number', 'visa_issuance_date', 'visa_expiry_date', 
    'photo_url', 'role', 'document_urls', 'updated_at'
  ];

  const filteredPayload = Object.keys(payloadToUpdate)
    .filter(key => validColumns.includes(key) && payloadToUpdate[key] !== undefined) 
    .reduce((obj, key) => {
      obj[key] = payloadToUpdate[key];
      return obj;
    }, {});


  const { data, error } = await supabase
    .from('employees')
    .update(filteredPayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating employee profile:', error);
    throw error;
  }
  if (!data) throw new Error("Employee not found for profile update");
  return data;
};

export const deleteEmployee = async (employeeId) => {
  try {
    const { error: profileDeleteError, count } = await supabase
        .from('employees')
        .delete({ count: 'exact' })
        .eq('id', employeeId);

    if (profileDeleteError) {
        console.error('Error deleting employee profile:', profileDeleteError);
        throw profileDeleteError;
    }
    if (count === 0) {
        console.warn("Employee profile not found for deletion, or already deleted.");
    }
    
    // We no longer automatically delete the Auth user because we didn't create it in this flow,
    // and the admin API call might fail if not using service role key or if configured differently.
    // However, usually if you delete the profile, you might want to delete access.
    // For safety in this "Bring Your Own ID" flow, we will attempt it but not fail hard.
    
    try {
        const { error: authUserDeleteError } = await supabase.auth.admin.deleteUser(employeeId);
        if (authUserDeleteError) {
            console.warn('Could not delete Supabase Auth user (might be external or restricted):', authUserDeleteError.message);
        }
    } catch (e) {
        console.warn('Skipping auth user deletion attempt:', e);
    }

    return true;
  } catch (error) {
      console.error('Full error in deleteEmployee:', error);
      throw error;
  }
};

export const findEmployeeByEmail = async (email) => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('email', email)
    .maybeSingle(); 

  if (error) {
    console.error('Error finding employee by email:', error);
     if (error.message.includes("infinite recursion")) {
        throw new Error("Failed to find employee due to a Supabase RLS policy issue (infinite recursion). Please check your 'employees' table policies.");
    }
    return null; 
  }
  return data;
};

export const findEmployeeById = async (id) => {
  if (!id) return null;
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error finding employee by ID:', error);
    if (error.code === 'PGRST116') {
      // No rows returned - not an error, just no employee found
      return null;
    }
    if (error.message.includes("infinite recursion")) {
        throw new Error("Failed to find employee due to a Supabase RLS policy issue (infinite recursion). Please check your 'employees' table policies.");
    }
    throw error;
  }
  return data;
};

export const updateEmployeePhotoUrl = async (employeeId, photoUrl) => {
    if (!employeeId || !photoUrl) {
        throw new Error("Employee ID and Photo URL are required.");
    }
    const { data, error } = await supabase
        .from('employees')
        .update({ photo_url: photoUrl, updated_at: new Date().toISOString() })
        .eq('id', employeeId)
        .select()
        .single();

    if (error) {
        console.error('Error updating employee photo URL:', error);
        throw error;
    }
    return data;
};

// Document Management Functions for Employees
const EMPLOYEE_DOCUMENTS_BUCKET = 'employee-documents';

export const uploadEmployeeDocumentFile = async (employeeId, file) => {
  if (!employeeId || !file) {
    throw new Error('Employee ID and file are required for upload.');
  }
  const fileName = `${employeeId}/${uuidv4()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from(EMPLOYEE_DOCUMENTS_BUCKET)
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) {
    console.error('Error uploading employee document to Supabase Storage:', error);
    throw error;
  }
  const { data: publicUrlData } = supabase.storage.from(EMPLOYEE_DOCUMENTS_BUCKET).getPublicUrl(data.path);
  return { ...data, publicURL: publicUrlData.publicUrl, path: data.path, name: file.name };
};

export const getEmployeeDocumentsList = async (employeeId) => {
  if (!employeeId) return [];
  const { data, error } = await supabase.storage
    .from(EMPLOYEE_DOCUMENTS_BUCKET)
    .list(employeeId, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });

  if (error) {
    console.error('Error listing employee documents:', error);
    throw error;
  }
  if (!data) return [];
  return data.map(file => ({
    ...file,
    publicURL: supabase.storage.from(EMPLOYEE_DOCUMENTS_BUCKET).getPublicUrl(`${employeeId}/${file.name}`).data.publicUrl,
    filePath: `${employeeId}/${file.name}`
  }));
};

export const deleteEmployeeDocumentFile = async (filePath) => {
  const { data, error } = await supabase.storage
    .from(EMPLOYEE_DOCUMENTS_BUCKET)
    .remove([filePath]);
  if (error) {
    console.error('Error deleting employee document:', error);
    throw error;
  }
  return data;
};