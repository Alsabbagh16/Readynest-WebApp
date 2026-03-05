import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { validateBookingTime } from '@/lib/timeWindowValidator';
import { isValidUUID, generateFallbackPurchaseId } from '@/lib/uuidValidator';

// --- Configuration ---
// Note: Keeping the bucket name constant here for clarity
const JOB_DOCUMENTS_BUCKET = 'job-documents';
const SIGNED_URL_DURATION_SECONDS = 300; // 5 minutes

export const generateJobRefId = () => {
    return `JOB-${uuidv4().substring(0, 8).toUpperCase()}`;
};

export const createJob = async (jobData) => {
    // Validate time
    if (jobData.preferred_date) {
        const val = validateBookingTime(jobData.preferred_date);
        if (!val.isValid) throw new Error("Job time must be between 08:30 and 17:00.");
    }

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
    // Validate time if being updated
    if (updateData.preferred_date) {
        const val = validateBookingTime(updateData.preferred_date);
        if (!val.isValid) throw new Error("Job time must be between 08:30 and 17:00.");
    }

    const { error } = await supabase
        .from('jobs')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('job_ref_id', jobRefId);
    if (error) throw error;
    return true;
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
    // 1. List files
    const { data: fileList, error: listError } = await supabase.storage
        .from(JOB_DOCUMENTS_BUCKET)
        .list(jobRefId, {
            limit: 100,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' },
        });

    if (listError) {
        if (listError.message.includes('not found')) { // Catch bucket not found error
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

    if (!fileList || fileList.length === 0) return [];

    const validFiles = fileList.filter(file => file.id !== '.emptyFolderPlaceholder');

    // 2. Map valid files to an array of promises for Signed URLs
    const documentPromises = validFiles.map(async (file) => {
        const filePath = `${jobRefId}/${file.name}`;

        // Asynchronously request the signed URL
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from(JOB_DOCUMENTS_BUCKET)
            .createSignedUrl(filePath, SIGNED_URL_DURATION_SECONDS);

        if (signedUrlError) {
            console.error(`Error creating signed URL for ${file.name}:`, signedUrlError);
            // Return an object with an error placeholder for the URL
            return { name: file.name, path: filePath, publicURL: '#error', filePath: filePath };
        }

        return {
            name: file.name,
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