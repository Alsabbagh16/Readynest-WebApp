import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, Check, ChevronDown, ChevronLeft, ChevronRight, Loader2, Pencil, RefreshCw, RotateCcw, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { getPurchaseByRef } from '@/lib/storage/purchaseStorage';
import { approvePurchaseQueue, getPurchaseQueue, markQueueNotification, rejectPurchaseQueue, revivePurchaseQueue } from '@/lib/storage/purchaseQueueStorage';

const PAGE_SIZE = 12;
const formatValue = (value) => value === null || value === undefined || value === '' ? 'Not provided' : String(value);
const emailRecord = (item, type, purchase = null) => ({
  purchase_ref_id: purchase?.purchase_ref_id || item.reserved_purchase_ref,
  name: purchase?.name || item.customer_name,
  email: purchase?.email || item.customer_email,
  user_phone: purchase?.user_phone || item.customer_phone,
  product_name: purchase?.product_name || item.service_name,
  paid_amount: purchase?.paid_amount ?? item.quoted_price,
  booking_date: item.requested_date,
  booking_start_time: item.requested_time,
  booking_end_time: '',
  address: JSON.stringify(purchase?.address || item.property_snapshot || {}),
  hours: purchase?.hours || item.duration_hours,
  cleaners: item.quantity,
  notification_type: type,
  rejection_reason: item.rejection_reason,
});

const PurchaseQueueSection = ({ onModify, onPurchasesChanged, refreshKey = 0 }) => {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('pending');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setItems(await getPurchaseQueue()); }
    catch (error) { toast({ title: 'Unable to Load Purchase Queue', description: error.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { refresh(); }, [refresh, refreshKey]);
  useEffect(() => {
    const channel = supabase
      .channel('admin-purchase-queue-indicator')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_queue' }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  const notify = async (item, type, purchase = null) => {
    if (!item.customer_email) {
      await markQueueNotification(item.queue_id, 'not_applicable');
      return;
    }
    const { error } = await supabase.functions.invoke('send-purchase-confirmation', { body: { record: emailRecord(item, type, purchase) } });
    await markQueueNotification(item.queue_id, error ? 'failed' : 'sent', error?.message || null);
    if (error) throw error;
  };

  const act = async (item, operation, success) => {
    setActionId(item.queue_id);
    try { await operation(); await refresh(); await onPurchasesChanged?.(); toast({ title: success }); }
    catch (error) { toast({ title: 'Queue Action Failed', description: error.message, variant: 'destructive' }); }
    finally { setActionId(null); }
  };

  const approve = (item) => act(item, async () => {
    const ref = await approvePurchaseQueue(item.queue_id);
    const purchase = await getPurchaseByRef(ref);
    try { await notify(item, 'approval', purchase); } catch { /* approval remains successful and retryable */ }
  }, 'Purchase Approved');

  const confirmReject = () => act(rejecting, async () => {
    await rejectPurchaseQueue(rejecting.queue_id, reason);
    try { await notify({ ...rejecting, rejection_reason: reason }, 'rejection'); } catch { /* retained for retry */ }
    setRejecting(null); setReason('');
  }, 'Purchase Request Rejected');

  const retryEmail = (item) => act(item, async () => {
    const type = item.lifecycle_status === 'approved' ? 'approval' : item.lifecycle_status === 'rejected' ? 'rejection' : 'pending';
    const purchase = item.approved_purchase_ref ? await getPurchaseByRef(item.approved_purchase_ref) : null;
    await notify(item, type, purchase);
  }, 'Email Sent');

  const visible = useMemo(() => items.filter((item) => item.lifecycle_status === tab), [items, tab]);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const cards = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pendingCount = items.filter((item) => item.lifecycle_status === 'pending').length;
  const toggle = (id) => setExpanded((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });

  return <section className="border-b border-slate-200 bg-slate-50/70 p-4 sm:p-6">
    <div className={`flex flex-wrap items-center justify-between gap-3 ${isCollapsed ? '' : 'mb-4'}`}>
      <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setIsCollapsed((value) => !value)} aria-expanded={!isCollapsed} aria-controls="purchase-queue-content">
        <span className="relative shrink-0"><Bot className="h-5 w-5 text-blue-600" />{isCollapsed && pendingCount > 0 && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white" aria-label={`${pendingCount} pending purchase requests`}>{pendingCount > 99 ? '99+' : pendingCount}</span>}</span>
        <span className="min-w-0"><span className="flex items-center gap-2 text-lg font-bold">Purchase Queue</span><span className="block truncate text-sm font-normal text-slate-500">Website and AI-agent purchase requests awaiting review</span></span>
        <ChevronDown className={`ml-auto h-5 w-5 shrink-0 text-slate-500 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
      </button>
      {!isCollapsed && <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>}
    </div>
    {!isCollapsed && <div id="purchase-queue-content">
    <div className="mb-4 flex w-fit rounded-lg border bg-white p-1">{['pending','rejected'].map((value) => <button key={value} type="button" onClick={() => { setTab(value); setPage(1); }} className={`rounded-md px-4 py-2 text-xs font-semibold capitalize ${tab === value ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>{value} ({items.filter((item) => item.lifecycle_status === value).length})</button>)}</div>
    {loading ? <div className="flex h-28 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : cards.length ? <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{cards.map((item) => <article key={item.queue_id} className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-semibold uppercase text-slate-400">Queue ID</p><p className="truncate font-mono text-xs font-semibold text-blue-700">{item.queue_id}</p><h3 className="mt-2 truncate font-bold">{item.customer_name || 'Unnamed Customer'}</h3><p className="truncate text-sm text-slate-500">{item.service_name || 'Service not provided'}</p></div><Badge variant="outline" className={item.source === 'ai_agent' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-blue-200 bg-blue-50 text-blue-700'}>{item.source === 'ai_agent' ? 'AI Agent' : 'Website'}</Badge></div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-slate-400">Requested</dt><dd className="font-semibold">{formatValue(item.requested_date)} {item.requested_time || ''}</dd></div><div><dt className="text-slate-400">Quoted Price</dt><dd className="font-semibold">{item.quoted_price == null ? 'Not provided' : `BHD ${Number(item.quoted_price).toFixed(3)}`}</dd></div><div><dt className="text-slate-400">Duration</dt><dd>{item.duration_hours ? `${item.duration_hours} hours` : 'Not provided'}</dd></div><div><dt className="text-slate-400">Quantity</dt><dd>{formatValue(item.quantity)}</dd></div></dl>
      <button type="button" onClick={() => toggle(item.queue_id)} className="mt-3 flex w-full items-center justify-between border-t pt-3 text-xs font-semibold text-blue-600">All purchase details <ChevronDown className={`h-4 w-4 transition ${expanded.has(item.queue_id) ? 'rotate-180' : ''}`} /></button>
      {expanded.has(item.queue_id) && <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3 text-xs"><p><b>Customer ID:</b> {formatValue(item.customer_id)}</p><p><b>Service ID:</b> {formatValue(item.service_id)}</p><p><b>Property ID:</b> {formatValue(item.property_id)}</p><p><b>Contact:</b> {formatValue(item.customer_email)} · {formatValue(item.customer_phone)}</p><p><b>Customer notes:</b> {formatValue(item.customer_notes)}</p><p><b>AI notes:</b> {formatValue(item.ai_notes)}</p><p><b>Source message ID:</b> {formatValue(item.source_message_id)}</p><details><summary className="cursor-pointer font-semibold">Raw request payload</summary><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(item.request_payload, null, 2)}</pre></details>{item.rejection_reason && <p className="text-red-700"><b>Rejection reason:</b> {item.rejection_reason}</p>}</div>}
      {item.notification_status === 'failed' && <div className="mt-3 flex items-center justify-between rounded-md bg-red-50 p-2 text-xs text-red-700"><span>Email failed</span><Button size="sm" variant="outline" className="h-7" onClick={() => retryEmail(item)}>Retry Email</Button></div>}
      <div className="mt-4 flex flex-wrap gap-2">{tab === 'pending' ? <><Button size="sm" onClick={() => approve(item)} disabled={actionId === item.queue_id}><Check className="mr-1 h-4 w-4" /> Approve</Button><Button size="sm" variant="outline" onClick={() => onModify(item)}><Pencil className="mr-1 h-4 w-4" /> Modify &amp; Approve</Button><Button size="sm" variant="outline" className="text-red-600" onClick={() => { setRejecting(item); setReason(''); }}><X className="mr-1 h-4 w-4" /> Reject</Button></> : <Button size="sm" onClick={() => act(item, () => revivePurchaseQueue(item.queue_id), 'Purchase Request Revived')}><RotateCcw className="mr-1 h-4 w-4" /> Revive</Button>}</div>
    </article>)}</div> : <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">No {tab} purchase requests.</div>}
    {pages > 1 && <div className="mt-4 flex items-center justify-center gap-2"><Button size="icon" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm">Page {page} of {pages}</span><Button size="icon" variant="outline" disabled={page === pages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button></div>}
    <Dialog open={Boolean(rejecting)} onOpenChange={(open) => !open && setRejecting(null)}><DialogContent><DialogHeader><DialogTitle>Reject Purchase Request</DialogTitle><DialogDescription>The reason is optional and will be included in the customer email when provided.</DialogDescription></DialogHeader><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional rejection reason" rows={4} /><DialogFooter><Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button><Button variant="destructive" onClick={confirmReject} disabled={Boolean(actionId)}>Reject Request</Button></DialogFooter></DialogContent></Dialog>
    </div>}
  </section>;
};

export default PurchaseQueueSection;
