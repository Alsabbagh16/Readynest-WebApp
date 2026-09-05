import { supabase } from '@/lib/supabase';
import type {
  FollowUpCard,
  FollowUpImportance,
  FollowUpPayload,
  SubscriptionDashboardRow,
  SubscriptionPurchaseService,
  SubscriptionStatus,
} from '@/types/subscription';

export class SubscriptionApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'SubscriptionApiError';
    this.code = code;
  }
}

const unwrap = <T>(data: T | null, error: { message: string; code?: string } | null): T => {
  if (error) throw new SubscriptionApiError(error.message, error.code);
  return data as T;
};

export const subscriptionApi = {
  // GET /api/subscriptions
  async getSubscriptions(): Promise<SubscriptionDashboardRow[]> {
    const { error: refreshError } = await supabase.rpc('refresh_subscription_health_for_dashboard');
    if (refreshError) throw new SubscriptionApiError(refreshError.message, refreshError.code);

    const { data, error } = await supabase.rpc('get_subscription_dashboard');
    return unwrap<SubscriptionDashboardRow[]>(data || [], error);
  },

  // GET /api/subscriptions/churn-risk
  async getFollowUpQueue(): Promise<FollowUpCard[]> {
    const { data, error } = await supabase.rpc('get_subscription_follow_up_queue');
    return unwrap<FollowUpCard[]>(data || [], error);
  },

  async getPurchaseService(purchaseRefId: string): Promise<SubscriptionPurchaseService> {
    const { data, error } = await supabase.rpc('get_subscription_purchase_service', {
      p_purchase_ref_id: purchaseRefId,
    });
    const rows = unwrap<SubscriptionPurchaseService[]>(data || [], error);
    if (!rows[0]) throw new SubscriptionApiError('Subscription purchase service details were not returned.');
    return rows[0];
  },

  // POST /api/subscriptions/follow-up
  async logFollowUp(clientId: string): Promise<FollowUpPayload> {
    const { data, error } = await supabase.rpc('log_subscription_follow_up', {
      p_client_id: clientId,
      p_channel: 'whatsapp',
    });
    const rows = unwrap<FollowUpPayload[]>(data || [], error);
    if (!rows[0]) throw new SubscriptionApiError('Follow-up payload was not returned.');
    return rows[0];
  },

  async activateSubscription(clientId: string): Promise<SubscriptionStatus> {
    const { data, error } = await supabase.rpc('activate_subscription', {
      p_client_id: clientId,
    });
    return unwrap<SubscriptionStatus>(data, error);
  },

  async pauseSubscription(clientId: string): Promise<SubscriptionStatus> {
    const { data, error } = await supabase.rpc('pause_subscription', { p_client_id: clientId });
    return unwrap<SubscriptionStatus>(data, error);
  },

  async resumeSubscription(clientId: string): Promise<SubscriptionStatus> {
    const { data, error } = await supabase.rpc('resume_subscription', { p_client_id: clientId });
    return unwrap<SubscriptionStatus>(data, error);
  },

  async createFollowUpCard(clientId: string, note: string, importance: FollowUpImportance, reminderDate: string | null): Promise<string> {
    const { data, error } = await supabase.rpc('create_follow_up_card', {
      p_client_id: clientId,
      p_note: note,
      p_importance: importance,
      p_reminder_date: reminderDate,
    });
    return unwrap<string>(data, error);
  },

  async updateFollowUpCard(cardId: string, note: string, importance: FollowUpImportance, reminderDate: string | null): Promise<void> {
    const { error } = await supabase.rpc('update_follow_up_card', {
      p_card_id: cardId,
      p_note: note,
      p_importance: importance,
      p_reminder_date: reminderDate,
    });
    unwrap<null>(null, error);
  },

  async completeFollowUpCard(cardId: string): Promise<void> {
    const { error } = await supabase.rpc('complete_follow_up_card', { p_card_id: cardId });
    unwrap<null>(null, error);
  },

  async reopenFollowUpCard(cardId: string): Promise<void> {
    const { error } = await supabase.rpc('reopen_follow_up_card', { p_card_id: cardId });
    unwrap<null>(null, error);
  },

  async dismissFollowUpCard(cardId: string): Promise<void> {
    const { error } = await supabase.rpc('dismiss_follow_up_card', { p_card_id: cardId });
    unwrap<null>(null, error);
  },
};
