#!/usr/bin/env node
/**
 * Zapp Health · FHIR Pull
 * Pulls Epic records via SMART on FHIR → Supabase.
 *
 * Production (default):
 *   node tools/fhir-pull/index.js
 *   Uses St. Elizabeth Healthcare (sehproxy.stelizabeth.com), client from FHIR_CLIENT_ID env.
 *
 * Sandbox (end-to-end test against Epic's public sandbox):
 *   FHIR_ENV=sandbox node tools/fhir-pull/index.js
 *   Uses fhir.epic.com, non-production client ID, tags rows owner='SANDBOX_TEST'.
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

// Load .env before module-level code in imports reads process.env.
// Handles UTF-8 BOM and CRLF (Windows).
const envFile = resolve(__dir, '.env')
if (existsSync(envFile)) {
  const raw = readFileSync(envFile, 'utf8').replace(/^﻿/, '')
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
}

const { getAccessToken, getFhirBase } = await import('./auth.js')
const { fetchAllResources } = await import('./fhir.js')
const { upsertAll } = await import('./upsert.js')

// Resource types to fetch. Fetcher skips any type the server 401/403/404s.
const RESOURCE_TYPES = [
  'Patient',
  'Observation',
  'Condition',
  'MedicationRequest',
  'AllergyIntolerance',
  'Immunization',
  'DiagnosticReport',
  'Procedure',
]

const SANDBOX_CREDS = {
  username: 'fhircamila',
  password: 'epicepic1',
  patient: 'Camila Lopez (rich R4 sandbox patient — has labs + vitals)',
}

async function main() {
  const isSandbox = process.env.FHIR_ENV === 'sandbox'
  const fhirBase = getFhirBase()

  console.log('=== Zapp Health · FHIR Pull ===')
  console.log(`Mode: ${isSandbox ? 'SANDBOX (Epic fhir.epic.com)' : 'PRODUCTION (St. Elizabeth Healthcare)'}`)
  console.log()

  if (!isSandbox && !process.env.FHIR_CLIENT_ID) {
    console.error('Error: FHIR_CLIENT_ID not set in tools/fhir-pull/.env')
    process.exit(1)
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in tools/fhir-pull/.env')
    process.exit(1)
  }

  if (isSandbox) {
    console.log('┌─────────────────────────────────────────────────────┐')
    console.log('│  SANDBOX TEST CREDENTIALS — type these at MyChart   │')
    console.log(`│  Username : ${SANDBOX_CREDS.username.padEnd(40)} │`)
    console.log(`│  Password : ${SANDBOX_CREDS.password.padEnd(40)} │`)
    console.log(`│  Patient  : ${SANDBOX_CREDS.patient.padEnd(40)} │`)
    console.log('│  Records will be tagged owner=SANDBOX_TEST           │')
    console.log('└─────────────────────────────────────────────────────┘')
    console.log()
  }

  // 1. Auth
  const { accessToken, patientId } = await getAccessToken()
  console.log(`\n✓ Authenticated. Patient ID: ${patientId}\n`)

  // 2. Fetch
  const resources = {}
  for (const type of RESOURCE_TYPES) {
    process.stdout.write(`  Fetching ${type}... `)
    resources[type] = await fetchAllResources(fhirBase, accessToken, type, patientId)
    process.stdout.write(`${resources[type].length}\n`)
  }

  // 3. Upsert
  console.log('\nUpserting to Supabase...')
  const counts = await upsertAll(resources, patientId)

  console.log('\n=== Done ===')
  let anyRows = false
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table}: ${count} rows upserted`)
    if (count > 0) anyRows = true
  }
  if (!anyRows) {
    console.log('  (No rows written — check that scopes were granted for each resource type)')
  }
  if (isSandbox) {
    console.log('\nTo delete sandbox records later:')
    console.log("  DELETE FROM fhir_observations WHERE owner='SANDBOX_TEST'; -- (repeat per table)")
  }
}

main().catch(err => {
  console.error('\nFatal:', err.message)
  if (process.env.DEBUG) console.error(err.stack)
  process.exit(1)
})
