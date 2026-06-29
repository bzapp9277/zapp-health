# Session Log — 2026-06-29
**Topic:** Epic SMART-on-FHIR pipeline — build, sandbox proof, production blocker diagnosis.
**Participants:** Brad + Claude Code (repo/deploy/run).

## Goal
Pull Brad's St. Elizabeth Healthcare medical records (labs, vitals, conditions, meds, allergies, immunizations, reports, procedures) into the zapp-health Supabase (`kizrdaifculzighfngqz`) via Epic's SMART-on-FHIR patient-access API. Owner-tagged (`owner='brad'`) so Katherine can be added later side-by-side with her own owner tag.

---

## What we built

### `tools/fhir-pull/` (zero-dependency Node.js CLI)
- **OAuth2 + PKCE S256** standalone patient launch; public client; local HTTP callback server on `127.0.0.1:8765` (matches Epic's registered redirect URI exactly).
- **Per-category Observation fetch** — Epic rejects an unfiltered `Observation` search with `400: Must have either code or category`. The tool loops over: `laboratory`, `vital-signs`, `social-history`, `core-characteristics`, `functional-status`, `survey`; dedupes by `resource.id`; skips any category returning 4xx.
- **Paginated FHIR R4** for all resource types; `_count=200` per page; guard at 50,000 rows.
- **Tolerant error handling** — 401/403/404 per resource type skips cleanly; run never aborts mid-pull.
- **Supabase upsert** via REST (service role key, `on_conflict=id`, `resolution=merge-duplicates`).
- **Dual-mode** — `FHIR_ENV=sandbox` uses non-prod client ID `e82e004c-84f9-4c8b-ba12-901e7192b70d` against `fhir.epic.com`; default is production St. Elizabeth.
- **Pre-flight CONFIG VERIFICATION block** printed to console showing mode, client ID, auth host, redirect URI, aud, and which token file is consulted.
- **Refresh token cache** — saved to `.token.json` (prod) / `.token.sandbox.json` (sandbox); silent re-runs after first auth. Both gitignored.
- **Owner tagging** — production rows: `owner='brad'`; sandbox rows: `owner='SANDBOX_TEST'` with `SANDBOX_`-prefixed IDs to prevent collision.
- Run command: `node tools/fhir-pull/index.js` (prod) or `$env:FHIR_ENV="sandbox"; node tools/fhir-pull/index.js` (sandbox).

### Supabase migrations (applied to `kizrdaifculzighfngqz`)
| Migration | What it does |
|---|---|
| `20260627000000_fhir_tables.sql` | Creates 7 fhir_* tables + `v_fhir_labs` view |
| `20260629000000_fhir_owner_column.sql` | Adds `owner text not null default 'PRODUCTION'` to all 7 tables; drops + recreates `v_fhir_labs` to add `owner` column (Postgres can't reorder view columns in place) |

**Tables:** `fhir_observations`, `fhir_medications`, `fhir_conditions`, `fhir_allergies`, `fhir_immunizations`, `fhir_reports`, `fhir_procedures`. All: `id text primary key`, `patient_id text`, `fhir_resource jsonb` (full raw FHIR), plus parsed flat columns, `owner text`.

**View:** `v_fhir_labs` — filters `fhir_observations` to `category='laboratory' AND value_quantity IS NOT NULL AND status='final'`; renders as `code, display_name, value, unit, collected_on, flag, lab_ref_low, lab_ref_high, owner`. Same shape as `v_latest_marker_values` so it can slot into existing Biomarkers UI.

---

## Sandbox proof (pipeline verified end-to-end)

**Test patient:** Camila Lopez (`fhircamila` / `epicepic1`) — Epic's documented rich R4 sandbox patient, non-prod client ID `e82e004c-84f9-4c8b-ba12-901e7192b70d`.

| Table | Rows (owner='SANDBOX_TEST') |
|---|---|
| fhir_observations | 248 (1 lab, 243 vital-signs, 3 survey, 1 social-history) |
| fhir_medications | 1 |
| fhir_conditions | 7 |
| fhir_allergies | 1 |
| fhir_immunizations | 1 |
| fhir_reports | 4 |
| fhir_procedures | 1 |

`v_fhir_labs` populated: **1 row** — Hemoglobin A1c (LOINC 4548-4), value `5.1`, collected 2019-05-28. Lab filter + parsing confirmed working.

**Conclusion:** Code is correct. Full auth → fetch → parse → upsert → view pipeline proven.

---

## Production blocker — diagnosed, not a code problem

**Target:** production client ID `3641578b-afd2-4d0a-a1cd-715a2a391123`, endpoint `sehproxy.stelizabeth.com/arr-fhir/oauth2/authorize`.

**Error (verbatim, every attempt):**
> Page title: "OAuth2 Error"
> Message: "Something went wrong trying to authorize the client. Please try logging in again."

**What was ruled out conclusively:**
- Redirect URI — `http://127.0.0.1:8765/callback` matches Epic registration exactly; tested.
- Wrong endpoint — St. Elizabeth FHIR server is confirmed live; both `/arr-fhir/SEH/api/FHIR/R4` and `/arr-fhir/api/FHIR/R4` return HTTP 200 metadata; identical SMART configs from both; current code uses canonical `/arr-fhir/api/FHIR/R4`.
- Wrong `aud` — tested both `/SEH/` and canonical paths in `aud`; same error either way.
- Code bug — sandbox with a different client ID on a different endpoint succeeds; the code is not the variable.

**Root cause:** St. Elizabeth's Epic instance has not yet provisioned client ID `3641578b-afd2-4d0a-a1cd-715a2a391123`. The app is marked Production Ready with USCDI v3 automatic client distribution on open.epic.com; propagation window is typically days, up to ~a week.

---

## Key decisions
1. **Per-category Observation loop** — required by Epic's FHIR server; confirmed working. `core-characteristics` returns 400 on both sandbox and production; skip is correct behavior.
2. **Canonical FHIR base** — updated from `/arr-fhir/SEH/api/FHIR/R4` to `/arr-fhir/api/FHIR/R4` per the CapabilityStatement's own `url` field. Both paths serve resources but the canonical matches the server's registered identity.
3. **`owner='brad'` tag** — production rows use this (not `'PRODUCTION'`) so future Katherine rows (`owner='katherine'`) slot in naturally alongside.
4. **Sandbox stays** — sandbox data (`owner='SANDBOX_TEST'`) can be deleted anytime with `DELETE FROM fhir_* WHERE owner='SANDBOX_TEST'` per table.
5. **St. Elizabeth confirmed patient-portal-capable** — MyChart at mychart.stelizabeth.com exposes Sharing Hub, Computer-Readable Export (FHIR file), and Linked Apps. Apple Health Records shows no St. Elizabeth match (Apple's narrower endorsement program) — not a "closed door" signal for the FHIR API.

---

## In-flight items
- **MyChart Computer-Readable Export (interim path):** Brad requested a FHIR export from MyChart → St. Elizabeth. When the file arrives (email or download), ingest it into the `fhir_*` tables tagged `owner='brad'`. This bypasses the OAuth blocker and gets real data into the app while the client is being provisioned.
- **Daily production re-run:** `node tools/fhir-pull/index.js` — when the authorize screen shows a login form instead of the OAuth error, it's live. Saved refresh token means all subsequent runs are silent (no browser needed).

---

## Commits this session
| Hash | Description |
|---|---|
| `dc01bf5` | fhir-pull: add FHIR_ENV=sandbox mode for end-to-end pipeline test |
| `3ed6890` | fhir-pull: fix Observation fetch with per-category loop |
| `7772469` | fhir-pull: switch sandbox test patient to Camila Lopez for lab/vitals coverage |
| `84385b5` | fhir-pull: correct production FHIR base to canonical URL; add config verification block |

---

## Next session
1. Check if MyChart FHIR export file arrived — if yes, ingest into fhir_* tables tagged `owner='brad'`.
2. Re-run `node tools/fhir-pull/index.js` — if a real St. Elizabeth MyChart login loads (not the OAuth error), complete it and verify `owner='brad'` row counts.
3. Once Brad's data is in: set up Katherine (her own St. E MyChart login, `owner='katherine'`).
4. Build side-by-side views (Brad vs Katherine on the same biomarker chart).
5. "Sync my records" button in the app + weekly auto-job (GitHub Actions cron).
