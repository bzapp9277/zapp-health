# Zapp Health — System Brain Document
**Last updated:** 2026-06-01 (end of evening) · **Owner:** Brad Zapp (DOB 1977-09-02)

> **How to use this:** Single source of truth for Brad's personal health system. Drop it into a new Claude chat or hand it to Claude Code to get oriented cold. Captures *what exists, why it was built that way, and what's still open.* This is the LIVING map — update it when something material changes (don't make new copies). Daily play-by-play lives in dated session logs instead.

---

## 0. One-paragraph summary
Brad built a personal health-tracking web app ("zapp-health") to manage drinking as harm reduction after a Dec 2025 pancreatitis hospitalization, while watching his liver, triglycerides, prediabetes, and TRT-driven polycythemia. The app is a Vite/React frontend on Vercel reading a Supabase database. It tracks drinks, ranks the safest alcohol for *his* specific body, charts intake against lab trends, catches health emails from Gmail automatically, and shows biomarker trends colored by what's clinically good/bad *for him*. Claude (chat) is the strategist + briefing engine; Claude Code does all file/repo/deploy work on Brad's Windows machine.

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
- **Login:** email-only client gate — type `brjack2177@gmail.com` → in. **NOT real auth** (no magic link/password) and **RLS is OFF** — deliberate, for speed. Keep URL semi-private until locked down (Open Threads #2).
- **Supabase:** project `kizrdaifculzighfngqz`, app user_id `eb3d4470-3f8b-436a-94db-783d9a744491`, RLS disabled.
- **Stack:** Vite + React, recharts, lucide-react, top-level ErrorBoundary.

### Tables (live counts, 2026-06-01)
lab_results (295) · markers (58, has `better_direction`) · drink_types (15) · alcohol_log (7 — baseline week only; June not yet logged) · drink_rankings (2) · briefings (2) · health_inbox (3) · health_metrics (2, dormant). Also: lab_panels, medications, medication_doses, treatments, health_events, doctor_questions, reports, profiles, vitals_log + views (v_marker_scorecard, v_latest_marker_values, v_active_medications).

### Tabs
Overview, Biomarkers, Medications, Treatments, **Drinks**, **Briefings**, For Doctor, Reports, Profile.

---

## 4. Features (all live & working)
- **Drinks tab:** Current Ranking card (color-coded tiers) + log form (drink picker -> Add to list -> Save; symptom/sleep/energy/water/journal fields; backfill date) + recent-log list + **Intake-vs-Labs correlation chart** (weekly ethanol bars vs ALT/Lipase/Trig lines; 630g baseline + 196g heavy-drinking reference lines). *Add-a-drink flow: pick -> Add (lands in list) -> Save.*
- **Briefings tab:** reverse-chron archive + reading lists + "briefing due" banner (next 2026-06-07).
- **Health inbox** (Overview card): Gmail health to-dos.
- **Biomarkers page:** Delta column shows **lifetime change** (`pct_change_lifetime`), tooltip shows per-marker baseline date. Colored by clinical good/bad via `better_direction` — see section 6.

---

## 5. Brad's health context (the WHY)
- **Dec 2025 acute pancreatitis** (bourbon-driven: ~1/3 bottle 100-proof/day, 6 days/wk + flight vodka sodas). Dominant constraint. Lipase target <50; spiked ~129, recovered to ~20 by Feb.
- **Fatty liver (likely MASLD/metabolic):** ALT chronically 42-82, now ~47. Responds to reduced intake within weeks -> next labs = real test.
- **Triglycerides 149** (at ceiling but DOWN lifetime from 170). High trig itself triggers pancreatitis.
- **Prediabetes:** A1c 6.0. Sugar flashes/crashes.
- **TRT polycythemia:** hematocrit 56.4, managed via blood donation. Alcohol dehydration worsens it -> why hematocrit/hgb/RBC/ferritin/iron are personalized "lower is better."
- **Weight:** on Ozempic, down (~223 -> ~201).
- **Meds (converge on liver/pancreas):** atorvastatin, Ozempic (GLP-1), TRT, low-dose aspirin, NAC, Combivent.
- **Calcium score:** great — protect it; no good evidence alcohol helps it.
- **Baseline drinking Dec 2025:** ~630g ethanol/wk (~45 std drinks). Now: spirits OFF, wine/beer only.
- **Week 1 (May 25-31):** ~344g, all wine, one Wed binge, 0 AF days, 0 pain.

---

## 6. Drink ranking (current = Edition 2) + biomarker directions
Research basis: spirits = strongest per-occasion pancreatitis signal; wine = none; **pattern (daily/binge) matters as much as type;** MASLD favors restriction but liver is responsive.

**Edition 2 tiers (live):**
- **PATTERN RULE (above type):** cap any single day ~2-3 drinks; bank 3+ alcohol-free days/week.
- **Tier 1 — dry wine/sparkling:** Brut Nature Cava, **Chianti/Pinot Noir over Cabernet** (lower ABV), dry whites.
- **Tier 2 — light beer:** Michelob Ultra (best), Miller Lite.
- **Tier 3 — regular beer (occasional):** Peroni, Corona (worst carbs), Pacifico.
- **BANNED — spirits.**

**`better_direction` (drives Delta color):**
- *Higher better (green up):* HDL, eGFR, albumin, free+total testosterone, vit D, folate, B12, magnesium, zinc, DHEA-S.
- *Lower better (green down):* ApoB, total chol, LDL (ldl_calc), ALT, AST, BUN, glucose, A1c, triglycerides, homocysteine, RDW, lipase — **+ personalized for Brad: hematocrit, hemoglobin, RBC, ferritin, iron.**
- *Neutral (gray):* thyroid (TSH, T3/T4), electrolytes (Na/K/Cl/CO2/Ca), bilirubin, globulin, total protein, cortisol, estradiol, SHBG, platelets, WBC, MCV.

---

## 7. Gmail health poller (runs itself, every 4h)
- `health_poller.py` in gallery-one-inbox repo, own workflow `.github/workflows/health-poller.yml`, GitHub Actions cron.
- Reuses shared Gmail token (section 2); writes to zapp-health `health_inbox` via `ZAPP_HEALTH_SERVICE_KEY` (GH Actions secret).
- SENDER_ALLOWLIST (stelizabeth.com, mychartdonotreply@stelizabeth.com, labcorp.com, questdiagnostics.com) hard gate + health subject keywords; SENDER_BLOCKLIST (classmates.com). Editable arrays atop the script.
- Most health email = notifications, not data -> generates "download from MyChart" to-dos; lab data still arrives via Brad dropping PDFs into chat.
- Health system: **St. Elizabeth Healthcare (KY)**, Epic/MyChart. Also Labcorp + occasional others.
- **Apple Health pipe (DORMANT):** `ingest-health` Edge Function + `health_metrics` table exist for a "Health Auto Export" iOS webhook. Unused — no wearable. Ready if Brad gets a scale/watch.

---

## 8. Working rhythm
- **Daily:** log drinks + how you felt (and no-drink days — a logged zero is data).
- **RED FLAG:** upper-abdominal/back pain esp. after eating -> stop, hydrate, ER if escalates. (Dec 2025 pattern.)
- **Weekly:** say "run my briefing" -> fresh research + week's logs/labs + re-rank + archive.
- **~8 weeks:** labs -> new chart point = real verdict.
- **Next-week targets (Edition 2):** no repeat Wed binge; 3+ AF days; Chianti/Pinot Noir over Cabernet.

---

## 9. OPEN THREADS / TODO
1. **RESOLVED — drink-logging bug:** Supabase numeric-as-strings crashed the form & reset the picks list (so Save stayed disabled). Fixed with `Number()` coercion + hardened Save guard + helper text + inline error. Brad confirmed logging works on his phone.
2. **Security lockdown (PARKED at Brad's request):** real auth (magic link) + turn on RLS + rotate the leaked `sbp_8cd9...` management token (printed in many transcripts; nothing running depends on it). Brad committed to a dedicated cross-project security session "soon." Until then the deployed app + data are reachable by anyone with the URL.
3. **Catch-up logging:** last logged = May 31 chianti; June not yet entered. Insert via Supabase connector when Brad lists the days.
4. **Housekeeping:** delete leftover `verify_save_button.mjs`; add `supabase/.temp` to .gitignore; save THIS brain doc + session logs into `zapp-health/docs/` and commit (version-control them with the code).
5. **Weekly-briefing calendar reminder:** M365 connector is read-only -> can't create events directly. Options: .ics file or Graph-API event via Claude Code. In-app banner fires 2026-06-07 meanwhile.
6. **markers.personal_notes column:** add it + hover note explaining personalized colors (e.g. "red due to polycythemia, not standard range"). Nice-to-have.
7. **Cosmetic:** Claude Code commits signed `bzapp@conneticventures.com` (its git identity), not Brad's Gmail.

---

## 10. Reusable patterns / lessons
- **Per-feature commits** in Claude Code prevent losing a whole run to a dropped connection.
- **Secret hygiene:** secrets in gitignored `.env.local`, never echoed in command output.
- **Verify, don't assume:** read-only audit prompts caught a cosmetic-only login and inbox false positives.
- **Claude Code gotchas:** model changes apply to NEW sessions only; 1M-context mode can throw credit errors (use standard/Sonnet); session usage limits reset on a timer.
- **Two bugs, one cause** is common (the numeric-string issue caused both the crash AND the disabled Save button) — find the root, not the symptom.
- **The condo pipeline doc** (`GMAIL_PIPELINE_HANDOFF.md`) is the model — if Brad wants the same documented-record treatment for medical interactions (visit timeline, what each doctor committed to, follow-ups owed), that pattern ports over.
