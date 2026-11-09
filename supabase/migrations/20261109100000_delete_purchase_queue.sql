create or replace function public.delete_purchase_queue(p_queue_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if not public.can_use_purchase_queue('purchases.edit') then
    raise exception 'Purchase edit permission required.';
  end if;

  select lifecycle_status
    into v_status
  from public.purchase_queue
  where queue_id = p_queue_id
  for update;

  if not found then
    raise exception 'Queued purchase not found.';
  end if;

  if v_status = 'approved' then
    raise exception 'Approved queue records cannot be deleted from the queue.';
  end if;

  delete from public.purchase_queue
  where queue_id = p_queue_id;
end;
$$;

revoke execute on function public.delete_purchase_queue(uuid) from public, anon;
grant execute on function public.delete_purchase_queue(uuid) to authenticated;
