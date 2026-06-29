-- Add owner column to all fhir_* tables so sandbox test records are
-- distinguishable from production records and easy to delete later.
-- Default 'PRODUCTION' so existing rows (if any) are correctly tagged.

alter table fhir_observations  add column if not exists owner text not null default 'PRODUCTION';
alter table fhir_medications   add column if not exists owner text not null default 'PRODUCTION';
alter table fhir_conditions    add column if not exists owner text not null default 'PRODUCTION';
alter table fhir_allergies     add column if not exists owner text not null default 'PRODUCTION';
alter table fhir_immunizations add column if not exists owner text not null default 'PRODUCTION';
alter table fhir_reports       add column if not exists owner text not null default 'PRODUCTION';
alter table fhir_procedures    add column if not exists owner text not null default 'PRODUCTION';

-- Recreate v_fhir_labs to expose the owner column.
-- Drop first because CREATE OR REPLACE cannot reorder existing columns.
drop view if exists v_fhir_labs;
create view v_fhir_labs as
select
  id,
  patient_id,
  owner,
  code_value       as code,
  code_display     as display_name,
  value_quantity   as value,
  value_unit       as unit,
  (effective_datetime at time zone 'America/New_York')::date as collected_on,
  interpretation   as flag,
  reference_low    as lab_ref_low,
  reference_high   as lab_ref_high
from fhir_observations
where category    = 'laboratory'
  and value_quantity is not null
  and status      = 'final'
order by effective_datetime desc;
