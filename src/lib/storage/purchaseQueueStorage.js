import { supabase } from '@/lib/supabase';

export const submitWebsitePurchaseRequest = async (payload) => {
  const { data, error } = await supabase.rpc('submit_website_purchase_queue', { p_payload: payload });
  if (error) throw error;
  return { ...data, purchase_ref_id: data?.reserved_purchase_ref };
};

export const getPurchaseQueue = async () => {
  const { data, error } = await supabase.from('purchase_queue').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const approvePurchaseQueue = async (queueId) => {
  const { data, error } = await supabase.rpc('approve_purchase_queue', { p_queue_id: queueId });
  if (error) throw error;
  return data;
};

export const rejectPurchaseQueue = async (queueId, reason) => {
  const { error } = await supabase.rpc('reject_purchase_queue', { p_queue_id: queueId, p_reason: reason || null });
  if (error) throw error;
};

export const revivePurchaseQueue = async (queueId) => {
  const { error } = await supabase.rpc('revive_purchase_queue', { p_queue_id: queueId });
  if (error) throw error;
};

export const completeModifiedPurchaseQueue = async (queueId, purchaseRef) => {
  const { error } = await supabase.rpc('complete_modified_purchase_queue', { p_queue_id: queueId, p_purchase_ref: purchaseRef });
  if (error) throw error;
};

export const markQueueNotification = async (queueId, status, errorMessage = null) => {
  const { error } = await supabase.rpc('mark_purchase_queue_notification', { p_queue_id: queueId, p_status: status, p_error: errorMessage });
  if (error) throw error;
};
