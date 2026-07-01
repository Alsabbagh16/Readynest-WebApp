alter table public.purchases
  add column if not exists amount_received numeric(12, 3) not null default 0;

update public.purchases
set amount_received = greatest(
  coalesce(final_amount_due_on_arrival, paid_amount, 0),
  0
)
where lower(trim(coalesce(status, ''))) = 'paid';

update public.purchases
set amount_received = 0
where amount_received < 0;

alter table public.purchases
  drop constraint if exists purchases_amount_received_nonnegative;

alter table public.purchases
  add constraint purchases_amount_received_nonnegative
  check (amount_received >= 0);

create or replace function public.sync_purchase_payment_status()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_total numeric := greatest(coalesce(new.final_amount_due_on_arrival, new.paid_amount, 0), 0);
  v_amount_changed boolean;
  v_total_changed boolean;
begin
  if tg_op = 'INSERT' then
    v_amount_changed := coalesce(new.amount_received, 0) > 0;
    v_total_changed := false;
  else
    v_amount_changed := new.amount_received is distinct from old.amount_received;
    v_total_changed :=
      new.final_amount_due_on_arrival is distinct from old.final_amount_due_on_arrival
      or new.paid_amount is distinct from old.paid_amount;
  end if;

  new.amount_received := least(greatest(coalesce(new.amount_received, 0), 0), v_total);

  if lower(trim(coalesce(new.status, ''))) = 'paid' then
    new.amount_received := v_total;
  elsif v_amount_changed then
    if v_total > 0 and new.amount_received >= v_total then
      new.status := 'Paid';
    elsif new.amount_received > 0 then
      new.status := 'Partially Paid';
    elsif tg_op = 'UPDATE'
      and lower(trim(coalesce(old.status, ''))) in ('paid', 'partially paid') then
      new.status := 'Pending';
    end if;
  elsif v_total_changed
    and lower(trim(coalesce(new.status, ''))) not in ('cancelled', 'refunded', 'failed')
    and v_total > 0
    and new.amount_received >= v_total then
    new.amount_received := v_total;
    new.status := 'Paid';
  end if;

  return new;
end;
$$;

drop trigger if exists sync_purchase_payment_status_trigger on public.purchases;
create trigger sync_purchase_payment_status_trigger
before insert or update of status, amount_received, paid_amount, final_amount_due_on_arrival
on public.purchases
for each row execute function public.sync_purchase_payment_status();
