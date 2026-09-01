import { useCallback, useEffect, useMemo, useState } from 'react';
import { subscriptionApi } from '@/lib/api/subscriptionApi';
import type {
  FollowUpQueueSubscription,
  FollowUpPayload,
  SubscriptionDashboardRow,
  SubscriptionDashboardSummary,
  SubscriptionStatusFilter,
} from '@/types/subscription';

export const useSubscriptionDashboard = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionDashboardRow[]>([]);
  const [followUpQueue, setFollowUpQueue] = useState<FollowUpQueueSubscription[]>([]);
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const subscriptionRows = await subscriptionApi.getSubscriptions();
      const queueRows = await subscriptionApi.getFollowUpQueue();
      setSubscriptions(subscriptionRows);
      setFollowUpQueue(queueRows);
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
      churnRiskCount: followUpQueue.length,
    };
  }, [followUpQueue.length, subscriptions]);

  const markScheduled = useCallback(async (clientId: string) => {
    const previousSubscriptions = subscriptions;
    const previousQueue = followUpQueue;
    setUpdatingId(clientId);
    setSubscriptions((rows) => rows.map((row) => row.client_id === clientId ? { ...row, status: 'active', manually_paused: false } : row));
    setFollowUpQueue((rows) => rows.filter((row) => row.client_id !== clientId));
    try {
      await subscriptionApi.activateSubscription(clientId);
    } catch (requestError) {
      setSubscriptions(previousSubscriptions);
      setFollowUpQueue(previousQueue);
      throw requestError;
    } finally {
      setUpdatingId(null);
    }
  }, [followUpQueue, subscriptions]);

  const pauseSubscription = useCallback(async (clientId: string) => {
    const previousSubscriptions = subscriptions;
    const previousFilter = statusFilter;
    setUpdatingId(clientId);
    setStatusFilter('paused');
    setSubscriptions((rows) => rows.map((row) => row.client_id === clientId
      ? { ...row, status: 'paused', manually_paused: true }
      : row));
    try {
      await subscriptionApi.pauseSubscription(clientId);
      setFollowUpQueue(await subscriptionApi.getFollowUpQueue());
    } catch (requestError) {
      setSubscriptions(previousSubscriptions);
      setStatusFilter(previousFilter);
      throw requestError;
    } finally {
      setUpdatingId(null);
    }
  }, [statusFilter, subscriptions]);

  const resumeSubscription = useCallback(async (clientId: string) => {
    const previousSubscriptions = subscriptions;
    const previousQueue = followUpQueue;
    setUpdatingId(clientId);
    setSubscriptions((rows) => rows.map((row) => row.client_id === clientId
      ? { ...row, status: 'active', manually_paused: false }
      : row));
    setFollowUpQueue((rows) => rows.filter((row) => row.client_id !== clientId));
    try {
      await subscriptionApi.resumeSubscription(clientId);
    } catch (requestError) {
      setSubscriptions(previousSubscriptions);
      setFollowUpQueue(previousQueue);
      throw requestError;
    } finally {
      setUpdatingId(null);
    }
  }, [followUpQueue, subscriptions]);

  const addToFollowUpQueue = useCallback(async (clientId: string) => {
    const previousQueue = followUpQueue;
    const subscription = subscriptions.find((row) => row.client_id === clientId);
    setUpdatingId(clientId);
    if (subscription && !followUpQueue.some((row) => row.client_id === clientId)) {
      const lastClean = subscription.last_clean_date ? new Date(subscription.last_clean_date) : null;
      const daysSinceLastClean = lastClean && !Number.isNaN(lastClean.getTime())
        ? Math.floor((Date.now() - lastClean.getTime()) / 86400000)
        : null;
      setFollowUpQueue((rows) => [{
        client_id: subscription.client_id,
        client_name: subscription.client_name,
        phone: subscription.phone,
        plan_type: subscription.plan_type,
        subscription_days_per_week: subscription.subscription_days_per_week,
        status: subscription.status,
        last_clean_date: subscription.last_clean_date,
        days_since_last_clean: daysSinceLastClean,
        note: null,
        source: 'manual',
        queued_at: new Date().toISOString(),
      }, ...rows]);
    }
    try {
      await subscriptionApi.addToFollowUpQueue(clientId);
    } catch (requestError) {
      setFollowUpQueue(previousQueue);
      throw requestError;
    } finally {
      setUpdatingId(null);
    }
  }, [followUpQueue, subscriptions]);

  const removeFromFollowUpQueue = useCallback(async (clientId: string) => {
    const previousQueue = followUpQueue;
    setUpdatingId(clientId);
    setFollowUpQueue((rows) => rows.filter((row) => row.client_id !== clientId));
    try {
      await subscriptionApi.removeFromFollowUpQueue(clientId);
    } catch (requestError) {
      setFollowUpQueue(previousQueue);
      throw requestError;
    } finally {
      setUpdatingId(null);
    }
  }, [followUpQueue]);

  const updateFollowUpNote = useCallback(async (clientId: string, note: string) => {
    const previousQueue = followUpQueue;
    setUpdatingId(clientId);
    setFollowUpQueue((rows) => rows.map((row) => row.client_id === clientId ? { ...row, note: note.trim() || null } : row));
    try {
      return await subscriptionApi.updateFollowUpNote(clientId, note);
    } catch (requestError) {
      setFollowUpQueue(previousQueue);
      throw requestError;
    } finally {
      setUpdatingId(null);
    }
  }, [followUpQueue]);

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
    followUpQueue,
    summary,
    statusFilter,
    setStatusFilter,
    loading,
    error,
    updatingId,
    refresh,
    markScheduled,
    followUp,
    pauseSubscription,
    resumeSubscription,
    addToFollowUpQueue,
    removeFromFollowUpQueue,
    updateFollowUpNote,
  };
};
