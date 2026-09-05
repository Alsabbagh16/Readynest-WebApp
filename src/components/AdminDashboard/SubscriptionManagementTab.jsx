import React, { useState } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  Pencil,
  Plus,
  RotateCcw,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import SubscriptionDashboardErrorBoundary from '@/components/SubscriptionDashboardErrorBoundary';
import { useSubscriptionDashboard } from '@/hooks/useSubscriptionDashboard';
import { subscriptionApi } from '@/lib/api/subscriptionApi';
import CustomerSelector from '@/components/AdminDashboard/CustomerSelector';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusStyles = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  unbooked: 'border-amber-200 bg-amber-50 text-amber-700',
  paused: 'border-slate-300 bg-slate-100 text-slate-700',
  expiring: 'border-red-200 bg-red-50 text-red-700',
};

const paymentStyles = {
  paid: 'bg-emerald-500',
  partial: 'bg-amber-400',
  pending: 'bg-amber-400',
  failed: 'bg-red-500',
  missed: 'bg-red-500',
};

const paymentLabels = {
  paid: 'Paid',
  partial: 'Partially Paid',
  pending: 'Pending',
  failed: 'Failed',
  missed: 'Missed',
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

const importanceStyles = {
  high: 'border-red-200 bg-red-50 text-red-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-blue-200 bg-blue-50 text-blue-700',
};

const FollowUpCard = ({ card, updating, onEdit, onComplete, onReopen, onRemove }) => {
  const reminderDate = card.reminder_date ? new Date(`${card.reminder_date}T00:00:00`) : null;
  const reminderOverdue = reminderDate && reminderDate < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <article className="relative flex min-h-[220px] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {card.state === 'open' && (
      <button
        type="button"
        className="absolute right-1.5 top-1.5 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        onClick={() => onRemove(card)}
        disabled={updating}
        aria-label={`Remove follow-up card for ${card.client_name || 'user'}`}
        title="Remove card"
      >
        <X className="h-3.5 w-3.5" />
      </button>)}
      <div className="flex items-start justify-between gap-2 pr-6">
        <div className="min-w-0">
          <Link to={`/admin-dashboard/user/${card.client_id}`} className="block truncate text-sm font-semibold text-blue-700 hover:underline">
            {card.client_name || 'Unnamed User'}
          </Link>
          <p className="mt-0.5 truncate text-xs text-slate-500">{card.email || card.phone || 'Registered user'}</p>
        </div>
        <Badge variant="outline" className={`shrink-0 capitalize ${importanceStyles[card.importance]}`}>
          {card.importance}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {card.is_subscriber && card.subscription_status && <Badge variant="outline" className={`capitalize ${statusStyles[card.subscription_status]}`}>{card.subscription_status} subscriber</Badge>}
        {card.source === 'automatic' && <Badge variant="secondary">Automatic</Badge>}
        {reminderDate && <Badge variant="outline" className={reminderOverdue ? 'border-red-200 bg-red-50 text-red-700' : 'border-violet-200 bg-violet-50 text-violet-700'}><CalendarClock className="mr-1 h-3 w-3" /> {reminderOverdue ? 'Overdue · ' : 'Reminder · '}{format(reminderDate, 'MMM d, yyyy')}</Badge>}
      </div>
      <p className="mt-3 flex-1 whitespace-pre-wrap text-sm text-slate-700">{card.note}</p>
      <p className="mt-3 text-xs text-slate-400">Created {formatDate(card.created_at)}{card.completed_at ? ` · Completed ${formatDate(card.completed_at)}` : ''}</p>
      <div className="mt-3 flex gap-2">
        {card.state === 'open' ? <>
          <Button size="sm" variant="outline" onClick={() => onEdit(card)} disabled={updating}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
          <Button size="sm" onClick={() => onComplete(card)} disabled={updating}><Check className="mr-1.5 h-3.5 w-3.5" /> Complete</Button>
        </> : <Button size="sm" variant="outline" onClick={() => onReopen(card)} disabled={updating}><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reopen</Button>}
      </div>
    </article>
  );
};

const SubscriptionManagementContent = () => {
  const { toast } = useToast();
  const [serviceFilters, setServiceFilters] = useState({});
  const [serviceFilterLoading, setServiceFilterLoading] = useState(null);
  const [followUpTab, setFollowUpTab] = useState('open');
  const [followUpPage, setFollowUpPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [memo, setMemo] = useState('');
  const [importance, setImportance] = useState('medium');
  const [reminderDate, setReminderDate] = useState('');
  const {
    filteredSubscriptions,
    followUpQueue,
    summary,
    statusFilter,
    setStatusFilter,
    loading,
    error,
    updatingId,
    refresh,
    pauseSubscription,
    resumeSubscription,
    createFollowUpCard,
    updateFollowUpCard,
    completeFollowUpCard,
    reopenFollowUpCard,
    dismissFollowUpCard,
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

  const handlePauseToggle = async (subscription) => {
    const shouldResume = subscription.manually_paused;
    try {
      if (shouldResume) await resumeSubscription(subscription.client_id);
      else await pauseSubscription(subscription.client_id);
      toast({
        title: shouldResume ? 'Subscription Resumed' : 'Subscription Paused',
        description: `${subscription.client_name} has been ${shouldResume ? 'returned to Active' : 'moved to Paused'}.`,
      });
    } catch (requestError) {
      toast({
        title: shouldResume ? 'Unable to Resume' : 'Unable to Pause',
        description: requestError.message || 'The subscription status was restored.',
        variant: 'destructive',
      });
    }
  };

  const openCreateDialog = (subscription = null) => {
    setEditingCard(null);
    setSelectedCustomerId(subscription?.client_id || null);
    setMemo('');
    setImportance('medium');
    setReminderDate('');
    setDialogOpen(true);
  };

  const openEditDialog = (card) => {
    setEditingCard(card);
    setSelectedCustomerId(card.client_id);
    setMemo(card.note || '');
    setImportance(card.importance);
    setReminderDate(card.reminder_date || '');
    setDialogOpen(true);
  };

  const handleSaveCard = async () => {
    if (!selectedCustomerId || (!editingCard && !memo.trim())) return;
    try {
      if (editingCard) await updateFollowUpCard(editingCard.id, memo.trim(), importance, reminderDate || null);
      else await createFollowUpCard(selectedCustomerId, memo.trim(), importance, reminderDate || null);
      toast({ title: editingCard ? 'Follow-Up Updated' : 'Follow-Up Created' });
      setDialogOpen(false);
      setFollowUpTab('open');
      setFollowUpPage(1);
    } catch (requestError) {
      toast({ title: 'Unable to Save Follow-Up', description: requestError.message || 'Please try again.', variant: 'destructive' });
    }
  };

  const handleCardMutation = async (action, card, successTitle) => {
    try {
      await action(card.id);
      toast({ title: successTitle, description: `${card.client_name || 'The user'}'s follow-up card was updated.` });
      setFollowUpPage(1);
    } catch (requestError) {
      toast({ title: 'Unable to Update Follow-Up', description: requestError.message || 'Please try again.', variant: 'destructive' });
    }
  };

  const visibleFollowUps = followUpQueue.filter((card) => card.state === followUpTab);
  const followUpPageCount = Math.max(1, Math.ceil(visibleFollowUps.length / 16));
  const pagedFollowUps = visibleFollowUps.slice((followUpPage - 1) * 16, followUpPage * 16);

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

      <div className="min-w-0">
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
              <div className="hidden min-w-[940px] grid-cols-[minmax(170px,1.4fr)_100px_90px_110px_120px_100px_120px_44px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 lg:grid">
                <span>Client</span><span>Plan</span><span>Status</span><span>Payments</span><span>Service</span><span>Last Clean</span><span>Next Clean</span><span className="sr-only">Actions</span>
              </div>
              {filteredSubscriptions.map((subscription) => {
                const filteredService = serviceFilters[subscription.client_id];
                const serviceHistory = filteredService?.service_history || subscription.service_history;
                const servicePlan = filteredService?.plan_type || subscription.plan_type;
                const serviceDays = filteredService?.subscription_days_per_week ?? subscription.subscription_days_per_week;
                const serviceScore = filteredService?.service_score ?? subscription.service_fulfillment_score;
                return <div key={subscription.client_id} className="grid gap-3 border-b border-slate-100 p-4 last:border-b-0 lg:min-w-[940px] lg:grid-cols-[minmax(170px,1.4fr)_100px_90px_110px_120px_100px_120px_44px] lg:items-center">
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
                      describe={(entry) => paymentLabels[entry.status] || entry.status}
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
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={updatingId === subscription.client_id} aria-label={`Actions for ${subscription.client_name}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Subscription Actions</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => handlePauseToggle(subscription)}>
                          {subscription.manually_paused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                          {subscription.manually_paused ? 'Resume Subscription' : 'Pause Subscription'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => openCreateDialog(subscription)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add Follow-Up Card
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>;
              })}
            </div>
          )}
        </section>

        <section className="border-t border-slate-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Follow Up</h3>
              <p className="mt-0.5 text-xs text-slate-500">Memos and reminders for registered users</p>
            </div>
            <Button size="sm" onClick={() => openCreateDialog()}><Plus className="mr-2 h-4 w-4" /> Add Follow-Up</Button>
          </div>
          <div className="mb-5 flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1">
            {['open', 'completed'].map((tab) => (
              <button key={tab} type="button" onClick={() => { setFollowUpTab(tab); setFollowUpPage(1); }} className={`rounded-md px-4 py-2 text-xs font-semibold capitalize ${followUpTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                {tab} ({followUpQueue.filter((card) => card.state === tab).length})
              </button>
            ))}
          </div>
          {pagedFollowUps.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No {followUpTab} follow-up cards.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pagedFollowUps.map((card) => <FollowUpCard key={card.id} card={card} updating={updatingId === card.id} onEdit={openEditDialog} onComplete={(item) => handleCardMutation(completeFollowUpCard, item, 'Follow-Up Completed')} onReopen={(item) => handleCardMutation(reopenFollowUpCard, item, 'Follow-Up Reopened')} onRemove={(item) => handleCardMutation(dismissFollowUpCard, item, 'Follow-Up Removed')} />)}
            </div>
          )}
          {followUpPageCount > 1 && <nav className="mt-5 flex flex-wrap items-center justify-center gap-1" aria-label="Follow-up pagination">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={followUpPage === 1} onClick={() => setFollowUpPage((page) => page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
            {Array.from({ length: followUpPageCount }, (_, index) => index + 1).map((page) => <Button key={page} variant={page === followUpPage ? 'default' : 'outline'} size="sm" className="h-8 min-w-8 px-2" onClick={() => setFollowUpPage(page)}>{page}</Button>)}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={followUpPage === followUpPageCount} onClick={() => setFollowUpPage((page) => page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
          </nav>}
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingCard ? 'Edit Follow-Up' : 'Create Follow-Up'}</DialogTitle><DialogDescription>{editingCard ? 'Update this memo and its importance.' : 'Create a memo for any registered ReadyNest user.'}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>User</Label>{editingCard ? <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">{editingCard.client_name || editingCard.email || 'Registered user'}</div> : <CustomerSelector selectedCustomerId={selectedCustomerId} onCustomerSelect={setSelectedCustomerId} allowAllCustomers />}</div>
            <div className="space-y-2"><Label htmlFor="follow-up-memo">Memo</Label><textarea id="follow-up-memo" value={memo} onChange={(event) => setMemo(event.target.value)} maxLength={2000} rows={5} placeholder="What needs to be followed up?" className="w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /><p className="text-right text-xs text-slate-400">{memo.length}/2000</p></div>
            <div className="space-y-2"><Label>Importance</Label><Select value={importance} onValueChange={setImportance}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="follow-up-reminder">Reminder date <span className="font-normal text-slate-400">(optional)</span></Label><input id="follow-up-reminder" type="date" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /><p className="text-xs text-slate-500">Cards with reminders are prioritized by the nearest date.</p></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveCard} disabled={!selectedCustomerId || (!editingCard && !memo.trim()) || updatingId === (editingCard?.id || selectedCustomerId)}>{editingCard ? 'Save Changes' : 'Create Card'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SubscriptionManagementTab = () => (
  <SubscriptionDashboardErrorBoundary>
    <SubscriptionManagementContent />
  </SubscriptionDashboardErrorBoundary>
);

export default SubscriptionManagementTab;
