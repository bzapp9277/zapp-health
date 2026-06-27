/**
 * Parse FHIR R4 resources into flat rows and upsert into Supabase fhir_* tables.
 * Uses the service role key so no RLS gets in the way for these new tables.
 */

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BATCH = 100

// ── Supabase REST upsert ──────────────────────────────────────────────────────

async function supabaseUpsert(table, rows) {
  if (rows.length === 0) return 0
  let upserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(batch),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Supabase upsert to ${table} failed (${res.status}): ${text.slice(0, 400)}`)
    }
    upserted += batch.length
  }
  return upserted
}

// ── FHIR field helpers ────────────────────────────────────────────────────────

const first = (arr) => (arr && arr.length > 0 ? arr[0] : undefined)

function codingDisplay(concept) {
  if (!concept) return null
  return concept.text ?? first(concept.coding)?.display ?? null
}

function codeValue(concept) {
  return first(concept?.coding)?.code ?? null
}

// ── Per-resource parsers ──────────────────────────────────────────────────────

function parseObservation(obs, patientId) {
  const cat = codeValue(first(obs.category))
  const code = first(obs.code?.coding)
  const interp = first(first(obs.interpretation)?.coding)?.code ?? null
  const ref = first(obs.referenceRange)
  const effective = obs.effectiveDateTime ?? obs.effectivePeriod?.start ?? null

  let valueStr = null
  if (obs.valueString) valueStr = obs.valueString
  else if (obs.valueCodeableConcept) valueStr = codingDisplay(obs.valueCodeableConcept)
  else if (obs.valueBoolean != null) valueStr = String(obs.valueBoolean)

  return {
    id: obs.id,
    patient_id: patientId,
    fhir_resource: obs,
    code_system: code?.system ?? null,
    code_value: code?.code ?? null,
    code_display: code?.display ?? obs.code?.text ?? null,
    category: cat ?? null,
    effective_datetime: effective,
    value_quantity: obs.valueQuantity?.value ?? null,
    value_unit: obs.valueQuantity?.unit ?? null,
    value_string: valueStr,
    interpretation: interp,
    reference_low: ref?.low?.value ?? null,
    reference_high: ref?.high?.value ?? null,
    status: obs.status ?? null,
  }
}

function parseMedication(med, patientId) {
  const display = med.medicationCodeableConcept?.text
    ?? first(med.medicationCodeableConcept?.coding)?.display
    ?? null
  const dosage = first(med.dosageInstruction)
  return {
    id: med.id,
    patient_id: patientId,
    fhir_resource: med,
    medication_display: display,
    status: med.status ?? null,
    intent: med.intent ?? null,
    authored_on: med.authoredOn ?? null,
    requester: med.requester?.display ?? null,
    dosage_text: dosage?.text ?? first(dosage?.doseAndRate)?.doseQuantity
      ? `${first(dosage?.doseAndRate)?.doseQuantity?.value} ${first(dosage?.doseAndRate)?.doseQuantity?.unit}`
      : null,
  }
}

function parseCondition(cond, patientId) {
  const onset = cond.onsetDateTime
    ? cond.onsetDateTime.slice(0, 10)
    : cond.onsetPeriod?.start?.slice(0, 10) ?? null
  return {
    id: cond.id,
    patient_id: patientId,
    fhir_resource: cond,
    code_display: codingDisplay(cond.code),
    clinical_status: codeValue(cond.clinicalStatus),
    verification_status: codeValue(cond.verificationStatus),
    onset_date: onset,
  }
}

function parseAllergy(al, patientId) {
  return {
    id: al.id,
    patient_id: patientId,
    fhir_resource: al,
    substance_display: codingDisplay(al.code),
    clinical_status: codeValue(al.clinicalStatus),
    criticality: al.criticality ?? null,
  }
}

function parseImmunization(imm, patientId) {
  return {
    id: imm.id,
    patient_id: patientId,
    fhir_resource: imm,
    vaccine_display: codingDisplay(imm.vaccineCode),
    occurrence_datetime: imm.occurrenceDateTime ?? null,
    status: imm.status ?? null,
  }
}

function parseReport(rep, patientId) {
  const effective = rep.effectiveDateTime ?? rep.effectivePeriod?.start ?? null
  return {
    id: rep.id,
    patient_id: patientId,
    fhir_resource: rep,
    code_display: codingDisplay(rep.code),
    status: rep.status ?? null,
    effective_datetime: effective,
    issued: rep.issued ?? null,
  }
}

function parseProcedure(proc, patientId) {
  const performed = proc.performedDateTime ?? proc.performedPeriod?.start ?? null
  return {
    id: proc.id,
    patient_id: patientId,
    fhir_resource: proc,
    code_display: codingDisplay(proc.code),
    status: proc.status ?? null,
    performed_date: performed ? performed.slice(0, 10) : null,
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function upsertAll(resources, patientId) {
  const counts = {}

  const obs = (resources.Observation ?? []).map(r => parseObservation(r, patientId))
  counts['fhir_observations'] = await supabaseUpsert('fhir_observations', obs)

  const meds = (resources.MedicationRequest ?? []).map(r => parseMedication(r, patientId))
  counts['fhir_medications'] = await supabaseUpsert('fhir_medications', meds)

  const conds = (resources.Condition ?? []).map(r => parseCondition(r, patientId))
  counts['fhir_conditions'] = await supabaseUpsert('fhir_conditions', conds)

  const allergies = (resources.AllergyIntolerance ?? []).map(r => parseAllergy(r, patientId))
  counts['fhir_allergies'] = await supabaseUpsert('fhir_allergies', allergies)

  const imms = (resources.Immunization ?? []).map(r => parseImmunization(r, patientId))
  counts['fhir_immunizations'] = await supabaseUpsert('fhir_immunizations', imms)

  const reports = (resources.DiagnosticReport ?? []).map(r => parseReport(r, patientId))
  counts['fhir_reports'] = await supabaseUpsert('fhir_reports', reports)

  const procs = (resources.Procedure ?? []).map(r => parseProcedure(r, patientId))
  counts['fhir_procedures'] = await supabaseUpsert('fhir_procedures', procs)

  return counts
}
