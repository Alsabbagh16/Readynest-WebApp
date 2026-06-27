import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { isValidUUID, generateFallbackPurchaseId } from '@/lib/uuidValidator';

// --- Configuration ---
// Note: Keeping the bucket name constant here for clarity
const JOB_DOCUMENTS_BUCKET = 'job-documents';
const SIGNED_URL_DURATION_SECONDS = 300; // 5 minutes

export const generateJobRefId = () => {
    return `JOB-${uuidv4().substring(0, 8).toUpperCase()}`;
};

export const createJob = async (jobData) => {
    // Double validation: Frontend does this, but Backend/Storage must also enforce it.
    // Check if the incoming purchaseId is undefined, null, empty string, or invalid UUID format.
    // If invalid, generate a new ID using generateFallbackPurchaseId().
    if (!isValidUUID(jobData.purchase_ref_id)) {
        jobData.purchase_ref_id = generateFallbackPurchaseId();
    }

    const { error } = await supabase
        .from('jobs')
        .insert([
            {
                ...jobData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }
        ]);
    if (error) throw error;
    return jobData;
};

export const getJobByRefId = async (jobRefId) => {
    const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('job_ref_id', jobRefId)
        .single();
    if (error) throw error;
    return data;
};

export const updateJob = async (jobRefId, updateData) => {
    const { data, error } = await supabase
        .from('jobs')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('job_ref_id', jobRefId)
        .select('job_ref_id');

    if (error) throw error;

    if (!data || data.length === 0) {
        throw new Error('Update was not applied (no rows updated). You may not have permission to edit this job.');
    }

    return true;
};

/**
 * @typedef {Object} PartTimePostingPayload
 * @property {number} slots_available
 * @property {number} hours_needed
 * @property {number} hourly_pay
 * @property {boolean} transport_included
 */

export const shareJobToPartTimers = async (jobRefId, postingData) => {
    if (!jobRefId) {
        throw new Error('Job Reference ID is required.');
    }

    const slotsAvailable = Number.parseInt(postingData.slots_available, 10);
    const hoursNeeded = Number.parseFloat(postingData.hours_needed);
    const hourlyPay = Number.parseFloat(postingData.hourly_pay);

    if (!Number.isInteger(slotsAvailable) || slotsAvailable < 1) {
        throw new Error('Slots available must be a whole number greater than 0.');
    }

    if (!Number.isFinite(hoursNeeded) || hoursNeeded <= 0) {
        throw new Error('Hours needed must be greater than 0.');
    }

    if (!Number.isFinite(hourlyPay) || hourlyPay <= 0) {
        throw new Error('Hourly pay must be greater than 0.');
    }

    const { data, error } = await supabase
        .from('jobs')
        .update({
            is_shared_to_part_time: true,
            slots_available: slotsAvailable,
            hours_needed: hoursNeeded,
            hourly_pay: hourlyPay,
            transport_included: postingData.transport_included === true,
            shared_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('job_ref_id', jobRefId)
        .select('job_ref_id');

    if (error) throw error;

    if (!data || data.length === 0) {
        throw new Error('Job was not shared. You may not have permission to edit this job.');
    }

    return true;
};

export const removeJobFromPartTimeBoard = async (jobRefId) => {
    if (!jobRefId) {
        throw new Error('Job Reference ID is required.');
    }

    const { data, error } = await supabase
        .from('jobs')
        .update({
            is_shared_to_part_time: false,
            shared_at: null,
            updated_at: new Date().toISOString(),
        })
        .eq('job_ref_id', jobRefId)
        .select('job_ref_id');

    if (error) throw error;

    if (!data || data.length === 0) {
        throw new Error('Job was not removed from the job board.');
    }

    return true;
};

export const getActivePartTimePostings = async () => {
    const { data, error } = await supabase.rpc('get_active_part_time_postings');

    if (error) throw error;

    return (data || [])
        .filter((job) => String(job.status || '').trim().toLowerCase() !== 'completed')
        .map((job) => ({
            ...job,
            title: job.product_name || 'ReadyNest Service Job',
        }));
};

export const verifyPartTimerByMobile = async (mobile) => {
    const normalizedMobile = String(mobile || '').replace(/[^\d+]/g, '').trim();

    if (normalizedMobile.length < 8) {
        throw new Error('Please enter a valid registered mobile number.');
    }

    const { data, error } = await supabase.rpc('verify_part_timer_by_mobile', {
        p_mobile: normalizedMobile,
    });

    if (error) throw error;

    const employee = data?.[0];

    if (!employee) {
        throw new Error('Mobile number not registered as a part-timer. Please contact support.');
    }

    return employee;
};

export const createPartTimeApplication = async (jobRefId, employeeId) => {
    if (!jobRefId) {
        throw new Error('Job Reference ID is required.');
    }

    if (!employeeId) {
        throw new Error('Verified part-timer session is required.');
    }

    const { data, error } = await supabase.rpc('apply_part_time_job', {
        p_job_ref_id: jobRefId,
        p_employee_id: employeeId,
    });

    if (error) throw error;

    return data || { alreadyApplied: false };
};

export const getPartTimeApplicationsByJobRef = async (jobRefId) => {
    if (!jobRefId) return [];

    const { data, error } = await supabase
        .from('part_time_applications')
        .select('id, job_ref_id, phone, employee_id, applied_at, status, admin_hidden_at, employee:employees(id, full_name, mobile, position)')
        .eq('job_ref_id', jobRefId)
        .is('admin_hidden_at', null)
        .order('applied_at', { ascending: false });

    if (error) throw error;

    return data || [];
};

export const getPartTimeApplicationsByEmployee = async (employeeId) => {
    if (!employeeId) return [];

    const { data, error } = await supabase.rpc('get_part_time_applications_for_employee', {
        p_employee_id: employeeId,
    });

    if (error) throw error;

    return (data || []).map((application) => ({
        ...application,
        title: application.product_name || 'ReadyNest Service Job',
    }));
};

export const getPartTimePayoutsByEmployee = async (employeeId) => {
    if (!employeeId) return [];

    const { data, error } = await supabase.rpc('get_part_time_payouts_for_employee', {
        p_employee_id: employeeId,
    });

    if (error) throw error;

    return data || [];
};

export const settlePartTimePayout = async (applicationId) => {
    if (!applicationId) {
        throw new Error('Payout application ID is required.');
    }

    const { data, error } = await supabase.rpc('settle_part_time_payout', {
        p_application_id: applicationId,
    });

    if (error) throw error;

    const settledPayout = data?.[0];
    if (!settledPayout) {
        throw new Error('This payout could not be settled. It may already be settled or the job is not completed.');
    }

    return settledPayout;
};

export const undoPartTimePayoutSettlement = async (applicationId) => {
    if (!applicationId) {
        throw new Error('Payout application ID is required.');
    }

    const { data, error } = await supabase.rpc('undo_part_time_payout_settlement', {
        p_application_id: applicationId,
    });

    if (error) throw error;

    const payout = data?.[0];
    if (!payout) {
        throw new Error('This payout could not be returned to pending.');
    }

    return payout;
};

export const updatePartTimePayoutAmount = async (applicationId, amount) => {
    const numericAmount = Number(amount);
    if (!applicationId || !Number.isFinite(numericAmount) || numericAmount < 0) {
        throw new Error('Enter a valid payout amount of zero or greater.');
    }

    const { data, error } = await supabase.rpc('update_part_time_payout_amount', {
        p_application_id: applicationId,
        p_amount: numericAmount,
    });

    if (error) throw error;

    const payout = data?.[0];
    if (!payout) {
        throw new Error('This payout amount could not be updated.');
    }

    return payout;
};

export const updatePartTimeApplicationStatus = async (applicationId, status) => {
    if (!applicationId) {
        throw new Error('Application ID is required.');
    }

    if (!['interested', 'accepted', 'declined'].includes(status)) {
        throw new Error('Invalid part-time application status.');
    }

    const { data, error } = await supabase.rpc('set_part_time_application_status', {
        p_application_id: applicationId,
        p_status: status,
    });

    if (error) throw error;

    const updatedApplication = data?.[0];

    if (!updatedApplication) {
        throw new Error('Application status was not updated.');
    }

    return updatedApplication;
};

export const hideDeclinedPartTimeApplication = async (applicationId) => {
    if (!applicationId) {
        throw new Error('Application ID is required.');
    }

    const { data, error } = await supabase.rpc('hide_declined_part_time_application', {
        p_application_id: applicationId,
    });

    if (error) throw error;

    const hiddenApplication = data?.[0];

    if (!hiddenApplication) {
        throw new Error('Only declined applications can be removed from this section.');
    }

    return hiddenApplication;
};

export const getAllJobs = async () => {
    const { data, error } = await supabase
        .from('jobs')
        .select(`
            *,
            purchase:purchases (product_name),
            assigned_employees:employees (id, full_name) 
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching jobs:', error);
        throw error;
    }
    return data.map(job => ({
        ...job,
        product_name: job.purchase?.product_name || 'Direct Job',
        assigned_employee_names: job.assigned_employees_ids && job.assigned_employees_ids.length > 0 && job.assigned_employees && job.assigned_employees.length > 0
            ? job.assigned_employees.map(emp => emp.full_name).join(', ')
            : 'N/A',
    }));
};

export const getJobsByEmployeeId = async (employeeId) => {
    if (!employeeId) return [];

    const employeeIdAsString = String(employeeId);
    const { data, error } = await supabase
        .from('jobs')
        .select(`
            *,
            purchase:purchases (product_name, product_id)
        `)
        .order('preferred_date', { ascending: false });

    if (error) {
        console.error('Error fetching jobs by employee ID:', error);
        return [];
    }

    return (data || [])
        .filter((job) => {
            const assignedEmployeeIds = Array.isArray(job.assigned_employees_ids)
                ? job.assigned_employees_ids
                : [];
            return assignedEmployeeIds.some((assignedId) => String(assignedId) === employeeIdAsString);
        })
        .map((job) => ({
            ...job,
            source_type: 'job',
            product_name: job.purchase?.product_name || job.product_name || 'Service Job',
            product_id: job.purchase?.product_id,
        }));
};

/**
 * Fetches jobs for a specific user ID.
 * MODIFIED: Fetches jobs where user is the CLIENT (user_id) OR assigned EMPLOYEE (in assigned_employees_ids)
 */
export const getUserJobs = async (userId) => {
    if (!userId) return [];

    // We need an OR condition: (user_id = userId) OR (assigned_employees_ids contains userId)
    // Supabase .or() syntax: 'user_id.eq.userId,assigned_employees_ids.cs.{userId}'
    // Note: cs operator means "contains" for array columns
    
    const { data, error } = await supabase
        .from('jobs')
        .select(`
            *,
            purchase:purchases (product_name, product_id)
        `)
        .or(`user_id.eq.${userId},assigned_employees_ids.cs.{${userId}}`)
        .order('preferred_date', { ascending: false });

    if (error) {
        console.error('Error fetching user/employee jobs:', error);
        throw error;
    }

    return data.map(job => ({
        ...job,
        product_name: job.purchase?.product_name || 'Service',
        product_id: job.purchase?.product_id
    }));
};

/**
 * Uploads a document related to a specific job reference ID.
 * Since this is an internal admin function, we assume the user is authenticated.
 */
export const uploadJobDocument = async (jobRefId, file) => {
    if (!jobRefId || !file) {
        throw new Error('Job Reference ID and file are required for upload.');
    }

    const fileName = `${jobRefId}/${uuidv4()}-${file.name}`;

    const { data, error } = await supabase.storage
        .from(JOB_DOCUMENTS_BUCKET)
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
        });

    if (error) {
        console.error('Error uploading job document to Supabase Storage:', error);
        throw error;
    }

    // Since the document is private, we still return the path/filename, 
    // but the URL will be generated upon retrieval using createSignedUrl.
    return { path: data.path, publicURL: '', fileName: file.name };
};

/**
 * Retrieves documents for a job and generates secure, time-limited Signed URLs.
 * NOTE: This function requires 'await' inside the .map() and uses Promise.all.
 */
export const getJobDocuments = async (jobRefId) => {
    const listFilesRecursively = async (folderPath, depth = 0) => {
        const { data: entries, error: listError } = await supabase.storage
            .from(JOB_DOCUMENTS_BUCKET)
            .list(folderPath, {
                limit: 100,
                offset: 0,
                sortBy: { column: 'name', order: 'asc' },
            });

        if (listError) throw listError;
        if (!entries || entries.length === 0) return [];

        const nestedFiles = [];
        for (const entry of entries) {
            if (entry.name === '.emptyFolderPlaceholder') continue;

            const entryPath = `${folderPath}/${entry.name}`;
            const isFolder = !entry.id && !entry.metadata;
            if (isFolder && depth < 4) {
                nestedFiles.push(...await listFilesRecursively(entryPath, depth + 1));
            } else if (!isFolder) {
                nestedFiles.push({ ...entry, filePath: entryPath });
            }
        }

        return nestedFiles;
    };

    let validFiles;
    try {
        validFiles = await listFilesRecursively(jobRefId);
    } catch (listError) {
        if (listError.message?.includes('not found')) {
            console.error(`Storage bucket '${JOB_DOCUMENTS_BUCKET}' not found. Check configuration.`);
            throw listError;
        }
        if (listError.message === 'The specified key does not exist.') {
            console.warn(`No documents folder found for job ${jobRefId}.`);
            return [];
        }
        console.error('Error listing job documents:', listError);
        throw listError;
    }

    if (validFiles.length === 0) return [];

    // 2. Map valid files to an array of promises for Signed URLs
    const documentPromises = validFiles.map(async (file) => {
        const filePath = file.filePath;
        const displayName = file.name.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-/i, '');

        // Asynchronously request the signed URL
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from(JOB_DOCUMENTS_BUCKET)
            .createSignedUrl(filePath, SIGNED_URL_DURATION_SECONDS);

        if (signedUrlError) {
            console.error(`Error creating signed URL for ${file.name}:`, signedUrlError);
            // Return an object with an error placeholder for the URL
            return { name: displayName, path: filePath, publicURL: '#error', filePath: filePath };
        }

        return {
            name: displayName,
            path: filePath,
            publicURL: signedUrlData.signedUrl, // The temporary secure link
            filePath: filePath
        };
    });

    // 3. Wait for all promises to resolve before returning
    const documents = await Promise.all(documentPromises);

    return documents;
};

/**
 * Deletes a document from the storage.
 */
export const deleteJobDocument = async (filePath) => {
    if (!filePath) throw new Error("File path is required for deletion.");

    const { data, error } = await supabase.storage
        .from(JOB_DOCUMENTS_BUCKET)
        .remove([filePath]);

    if (error) {
        console.error('Error deleting job document:', error);
        throw error;
    }
    return data;
};
