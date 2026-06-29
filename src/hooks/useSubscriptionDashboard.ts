import { useCallback, useEffect, useMemo, useState } from 'react';
import { subscriptionApi } from '@/lib/api/subscriptionApi';
import type {
  ChurnRiskSubscription,
  FollowUpPayload,
  SubscriptionDashboardRow,
  SubscriptionDashboardSummary,
  SubscriptionStatusFilter,
} from '@/types/subscription';

export const useSubscriptionDashboard = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionDashboardRow[]>([]);
  const [churnRisk, setChurnRisk] = useState<ChurnRiskSubscription[]>([]);
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subscriptionRows, riskRows] = await Promise.all([
        subscriptionApi.getSubscriptions(),
        subscriptionApi.getChurnRisk(),
      ]);
      setSubscriptions(subscriptionRows);
      setChurnRisk(riskRows);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error('Unable to load subscriptions.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filteredSubscriptions = useMemo(() => (
    statusFilter === 'all'
      ? subscriptions
      : subscriptions.filter((subscription) => subscription.status === statusFilter)
  ), [statusFilter, subscriptions]);

  const summary = useMemo<SubscriptionDashboardSummary>(() => {
    const average = (field: 'payment_retention_score' | 'service_fulfillment_score') => (
      subscriptions.length > 0
        ? subscriptions.reduce((total, row) => total + Number(row[field] || 0), 0) / subscriptions.length
        : 0
    );
    return {
      activeSubscriptions: subscriptions.filter((row) => row.status === 'active').length,
      paymentRetentionRate: average('payment_retention_score'),
      serviceFulfillmentRate: average('service_fulfillment_score'),
      churnRiskCount: churnRisk.length,
    };
  }, [churnRisk.length, subscriptions]);

  const markScheduled = useCallback(async (clientId: string) => {
    const previousSubscriptions = subscriptions;
    const previousChurnRisk = churnRisk;
    setUpdatingId(clientId);
    setSubscriptions((rows) => rows.map((row) => row.client_id === clientId ? { ...row, status: 'active' } : row));
    setChurnRisk((rows) => rows.filter((row) => row.client_id !== clientId));
    try {
      await subscriptionApi.activateSubscription(clientId);
    } catch (requestError) {
      setSubscriptions(previousSubscriptions);
      setChurnRisk(previousChurnRisk);
      throw requestError;
    } finally {
      setUpdatingId(null);
    }
  }, [churnRisk, subscriptions]);

  const followUp = useCallback(async (clientId: string): Promise<FollowUpPayload> => {
    setUpdatingId(clientId);
    try {
      return await subscriptionApi.logFollowUp(clientId);
    } finally {
      setUpdatingId(null);
    }
  }, []);

  return {
    subscriptions,
    filteredSubscriptions,
    churnRisk,
    summary,
    statusFilter,
    setStatusFilter,
    loading,
    error,
    updatingId,
    refresh,
    markScheduled,
    followUp,
  };
};
