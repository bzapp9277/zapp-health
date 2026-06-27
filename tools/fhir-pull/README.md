# FHIR Pull — St. Elizabeth → Supabase

Pulls your St. Elizabeth Healthcare (Epic) records via SMART on FHIR and writes them into the zapp-health Supabase (`kizrdaifculzighfngqz`).

## The one command

```
node tools/fhir-pull/index.js
```

First run opens Epic MyChart in your browser for a one-time login. After that, the stored refresh token handles re-runs silently — no browser required.

## Setup (one time)

### 1. Create your .env

```
cp tools/fhir-pull/.env.example tools/fhir-pull/.env
```

Fill in two values:

| Key | Where to get it |
|-----|-----------------|
| `FHIR_CLIENT_ID` | open.epic.com → your registered app → Client ID |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API → service_role key |

### 2. Apply the migration

Run the SQL in `supabase/migrations/20260627000000_fhir_tables.sql` against `kizrdaifculzighfngqz`.

### 3. Register the app on open.epic.com

Go to [open.epic.com](https://open.epic.com) → MyApps → Create app.

Required registration values:

| Field | Value |
|-------|-------|
| Application Audience | Patient-facing |
| Application Type | Public client |
| Redirect URI | `http://127.0.0.1:8765/callback` |
| Scopes | `openid fhirUser offline_access patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read patient/AllergyIntolerance.read patient/Immunization.read patient/DiagnosticReport.read patient/Procedure.read` |
| PKCE | S256 (required) |

Copy the generated **Client ID** into your `.env`.

After registration, use the sandbox client ID to test against Epic's sandbox, then swap in your production client ID once approved.

## What it pulls

| Resource | Supabase table |
|----------|---------------|
| Observation (labs + vitals) | `fhir_observations` |
| MedicationRequest | `fhir_medications` |
| Condition | `fhir_conditions` |
| AllergyIntolerance | `fhir_allergies` |
| Immunization | `fhir_immunizations` |
| DiagnosticReport | `fhir_reports` |
| Procedure | `fhir_procedures` |

All resources are also stored as raw FHIR JSON in the `fhir_resource` jsonb column.

## Lab view

The migration creates `v_fhir_labs` — lab observations in the same column shape as `v_latest_marker_values` (`code`, `display_name`, `value`, `unit`, `collected_on`, `flag`, `lab_ref_low`, `lab_ref_high`). Query it directly in Supabase to browse Epic lab results alongside manually entered ones.

## FHIR endpoints discovered

| | |
|---|---|
| FHIR R4 base | `https://sehproxy.stelizabeth.com/arr-fhir/SEH/api/FHIR/R4` |
| Authorization | `https://sehproxy.stelizabeth.com/arr-fhir/oauth2/authorize` |
| Token | `https://sehproxy.stelizabeth.com/arr-fhir/oauth2/token` |
| PKCE method | S256 |
| Standalone patient launch | ✓ |
| Offline access | ✓ |

## Security notes

- `.env` and `.token.json` are gitignored. Health data and tokens never leave this machine and your Supabase.
- The service role key is used only by this local tool. Never expose it in client-side code.
- Refresh tokens are stored in `.token.json` (same directory). Delete it to force a fresh login.
