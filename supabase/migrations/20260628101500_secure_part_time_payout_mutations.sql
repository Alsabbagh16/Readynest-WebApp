revoke execute on function public.settle_part_time_payout(bigint) from public, anon;
revoke execute on function public.undo_part_time_payout_settlement(bigint) from public, anon;
revoke execute on function public.update_part_time_payout_amount(bigint, numeric) from public, anon;

grant execute on function public.settle_part_time_payout(bigint) to authenticated;
grant execute on function public.undo_part_time_payout_settlement(bigint) to authenticated;
grant execute on function public.update_part_time_payout_amount(bigint, numeric) to authenticated;
