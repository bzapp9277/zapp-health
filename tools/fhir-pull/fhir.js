/**
 * FHIR R4 resource fetcher — handles both single-resource and bundle responses.
 * Follows pagination via bundle link[relation="next"] until exhausted.
 */

const FHIR_HEADERS = {
  Accept: 'application/fhir+json',
}

async function fetchWithAuth(url, accessToken) {
  const res = await fetch(url, {
    headers: { ...FHIR_HEADERS, Authorization: `Bearer ${accessToken}` },
  })
  return res
}

export async function fetchAllResources(fhirBase, accessToken, resourceType, patientId) {
  // Patient is a single resource; all others are bundle searches filtered by patient
  if (resourceType === 'Patient') {
    const res = await fetchWithAuth(`${fhirBase}/Patient/${patientId}`, accessToken)
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        process.stdout.write(`skipped (${res.status})\n`)
        return []
      }
      throw new Error(`Patient fetch failed: ${res.status}`)
    }
    return [await res.json()]
  }

  const resources = []
  let nextUrl = `${fhirBase}/${resourceType}?patient=${patientId}&_count=200`

  while (nextUrl) {
    const res = await fetchWithAuth(nextUrl, accessToken)

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        process.stdout.write(`skipped (${res.status})\n`)
        return []
      }
      const text = await res.text().catch(() => '')
      throw new Error(`FHIR ${resourceType} fetch failed (${res.status}): ${text.slice(0, 200)}`)
    }

    const bundle = await res.json()

    if (bundle.resourceType !== 'Bundle') {
      // Unexpected response shape
      break
    }

    for (const entry of bundle.entry ?? []) {
      if (entry.resource && entry.resource.resourceType === resourceType) {
        resources.push(entry.resource)
      }
    }

    // Follow next page if present
    const nextLink = (bundle.link ?? []).find(l => l.relation === 'next')
    nextUrl = nextLink?.url ?? null

    // Guard against malformed infinite loops
    if (resources.length > 50_000) {
      console.warn(`  Warning: ${resourceType} exceeded 50,000 records, stopping pagination early`)
      break
    }
  }

  return resources
}
