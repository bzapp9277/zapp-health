-- ============================================================
-- RLS LOCKDOWN: enable RLS on all tables, drop legacy anon/uid
-- policies, add clean authenticated-role policies.
--
-- Design: single-user system with sign-ups disabled.
-- "authenticated role" = only brjack2177@gmail.com.
-- Auth uid (ae4f19c4-...) differs from data user_id
-- (eb3d4470-...) so USING(true) grants access regardless.
-- Service role (pipelines) bypasses RLS entirely.
-- ============================================================

-- ============================================================
-- 1. ENABLE RLS on every public table
-- ============================================================
alter table alcohol_log        enable row level security;
alter table briefings          enable row level security;
alter table doctor_questions   enable row level security;
alter table drink_rankings     enable row level security;
alter table drink_types        enable row level security;
alter table health_events      enable row level security;
alter table health_inbox       enable row level security;
alter table health_metrics     enable row level security;
alter table lab_panels         enable row level security;
alter table lab_results        enable row level security;
-- markers already enabled
alter table medication_doses   enable row level security;
alter table medications        enable row level security;
alter table notes              enable row level security;
alter table profiles           enable row level security;
alter table reports            enable row level security;
alter table self_actions       enable row level security;
alter table treatments         enable row level security;
alter table user_marker_targets enable row level security;
alter table vitals_log         enable row level security;

-- ============================================================
-- 2. DROP legacy anon (hardcoded-uuid) policies
-- ============================================================
drop policy if exists anon_brad_dq         on doctor_questions;
drop policy if exists anon_brad_events     on health_events;
drop policy if exists anon_brad_panels     on lab_panels;
drop policy if exists anon_brad_results    on lab_results;
drop policy if exists anon_brad_doses      on medication_doses;
drop policy if exists anon_brad_meds       on medications;
drop policy if exists anon_brad_notes      on notes;
drop policy if exists anon_brad_profiles   on profiles;
drop policy if exists anon_brad_reports    on reports;
drop policy if exists anon_brad_treatments on treatments;
drop policy if exists anon_brad_umt        on user_marker_targets;
drop policy if exists anon_brad_vitals     on vitals_log;
drop policy if exists anon_markers         on markers;

-- ============================================================
-- 3. DROP legacy public/auth.uid() policies
--    (auth.uid() matches new auth uid, NOT the data user_id;
--     replaced by simpler USING(true) below)
-- ============================================================
drop policy if exists dq_select_own           on doctor_questions;
drop policy if exists dq_insert_own           on doctor_questions;
drop policy if exists dq_update_own           on doctor_questions;
drop policy if exists dq_delete_own           on doctor_questions;
drop policy if exists events_select_own       on health_events;
drop policy if exists events_insert_own       on health_events;
drop policy if exists events_update_own       on health_events;
drop policy if exists events_delete_own       on health_events;
drop policy if exists lab_panels_select_own   on lab_panels;
drop policy if exists lab_panels_insert_own   on lab_panels;
drop policy if exists lab_panels_update_own   on lab_panels;
drop policy if exists lab_panels_delete_own   on lab_panels;
drop policy if exists lab_results_select_own  on lab_results;
drop policy if exists lab_results_insert_own  on lab_results;
drop policy if exists lab_results_update_own  on lab_results;
drop policy if exists lab_results_delete_own  on lab_results;
drop policy if exists markers_select_all      on markers;
drop policy if exists med_doses_select_own    on medication_doses;
drop policy if exists med_doses_insert_own    on medication_doses;
drop policy if exists med_doses_update_own    on medication_doses;
drop policy if exists med_doses_delete_own    on medication_doses;
drop policy if exists medications_select_own  on medications;
drop policy if exists medications_insert_own  on medications;
drop policy if exists medications_update_own  on medications;
drop policy if exists medications_delete_own  on medications;
drop policy if exists notes_select_own        on notes;
drop policy if exists notes_insert_own        on notes;
drop policy if exists notes_update_own        on notes;
drop policy if exists notes_delete_own        on notes;
drop policy if exists profiles_select_own     on profiles;
drop policy if exists profiles_insert_own     on profiles;
drop policy if exists profiles_update_own     on profiles;
drop policy if exists reports_select_own      on reports;
drop policy if exists reports_insert_own      on reports;
drop policy if exists reports_update_own      on reports;
drop policy if exists reports_delete_own      on reports;
drop policy if exists treatments_select_own   on treatments;
drop policy if exists treatments_insert_own   on treatments;
drop policy if exists treatments_update_own   on treatments;
drop policy if exists treatments_delete_own   on treatments;
drop policy if exists umt_select_own          on user_marker_targets;
drop policy if exists umt_insert_own          on user_marker_targets;
drop policy if exists umt_update_own          on user_marker_targets;
drop policy if exists umt_delete_own          on user_marker_targets;
drop policy if exists vitals_select_own       on vitals_log;
drop policy if exists vitals_insert_own       on vitals_log;
drop policy if exists vitals_update_own       on vitals_log;
drop policy if exists vitals_delete_own       on vitals_log;

-- ============================================================
-- 4. ADD clean authenticated-role policies
--    USING(true) WITH CHECK(true): any authenticated session =
--    full read/write access (safe because sign-ups are disabled)
-- ============================================================
create policy "auth_full_access" on alcohol_log         for all to authenticated using (true) with check (true);
create policy "auth_full_access" on briefings           for all to authenticated using (true) with check (true);
create policy "auth_full_access" on doctor_questions    for all to authenticated using (true) with check (true);
create policy "auth_full_access" on drink_rankings      for all to authenticated using (true) with check (true);
create policy "auth_full_access" on drink_types         for all to authenticated using (true) with check (true);
create policy "auth_full_access" on health_events       for all to authenticated using (true) with check (true);
create policy "auth_full_access" on health_inbox        for all to authenticated using (true) with check (true);
create policy "auth_full_access" on health_metrics      for all to authenticated using (true) with check (true);
create policy "auth_full_access" on lab_panels          for all to authenticated using (true) with check (true);
create policy "auth_full_access" on lab_results         for all to authenticated using (true) with check (true);
create policy "auth_full_access" on markers             for all to authenticated using (true) with check (true);
create policy "auth_full_access" on medication_doses    for all to authenticated using (true) with check (true);
create policy "auth_full_access" on medications         for all to authenticated using (true) with check (true);
create policy "auth_full_access" on notes               for all to authenticated using (true) with check (true);
create policy "auth_full_access" on profiles            for all to authenticated using (true) with check (true);
create policy "auth_full_access" on reports             for all to authenticated using (true) with check (true);
create policy "auth_full_access" on self_actions        for all to authenticated using (true) with check (true);
create policy "auth_full_access" on treatments          for all to authenticated using (true) with check (true);
create policy "auth_full_access" on user_marker_targets for all to authenticated using (true) with check (true);
create policy "auth_full_access" on vitals_log          for all to authenticated using (true) with check (true);
