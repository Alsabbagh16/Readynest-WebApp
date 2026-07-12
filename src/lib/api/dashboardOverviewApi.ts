import { supabase } from '@/lib/supabase';
import type { DashboardJobScope, DashboardOverviewPayload } from '@/types/dashboardOverview';

export class DashboardOverviewApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'DashboardOverviewApiError';
    this.code = code;
  }
}

export const dashboardOverviewApi = {
  async getOverview(
    from: Date,
    to: Date,
    jobScope: DashboardJobScope,
    hideBusinessJobs: boolean,
  ): Promise<DashboardOverviewPayload> {
    const params = {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
      p_job_scope: jobScope,
      p_hide_business_jobs: hideBusinessJobs,
    };

    const [
      { data, error },
      { data: jobSeries, error: jobSeriesError },
      { data: bookingHeatmap, error: bookingHeatmapError },
      { data: newestCustomers, error: newestCustomersError },
      { data: employeePerformance, error: employeePerformanceError },
    ] = await Promise.all([
      supabase.rpc('get_dashboard_overview', params),
      supabase.rpc('get_dashboard_overview_job_series', params),
      supabase.rpc('get_dashboard_overview_booking_heatmap', {
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      }),
      supabase.rpc('get_dashboard_overview_newest_customers', {
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      }),
      supabase.rpc('get_dashboard_overview_employee_performance', {
        ...params,
        p_include_part_timers: true,
      }),
    ]);

    if (error) throw new DashboardOverviewApiError(error.message, error.code);
    if (jobSeriesError) throw new DashboardOverviewApiError(jobSeriesError.message, jobSeriesError.code);
    if (bookingHeatmapError) throw new DashboardOverviewApiError(bookingHeatmapError.message, bookingHeatmapError.code);
    if (newestCustomersError) throw new DashboardOverviewApiError(newestCustomersError.message, newestCustomersError.code);
    if (employeePerformanceError) throw new DashboardOverviewApiError(employeePerformanceError.message, employeePerformanceError.code);

    const overview = data as DashboardOverviewPayload;
    return {
      ...overview,
      customers: {
        ...overview.customers,
        booking_heatmap: bookingHeatmap,
        newest_customers: Array.isArray(newestCustomers) ? newestCustomers : [],
      },
      jobs: {
        ...overview.jobs,
        chart_series: Array.isArray(jobSeries) ? jobSeries : [],
        employee_performance: Array.isArray(employeePerformance) ? employeePerformance : [],
      },
    };
  },
};
