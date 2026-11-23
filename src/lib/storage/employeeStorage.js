import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const PART_TIMER_EMAIL_DOMAIN = 'part-timer.readynest.local';

const normalizeEmployeeUpdateValue = (value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }

  return value;
};

export const getEmployees = async () => {
  const { data, error } = await supabase
    .from('employees')
    .select(`
      *,
      department:employee_departments!employees_department_id_fkey(id, name, sort_order),
      employee_position:employee_positions!employees_position_id_fkey(id, department_id, name, sort_order)
    `)
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
        department_id: employeeData.departmentId || null,
        position_id: employeeData.positionId || null,
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
        visible_in_job_assignment: employeeData.visible_in_job_assignment !== false,
        preferred_off_day: employeeData.preferredOffDay || null,
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

export const addPartTimerEmployee = async (name) => {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    throw new Error('Part timer name is required.');
  }

  const employeeId = uuidv4();
  const timestamp = new Date().toISOString();
  const employeePayload = {
    id: employeeId,
    email: `${employeeId}@${PART_TIMER_EMAIL_DOMAIN}`,
    full_name: trimmedName,
    position: 'Part Timer',
    role: 'employee',
    is_part_timer: true,
    visible_in_job_assignment: true,
    document_urls: [],
    created_at: timestamp,
    updated_at: timestamp,
  };

  const { data, error } = await supabase
    .from('employees')
    .insert(employeePayload)
    .select()
    .single();

  if (error) {
    console.error('Error adding part timer employee:', error);
    throw error;
  }

  return data;
};

export const updateEmployeeJobVisibility = async (employeeId, visible) => {
  if (!employeeId) {
    throw new Error('Employee ID is required for visibility updates.');
  }

  const { data, error } = await supabase
    .from('employees')
    .update({
      visible_in_job_assignment: visible,
      updated_at: new Date().toISOString(),
    })
    .eq('id', employeeId)
    .select()
    .single();

  if (error) {
    console.error('Error updating employee job visibility:', error);
    throw error;
  }

  return data;
};

export const updateEmployee = async (updatedData) => {
  // Removed password update logic since we removed password fields
  const { id, ...employeeDetails } = updatedData;

  if (!id) {
    throw new Error("Employee ID is required for updates.");
  }

  const payloadToUpdate = {
    ...employeeDetails,
    full_name: updatedData.fullName ?? updatedData.full_name,
    passport_number: updatedData.passportNumber ?? updatedData.passport_number,
    passport_issue_date: updatedData.passportIssueDate || updatedData.passport_issue_date || null,
    passport_expiry_date: updatedData.passportExpiryDate || updatedData.passport_expiry_date || null,
    date_of_birth: updatedData.dateOfBirth || updatedData.date_of_birth || null,
    hire_date: updatedData.hireDate || updatedData.hire_date || null,
    visa_number: updatedData.visaNumber ?? updatedData.visa_number,
    visa_issuance_date: updatedData.visaIssuanceDate || updatedData.visa_issuance_date || null,
    visa_expiry_date: updatedData.visaExpiryDate || updatedData.visa_expiry_date || null,
    photo_url: updatedData.photoUrl ?? updatedData.photo_url,
    department_id: updatedData.departmentId ?? updatedData.department_id,
    position_id: updatedData.positionId ?? updatedData.position_id,
    preferred_off_day: updatedData.preferredOffDay ?? updatedData.preferred_off_day,
    document_urls: updatedData.document_urls,
    updated_at: new Date().toISOString(),
  };
  
  const validColumns = [
    'email', 'full_name', 'mobile', 'address', 'position', 'origin', 'sex', 
    'passport_number', 'passport_issue_date', 'passport_expiry_date', 
    'date_of_birth', 'hire_date', 'visa_number', 'visa_issuance_date', 'visa_expiry_date', 
    'photo_url', 'role', 'document_urls', 'is_part_timer', 'visible_in_job_assignment',
    'age', 'employee_code', 'metadata_code', 'numeric_metadata_code', 'phone_suffix',
    'internal_notes', 'preferred_off_day', 'department_id', 'position_id', 'updated_at'
  ];

  const filteredPayload = Object.keys(payloadToUpdate)
    .filter(key => validColumns.includes(key) && payloadToUpdate[key] !== undefined) 
    .reduce((obj, key) => {
      obj[key] = normalizeEmployeeUpdateValue(payloadToUpdate[key]);
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
  // Convert email to lowercase for case-insensitive search
  const normalizedEmail = email.toLowerCase();
  
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .ilike('email', `${normalizedEmail}`) // Use ilike for case-insensitive comparison
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
    .select(`
      *,
      department:employee_departments!employees_department_id_fkey(id, name, sort_order),
      employee_position:employee_positions!employees_position_id_fkey(id, department_id, name, sort_order)
    `)
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

const EMPLOYEE_PHOTOS_BUCKET = 'employee-photos';

const sanitizeFileName = (fileName) => String(fileName || 'employee-photo')
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

export const uploadEmployeePhoto = async (employeeId, file) => {
  if (!employeeId || !file) {
    throw new Error('Employee ID and photo are required.');
  }

  if (!String(file.type || '').startsWith('image/')) {
    throw new Error('Please choose a valid image file.');
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Employee photos must be smaller than 8 MB.');
  }

  const filePath = `${employeeId}/${uuidv4()}-${sanitizeFileName(file.name)}`;
  const { data, error } = await supabase.storage
    .from(EMPLOYEE_PHOTOS_BUCKET)
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from(EMPLOYEE_PHOTOS_BUCKET)
    .getPublicUrl(data.path);

  return { path: data.path, publicUrl: publicUrlData.publicUrl };
};

export const getEmployeeDepartments = async () => {
  const { data: departments, error: departmentError } = await supabase
    .from('employee_departments')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (departmentError) throw departmentError;

  const { data: positions, error: positionError } = await supabase
    .from('employee_positions')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (positionError) throw positionError;

  return (departments || []).map((department) => ({
    ...department,
    positions: (positions || []).filter((position) => position.department_id === department.id),
  }));
};

export const createEmployeeDepartment = async (name) => {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) throw new Error('Department name is required.');

  const { data: currentDepartments, error: countError } = await supabase
    .from('employee_departments')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  if (countError) throw countError;

  const { data, error } = await supabase
    .from('employee_departments')
    .insert({
      name: trimmedName,
      sort_order: Number(currentDepartments?.[0]?.sort_order ?? -1) + 1,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const createEmployeePosition = async (departmentId, name) => {
  const trimmedName = String(name || '').trim();
  if (!departmentId) throw new Error('Department is required.');
  if (!trimmedName) throw new Error('Position name is required.');

  const { data: currentPositions, error: countError } = await supabase
    .from('employee_positions')
    .select('sort_order')
    .eq('department_id', departmentId)
    .order('sort_order', { ascending: false })
    .limit(1);
  if (countError) throw countError;

  const { data, error } = await supabase
    .from('employee_positions')
    .insert({
      department_id: departmentId,
      name: trimmedName,
      sort_order: Number(currentPositions?.[0]?.sort_order ?? -1) + 1,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const renameEmployeeDirectoryItem = async (type, id, name) => {
  const tableName = type === 'department' ? 'employee_departments' : 'employee_positions';
  const trimmedName = String(name || '').trim();
  if (!id || !trimmedName) throw new Error('A name is required.');

  const { data, error } = await supabase
    .from(tableName)
    .update({ name: trimmedName })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteEmployeeDirectoryItem = async (type, id) => {
  const tableName = type === 'department' ? 'employee_departments' : 'employee_positions';
  const { error } = await supabase.from(tableName).delete().eq('id', id);
  if (error) throw error;
};

export const reorderEmployeeDirectoryItems = async (type, orderedItems) => {
  const tableName = type === 'department' ? 'employee_departments' : 'employee_positions';
  const updates = orderedItems.map((item, index) => (
    supabase.from(tableName).update({ sort_order: index }).eq('id', item.id)
  ));
  const results = await Promise.all(updates);
  const failedResult = results.find((result) => result.error);
  if (failedResult?.error) throw failedResult.error;
};

export const persistEmployeePositionLayout = async (departments) => {
  const positionLayout = (departments || []).flatMap((department) => (
    (department.positions || []).map((position, index) => ({
      departmentId: department.id,
      positionId: position.id,
      sortOrder: index,
    }))
  ));

  const positionResults = await Promise.all(positionLayout.map((item) => (
    supabase
      .from('employee_positions')
      .update({ department_id: item.departmentId, sort_order: item.sortOrder })
      .eq('id', item.positionId)
  )));
  const failedPositionResult = positionResults.find((result) => result.error);
  if (failedPositionResult?.error) throw failedPositionResult.error;

  const employeeResults = await Promise.all(positionLayout.map((item) => (
    supabase
      .from('employees')
      .update({ department_id: item.departmentId, updated_at: new Date().toISOString() })
      .eq('position_id', item.positionId)
  )));
  const failedEmployeeResult = employeeResults.find((result) => result.error);
  if (failedEmployeeResult?.error) throw failedEmployeeResult.error;
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

const getOriginalEmployeeDocumentName = (storedName) => (
  String(storedName || '').replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, '')
);

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
    name: getOriginalEmployeeDocumentName(file.name),
    storedName: file.name,
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
