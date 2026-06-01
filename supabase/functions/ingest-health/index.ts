import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const USER_ID = 'eb3d4470-3f8b-436a-94db-783d9a744491'

// Parse HAE date strings: "2026-06-01 07:00:00 -0400" → ISO 8601
function parseDateStr(s: string): Date | null {
  try {
    // "YYYY-MM-DD HH:mm:ss ±HHMM" → "YYYY-MM-DDThh:mm:ss±HH:MM"
    const iso = s
      .replace(' ', 'T')
      .replace(/\s([+-])(\d{2})(\d{2})$/, '$1$2:$3')
    const d = new Date(iso)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

function isWeightMetric(name: string): boolean {
  const n = name.toLowerCase()
  return n.includes('weight') || n.includes('body_mass')
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    })
  }

  const expectedToken = Deno.env.get('HAE_WEBHOOK_TOKEN')
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!expectedToken || token !== expectedToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const metrics: unknown[] = (body?.data as Record<string, unknown>)?.metrics as unknown[] ?? []
  let metricsReceived = 0
  let pointsInserted = 0

  for (const metric of metrics) {
    const m = metric as Record<string, unknown>
    const metricName = m.name as string
    const metricUnit = (m.units ?? m.unit ?? '') as string
    const dataPoints  = Array.isArray(m.data) ? m.data : []

    metricsReceived++

    for (const point of dataPoints) {
      const p = point as Record<string, unknown>
      const qty = p.qty

      // Skip non-numeric data points (e.g. sleep stage strings)
      if (typeof qty !== 'number' || !isFinite(qty)) continue

      const dateStr = p.date as string
      const ts = parseDateStr(dateStr)
      if (!ts) continue

      const source = (p.source ?? 'apple_health') as string

      // Insert into health_metrics (upsert on unique key)
      const { error: hmError } = await supabase
        .from('health_metrics')
        .upsert(
          { user_id: USER_ID, metric_name: metricName, value: qty, unit: metricUnit, recorded_at: ts.toISOString(), source },
          { onConflict: 'user_id,metric_name,recorded_at' }
        )

      if (hmError) {
        console.error('health_metrics upsert error:', hmError.message)
        continue
      }

      pointsInserted++

      // Special case: weight → also upsert into vitals_log
      if (isWeightMetric(metricName)) {
        const isKg = metricUnit.toLowerCase().includes('kg')
        const weightLbs = isKg ? Math.round(qty * 2.20462 * 10) / 10 : Math.round(qty * 10) / 10
        const recordedOn = ts.toISOString().slice(0, 10)

        const { error: vlError } = await supabase
          .from('vitals_log')
          .upsert(
            { user_id: USER_ID, recorded_on: recordedOn, weight_lbs: weightLbs },
            { onConflict: 'user_id,recorded_on' }
          )

        if (vlError) {
          console.error('vitals_log upsert error:', vlError.message)
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, metrics_received: metricsReceived, points_inserted: pointsInserted }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
