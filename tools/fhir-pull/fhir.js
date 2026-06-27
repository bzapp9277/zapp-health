/**
 * FHIR R4 resource fetcher — handles both single-resource and bundle responses.
 * Follows pagination via bundle link[relation="next"] until exhausted.
 * Skips any resource type the server returns 401/403/404 for (scope not granted
 * or API not registered) rather than aborting the whole pull.
 */

const FHIR_HEADERS = {
  Accept: 'application/fhir+json',
}

async function fetchWithAuth(url, accessToken) {
  return fetch(url, {
    headers: { ...FHIR_HEADERS, Authorization: `Bearer ${accessToken}` },
  })
}

// Extract a human-readable error from a FHIR OperationOutcome or plain text.
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

  const resources = []
  let nextUrl = `${fhirBase}/${resourceType}?patient=${patientId}&_count=200`

  while (nextUrl) {
    const res = await fetchWithAuth(nextUrl, accessToken)

    if (!res.ok) {
      const detail = await errorDetail(res)
      // 401/403/404 → scope not granted or resource type not available; skip cleanly
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        process.stdout.write(`skipped (${res.status}: ${detail})\n`)
        return []
      }
      // 4xx/5xx we didn't anticipate — surface the error but keep going
      process.stdout.write(`error (${res.status}: ${detail}) — skipping\n`)
      return resources
    }

    const bundle = await res.json()

    // Some Epic endpoints return a single resource instead of a bundle
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

  return resources
}
