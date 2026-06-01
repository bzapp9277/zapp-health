-- ============================================================
-- better_direction: per-marker clinical direction signal
-- 'lower' = lower values are healthier
-- 'higher' = higher values are healthier
-- 'neutral' = in-range is good, deviation either way is bad
-- ============================================================

ALTER TABLE markers
  ADD COLUMN IF NOT EXISTS better_direction text
  CHECK (better_direction IN ('lower', 'higher', 'neutral'));

-- HIGHER is better
UPDATE markers SET better_direction = 'higher' WHERE code IN (
  'hdl',             -- higher HDL = cardioprotective
  'egfr',            -- higher eGFR = better kidney function
  'albumin',         -- low albumin = malnutrition/illness
  'free_testosterone',
  'total_testosterone',
  'vitamin_d',
  'folate',          -- deficiency causes anemia/neural issues
  'vitamin_b12',     -- deficiency causes neurological problems
  'magnesium',       -- low magnesium is common and harmful
  'zinc',            -- deficiency impairs immunity/healing
  'dhea_s'           -- low DHEA-S associated with aging/adrenal decline
);

-- LOWER is better
UPDATE markers SET better_direction = 'lower' WHERE code IN (
  -- lipids
  'apob', 'ldl_calc', 'lp_a', 'chol_hdl_ratio',
  'total_cholesterol', 'triglycerides', 'vldl_calc',
  -- liver enzymes
  'alt', 'ast', 'alk_phos', 'ggt', 'lipase',
  -- kidney waste products
  'bun', 'creatinine', 'cystatin_c',
  -- metabolic / glucose
  'glucose', 'hba1c', 'fasting_insulin',
  -- inflammation
  'homocysteine', 'hs_crp',
  -- other
  'uric_acid',       -- elevated causes gout / kidney stones
  'rdw',             -- elevated RDW = adverse outcomes
  'prolactin',       -- elevated = hyperprolactinemia
  'psa',             -- elevated = prostate disease risk
  'cac_score'        -- more calcium = more atherosclerosis
);

-- NEUTRAL (in-range good, deviation either way is bad)
UPDATE markers SET better_direction = 'neutral' WHERE code IN (
  -- hematology (TRT raises hematocrit; anemia lowers it)
  'hematocrit', 'hemoglobin', 'rbc', 'mcv', 'platelets', 'wbc',
  -- electrolytes / narrow-range
  'calcium', 'chloride', 'co2', 'potassium', 'sodium',
  -- serum proteins
  'bilirubin_total', 'globulin', 'protein_total',
  -- thyroid (too high or too low both harmful)
  'free_t3', 'free_t4', 'tsh',
  -- hormones (need to be in range; TRT context)
  'cortisol_am', 'estradiol', 'shbg',
  -- minerals with both deficiency and overload risk
  'ferritin', 'iron'
);

-- ============================================================
-- Recreate v_marker_scorecard to surface better_direction
-- ============================================================
CREATE OR REPLACE VIEW v_marker_scorecard AS
 WITH latest AS (
         SELECT DISTINCT ON (lp.user_id, lr.marker_id) lp.user_id,
            lr.marker_id,
            lr.value,
            lr.flag AS lab_flag,
            lp.collected_on,
            lp.lab_name
           FROM (lab_results lr
             JOIN lab_panels lp ON ((lp.id = lr.panel_id)))
          ORDER BY lp.user_id, lr.marker_id, lp.collected_on DESC
        ), prev AS (
         SELECT DISTINCT ON (lp.user_id, lr.marker_id) lp.user_id,
            lr.marker_id,
            lr.value AS prev_value,
            lp.collected_on AS prev_collected_on
           FROM ((lab_results lr
             JOIN lab_panels lp ON ((lp.id = lr.panel_id)))
             JOIN latest l_1 ON (((l_1.user_id = lp.user_id) AND (l_1.marker_id = lr.marker_id) AND (lp.collected_on < l_1.collected_on))))
          ORDER BY lp.user_id, lr.marker_id, lp.collected_on DESC
        ), oldest AS (
         SELECT DISTINCT ON (lp.user_id, lr.marker_id) lp.user_id,
            lr.marker_id,
            lr.value AS oldest_value,
            lp.collected_on AS oldest_collected_on
           FROM (lab_results lr
             JOIN lab_panels lp ON ((lp.id = lr.panel_id)))
          ORDER BY lp.user_id, lr.marker_id, lp.collected_on
        )
 SELECT l.user_id,
    m.id AS marker_id,
    m.code,
    m.display_name,
    m.category,
    m.body_system,
    m.plain_what,
    m.plain_why,
    m.stakes,
    m.timeline,
    m.unit,
    m.lab_ref_low,
    m.lab_ref_high,
    m.crisis_low,
    m.crisis_high,
    m.why_it_matters,
    m.display_order,
    m.better_direction,
    l.value,
    l.lab_flag AS flag,
    l.collected_on,
    l.lab_name,
    p.prev_value,
    p.prev_collected_on,
    o.oldest_value,
    o.oldest_collected_on,
        CASE
            WHEN (p.prev_value IS NULL) THEN NULL::text
            WHEN (l.value > p.prev_value) THEN 'up'::text
            WHEN (l.value < p.prev_value) THEN 'down'::text
            ELSE 'flat'::text
        END AS direction,
        CASE
            WHEN ((p.prev_value IS NULL) OR (p.prev_value = (0)::numeric)) THEN NULL::numeric
            ELSE round((((l.value - p.prev_value) / p.prev_value) * (100)::numeric), 1)
        END AS pct_change,
        CASE
            WHEN ((o.oldest_value IS NULL) OR (o.oldest_value = (0)::numeric) OR (o.oldest_collected_on = l.collected_on)) THEN NULL::numeric
            ELSE round((((l.value - o.oldest_value) / o.oldest_value) * (100)::numeric), 1)
        END AS pct_change_lifetime,
        CASE
            WHEN ((o.oldest_value IS NULL) OR (o.oldest_collected_on = l.collected_on)) THEN NULL::text
            WHEN (l.value > o.oldest_value) THEN 'up'::text
            WHEN (l.value < o.oldest_value) THEN 'down'::text
            ELSE 'flat'::text
        END AS direction_lifetime,
    t.optimal_low AS personal_optimal_low,
    t.optimal_high AS personal_optimal_high,
    t.target_low AS personal_target_low,
    t.target_high AS personal_target_high,
    t.personal_notes,
        CASE
            WHEN ((m.crisis_high IS NOT NULL) AND (l.value > m.crisis_high)) THEN 'crisis'::text
            WHEN ((m.crisis_low IS NOT NULL) AND (l.value < m.crisis_low)) THEN 'crisis'::text
            WHEN (t.id IS NOT NULL) THEN
            CASE
                WHEN ((t.target_high IS NOT NULL) AND (l.value > t.target_high)) THEN 'red'::text
                WHEN ((t.target_low IS NOT NULL) AND (l.value < t.target_low)) THEN 'red'::text
                WHEN ((t.optimal_high IS NOT NULL) AND (l.value > t.optimal_high)) THEN 'amber'::text
                WHEN ((t.optimal_low IS NOT NULL) AND (l.value < t.optimal_low)) THEN 'amber'::text
                ELSE 'green'::text
            END
            WHEN ((m.lab_ref_high IS NOT NULL) AND (l.value > m.lab_ref_high)) THEN 'red'::text
            WHEN ((m.lab_ref_low IS NOT NULL) AND (l.value < m.lab_ref_low)) THEN 'red'::text
            ELSE 'green'::text
        END AS personal_flag,
    (t.id IS NOT NULL) AS has_personal_target
   FROM ((((latest l
     JOIN markers m ON ((m.id = l.marker_id)))
     LEFT JOIN prev p ON (((p.user_id = l.user_id) AND (p.marker_id = l.marker_id))))
     LEFT JOIN oldest o ON (((o.user_id = l.user_id) AND (o.marker_id = l.marker_id))))
     LEFT JOIN user_marker_targets t ON (((t.user_id = l.user_id) AND (t.marker_id = l.marker_id))));
