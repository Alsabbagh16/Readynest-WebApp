select public.refresh_subscription_health();

do $$
declare
  v_job_exists boolean := false;
begin
  if to_regclass('cron.job') is not null
     and to_regprocedure('cron.schedule(text,text,text)') is not null then
    execute 'select exists (select 1 from cron.job where jobname = $1)'
      into v_job_exists
      using 'readynest-subscription-health';

    if not v_job_exists then
      execute 'select cron.schedule($1, $2, $3)'
        using
          'readynest-subscription-health',
          '15 2 * * *',
          'select public.refresh_subscription_health();';
    end if;
  end if;
end $$;
