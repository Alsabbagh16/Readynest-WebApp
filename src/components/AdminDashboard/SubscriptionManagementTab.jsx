import React, { useState } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarCheck,
  CalendarPlus,
  CreditCard,
  MessageCircle,
  RefreshCw,
  Repeat2,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import SubscriptionDashboardErrorBoundary from '@/components/SubscriptionDashboardErrorBoundary';
import { useSubscriptionDashboard } from '@/hooks/useSubscriptionDashboard';
import { subscriptionApi } from '@/lib/api/subscriptionApi';

const statusStyles = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  unbooked: 'border-amber-200 bg-amber-50 text-amber-700',
  paused: 'border-slate-300 bg-slate-100 text-slate-700',
  expiring: 'border-red-200 bg-red-50 text-red-700',
};

const paymentStyles = {
  paid: 'bg-emerald-500',
  pending: 'bg-amber-400',
  failed: 'bg-red-500',
  missed: 'bg-red-500',
};

const serviceStyles = {
  completed: 'bg-emerald-500',
  partial: 'bg-amber-400',
  missed: 'bg-red-500',
  empty: 'bg-slate-300',
};

const formatDate = (date) => {
  if (!date) return 'No completed clean';
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime()) ? 'No completed clean' : format(parsedDate, 'MMM d, yyyy');
};

const RetentionDots = ({ history, styles, label, describe, onSelect, selectedPurchaseRef }) => {
  const paddedHistory = [...(history || [])];
  while (paddedHistory.length < 4) paddedHistory.unshift(null);

  return (
    <div className="mt-1 flex items-center gap-1.5" aria-label={label}>
      {paddedHistory.slice(-4).map((entry, index) => {
        const dotClassName = `block h-2.5 w-2.5 rounded-full ${entry ? styles[entry.status] : 'bg-slate-200'} ${
          selectedPurchaseRef && entry?.purchase_ref_id === selectedPurchaseRef ? 'ring-2 ring-blue-500 ring-offset-1' : ''
        }`;
        return entry?.purchase_ref_id && onSelect ? (
          <button
            key={entry.period_start}
            type="button"
            className="rounded-full"
            title={`${describe(entry)} - click to filter services`}
            onClick={() => onSelect(entry)}
          >
            <span className={dotClassName} />
          </button>
        ) : (
          <span
            key={entry?.period_start || `empty-${index}`}
            className={dotClassName}
            title={entry ? describe(entry) : 'No subscription payment for this period'}
          />
        );
      })}
    </div>
  );
};

const ServiceRetentionDots = ({ history, planType, customDays }) => {
  const daysPerWeek = planType === 'Custom' ? Number(customDays || 0) : planType === 'Twice Weekly' ? 2 : 1;
  const expectedSlots = Math.max(4, daysPerWeek * 4);
  const paddedHistory = [...(history || [])].slice(0, expectedSlots);
  while (paddedHistory.length < expectedSlots) paddedHistory.push(null);

  return (
    <div
      className="mt-1 grid w-fit gap-1.5"
      style={{ gridTemplateColumns: `repeat(${planType === 'Custom' ? daysPerWeek : 4}, minmax(0, 1fr))` }}
      aria-label={`Latest subscription purchase, ${expectedSlots} expected jobs`}
    >
      {paddedHistory.map((entry, slotIndex) => (
        entry?.job_ref_id ? (
          <Link
            key={entry.slot_number}
            to={`/admin-dashboard/job/${entry.job_ref_id}`}
            className={`h-2.5 w-2.5 rounded-full ${serviceStyles[entry.status]} transition-transform hover:scale-125`}
            title={`Job ${entry.job_ref_id}: ${entry.job_status || entry.status}`}
          />
        ) : (
          <span
            key={entry?.slot_number || `empty-slot-${slotIndex}`}
            className={`h-2.5 w-2.5 rounded-full ${serviceStyles.empty}`}
            title={`Expected job ${slotIndex + 1}: not created`}
          />
        )
      ))}
    </div>
  );
};

const MetricCard = ({ label, value, icon: Icon, alert = false }) => (
  <div className={`rounded-lg border p-4 ${alert ? 'border-red-200 bg-red-50/50' : 'border-slate-200'}`}>
    <div className="flex items-center justify-between gap-2">
      <span className={`text-sm font-medium ${alert ? 'text-red-700' : 'text-slate-500'}`}>{label}</span>
      <Icon className={`h-4 w-4 ${alert ? 'text-red-600' : 'text-blue-600'}`} />
    </div>
    <p className={`mt-2 text-2xl font-bold ${alert ? 'text-red-900' : 'text-slate-950'}`}>{value}</p>
  </div>
);

const SubscriptionManagementContent = () => {
  const { toast } = useToast();
  const [serviceFilters, setServiceFilters] = useState({});
  const [serviceFilterLoading, setServiceFilterLoading] = useState(null);
  const {
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
  } = useSubscriptionDashboard();

  const handlePaymentFilter = async (subscription, paymentPeriod) => {
    const purchaseRefId = paymentPeriod.purchase_ref_id;
    if (!purchaseRefId) return;
    if (serviceFilters[subscription.client_id]?.purchase_ref_id === purchaseRefId) {
      setServiceFilters((current) => {
        const next = { ...current };
        delete next[subscription.client_id];
        return next;
      });
      return;
    }

    setServiceFilterLoading(`${subscription.client_id}:${purchaseRefId}`);
    try {
      const service = await subscriptionApi.getPurchaseService(purchaseRefId);
      setServiceFilters((current) => ({ ...current, [subscription.client_id]: service }));
    } catch (requestError) {
      toast({
        title: 'Unable to Filter Services',
        description: requestError.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setServiceFilterLoading(null);
    }
  };

  const getNextClean = (history) => {
    const now = new Date();
    const nextJob = (history || [])
      .filter((entry) => {
        if (!entry?.preferred_date || !entry.job_ref_id) return false;
        const status = String(entry.job_status || '').toLowerCase();
        return new Date(entry.preferred_date) >= now && !['completed', 'cancelled', 'failed'].includes(status);
      })
      .sort((left, right) => new Date(left.preferred_date) - new Date(right.preferred_date))[0];
    return nextJob ? format(new Date(nextJob.preferred_date), 'MMM d, h:mm a') : 'Not scheduled';
  };

  const handleSchedule = async (subscription) => {
    try {
      await markScheduled(subscription.client_id);
      toast({ title: 'Subscription Activated', description: `${subscription.client_name} is marked as scheduled.` });
    } catch (requestError) {
      toast({
        title: 'Unable to Schedule',
        description: requestError.message || 'The subscription status was restored.',
        variant: 'destructive',
      });
    }
  };

  const handleFollowUp = async (subscription) => {
    try {
      const payload = await followUp(subscription.client_id);
      if (!payload.clean_phone) throw new Error('This client does not have a registered phone number.');
      window.open(
        `https://wa.me/${payload.clean_phone}?text=${encodeURIComponent(payload.whatsapp_message)}`,
        '_blank',
        'noopener,noreferrer'
      );
      toast({ title: 'Follow-Up Logged', description: `WhatsApp follow-up prepared for ${payload.client_name}.` });
    } catch (requestError) {
      toast({
        title: 'Unable to Follow Up',
        description: requestError.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-lg bg-slate-100" />)}
        </div>
        <div className="h-80 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="mb-3 h-7 w-7 text-red-500" />
        <h2 className="font-bold text-slate-900">Unable to load subscriptions</h2>
        <p className="mt-1 max-w-md text-sm text-slate-500">{error.message}</p>
        <Button className="mt-4" variant="outline" onClick={refresh}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-w-0 bg-slate-50/60">
      <header className="flex flex-col gap-4 border-b border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Subscription Management</h2>
          <p className="mt-1 text-sm text-slate-500">Client retention, service fulfillment, and follow-ups</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </header>

      <section className="grid gap-3 border-b border-slate-200 bg-white p-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Subscribers" value={summary.activeSubscriptions} icon={Users} />
        <MetricCard label="Payment Retention" value={`${summary.paymentRetentionRate.toFixed(1)}%`} icon={CreditCard} />
        <MetricCard label="Service Fulfillment" value={`${summary.serviceFulfillmentRate.toFixed(1)}%`} icon={CalendarCheck} />
        <MetricCard label="Churn Risk" value={summary.churnRiskCount} icon={AlertTriangle} alert />
      </section>

      <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 p-5">
          <div className="mb-4 flex max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
            {[
              ['all', 'All'],
              ['active', 'Active'],
              ['paused', 'Paused'],
              ['unbooked', 'Unbooked'],
              ['expiring', 'Expiring'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`h-8 whitespace-nowrap rounded-md px-3 text-xs font-semibold ${
                  statusFilter === value ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredSubscriptions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              No subscribers match this status.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <div className="hidden min-w-[880px] grid-cols-[minmax(170px,1.4fr)_100px_90px_110px_120px_100px_120px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 lg:grid">
                <span>Client</span><span>Plan</span><span>Status</span><span>Payments</span><span>Service</span><span>Last Clean</span><span>Next Clean</span>
              </div>
              {filteredSubscriptions.map((subscription) => {
                const filteredService = serviceFilters[subscription.client_id];
                const serviceHistory = filteredService?.service_history || subscription.service_history;
                const servicePlan = filteredService?.plan_type || subscription.plan_type;
                const serviceDays = filteredService?.subscription_days_per_week ?? subscription.subscription_days_per_week;
                const serviceScore = filteredService?.service_score ?? subscription.service_fulfillment_score;
                return <div key={subscription.client_id} className="grid gap-3 border-b border-slate-100 p-4 last:border-b-0 lg:min-w-[880px] lg:grid-cols-[minmax(170px,1.4fr)_100px_90px_110px_120px_100px_120px] lg:items-center">
                  <div className="min-w-0">
                    <Link to={`/admin-dashboard/user/${subscription.client_id}`} className="block truncate text-sm font-semibold text-blue-700 hover:underline">
                      {subscription.client_name || 'Unnamed Client'}
                    </Link>
                    <p className="truncate text-xs text-slate-500">{subscription.phone || subscription.latest_subscription_purchase_ref_id || 'No phone'}</p>
                  </div>
                  <div className="text-sm text-slate-700">
                    <p className="font-medium">{subscription.plan_type === 'Custom' ? `Custom - ${subscription.subscription_days_per_week} days/week` : subscription.plan_type}</p>
                  </div>
                  <Badge variant="outline" className={`w-fit capitalize ${statusStyles[subscription.status]}`}>
                    {subscription.status}
                  </Badge>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{Number(subscription.payment_retention_score || 0).toFixed(0)}%</p>
                    <RetentionDots
                      history={subscription.payment_history}
                      styles={paymentStyles}
                      label="Four-month payment retention"
                      describe={(entry) => `${entry.period_start}: ${entry.status}`}
                      onSelect={(entry) => handlePaymentFilter(subscription, entry)}
                      selectedPurchaseRef={filteredService?.purchase_ref_id}
                    />
                    {serviceFilterLoading?.startsWith(`${subscription.client_id}:`) && <p className="mt-1 text-[10px] text-blue-500">Loading...</p>}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{Number(serviceScore || 0).toFixed(0)}%</p>
                    <ServiceRetentionDots
                      history={serviceHistory}
                      planType={servicePlan}
                      customDays={serviceDays}
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase text-slate-400 lg:hidden">Last Clean</p>
                    <p className="text-xs font-medium text-slate-600">{formatDate(subscription.last_clean_date)}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase text-slate-400 lg:hidden">Next Clean</p>
                    <p className="text-xs font-semibold text-slate-700">{getNextClean(serviceHistory)}</p>
                  </div>
                </div>;
              })}
            </div>
          )}
        </section>

        <aside className="border-t border-slate-200 bg-white p-5 xl:border-l xl:border-t-0">
          <div className="mb-4 flex items-center gap-2">
            <Repeat2 className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Follow-Up Queue</h3>
          </div>
          {churnRisk.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              No clients currently at risk.
            </div>
          ) : (
            <div className="space-y-3">
              {churnRisk.map((subscription) => (
                <div key={subscription.client_id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/admin-dashboard/user/${subscription.client_id}`} className="block truncate text-sm font-semibold text-blue-700 hover:underline">
                        {subscription.client_name || 'Unnamed Client'}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {subscription.days_since_last_clean == null ? 'No completed clean' : `${subscription.days_since_last_clean} days since last clean`}
                      </p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 capitalize ${statusStyles[subscription.status]}`}>
                      {subscription.status}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleFollowUp(subscription)} disabled={updatingId === subscription.client_id}>
                      <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Follow-Up
                    </Button>
                    <Button size="sm" onClick={() => handleSchedule(subscription)} disabled={updatingId === subscription.client_id}>
                      <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Schedule
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

const SubscriptionManagementTab = () => (
  <SubscriptionDashboardErrorBoundary>
    <SubscriptionManagementContent />
  </SubscriptionDashboardErrorBoundary>
);

export default SubscriptionManagementTab;
