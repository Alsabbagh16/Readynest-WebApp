import { supabase } from '@/lib/supabase';
import type {
  ChurnRiskSubscription,
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
  async getChurnRisk(): Promise<ChurnRiskSubscription[]> {
    const { data, error } = await supabase.rpc('get_subscription_churn_risk');
    return unwrap<ChurnRiskSubscription[]>(data || [], error);
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
};
