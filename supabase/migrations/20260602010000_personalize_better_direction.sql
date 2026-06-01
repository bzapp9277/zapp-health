-- ============================================================
-- Personalize better_direction for Brad's clinical situation.
--
-- Brad has TRT-driven polycythemia (hematocrit ~56%) managed
-- with blood donation. Rising hematocrit/hemoglobin/RBC is the
-- adverse direction for him, not textbook-neutral. Ferritin and
-- iron track the same picture (donation depletes iron stores,
-- rising ferritin can signal inflammation in this context).
-- Reclassify all five from 'neutral' → 'lower'.
-- ============================================================

UPDATE markers
SET better_direction = 'lower'
WHERE code IN ('hematocrit', 'hemoglobin', 'rbc', 'ferritin', 'iron');

-- LDL note: ldl_calc already has better_direction = 'lower'. No change.
