#!/usr/bin/env node
/**
 * Zapp Health · FHIR Pull
 * Pulls St. Elizabeth Healthcare records via SMART on FHIR → Supabase
 * Usage: node tools/fhir-pull/index.js
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

// Load .env before any module-level code in imported modules reads process.env
const envFile = resolve(__dir, '.env')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
}

const { getAccessToken } = await import('./auth.js')
const { fetchAllResources } = await import('./fhir.js')
const { upsertAll } = await import('./upsert.js')

const FHIR_BASE = 'https://sehproxy.stelizabeth.com/arr-fhir/SEH/api/FHIR/R4'
// Resource types to fetch. The fetcher skips any type the server returns
// 401/403/404 for (scope not granted), so listing extras is safe.
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

async function main() {
  console.log('=== Zapp Health · FHIR Pull ===\n')

  if (!process.env.FHIR_CLIENT_ID) {
    console.error('Error: FHIR_CLIENT_ID not set in tools/fhir-pull/.env')
    console.error('Copy .env.example to .env and fill it in.')
    process.exit(1)
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in tools/fhir-pull/.env')
    process.exit(1)
  }

  // 1. Auth — uses stored refresh token if valid, otherwise opens browser
  const { accessToken, patientId } = await getAccessToken()
  console.log(`\n✓ Authenticated. Patient ID: ${patientId}\n`)

  // 2. Fetch all resource types from Epic, with pagination
  const resources = {}
  for (const type of RESOURCE_TYPES) {
    process.stdout.write(`  Fetching ${type}... `)
    resources[type] = await fetchAllResources(FHIR_BASE, accessToken, type, patientId)
    process.stdout.write(`${resources[type].length}\n`)
  }

  // 3. Parse and upsert into Supabase fhir_* tables
  console.log('\nUpserting to Supabase...')
  const counts = await upsertAll(resources, patientId)

  console.log('\n=== Done ===')
  for (const [table, count] of Object.entries(counts)) {
    if (count > 0) console.log(`  ${table}: ${count} rows upserted`)
  }
  console.log('\nRecords are now in kizrdaifculzighfngqz. Next pull will use the stored refresh token.')
}

main().catch(err => {
  console.error('\nFatal:', err.message)
  if (process.env.DEBUG) console.error(err.stack)
  process.exit(1)
})
