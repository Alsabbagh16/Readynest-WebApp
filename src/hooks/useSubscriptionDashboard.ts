import { useCallback, useEffect, useMemo, useState } from 'react';
import { subscriptionApi } from '@/lib/api/subscriptionApi';
import type {
  FollowUpCard,
  FollowUpImportance,
  FollowUpPayload,
  SubscriptionDashboardRow,
  SubscriptionDashboardSummary,
  SubscriptionStatusFilter,
} from '@/types/subscription';

export const useSubscriptionDashboard = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionDashboardRow[]>([]);
  const [followUpQueue, setFollowUpQueue] = useState<FollowUpCard[]>([]);
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
      churnRiskCount: followUpQueue.filter((card) => card.state === 'open').length,
    };
  }, [followUpQueue, subscriptions]);

  const refreshFollowUpCards = useCallback(async () => {
    setFollowUpQueue(await subscriptionApi.getFollowUpQueue());
  }, []);

  const markScheduled = useCallback(async (clientId: string) => {
    const previousSubscriptions = subscriptions;
    setUpdatingId(clientId);
    setSubscriptions((rows) => rows.map((row) => row.client_id === clientId ? { ...row, status: 'active', manually_paused: false } : row));
    try {
      await subscriptionApi.activateSubscription(clientId);
      await refreshFollowUpCards();
    } catch (requestError) {
      setSubscriptions(previousSubscriptions);
      throw requestError;
    } finally {
      setUpdatingId(null);
    }
  }, [refreshFollowUpCards, subscriptions]);

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
    setUpdatingId(clientId);
    setSubscriptions((rows) => rows.map((row) => row.client_id === clientId
      ? { ...row, status: 'active', manually_paused: false }
      : row));
    try {
      await subscriptionApi.resumeSubscription(clientId);
      await refreshFollowUpCards();
    } catch (requestError) {
      setSubscriptions(previousSubscriptions);
      throw requestError;
    } finally {
      setUpdatingId(null);
    }
  }, [refreshFollowUpCards, subscriptions]);

  const createFollowUpCard = useCallback(async (clientId: string, note: string, importance: FollowUpImportance, reminderDate: string | null) => {
    setUpdatingId(clientId);
    try {
      await subscriptionApi.createFollowUpCard(clientId, note, importance, reminderDate);
      await refreshFollowUpCards();
    } finally {
      setUpdatingId(null);
    }
  }, [refreshFollowUpCards]);

  const updateFollowUpCard = useCallback(async (cardId: string, note: string, importance: FollowUpImportance, reminderDate: string | null) => {
    setUpdatingId(cardId);
    try {
      await subscriptionApi.updateFollowUpCard(cardId, note, importance, reminderDate);
      await refreshFollowUpCards();
    } finally {
      setUpdatingId(null);
    }
  }, [refreshFollowUpCards]);

  const completeFollowUpCard = useCallback(async (cardId: string) => {
    setUpdatingId(cardId);
    try {
      await subscriptionApi.completeFollowUpCard(cardId);
      await refreshFollowUpCards();
    } finally {
      setUpdatingId(null);
    }
  }, [refreshFollowUpCards]);

  const reopenFollowUpCard = useCallback(async (cardId: string) => {
    setUpdatingId(cardId);
    try {
      await subscriptionApi.reopenFollowUpCard(cardId);
      await refreshFollowUpCards();
    } finally {
      setUpdatingId(null);
    }
  }, [refreshFollowUpCards]);

  const dismissFollowUpCard = useCallback(async (cardId: string) => {
    setUpdatingId(cardId);
    try {
      await subscriptionApi.dismissFollowUpCard(cardId);
      setFollowUpQueue((cards) => cards.filter((card) => card.id !== cardId));
    } finally {
      setUpdatingId(null);
    }
  }, []);

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
    createFollowUpCard,
    updateFollowUpCard,
    completeFollowUpCard,
    reopenFollowUpCard,
    dismissFollowUpCard,
  };
};
