# Session Log — 2026-06-07
**Topic:** New dentist (Bell Dental Group) added; dental cadence set to annual from 2027; dental paired same-day with skin checks; durable scheduling moved into Supabase.
**Participants:** Brad + Claude (chat) + Claude Code (repo/deploy).

## What changed
- New dentist: Bell Dental Group, 2767 Erie Ave, Cincinnati OH 45208 (Hyde Park), 513-802-9440. (Zip 45208 inferred from Hyde Park/Erie Ave.)
- Dental cadence: Brad's call — every 3 years is not enough -> annual (1x/year) starting 2027.
- Pairing rule: every skin check (q3yr) is booked the same day as a dental cleaning.
- Colonoscopy unchanged — q3yr starting 2027.

## Supabase (done by Claude chat via connector)
- New table `providers` — Bell Dental Group row.
- New table `screening_schedule` — dental_cleaning (annual, 2027, pair_with skin_check, -> Bell Dental), skin_check (q3yr, 2027), colonoscopy (q3yr, 2027).
- Both tables RLS-on with anon_full_access + auth_full_access (matches existing posture).
- This is the durable cross-chat memory for scheduling: select * from screening_schedule join providers recovers the plan.

## Code / docs (this handoff)
- wellnessCalendar.js: 2027 skin+dental screening updated — dental vendor = Bell Dental Group; notes reflect annual cadence + same-day-as-skin rule. No date invented.
- BRAIN doc updated (tables, screenings line, ledger, Open Thread #7).
- This session log added.

## Open threads touched
- Scheduling now partially lives in Supabase (providers + screening_schedule), nudging Open Thread #7 (calendar -> DB). Display calendar still in code.
