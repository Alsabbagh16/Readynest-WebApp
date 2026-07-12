import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  CalendarRange,
  Clock3,
  DollarSign,
  LineChart,
  RefreshCw,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { useDashboardOverview } from '@/hooks/useDashboardOverview';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

const formatCurrency = (value) => `${Number(value || 0).toFixed(3)} BD`;
const formatNumber = (value, decimals = 0) => Number(value || 0).toLocaleString(undefined, {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
});

const getTrend = (metric) => {
  const current = Number(metric?.value || 0);
  const previous = Number(metric?.previous || 0);
  if (previous === 0 && current === 0) return { label: '0.0%', direction: 'flat', value: 0 };
  if (previous === 0) return { label: '+100.0%', direction: 'up', value: 100 };
  const value = ((current - previous) / Math.abs(previous)) * 100;
  return {
    label: `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`,
    direction: value > 0 ? 'up' : value < 0 ? 'down' : 'flat',
    value,
  };
};

const MetricCard = ({ title, value, metric, icon: Icon, formatter = formatNumber, loading, tone = 'blue' }) => {
  const trend = getTrend(metric);
  const isUp = trend.direction === 'up';
  const isDown = trend.direction === 'down';
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <Card className="rounded-2xl border border-slate-100 shadow-sm">
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">{title}</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{formatter(value)}</p>
              </div>
              <div className={`rounded-2xl p-2.5 ${toneClasses[tone] || toneClasses.blue}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className={`mt-4 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
              isUp ? 'bg-emerald-50 text-emerald-700' : isDown ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {isUp ? <ArrowUpRight className="mr-1 h-3.5 w-3.5" /> : isDown ? <ArrowDownRight className="mr-1 h-3.5 w-3.5" /> : null}
              {trend.label} vs previous period
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const DashboardDateRangePicker = ({ preset, setPreset, customRange, setCustomRange, range }) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
    <Select value={preset} onValueChange={setPreset}>
      <SelectTrigger className="h-10 w-full rounded-xl bg-white sm:w-[170px]">
        <CalendarRange className="mr-2 h-4 w-4 text-blue-600" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="last_7_days">Last 7 Days</SelectItem>
        <SelectItem value="last_30_days">Last 30 Days</SelectItem>
        <SelectItem value="this_month">This Month</SelectItem>
        <SelectItem value="last_month">Last Month</SelectItem>
        <SelectItem value="custom">Custom</SelectItem>
      </SelectContent>
    </Select>
    {preset === 'custom' && (
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" value={customRange.from} onChange={(event) => setCustomRange((prev) => ({ ...prev, from: event.target.value }))} className="h-10 rounded-xl bg-white" />
        <Input type="date" value={customRange.to} onChange={(event) => setCustomRange((prev) => ({ ...prev, to: event.target.value }))} className="h-10 rounded-xl bg-white" />
      </div>
    )}
    <div className="text-xs font-semibold text-slate-400">
      {format(range.from, 'MMM d')} - {format(new Date(range.to.getTime() - 1), 'MMM d, yyyy')}
    </div>
  </div>
);

const CustomerTopFiveList = ({ customers, loading }) => (
  <Card className="rounded-2xl border border-slate-100 shadow-sm">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center text-base">
        <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
        Top 5 Customers
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      {loading ? (
        <div className="space-y-3 p-5 pt-0">
          {[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-12 w-full rounded-xl" />)}
        </div>
      ) : customers?.length ? (
        <div className="divide-y divide-slate-100">
          {customers.map((customer, index) => (
            <div key={customer.client_id || index} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={customer.avatar_url || undefined} />
                <AvatarFallback className="bg-blue-50 text-sm font-bold text-blue-700">
                  {(customer.name || 'C').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                {customer.client_id ? (
                  <Link to={`/admin-dashboard/user/${customer.client_id}`} className="block truncate text-sm font-semibold text-slate-950 hover:text-blue-700 hover:underline">
                    {customer.name}
                  </Link>
                ) : (
                  <p className="truncate text-sm font-semibold text-slate-950">{customer.name}</p>
                )}
                <p className="text-xs text-slate-400">{formatNumber(customer.total_orders)} orders</p>
              </div>
              <p className="text-sm font-bold text-slate-950">{formatCurrency(customer.total_revenue)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center px-5 text-center text-sm text-slate-400">
          No customer spend in this date range.
        </div>
      )}
    </CardContent>
  </Card>
);

const NewestCustomersList = ({ customers, loading }) => (
  <Card className="rounded-2xl border border-slate-100 shadow-sm">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center text-base">
        <Users className="mr-2 h-5 w-5 text-blue-600" />
        Newest Customers
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      {loading ? (
        <div className="space-y-3 p-5 pt-0">
          {[0, 1].map((item) => <Skeleton key={item} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : customers?.length ? (
        <div className="divide-y divide-slate-100">
          {customers.map((customer) => (
            <div key={customer.client_id} className="grid grid-cols-[auto_1fr] items-center gap-3 px-5 py-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-slate-100 text-sm font-bold text-slate-700">
                  {(customer.name || 'C').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <Link to={`/admin-dashboard/user/${customer.client_id}`} className="block truncate text-sm font-semibold text-slate-950 hover:text-blue-700 hover:underline">
                  {customer.name}
                </Link>
                <p className="truncate text-xs text-slate-400">
                  {customer.user_type || 'Personal'} · {customer.created_at ? format(new Date(customer.created_at), 'MMM d, yyyy') : 'New'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center px-5 text-center text-sm text-slate-400">
          No new customers in this range.
        </div>
      )}
    </CardContent>
  </Card>
);

const getHeatmapClassName = (intensity) => {
  if (intensity >= 0.85) return 'bg-blue-700 text-white';
  if (intensity >= 0.65) return 'bg-blue-500 text-white';
  if (intensity >= 0.4) return 'bg-blue-300 text-blue-950';
  if (intensity > 0) return 'bg-blue-100 text-blue-900';
  return 'bg-slate-50 text-slate-400';
};

const BookingRequestHeatmap = ({ heatmap, loading, compact = false }) => {
  const days = heatmap?.days || [];
  const slotLabels = days[0]?.slots?.map((slot) => slot.slot_label) || ['6-9 AM', '9 AM-12 PM', '12-3 PM', '3-6 PM', '6-10 PM'];

  return (
    <Card className={`${compact ? '' : 'mt-4'} rounded-2xl border border-slate-100 shadow-sm`}>
      <CardHeader className={compact ? 'p-4 pb-2' : 'pb-3'}>
        <div>
          <CardTitle className={`flex items-center ${compact ? 'text-sm' : 'text-base'}`}>
            <CalendarRange className={`${compact ? 'mr-1.5 h-4 w-4' : 'mr-2 h-5 w-5'} text-blue-600`} />
            Heatmap of Booking Requests
          </CardTitle>
          {!compact && <p className="mt-1 text-xs font-medium text-slate-400">Day of week vs. requested time of day</p>}
        </div>
      </CardHeader>
      <CardContent className={compact ? 'p-4 pt-2' : undefined}>
        {loading ? (
          <Skeleton className={`${compact ? 'h-56' : 'h-72'} w-full rounded-2xl`} />
        ) : days.length ? (
          <div className="overflow-x-auto">
            <div className={compact ? 'min-w-[480px]' : 'min-w-[620px]'}>
              <div className={`${compact ? 'grid-cols-[44px_repeat(5,minmax(72px,1fr))] gap-1.5' : 'grid-cols-[72px_repeat(5,minmax(96px,1fr))] gap-2'} grid`}>
                <div />
                {slotLabels.map((label) => (
                  <div key={label} className={`${compact ? 'px-1 text-[9px]' : 'px-2 text-[11px]'} text-center font-bold uppercase text-slate-400`}>
                    {label}
                  </div>
                ))}
                {days.map((day) => (
                  <React.Fragment key={day.day_index}>
                    <div className={`${compact ? 'text-xs' : 'text-sm'} flex items-center font-bold text-slate-600`}>{day.day_label}</div>
                    {day.slots.map((slot) => (
                      <div
                        key={`${day.day_index}-${slot.slot_index}`}
                        className={`${compact ? 'h-8 rounded-lg text-xs' : 'h-14 rounded-xl text-sm'} flex items-center justify-center font-bold transition ${getHeatmapClassName(Number(slot.intensity || 0))}`}
                        title={`${day.day_label}, ${slot.slot_label}: ${slot.request_count} request${slot.request_count === 1 ? '' : 's'}`}
                      >
                        {slot.request_count}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
              <div className={`${compact ? 'mt-3 gap-1.5 text-[10px]' : 'mt-4 gap-2 text-xs'} flex items-center justify-end font-semibold text-slate-400`}>
                <span>Low</span>
                <span className={`${compact ? 'h-2 w-4' : 'h-3 w-6'} rounded bg-slate-50 ring-1 ring-slate-100`} />
                <span className={`${compact ? 'h-2 w-4' : 'h-3 w-6'} rounded bg-blue-100`} />
                <span className={`${compact ? 'h-2 w-4' : 'h-3 w-6'} rounded bg-blue-300`} />
                <span className={`${compact ? 'h-2 w-4' : 'h-3 w-6'} rounded bg-blue-500`} />
                <span className={`${compact ? 'h-2 w-4' : 'h-3 w-6'} rounded bg-blue-700`} />
                <span>High</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-60 items-center justify-center text-sm text-slate-400">No booking requests in this range.</div>
        )}
      </CardContent>
    </Card>
  );
};

const getRevenueMetric = (data, filter, hideBusiness = false) => {
  if (!data) return { value: 0, previous: 0 };
  if (hideBusiness) {
    if (filter === 'subscriber') return data.revenue.non_business_subscriber_revenue || data.revenue.subscriber_revenue;
    if (filter === 'one_time') return data.revenue.non_business_one_time_revenue || data.revenue.one_time_revenue;
    return data.revenue.non_business_total_revenue || data.revenue.total_revenue;
  }
  if (filter === 'subscriber') return data.revenue.subscriber_revenue;
  if (filter === 'one_time') return data.revenue.one_time_revenue;
  return data.revenue.total_revenue;
};

const RevenueTrackerCard = ({
  title,
  filter,
  setFilter,
  showCustomers,
  hideBusiness,
  setHideBusiness,
  data,
  loading,
}) => {
  const metric = getRevenueMetric(data, filter, hideBusiness);
  const topCustomerMap = hideBusiness
    ? data?.revenue?.non_business_top_customers_by_filter
    : data?.revenue?.top_customers_by_filter;
  const topCustomers = topCustomerMap?.[filter] || [];

  return (
    <Card className="rounded-2xl border border-slate-100 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-9 rounded-xl bg-white sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Revenue</SelectItem>
              <SelectItem value="subscriber">Subscriber</SelectItem>
              <SelectItem value="one_time">One-Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-3xl font-bold text-slate-950">{formatCurrency(metric.value)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">Filtered income tracker</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            {typeof setHideBusiness === 'function' ? (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-xs font-semibold text-slate-500">Hide business accounts</span>
                  <Switch checked={hideBusiness} onCheckedChange={setHideBusiness} />
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-xs font-semibold text-slate-500">Customer details</span>
                <Switch checked={showCustomers} onCheckedChange={() => {}} />
              </div>
            )}
            {showCustomers && (
              <div className="mt-4 space-y-2">
                {topCustomers.length ? topCustomers.map((customer) => (
                  <div key={customer.client_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
                    <Link to={`/admin-dashboard/user/${customer.client_id}`} className="min-w-0 truncate text-sm font-semibold text-slate-700 hover:text-blue-700 hover:underline">
                      {customer.name}
                    </Link>
                    <span className="shrink-0 text-sm font-bold text-slate-950">{formatCurrency(customer.total_revenue)}</span>
                  </div>
                )) : (
                  <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">No customers for this filter.</p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

const RevenueTrendChart = ({ series, loading, chartType, setChartType }) => {
  const width = 720;
  const height = 260;
  const padding = { top: 20, right: 24, bottom: 42, left: 58 };
  const points = (series || []).map((point) => ({
    ...point,
    total: Number(point.total || 0),
    subscriber: Number(point.subscriber || 0),
    one_time: Number(point.one_time || 0),
  }));
  const maxValue = Math.max(1, ...points.map((point) => point.total));
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xFor = (index) => padding.left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * plotWidth);
  const yFor = (value) => padding.top + plotHeight - (Number(value || 0) / maxValue) * plotHeight;
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(point.total)}`).join(' ');
  const barWidth = points.length > 0 ? Math.max(12, Math.min(36, plotWidth / points.length - 8)) : 16;

  return (
    <Card className="rounded-2xl border border-slate-100 shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center text-base">
            {chartType === 'line' ? <LineChart className="mr-2 h-5 w-5 text-blue-600" /> : <BarChart3 className="mr-2 h-5 w-5 text-blue-600" />}
            Revenue Trend
          </CardTitle>
          <div className="flex w-full rounded-xl bg-slate-100 p-1 sm:w-auto">
            {[{ value: 'line', label: 'Line' }, { value: 'stacked', label: 'Stacked' }].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setChartType(option.value)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition sm:flex-none ${
                  chartType === option.value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-72 w-full rounded-2xl" />
        ) : points.length ? (
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[620px]">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padding.top + plotHeight - ratio * plotHeight;
                return (
                  <g key={ratio}>
                    <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                    <text x={padding.left - 12} y={y + 4} textAnchor="end" className="fill-slate-400 text-[11px] font-semibold">
                      {formatNumber(maxValue * ratio)}
                    </text>
                  </g>
                );
              })}
              {chartType === 'line' ? (
                <>
                  <path d={path} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  {points.map((point, index) => (
                    <circle key={`${point.period_start}-${index}`} cx={xFor(index)} cy={yFor(point.total)} r="4" fill="#2563eb" stroke="#fff" strokeWidth="2" />
                  ))}
                </>
              ) : (
                <>
                  {points.map((point, index) => {
                    const subscriberHeight = (point.subscriber / maxValue) * plotHeight;
                    const oneTimeHeight = (point.one_time / maxValue) * plotHeight;
                    const x = xFor(index) - barWidth / 2;
                    const baseY = padding.top + plotHeight;
                    return (
                      <g key={`${point.period_start}-${index}`}>
                        <rect x={x} y={baseY - oneTimeHeight} width={barWidth} height={oneTimeHeight} rx="4" fill="#60a5fa" />
                        <rect x={x} y={baseY - oneTimeHeight - subscriberHeight} width={barWidth} height={subscriberHeight} rx="4" fill="#2563eb" />
                      </g>
                    );
                  })}
                  <g>
                    <circle cx={width - 170} cy={18} r="5" fill="#2563eb" />
                    <text x={width - 160} y={22} className="fill-slate-500 text-[11px] font-semibold">Subscriber</text>
                    <circle cx={width - 82} cy={18} r="5" fill="#60a5fa" />
                    <text x={width - 72} y={22} className="fill-slate-500 text-[11px] font-semibold">One-time</text>
                  </g>
                </>
              )}
              {points.map((point, index) => {
                if (points.length > 8 && index % Math.ceil(points.length / 6) !== 0 && index !== points.length - 1) return null;
                return (
                  <text key={`label-${point.period_start}`} x={xFor(index)} y={height - 16} textAnchor="middle" className="fill-slate-400 text-[11px] font-semibold">
                    {format(new Date(point.period_start), 'MMM d')}
                  </text>
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="flex h-72 items-center justify-center text-sm text-slate-400">No revenue data for this range.</div>
        )}
      </CardContent>
    </Card>
  );
};

const JobTrendChart = ({ series, loading }) => {
  const width = 720;
  const height = 260;
  const padding = { top: 22, right: 24, bottom: 42, left: 52 };
  const points = (series || []).map((point) => ({
    ...point,
    total: Number(point.total || 0),
    completed: Number(point.completed || 0),
    scheduled: Number(point.scheduled || 0),
  }));
  const maxValue = Math.max(1, ...points.map((point) => point.total));
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xFor = (index) => padding.left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * plotWidth);
  const barWidth = points.length > 0 ? Math.max(12, Math.min(34, plotWidth / points.length - 8)) : 16;
  const heightFor = (value) => (Number(value || 0) / maxValue) * plotHeight;
  const baseY = padding.top + plotHeight;

  return (
    <Card className="mt-4 rounded-2xl border border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-base">
          <BarChart3 className="mr-2 h-5 w-5 text-blue-600" />
          Job Chart
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-72 w-full rounded-2xl" />
        ) : points.length ? (
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[620px]">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padding.top + plotHeight - ratio * plotHeight;
                return (
                  <g key={ratio}>
                    <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                    <text x={padding.left - 10} y={y + 4} textAnchor="end" className="fill-slate-400 text-[11px] font-semibold">
                      {formatNumber(maxValue * ratio)}
                    </text>
                  </g>
                );
              })}
              {points.map((point, index) => {
                const scheduledHeight = heightFor(point.scheduled);
                const completedHeight = heightFor(point.completed);
                const x = xFor(index) - barWidth / 2;
                return (
                  <g key={`${point.period_start}-${index}`}>
                    <rect x={x} y={baseY - scheduledHeight} width={barWidth} height={scheduledHeight} rx="4" fill="#93c5fd" />
                    <rect x={x} y={baseY - scheduledHeight - completedHeight} width={barWidth} height={completedHeight} rx="4" fill="#10b981" />
                  </g>
                );
              })}
              <g>
                <circle cx={width - 172} cy={18} r="5" fill="#10b981" />
                <text x={width - 162} y={22} className="fill-slate-500 text-[11px] font-semibold">Completed</text>
                <circle cx={width - 82} cy={18} r="5" fill="#93c5fd" />
                <text x={width - 72} y={22} className="fill-slate-500 text-[11px] font-semibold">Open</text>
              </g>
              {points.map((point, index) => {
                if (points.length > 8 && index % Math.ceil(points.length / 6) !== 0 && index !== points.length - 1) return null;
                return (
                  <text key={`job-label-${point.period_start}`} x={xFor(index)} y={height - 16} textAnchor="middle" className="fill-slate-400 text-[11px] font-semibold">
                    {format(new Date(point.period_start), 'MMM d')}
                  </text>
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="flex h-72 items-center justify-center text-sm text-slate-400">No job activity in this range.</div>
        )}
      </CardContent>
    </Card>
  );
};

const EmployeePerformanceRanking = ({ rows, loading, showPartTimers, setShowPartTimers }) => {
  const visibleRows = showPartTimers ? rows : rows.filter((row) => !row.is_part_timer);

  return (
    <Card className="mt-4 rounded-2xl border border-slate-100 shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center text-base">
              <Trophy className="mr-2 h-5 w-5 text-blue-600" />
              Employee Performance
            </CardTitle>
            <p className="mt-1 text-xs font-medium text-slate-400">Highest performance cleaner ranking by jobs and hours</p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
            <span className="text-xs font-bold text-slate-500">Show part-timers</span>
            <Switch checked={showPartTimers} onCheckedChange={setShowPartTimers} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : visibleRows.length ? (
          <div className="space-y-2">
            {visibleRows.slice(0, 8).map((row, index) => (
              <div key={row.employee_id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
                  index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <Link to={`/admin-dashboard/employee/${row.employee_id}`} className="truncate text-sm font-bold text-slate-950 hover:text-blue-700 hover:underline">
                    {row.employee_name}
                  </Link>
                  <p className="text-xs font-medium text-slate-400">{row.is_part_timer ? 'Part-timer' : 'Regular cleaner'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-950">{formatNumber(row.jobs_completed)} Jobs</p>
                  <p className="text-xs font-semibold text-slate-400">{formatNumber(row.hours_worked, 1)} hr</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center text-center text-sm text-slate-400">
            No completed assigned jobs for this filter.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const JobScopeSegmentedControl = ({ value, onChange, hideBusinessJobs, setHideBusinessJobs }) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
    <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1">
      {[
        { value: 'all', label: 'All Jobs' },
        { value: 'subscription', label: 'Subscription Cleans Only' },
        { value: 'one_time', label: 'One-Time/Deep Cleans Only' },
      ].map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-xl px-3 py-2 text-xs font-bold transition sm:text-sm ${
            value === option.value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
      <span className="text-xs font-bold text-slate-500">Hide business data</span>
      <Switch checked={hideBusinessJobs} onCheckedChange={setHideBusinessJobs} />
    </div>
  </div>
);

const DashboardOverviewTab = () => {
  const dashboard = useDashboardOverview();
  const { data, loading } = dashboard;

  return (
    <div className="bg-slate-50 p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Dashboard Overview</h2>
          <p className="mt-1 text-sm text-slate-500">Customer retention, revenue health, and job logistics in one view.</p>
        </div>
        <DashboardDateRangePicker
          preset={dashboard.preset}
          setPreset={dashboard.setPreset}
          customRange={dashboard.customRange}
          setCustomRange={dashboard.setCustomRange}
          range={dashboard.range}
        />
      </div>

      {dashboard.error && (
        <Alert variant="destructive" className="mb-6 rounded-2xl">
          <AlertTitle>Dashboard analytics failed</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{dashboard.error.message}</span>
            <Button variant="outline" size="sm" onClick={dashboard.refresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <section className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-950">Customer Insights</h3>
        </div>
        <div className="flex flex-col items-start gap-4 xl:flex-row">
          <div className="flex w-full min-w-0 flex-row flex-wrap gap-4 xl:flex-1">
            <div className="grid w-full gap-4 sm:grid-cols-3">
              <MetricCard title="Total Customers" value={data?.customers.active_customers.value} metric={data?.customers.active_customers} icon={Users} loading={loading} />
              <MetricCard title="Unique Customers" value={data?.customers.new_customers.value} metric={data?.customers.new_customers} icon={TrendingUp} loading={loading} tone="green" />
              <MetricCard title="Returning Customers" value={data?.customers.returning_customers.value} metric={data?.customers.returning_customers} icon={RefreshCw} loading={loading} tone="amber" />
            </div>
            <div className="w-full">
              <BookingRequestHeatmap heatmap={data?.customers.booking_heatmap} loading={loading} compact />
            </div>
          </div>
          <div className="w-full space-y-4 xl:w-[360px] xl:shrink-0">
            <CustomerTopFiveList customers={data?.customers.top_customers || []} loading={loading} />
            <NewestCustomersList customers={data?.customers.newest_customers || []} loading={loading} />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-950">Revenue Insights</h3>
        </div>
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <MetricCard title="Average Customer Spend" value={data?.revenue.average_customer_spend.value} metric={data?.revenue.average_customer_spend} icon={DollarSign} formatter={formatCurrency} loading={loading} tone="green" />
          <MetricCard title="Average Revenue Per Job" value={data?.revenue.average_revenue_per_job.value} metric={data?.revenue.average_revenue_per_job} icon={BarChart3} formatter={formatCurrency} loading={loading} />
        </div>
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <RevenueTrackerCard
            title="Income Tracker A"
            filter={dashboard.leftRevenueFilter}
            setFilter={dashboard.setLeftRevenueFilter}
            showCustomers
            hideBusiness={dashboard.hideBusinessIncomeA}
            setHideBusiness={dashboard.setHideBusinessIncomeA}
            data={data}
            loading={loading}
          />
          <RevenueTrackerCard
            title="Income Tracker B"
            filter={dashboard.rightRevenueFilter}
            setFilter={dashboard.setRightRevenueFilter}
            showCustomers
            hideBusiness={dashboard.hideBusinessIncomeB}
            setHideBusiness={dashboard.setHideBusinessIncomeB}
            data={data}
            loading={loading}
          />
        </div>
        <RevenueTrendChart series={data?.revenue.chart_series || []} loading={loading} chartType={dashboard.chartType} setChartType={dashboard.setChartType} />
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-950">Job Logistics</h3>
          </div>
          <JobScopeSegmentedControl value={dashboard.jobScope} onChange={dashboard.setJobScope} hideBusinessJobs={dashboard.hideBusinessJobs} setHideBusinessJobs={dashboard.setHideBusinessJobs} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total Jobs" value={data?.jobs.total_jobs.value} metric={data?.jobs.total_jobs} icon={Briefcase} loading={loading} />
          <MetricCard title="Average Jobs Per Day" value={data?.jobs.average_jobs_per_day.value} metric={data?.jobs.average_jobs_per_day} icon={BarChart3} formatter={(value) => formatNumber(value, 1)} loading={loading} tone="green" />
          <MetricCard title="Hours Worked" value={data?.jobs.hours_worked.value} metric={data?.jobs.hours_worked} icon={Clock3} formatter={(value) => `${formatNumber(value, 1)} hr`} loading={loading} tone="amber" />
          <Card className="rounded-2xl border border-slate-100 shadow-sm">
            <CardContent className="p-5">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-36" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-slate-400">Most Frequent Duration</p>
                      <p className="mt-2 truncate text-2xl font-bold text-slate-950">{data?.jobs.most_frequent_duration.label || 'No completed jobs'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-100 p-2.5 text-slate-600">
                      <Clock3 className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-4 text-xs font-semibold text-slate-400">
                    {formatNumber(data?.jobs.most_frequent_duration.count || 0)} completed jobs in this duration block
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <JobTrendChart series={data?.jobs.chart_series || []} loading={loading} />
        <EmployeePerformanceRanking
          rows={data?.jobs.employee_performance || []}
          loading={loading}
          showPartTimers={dashboard.showPartTimersPerformance}
          setShowPartTimers={dashboard.setShowPartTimersPerformance}
        />
      </section>
    </div>
  );
};

export default DashboardOverviewTab;
