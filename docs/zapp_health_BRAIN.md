# Zapp Health — System Brain Document
**Last updated:** 2026-06-29 · **Owner:** Brad Zapp (DOB 1977-09-02)

> **How to use this:** Single source of truth for Brad's personal health system. Drop it into a new Claude chat or hand it to Claude Code to get oriented cold. Captures *what exists, why it was built that way, and what's still open.* This is the LIVING map — update it in place when something material changes (don't make new copies). Daily play-by-play lives in dated session logs in `docs/`.

> **Cross-chat memory — two surfaces, kept in sync:** (a) version-controlled docs in `docs/` (this BRAIN + dated session logs), read by Claude Code; (b) Supabase table `session_logs` (project `kizrdaifculzighfngqz`), one row per session, readable by any chat with the Supabase connector. To orient a cold chat: read this BRAIN doc, then query Supabase `session_logs`, `providers`, and `screening_schedule`. Every session should append a `session_logs` row AND a `docs/` session log.

---

## 0. One-paragraph summary
Brad built a personal health-tracking web app ("zapp-health") to manage drinking as harm reduction after a Dec 2025 pancreatitis hospitalization, while watching his liver, triglycerides, prediabetes, and TRT-driven polycythemia. The app is a Vite/React frontend on Vercel reading a Supabase database. It tracks drinks, ranks the safest alcohol for *his* specific body, charts intake against lab trends, catches health emails from Gmail automatically, and shows biomarker trends colored by what's clinically good/bad *for him*. As of 2026-06-05 it also holds a forward-looking **Health & Wellness Calendar** — a year+ of recurring self-care (donations, IV therapy, spa, screenings, at-home rituals, golf, date nights) so nothing slips for months. Claude (chat) is the strategist + briefing engine; Claude Code does all file/repo/deploy work on Brad's Windows machine.

---

## 1. Working style (honor this)
- Brad uses only: **this chat, Claude Code (paste ONE prompt), the live product.** No terminal/filesystem/GitHub juggling.
- Claude Code hand-offs = ONE fenced block, no preamble, "work autonomously, don't ask clarifying questions."
- Claude Code has filesystem + GitHub access on `C:\Users\BradZapp\`.
- On "continue," do the obvious next thing without asking. Surface only directionally-significant decisions.

---

## 2. Architecture map (TWO projects, one shared asset)

| | zapp-health (THIS app) | gallery-one-inbox (condo project) |
|---|---|---|
| Repo | `github.com/bzapp9277/zapp-health` | `bzapp9277/gallery-one-inbox` (private) |
| Local | `C:\Users\BradZapp\zapp-health` | `C:\Users\BradZapp\projects\gallery_one_inbox` |
| Supabase | `kizrdaifculzighfngqz` | `kdhxcesowtjesdwerdut` (Gallery One Hub) |
| Purpose | health tracking | condo/Hilton email pipeline |

**Shared asset — the Gmail OAuth token:** lives ONLY in the Gallery One Supabase (`kdhxcesowtjesdwerdut`), table `gmail_oauth_token`, row id=1. Scope `gmail.readonly`; Google OAuth app in **Production** (no expiry). Condo pipeline AND the health poller read/refresh/write-back that SAME row — never duplicate it. Gmail watched: **brjack2177@gmail.com**. The condo pipeline (`pipeline.py`, `condo_*` tables) is production and was left UNTOUCHED.

---

## 3. zapp-health app — facts
- **Live URL:** https://zapp-health.vercel.app (Vercel)
- **Login:** email-only client gate — type `brjack2177@gmail.com` → in. **NOT real auth** (no magic link/password) and **RLS is OFF** — deliberate, for speed. Keep URL semi-private until locked down (Open Threads).
- **Supabase:** project `kizrdaifculzighfngqz`, app user_id `eb3d4470-3f8b-436a-94db-783d9a744491`, RLS disabled.
- **Stack:** Vite + React, recharts, lucide-react, top-level ErrorBoundary.
- **Commits/identity:** Claude Code commits signed `bzapp@conneticventures.com` (its git identity), not Brad's Gmail. Per-feature commits.

### Tables (live counts, 2026-06-07)
lab_results (295) · markers (58, has `better_direction`) · drink_types (15) · alcohol_log (7 — baseline week only) · drink_rankings (2) · briefings (2) · health_inbox (3) · health_metrics (2, dormant) · providers (1) · screening_schedule (3) · session_logs (2). Also: lab_panels, medications, medication_doses, treatments, health_events, doctor_questions, reports, profiles, vitals_log + views (v_marker_scorecard, v_latest_marker_values, v_active_medications).

**FHIR tables (added 2026-06-29, all have `owner` column):** fhir_observations · fhir_medications · fhir_conditions · fhir_allergies · fhir_immunizations · fhir_reports · fhir_procedures. View: `v_fhir_labs` (lab observations, same shape as v_latest_marker_values). Currently populated with sandbox test data (`owner='SANDBOX_TEST'`); production Brad rows (`owner='brad'`) pending client provisioning. See §13.

### Front-end data modules (code, not DB)
- `src/data/wellnessCalendar.js` — **single source of truth for the Health & Wellness Calendar** (see §8). 70 events, hand-authored, version-controlled with the code. NOT in Supabase (yet — see Open Threads).

### Tabs
Overview, Biomarkers, Medications, Treatments, **Drinks**, **Briefings**, For Doctor, Reports, Profile, **Calendar** (added 2026-06-05).

---

## 4. Features (all live & working)
- **Drinks tab** *(section order updated 2026-06-05 → chart TOP, entry MIDDLE, rules BOTTOM)*: (1) Intake-vs-Labs correlation chart on top (weekly ethanol bars vs ALT/Lipase/Trig lines; 630g baseline + 196g heavy-drinking reference lines); (1b) Progress-vs-Baseline % chart directly under it — each logged week's ethanol as a % above/below the Dec-2025 baseline of 630 g/wk; weekly line + dashed 4-week trailing-average overlay; zero-line reference labeled "2025 baseline (630g/wk)"; green below / red above (lower is better); headline stat = trailing-4-week average with TrendingDown/Up icon. Baseline now lives in a shared BASELINE_ETHANOL_G_PER_WEEK constant used by both Drinks-tab charts; (2) data entry in the middle — AF-day counter + baseline editor grid, then the log form (drink picker → Add to list → Save; symptom/sleep/energy/water/journal fields; backfill date), then the recent-log list; (3) Current Ranking card with color-coded tiers + pattern rule at the bottom.
- **Calendar tab** (new — see §8).
- **Briefings tab:** reverse-chron archive + reading lists + "briefing due" banner (next 2026-06-07).
- **Health inbox** (Overview card): Gmail health to-dos.
- **Biomarkers page:** Delta column shows **lifetime change** (`pct_change_lifetime`), tooltip shows per-marker baseline date. Colored by clinical good/bad via `better_direction`.

---

## 5. Brad's health context (the WHY)
- **Dec 2025 acute pancreatitis** (bourbon-driven). Dominant constraint. Lipase target <50; spiked ~129, recovered to ~20 by Feb.
- **Fatty liver (likely MASLD/metabolic):** ALT chronically 42-82, now ~47. Responsive to reduced intake → next labs = real test.
- **Triglycerides 149** (at ceiling but DOWN lifetime from 170). High trig itself triggers pancreatitis.
- **Prediabetes:** A1c 6.0.
- **TRT polycythemia:** hematocrit 56.4, managed via blood donation. Alcohol dehydration worsens it → why hematocrit/hgb/RBC/ferritin/iron are personalized "lower is better."
- **Weight:** on Ozempic, down (~223 → ~201).
- **Meds (converge on liver/pancreas):** atorvastatin, Ozempic (GLP-1), TRT (testosterone enanthate 50mg SubQ weekly, Mon/Thu rhythm), low-dose aspirin, NAC, Combivent; also tadalafil, folic acid, thiamine. PCP: Charles Jeffrey Burgher, MD (St. Elizabeth Physicians).
- **Calcium score:** great — protect it.
- **Baseline drinking Dec 2025:** ~630g ethanol/wk. Now: spirits OFF, wine/beer only.
- **Goals:** drop weight, sleep better, stay sexually active w/ wife, get a bit stronger / stay strong longer; live well & active to ≥80. Family is the priority.
- **Locations:** lives Walton, KY. St. Elizabeth (Dry Ridge/Florence/Edgewood/Covington). Travels NYC ↔ Chicago ↔ Fort Lauderdale.

---

## 6. Drink ranking (Edition 2) + biomarker directions
**Edition 2 tiers (live):** PATTERN RULE above type (cap ~2-3 drinks/day, 3+ AF days/wk). Tier 1 dry wine/sparkling (Chianti/Pinot Noir over Cabernet). Tier 2 light beer (Michelob Ultra best). Tier 3 regular beer occasional. BANNED: spirits.
**`better_direction`:** higher-better (HDL, eGFR, albumin, testosterone, vit D, folate, B12, Mg, Zn, DHEA-S); lower-better (ApoB, total chol, LDL, ALT, AST, BUN, glucose, A1c, triglycerides, homocysteine, RDW, lipase + personalized: hematocrit, hemoglobin, RBC, ferritin, iron); neutral (thyroid, electrolytes, bilirubin, globulin, protein, cortisol, estradiol, SHBG, platelets, WBC, MCV).

---

## 7. Gmail health poller (runs itself, every 4h)
- `health_poller.py` in gallery-one-inbox repo, own workflow `.github/workflows/health-poller.yml`, GitHub Actions cron.
- Reuses shared Gmail token (§2); writes to zapp-health `health_inbox` via `ZAPP_HEALTH_SERVICE_KEY` (GH Actions secret).
- SENDER_ALLOWLIST (stelizabeth.com, mychartdonotreply@stelizabeth.com, labcorp.com, questdiagnostics.com) + health subject keywords; SENDER_BLOCKLIST (classmates.com).
- Most health email = notifications, not data → generates "download from MyChart" to-dos; **lab data still arrives via Brad dropping PDFs into chat.**
- **Apple Health pipe (DORMANT):** `ingest-health` Edge Function + `health_metrics` table exist for a "Health Auto Export" iOS webhook. Unused — no wearable. Ready if Brad gets a scale/watch.

---

## 8. Health & Wellness Calendar (built 2026-06-05)
**Goal:** prep a year+ ahead so necessary self-care never lapses for months. Items can be moved or skipped occasionally — this is the default cadence, not a contract.

- **Source of truth:** `src/data/wellnessCalendar.js` (70 events, window Jun 2026 → May 2027, Hoxworth cycle rolls every ~3 months going forward). Rendered by the **Calendar** tab in `App.jsx`; per-category color/icon/legend live in `CAT_CFG`. A human-facing PDF export also exists (`docs/Brad_Health_Calendar_Jun2026-May2027.pdf`).
- **Event schema:** `{ id, date (ISO), endDate, category, title, location, withKat, payer, isPTO, isPizzaNight, needsBooking, notes }`. `needsBooking=true` = a vendor appointment a human must schedule; `false` = at-home block, travel band, blackout, or held evening.

**Category counts (70 total):**
- prime_iv 8 (local, w/ Kat, +pedicure +dinner) + 4 bundled into Hoxworth = **12 local IVs**
- prime_iv_travel 1 (FLL add-on, Dec 11 during boat-parade trip)
- elite_medspa 4 (Japanese head spa + men's facial + IV)
- bom_dia 4 (couples massage + red light = the quarterly massage)
- hoxworth 4 (blood donation 12:45 NKY + Prime IV + pedicure + pizza; pizza nights)
- labs 4 (fasting ~8:15 Burgher, the Tue after each donation — except Jun = Mon 6/22 due to Michigan travel; "sober Sun+Mon beforehand" note on each)
- golf 20 (every in-town Saturday May–Sep + all 4 donation Saturdays; the 4 post-donation are "locked/for certain")
- firepit_forest 10 (at home, w/ Kat, Apr–Nov only, never a pizza night; fire pit & forest bathing ALWAYS co-occur → modeled as ONE event)
- liv_work 4 (LIV Healthy Hydrate IV at work: Jun 10 office-people daytime Wed; Oct 22 + Feb 4 Thu "HHour Advisor event"; Jan 5 Tue recovery-after-poker, repeats yearly)
- massage_chair 2 (at office, Wed Jun 17 + Nov 18)
- date_night 2 (w/ Kat, held evening 5–10pm, NO booking: Fri Nov 6 2026 + Fri May 7 2027)
- travel bands 5 (Michigan Jun 23–28; FL Aug 15–22; FL Oct 1–9; FLL boat parade Dec 9–13; FLL spa trip Feb 13–20 incl Presidents' Day)
- blackout 2 (Sep 4 birthday/anniversary week 9/2–9/8 kept open; Jan 1 poker tournament)
- 2027 screenings (pending, date TBD, Fridays/PTO): dental cleaning ANNUAL starting 2027 at Bell Dental Group (Hyde Park, 2767 Erie Ave, Cincinnati OH 45208, 513-802-9440), booked same-day as each skin check; skin check q3yr from 2027; colonoscopy q3yr from 2027 (St. E chart listed due ~Nov 2026; pushed to 2027 by choice). Providers + cadence persist in Supabase tables `providers` and `screening_schedule`.

**Rules baked in:** Friday items are PTO (incl. at-home & date nights). Nothing local is booked inside a travel band. Golf is weekend (not PTO). Cold-weather golf (Dec/Mar donations) kept but weather-permitting. Birthday/anniversary week (9/2–9/8) and Jan-1 poker are protected. No kid/stepkid birthday (Aubree 5/19, Grant 1/31, Andie 7/1) lands on a Friday in this cycle. Analytics note: post-donation labs dip hematocrit/hgb/RBC — expected, not a real trend; flag those points.

**Scheduling decision (2026-06-05):** For now, **email the save-the-date PDF to Dawna** (assistant; dstoops@wendal.com, cc bzapp@conneticventures.com) and she blocks the whole year on Brad's real calendar; movable later. Deferred: per-item "Draft to Dawna" buttons + direct calendar booking. **Why deferred:** Gmail token is `gmail.readonly` and the M365 connection is read-only → nothing in the stack can write to Brad's real calendar. A human (Dawna) is the write layer. Direct booking is a post-security-session future step (needs calendar write scope).

---

## 9. Automation & data-flow ledger (what's auto vs manual — keep current)
Brad's standing rule: **health data is never silently overwritten.** Uploaded docs → extract → show Brad → he confirms → then write. (Docs go stale; OCR errs.)

| Thing | How it moves | Auto? |
|---|---|---|
| Gmail health to-dos | poller every 4h, **read-only** Gmail → writes to-dos to `health_inbox` only | **Auto** (never touches weight/meds/labs/calendar) |
| Apple Health metrics | `ingest-health` Edge Fn + `health_metrics` | **Dormant** (no device) |
| Lab results | Brad drops PDFs in chat → Claude parses → inserts to `lab_results`/`markers` | Manual / assisted-with-confirm |
| Weight | manual entry (`vitals_log`) | Manual |
| Medications | manual, from MyChart snapshots | Manual |
| Drinks | Brad logs in the app | Manual |
| Wellness calendar | code data module; PDF → Dawna → she books real calendar | Manual (no auto-booking) |
| Providers & screening cadence | edited via Supabase connector (chat) | Manual |
| Session memory | `session_logs` table (Supabase) + `docs/` session logs | Manual |
| **FHIR record pull** | `node tools/fhir-pull/index.js` — one browser login (Brad's St. E MyChart), then silent refresh-token re-runs; upserts to fhir_* tables `owner='brad'` | Manual trigger / future: weekly auto-job |
| **FHIR sandbox** | `$env:FHIR_ENV="sandbox"; node tools/fhir-pull/index.js` — test patient Camila Lopez | Manual (test only) |

---

## 10. Working rhythm
- **Daily:** log drinks + how you felt (a logged zero is data).
- **RED FLAG:** upper-abdominal/back pain esp. after eating → stop, hydrate, ER if escalates.
- **Weekly:** "run my briefing" → fresh research + week's logs/labs + re-rank + archive.
- **~8 weeks:** labs → new chart point = real verdict.

---

## 11. OPEN THREADS / TODO
1. **RESOLVED — drink-logging bug** (numeric-as-strings). Fixed; Brad confirmed on phone.
2. **Security lockdown (PARKED at Brad's request):** real auth (magic link) + turn on RLS + rotate the leaked `sbp_8cd9...` management token. App + data reachable by anyone with the URL until then. Brad committed to a dedicated cross-project security session "soon."
3. **Catch-up logging:** last logged = May 31 chianti; June not yet entered. Insert via Supabase connector when Brad lists the days. (2026-06-18: Progress-vs-Baseline chart now plots 4 weeks 5/25–6/15 — confirm June logging is fully complete/accurate so the % trend is trustworthy.)
4. **RESOLVED 2026-06-05 — version control for docs:** BRAIN doc + session logs + calendar PDF now committed into `zapp-health/docs/`.
5. **Weekly-briefing calendar reminder:** M365 read-only → can't create events. In-app banner fires 2026-06-07 meanwhile.
6. **markers.personal_notes column:** add it + hover note for personalized colors. Nice-to-have.
7. **NEW — Calendar lives in code, not DB:** move the 70 events into a Supabase table when in-app editing (or Dawna/automated editing) is needed. Until then, edits = Claude Code change to `wellnessCalendar.js`. *(Update 2026-06-07: scheduling has begun migrating to Supabase via the new `providers` + `screening_schedule` tables; display calendar still lives in code.)*
8. **NEW — Direct calendar booking (future):** the "book these onto my real calendar automatically" version needs calendar write scope (Gmail send and/or Graph write). Tie to the security session; until then, Dawna is the write layer via the save-the-date PDF.
9. **FHIR production pull — blocked on St. Elizabeth client provisioning (2026-06-29):** Epic app `3641578b-afd2-4d0a-a1cd-715a2a391123` is marked Production Ready (USCDI v3 auto-distribution); St. Elizabeth's Epic instance not yet provisioned it — returns "OAuth2 Error: something went wrong trying to authorize the client" before login. Code is confirmed correct (sandbox with different client ID fully proven). **Re-run daily until the authorize URL shows a login form instead of the error.** Interim: Brad requested a MyChart Computer-Readable Export (FHIR file) — when it arrives, ingest into fhir_* tables tagged `owner='brad'`.
10. **Katherine side-by-side (future):** once Brad's data is in, add Katherine with her own St. E MyChart login, `owner='katherine'`, and build side-by-side biomarker views + a "Sync my records" button + weekly auto-job.

---

## 13. FHIR record pull — status as of 2026-06-29

**Goal:** pull Brad's St. Elizabeth records into the fhir_* tables so the app shows real clinical data alongside manual lab entries. Owner-tagged for multi-person future (Brad + Katherine).

**Tool:** `tools/fhir-pull/` — zero-dependency Node CLI, runs `node tools/fhir-pull/index.js`. Secrets in gitignored `.env`. Supports two modes:
- **Production** (default): client ID `3641578b-afd2-4d0a-a1cd-715a2a391123`, endpoint `sehproxy.stelizabeth.com/arr-fhir/api/FHIR/R4`, rows tagged `owner='brad'`.
- **Sandbox** (`FHIR_ENV=sandbox`): client ID `e82e004c-84f9-4c8b-ba12-901e7192b70d`, endpoint `fhir.epic.com`, rows tagged `owner='SANDBOX_TEST'`.

**Status:**
- Pipeline proven end-to-end in sandbox: 248 observations (labs + vitals) + conditions/meds/allergies/immunizations/reports/procedures upserted; `v_fhir_labs` view populated and queryable.
- Production blocked: St. Elizabeth's Epic instance has not yet provisioned the production client ID. Returns Epic "OAuth2 Error — something went wrong trying to authorize the client" before any login form loads. This is a provisioning delay (auto-distribution window), not a code bug.
- Interim path: MyChart Computer-Readable Export — Brad requested the FHIR export file from St. Elizabeth MyChart; when it arrives, ingest it into fhir_* tables tagged `owner='brad'` using a one-off script.

**Endpoint facts:**
- St. Elizabeth FHIR R4 canonical base: `https://sehproxy.stelizabeth.com/arr-fhir/api/FHIR/R4`
- Authorize: `https://sehproxy.stelizabeth.com/arr-fhir/oauth2/authorize`
- Token: `https://sehproxy.stelizabeth.com/arr-fhir/oauth2/token`
- MyChart portal: `mychart.stelizabeth.com`
- Apple Health Records: no St. Elizabeth match (Apple's narrower program); not a signal that FHIR is closed.

**Once production is live:** one browser login → refresh token saved to `.token.json` → all future runs are silent (no browser). Add to a weekly GitHub Actions cron for fully automatic sync.

---

## 12. Reusable patterns / lessons
- **Per-feature commits** in Claude Code prevent losing a whole run to a dropped connection.
- **Secret hygiene:** secrets in gitignored `.env.local`, never echoed.
- **Verify, don't assume:** read-only audit prompts catch cosmetic-only changes and false positives.
- **Co-occurring items = one event:** modeling fire pit and forest bathing as separate rows created phantom duplicates (event count read 85 vs the real 68); merging them to a single `firepit_forest` event fixed the count. When two things always happen together, model them as one.
- **Verify weekdays in code:** every calendar date/anchor was day-of-week checked before locking — caught the Jun-23 labs-vs-Michigan clash and that Jan 1 2027 is a Friday.
- **Claude.ai container resets between turns:** the PDF build script does not persist in `/home/claude`; regenerate it each session. Final artifacts live in `/mnt/user-data/outputs` and get pulled into the repo by Claude Code.
- **Claude Code gotchas:** model changes apply to NEW sessions only; 1M-context mode can throw credit errors (use standard/Sonnet); usage limits reset on a timer.
