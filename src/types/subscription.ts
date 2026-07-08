export type SubscriptionStatus = 'active' | 'unbooked' | 'paused' | 'expiring';
export type SubscriptionStatusFilter = 'all' | SubscriptionStatus;
export type PaymentRetentionStatus = 'paid' | 'pending' | 'failed' | 'missed';
export type ServiceFulfillmentStatus = 'completed' | 'partial' | 'missed' | 'empty';

export interface PaymentRetentionPeriod {
  period_start: string;
  status: PaymentRetentionStatus;
  purchase_ref_id: string | null;
}

export interface ServiceFulfillmentPeriod {
  slot_number: number;
  status: ServiceFulfillmentStatus;
  job_status: string | null;
  job_ref_id: string | null;
  preferred_date: string | null;
}

export interface SubscriptionPurchaseService {
  purchase_ref_id: string;
  plan_type: 'Weekly' | 'Twice Weekly' | 'Custom';
  subscription_days_per_week: number | null;
  expected_jobs: number;
  service_score: number;
  service_history: ServiceFulfillmentPeriod[];
}

export interface SubscriptionDashboardRow {
  client_id: string;
  client_name: string;
  phone: string;
  plan_type: 'Weekly' | 'Twice Weekly' | 'Custom';
  subscription_days_per_week: number | null;
  hourly_rate: number;
  status: SubscriptionStatus;
  last_clean_date: string | null;
  subscription_started_at: string;
  latest_subscription_purchase_ref_id: string | null;
  payment_retention_score: number;
  service_fulfillment_score: number;
  payment_history: PaymentRetentionPeriod[];
  service_history: ServiceFulfillmentPeriod[];
}

export interface ChurnRiskSubscription {
  client_id: string;
  client_name: string;
  phone: string;
  plan_type: 'Weekly' | 'Twice Weekly' | 'Custom';
  subscription_days_per_week: number | null;
  status: Extract<SubscriptionStatus, 'unbooked' | 'paused'>;
  last_clean_date: string | null;
  days_since_last_clean: number | null;
}

export interface SubscriptionDashboardSummary {
  activeSubscriptions: number;
  paymentRetentionRate: number;
  serviceFulfillmentRate: number;
  churnRiskCount: number;
}

export interface FollowUpPayload {
  follow_up_id: string;
  clean_phone: string;
  whatsapp_message: string;
  client_name: string;
}
