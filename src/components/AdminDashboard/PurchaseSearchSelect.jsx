import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const getPurchaseName = (purchase) => {
  const profileName = `${purchase.profiles?.first_name || ''} ${purchase.profiles?.last_name || ''}`.trim();
  return purchase.name || profileName || purchase.email || 'Unnamed customer';
};

const getPurchaseLabel = (purchase) => {
  const amount = purchase.paid_amount === null || purchase.paid_amount === undefined || purchase.paid_amount === ''
    ? ''
    : ` - BHD ${Number(purchase.paid_amount).toFixed(2)}`;
  return `Purchase #${purchase.purchase_ref_id} - ${getPurchaseName(purchase)}${amount}`;
};

const PurchaseSearchSelect = ({ value, purchases = [], onValueChange, loading = false, noneLabel = 'None (Unlink Purchase)' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedPurchase = purchases.find((purchase) => String(purchase.purchase_ref_id) === String(value || ''));
  const normalizedQuery = query.trim().toLowerCase().replace(/^purchase\s*#?/, '').trim();
  const filteredPurchases = useMemo(() => purchases.filter((purchase) => {
    if (!normalizedQuery) return true;
    const profileName = `${purchase.profiles?.first_name || ''} ${purchase.profiles?.last_name || ''}`.trim();
    return [
      purchase.purchase_ref_id,
      purchase.name,
      profileName,
      purchase.email,
      purchase.user_phone,
      purchase.profiles?.phone,
      purchase.product_name,
    ].some((field) => String(field || '').toLowerCase().includes(normalizedQuery));
  }), [normalizedQuery, purchases]);

  const choose = (purchaseRefId) => {
    onValueChange(purchaseRefId || null);
    setOpen(false);
    setQuery('');
  };

  return <Popover open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setQuery(''); }}>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" role="combobox" aria-expanded={open} disabled={loading} className="w-full justify-between dark:border-slate-600 dark:bg-slate-700 dark:text-white">
        <span className={cn('truncate text-left', !selectedPurchase && 'text-muted-foreground')}>
          {loading ? 'Loading purchases...' : selectedPurchase ? getPurchaseLabel(selectedPurchase) : 'Search by purchase or customer name...'}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
      <Command shouldFilter={false}>
        <CommandInput placeholder="Search purchase number or customer..." value={query} onValueChange={setQuery} />
        <CommandGroup className="max-h-[300px] overflow-y-auto">
          <CommandItem value="none" onSelect={() => choose(null)}>
            <X className="mr-2 h-4 w-4 text-muted-foreground" />{noneLabel}
          </CommandItem>
          {!filteredPurchases.length && <div className="flex items-center justify-center gap-2 px-3 py-5 text-sm text-muted-foreground"><Search className="h-4 w-4" />No matching purchases.</div>}
          {filteredPurchases.map((purchase) => {
            const purchaseRefId = String(purchase.purchase_ref_id);
            return <CommandItem key={purchaseRefId} value={purchaseRefId} onSelect={() => choose(purchaseRefId)}>
              <Check className={cn('mr-2 h-4 w-4 shrink-0', String(value || '') === purchaseRefId ? 'opacity-100' : 'opacity-0')} />
              <div className="min-w-0"><p className="truncate text-sm font-medium">Purchase #{purchaseRefId} - {getPurchaseName(purchase)}</p><p className="truncate text-xs text-muted-foreground">{purchase.product_name || 'No service name'}{purchase.user_phone || purchase.profiles?.phone ? ` - ${purchase.user_phone || purchase.profiles?.phone}` : ''}</p></div>
            </CommandItem>;
          })}
        </CommandGroup>
      </Command>
    </PopoverContent>
  </Popover>;
};

export default PurchaseSearchSelect;
