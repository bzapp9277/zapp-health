# Zapp Health — System Brain Document
**Last updated:** 2026-06-01 (evening) · **Owner:** Brad Zapp (DOB 1977-09-02)

> **How to use this:** This is the single source of truth for Brad's personal health system. Drop it into a new Claude chat or hand it to Claude Code to get oriented cold. It captures *what exists, why it was built that way, and what's still open.* When something material changes, update this file.

---

## 0. One-paragraph summary
Brad built a personal health-tracking web app ("zapp-health") to manage drinking as harm reduction after a Dec 2025 pancreatitis hospitalization, while watching his liver, triglycerides, prediabetes, and TRT-driven polycythemia. The app is a Vite/React frontend on Vercel reading a Supabase database. It tracks drinks, ranks the safest alcohol for *his* specific body, charts intake against lab trends, catches health emails from Gmail automatically, and shows biomarker trends colored by what's clinically good/bad *for him*. Claude (chat) is the strategist + briefing engine; Claude Code does all file/repo/deploy work on Brad's Windows machine.

---

## 1. Working style (how Brad operates — honor this)
- Brad uses only three tools: **this chat, Claude Code (paste ONE prompt), and the live product.** No terminal, no filesystem, no GitHub/downloads juggling.
- Hand-offs to Claude Code = ONE fenced code block, no preamble, with "work autonomously, don't ask clarifying questions."
- Claude Code has filesystem + GitHub access on `C:\Users\BradZapp\`.
- When Brad says "continue/keep going," do the obvious next thing without asking permission. Surface decisions only when directionally significant.

---

## 2. Architecture map (TWO projects, one shared asset)

| | zapp-health (THIS app) | gallery-one-inbox (his condo project) |
|---|---|---|
| Repo | `github.com/bzapp9277/zapp-health` | `bzapp9277/gallery-one-inbox` (private) |
| Local | `C:\Users\BradZapp\zapp-health` | `C:\Users\BradZapp\projects\gallery_one_inbox` |
| Supabase project | `kizrdaifculzighfngqz` | `kdhxcesowtjesdwerdut` (Gallery One Hub) |
| Purpose | health tracking | condo/Hilton email pipeline |

**The shared asset:** the Gmail OAuth token. It lives ONLY in the Gallery One Supabase (`kdhxcesowtjesdwerdut`), table `gmail_oauth_token`, row id=1. Scope = `gmail.readonly`; the Google OAuth app is in **Production** status so the token does not expire. Both the condo pipeline AND Brad's new health poller read/refresh/write-back that SAME row (never duplicate it — dual-store drift caused past auth failures). Gmail account watched: **brjack2177@gmail.com**.

**Rule:** the condo pipeline (`pipeline.py`, condo_* tables) is production and was deliberately left UNTOUCHED. The health poller is a separate, isolated, read-only job.

---

## 3. zapp-health app — facts
- **Live URL:** https://zapp-health.vercel.app (deployed on Vercel)
- **Login:** email-only client-side gate. Type `brjack2177@gmail.com` → in. **This is NOT real authentication** (no magic link, no password) and **RLS is OFF** — chosen deliberately for speed; see Open Threads. Treat the URL as semi-private; don't post it publicly until locked down.
- **Supabase:** project `kizrdaifculzighfngqz`, app user_id `eb3d4470-3f8b-436a-94db-783d9a744491`, RLS disabled (single-user).
- **Stack:** Vite + React, recharts, lucide-react. Has a top-level React ErrorBoundary (added after a blank-page crash).

### Tables (live row counts as of 2026-06-01)
| Table | Rows | Purpose |
|---|---|---|
| lab_results | 295 | all lab values |
| markers | 58 | marker definitions + `better_direction` |
| drink_types | 15 | reference drinks (14 seed + Chianti) |
| alcohol_log | 7 | daily drink + feelings log (baseline week) |
| drink_rankings | 2 | weekly safest-alcohol ranking (edition 1 & 2) |
| briefings | 2 | weekly briefing archive (edition 1 & 2) |
| health_inbox | 3 | Gmail health to-dos |
| health_metrics | 2 | Apple Health metrics (pipe built, unused — no wearable) |
| (also) | | lab_panels, medications, medication_doses, treatments, health_events, doctor_questions, reports, profiles, vitals_log + views (v_marker_scorecard, v_latest_marker_values, v_active_medications) |

### Tabs
Overview, Biomarkers, Medications, Treatments, **Drinks** (new), **Briefings** (new), For Doctor, Reports, Profile.

---

## 4. Features built today (2026-06-01)

**Drinks tab** — Current Ranking card (color-coded tiers) + drink log form (drink picker, quantity, symptom fields, sleep/energy, water, journal, backfill date) + recent-log list + **Intake-vs-Labs correlation chart** (weekly ethanol bars vs ALT/Lipase/Triglyceride lines on one timeline, with 630g baseline + 196g heavy-drinking reference lines). ⚠️ **The add-a-drink form currently errors — see Open Threads #1.**

**Briefings tab** — reverse-chron archive of weekly briefings with reading lists (Academic/Popular badges) + a "briefing due" banner that fires 7 days after the last (next: 2026-06-07).

**Health inbox** (Overview card) — to-do items from the Gmail health poller.

**Biomarkers page — lifetime deltas (changed today):** the far-right Δ now shows **lifetime change** (from oldest recorded value, via `pct_change_lifetime`/`direction_lifetime`), NOT since-last-measurement. Per-row tooltip shows the baseline date (windows differ: some markers start 2021, some Dec 2024). Colored by clinical good/bad via the `better_direction` field — see §6.

---

## 5. Brad's health context (the WHY behind everything)
- **Dec 2025: acute pancreatitis** (driven by ~1/3 bottle/day of 100-proof bourbon, 6 days/week + flight vodka sodas). THE dominant constraint. Lipase spiked to ~129, recovered to ~20 by Feb 2026. Target lipase <50.
- **Fatty liver (likely MASLD — metabolic):** ALT chronically 42–82, currently ~47. Travels with his prediabetes + dyslipidemia. ALT responds within weeks of reduced intake → next labs are a real test.
- **Triglycerides 149** — at the ceiling, but DOWN lifetime (from 170). High trig is itself a pancreatitis trigger.
- **Prediabetes:** A1c 6.0. Gets sugar flashes/crashes.
- **TRT-driven polycythemia:** hematocrit 56.4, managed via **blood donation**. Dehydration (incl. from alcohol) worsens it. This is why hematocrit/hemoglobin/RBC/ferritin/iron are personalized to "lower is better" for him.
- **Weight:** on Ozempic, trending down (was 223 → ~201). Goal weight tracked.
- **Meds (converge on liver/pancreas):** atorvastatin (statin, liver), Ozempic (GLP-1, slows gastric emptying + pancreas caution), TRT, low-dose aspirin, NAC, Combivent.
- **Calcium score:** great — protect it, but no good evidence alcohol helps it (that idea was corrected; the "alcohol is heart-protective" story is largely confounding).

### Drinking baseline & week 1
- **Dec 2025 baseline:** ~630 g ethanol/week (~45 standard drinks). Now: spirits OFF the table, wine/beer only.
- **Week 1 (May 25–31, 2026):** ~344 g ethanol (~half baseline — a win), ALL Tier 1 wine, zero abdominal pain. BUT one binge day (Wed: ~2 bottles / ~11 drinks → 2 "dead" recovery days) and 0 true alcohol-free days. Leaned heavily on Cabernet.

---

## 6. The drink ranking logic (current = Edition 2)
Research basis: spirits carry the strongest per-occasion pancreatitis signal; wine carries none in large cohorts; **drinking pattern (daily/binge) matters as much as type.** For MASLD, guidelines favor restriction (no proven safe threshold), but the liver is responsive.

**Edition 2 tiers (live in app):**
- **PATTERN RULE (ranks above type):** cap any single day at ~2–3 drinks; bank 3+ alcohol-free days/week. (Added because week 1 proved type discipline was already good — pattern is the lever.)
- **Tier 1 — dry wine & dry sparkling:** Brut Nature Cava (Segura Viudas), **Chianti / Pinot Noir promoted over Cabernet** (lower ABV = less ethanol/glass), dry whites (Sauv Blanc, Pinot Gris). Specific picks vetted: Segura Viudas Brut Nature, Roederer Estate Brut, Kim Crawford / Sancerre (Pascal Jolivet), Ruffino / Antinori Pèppoli Chianti.
- **Tier 2 — light beer:** Michelob Ultra (best), Miller Lite.
- **Tier 3 — regular beer (occasional):** Peroni, Corona (worst on carbs), Pacifico.
- **BANNED — spirits:** bourbon, vodka, vodka sodas.

### Biomarker `better_direction` assignments (drives Δ color)
- **Higher is better (green when up):** HDL, eGFR, albumin, free + total testosterone, vitamin D, folate, B12, magnesium, zinc, DHEA-S.
- **Lower is better (green when down):** ApoB, total cholesterol, LDL (ldl_calc), ALT, AST, BUN, glucose, A1c, triglycerides, homocysteine, RDW, lipase — **PLUS personalized for Brad: hematocrit, hemoglobin, RBC, ferritin, iron** (his polycythemia → rising = bad).
- **Neutral (gray, no direction):** thyroid (TSH, free T3/T4), electrolytes (sodium, potassium, chloride, CO2, calcium), bilirubin, globulin, total protein, cortisol, estradiol, SHBG, platelets, WBC, MCV.
- Note: hematocrit currently shows **RED at 56.4% (+13.9% lifetime)** — correctly flagged for his situation.

---

## 7. The Gmail health poller (automated, runs itself)
- **What:** isolated read-only job that scans brjack2177@gmail.com every 4 hours for health senders, creates to-do rows in zapp-health `health_inbox`.
- **Where:** `health_poller.py` in the gallery-one-inbox repo, own workflow `.github/workflows/health-poller.yml` (GitHub Actions cron, offset from condo cron).
- **Auth:** reuses the shared Gmail token (§2). Writes to zapp-health via `ZAPP_HEALTH_SERVICE_KEY` (a GitHub Actions secret).
- **Filtering:** SENDER_ALLOWLIST (stelizabeth.com, mychartdonotreply@stelizabeth.com, labcorp.com, questdiagnostics.com) is a hard gate + health subject keywords; SENDER_BLOCKLIST (classmates.com). Editable arrays at top of `health_poller.py`.
- **Reality:** most health emails are NOTIFICATIONS ("new result, log in"), not data — so it mostly generates "download this from MyChart" to-dos; auto-ingest only on rare real attachments. Lab data itself still arrives via Brad dropping the PDF into chat.
- Brad's health system: **St. Elizabeth Healthcare (KY)**, Epic/MyChart. Also uses Labcorp + occasional other providers.

### Apple Health pipe (built but DORMANT)
A Supabase Edge Function `ingest-health` + `health_metrics` table exist to receive Apple Health data via the "Health Auto Export" iOS app → webhook. **Not in use** — Brad has no wearable, so vitals come from doctor reports, not a device. Ready if he ever gets a scale/watch.

---

## 8. Working rhythm
- **Daily:** log drinks + how you felt (and the no-drink days). Phone or chat.
- **RED FLAG (non-negotiable):** any upper-abdominal or back pain, esp. after eating → stop drinking, hydrate, ER if it escalates/comes with vomiting/fever. This is the Dec 2025 pattern.
- **Weekly:** when the "briefing due" banner fires (or ~weekly), say **"run my briefing"** in chat → Claude searches fresh research, pulls the week's logs + labs, re-ranks, archives it.
- **~Every 8 weeks:** labs. The intake-vs-labs chart gets a new ALT/lipase/trig point = the real verdict.
- **Next-week targets (set in Edition 2):** no repeat of the Wednesday binge; 3+ alcohol-free days; favor Chianti/Pinot Noir over Cabernet.

---

## 9. OPEN THREADS / TODO
1. **🔧 Drink-logging bug (IN PROGRESS):** the Drinks tab errors when adding a drink. Likely cause: Supabase returns numeric columns as JSON *strings*, breaking the form's total math → NaN/rejected insert. Fix block is written and waiting. Blocked tonight by Claude Code **session limit (resets 6:30pm ET)** + a 1M-context mode error (fix: new Claude Code session on standard/Sonnet model). Data is safe; only *new* logging is blocked.
2. **🔒 Security lockdown (PARKED at Brad's request):** add real auth (email magic-link) + turn on Supabase RLS. Until done, the app + data are reachable by anyone with the URL, and the public repo's anon key matters. Brad committed to a dedicated security session across ALL his projects "soon."
3. **🔑 Leaked management token:** the Supabase PAT `sbp_8cd9…` printed in multiple transcripts. Should be revoked (supabase.com → Account → Access Tokens). Part of the security session. Nothing running depends on it.
4. **📅 Weekly-briefing calendar reminder:** can't be created directly (the Microsoft 365 connector is read-only). In-app banner works (fires 2026-06-07). Options later: an .ics file, or a Graph-API event via Claude Code.
5. **📝 markers.personal_notes column:** doesn't exist; the "why is this colored my way" rationale couldn't be saved. Nice-to-have: add it + a hover note (e.g. "red due to polycythemia, not standard range").
6. **Cosmetic:** Claude Code commits are signed `bzapp@conneticventures.com` (its git identity), not Brad's Gmail. Harmless.

---

## 10. Reusable patterns / lessons
- **Per-feature commits** in Claude Code prevent losing a whole run to a dropped connection (learned after a 19-min single-file rewrite crashed).
- **Secret hygiene:** tokens go in gitignored `.env.local`, never echoed in command output. (Several leaks happened by inlining secrets into commands.)
- **Verify, don't assume:** read-only audit prompts ("prove the lock is real," "prove the poller ran") caught a cosmetic-only login and false-positive inbox rows.
- **The condo pipeline doc** (`GMAIL_PIPELINE_HANDOFF.md`) is the model — if Brad ever wants the same documented-record treatment for medical interactions (timeline of visits, what each doctor committed to), that pattern ports over well.
