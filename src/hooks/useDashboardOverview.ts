import { useCallback, useEffect, useMemo, useState } from 'react';
import { endOfMonth, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';
import { dashboardOverviewApi } from '@/lib/api/dashboardOverviewApi';
import type {
  DashboardDatePreset,
  DashboardChartType,
  DashboardJobScope,
  DashboardOverviewPayload,
  DashboardRevenueFilter,
} from '@/types/dashboardOverview';

const endExclusive = (date: Date) => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getPresetRange = (preset: DashboardDatePreset) => {
  const today = startOfDay(new Date());
  if (preset === 'last_7_days') return { from: subDays(today, 6), to: endExclusive(today) };
  if (preset === 'this_month') return { from: startOfMonth(today), to: endExclusive(today) };
  if (preset === 'last_month') {
    const lastMonth = subMonths(today, 1);
    return { from: startOfMonth(lastMonth), to: endExclusive(endOfMonth(lastMonth)) };
  }
  return { from: subDays(today, 29), to: endExclusive(today) };
};

export const useDashboardOverview = () => {
  const [preset, setPreset] = useState<DashboardDatePreset>('last_30_days');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [jobScope, setJobScope] = useState<DashboardJobScope>('all');
  const [leftRevenueFilter, setLeftRevenueFilter] = useState<DashboardRevenueFilter>('all');
  const [rightRevenueFilter, setRightRevenueFilter] = useState<DashboardRevenueFilter>('subscriber');
  const [hideBusinessIncomeA, setHideBusinessIncomeA] = useState(false);
  const [hideBusinessIncomeB, setHideBusinessIncomeB] = useState(false);
  const [chartType, setChartType] = useState<DashboardChartType>('line');
  const [hideBusinessJobs, setHideBusinessJobs] = useState(false);
  const [showPartTimersPerformance, setShowPartTimersPerformance] = useState(false);
  const [data, setData] = useState<DashboardOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const range = useMemo(() => {
    if (preset !== 'custom') return getPresetRange(preset);
    const fallback = getPresetRange('last_30_days');
    const from = customRange.from ? startOfDay(new Date(`${customRange.from}T00:00:00`)) : fallback.from;
    const to = customRange.to ? endExclusive(new Date(`${customRange.to}T00:00:00`)) : fallback.to;
    return to > from ? { from, to } : fallback;
  }, [customRange.from, customRange.to, preset]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await dashboardOverviewApi.getOverview(range.from, range.to, jobScope, hideBusinessJobs);
      setData(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error('Unable to load dashboard overview.'));
    } finally {
      setLoading(false);
    }
  }, [hideBusinessJobs, jobScope, range.from, range.to]);

  useEffect(() => { refresh(); }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh,
    preset,
    setPreset,
    customRange,
    setCustomRange,
    range,
    jobScope,
    setJobScope,
    leftRevenueFilter,
    setLeftRevenueFilter,
    rightRevenueFilter,
    setRightRevenueFilter,
    hideBusinessIncomeA,
    setHideBusinessIncomeA,
    hideBusinessIncomeB,
    setHideBusinessIncomeB,
    chartType,
    setChartType,
    hideBusinessJobs,
    setHideBusinessJobs,
    showPartTimersPerformance,
    setShowPartTimersPerformance,
  };
};
