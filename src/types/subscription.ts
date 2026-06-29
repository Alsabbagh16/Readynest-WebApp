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
  period_start: string;
  status: ServiceFulfillmentStatus;
  job_count: number;
  completed_count: number;
  expected_count: number;
}

export interface SubscriptionDashboardRow {
  client_id: string;
  client_name: string;
  phone: string;
  plan_type: 'Weekly' | 'Twice Weekly';
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
  plan_type: 'Weekly' | 'Twice Weekly';
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
