create or replace function public.delete_rejected_purchase_queue()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count bigint;
begin
  if not public.can_use_purchase_queue('purchases.edit') then
    raise exception 'Purchase edit permission required.';
  end if;

  delete from public.purchase_queue
  where lifecycle_status = 'rejected';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke execute on function public.delete_rejected_purchase_queue() from public, anon;
grant execute on function public.delete_rejected_purchase_queue() to authenticated;
