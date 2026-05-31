-- ============================================================
-- APPENDIX A: drink_types + alcohol_log (create if not exists)
-- ============================================================
create table if not exists drink_types (
  id                  uuid primary key default gen_random_uuid(),
  name                text,
  category            text,
  default_serving_oz  numeric,
  abv                 numeric,
  sugar_g             numeric,
  carbs_g             numeric,
  calories            numeric
);

insert into drink_types (name, category, default_serving_oz, abv, sugar_g, carbs_g, calories)
select v.*
from (values
  ('Bourbon (100 proof)', 'spirit',       1.5::numeric,  50.0::numeric, 0::numeric,    0::numeric,    124::numeric),
  ('Vodka soda',          'spirit',       1.5,  40.0, 0,    0,    97),
  ('Cabernet Sauvignon',  'red wine',     5,    13.5, 0.9,  3.8,  122),
  ('Sauvignon Blanc',     'white wine',   5,    12.5, 1.0,  3.0,  119),
  ('Pinot Gris',          'white wine',   5,    12.0, 1.0,  3.0,  120),
  ('Brut Champagne',      'sparkling',    4,    12.0, 1.0,  1.5,  95),
  ('Peroni',              'beer',         12,   5.1,  0,    8.7,  147),
  ('Miller Lite',         'light beer',   12,   4.2,  0,    3.2,  96),
  ('Michelob Ultra',      'light beer',   12,   4.2,  0,    2.6,  95),
  ('Bud Light',           'light beer',   12,   4.2,  0,    6.6,  110),
  ('Corona',              'beer',         12,   4.6,  0,    14.0, 148),
  ('Pacifico',            'beer',         12,   4.5,  0,    13.0, 146),
  ('Garage Beer',         'light beer',   12,   4.5,  0,    5.0,  110),
  ('CBB',                 'beer',         12,   5.0,  0,    10.0, 145)
) as v(name, category, default_serving_oz, abv, sugar_g, carbs_g, calories)
where not exists (select 1 from drink_types limit 1);

create table if not exists alcohol_log (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid default 'eb3d4470-3f8b-436a-94db-783d9a744491',
  log_date              date not null,
  drinks                jsonb,
  total_std_drinks      numeric,
  total_ethanol_g       numeric,
  total_sugar_g         numeric,
  total_carbs_g         numeric,
  total_calories        numeric,
  context               text,
  water_glasses         int,
  abdominal_pain_0_10   int,
  back_pain             bool,
  nausea                bool,
  pain_after_fatty_food bool,
  sugar_crash           bool,
  sleep_quality_1_5     int,
  energy_next_am_1_5    int,
  journal               text,
  created_at            timestamptz default now()
);

-- ============================================================
-- NEW TABLES: drink_rankings + briefings
-- ============================================================
create table if not exists drink_rankings (
  id              uuid primary key default gen_random_uuid(),
  ranked_on       date not null,
  edition         int,
  tiers           jsonb not null,
  rationale       text,
  inputs_summary  text,
  created_at      timestamptz default now()
);

create table if not exists briefings (
  id              uuid primary key default gen_random_uuid(),
  briefing_date   date not null,
  edition         int,
  summary         text,
  reading_list    jsonb,
  ranking_id      uuid references drink_rankings(id),
  created_at      timestamptz default now()
);

-- ============================================================
-- SEED: Edition 1 drink_rankings + briefings
-- ============================================================
do $seed$
declare
  v_ranking_id uuid;
begin
  if not exists (select 1 from drink_rankings where edition = 1) then

    insert into drink_rankings (ranked_on, edition, tiers, rationale, inputs_summary)
    values (
      '2026-05-31',
      1,
      $j$[
        {
          "tier": 1,
          "label": "Default — dry wine & dry sparkling (no pancreatitis signal, low sugar)",
          "picks": [
            {"name": "Brut Nature Cava",         "brand": "Segura Viudas",   "variety": "Brut Nature sparkling (~$11)",    "why": "Driest tier = near-zero sugar; value; stocked at Kroger/Primo"},
            {"name": "Estate Brut",              "brand": "Roederer Estate", "variety": "California sparkling (~$25)",     "why": "Dry, higher quality step-up"},
            {"name": "Brut Nature Zero Dosage",  "brand": "Drappier",        "variety": "French Champagne (if available)", "why": "Real Champagne, zero added sugar"},
            {"name": "Sauvignon Blanc",          "brand": "Kim Crawford",    "variety": "Marlborough NZ white (~$13)",     "why": "Bone-dry, grab-anywhere"},
            {"name": "Sancerre",                 "brand": "Pascal Jolivet",  "variety": "Loire Sauvignon Blanc (~$28)",    "why": "Leaner, slightly lower ABV, classier"},
            {"name": "Chianti",                  "brand": "Ruffino",         "variety": "Tuscan Sangiovese red (~$12)",    "why": "~13% ABV vs Cab's 14.5-15% = less ethanol/glass"},
            {"name": "Chianti Classico Peppoli", "brand": "Antinori",        "variety": "Tuscan red (~$22)",               "why": "Quality step-up, still dry; pick Chianti/Pinot Noir over Cabernet"}
          ]
        },
        {
          "tier": 2,
          "label": "Beer lane — lowest-carb light beer only",
          "picks": [
            {"name": "Michelob Ultra", "brand": "Michelob", "variety": "light beer (2.6g carb)", "why": "#1 beer for you: lowest carb/ABV/cal"},
            {"name": "Miller Lite",    "brand": "Miller",   "variety": "light beer (3.2g carb)", "why": "Near-tie second"},
            {"name": "Bud Light",      "brand": "Bud",      "variety": "light beer (6.6g carb)", "why": "Step down — more carbs. Watch volume creep: beer in quantity flips to chronic-pancreatitis risk"}
          ]
        },
        {
          "tier": 3,
          "label": "Occasional only — fuller/regular beer (more carbs = more triglyceride push)",
          "picks": [
            {"name": "Peroni",   "brand": "Peroni",   "variety": "lager (8.7g carb)",  "why": "Mid-pack"},
            {"name": "CBB",      "brand": "CBB",      "variety": "beer (~10g carb)",   "why": "Higher carb"},
            {"name": "Pacifico", "brand": "Pacifico", "variety": "lager (13g carb)",   "why": "Carb-heavy"},
            {"name": "Corona",   "brand": "Corona",   "variety": "lager (14g carb)",   "why": "Worst on carbs of your faves despite the light feel"}
          ]
        },
        {
          "tier": 99,
          "label": "OFF THE TABLE — spirits",
          "picks": [
            {"name": "Bourbon / Vodka / Vodka sodas", "brand": "any", "variety": "spirits", "why": "Strongest per-occasion pancreatitis evidence is specifically against spirits; zero-carb does not save it. Includes the old flight vodka sodas."}
          ]
        }
      ]$j$::jsonb,
      'Wine is the only category with no pancreatitis association in large cohorts; dry = minimal sugar, which protects triglycerides (149, at ceiling) — and high triglycerides is itself a pancreatitis trigger. Lower ABV (Chianti over Cabernet; light beer) means less ethanol load on the fatty liver. Spirits carry the strongest per-occasion pancreatitis signal. Pattern matters as much as type: aim for 3+ alcohol-free days/week and never binge.',
      'Baseline Dec 2025 ~630 g ethanol/week (~45 std drinks). Labs: ALT ~47, Triglycerides 149, A1c 6.0, lipase target <50. Meds: atorvastatin + NAC (liver load), Ozempic (slowed gastric emptying + pancreas caution). Research: Swedish BJS spirits/pancreatitis cohort; Danish 2023 drinking-patterns study.'
    )
    returning id into v_ranking_id;

    insert into briefings (briefing_date, edition, summary, reading_list, ranking_id)
    values (
      '2026-05-31',
      1,
      'Edition 1: research shows drink TYPE matters for the pancreas, not just amount — wine carries no pancreatitis signal, spirits carry the strongest. First ranking set; baseline ~630 g ethanol/week from Dec 2025. Goal this cycle: log honestly through next labs, 3+ alcohol-free days/week, no bingeing, water alongside every drink.',
      $j$[
        {"kind": "academic", "title": "Drinking patterns and risk of pancreatitis",                   "source": "Alcohol and Alcoholism (Oxford), 2023",   "url": null, "note": "Daily vs binge drinking each independently raise risk — directly your old pattern."},
        {"kind": "academic", "title": "Spirits consumption and acute pancreatitis (Swedish cohort)",  "source": "British Journal of Surgery / Karolinska",  "url": null, "note": "Risk rose with spirits per occasion; no association with wine or beer."},
        {"kind": "popular",  "title": "Alcohol and triglycerides: how to bring them down",           "source": "practical explainer",                       "url": null, "note": "Maps to your 149 sitting right at the ceiling."}
      ]$j$::jsonb,
      v_ranking_id
    );

  end if;
end $seed$;
