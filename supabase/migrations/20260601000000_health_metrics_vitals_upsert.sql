-- ============================================================
-- health_metrics: stores individual Apple Health data points
-- ============================================================
create table if not exists health_metrics (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default 'eb3d4470-3f8b-436a-94db-783d9a744491',
  metric_name text        not null,
  value       numeric,
  unit        text,
  recorded_at timestamptz not null,
  source      text,
  created_at  timestamptz not null default now(),
  constraint health_metrics_user_metric_ts_key unique (user_id, metric_name, recorded_at)
);

-- ============================================================
-- vitals_log: add unique constraint for idempotent upserts
-- ============================================================
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'vitals_log'
      and constraint_type = 'UNIQUE'
      and constraint_name = 'vitals_log_user_id_recorded_on_key'
  ) then
    alter table vitals_log
      add constraint vitals_log_user_id_recorded_on_key unique (user_id, recorded_on);
  end if;
end $$;
