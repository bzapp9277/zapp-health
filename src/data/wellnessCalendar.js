// Single source of truth for Brad's wellness calendar events.
// A future feature will read this to generate Gmail drafts to his assistant.
// Fields: id, date (ISO YYYY-MM-DD), endDate (optional, multi-day),
//   category, title, location, withKat, payer, isPTO, isPizzaNight,
//   needsBooking, notes

export const WELLNESS_EVENTS = [

  // ── JUNE 2026 ────────────────────────────────────────────────────────

  // At-home: forest bathing + fire pit (same night, 06-12)
  {
    id: 'fb-2026-06-12',
    date: '2026-06-12',
    category: 'at_home',
    title: 'Forest bathing + fire pit',
    location: 'Home',
    withKat: true,
    payer: null,
    isPTO: true,
    isPizzaNight: false,
    needsBooking: false,
    notes: null,
  },

  // Hoxworth donation cycle #1
  {
    id: 'hox-2026-06-19',
    date: '2026-06-19',
    category: 'hoxworth',
    title: 'Hoxworth blood donation 12:45 + Prime IV Florence + pedicure + pizza to-go, chill night',
    location: 'Hoxworth NKY',
    withKat: true,
    payer: 'prescription',
    isPTO: true,
    isPizzaNight: true,
    needsBooking: true,
    notes: 'Low-key no-alcohol/early Thursday beforehand. Hoxworth NKY.',
  },
  {
    id: 'golf-2026-06-20',
    date: '2026-06-20',
    category: 'golf',
    title: 'Golf (AM)',
    location: null,
    withKat: false,
    payer: 'self',
    isPTO: false,
    isPizzaNight: false,
    needsBooking: false,
    notes: null,
  },
  {
    id: 'labs-2026-06-22',
    date: '2026-06-22',
    category: 'labs',
    title: 'Fasting labs ~8:15am, Dr. Burgher (St. E)',
    location: 'St. Elizabeth',
    withKat: false,
    payer: 'prescription',
    isPTO: false,
    isPizzaNight: false,
    needsBooking: true,
    notes: 'Fasting. Easy Sun beforehand. Tag results as post-donation (hematocrit/hgb/RBC will dip — expected, not a trend).',
  },

  // Travel: Michigan
  {
    id: 'travel-michigan-2026',
    date: '2026-06-23',
    endDate: '2026-06-28',
    category: 'travel',
    title: 'Michigan (travel)',
    location: 'Michigan',
    withKat: true,
    payer: null,
    isPTO: true,
    isPizzaNight: false,
    needsBooking: false,
    notes: null,
  },

  // ── JULY 2026 ────────────────────────────────────────────────────────

  // Local Prime IV + Kat #1
  {
    id: 'primeiv-2026-07-10',
    date: '2026-07-10',
    category: 'prime_iv',
    title: 'Prime IV + pedicure + dinner with Kat',
    location: 'Florence, KY',
    withKat: true,
    payer: 'self',
    isPTO: true,
    isPizzaNight: false,
    needsBooking: true,
    notes: null,
  },

  // At-home: forest bathing
  {
    id: 'fb-2026-07-17',
    date: '2026-07-17',
    category: 'at_home',
    title: 'Forest bathing',
    location: 'Home',
    withKat: true,
    payer: null,
    isPTO: true,
    isPizzaNight: false,
    needsBooking: false,
    notes: null,
  },

  // Elite MedSpa #1
  {
    id: 'elite-2026-07-24',
    date: '2026-07-24',
    category: 'elite_medspa',
    title: 'Elite MedSpa — head spa + men\'s facial + IV',
    location: null,
    withKat: false,
    payer: 'self',
    isPTO: true,
    isPizzaNight: false,
    needsBooking: true,
    notes: null,
  },

  // At-home: fire pit
  {
    id: 'fp-2026-07-31',
    date: '2026-07-31',
    category: 'at_home',
    title: 'Fire pit night',
    location: 'Home',
    withKat: true,
    payer: null,
    isPTO: true,
    isPizzaNight: false,
    needsBooking: false,
    notes: null,
  },

  // ── AUGUST 2026 ──────────────────────────────────────────────────────

  // At-home: forest bathing
  {
    id: 'fb-2026-08-07',
    date: '2026-08-07',
    category: 'at_home',
    title: 'Forest bathing',
    location: 'Home',
    withKat: true,
    payer: null,
    isPTO: true,
    isPizzaNight: false,
    needsBooking: false,
    notes: null,
  },

  // Local Prime IV + Kat #2
  {
    id: 'primeiv-2026-08-14',
    date: '2026-08-14',
    category: 'prime_iv',
    title: 'Prime IV + pedicure + dinner with Kat',
    location: 'Florence, KY',
    withKat: true,
    payer: 'self',
    isPTO: true,
    isPizzaNight: false,
    needsBooking: true,
    notes: null,
  },

  // Travel: Florida
  {
    id: 'travel-florida-aug-2026',
    date: '2026-08-15',
    endDate: '2026-08-22',
    category: 'travel',
    title: 'Florida (travel)',
    location: 'Florida',
    withKat: true,
    payer: null,
    isPTO: true,
    isPizzaNight: false,
    needsBooking: false,
    notes: null,
  },

  // Bom Dia couples massage #1
  {
    id: 'bomdia-2026-08-28',
    date: '2026-08-28',
    category: 'bom_dia',
    title: 'Bom Dia — couples massage + red light',
    location: null,
    withKat: true,
    payer: 'shared',
    isPTO: true,
    isPizzaNight: false,
    needsBooking: true,
    notes: null,
  },

  // ── SEPTEMBER 2026 ───────────────────────────────────────────────────

  // Birthday/anniversary week blackout
  {
    id: 'blackout-bday-2026',
    date: '2026-09-04',
    category: 'blackout',
    title: 'Birthday/anniversary week (9/2–9/8) — keep open',
    location: null,
    withKat: true,
    payer: null,
    isPTO: true,
    isPizzaNight: false,
    needsBooking: false,
    notes: 'Do not auto-book anything this week.',
  },

  // At-home: fire pit
  {
    id: 'fp-2026-09-11',
    date: '2026-09-11',
    category: 'at_home',
    title: 'Fire pit night',
    location: 'Home',
    withKat: true,
    payer: null,
    isPTO: true,
    isPizzaNight: false,
    needsBooking: false,
    notes: null,
  },

  // Hoxworth donation cycle #2
  {
    id: 'hox-2026-09-18',
    date: '2026-09-18',
    category: 'hoxworth',
    title: 'Hoxworth blood donation 12:45 + Prime IV Florence + pedicure + pizza to-go, chill night',
    location: 'Hoxworth NKY',
    withKat: true,
    payer: 'prescription',
    isPTO: true,
    isPizzaNight: true,
    needsBooking: true,
    notes: 'Low-key no-alcohol/early Thursday beforehand. Hoxworth NKY.',
  },
  {
    id: 'golf-2026-09-19',
    date: '2026-09-19',
    category: 'golf',
    title: 'Golf (AM)',
    location: null,
    withKat: false,
    payer: 'self',
    isPTO: false,
    isPizzaNight: false,
    needsBooking: false,
    notes: null,
  },
  {
    id: 'labs-2026-09-22',
    date: '2026-09-22',
    category: 'labs',
    title: 'Fasting labs ~8:15am, Dr. Burgher (St. E)',
    location: 'St. Elizabeth',
    withKat: false,
    payer: 'prescription',
    isPTO: false,
    isPizzaNight: false,
    needsBooking: true,
    notes: 'Fasting. Easy Sun beforehand. Tag results as post-donation (hematocrit/hgb/RBC will dip — expected, not a trend).',
  },

  // At-home: forest bathing
  {
    id: 'fb-2026-09-25',
    date: '2026-09-25',
    category: 'at_home',
    title: 'Forest bathing',
    location: 'Home',
    withKat: true,
    payer: null,
    isPTO: true,
    isPizzaNight: false,
    needsBooking: false,
    notes: null,
  },

  // ── OCTOBER 2026 ─────────────────────────────────────────────────────

  // Travel: Florida
  {
    id: 'travel-florida-oct-2026',
    date: '2026-10-01',
    endDate: '2026-10-09',
    category: 'travel',
    title: 'Florida (travel)',
    location: 'Florida',
    withKat: true,
    payer: null,
    isPTO: true,
    isPizzaNight: false,
    needsBooking: false,
    notes: null,
  },

  // Local Prime IV + Kat #3
  {
    id: 'primeiv-2026-10-16',
    date: '2026-10-16',
    category: 'prime_iv',
    title: 'Prime IV + pedicure + dinner with Kat',
    location: 'Florence, KY',
    withKat: true,
    payer: 'self',
    isPTO: true,
    isPizzaNight: false,
    needsBooking: true,
    notes: null,
  },

  // At-home: forest bathing + fire pit (same night, 10-23)
  {
    id: 'fb-fp-2026-10-23',
    date: '2026-10-23',
    category: 'at_home',
    title: 'Forest bathing + fire pit',
    location: 'Home',
    withKat: true,
    payer: null,
    isPTO: true,
    isPizzaNight: false,
    needsBooking: false,
    notes: null,
  },

  // Elite MedSpa #2
  {
    id: 'elite-2026-10-30',
    date: '2026-10-30',
    category: 'elite_medspa',
    title: 'Elite MedSpa — head spa + men\'s facial + IV',
    location: null,
    withKat: false,
    payer: 'self',
    isPTO: true,
    isPizzaNight: false,
    needsBooking: true,
    notes: null,
  },

  // ── NOVEMBER 2026 ────────────────────────────────────────────────────

  // Local Prime IV + Kat #4
  {
    id: 'primeiv-2026-11-13',
    date: '2026-11-13',
    category: 'prime_iv',
    title: 'Prime IV + pedicure + dinner with Kat',
    location: 'Florence, KY',
    withKat: true,
    payer: 'self',
    isPTO: true,
    isPizzaNight: false,
    needsBooking: true,
    notes: null,
  },

  // At-home: forest bathing
  {
    id: 'fb-2026-11-20',
    date: '2026-11-20',
    category: 'at_home',
    title: 'Forest bathing',
    location: 'Home',
    withKat: true,
    payer: null,
    isPTO: true,
    isPizzaNight: false,
    needsBooking: false,
    notes: null,
  },

  // Bom Dia couples massage #2
  {
    id: 'bomdia-2026-11-27',
    date: '2026-11-27',
    category: 'bom_dia',
    title: 'Bom Dia — couples massage + red light',
    location: null,
    withKat: true,
    payer: 'shared',
    isPTO: true,
    isPizzaNight: false,
    needsBooking: true,
    notes: null,
  },

  // ── DECEMBER 2026 ────────────────────────────────────────────────────

  // Travel: Fort Lauderdale boat parade
  {
    id: 'travel-fll-dec-2026',
    date: '2026-12-09',
    endDate: '2026-12-13',
    category: 'travel',
    title: 'Fort Lauderdale — boat parade (travel)',
    location: 'Fort Lauderdale, FL',
    withKat: true,
    payer: null,
    isPTO: true,
    isPizzaNight: false,
    needsBooking: false,
    notes: null,
  },

  // Prime IV travel add-on (during FLL trip)
  {
    id: 'primeiv-travel-2026-12-11',
    date: '2026-12-11',
    category: 'prime_iv_travel',
    title: 'Prime IV — Fort Lauderdale (during boat-parade trip)',
    location: 'Fort Lauderdale, FL',
    withKat: false,
    payer: 'self',
    isPTO: true,
    isPizzaNight: false,
    needsBooking: true,
    notes: null,
  },

  // Hoxworth donation cycle #3
  {
    id: 'hox-2026-12-18',
    date: '2026-12-18',
    category: 'hoxworth',
    title: 'Hoxworth blood donation 12:45 + Prime IV Florence + pedicure + pizza to-go, chill night',
    location: 'Hoxworth NKY',
    withKat: true,
    payer: 'prescription',
    isPTO: true,
    isPizzaNight: true,
    needsBooking: true,
    notes: 'Low-key no-alcohol/early Thursday beforehand. Hoxworth NKY.',
  },
  {
    id: 'golf-2026-12-19',
    date: '2026-12-19',
    category: 'golf',
    title: 'Golf (AM)',
    location: null,
    withKat: false,
    payer: 'self',
    isPTO: false,
    isPizzaNight: false,
    needsBooking: false,
    notes: 'Weather permitting — indoor sim or skip if frozen.',
  },
  {
    id: 'labs-2026-12-22',
    date: '2026-12-22',
    category: 'labs',
    title: 'Fasting labs ~8:15am, Dr. Burgher (St. E)',
    location: 'St. Elizabeth',
    withKat: false,
    payer: 'prescription',
    isPTO: false,
    isPizzaNight: false,
    needsBooking: true,
    notes: 'Fasting. Tight vs Christmas. Tag results as post-donation (hematocrit/hgb/RBC will dip — expected, not a trend).',
  },

  // ── JANUARY 2027 ─────────────────────────────────────────────────────

  // Blackout: New Year's poker tournament
  {
    id: 'blackout-poker-2027',
    date: '2027-01-01',
    category: 'blackout',
    title: 'Poker tournament — heavy day, plan recovery around it',
    location: null,
    withKat: false,
    payer: null,
    isPTO: false,
    isPizzaNight: false,
    needsBooking: false,
    notes: 'Heavy day. Recovery IV booked 01-05.',
  },

  // Liv Healthy Hydrate — recovery after Jan 1 poker
  {
    id: 'liv-2027-01-05',
    date: '2027-01-05',
    category: 'liv_healthy',
    title: 'Liv Healthy Hydrate — IV at work, recovery',
    location: 'At work',
    withKat: false,
    payer: 'self',
    isPTO: false,
    isPizzaNight: false,
    needsBooking: true,
    notes: 'Annual. Recovery after Jan 1 poker tournament.',
  },

  // Local Prime IV + Kat #5
  {
    id: 'primeiv-2027-01-15',
    date: '2027-01-15',
    category: 'prime_iv',
    title: 'Prime IV + pedicure + dinner with Kat',
    location: 'Florence, KY',
    withKat: true,
    payer: 'self',
    isPTO: true,
    isPizzaNight: false,
    needsBooking: true,
    notes: null,
  },

  // Elite MedSpa #3
  {
    id: 'elite-2027-01-29',
    date: '2027-01-29',
    category: 'elite_medspa',
    title: 'Elite MedSpa — head spa + men\'s facial + IV',
    location: null,
    withKat: false,
    payer: 'self',
    isPTO: true,
    isPizzaNight: false,
    needsBooking: true,
    notes: null,
  },

  // ── FEBRUARY 2027 ────────────────────────────────────────────────────

  // Local Prime IV + Kat #6
  {
    id: 'primeiv-2027-02-12',
    date: '2027-02-12',
    category: 'prime_iv',
    title: 'Prime IV + pedicure + dinner with Kat',
    location: 'Florence, KY',
    withKat: true,
    payer: 'self',
    isPTO: true,
    isPizzaNight: false,
    needsBooking: true,
    notes: null,
  },

  // Travel: Fort Lauderdale spa trip
  {
    id: 'travel-fll-feb-2027',
    date: '2027-02-13',
    endDate: '2027-02-20',
    category: 'travel',
    title: 'Fort Lauderdale spa trip — custom spa, Presidents\' Day Mon 2/15',
    location: 'Fort Lauderdale, FL',
    withKat: true,
    payer: null,
    isPTO: true,
    isPizzaNight: false,
    needsBooking: false,
    notes: 'Presidents\' Day 2/15 is a holiday.',
  },

  // Bom Dia couples massage #3
  {
    id: 'bomdia-2027-02-26',
    date: '2027-02-26',
    category: 'bom_dia',
    title: 'Bom Dia — couples massage + red light',
    location: null,
    withKat: true,
    payer: 'shared',
    isPTO: true,
    isPizzaNight: false,
    needsBooking: true,
    notes: null,
  },

  // ── MARCH 2027 ───────────────────────────────────────────────────────

  // Hoxworth donation cycle #4
  {
    id: 'hox-2027-03-19',
    date: '2027-03-19',
    category: 'hoxworth',
    title: 'Hoxworth blood donation 12:45 + Prime IV Florence + pedicure + pizza to-go, chill night',
    location: 'Hoxworth NKY',
    withKat: true,
    payer: 'prescription',
    isPTO: true,
    isPizzaNight: true,
    needsBooking: true,
    notes: 'Low-key no-alcohol/early Thursday beforehand. Hoxworth NKY.',
  },
  {
    id: 'golf-2027-03-20',
    date: '2027-03-20',
    category: 'golf',
    title: 'Golf (AM)',
    location: null,
    withKat: false,
    payer: 'self',
    isPTO: false,
    isPizzaNight: false,
    needsBooking: false,
    notes: 'Weather permitting.',
  },
  {
    id: 'labs-2027-03-23',
    date: '2027-03-23',
    category: 'labs',
    title: 'Fasting labs ~8:15am, Dr. Burgher (St. E)',
    location: 'St. Elizabeth',
    withKat: false,
    payer: 'prescription',
    isPTO: false,
    isPizzaNight: false,
    needsBooking: true,
    notes: 'Fasting. Easy Sun beforehand. Tag results as post-donation (hematocrit/hgb/RBC will dip — expected, not a trend).',
  },

  // ── APRIL 2027 ───────────────────────────────────────────────────────

  // Local Prime IV + Kat #7
  {
    id: 'primeiv-2027-04-09',
    date: '2027-04-09',
    category: 'prime_iv',
    title: 'Prime IV + pedicure + dinner with Kat',
    location: 'Florence, KY',
    withKat: true,
    payer: 'self',
    isPTO: true,
    isPizzaNight: false,
    needsBooking: true,
    notes: null,
  },

  // At-home: forest bathing
  {
    id: 'fb-2027-04-16',
    date: '2027-04-16',
    category: 'at_home',
    title: 'Forest bathing',
    location: 'Home',
    withKat: true,
    payer: null,
    isPTO: true,
    isPizzaNight: false,
    needsBooking: false,
    notes: null,
  },

  // Elite MedSpa #4
  {
    id: 'elite-2027-04-23',
    date: '2027-04-23',
    category: 'elite_medspa',
    title: 'Elite MedSpa — head spa + men\'s facial + IV',
    location: null,
    withKat: false,
    payer: 'self',
    isPTO: true,
    isPizzaNight: false,
    needsBooking: true,
    notes: null,
  },

  // ── MAY 2027 ─────────────────────────────────────────────────────────

  // Local Prime IV + Kat #8
  {
    id: 'primeiv-2027-05-14',
    date: '2027-05-14',
    category: 'prime_iv',
    title: 'Prime IV + pedicure + dinner with Kat',
    location: 'Florence, KY',
    withKat: true,
    payer: 'self',
    isPTO: true,
    isPizzaNight: false,
    needsBooking: true,
    notes: null,
  },

  // At-home: forest bathing + fire pit (same night, 05-21)
  {
    id: 'fb-fp-2027-05-21',
    date: '2027-05-21',
    category: 'at_home',
    title: 'Forest bathing + fire pit',
    location: 'Home',
    withKat: true,
    payer: null,
    isPTO: true,
    isPizzaNight: false,
    needsBooking: false,
    notes: null,
  },

  // Bom Dia couples massage #4
  {
    id: 'bomdia-2027-05-28',
    date: '2027-05-28',
    category: 'bom_dia',
    title: 'Bom Dia — couples massage + red light',
    location: null,
    withKat: true,
    payer: 'shared',
    isPTO: true,
    isPizzaNight: false,
    needsBooking: true,
    notes: null,
  },
]

// 2027 screenings — no fixed date yet; to be scheduled
export const PENDING_SCREENINGS_2027 = [
  {
    id: 'screen-skin-dental-2027',
    category: 'screening',
    title: 'Skin check + dental (same day)',
    notes: 'Skin every 3 years starting 2027; dental annually starting 2027. Schedule on the same day.',
    needsBooking: true,
    isPTO: true,
  },
  {
    id: 'screen-colonoscopy-2027',
    category: 'screening',
    title: 'Colonoscopy',
    notes: 'Every 3 years starting 2027. St. E chart shows due ~Nov 2026; Brad chose to push to 2027.',
    needsBooking: true,
    isPTO: true,
  },
]
