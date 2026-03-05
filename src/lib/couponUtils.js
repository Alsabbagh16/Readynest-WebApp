import { supabase } from '@/lib/supabase';

/**
 * Validates a coupon against all business rules
 * @param {string} couponCode - The coupon code to validate
 * @param {number} bookingTotal - The total booking amount
 * @param {string} userId - The user's ID (optional for guests)
 * @param {string} userEmail - The user's email
 * @returns {Promise<{isValid: boolean, error: string, coupon: object}>}
 */
export async function validateCoupon(couponCode, bookingTotal, userId = null, userEmail = null) {
  try {
    // Fetch coupon by code
    const { data: coupon, error: fetchError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .single();

    if (fetchError || !coupon) {
      return { isValid: false, error: 'Coupon code not found', coupon: null };
    }

    // Check if coupon is active
    if (!coupon.is_active) {
      return { isValid: false, error: 'This coupon is no longer active', coupon: null };
    }

    // Check date validity
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return { isValid: false, error: 'This coupon is not yet valid', coupon: null };
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return { isValid: false, error: 'This coupon has expired', coupon: null };
    }

    // Check global usage limit
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return { isValid: false, error: 'This coupon has reached its usage limit', coupon: null };
    }

    // Check minimum booking value
    if (bookingTotal < coupon.min_booking_value) {
      return { 
        isValid: false, 
        error: `Minimum booking value of BD ${Number(coupon.min_booking_value).toFixed(2)} required for this coupon`, 
        coupon: null 
      };
    }

    // Check per-user usage limit
    if (coupon.max_uses_per_user && (userId || userEmail)) {
      const { data: redemptions, error: redemptionError } = await supabase
        .from('coupon_redemptions')
        .select('used_count')
        .eq('coupon_id', coupon.id)
        .or(userId ? `user_id.eq.${userId}` : `user_email.eq.${userEmail}`)
        .maybeSingle();

      if (redemptionError && redemptionError.code !== 'PGRST116') {
        console.error('Error checking redemptions:', redemptionError);
        // Don't fail validation on system error, but log it
      }

      if (redemptions && redemptions.used_count >= coupon.max_uses_per_user) {
        return { 
          isValid: false, 
          error: 'You have already used this coupon the maximum number of times', 
          coupon: null 
        };
      }
    }

    return { isValid: true, error: null, coupon };
  } catch (error) {
    console.error('Error validating coupon:', error);
    return { isValid: false, error: 'An error occurred while validating the coupon', coupon: null };
  }
}

/**
 * Calculates the discount amount based on coupon type
 * @param {object} coupon - The coupon object
 * @param {number} bookingTotal - The total booking amount
 * @returns {number} The discount amount
 */
export function calculateDiscount(coupon, bookingTotal) {
  if (!coupon) return 0;

  if (coupon.type === 'percentage') {
    const discount = (bookingTotal * coupon.value) / 100;
    // Ensure discount doesn't exceed booking total
    return Math.min(discount, bookingTotal);
  } else if (coupon.type === 'fixed') {
    // Ensure discount doesn't exceed booking total
    return Math.min(Number(coupon.value), bookingTotal);
  }

  return 0;
}

/**
 * Combines validation and discount calculation
 * @param {string} couponCode - The coupon code
 * @param {number} bookingTotal - The total booking amount
 * @param {string} userId - The user's ID
 * @param {string} userEmail - The user's email
 * @returns {Promise<{isValid: boolean, error: string, coupon: object, discountAmount: number, finalAmount: number}>}
 */
export async function applyCoupon(couponCode, bookingTotal, userId = null, userEmail = null) {
  const validation = await validateCoupon(couponCode, bookingTotal, userId, userEmail);

  if (!validation.isValid) {
    return {
      isValid: false,
      error: validation.error,
      coupon: null,
      discountAmount: 0,
      finalAmount: bookingTotal
    };
  }

  const discountAmount = calculateDiscount(validation.coupon, bookingTotal);
  const finalAmount = Math.max(0, bookingTotal - discountAmount);

  return {
    isValid: true,
    error: null,
    coupon: validation.coupon,
    discountAmount,
    finalAmount
  };
}

/**
 * Records a coupon redemption and increments usage count
 * @param {string} couponId - The coupon ID
 * @param {string} userId - The user's ID (optional)
 * @param {string} userEmail - The user's email (optional)
 * @param {string} userPhone - The user's phone (optional)
 * @returns {Promise<{success: boolean, error: string}>}
 */
export async function recordCouponRedemption(couponId, userId = null, userEmail = null, userPhone = null) {
  try {
    // 1. Manual Redemption Record (Ensures email/phone tracking for guests)
    // This is useful for analytics even if the RPC handles some logic
    const { data: existingRedemption } = await supabase
      .from('coupon_redemptions')
      .select('*')
      .eq('coupon_id', couponId)
      .or(userId ? `user_id.eq.${userId}` : `user_email.eq.${userEmail}`)
      .maybeSingle();

    if (existingRedemption) {
      // Update existing redemption count
      const { error: updateError } = await supabase
        .from('coupon_redemptions')
        .update({ 
          used_count: existingRedemption.used_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRedemption.id);

      if (updateError) {
        console.error('Error updating manual redemption record:', updateError);
        // Log but continue
      }
    } else {
      // Create new redemption record
      const { error: insertError } = await supabase
        .from('coupon_redemptions')
        .insert({
          coupon_id: couponId,
          user_id: userId,
          user_email: userEmail,
          user_phone: userPhone,
          used_count: 1
        });

      if (insertError) {
        console.error('Error creating manual redemption record:', insertError);
        // Log but continue
      }
    }

    // 2. Increment coupon's global used_count via RPC
    // Using the exact signature: increment_coupon_usage(p_coupon_id uuid, p_user_id uuid)
    try {
      const { error: rpcError } = await supabase.rpc('increment_coupon_usage', {
        p_coupon_id: couponId,
        p_user_id: userId || null 
      });

      if (rpcError) {
        console.warn('RPC increment_coupon_usage failed (non-fatal):', rpcError);
        
        // Fallback: Manual update if RPC fails
        // This ensures the global counter is still incremented if the specific RPC fails or permissions issue
        const { data: coupon } = await supabase
          .from('coupons')
          .select('used_count')
          .eq('id', couponId)
          .single();

        if (coupon) {
          await supabase
            .from('coupons')
            .update({ 
              used_count: (coupon.used_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', couponId);
        }
      }
    } catch (e) {
      console.warn('Exception calling increment_coupon_usage RPC:', e);
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error in recordCouponRedemption:', error);
    // Return success to avoid blocking checkout, but log the error internally
    return { success: true, error: error.message }; 
  }
}

/**
 * Fetches all coupons (admin only)
 * @returns {Promise<Array>}
 */
export async function getAllCoupons() {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*, created_by_employee:employees(full_name, email)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching coupons:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return [];
  }
}

/**
 * Creates a new coupon
 * @param {object} couponData - The coupon data
 * @returns {Promise<{success: boolean, error: string, data: object}>}
 */
export async function createCoupon(couponData) {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        ...couponData,
        code: couponData.code.toUpperCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating coupon:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, error: null, data };
  } catch (error) {
    console.error('Error creating coupon:', error);
    return { success: false, error: 'An unexpected error occurred', data: null };
  }
}

/**
 * Updates an existing coupon
 * @param {string} couponId - The coupon ID
 * @param {object} couponData - The updated coupon data
 * @returns {Promise<{success: boolean, error: string, data: object}>}
 */
export async function updateCoupon(couponId, couponData) {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .update({
        ...couponData,
        code: couponData.code.toUpperCase(),
        updated_at: new Date().toISOString()
      })
      .eq('id', couponId)
      .select()
      .single();

    if (error) {
      console.error('Error updating coupon:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, error: null, data };
  } catch (error) {
    console.error('Error updating coupon:', error);
    return { success: false, error: 'An unexpected error occurred', data: null };
  }
}

/**
 * Deletes a coupon
 * @param {string} couponId - The coupon ID
 * @returns {Promise<{success: boolean, error: string}>}
 */
export async function deleteCoupon(couponId) {
  try {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', couponId);

    if (error) {
      console.error('Error deleting coupon:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Toggles coupon active status
 * @param {string} couponId - The coupon ID
 * @param {boolean} isActive - The new active status
 * @returns {Promise<{success: boolean, error: string}>}
 */
export async function toggleCouponStatus(couponId, isActive) {
  try {
    const { error } = await supabase
      .from('coupons')
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', couponId);

    if (error) {
      console.error('Error toggling coupon status:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error toggling coupon status:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}