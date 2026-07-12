export type DashboardJobScope = 'all' | 'subscription' | 'one_time';
export type DashboardRevenueFilter = 'all' | 'subscriber' | 'one_time';
export type DashboardDatePreset = 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';
export type DashboardChartType = 'line' | 'stacked';

export interface DashboardMetric {
  value: number;
  previous: number;
}

export interface DashboardTopCustomer {
  client_id: string;
  name: string;
  email?: string | null;
  avatar_url?: string | null;
  total_orders: number;
  total_revenue: number;
}

export interface DashboardRevenuePoint {
  period_start: string;
  total: number;
  subscriber: number;
  one_time: number;
}

export interface DashboardJobPoint {
  period_start: string;
  total: number;
  completed: number;
  scheduled: number;
}

export interface DashboardHeatmapSlot {
  slot_index: number;
  slot_label: string;
  request_count: number;
  intensity: number;
}

export interface DashboardHeatmapDay {
  day_index: number;
  day_label: string;
  slots: DashboardHeatmapSlot[];
}

export interface DashboardBookingHeatmap {
  max_count: number;
  days: DashboardHeatmapDay[];
}

export interface DashboardNewestCustomer {
  client_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  user_type?: string | null;
  created_at: string;
}

export interface DashboardEmployeePerformanceRow {
  employee_id: string;
  employee_name: string;
  email?: string | null;
  is_part_timer: boolean;
  jobs_completed: number;
  hours_worked: number;
}

export interface DashboardDurationMode {
  hours: number | null;
  label: string;
  count: number;
}

export interface DashboardOverviewPayload {
  range: {
    from: string;
    to: string;
    previous_from: string;
    previous_to: string;
  };
  customers: {
    active_customers: DashboardMetric;
    new_customers: DashboardMetric;
    returning_customers: DashboardMetric;
    top_customers: DashboardTopCustomer[];
    booking_heatmap?: DashboardBookingHeatmap;
    newest_customers?: DashboardNewestCustomer[];
  };
  revenue: {
    total_revenue: DashboardMetric;
    subscriber_revenue: DashboardMetric;
    one_time_revenue: DashboardMetric;
    non_business_total_revenue?: DashboardMetric;
    non_business_subscriber_revenue?: DashboardMetric;
    non_business_one_time_revenue?: DashboardMetric;
    average_customer_spend: DashboardMetric;
    average_revenue_per_job: DashboardMetric;
    chart_series: DashboardRevenuePoint[];
    top_customers_by_filter: Record<DashboardRevenueFilter, DashboardTopCustomer[]>;
    non_business_top_customers_by_filter?: Record<DashboardRevenueFilter, DashboardTopCustomer[]>;
  };
  jobs: {
    total_jobs: DashboardMetric;
    average_jobs_per_day: DashboardMetric;
    hours_worked: DashboardMetric;
    completed_jobs: DashboardMetric;
    most_frequent_duration: DashboardDurationMode;
    chart_series?: DashboardJobPoint[];
    employee_performance?: DashboardEmployeePerformanceRow[];
  };
}
