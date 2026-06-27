-- FHIR tables: store St. Elizabeth Epic records pulled via SMART on FHIR.
-- All tables use the FHIR resource ID as primary key so upserts are idempotent.
-- Health data lives only in this Supabase project (kizrdaifculzighfngqz).

create table if not exists fhir_observations (
  id               text primary key,
  patient_id       text not null,
  fhir_resource    jsonb not null,
  code_system      text,
  code_value       text,
  code_display     text,
  category         text,
  effective_datetime timestamptz,
  value_quantity   numeric,
  value_unit       text,
  value_string     text,
  interpretation   text,
  reference_low    numeric,
  reference_high   numeric,
  status           text,
  pulled_at        timestamptz default now()
);

create table if not exists fhir_medications (
  id                 text primary key,
  patient_id         text not null,
  fhir_resource      jsonb not null,
  medication_display text,
  status             text,
  intent             text,
  authored_on        date,
  requester          text,
  dosage_text        text,
  pulled_at          timestamptz default now()
);

create table if not exists fhir_conditions (
  id                  text primary key,
  patient_id          text not null,
  fhir_resource       jsonb not null,
  code_display        text,
  clinical_status     text,
  verification_status text,
  onset_date          date,
  pulled_at           timestamptz default now()
);

create table if not exists fhir_allergies (
  id                text primary key,
  patient_id        text not null,
  fhir_resource     jsonb not null,
  substance_display text,
  clinical_status   text,
  criticality       text,
  pulled_at         timestamptz default now()
);

create table if not exists fhir_immunizations (
  id                   text primary key,
  patient_id           text not null,
  fhir_resource        jsonb not null,
  vaccine_display      text,
  occurrence_datetime  timestamptz,
  status               text,
  pulled_at            timestamptz default now()
);

create table if not exists fhir_reports (
  id                 text primary key,
  patient_id         text not null,
  fhir_resource      jsonb not null,
  code_display       text,
  status             text,
  effective_datetime timestamptz,
  issued             timestamptz,
  pulled_at          timestamptz default now()
);

create table if not exists fhir_procedures (
  id             text primary key,
  patient_id     text not null,
  fhir_resource  jsonb not null,
  code_display   text,
  status         text,
  performed_date date,
  pulled_at      timestamptz default now()
);

-- Useful indexes for query performance
create index if not exists fhir_obs_category    on fhir_observations (category);
create index if not exists fhir_obs_code        on fhir_observations (code_value);
create index if not exists fhir_obs_effective   on fhir_observations (effective_datetime);
create index if not exists fhir_cond_status     on fhir_conditions (clinical_status);
create index if not exists fhir_meds_status     on fhir_medications (status);

-- Lab observations in the same shape v_latest_marker_values uses,
-- so Brad can query this view and compare/explore FHIR labs alongside
-- manually-entered results without touching any existing table.
create or replace view v_fhir_labs as
select
  id,
  patient_id,
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
