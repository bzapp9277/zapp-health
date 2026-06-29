/**
 * FHIR R4 resource fetcher — handles both single-resource and bundle responses.
 * Follows pagination via bundle link[relation="next"] until exhausted.
 * Skips any resource type the server returns 401/403/404 for (scope not granted
 * or API not registered) rather than aborting the whole pull.
 *
 * Observation special-case: Epic rejects an unfiltered Observation search with
 * 400 "Must have either code or category". We loop per category instead and
 * dedupe by resource.id so no record is counted twice.
 */

const FHIR_HEADERS = {
  Accept: 'application/fhir+json',
}

// Epic R4 Observation categories to probe. Any that return 400 or 0 are skipped.
const OBSERVATION_CATEGORIES = [
  'laboratory',
  'vital-signs',
  'social-history',
  'core-characteristics',
  'functional-status',
  'survey',
]

async function fetchWithAuth(url, accessToken) {
  return fetch(url, {
    headers: { ...FHIR_HEADERS, Authorization: `Bearer ${accessToken}` },
  })
}

async function errorDetail(res) {
  const text = await res.text().catch(() => '')
  try {
    const body = JSON.parse(text)
    if (body.resourceType === 'OperationOutcome') {
      return body.issue?.map(i => i.diagnostics || i.details?.text || i.code).join('; ') || text.slice(0, 200)
    }
  } catch {}
  return text.slice(0, 200)
}

// Fetch all pages of a bundle search, returning an array of matching resources.
// Returns [] (not a throw) on 4xx/5xx so the caller can decide to skip or continue.
// Returns { resources, skipped, errorMsg } — skipped=true when the server rejected
// the request and the caller should not count this category.
async function fetchBundlePages(startUrl, resourceType, accessToken) {
  const resources = []
  let nextUrl = startUrl

  while (nextUrl) {
    const res = await fetchWithAuth(nextUrl, accessToken)

    if (!res.ok) {
      const detail = await errorDetail(res)
      return { resources: [], skipped: true, errorMsg: `${res.status}: ${detail}` }
    }

    const bundle = await res.json()

    if (bundle.resourceType !== 'Bundle') {
      if (bundle.resourceType === resourceType) resources.push(bundle)
      break
    }

    for (const entry of bundle.entry ?? []) {
      if (entry.resource && entry.resource.resourceType === resourceType) {
        resources.push(entry.resource)
      }
    }

    const nextLink = (bundle.link ?? []).find(l => l.relation === 'next')
    nextUrl = nextLink?.url ?? null

    if (resources.length > 50_000) {
      console.warn(`  Warning: ${resourceType} exceeded 50,000 records — stopping pagination early`)
      break
    }
  }

  return { resources, skipped: false, errorMsg: null }
}

// Observation requires category= on Epic — probe each category, dedupe by id.
async function fetchObservations(fhirBase, accessToken, patientId) {
  const seen = new Set()
  const all = []
  const hits = []

  for (const category of OBSERVATION_CATEGORIES) {
    const url = `${fhirBase}/Observation?patient=${patientId}&category=${category}&_count=200`
    const { resources, skipped, errorMsg } = await fetchBundlePages(url, 'Observation', accessToken)

    if (skipped) {
      process.stdout.write(`\n      ${category}: skipped (${errorMsg})`)
      continue
    }

    const fresh = resources.filter(r => r.id && !seen.has(r.id))
    fresh.forEach(r => seen.add(r.id))
    all.push(...fresh)

    if (fresh.length > 0) hits.push(`${category}(${fresh.length})`)
    process.stdout.write(`\n      ${category}: ${fresh.length}`)
  }

  process.stdout.write(`\n      total unique: ${all.length}`)
  if (hits.length > 0) process.stdout.write(` [${hits.join(', ')}]`)
  return all
}

export async function fetchAllResources(fhirBase, accessToken, resourceType, patientId) {
  // Patient is a single resource — fetch by ID directly
  if (resourceType === 'Patient') {
    const res = await fetchWithAuth(`${fhirBase}/Patient/${patientId}`, accessToken)
    if (!res.ok) {
      const detail = await errorDetail(res)
      process.stdout.write(`skipped (${res.status}: ${detail})\n`)
      return []
    }
    return [await res.json()]
  }

  // Observation requires per-category queries on Epic
  if (resourceType === 'Observation') {
    const obs = await fetchObservations(fhirBase, accessToken, patientId)
    return obs
  }

  // All other resource types: standard patient search with pagination
  const { resources, skipped, errorMsg } = await fetchBundlePages(
    `${fhirBase}/${resourceType}?patient=${patientId}&_count=200`,
    resourceType,
    accessToken,
  )

  if (skipped) {
    process.stdout.write(`error (${errorMsg}) — skipping`)
    return []
  }

  return resources
}
