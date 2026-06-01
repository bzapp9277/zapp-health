# Session Log — 2026-06-01

## What this project is
zapp-health: Brad's personal single-user health-tracking app. Vite/React frontend deployed on **Vercel** (https://zapp-health.vercel.app), Supabase backend (project `kizrdaifculzighfngqz`). RLS intentionally disabled (single user). Live source of truth is `src/App.jsx`. See `zapp_health_BRAIN.md` for the full living map.

## The arc of today's session
Started from "I'm going to drink, help me track it smartly" and built a full alcohol harm-reduction layer + several system upgrades.

1. **Drink comparison → strategy.** Compared champagne/white/red/beer against Brad's labs. Key insight: for the pancreas, *type* matters (wine = no pancreatitis signal, spirits = most); for liver/trig, *amount + pattern* matter most.
2. **Drinks system built** (Claude Code): `drink_types`, `alcohol_log`, `drink_rankings`, `briefings` tables; Drinks tab with Current Ranking card + log form; Briefings tab; "briefing due" banner (fires 7 days after last, next 2026-06-07).
3. **Specific bottle recommendations** vetted for Tier 1 (Segura Viudas Brut Nature, Roederer Estate Brut, Kim Crawford / Sancerre, Ruffino / Antinori Pèppoli Chianti).
4. **Correlation chart** added (recharts): weekly ethanol bars vs ALT/Lipase/Triglyceride lines, with 630g baseline + 196g heavy-drinking reference lines. Dec 2025 lipase spike (~129) clearly visible.
5. **Verified the app** is the real one with real data (read-only audit) — all 9 tabs, 295 lab results, etc.
6. **Backfilled week 1** (May 25–31): ~344g ethanol, all wine, one Wed binge (~11 drinks → 2 "dead" days), 0 AF days, 0 pain.
7. **Edition 2 briefing** run for real (fresh MASLD/abstinence research) + re-rank: added a PATTERN rule above the type tiers, promoted Chianti/Pinot Noir over Cabernet. Written directly to DB via Supabase connector.
8. **Apple Health pipe** built (ingest-health Edge Function + health_metrics) then shelved — Brad has no wearable, vitals come from doctor reports.
9. **Gmail health poller** built (reused the Gallery One condo project's production Gmail token — single source of truth in `kdhxcesowtjesdwerdut`.`gmail_oauth_token`). Isolated `health_poller.py` + own GitHub Actions workflow, every 4h, writes to zapp-health `health_inbox`. Condo pipeline left untouched. Tightened keywords + sender allow/blocklist after Classmates.com false positives.
10. **Deployed to Vercel** with an email-only client-side gate (Brad's explicit choice — NOT real auth; RLS still off; deferred security). Fixed a blank-page React hook-order crash + added an ErrorBoundary.
11. **Biomarkers page: lifetime deltas.** Switched the Δ column from since-last to lifetime (`pct_change_lifetime`), then added a `markers.better_direction` field and colored deltas by clinical good/bad. **Personalized** hematocrit/hemoglobin/RBC/ferritin/iron to "lower is better" for Brad's polycythemia (hematocrit now correctly RED at 56.4%). HDL down now correctly RED; testosterone up correctly green; thyroid/electrolytes neutral gray.
12. **Drink-logging bug** found + fixed: Supabase returned numeric columns as JSON *strings*, so `0 + "0.9"` → `"00.9"` → `.toFixed()` threw → crashed the form → wiped the picks list → Save button stayed (correctly) disabled. Fix: `Number()` coercion everywhere + hardened Save guard + helper text + inline error. Verified end-to-end; **Brad confirmed he can add a drink on his phone.**
13. **Wrote the brain doc** (`zapp_health_BRAIN.md`) + this session log.

## Hiccups worth remembering
- Same transcript got re-pasted a couple times; verify the right run's output.
- Claude Code hit a 1M-context credit error, then a session usage limit (reset 6:30pm ET). Model change only applies to NEW sessions — had to start fresh.
- Management token `sbp_8cd9…` leaked across several transcripts (multiple times). Rotation deferred by Brad.

## Open / next session
- [ ] **Catch-up logging:** last logged day = May 31 chianti. June 1→today not yet logged (incl. AF days). Brad to rattle off days; insert via connector.
- [ ] **Security lockdown (PARKED):** real auth + RLS + rotate the sbp_ PAT. Brad committed to a dedicated cross-project security session "soon."
- [ ] **Housekeeping:** delete leftover `verify_save_button.mjs`; add `supabase/.temp` to .gitignore. Save `zapp_health_BRAIN.md` into `zapp-health/docs/` and commit so it's version-controlled.
- [ ] **Calendar reminder** for weekly briefing (M365 connector is read-only; options: .ics or Graph API). In-app banner fires 2026-06-07.
- [ ] **markers.personal_notes** column (hover explaining personalized colors) — nice-to-have.
- Ongoing: keep logging; ~8-week labs = the real verdict. Next-week targets: no repeat Wed binge, 3+ AF days.
