import { supabase } from '@/lib/supabase';

/**
 * Checks if the current user is an employee (not just a client/admin, but explicitly in employees table).
 * This is useful for conditional rendering of employee-specific features like "Start Job".
 * @param {string} userId - The Supabase Auth User ID
 * @returns {Promise<boolean>} - True if user exists in employees table
 */
export const checkIsEmployee = async (userId) => {
  if (!userId) return false;
  
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
        console.error("Error checking employee status:", error);
        return false;
    }
    
    // If we found a record, they are an employee.
    // We could check role here if needed, but mere existence in this table usually implies employee status
    // or at least admin status. 
    return !!data;
  } catch (error) {
    console.error("Exception checking employee status:", error);
    return false;
  }
};