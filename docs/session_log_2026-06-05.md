# Session Log — 2026-06-05
**Topic:** Built the Health & Wellness Calendar (planning → PDF → live Calendar tab) + Drinks-tab reorder.
**Participants:** Brad + Claude (chat strategist) + Claude Code (repo/deploy).

## What we built
- **Health & Wellness Calendar**, 70 events, window Jun 2026 → May 2027 (Hoxworth donation cycle rolls quarterly forward).
- New `src/data/wellnessCalendar.js` (single source of truth) + new **Calendar** tab in `App.jsx` with per-category color/icon/legend in `CAT_CFG`.
- Human-facing **save-the-date PDF** (`Brad_Health_Calendar_Jun2026-May2027.pdf`).
- **Drinks tab reorder:** chart top, entry middle, ranking/rules bottom (layout only, no logic change).

## Key decisions (chronological)
1. **Hoxworth quarterly anchor:** Fri 12:45 donation → Prime IV Florence → pedicure → pizza → Sat golf → easy weekend → fasting labs the following Tue (Sep/Dec/Mar) at Burgher's. Low-key alcohol-free Thursday before each donation.
2. **June labs moved to Mon 6/22** (the Tue would have been the Michigan departure day).
3. **Prime IV = 12 local/yr total** (4 bundled into Hoxworth + 8 standalone w/ Kat, +pedicure +dinner) **+ 1 FLL add-on** during the Dec boat-parade trip (13 grand total).
4. **Elite Medspa ×4** (head spa + facial + IV); **Bom Dia ×4** (couples massage + red light = the quarterly massage).
5. **Fire pit & forest bathing always co-occur** → merged into one `firepit_forest` event (10 nights, Apr–Nov, never a pizza night). This merge also resolved an earlier phantom-row count (85 → 68 before the date-night adds).
6. **Golf:** every in-town Saturday May–Sep + all four donation Saturdays (20 total). No weekly golf Oct–Apr. Avoided basketball-season Fridays for date nights at Brad's request (huge UK men's hoops fan; season runs ~Nov–early Apr).
7. **LIV Healthy Hydrate IV at work ×4:** Jun 10 (Wed, office people, daytime), Oct 22 + Feb 4 (Thu, HHour Advisor event), Jan 5 (Tue, recovery after Jan-1 poker; repeats yearly).
8. **Massage chair ×2** at the office (Wed Jun 17 + Nov 18).
9. **Date nights ×2** w/ Kat — held evenings 5–10pm, NO booking: Fri Nov 6 2026 + Fri May 7 2027 (max spread, both clear of travel and basketball).
10. **2027 screenings (pending, TBD):** skin + dental same day (skin q3yr / dental annual, start 2027); colonoscopy (q3yr, start 2027 — chart shows due ~Nov 2026, pushed by choice).
11. **Travel bands (no local booking inside):** Michigan Jun 23–28; FL Aug 15–22; FL Oct 1–9; FLL boat parade Dec 9–13; FLL spa trip Feb 13–20 (Presidents' Day Mon 2/15).
12. **Blackouts:** birthday/anniversary week 9/2–9/8 kept open; Jan 1 poker.
13. **Sober Sun+Mon before each Tuesday lab** added as planning notes; post-donation hematocrit/hgb/RBC dip flagged as expected (not a trend).

## Scheduling / assistant decision
- For now: **email the save-the-date PDF to Dawna Stoops** (dstoops@wendal.com, cc bzapp@conneticventures.com); she blocks the year on Brad's real calendar; movable later.
- Deferred: per-item "Draft to Dawna" buttons + direct calendar booking. Reason: Gmail token is `gmail.readonly` and M365 is read-only → nothing in-stack can write to the real calendar. Dawna is the write layer. Direct booking = post-security-session future (needs write scope).

## Commits (Claude Code, main)
- Add Calendar tab — events Jun 2026–May 2027.
- Calendar: merge at-home categories, add golf/LIV/massage-chair events (→ 68).
- Drinks tab: reorder sections — chart top, log middle, ranking bottom.
- Calendar: add date_night category with 2 events (→ 70).
- (this session) Add `docs/` — BRAIN doc, session log, calendar PDF.

## Still open / next time
- Eyeball pass on the live Calendar tab (chart-on-top Drinks too).
- Move calendar events to a Supabase table if/when in-app or assistant editing is wanted (Open Thread #7).
- Direct calendar booking is the future build (Open Thread #8) — pair with the parked security session (Open Thread #2).
