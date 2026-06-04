-- ============================================================
-- BASELINE DRINK MODEL
-- Adds per-user daily drinking baseline to profiles.
-- Default: 4 servings of the first red-wine drink type.
-- Days with no explicit alcohol_log entry are assumed to be
-- this baseline everywhere they are aggregated.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS baseline_drink_type_id uuid,
  ADD COLUMN IF NOT EXISTS baseline_servings smallint DEFAULT 4;

-- Seed Brad's baseline: Cabernet Sauvignon × 4 (first red-wine type alphabetically)
UPDATE profiles
SET
  baseline_drink_type_id = (SELECT id FROM drink_types WHERE category = 'red wine' ORDER BY name LIMIT 1),
  baseline_servings = 4
WHERE id = 'eb3d4470-3f8b-436a-94db-783d9a744491'
  AND baseline_drink_type_id IS NULL;
