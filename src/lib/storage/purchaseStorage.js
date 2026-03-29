
import { supabase } from '@/lib/supabase';

// Helper to validate and clean UUIDs
const cleanUuid = (id) => {
    if (!id || typeof id !== 'string') return null;
    const trimmed = id.trim();
    return trimmed === '' ? null : trimmed;
};

export const createPurchase = async (purchaseData) => {
  try {
    const purchaseRefId = purchaseData.purchase_ref_id || `PUR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Ensure numeric values are numbers or 0
    const paidAmount = parseFloat(purchaseData.paid_amount || 0);
    const finalAmount = purchaseData.final_amount_due_on_arrival !== undefined 
        ? parseFloat(purchaseData.final_amount_due_on_arrival) 
        : paidAmount;

    // We now use user_id as the single source of truth for the linked user.
    // customer_id is deprecated and removed.
    const userId = cleanUuid(purchaseData.user_id) || cleanUuid(purchaseData.customer_id);

    const payload = {
        purchase_ref_id: purchaseRefId,
        user_id: userId,
        email: purchaseData.email,
        name: purchaseData.name,
        user_phone: purchaseData.user_phone,
        
        product_id: cleanUuid(purchaseData.product_id),
        product_name: purchaseData.product_name || 'Custom Purchase',
        
        paid_amount: paidAmount,
        final_amount_due_on_arrival: finalAmount,
        discount_amount: parseFloat(purchaseData.discount_amount || 0),
        coupon_code: purchaseData.coupon_code || null,
        
        payment_type: purchaseData.payment_type || 'Cash',
        status: purchaseData.status || 'Pending',
        
        address: purchaseData.address || null,
        
        preferred_booking_date: purchaseData.preferred_booking_date || null,
        scheduled_at: purchaseData.scheduled_at || null,
        
        // Addons data - use selected_addons which is the existing column
        selected_addons: purchaseData.addons || purchaseData.selected_addons || null,
        
        // Raw selections for detailed booking info
        raw_selections: purchaseData.raw_selections || null,
        
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('purchases')
        .insert([payload])
        .select('*, preferred_booking_date') // Explicitly request it as per requirements
        .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating purchase:", error);
    throw error;
  }
};

export const updatePurchase = async (purchaseRefId, updateData) => {
  try {
     const payload = {
        ...updateData,
        updated_at: new Date().toISOString()
     };

     // Clean UUIDs if present in updateData
     if ('user_id' in payload) payload.user_id = cleanUuid(payload.user_id);
     if ('product_id' in payload) payload.product_id = cleanUuid(payload.product_id);
     
     // Remove any legacy customer_id reference from update data
     if ('customer_id' in payload) {
         // If user_id is missing but customer_id is present, migrate it
         if (!payload.user_id && payload.customer_id) {
             payload.user_id = cleanUuid(payload.customer_id);
         }
         delete payload.customer_id;
     }

     const { data, error } = await supabase
        .from('purchases')
        .update(payload)
        .eq('purchase_ref_id', purchaseRefId)
        .select()
        .single();

     if (error) throw error;
     return data;
  } catch (error) {
     console.error("Error updating purchase:", error);
     throw error;
  }
};

export const getPurchaseByRef = async (refId) => {
    const { data, error } = await supabase
        .from('purchases')
        .select(`
            *,
            profiles!purchases_user_id_fkey (first_name, last_name, email, phone)
        `)
        .eq('purchase_ref_id', refId)
        .single();
    
    if (error) {
        console.error("Supabase select error in getPurchaseByRef:", error);
        throw error;
    }
    return data;
};
