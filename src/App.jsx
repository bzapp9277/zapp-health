import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  LineChart, Line, ComposedChart, Bar,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceArea, ReferenceLine
} from 'recharts'
import {
  ChevronRight, Plus, Mail, Save, LogOut, Lock,
  Droplets, Activity, FlaskConical, Sparkles, Heart,
  TreePine, Home, Plane, Ban, Stethoscope, MapPin,
  Flame, Zap, TrendingDown, TrendingUp
} from 'lucide-react'
import { WELLNESS_EVENTS, PENDING_SCREENINGS_2027 } from './data/wellnessCalendar.js'

// =====================================================================
// CONFIG
// =====================================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY
const USER_ID = 'eb3d4470-3f8b-436a-94db-783d9a744491'
const AUTH_KEY = 'zh_authed'

// Supabase client — handles session storage and JWT refresh automatically.
// detectSessionInUrl=true (default) reads the access_token from the magic-link
// callback URL hash and establishes the session without any extra code.
const supabase = createClient(SUPABASE_URL, ANON_KEY)

// =====================================================================
// API LAYER — direct fetch to Supabase REST, using session JWT when available
// =====================================================================
function buildQS(params = {}) {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue
    usp.set(k, v)
  }
  return usp.toString() ? '?' + usp.toString() : ''
}

async function apiCall(method, path, body) {
  // Use the active session JWT so tables with authenticated-only RLS policies
  // (like drink_types) respond correctly. Falls back to the anon key for public
  // tables if there is no active session yet.
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ANON_KEY
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' || method === 'PATCH' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${text}`)
  }
  if (res.status === 204) return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

const db = {
  select: (table, params) => apiCall('GET', `/${table}${buildQS({ select: '*', ...params })}`),
  insert: (table, row) => apiCall('POST', `/${table}`, row),
  update: (table, filter, patch) => apiCall('PATCH', `/${table}?${filter}`, patch),
  remove: (table, filter) => apiCall('DELETE', `/${table}?${filter}`)
}

// =====================================================================
// FORMAT HELPERS
// =====================================================================
const fmtDate = (s, opts = {}) => {
  if (!s) return '—'
  const d = new Date(s + (s.length === 10 ? 'T00:00:00' : ''))
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...opts })
}
const fmtDateShort = (s) => {
  if (!s) return '—'
  const d = new Date(s + (s.length === 10 ? 'T00:00:00' : ''))
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}
const fmtNum = (n, d = 1) => n == null ? '—' : Number(n).toLocaleString(undefined, { maximumFractionDigits: d })
const fmtRange = (lo, hi) => {
  if (lo == null && hi == null) return '—'
  if (lo == null) return `≤ ${hi}`
  if (hi == null) return `≥ ${lo}`
  return `${lo} – ${hi}`
}
const dirGlyph = (d) => d === 'up' ? '↑' : d === 'down' ? '↓' : d === 'flat' ? '→' : ''

// =====================================================================
// THEME
// =====================================================================
const C = {
  paper: '#F5F1EA', paper2: '#EDE7DB', ink: '#1A1815', ink2: '#36322B',
  muted: '#8B8579', rule: '#D8D1C2', forest: '#3B5D44', amber: '#C9602B',
  terracotta: '#9B3522', cream: '#FAF7F0'
}

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  .zapp-root {
    font-family: 'Inter Tight', system-ui, sans-serif;
    color: ${C.ink};
    background:
      radial-gradient(1200px 600px at 90% -10%, rgba(201,96,43,0.06), transparent 60%),
      radial-gradient(800px 400px at -10% 100%, rgba(59,93,68,0.05), transparent 60%),
      ${C.paper};
    min-height: 100vh;
    position: relative;
  }
  .zapp-root::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    opacity: 0.4; mix-blend-mode: multiply; z-index: 0;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='3'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  }
  .zapp-root > * { position: relative; z-index: 1; }

  .display { font-family: 'Fraunces', Georgia, serif; font-feature-settings: "ss01"; letter-spacing: -0.04em; }
  .num { font-family: 'Fraunces', Georgia, serif; font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  .label-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: ${C.muted}; font-weight: 500; }
  .card { background: ${C.cream}; border: 1px solid ${C.rule}; border-radius: 2px; box-shadow: 0 1px 0 rgba(26,24,21,0.06), 0 8px 24px -12px rgba(26,24,21,0.18); }
  .pill { display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; padding: 2px 8px; font-size: 11px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; }
  .input { width: 100%; background: ${C.cream}; border: 1px solid ${C.rule}; border-radius: 2px; padding: 8px 12px; font-size: 14px; color: ${C.ink}; outline: none; font-family: inherit; }
  .input:focus { border-color: ${C.ink}; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 16px; font-size: 14px; font-weight: 500; letter-spacing: 0.02em; border-radius: 2px; transition: background 0.15s, color 0.15s, border-color 0.15s; cursor: pointer; border: none; font-family: inherit; }
  .btn-primary { background: ${C.ink}; color: ${C.cream}; }
  .btn-primary:hover { background: ${C.ink2}; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-ghost { background: transparent; color: ${C.ink}; border: 1px solid ${C.rule}; }
  .btn-ghost:hover { background: ${C.paper2}; }
  .rule { border-bottom: 1px solid ${C.rule}; }
  .recharts-cartesian-axis-tick-value { font-family: 'JetBrains Mono', monospace; font-size: 11px; fill: ${C.muted}; }
  .recharts-cartesian-grid line { stroke: ${C.rule}; }
  .nav-link { display: flex; align-items: center; justify-content: space-between; padding: 8px; border-radius: 2px; color: ${C.ink2}; cursor: pointer; transition: background 0.15s; }
  .nav-link:hover { background: rgba(237,231,219,0.6); }
  .nav-link.active { background: ${C.paper2}; color: ${C.ink}; }
  .nav-num { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: ${C.muted}; }
  .nav-link.active .nav-num { color: ${C.amber}; }
  table.zapp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.zapp-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: ${C.muted}; font-weight: 500; padding: 12px 16px; background: rgba(237,231,219,0.4); border-bottom: 1px solid ${C.rule}; }
  table.zapp-table td { padding: 12px 16px; border-bottom: 1px solid rgba(216,209,194,0.6); }
  table.zapp-table tr:hover td { background: rgba(237,231,219,0.4); }
`

// =====================================================================
// SIDEBAR
// =====================================================================
const NAV = [
  { id: 'overview',     label: 'Overview',    hint: '01' },
  { id: 'markers',      label: 'Biomarkers',  hint: '02' },
  { id: 'medications',  label: 'Medications', hint: '03' },
  { id: 'treatments',   label: 'Treatments',  hint: '04' },
  { id: 'drinks',       label: 'Drinks',      hint: '05' },
  { id: 'briefings',    label: 'Briefings',   hint: '06' },
  { id: 'questions',    label: 'For Doctor',  hint: '07' },
  { id: 'reports',      label: 'Reports',     hint: '08' },
  { id: 'profile',      label: 'Profile',     hint: '09' },
  { id: 'calendar',    label: 'Calendar',    hint: '10' }
]

function Sidebar({ tab, setTab, profile, onSignOut }) {
  return (
    <aside style={{
      width: 256, flexShrink: 0, padding: '32px 24px',
      borderRight: `1px solid ${C.rule}`, display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ marginBottom: 48 }}>
        <div className="label-eyebrow" style={{ marginBottom: 4 }}>Personal Health Ledger</div>
        <h1 className="display" style={{ fontSize: 32, lineHeight: 1, margin: 0 }}>
          Zapp<span style={{ color: C.amber }}>.</span>
        </h1>
        <div className="mono" style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>EST. 2026 · WALTON, KY</div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(n => (
          <div
            key={n.id}
            className={`nav-link ${tab === n.id ? 'active' : ''}`}
            onClick={() => setTab(n.id)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="nav-num">{n.hint}</span>
              <span style={{ fontSize: 15 }}>{n.label}</span>
            </span>
            {tab === n.id && <ChevronRight size={14} color={C.amber} />}
          </div>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: 32, borderTop: `1px solid ${C.rule}`, fontSize: 12, color: C.muted }}>
        <div className="display" style={{ fontSize: 16, color: C.ink2, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
          {profile?.full_name || ''}
        </div>
        <button
          onClick={onSignOut}
          style={{
            marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: C.muted, background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, fontFamily: 'inherit', letterSpacing: '0.06em',
            textTransform: 'uppercase'
          }}
        >
          <LogOut size={11} /> Sign out
        </button>
      </div>
    </aside>
  )
}

// =====================================================================
// PAGE HEADER
// =====================================================================
function PageHeader({ eyebrow, title, subtitle, right }) {
  return (
    <header className="rule" style={{ paddingBottom: 24, marginBottom: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
      <div>
        {eyebrow && <div className="label-eyebrow" style={{ color: C.amber }}>{eyebrow}</div>}
        <h1 className="display" style={{ fontSize: 48, lineHeight: 1, margin: '4px 0 0' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 14, color: C.muted, marginTop: 12, maxWidth: 640, lineHeight: 1.55 }}>{subtitle}</p>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </header>
  )
}

// =====================================================================
// SPARKLINE
// =====================================================================
function Sparkline({ data, refLow, refHigh, color = C.ink, height = 44 }) {
  if (!data || data.length === 0) return <div style={{ fontSize: 11, color: C.muted, fontStyle: 'italic' }}>no data</div>
  const values = data.map(d => d.value)
  const min = Math.min(...values, refLow ?? Infinity)
  const max = Math.max(...values, refHigh ?? -Infinity)
  const pad = (max - min) * 0.15 || 1
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
        <YAxis hide domain={[min - pad, max + pad]} />
        {refLow != null && refHigh != null && (
          <ReferenceArea y1={refLow} y2={refHigh} fill={C.forest} fillOpacity={0.06} />
        )}
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5}
          dot={{ r: 2, fill: color, stroke: 'none' }} activeDot={{ r: 3 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// =====================================================================
// TREND CHART
// =====================================================================
function TrendChart({ data, refLow, refHigh, unit, events = [], height = 280 }) {
  if (!data || data.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontStyle: 'italic', fontSize: 14 }}>No data points yet.</div>
  }
  const values = data.map(d => d.value)
  const min = Math.min(...values, refLow ?? Infinity)
  const max = Math.max(...values, refHigh ?? -Infinity)
  const pad = (max - min) * 0.18 || 1
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid stroke={C.rule} strokeDasharray="0" vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmtDateShort} stroke={C.muted} tickLine={false} axisLine={{ stroke: C.rule }} />
        <YAxis domain={[min - pad, max + pad]} stroke={C.muted} tickLine={false} axisLine={{ stroke: C.rule }} width={48} />
        {refLow != null && refHigh != null && (
          <ReferenceArea y1={refLow} y2={refHigh} fill={C.forest} fillOpacity={0.06} ifOverflow="extendDomain" />
        )}
        {refLow != null && <ReferenceLine y={refLow} stroke={C.forest} strokeDasharray="3 3" strokeOpacity={0.5} />}
        {refHigh != null && <ReferenceLine y={refHigh} stroke={C.forest} strokeDasharray="3 3" strokeOpacity={0.5} />}
        {events.map((e, i) => (
          <ReferenceLine key={i} x={e.date} stroke={C.amber} strokeDasharray="2 2"
            label={{ value: e.label, position: 'top', fill: C.amber, fontSize: 10 }} />
        ))}
        <Tooltip
          contentStyle={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 2, fontFamily: 'Inter Tight', fontSize: 12 }}
          labelFormatter={(d) => fmtDate(d)}
          formatter={(v) => [`${v}${unit ? ' ' + unit : ''}`, 'value']}
        />
        <Line type="monotone" dataKey="value" stroke={C.ink} strokeWidth={2}
          dot={(props) => {
            const { cx, cy, payload } = props
            const flagged = payload.flag && /high|low|critical/i.test(payload.flag)
            return <circle key={`d-${cx}-${cy}`} cx={cx} cy={cy} r={flagged ? 5 : 3}
              fill={flagged ? C.amber : C.ink} stroke={flagged ? C.cream : 'none'} strokeWidth={2} />
          }}
          isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// =====================================================================
// SCORECARD CARD
// =====================================================================
function ScorecardCard({ row, trend, onClick }) {
  const flagged = !!row.flag
  return (
    <div className="card" onClick={onClick} style={{ padding: 20, cursor: 'pointer', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = C.ink}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.rule}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="label-eyebrow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.display_name}</div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="num" style={{ fontSize: 36, lineHeight: 1 }}>{fmtNum(row.value, 2)}</span>
            <span style={{ fontSize: 12, color: C.muted }}>{row.unit}</span>
          </div>
        </div>
        {flagged && (
          <span className="pill" style={{
            border: `1px solid ${/high/i.test(row.flag) ? C.amber : C.terracotta}40`,
            background: `${/high/i.test(row.flag) ? C.amber : C.terracotta}10`,
            color: /high/i.test(row.flag) ? C.amber : C.terracotta
          }}>{row.flag}</span>
        )}
      </div>
      <div style={{ marginTop: 12, marginLeft: -4, marginRight: -4 }}>
        <Sparkline data={trend} refLow={row.lab_ref_low} refHigh={row.lab_ref_high} color={flagged ? C.amber : C.ink} />
      </div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: C.muted }}>
        <span className="mono">REF {fmtRange(row.lab_ref_low, row.lab_ref_high)}</span>
        {row.pct_change != null && (
          <span className="mono" style={{
            color: row.direction === 'up' ? C.amber : row.direction === 'down' ? C.forest : C.muted
          }}>
            {dirGlyph(row.direction)} {row.pct_change > 0 ? '+' : ''}{row.pct_change}%
          </span>
        )}
      </div>
    </div>
  )
}

// =====================================================================
// HEALTH INBOX CARD
// =====================================================================
const CATEGORY_LABELS = {
  lab_result_notification: 'Lab result',
  visit_summary:           'Visit summary',
  appointment:             'Appointment',
  doctor_note:             'Doctor note',
  other:                   'Health mail',
}

function HealthInboxCard({ items, refresh }) {
  const newItems = (items || []).filter(i => i.status === 'new')
  const [marking, setMarking] = useState(null)

  const markDone = async (id) => {
    setMarking(id)
    try {
      await db.update('health_inbox', `id=eq.${id}`, { status: 'done' })
      refresh()
    } finally {
      setMarking(null)
    }
  }

  if (newItems.length === 0) return null

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 16
      }}>
        <div>
          <div className="label-eyebrow" style={{ color: C.terracotta }}>Action required</div>
          <h2 className="display" style={{ fontSize: 24, marginTop: 4 }}>Health inbox</h2>
        </div>
        <span className="num" style={{ fontSize: 32, color: C.terracotta }}>{newItems.length}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {newItems.map(item => {
          const catLabel = CATEGORY_LABELS[item.category] || 'Health mail'
          const isAttachment = item.has_attachment
          return (
            <div key={item.id} className="card" style={{
              padding: '16px 20px',
              borderLeft: `3px solid ${isAttachment ? C.forest : C.terracotta}`,
              display: 'flex', alignItems: 'flex-start', gap: 16
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span className="pill" style={{
                    background: isAttachment ? `${C.forest}12` : `${C.terracotta}12`,
                    color: isAttachment ? C.forest : C.terracotta,
                    border: `1px solid ${isAttachment ? C.forest : C.terracotta}40`,
                  }}>{catLabel}</span>
                  {isAttachment && (
                    <span className="pill" style={{
                      background: `${C.forest}12`, color: C.forest, border: `1px solid ${C.forest}40`
                    }}>PDF / attachment</span>
                  )}
                  <span className="mono" style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase' }}>
                    {item.received_at ? fmtDate(item.received_at.slice(0, 10)) : ''}
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>
                  {item.subject || '(no subject)'}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{item.sender}</div>
                {item.action_needed && (
                  <div style={{
                    fontSize: 13, color: C.ink2, lineHeight: 1.5,
                    padding: '6px 10px', background: C.paper2, borderRadius: 2
                  }}>
                    {item.action_needed}
                  </div>
                )}
              </div>
              <button
                onClick={() => markDone(item.id)}
                disabled={marking === item.id}
                className="btn btn-ghost"
                style={{ flexShrink: 0, fontSize: 12, padding: '6px 12px' }}
              >
                {marking === item.id ? '…' : 'Mark done'}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// =====================================================================
// DASHBOARD
// =====================================================================
function Dashboard({ data, setTab, setMarkerCode, refresh }) {
  const FEATURED = ['hematocrit', 'hemoglobin', 'total_testosterone', 'free_testosterone',
    'ldl_calc', 'total_cholesterol', 'alt', 'egfr', 'calcium', 'hba1c']

  const featured = FEATURED.map(c => data.scorecard.find(r => r.code === c)).filter(Boolean)
  const flagged = data.scorecard.filter(r => r.flag && /high|low|critical/i.test(r.flag))

  const latestPanel = data.panels[0]?.collected_on
  const donations = data.treatments.filter(t => t.treatment_type === 'blood_donation').length
  const openQuestions = data.questions.filter(q => q.status === 'open').length

  const catCounts = data.scorecard.reduce((acc, r) => { acc[r.category] = (acc[r.category] || 0) + 1; return acc }, {})

  const goMarker = (code) => { setMarkerCode(code); setTab('marker_detail') }

  return (
    <>
      <PageHeader
        eyebrow="01 — Overview"
        title="The dashboard."
        subtitle="A running snapshot of biomarkers, with the things demanding attention surfaced first."
        right={<button className="btn btn-ghost" onClick={() => setTab('reports')}>Generate report →</button>}
      />

      <HealthInboxCard items={data.healthInbox} refresh={refresh} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: C.rule, border: `1px solid ${C.rule}`, marginBottom: 48 }}>
        <Stat label="Latest panel" value={fmtDate(latestPanel)} />
        <Stat label="Markers tracked" value={String(data.scorecard.length)} />
        <Stat label="Flagged today" value={String(flagged.length)} accent={flagged.length > 0} />
        <Stat label="Hoxworth donations" value={String(donations)} sub="all-time" />
      </div>

      {flagged.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div className="label-eyebrow" style={{ color: C.amber }}>Needs attention</div>
              <h2 className="display" style={{ fontSize: 24, marginTop: 4 }}>Out-of-range right now</h2>
            </div>
            <button className="mono" onClick={() => setTab('markers')}
              style={{ fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>VIEW ALL →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {flagged.map(r => (
              <ScorecardCard key={r.marker_id} row={r} trend={data.history[r.code] || []} onClick={() => goMarker(r.code)} />
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div className="label-eyebrow">Featured</div>
            <h2 className="display" style={{ fontSize: 24, marginTop: 4 }}>Biomarkers I'm watching closely</h2>
          </div>
          <button className="mono" onClick={() => setTab('markers')}
            style={{ fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>ALL BIOMARKERS →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {featured.map(r => (
            <ScorecardCard key={r.marker_id} row={r} trend={data.history[r.code] || []} onClick={() => goMarker(r.code)} />
          ))}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 48 }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div className="label-eyebrow" style={{ color: C.amber }}>For Doctor</div>
              <h3 className="display" style={{ fontSize: 20, marginTop: 4 }}>Open questions</h3>
            </div>
            <span className="num" style={{ fontSize: 32 }}>{openQuestions}</span>
          </div>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>
            Items queued for the next appointment — TRT dose, kidney recheck, ApoB / Lp(a) / CAC, statin trial.
          </p>
          <button onClick={() => setTab('questions')}
            style={{ marginTop: 16, color: C.amber, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            Open the queue →
          </button>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div className="label-eyebrow">Categories</div>
          <h3 className="display" style={{ fontSize: 20, marginTop: 4, marginBottom: 16 }}>Biomarkers by area</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(catCounts).sort((a,b) => b[1] - a[1]).map(([cat, count]) => (
              <div key={cat} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 14, paddingBottom: 6, borderBottom: `1px solid ${C.rule}80`
              }}>
                <span style={{ textTransform: 'capitalize' }}>{cat.replace(/_/g, ' ')}</span>
                <span className="mono" style={{ color: C.muted }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function Stat({ label, value, sub, accent }) {
  return (
    <div style={{ background: C.cream, padding: 20 }}>
      <div className="label-eyebrow">{label}</div>
      <div className="display" style={{ fontSize: 28, marginTop: 4, color: accent ? C.amber : C.ink, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// =====================================================================
// MARKERS LIST
// =====================================================================
function MarkersList({ data, setTab, setMarkerCode }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [onlyFlagged, setOnlyFlagged] = useState(false)

  const cats = useMemo(() => {
    const set = new Set(data.scorecard.map(r => r.category))
    return ['all', ...Array.from(set)]
  }, [data.scorecard])

  const filtered = useMemo(() => {
    return data.scorecard.filter(r => {
      if (cat !== 'all' && r.category !== cat) return false
      if (onlyFlagged && !r.flag) return false
      if (q && !(r.display_name.toLowerCase().includes(q.toLowerCase()) || r.code.includes(q.toLowerCase()))) return false
      return true
    })
  }, [data.scorecard, cat, q, onlyFlagged])

  const goMarker = (code) => { setMarkerCode(code); setTab('marker_detail') }

  return (
    <>
      <PageHeader
        eyebrow="02 — Biomarkers"
        title="Every measurement, every panel."
        subtitle="Click any row to open the full trend, range bands, and history."
      />

      <div className="rule" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', paddingBottom: 24, marginBottom: 24 }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder="Search markers…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="input" style={{ maxWidth: 240 }} value={cat} onChange={e => setCat(e.target.value)}>
          {cats.map(c => <option key={c} value={c}>{c === 'all' ? 'All categories' : c.replace(/_/g, ' ')}</option>)}
        </select>
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: C.muted }}>
          <input type="checkbox" checked={onlyFlagged} onChange={e => setOnlyFlagged(e.target.checked)} /> Only flagged
        </label>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '4fr 2fr 2fr 3fr 1fr', padding: '12px 20px', borderBottom: `1px solid ${C.rule}`, background: 'rgba(237,231,219,0.4)' }}>
          {['Marker', 'Latest', 'Reference', 'Trend', 'Δ lifetime'].map((h, i) => (
            <div key={h} className="label-eyebrow" style={{ textAlign: i === 1 || i === 2 || i === 4 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>
        {filtered.map(r => (
          <div key={r.marker_id} onClick={() => goMarker(r.code)}
            style={{ display: 'grid', gridTemplateColumns: '4fr 2fr 2fr 3fr 1fr', padding: '12px 20px', alignItems: 'center', borderBottom: `1px solid ${C.rule}80`, cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(237,231,219,0.4)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15 }}>{r.display_name}</div>
              <div className="mono" style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', marginTop: 2 }}>{r.category.replace(/_/g, ' ')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="num" style={{ fontSize: 20, color: r.flag ? C.amber : C.ink }}>{fmtNum(r.value, 2)}</span>
              <span style={{ fontSize: 11, color: C.muted, marginLeft: 4 }}>{r.unit}</span>
            </div>
            <div className="mono" style={{ fontSize: 12, color: C.muted, textAlign: 'right' }}>{fmtRange(r.lab_ref_low, r.lab_ref_high)}</div>
            <div style={{ padding: '0 12px' }}>
              <Sparkline data={data.history[r.code] || []} refLow={r.lab_ref_low} refHigh={r.lab_ref_high}
                color={r.flag ? C.amber : C.ink} height={32} />
            </div>
            <div style={{ textAlign: 'right' }}>
              {r.pct_change_lifetime != null ? (() => {
                const bd = r.better_direction
                const dir = r.direction_lifetime
                const isGood = (bd === 'lower' && dir === 'down') || (bd === 'higher' && dir === 'up')
                const isBad  = (bd === 'lower' && dir === 'up')   || (bd === 'higher' && dir === 'down')
                const color  = bd === 'neutral' || !dir || dir === 'flat' ? C.muted
                             : isGood ? C.forest
                             : isBad  ? C.terracotta
                             : C.muted
                const tip = `Lifetime change since ${r.oldest_collected_on ? fmtDate(r.oldest_collected_on) : 'earliest reading'}`
                          + (bd === 'neutral' ? ' · no single healthy direction' : '')
                return (
                  <span className="mono" style={{ fontSize: 11, cursor: 'default', color }} title={tip}>
                    {dirGlyph(dir)}{Number(r.pct_change_lifetime) > 0 ? '+' : ''}{Math.round(Number(r.pct_change_lifetime))}%
                  </span>
                )
              })() : <span style={{ color: C.muted, fontSize: 11 }}>—</span>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: '32px 20px', color: C.muted, fontStyle: 'italic', textAlign: 'center' }}>No markers match those filters.</div>}
      </div>
    </>
  )
}

// =====================================================================
// MARKER DETAIL
// =====================================================================
function MarkerDetail({ data, code, setTab }) {
  const marker = data.markers.find(m => m.code === code)
  const points = data.markerHistory[code] || []
  if (!marker) return <div style={{ color: C.muted }}>Marker not found.</div>

  const overlayCodes = ['hematocrit', 'hemoglobin', 'rbc', 'alt', 'ast', 'total_testosterone', 'free_testosterone']
  const overlays = []
  if (overlayCodes.includes(code)) {
    for (const e of data.events) overlays.push({ date: e.event_date, label: e.title.slice(0, 18) + (e.title.length > 18 ? '…' : '') })
    for (const t of data.treatments.filter(tt => tt.treatment_type === 'blood_donation')) {
      overlays.push({ date: t.performed_on, label: 'Donation' })
    }
  }

  const latest = points[points.length - 1]
  const prev = points[points.length - 2]
  const pct = prev && prev.value ? Number((((latest.value - prev.value) / prev.value) * 100).toFixed(1)) : null
  const direction = !prev ? null : latest.value > prev.value ? 'up' : latest.value < prev.value ? 'down' : 'flat'

  return (
    <>
      <PageHeader
        eyebrow={`02 — ${marker.category.replace(/_/g,' ').toUpperCase()}`}
        title={marker.display_name}
        subtitle={marker.why_it_matters}
        right={<button className="btn btn-ghost" onClick={() => setTab('markers')}>← Back to all</button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 40 }}>
        <div className="card" style={{ padding: 24 }}>
          <div className="label-eyebrow">Latest</div>
          <div className="num" style={{ fontSize: 56, marginTop: 8, lineHeight: 1 }}>{fmtNum(latest?.value, 2)}</div>
          <div style={{ fontSize: 13, color: C.muted }}>{marker.unit} · {fmtDate(latest?.date)}</div>
          {latest?.flag && (
            <span className="pill" style={{
              marginTop: 12, border: `1px solid ${/high/i.test(latest.flag) ? C.amber : C.terracotta}40`,
              background: `${/high/i.test(latest.flag) ? C.amber : C.terracotta}10`,
              color: /high/i.test(latest.flag) ? C.amber : C.terracotta
            }}>{latest.flag}</span>
          )}
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.rule}`, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <Row label="Reference range" value={`${fmtRange(marker.lab_ref_low, marker.lab_ref_high)} ${marker.unit}`} />
            {prev && <Row label="Previous" value={`${fmtNum(prev.value, 2)} · ${fmtDate(prev.date)}`} />}
            {pct != null && <Row label="Change" value={
              <span style={{ color: direction === 'up' ? C.amber : direction === 'down' ? C.forest : C.muted }}>
                {dirGlyph(direction)} {pct > 0 ? '+' : ''}{pct}%
              </span>
            } />}
            <Row label="Data points" value={String(points.length)} />
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div className="label-eyebrow" style={{ marginBottom: 12 }}>Trend over time</div>
          <TrendChart
            data={points}
            refLow={marker.lab_ref_low}
            refHigh={marker.lab_ref_high}
            unit={marker.unit}
            events={overlays}
          />
          <div className="mono" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: C.muted }}>
            <span><span style={{ display: 'inline-block', width: 12, height: 2, background: C.ink, marginRight: 4, verticalAlign: 'middle' }} />Value</span>
            <span><span style={{ display: 'inline-block', width: 12, borderTop: `2px dashed ${C.forest}`, marginRight: 4, verticalAlign: 'middle' }} />Reference</span>
            {overlays.length > 0 && (
              <span><span style={{ display: 'inline-block', width: 12, borderTop: `2px dashed ${C.amber}`, marginRight: 4, verticalAlign: 'middle' }} />Event</span>
            )}
          </div>
        </div>
      </div>

      <section className="card" style={{ padding: 24 }}>
        <div className="label-eyebrow" style={{ marginBottom: 12 }}>All recorded values</div>
        <table className="zapp-table">
          <thead>
            <tr>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Value</th>
              <th style={{ textAlign: 'right' }}>Δ vs prev</th>
              <th>Flag</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p, i, arr) => {
              const prevP = arr[i + 1]
              const d = prevP ? Number((((p.value - prevP.value) / prevP.value) * 100).toFixed(1)) : null
              return (
                <tr key={i}>
                  <td>{fmtDate(p.date)}</td>
                  <td style={{ textAlign: 'right' }} className="num">
                    {fmtNum(p.value, 2)} <span style={{ fontSize: 11, color: C.muted }}>{marker.unit}</span>
                  </td>
                  <td style={{ textAlign: 'right' }} className="mono">
                    {d == null ? '—' : (
                      <span style={{ color: d > 0 ? C.amber : d < 0 ? C.forest : C.muted, fontSize: 12 }}>
                        {d > 0 ? '+' : ''}{d}%
                      </span>
                    )}
                  </td>
                  <td>
                    {p.flag ? (
                      <span className="pill" style={{ border: `1px solid ${C.amber}40`, background: `${C.amber}10`, color: C.amber }}>{p.flag}</span>
                    ) : <span style={{ color: C.muted }}>—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span className="mono" style={{ fontSize: 12 }}>{value}</span>
    </div>
  )
}

// =====================================================================
// MEDICATIONS
// =====================================================================
function Medications({ data }) {
  const active = data.activeMeds.filter(m => !m.is_supplement)
  const supps = data.activeMeds.filter(m => m.is_supplement)
  const disc = data.medications.filter(m => m.status === 'discontinued')

  const MedCard = ({ m }) => (
    <div className="card" style={{ padding: 20, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <h3 className="display" style={{ fontSize: 22 }}>{m.name}</h3>
            {m.category && <span className="pill" style={{ background: C.paper2, color: C.ink2, border: `1px solid ${C.rule}` }}>{m.category}</span>}
            {m.status === 'as_needed' && <span className="pill" style={{ background: `${C.amber}10`, color: C.amber, border: `1px solid ${C.amber}40` }}>PRN</span>}
          </div>
          {m.reason && <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{m.reason}</p>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="num" style={{ fontSize: 26, lineHeight: 1 }}>
            {m.dose_amount ?? '—'}<span style={{ fontSize: 14, color: C.muted, marginLeft: 4 }}>{m.dose_unit ?? ''}</span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', marginTop: 4 }}>{m.frequency ?? ''}</div>
          {m.schedule_detail && <div style={{ fontSize: 11, color: C.muted }}>{m.schedule_detail}</div>}
        </div>
      </div>
      <div className="mono" style={{ fontSize: 11, color: C.muted, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.rule}80`, textTransform: 'uppercase' }}>
        STARTED {fmtDate(m.started_on)}
      </div>
    </div>
  )

  return (
    <>
      <PageHeader
        eyebrow="03 — Medications"
        title="What's in the system."
        subtitle="Active prescriptions, supplements, and PRNs — with current dose and schedule."
      />
      <Section title="Active medications" count={active.length}>
        {active.map(m => <MedCard key={m.medication_id} m={m} />)}
      </Section>
      <Section title="Supplements" count={supps.length} color={C.forest}>
        {supps.map(m => <MedCard key={m.medication_id} m={m} />)}
      </Section>
      {disc.length > 0 && (
        <Section title="Discontinued" count={disc.length} muted>
          {disc.map(m => (
            <div key={m.id} className="card" style={{ padding: 20, marginBottom: 12, opacity: 0.7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <div className="display" style={{ fontSize: 20, textDecoration: 'line-through', textDecorationColor: C.rule }}>{m.name}</div>
                  <div className="label-eyebrow" style={{ marginTop: 4 }}>{m.category}</div>
                </div>
                <span className="pill" style={{ background: `${C.muted}10`, color: C.muted, border: `1px solid ${C.rule}` }}>DISCONTINUED</span>
              </div>
              {m.notes && <p style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>{m.notes}</p>}
            </div>
          ))}
        </Section>
      )}
    </>
  )
}

function Section({ title, count, children, color, muted }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 className="display" style={{ fontSize: 24, color: color || (muted ? C.muted : C.ink) }}>{title}</h2>
        <span className="num" style={{ fontSize: 28, color: C.muted }}>{count}</span>
      </div>
      {count === 0 && <div style={{ color: C.muted, fontStyle: 'italic' }}>None.</div>}
      {children}
    </section>
  )
}

// =====================================================================
// TREATMENTS
// =====================================================================
function Treatments({ data }) {
  const TYPE_LABEL = { iv_therapy: 'IV Therapy', blood_donation: 'Blood Donation', peptide_injection: 'Peptide', massage: 'Massage', physical_therapy: 'PT', imaging: 'Imaging', procedure: 'Procedure', vaccine: 'Vaccine', other: 'Other' }
  const donations = data.treatments.filter(t => t.treatment_type === 'blood_donation')
  const ivs = data.treatments.filter(t => t.treatment_type === 'iv_therapy')
  const others = data.treatments.filter(t => !['blood_donation', 'iv_therapy'].includes(t.treatment_type))

  const TxRow = ({ t }) => (
    <div className="card" style={{ padding: 20, marginBottom: 12, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h3 className="display" style={{ fontSize: 20 }}>{t.name || TYPE_LABEL[t.treatment_type]}</h3>
          <span className="pill" style={{ background: C.paper2, color: C.ink2, border: `1px solid ${C.rule}` }}>{TYPE_LABEL[t.treatment_type]}</span>
        </div>
        {t.provider && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{t.provider}</div>}
        {t.notes && <p style={{ fontSize: 13, marginTop: 8 }}>{t.notes}</p>}
      </div>
      <div className="mono" style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', flexShrink: 0 }}>{fmtDate(t.performed_on)}</div>
    </div>
  )

  return (
    <>
      <PageHeader
        eyebrow="04 — Treatments & Events"
        title="The intervention log."
        subtitle="IV therapy, blood donations, peptides, procedures — and the events worth remembering."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: C.rule, border: `1px solid ${C.rule}`, marginBottom: 48 }}>
        <Stat label="Donations all-time" value={String(donations.length)} sub={donations[0] ? `Last: ${fmtDate(donations[0].performed_on)}` : undefined} />
        <Stat label="IV sessions" value={String(ivs.length)} />
        <Stat label="Other treatments" value={String(others.length)} />
        <Stat label="Logged events" value={String(data.events.length)} />
      </div>

      <section style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div className="label-eyebrow" style={{ color: C.terracotta }}>Hematocrit management</div>
            <h2 className="display" style={{ fontSize: 24, marginTop: 4 }}>Blood donations</h2>
          </div>
        </div>
        <div className="card" style={{ padding: 24, background: `linear-gradient(135deg, ${C.cream}, ${C.paper2}40)` }}>
          <p style={{ fontSize: 13, color: C.ink2, maxWidth: 640 }}>
            Donating blood is the standard non-pharmacological lever for elevated hematocrit on TRT.
            Quarterly cadence is what most TRT clinics target.
          </p>
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {donations.map(d => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', border: `1px solid ${C.rule}`, padding: 16, background: C.cream, borderRadius: 2 }}>
                <div>
                  <div className="display" style={{ fontSize: 18 }}>{d.name || 'Blood donation'}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{d.provider || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontSize: 18 }}>{fmtDate(d.performed_on, { year: undefined })}</div>
                  <div className="mono" style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase' }}>{new Date(d.performed_on).getFullYear()}</div>
                </div>
              </div>
            ))}
            {donations.length === 0 && <div style={{ color: C.muted, fontStyle: 'italic', fontSize: 13 }}>No donations logged yet.</div>}
          </div>
        </div>
      </section>

      <Section title="IV therapy" count={ivs.length}>{ivs.map(t => <TxRow key={t.id} t={t} />)}</Section>
      {others.length > 0 && <Section title="Other treatments" count={others.length}>{others.map(t => <TxRow key={t.id} t={t} />)}</Section>}

      <Section title="Health events" count={data.events.length}>
        {data.events.map(e => (
          <div key={e.id} className="card" style={{ padding: 20, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                  <h3 className="display" style={{ fontSize: 18 }}>{e.title}</h3>
                  {e.category && <span className="pill" style={{ background: C.paper2, color: C.ink2, border: `1px solid ${C.rule}` }}>{e.category}</span>}
                  {e.severity !== 'info' && (
                    <span className="pill" style={{
                      border: `1px solid ${(e.severity === 'major' || e.severity === 'critical') ? C.terracotta : C.amber}40`,
                      background: `${(e.severity === 'major' || e.severity === 'critical') ? C.terracotta : C.amber}10`,
                      color: (e.severity === 'major' || e.severity === 'critical') ? C.terracotta : C.amber
                    }}>{e.severity}</span>
                  )}
                </div>
                {e.description && <p style={{ fontSize: 13, marginTop: 8, color: C.ink2 }}>{e.description}</p>}
                {e.treatment_received && <p style={{ fontSize: 12, color: C.muted, marginTop: 8, fontStyle: 'italic' }}>Treatment: {e.treatment_received}</p>}
              </div>
              <div className="mono" style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', textAlign: 'right', flexShrink: 0 }}>
                <div>{fmtDate(e.event_date)}</div>
                {e.end_date && <div>→ {fmtDate(e.end_date)}</div>}
                {e.resolved && <div style={{ marginTop: 4, color: C.forest }}>RESOLVED</div>}
              </div>
            </div>
          </div>
        ))}
      </Section>
    </>
  )
}

// =====================================================================
// QUESTIONS
// =====================================================================
function Questions({ data, refresh }) {
  const [adding, setAdding] = useState(false)
  const [newQ, setNewQ] = useState({ question: '', context: '', priority: 2 })
  const [answeringId, setAnsweringId] = useState(null)
  const [answer, setAnswer] = useState('')

  const PRIORITY = {
    1: { label: 'High', color: C.terracotta },
    2: { label: 'Medium', color: C.amber },
    3: { label: 'Low', color: C.muted }
  }

  const open = data.questions.filter(q => q.status === 'open')
  const asked = data.questions.filter(q => q.status === 'asked')
  const answered = data.questions.filter(q => q.status === 'answered')

  const addQuestion = async () => {
    if (!newQ.question.trim()) return
    await db.insert('doctor_questions', {
      user_id: USER_ID,
      question: newQ.question,
      context: newQ.context || null,
      priority: newQ.priority,
      status: 'open'
    })
    setNewQ({ question: '', context: '', priority: 2 })
    setAdding(false)
    refresh()
  }

  const markAsked = async (id) => {
    await db.update('doctor_questions', `id=eq.${id}`, {
      status: 'asked',
      asked_on: new Date().toISOString().slice(0, 10)
    })
    refresh()
  }

  const recordAnswer = async (id) => {
    await db.update('doctor_questions', `id=eq.${id}`, {
      status: 'answered',
      answer,
      answered_on: new Date().toISOString().slice(0, 10)
    })
    setAnsweringId(null); setAnswer('')
    refresh()
  }

  const remove = async (id) => {
    if (!confirm('Delete this question?')) return
    await db.remove('doctor_questions', `id=eq.${id}`)
    refresh()
  }

  const QCard = ({ q }) => {
    const p = PRIORITY[q.priority] || PRIORITY[3]
    return (
      <div className="card" style={{ padding: 20, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <span className="pill" style={{ border: `1px solid ${p.color}40`, background: `${p.color}10`, color: p.color }}>{p.label}</span>
              {q.related_marker_codes && q.related_marker_codes.map(c => (
                <span key={c} className="mono" style={{ fontSize: 10, color: C.muted }}>#{c}</span>
              ))}
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.4 }}>{q.question}</p>
            {q.context && <p style={{ fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.55 }}>{q.context}</p>}
            {q.answer && (
              <div style={{ marginTop: 12, padding: 12, background: `${C.forest}08`, borderLeft: `2px solid ${C.forest}`, fontSize: 13 }}>
                <div className="label-eyebrow" style={{ color: C.forest, marginBottom: 4 }}>Answer · {fmtDate(q.answered_on)}</div>
                <p style={{ color: C.ink2 }}>{q.answer}</p>
              </div>
            )}
            {answeringId === q.id && (
              <div style={{ marginTop: 12 }}>
                <textarea className="input" rows={3} placeholder="What did the doctor say?" value={answer} onChange={e => setAnswer(e.target.value)} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={() => recordAnswer(q.id)}>Save answer</button>
                  <button className="btn btn-ghost" onClick={() => { setAnsweringId(null); setAnswer('') }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            {q.status === 'open' && (
              <button onClick={() => markAsked(q.id)} className="mono" style={{ fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', textAlign: 'right', fontFamily: 'inherit' }}>Mark asked →</button>
            )}
            {(q.status === 'open' || q.status === 'asked') && answeringId !== q.id && (
              <button onClick={() => setAnsweringId(q.id)} className="mono" style={{ fontSize: 11, color: C.amber, background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', textAlign: 'right', fontFamily: 'inherit' }}>Record answer →</button>
            )}
            <button onClick={() => remove(q.id)} className="mono" style={{ fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', textAlign: 'right', fontFamily: 'inherit' }}>Delete</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="05 — For Doctor"
        title="The question queue."
        subtitle="Items to bring up at the next appointment, with the context that prompted them."
        right={<button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={14} /> Add question</button>}
      />

      {adding && (
        <div className="card" style={{ padding: 24, marginBottom: 32 }}>
          <div className="label-eyebrow" style={{ marginBottom: 12 }}>New question</div>
          <input className="input" placeholder="The question to ask…" value={newQ.question} onChange={e => setNewQ({ ...newQ, question: e.target.value })} style={{ marginBottom: 12 }} />
          <textarea className="input" rows={3} placeholder="Context (why I'm asking, what data prompted it)…" value={newQ.context} onChange={e => setNewQ({ ...newQ, context: e.target.value })} style={{ marginBottom: 12 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="label-eyebrow">Priority</span>
            <select className="input" style={{ maxWidth: 160 }} value={newQ.priority} onChange={e => setNewQ({ ...newQ, priority: Number(e.target.value) })}>
              <option value={1}>High</option>
              <option value={2}>Medium</option>
              <option value={3}>Low</option>
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addQuestion}>Add</button>
            </div>
          </div>
        </div>
      )}

      {open.length > 0 && <Section title="Open" count={open.length}>{open.map(q => <QCard key={q.id} q={q} />)}</Section>}
      {asked.length > 0 && <Section title="Asked, awaiting answer" count={asked.length}>{asked.map(q => <QCard key={q.id} q={q} />)}</Section>}
      {answered.length > 0 && <Section title="Answered" count={answered.length} muted>{answered.map(q => <QCard key={q.id} q={q} />)}</Section>}
    </>
  )
}

// =====================================================================
// REPORTS
// =====================================================================
function buildReportHtml(flavor, data, topicCode) {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const css = `
    @page { size: letter; margin: 0.5in; }
    body { font-family: 'Inter Tight', -apple-system, sans-serif; color: #1A1815; margin: 0; }
    .header { background: #1A1815; color: #FAF7F0; padding: 16px 24px; margin: -0.5in -0.5in 24px; }
    .eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: #C9602B; font-weight: 700; }
    h1.report-title { font-family: 'Fraunces', Georgia, serif; font-size: 28px; margin: 6px 0 0; letter-spacing: -0.03em; font-weight: 600; }
    h2 { font-family: 'Fraunces', Georgia, serif; font-size: 18px; margin: 24px 0 8px; letter-spacing: -0.02em; border-bottom: 1px solid #D8D1C2; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 12px; }
    th { background: #1A1815; color: #FAF7F0; padding: 8px; text-align: left; font-weight: 600; }
    td { padding: 6px 8px; border-bottom: 1px solid #E0DAD0; }
    .flag-high { color: #C9602B; font-weight: 600; }
    .num { font-family: 'Fraunces', Georgia, serif; font-variant-numeric: tabular-nums; }
    .meta { font-size: 11px; color: #8B8579; margin-bottom: 24px; }
    .headline { display: flex; gap: 12px; padding: 12px 0; border-left: 3px solid #C9602B; padding-left: 16px; margin-bottom: 16px; }
    .headline-forest { border-left-color: #3B5D44; }
    .headline h3 { font-family: 'Fraunces', Georgia, serif; font-size: 16px; margin: 0 0 4px; }
    .headline p { margin: 0; font-size: 13px; line-height: 1.5; color: #36322B; }
    .simple { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px 16px; margin: 8px 0; font-size: 13px; align-items: baseline; }
    .simple .label { font-weight: 600; }
    .simple .v { font-family: 'Fraunces', Georgia, serif; font-size: 18px; font-weight: 600; text-align: right; }
    .simple .sub { color: #8B8579; font-style: italic; font-size: 12px; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #D8D1C2; font-size: 10px; color: #8B8579; text-align: center; }
    @media print { .no-print { display: none; } }
    .actions { position: fixed; top: 16px; right: 16px; display: flex; gap: 8px; z-index: 1000; }
    .actions button { padding: 8px 16px; background: #1A1815; color: #FAF7F0; border: none; border-radius: 2px; font-family: inherit; cursor: pointer; }
    .actions button.ghost { background: white; color: #1A1815; border: 1px solid #D8D1C2; }
  `

  let body = ''

  if (flavor === 'full_clinical') {
    const flagged = data.scorecard.filter(r => r.flag && /high|low|critical/i.test(r.flag))
    const featured = data.scorecard.filter(r =>
      ['hematocrit','hemoglobin','total_testosterone','free_testosterone','ldl_calc','total_cholesterol','alt','egfr','calcium','hba1c','psa','tsh'].includes(r.code)
    )
    const display = [...flagged, ...featured.filter(f => !flagged.find(g => g.code === f.code))]

    body = `
      <div class="header">
        <div class="eyebrow">ZAPP HEALTH · PERSONAL HEALTH LEDGER</div>
        <h1 class="report-title">Full Clinical Summary</h1>
      </div>
      <div class="meta">Generated ${today}</div>
      <h2>Patient</h2>
      <div style="font-size:13px; line-height:1.7;">
        <div><strong>Name:</strong> ${data.profile.full_name || ''}</div>
        <div><strong>DOB:</strong> ${data.profile.date_of_birth ? fmtDate(data.profile.date_of_birth) : '—'}</div>
        <div><strong>Doctor:</strong> ${data.profile.primary_doctor || '—'}</div>
        <div><strong>Clinic:</strong> ${data.profile.primary_clinic || '—'}</div>
      </div>
      <h2>Most-recent biomarker snapshot</h2>
      <table>
        <thead><tr><th>Marker</th><th>Latest</th><th>Unit</th><th>Reference</th><th>Date</th><th>Flag</th><th>Δ vs prev</th></tr></thead>
        <tbody>
          ${display.map(r => `
            <tr>
              <td>${r.display_name}</td>
              <td class="num"><strong>${r.value}</strong></td>
              <td>${r.unit || ''}</td>
              <td class="num">${fmtRange(r.lab_ref_low, r.lab_ref_high)}</td>
              <td>${fmtDate(r.collected_on)}</td>
              <td class="${r.flag && /high|low|critical/i.test(r.flag) ? 'flag-high' : ''}">${r.flag || ''}</td>
              <td>${r.pct_change != null ? `${r.pct_change > 0 ? '+' : ''}${r.pct_change}%` : ''}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <h2>Active medications &amp; supplements</h2>
      <table>
        <thead><tr><th>Name</th><th>Category</th><th>Dose</th><th>Frequency</th><th>Reason</th><th>Started</th></tr></thead>
        <tbody>
          ${data.activeMeds.map(m => `
            <tr>
              <td><strong>${m.name}</strong>${m.is_supplement ? ' <em>(supp)</em>' : ''}</td>
              <td>${m.category || ''}</td>
              <td class="num">${m.dose_amount || ''} ${m.dose_unit || ''}</td>
              <td>${m.frequency || ''}</td>
              <td>${m.reason || ''}</td>
              <td>${m.started_on ? fmtDate(m.started_on) : '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <h2>Recent treatments</h2>
      <table>
        <thead><tr><th>Date</th><th>Type</th><th>Name</th><th>Provider</th><th>Notes</th></tr></thead>
        <tbody>
          ${data.treatments.slice(0, 10).map(t => `
            <tr>
              <td>${fmtDate(t.performed_on)}</td>
              <td>${t.treatment_type.replace(/_/g, ' ')}</td>
              <td>${t.name || ''}</td>
              <td>${t.provider || ''}</td>
              <td>${t.notes || ''}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      ${data.events.length > 0 ? `
      <h2>Notable health events</h2>
      <table>
        <thead><tr><th>Date</th><th>Title</th><th>Severity</th><th>Description</th></tr></thead>
        <tbody>
          ${data.events.map(e => `
            <tr>
              <td>${fmtDate(e.event_date)}</td>
              <td><strong>${e.title}</strong></td>
              <td>${e.severity}</td>
              <td>${e.description || ''}</td>
            </tr>`).join('')}
        </tbody>
      </table>` : ''}
      ${data.questions.filter(q => q.status !== 'answered').length > 0 ? `
      <h2>Open questions for the doctor</h2>
      <table>
        <thead><tr><th style="width:60px;">Priority</th><th style="width:40%;">Question</th><th>Context</th></tr></thead>
        <tbody>
          ${data.questions.filter(q => q.status !== 'answered').map(q => `
            <tr>
              <td>${q.priority === 1 ? 'High' : q.priority === 2 ? 'Med' : 'Low'}</td>
              <td>${q.question}</td>
              <td style="color:#8B8579;">${q.context || ''}</td>
            </tr>`).join('')}
        </tbody>
      </table>` : ''}
      <h2>Appendix: full panel history</h2>
      ${data.panels.map(p => {
        const results = data.results.filter(r => r.panel_id === p.id)
        if (results.length === 0) return ''
        return `
          <h3 style="font-family:'Fraunces',serif;font-size:14px;margin:16px 0 4px;">Panel collected ${fmtDate(p.collected_on)}</h3>
          <div style="font-size:11px;color:#8B8579;margin-bottom:6px;">Lab: ${p.lab_name || '—'} · Provider: ${p.ordering_provider || '—'}${p.notes ? ' · ' + p.notes : ''}</div>
          <table>
            <thead><tr><th>Marker</th><th>Value</th><th>Unit</th><th>Reference</th><th>Flag</th></tr></thead>
            <tbody>
              ${results.map(r => {
                const m = data.markers.find(mm => mm.id === r.marker_id)
                return `<tr>
                  <td>${m?.display_name || r.marker_id}</td>
                  <td class="num"><strong>${r.value}</strong></td>
                  <td>${r.unit || m?.unit || ''}</td>
                  <td class="num">${m ? fmtRange(m.lab_ref_low, m.lab_ref_high) : '—'}</td>
                  <td class="${r.flag && /high|low|critical/i.test(r.flag) ? 'flag-high' : ''}">${r.flag || ''}</td>
                </tr>`
              }).join('')}
            </tbody>
          </table>
        `
      }).join('')}
    `
  }

  if (flavor === 'family_friendly') {
    body = `
      <div class="header">
        <div class="eyebrow">ZAPP HEALTH · PERSONAL HEALTH LEDGER</div>
        <h1 class="report-title">Health Update for Family</h1>
      </div>
      <div class="meta">${today}</div>
      <p style="font-style:italic;color:#36322B;font-size:14px;line-height:1.6;">
        A plain-language summary of how my health markers are trending — meant to keep you in the loop without all the medical jargon.
      </p>
      <h2>The headlines</h2>
      <div class="headline headline-forest"><div><h3>Weight is down significantly</h3><p>Down from 223 lbs to 201 lbs (–22 lbs), heading toward a 175 goal. The GLP-1 medication is doing real work, including improving cholesterol numbers along the way.</p></div></div>
      <div class="headline headline-forest"><div><h3>Cholesterol numbers improved a lot</h3><p>Total cholesterol dropped from 221 to 168 over the past 15 months. LDL ("bad") went from 135 down to 100 — still slightly above the optimal cutoff but a major improvement.</p></div></div>
      <div class="headline"><div><h3>Hematocrit is the main thing being managed</h3><p>Testosterone therapy is making blood thicker than ideal. Started donating blood at Hoxworth (first time April 5, 2026) to manage this — plan is quarterly going forward.</p></div></div>
      <div class="headline headline-forest"><div><h3>Recovered from December pancreatitis</h3><p>Hospitalized briefly in December 2025 for pancreatitis after a heavy bourbon stretch. Switched off bourbon/vodka. Doing well since.</p></div></div>
      <div class="headline"><div><h3>A few questions queued for the next doctor visit</h3><p>Specifically: whether to lower the testosterone dose given recent labs, whether to recheck kidney function, and whether to adjust the cholesterol medication.</p></div></div>
      <h2>Key numbers, simply</h2>
      <div class="simple"><span class="label">Weight</span><span class="v">201 lbs</span><span class="sub">down from 223 — goal 175</span></div>
      <div class="simple"><span class="label">Cholesterol (total)</span><span class="v">168</span><span class="sub">normal range under 200</span></div>
      <div class="simple"><span class="label">Blood sugar (A1c)</span><span class="v">6.0%</span><span class="sub">mildly elevated; watching it</span></div>
      <div class="simple"><span class="label">Hematocrit</span><span class="v">56.4%</span><span class="sub">high — managing with donations</span></div>
      <h2>Lifestyle wins</h2>
      <ul style="font-size:14px;line-height:1.7;color:#36322B;">
        <li>Off bourbon and vodka — beer and wine only now</li>
        <li>Fried food intake down ~90% (still room for buffalo wings)</li>
        <li>Started NAC supplement (liver support)</li>
        <li>Started giving blood at Hoxworth — quarterly plan</li>
        <li>Monthly IV therapy at Prime IV continues</li>
        <li>Quarterly massage and IV therapy at Elite Medspa</li>
      </ul>
    `
  }

  if (flavor === 'single_topic') {
    const marker = data.markers.find(m => m.code === topicCode)
    const points = data.markerHistory[topicCode] || []
    const latest = points[points.length - 1]
    body = `
      <div class="header">
        <div class="eyebrow">ZAPP HEALTH · PERSONAL HEALTH LEDGER</div>
        <h1 class="report-title">Single-topic deep dive: ${marker?.display_name || topicCode}</h1>
      </div>
      <div class="meta">${today}</div>
      <h2>Why this marker matters</h2>
      <p style="font-size:13px;line-height:1.6;">${marker?.why_it_matters || 'No description recorded.'}</p>
      <h2>Reference range &amp; latest</h2>
      <div style="font-size:13px;line-height:1.7;">
        <div><strong>Standard range:</strong> ${fmtRange(marker?.lab_ref_low, marker?.lab_ref_high)} ${marker?.unit || ''}</div>
        ${latest ? `
          <div><strong>Latest value:</strong> <span class="num">${latest.value}</span> ${marker?.unit || ''} on ${fmtDate(latest.date)}</div>
          ${latest.flag ? `<div class="flag-high"><strong>Flag:</strong> ${latest.flag}</div>` : ''}
        ` : ''}
      </div>
      <h2>Full history</h2>
      <table>
        <thead><tr><th>Date</th><th>Value</th><th>Unit</th><th>Flag</th><th>Δ vs prev</th></tr></thead>
        <tbody>
          ${points.map((p, i) => {
            const prev = i > 0 ? points[i - 1] : null
            const delta = prev ? `${(((p.value - prev.value) / prev.value) * 100).toFixed(1)}%` : ''
            return `
              <tr>
                <td>${fmtDate(p.date)}</td>
                <td class="num"><strong>${p.value}</strong></td>
                <td>${marker?.unit || ''}</td>
                <td class="${p.flag && /high|low|critical/i.test(p.flag) ? 'flag-high' : ''}">${p.flag || ''}</td>
                <td>${delta}</td>
              </tr>`
          }).join('')}
        </tbody>
      </table>
    `
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${flavor === 'full_clinical' ? 'Clinical Summary' : flavor === 'family_friendly' ? 'Family Update' : 'Single Topic'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<div class="actions no-print">
  <button onclick="window.print()">Save as PDF / Print</button>
  <button class="ghost" onclick="window.close()">Close</button>
</div>
${body}
<div class="footer">Generated by Zapp Health · ${today}</div>
</body>
</html>`
}

function Reports({ data, refresh }) {
  const [topicCode, setTopicCode] = useState('hematocrit')
  const [busy, setBusy] = useState(null)
  const [shareEmail, setShareEmail] = useState('')
  const [lastReport, setLastReport] = useState(null)

  const FLAVORS = [
    { id: 'full_clinical', title: 'Full clinical summary', sub: 'For the doctor',
      desc: 'Every panel, every result, every medication. Includes the open-question queue and a full appendix of historical lab values.' },
    { id: 'family_friendly', title: 'Health update for family', sub: 'For Katherine, your sister, anyone in the loop',
      desc: 'Plain-language headlines and lifestyle wins. No jargon, no overwhelming tables — just the picture and the direction of travel.' },
    { id: 'single_topic', title: 'Single-topic deep dive', sub: 'Pick one biomarker',
      desc: 'Full history of one marker with reference range, every recorded value, percent changes, and a visual trend.' }
  ]

  const generate = async (flavor) => {
    setBusy(flavor)
    try {
      const html = buildReportHtml(flavor, data, topicCode)
      const w = window.open('', '_blank')
      if (w) { w.document.write(html); w.document.close() }
      else {
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        window.location.href = url
      }
      const title = FLAVORS.find(f => f.id === flavor).title
      const filename = `zapp-health-${flavor === 'single_topic' ? topicCode : flavor}-${new Date().toISOString().slice(0,10)}.html`
      await db.insert('reports', {
        user_id: USER_ID,
        report_type: flavor,
        title,
        meta: flavor === 'single_topic' ? { topic: topicCode } : null
      })
      setLastReport({ title, filename, flavor })
      refresh()
    } catch (e) {
      alert('Report failed: ' + e.message)
    } finally {
      setBusy(null)
    }
  }

  const sendEmail = () => {
    if (!shareEmail || !lastReport) return
    const subj = encodeURIComponent(lastReport.title)
    const body = encodeURIComponent(
      `Hi,\n\nAttaching my latest health update — ${lastReport.title.toLowerCase()}.\n\n` +
      `(I just opened it in a new tab; I'll save as PDF and attach.)\n\n— Brad`
    )
    window.location.href = `mailto:${shareEmail}?subject=${subj}&body=${body}`
  }

  return (
    <>
      <PageHeader
        eyebrow="06 — Reports"
        title="Generate & share."
        subtitle="Three flavors of report. Each opens in a new tab where you can use your browser's 'Save as PDF' to export, then email or share."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48 }}>
        {FLAVORS.map(f => (
          <div key={f.id} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            <div className="label-eyebrow" style={{ color: f.id === 'full_clinical' ? C.ink : f.id === 'family_friendly' ? C.forest : C.amber }}>{f.sub}</div>
            <h3 className="display" style={{ fontSize: 22, marginTop: 4 }}>{f.title}</h3>
            <p style={{ fontSize: 13, color: C.muted, marginTop: 8, flex: 1, lineHeight: 1.55 }}>{f.desc}</p>
            {f.id === 'single_topic' && (
              <div style={{ marginTop: 16 }}>
                <div className="label-eyebrow">Pick a biomarker</div>
                <select className="input" value={topicCode} onChange={e => setTopicCode(e.target.value)} style={{ marginTop: 4 }}>
                  {data.markers.map(m => <option key={m.code} value={m.code}>{m.display_name}</option>)}
                </select>
              </div>
            )}
            <button className="btn btn-primary" onClick={() => generate(f.id)} disabled={busy === f.id} style={{ marginTop: 20, width: '100%' }}>
              {busy === f.id ? 'Building…' : 'Generate report'}
            </button>
          </div>
        ))}
      </div>

      {lastReport && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div className="label-eyebrow" style={{ color: C.amber }}>Just generated</div>
          <h3 className="display" style={{ fontSize: 20, marginTop: 4 }}>{lastReport.title}</h3>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>
            Opened in a new tab. Use the "Save as PDF" button there, or your browser's print dialog (Cmd/Ctrl-P → "Save as PDF").
            Then email it to whoever needs it.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <input className="input" type="email" placeholder="recipient@example.com" value={shareEmail} onChange={e => setShareEmail(e.target.value)} />
            <button className="btn btn-primary" disabled={!shareEmail} onClick={sendEmail} style={{ flexShrink: 0 }}>
              <Mail size={14} /> Open email draft
            </button>
          </div>
        </div>
      )}

      {data.reports.length > 0 && (
        <section>
          <h2 className="display" style={{ fontSize: 24, marginBottom: 16 }}>Recently generated</h2>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="zapp-table">
              <thead><tr><th>Title</th><th>Type</th><th>Generated</th></tr></thead>
              <tbody>
                {data.reports.map(r => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td className="mono" style={{ fontSize: 11, textTransform: 'uppercase', color: C.muted }}>{r.report_type.replace(/_/g, ' ')}</td>
                    <td className="mono" style={{ fontSize: 11, color: C.muted }}>{new Date(r.generated_on).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}

// =====================================================================
// PROFILE
// =====================================================================
function Profile({ data, refresh }) {
  const [form, setForm] = useState({
    full_name: data.profile.full_name || '',
    date_of_birth: data.profile.date_of_birth || '',
    sex: data.profile.sex || '',
    goal_weight_lbs: data.profile.goal_weight_lbs?.toString() || '',
    primary_doctor: data.profile.primary_doctor || '',
    primary_clinic: data.profile.primary_clinic || '',
    notes: data.profile.notes || ''
  })
  const [savedAt, setSavedAt] = useState(null)
  const [newWeight, setNewWeight] = useState('')

  const latestVitals = data.vitals[0]

  const save = async (e) => {
    e.preventDefault()
    await db.update('profiles', `id=eq.${USER_ID}`, {
      full_name: form.full_name,
      date_of_birth: form.date_of_birth || null,
      sex: form.sex || null,
      goal_weight_lbs: form.goal_weight_lbs ? Number(form.goal_weight_lbs) : null,
      primary_doctor: form.primary_doctor || null,
      primary_clinic: form.primary_clinic || null,
      notes: form.notes || null
    })
    setSavedAt(new Date())
    refresh()
  }

  const logWeight = async () => {
    if (!newWeight) return
    await db.insert('vitals_log', {
      user_id: USER_ID,
      recorded_on: new Date().toISOString().slice(0, 10),
      weight_lbs: Number(newWeight)
    })
    setNewWeight('')
    refresh()
  }

  return (
    <>
      <PageHeader
        eyebrow="07 — Profile"
        title="Your profile."
        subtitle="The basics. Updates here flow into reports automatically."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>
        <div className="card" style={{ padding: 24 }}>
          <div className="label-eyebrow">Latest weight</div>
          <div className="num" style={{ fontSize: 44, marginTop: 8, lineHeight: 1 }}>
            {latestVitals?.weight_lbs ?? '—'}<span style={{ fontSize: 14, color: C.muted, marginLeft: 4 }}>lbs</span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: C.muted, marginTop: 4, textTransform: 'uppercase' }}>
            {latestVitals?.recorded_on ? fmtDate(latestVitals.recorded_on) : ''}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <input className="input" type="number" step="0.1" placeholder="Log new weight" value={newWeight} onChange={e => setNewWeight(e.target.value)} />
            <button className="btn btn-primary" onClick={logWeight}>Log</button>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div className="label-eyebrow">Goal</div>
          <div className="num" style={{ fontSize: 44, marginTop: 8, lineHeight: 1 }}>
            {form.goal_weight_lbs || '—'}<span style={{ fontSize: 14, color: C.muted, marginLeft: 4 }}>lbs</span>
          </div>
          {latestVitals && form.goal_weight_lbs && (
            <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>
              {(latestVitals.weight_lbs - Number(form.goal_weight_lbs)).toFixed(1)} lbs to go
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div className="label-eyebrow">Mode</div>
          <div style={{ fontSize: 13, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={14} /> No-auth, single-user
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Anyone with this artifact can read & edit. Add auth when ready.</div>
        </div>
      </div>

      <form onSubmit={save} className="card" style={{ padding: 24, maxWidth: 720 }}>
        <h2 className="display" style={{ fontSize: 24, marginBottom: 24 }}>Profile details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <Field label="Full name"><input className="input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="Date of birth"><input className="input" type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></Field>
          <Field label="Sex">
            <select className="input" value={form.sex} onChange={e => setForm({ ...form, sex: e.target.value })}>
              <option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </Field>
          <Field label="Goal weight (lbs)"><input className="input" type="number" step="0.1" value={form.goal_weight_lbs} onChange={e => setForm({ ...form, goal_weight_lbs: e.target.value })} /></Field>
          <Field label="Primary doctor"><input className="input" value={form.primary_doctor} onChange={e => setForm({ ...form, primary_doctor: e.target.value })} /></Field>
          <Field label="Primary clinic / hospital"><input className="input" value={form.primary_clinic} onChange={e => setForm({ ...form, primary_clinic: e.target.value })} /></Field>
        </div>
        <div style={{ marginTop: 16 }}>
          <Field label="Notes"><textarea className="input" rows={4} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 24, borderTop: `1px solid ${C.rule}` }}>
          {savedAt && <span className="mono" style={{ fontSize: 11, color: C.forest }}>SAVED {savedAt.toLocaleTimeString()}</span>}
          <button className="btn btn-primary" type="submit" style={{ marginLeft: 'auto' }}><Save size={14} /> Save profile</button>
        </div>
      </form>
    </>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="label-eyebrow" style={{ marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

// =====================================================================
// BASELINE HELPERS
// =====================================================================
function computeBaselineEthanolPerDay(profile, drinkTypes) {
  const dt = (drinkTypes || []).find(t => t.id === profile?.baseline_drink_type_id)
  if (!dt) return 0
  const servOz = Number(dt.default_serving_oz) || 0
  const abv    = Number(dt.abv) || 0
  const n      = Number(profile?.baseline_servings) || 4
  return servOz * 29.5735 * (abv / 100) * 0.789 * n
}

function buildBaselinePicks(profile, drinkTypes) {
  const dt = (drinkTypes || []).find(t => t.id === profile?.baseline_drink_type_id)
  if (!dt) return []
  return [{
    drink_type_id: dt.id, name: dt.name,
    serving_oz: dt.default_serving_oz, abv: dt.abv,
    sugar_g: dt.sugar_g, carbs_g: dt.carbs_g, calories: dt.calories,
    qty: Number(profile?.baseline_servings) || 4
  }]
}

// =====================================================================
// INTAKE VS LABS CHART
// =====================================================================
const LAB_CFG = [
  { code: 'alt',           label: 'ALT',           unit: 'IU/L',  color: C.forest,     dash: undefined },
  { code: 'lipase',        label: 'Lipase',        unit: 'U/L',   color: '#7B3FA0',    dash: '5 3'     },
  { code: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL', color: C.terracotta, dash: '2 4'     },
]

const BASELINE_ETHANOL_G_PER_WEEK = 630 // Dec 2025 baseline

function isoWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function buildIntakeLabsData(alcoholLog, markerHistory, profile, drinkTypes) {
  const allDates = []
  for (const { code } of LAB_CFG)
    for (const pt of (markerHistory[code] || [])) allDates.push(pt.date)
  for (const row of (alcoholLog || [])) allDates.push(row.log_date)
  if (allDates.length === 0) return []

  allDates.sort()
  const earliestWeek = isoWeekStart(allDates[0])
  const todayStr     = new Date().toISOString().slice(0, 10)
  const todayWeek    = isoWeekStart(todayStr)

  const weeks = []
  const cur = new Date(earliestWeek + 'T00:00:00')
  const end = new Date(todayWeek   + 'T00:00:00')
  while (cur <= end) { weeks.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 7) }

  const map = {}
  for (const w of weeks) map[w] = { week: w, ethanolGLogged: 0, ethanolGAssumed: 0 }

  // Logged ethanol
  const loggedDateSet = new Set((alcoholLog || []).map(r => r.log_date))
  for (const row of (alcoholLog || [])) {
    const w = isoWeekStart(row.log_date)
    if (map[w]) map[w].ethanolGLogged += Number(row.total_ethanol_g || 0)
  }

  // Assumed ethanol for every non-logged day in the range
  const baselinePerDay = computeBaselineEthanolPerDay(profile, drinkTypes)
  const rangeStart = new Date(allDates[0] + 'T00:00:00')
  const rangeEnd   = new Date(todayStr + 'T00:00:00')
  for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
    const ds = d.toISOString().slice(0, 10)
    if (!loggedDateSet.has(ds)) {
      const w = isoWeekStart(ds)
      if (map[w]) map[w].ethanolGAssumed += baselinePerDay
    }
  }

  // Round
  for (const w of weeks) {
    map[w].ethanolGLogged  = Math.round(map[w].ethanolGLogged)
    map[w].ethanolGAssumed = Math.round(map[w].ethanolGAssumed)
  }

  // Lab data
  for (const { code } of LAB_CFG)
    for (const pt of (markerHistory[code] || [])) {
      const w = isoWeekStart(pt.date)
      if (map[w]) { map[w][code] = Math.round(Number(pt.value)); map[w][`${code}_date`] = pt.date }
    }

  return weeks.map(w => map[w])
}

function IntakeLabsChart({ alcoholLog, markerHistory, profile, drinkTypes }) {
  const chartData = useMemo(
    () => buildIntakeLabsData(alcoholLog, markerHistory, profile, drinkTypes),
    [alcoholLog, markerHistory, profile, drinkTypes]
  )

  if (chartData.length === 0) return (
    <div className="card" style={{ padding: 32, marginTop: 40, textAlign: 'center', color: C.muted, fontStyle: 'italic', fontSize: 14 }}>
      No intake or lab data yet.
    </div>
  )

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload || {}
    return (
      <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 2, padding: '10px 14px', fontSize: 12, fontFamily: 'Inter Tight', minWidth: 200 }}>
        <div className="mono" style={{ color: C.muted, fontSize: 10, marginBottom: 8, textTransform: 'uppercase' }}>
          Week of {fmtDate(label)}
        </div>
        {(d.ethanolGLogged > 0 || d.ethanolGAssumed > 0) && (
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: C.amber }}>▮</span>{' '}
            Ethanol: <span className="num" style={{ fontWeight: 600 }}>{(d.ethanolGLogged || 0) + (d.ethanolGAssumed || 0)}</span> g
            {d.ethanolGAssumed > 0 && (
              <span style={{ color: C.muted, fontSize: 10, marginLeft: 6 }}>
                ({d.ethanolGLogged || 0}g logged + {d.ethanolGAssumed}g assumed)
              </span>
            )}
          </div>
        )}
        {LAB_CFG.map(({ code, label: lbl, unit, color }) => d[code] != null && (
          <div key={code} style={{ marginBottom: 2 }}>
            <span style={{ color }}>●</span>{' '}
            {lbl}: <span className="num" style={{ fontWeight: 600 }}>{d[code]}</span> {unit}
            {d[`${code}_date`] && (
              <span style={{ color: C.muted, fontSize: 10, marginLeft: 4 }}>
                · {fmtDate(d[`${code}_date`])}
              </span>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 24, marginTop: 40 }}>
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.rule}` }}>
        <div className="label-eyebrow" style={{ color: C.amber }}>Intake vs. Labs</div>
        <h2 className="display" style={{ fontSize: 28, margin: '4px 0 0' }}>Ethanol load & biomarker trend.</h2>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.55 }}>
          Weekly ethanol in grams (bars, left axis) vs. ALT, Lipase, and Triglycerides over time (lines, right axis).
          Lab points connect across sparse weeks. Ethanol tracking started May 2026.
        </p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 16, right: 56, left: 8, bottom: 8 }}>
          <CartesianGrid stroke={C.rule} strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="week"
            tickFormatter={fmtDateShort}
            stroke={C.muted}
            tickLine={false}
            axisLine={{ stroke: C.rule }}
            minTickGap={56}
          />
          <YAxis
            yAxisId="ethanol"
            orientation="left"
            stroke={C.muted}
            tickLine={false}
            axisLine={{ stroke: C.rule }}
            width={52}
            tickFormatter={v => Math.round(v)}
            domain={[0, d => Math.max(d, 700)]}
          />
          <YAxis
            yAxisId="labs"
            orientation="right"
            stroke={C.muted}
            tickLine={false}
            axisLine={{ stroke: C.rule }}
            width={52}
            tickFormatter={v => Math.round(v)}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            yAxisId="ethanol" y={BASELINE_ETHANOL_G_PER_WEEK}
            stroke={C.muted} strokeDasharray="4 3"
            label={{ value: 'Dec 2025 baseline', position: 'insideTopLeft', fill: C.muted, fontSize: 10 }}
          />
          <ReferenceLine
            yAxisId="ethanol" y={196}
            stroke={C.forest} strokeDasharray="4 3"
            label={{ value: 'heavy-drinking line', position: 'insideTopLeft', fill: C.forest, fontSize: 10 }}
          />
          <Bar yAxisId="ethanol" dataKey="ethanolGLogged"  fill={`${C.amber}CC`} stackId="eth" radius={[0,0,0,0]} maxBarSize={20} />
          <Bar yAxisId="ethanol" dataKey="ethanolGAssumed" fill={`${C.amber}55`} stackId="eth" radius={[2,2,0,0]} maxBarSize={20} />
          {LAB_CFG.map(({ code, color, dash }) => (
            <Line
              key={code}
              yAxisId="labs"
              type="monotone"
              dataKey={code}
              stroke={color}
              strokeWidth={2}
              strokeDasharray={dash}
              dot={{ r: 4, fill: color, stroke: C.cream, strokeWidth: 1.5 }}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.rule}`, display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 11, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 14, height: 10, background: `${C.amber}CC`, borderRadius: 1 }} />
          <span className="mono" style={{ color: C.muted }}>Ethanol g/week (logged) · left axis</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 14, height: 10, background: `${C.amber}55`, borderRadius: 1, border: `1px dashed ${C.amber}88` }} />
          <span className="mono" style={{ color: C.muted }}>Ethanol g/week (assumed baseline) · left axis</span>
        </div>
        {LAB_CFG.map(({ code, label, unit, color, dash }) => (
          <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="26" height="12" style={{ overflow: 'visible', flexShrink: 0 }}>
              <line x1="2" y1="6" x2="24" y2="6" stroke={color} strokeWidth="2"
                strokeDasharray={dash || ''} />
              <circle cx="13" cy="6" r="3.5" fill={color} stroke={C.cream} strokeWidth="1.5" />
            </svg>
            <span className="mono" style={{ color: C.muted }}>{label} ({unit}) · right axis</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="26" height="8" style={{ flexShrink: 0 }}>
              <line x1="2" y1="4" x2="24" y2="4" stroke={C.muted} strokeWidth="1.5" strokeDasharray="4 3" />
            </svg>
            <span className="mono" style={{ color: C.muted }}>{BASELINE_ETHANOL_G_PER_WEEK} g · Dec 2025 baseline</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="26" height="8" style={{ flexShrink: 0 }}>
              <line x1="2" y1="4" x2="24" y2="4" stroke={C.forest} strokeWidth="1.5" strokeDasharray="4 3" />
            </svg>
            <span className="mono" style={{ color: C.muted }}>196 g · heavy-drinking line</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// PROGRESS VS 2025 BASELINE CHART
// =====================================================================
function buildProgressVsBaselineData(alcoholLog, markerHistory, profile, drinkTypes) {
  const weekly = buildIntakeLabsData(alcoholLog, markerHistory, profile, drinkTypes)
  const loggedWeeks = new Set((alcoholLog || []).map(r => isoWeekStart(r.log_date)))

  const rows = weekly
    .filter(w => loggedWeeks.has(w.week))
    .map(w => {
      const ethanolGrams = w.ethanolGLogged
      const pctVsBaseline = Math.round(
        ((ethanolGrams - BASELINE_ETHANOL_G_PER_WEEK) / BASELINE_ETHANOL_G_PER_WEEK) * 100
      )
      return { week: w.week, ethanolGrams, pctVsBaseline }
    })

  for (let i = 0; i < rows.length; i++) {
    if (i < 3) { rows[i].rollingAvgPct = null; continue }
    const slice = rows.slice(i - 3, i + 1)
    rows[i].rollingAvgPct = Math.round(slice.reduce((s, r) => s + r.pctVsBaseline, 0) / slice.length)
  }

  return rows
}

function ProgressVsBaselineChart({ alcoholLog, markerHistory, profile, drinkTypes }) {
  const rows = useMemo(
    () => buildProgressVsBaselineData(alcoholLog, markerHistory, profile, drinkTypes),
    [alcoholLog, markerHistory, profile, drinkTypes]
  )

  const header = (
    <div className="label-eyebrow" style={{ color: C.amber }}>Progress vs. 2025 Baseline</div>
  )

  if (rows.length === 0) return (
    <div className="card" style={{ padding: 24, marginTop: 24 }}>
      {header}
      <h2 className="display" style={{ fontSize: 28, margin: '4px 0 0' }}>Where you stand.</h2>
      <p style={{ fontSize: 13, color: C.muted, marginTop: 12, fontStyle: 'italic' }}>
        Log a few more weeks to see your trend line.
      </p>
    </div>
  )

  const hasRolling = rows.length >= 4
  const lastRow = rows[rows.length - 1]
  const headlinePct = hasRolling ? lastRow.rollingAvgPct : lastRow.pctVsBaseline
  const headlineGood = headlinePct <= 0
  const lineGood = lastRow.pctVsBaseline <= 0
  const lineColor = lineGood ? C.forest : C.terracotta

  const maxPct = Math.max(
    20,
    ...rows.map(r => r.pctVsBaseline),
    ...rows.map(r => r.rollingAvgPct).filter(v => v != null)
  )

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload || {}
    return (
      <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 2, padding: '10px 14px', fontSize: 12, fontFamily: 'Inter Tight', minWidth: 180 }}>
        <div className="mono" style={{ color: C.muted, fontSize: 10, marginBottom: 8, textTransform: 'uppercase' }}>
          Week of {fmtDate(label)}
        </div>
        <div style={{ marginBottom: 4 }}>
          Ethanol: <span className="num" style={{ fontWeight: 600 }}>{d.ethanolGrams}</span> g
        </div>
        <div>
          vs baseline: <span className="num" style={{ fontWeight: 600, color: d.pctVsBaseline <= 0 ? C.forest : C.terracotta }}>
            {d.pctVsBaseline > 0 ? '+' : ''}{d.pctVsBaseline}%
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 24, marginTop: 24 }}>
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.rule}` }}>
        {header}
        <h2 className="display" style={{ fontSize: 28, margin: '4px 0 0' }}>Where you stand.</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
          {headlineGood ? <TrendingDown size={28} color={C.forest} /> : <TrendingUp size={28} color={C.terracotta} />}
          <span className="display" style={{ fontSize: 36, color: headlineGood ? C.forest : C.terracotta }}>
            {headlinePct > 0 ? '+' : ''}{headlinePct}%
          </span>
        </div>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.55 }}>
          vs your Dec 2025 baseline of {BASELINE_ETHANOL_G_PER_WEEK} g ethanol/week. Lower is better.
        </p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={rows} margin={{ top: 16, right: 56, left: 8, bottom: 8 }}>
          <CartesianGrid stroke={C.rule} strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="week"
            tickFormatter={fmtDateShort}
            stroke={C.muted}
            tickLine={false}
            axisLine={{ stroke: C.rule }}
            minTickGap={56}
          />
          <YAxis
            stroke={C.muted}
            tickLine={false}
            axisLine={{ stroke: C.rule }}
            width={52}
            domain={[-100, maxPct]}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={0}
            stroke={C.muted} strokeDasharray="4 3"
            label={{ value: `2025 baseline (${BASELINE_ETHANOL_G_PER_WEEK}g/wk)`, position: 'insideTopLeft', fill: C.muted, fontSize: 10 }}
          />
          <Line
            type="monotone"
            dataKey="pctVsBaseline"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 4, fill: lineColor, stroke: C.cream, strokeWidth: 1.5 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          {hasRolling && (
            <Line
              type="monotone"
              dataKey="rollingAvgPct"
              stroke={`${lineColor}88`}
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.rule}`, display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 11, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="26" height="8" style={{ flexShrink: 0 }}>
            <line x1="2" y1="4" x2="24" y2="4" stroke={lineColor} strokeWidth="2" />
          </svg>
          <span className="mono" style={{ color: C.muted }}>Weekly % vs baseline</span>
        </div>
        {hasRolling && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="26" height="8" style={{ flexShrink: 0 }}>
              <line x1="2" y1="4" x2="24" y2="4" stroke={`${lineColor}88`} strokeWidth="2" strokeDasharray="5 3" />
            </svg>
            <span className="mono" style={{ color: C.muted }}>Trailing 4-week average</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="26" height="8" style={{ flexShrink: 0 }}>
            <line x1="2" y1="4" x2="24" y2="4" stroke={C.muted} strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
          <span className="mono" style={{ color: C.muted }}>0% · 2025 baseline ({BASELINE_ETHANOL_G_PER_WEEK}g/wk)</span>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// DRINKS TAB — ranking card (feature 1)
// =====================================================================
const TIER_META = {
  1:  { color: C.forest,     bg: `${C.forest}18`,     borderColor: `${C.forest}40`,     badge: 'TIER 1 · BEST'    },
  2:  { color: '#6E8A2A',    bg: 'rgba(110,138,42,.1)', borderColor: 'rgba(110,138,42,.3)', badge: 'TIER 2 · BEER'   },
  3:  { color: C.amber,      bg: `${C.amber}12`,      borderColor: `${C.amber}40`,      badge: 'TIER 3 · LIMIT'  },
  99: { color: C.terracotta, bg: `${C.terracotta}12`, borderColor: `${C.terracotta}40`, badge: 'OFF THE TABLE'    },
}

function RankingCard({ ranking }) {
  if (!ranking) {
    return (
      <div className="card" style={{ padding: 32, color: C.muted, fontStyle: 'italic', textAlign: 'center' }}>
        No ranking data yet.
      </div>
    )
  }
  const tiers = [...ranking.tiers].sort((a, b) => a.tier === 99 ? 1 : b.tier === 99 ? -1 : a.tier - b.tier)

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.rule}` }}>
        <div>
          <div className="label-eyebrow" style={{ color: C.amber }}>Current ranking · Edition {ranking.edition}</div>
          <h2 className="display" style={{ fontSize: 28, margin: '4px 0 0' }}>What to drink.</h2>
        </div>
        <div className="mono" style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', textAlign: 'right' }}>
          Ranked {fmtDate(ranking.ranked_on)}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        {tiers.map(tier => {
          const meta = TIER_META[tier.tier] || TIER_META[99]
          return (
            <div key={tier.tier} style={{ borderRadius: 2, border: `1px solid ${meta.borderColor}`, background: meta.bg, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${meta.borderColor}` }}>
                <span className="pill" style={{ background: meta.color, color: C.cream, border: 'none', fontSize: 10, letterSpacing: '0.12em' }}>{meta.badge}</span>
                <span style={{ fontSize: 13, color: meta.color, fontWeight: 500 }}>{tier.label}</span>
              </div>
              <div style={{ padding: '8px 0' }}>
                {tier.picks.map((pick, i) => (
                  <div key={i} style={{ padding: '8px 16px', display: 'flex', alignItems: 'baseline', gap: 16, borderBottom: i < tier.picks.length - 1 ? `1px solid ${meta.borderColor}60` : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{pick.brand}</span>
                      <span style={{ fontSize: 13, color: C.ink2, marginLeft: 8 }}>{pick.variety}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, maxWidth: 360, textAlign: 'right', lineHeight: 1.4 }}>{pick.why}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {ranking.rationale && (
        <div style={{ padding: 16, background: C.paper2, borderRadius: 2, borderLeft: `3px solid ${C.rule}` }}>
          <div className="label-eyebrow" style={{ marginBottom: 6 }}>Rationale</div>
          <p style={{ fontSize: 13, color: C.ink2, lineHeight: 1.6, margin: 0 }}>{ranking.rationale}</p>
        </div>
      )}

      {ranking.inputs_summary && (
        <div style={{ marginTop: 12, padding: '10px 16px', background: `${C.muted}08`, borderRadius: 2, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>Inputs: </span>
          {ranking.inputs_summary}
        </div>
      )}
    </div>
  )
}

// =====================================================================
// DRINK LOG FORM + LIST (feature 4)
// =====================================================================
const TODAY_ISO = new Date().toISOString().slice(0, 10)

function calcTotals(picks) {
  let ethanol = 0, std = 0, sugar = 0, carbs = 0, cal = 0
  for (const p of picks) {
    const servOz = Number(p.serving_oz) || 0
    const abv    = Number(p.abv)        || 0
    const g = servOz * 29.5735 * (abv / 100) * 0.789
    ethanol += g
    std     += g / 14
    sugar   += Number(p.sugar_g)  || 0
    carbs   += Number(p.carbs_g)  || 0
    cal     += Number(p.calories) || 0
  }
  return {
    total_ethanol_g:  Number(ethanol.toFixed(2)),
    total_std_drinks: Number(std.toFixed(2)),
    total_sugar_g:    Number(sugar.toFixed(2)),
    total_carbs_g:    Number(carbs.toFixed(2)),
    total_calories:   Number(cal.toFixed(0))
  }
}

// editEntry = existing log row to edit (null = create new)
// prefillDate = date to pre-select (defaults to today)
// prefillPicks = picks array to pre-load (from baseline or existing entry)
// defaultTypeId = baseline drink type id for the picker default
function DrinkLogForm({ drinkTypes, onSaved, onDeleted, editEntry, prefillDate, prefillPicks, defaultTypeId }) {
  const normPick = (p) => ({ ...p, qty: Number(p.qty ?? p.count ?? 1) })
  const [logDate, setLogDate] = useState(prefillDate || TODAY_ISO)
  const [picks, setPicks] = useState((prefillPicks || []).map(normPick))
  const [selectedType, setSelectedType] = useState(defaultTypeId || '')
  const [qty, setQty] = useState(1)
  const [context, setContext] = useState(editEntry?.context || '')
  const [water, setWater] = useState(editEntry?.water_glasses != null ? String(editEntry.water_glasses) : '')
  const [pain, setPain] = useState(editEntry?.abdominal_pain_0_10 != null ? String(editEntry.abdominal_pain_0_10) : '')
  const [backPain, setBackPain] = useState(!!editEntry?.back_pain)
  const [nausea, setNausea] = useState(!!editEntry?.nausea)
  const [painFatty, setPainFatty] = useState(!!editEntry?.pain_after_fatty_food)
  const [sugarCrash, setSugarCrash] = useState(!!editEntry?.sugar_crash)
  const [sleep, setSleep] = useState(editEntry?.sleep_quality_1_5 != null ? String(editEntry.sleep_quality_1_5) : '')
  const [energy, setEnergy] = useState(editEntry?.energy_next_am_1_5 != null ? String(editEntry.energy_next_am_1_5) : '')
  const [journal, setJournal] = useState(editEntry?.journal || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const isEditing = !!editEntry?.id

  const addPick = () => {
    const dt = drinkTypes.find(t => String(t.id) === String(selectedType))
    if (!dt) return
    const safeQty = Math.max(1, Number(qty) || 1)
    setPicks(prev => [...prev, {
      drink_type_id: dt.id, name: dt.name,
      serving_oz: dt.default_serving_oz, abv: dt.abv,
      sugar_g: dt.sugar_g, carbs_g: dt.carbs_g, calories: dt.calories,
      qty: safeQty
    }])
    setSelectedType(defaultTypeId || '')
    setQty(1)
  }

  const removePick = (i) => setPicks(prev => prev.filter((_, idx) => idx !== i))

  const totals = calcTotals(picks.flatMap(p => Array.from({ length: p.qty }, () => p)))

  const buildRow = () => ({
    user_id: USER_ID,
    log_date: logDate,
    drinks: picks,
    ...totals,
    context: context || null,
    water_glasses: water ? Number(water) : null,
    abdominal_pain_0_10: pain !== '' ? Number(pain) : null,
    back_pain: backPain || null,
    nausea: nausea || null,
    pain_after_fatty_food: painFatty || null,
    sugar_crash: sugarCrash || null,
    sleep_quality_1_5: sleep ? Number(sleep) : null,
    energy_next_am_1_5: energy ? Number(energy) : null,
    journal: journal || null
  })

  const save = async () => {
    if (picks.length === 0) return
    setSaving(true); setSaveError(null)
    try {
      if (isEditing) {
        await db.update('alcohol_log', `id=eq.${editEntry.id}`, buildRow())
      } else {
        await db.insert('alcohol_log', buildRow())
      }
      setSaved(true); setTimeout(() => setSaved(false), 2500)
      onSaved()
    } catch (err) {
      setSaveError(err.message || 'Save failed — check your entries and try again.')
    } finally { setSaving(false) }
  }

  const saveAF = async () => {
    setSaving(true); setSaveError(null)
    try {
      const zeroRow = {
        user_id: USER_ID, log_date: logDate, drinks: [],
        total_ethanol_g: 0, total_std_drinks: 0, total_sugar_g: 0, total_carbs_g: 0, total_calories: 0,
        context: context || null, water_glasses: water ? Number(water) : null,
        journal: journal || null
      }
      if (isEditing) {
        await db.update('alcohol_log', `id=eq.${editEntry.id}`, zeroRow)
      } else {
        await db.insert('alcohol_log', zeroRow)
      }
      setSaved(true); setTimeout(() => setSaved(false), 2500)
      onSaved()
    } catch (err) {
      setSaveError(err.message || 'Save failed.')
    } finally { setSaving(false) }
  }

  const deleteEntry = async () => {
    if (!isEditing) return
    setSaving(true)
    try {
      await db.remove('alcohol_log', `id=eq.${editEntry.id}`)
      onDeleted?.()
    } catch (err) {
      setSaveError(err.message || 'Delete failed.')
    } finally { setSaving(false); setConfirming(false) }
  }

  const categories = [...new Set(drinkTypes.map(t => t.category))].sort()

  return (
    <div className="card" style={{ padding: 24, marginBottom: 24, borderLeft: isEditing ? `3px solid ${C.amber}` : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="label-eyebrow">{isEditing ? `Editing entry — ${logDate}` : 'Log a day'}</div>
        {isEditing && (
          <div style={{ display: 'flex', gap: 8 }}>
            {!confirming
              ? <button onClick={() => setConfirming(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: C.terracotta, textDecoration: 'underline', fontFamily: 'inherit', letterSpacing: '0.04em' }}>Delete entry</button>
              : <>
                  <span style={{ fontSize: 11, color: C.terracotta }}>Sure?</span>
                  <button onClick={deleteEntry} disabled={saving} style={{ background: C.terracotta, color: C.cream, border: 'none', cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 2, fontFamily: 'inherit' }}>Yes, delete</button>
                  <button onClick={() => setConfirming(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: C.muted, fontFamily: 'inherit' }}>Cancel</button>
                </>
            }
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
        <Field label="Date">
          <input className="input" type="date" value={logDate} onChange={e => setLogDate(e.target.value)} style={{ width: 160 }} />
        </Field>
        <Field label="Drink">
          <select className="input" value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ width: 240 }}>
            <option value="">Pick a drink…</option>
            {categories.map(cat => (
              <optgroup key={cat} label={cat.replace(/_/g, ' ')}>
                {drinkTypes.filter(t => t.category === cat).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Qty">
          <input className="input" type="number" min={1} max={10} value={qty} onChange={e => setQty(Number(e.target.value))} style={{ width: 72 }} />
        </Field>
        <button className="btn btn-ghost" onClick={addPick} disabled={!selectedType} style={{ marginBottom: 1 }}>Add</button>
      </div>

      {picks.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {picks.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: `1px solid ${C.rule}60`, fontSize: 14 }}>
              <span style={{ flex: 1 }}>{p.qty > 1 && <span className="mono" style={{ marginRight: 6, color: C.amber }}>{p.qty}×</span>}{p.name}</span>
              <span className="mono" style={{ fontSize: 11, color: C.muted }}>
                {(calcTotals(Array.from({ length: p.qty }, () => p)).total_std_drinks).toFixed(1)} std · {Math.round(calcTotals(Array.from({ length: p.qty }, () => p)).total_calories)} kcal
              </span>
              <button onClick={() => removePick(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
            </div>
          ))}
          <div style={{ marginTop: 8, display: 'flex', gap: 20, fontSize: 12, color: C.muted }}>
            <span className="mono">{totals.total_std_drinks.toFixed(1)} std drinks</span>
            <span className="mono">{totals.total_ethanol_g.toFixed(0)} g ethanol</span>
            <span className="mono">{totals.total_carbs_g.toFixed(0)} g carbs</span>
            <span className="mono">{Math.round(totals.total_calories)} kcal</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
        <Field label="Context / occasion"><input className="input" placeholder="poker night, dinner…" value={context} onChange={e => setContext(e.target.value)} /></Field>
        <Field label="Water glasses"><input className="input" type="number" min={0} max={20} value={water} onChange={e => setWater(e.target.value)} /></Field>
        <Field label="Abdominal pain 0-10"><input className="input" type="number" min={0} max={10} value={pain} onChange={e => setPain(e.target.value)} /></Field>
        <Field label="Sleep quality 1-5"><input className="input" type="number" min={1} max={5} value={sleep} onChange={e => setSleep(e.target.value)} /></Field>
        <Field label="Energy next AM 1-5"><input className="input" type="number" min={1} max={5} value={energy} onChange={e => setEnergy(e.target.value)} /></Field>
        <Field label="Symptoms">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
            {[['Back pain', backPain, setBackPain], ['Nausea', nausea, setNausea], ['Pain after fatty food', painFatty, setPainFatty], ['Sugar crash', sugarCrash, setSugarCrash]].map(([lbl, val, set]) => (
              <label key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.ink2, cursor: 'pointer' }}>
                <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} />{lbl}
              </label>
            ))}
          </div>
        </Field>
      </div>
      <Field label="Journal note">
        <textarea className="input" rows={2} placeholder="How did it go?" value={journal} onChange={e => setJournal(e.target.value)} />
      </Field>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={save} disabled={saving || Number(picks.length) === 0 || !logDate}>
          {saving ? 'Saving…' : isEditing ? 'Update entry' : 'Save entry'}
        </button>
        <button className="btn btn-ghost" onClick={saveAF} disabled={saving || !logDate} style={{ fontSize: 13 }}>
          Log as alcohol-free day
        </button>
        {!saving && Number(picks.length) === 0 && (
          <span style={{ fontSize: 12, color: C.muted }}>Add a drink above, or log as alcohol-free</span>
        )}
        {!saving && Number(picks.length) > 0 && !logDate && (
          <span style={{ fontSize: 12, color: C.muted }}>Set a date first</span>
        )}
        {saved && <span className="mono" style={{ fontSize: 11, color: C.forest }}>SAVED</span>}
        {saveError && <span style={{ fontSize: 12, color: C.terracotta }}>{saveError}</span>}
      </div>
    </div>
  )
}

function DrinkDayList({ alcoholLog, profile, drinkTypes, onClickDay }) {
  const days = []
  const baselineEthanol = computeBaselineEthanolPerDay(profile, drinkTypes)
  const baselineDT = (drinkTypes || []).find(t => t.id === profile?.baseline_drink_type_id)
  const baselineServings = Number(profile?.baseline_servings) || 4

  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const date = d.toISOString().slice(0, 10)
    const entry = (alcoholLog || []).find(r => r.log_date === date)
    const isAssumed = !entry
    const ethanolG = isAssumed ? baselineEthanol : Number(entry.total_ethanol_g) || 0
    const isAFDay  = !isAssumed && ethanolG === 0
    days.push({ date, entry, isAssumed, ethanolG, isAFDay })
  }

  return (
    <div className="card" style={{ overflow: 'hidden', marginBottom: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 90px 80px 80px', padding: '10px 20px', borderBottom: `1px solid ${C.rule}`, background: 'rgba(237,231,219,0.4)' }}>
        {['Date', 'Drinks', 'Status', 'Ethanol', 'kcal'].map((h, i) => (
          <div key={h} className="label-eyebrow" style={{ textAlign: i > 1 ? 'right' : 'left' }}>{h}</div>
        ))}
      </div>
      {days.map(({ date, entry, isAssumed, ethanolG, isAFDay }) => {
        const drinks = Array.isArray(entry?.drinks) ? entry.drinks : []
        const rawNames = drinks.map(d => {
          const q = d.qty ?? d.count ?? 1
          return (q > 1 ? `${q}× ` : '') + (d.name || '')
        }).join(', ')
        const displayNames = isAssumed
          ? (baselineDT ? `${baselineServings}× ${baselineDT.name} (assumed)` : 'assumed baseline')
          : (rawNames || (isAFDay ? 'Alcohol-free day' : '—'))

        const rowBg = isAssumed ? 'rgba(201,96,43,0.03)' : isAFDay ? 'rgba(59,93,68,0.04)' : 'transparent'
        const textOpacity = isAssumed ? 0.5 : 1

        return (
          <div key={date}
            style={{ display: 'grid', gridTemplateColumns: '120px 1fr 90px 80px 80px', padding: '10px 20px', borderBottom: `1px solid ${C.rule}60`, fontSize: 13, alignItems: 'center', background: rowBg, cursor: 'pointer', opacity: textOpacity }}
            onClick={() => onClickDay?.(date, entry || null)}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(237,231,219,0.5)'; e.currentTarget.style.opacity = '1' }}
            onMouseLeave={e => { e.currentTarget.style.background = rowBg; e.currentTarget.style.opacity = String(textOpacity) }}
          >
            <div className="mono" style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase' }}>{fmtDate(date, { month: 'short', day: 'numeric' })}</div>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8, color: isAssumed ? C.muted : C.ink2, fontStyle: isAssumed ? 'italic' : 'normal' }}>{displayNames}</div>
            <div style={{ textAlign: 'right' }}>
              {isAFDay
                ? <span className="pill" style={{ background: `${C.forest}18`, color: C.forest, border: `1px solid ${C.forest}40`, fontSize: 9 }}>AF DAY</span>
                : isAssumed
                  ? <span className="pill" style={{ background: `${C.amber}15`, color: C.amber, border: `1px solid ${C.amber}40`, fontSize: 9 }}>ASSUMED</span>
                  : null
              }
            </div>
            <div className="mono" style={{ textAlign: 'right', fontSize: 12, color: C.muted }}>{Math.round(ethanolG)}g</div>
            <div className="mono" style={{ textAlign: 'right', fontSize: 12, color: C.muted }}>
              {isAssumed
                ? Math.round(baselineDT ? Number(baselineDT.calories) * baselineServings : 0)
                : entry?.total_calories != null ? Math.round(entry.total_calories) : '—'}
            </div>
          </div>
        )
      })}
      <div style={{ padding: '8px 20px', fontSize: 11, color: C.muted, fontStyle: 'italic' }}>
        Click any day to log or edit. Faded rows are assumed baseline (no explicit entry).
      </div>
    </div>
  )
}

// =====================================================================
// BASELINE EDITOR
// =====================================================================
function BaselineEditor({ profile, drinkTypes, onSaved }) {
  const [typeId, setTypeId] = useState(profile?.baseline_drink_type_id || '')
  const [servings, setServings] = useState(String(profile?.baseline_servings || 4))
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  const save = async () => {
    setSaving(true)
    try {
      await db.update('profiles', `id=eq.${USER_ID}`, {
        baseline_drink_type_id: typeId || null,
        baseline_servings: Number(servings) || 4
      })
      setSavedAt(new Date())
      onSaved()
    } finally { setSaving(false) }
  }

  const dt = (drinkTypes || []).find(t => t.id === typeId)
  const ethanolPerDay = dt
    ? (Number(dt.default_serving_oz) * 29.5735 * (Number(dt.abv) / 100) * 0.789 * (Number(servings) || 4)).toFixed(1)
    : '0'

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="label-eyebrow">Daily Drinking Baseline</div>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 4, marginBottom: 0, lineHeight: 1.5 }}>
            Days with no logged entry are assumed to be this amount. An explicit log (even 0 drinks) always overrides.
          </p>
        </div>
        {savedAt && <span className="mono" style={{ fontSize: 11, color: C.forest }}>SAVED</span>}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Field label="Drink type">
          <select className="input" value={typeId} onChange={e => setTypeId(e.target.value)} style={{ width: 220 }}>
            <option value="">None</option>
            {(drinkTypes || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Servings/day">
          <input className="input" type="number" min={0} max={20} value={servings} onChange={e => setServings(e.target.value)} style={{ width: 80 }} />
        </Field>
        <button className="btn btn-ghost" onClick={save} disabled={saving} style={{ marginBottom: 1 }}>
          {saving ? 'Saving…' : 'Save baseline'}
        </button>
        {dt && (
          <div style={{ fontSize: 12, color: C.muted, alignSelf: 'flex-end', paddingBottom: 2 }}>
            ≈ {ethanolPerDay}g/day · {Math.round(Number(ethanolPerDay) * 7)}g/wk assumed
          </div>
        )}
      </div>
    </div>
  )
}

// =====================================================================
// AF DAY COUNTER
// =====================================================================
function AFDayCounter({ alcoholLog }) {
  const thisWeekStart = isoWeekStart(new Date().toISOString().slice(0, 10))
  const thisWeekLogs  = (alcoholLog || []).filter(r => isoWeekStart(r.log_date) === thisWeekStart)
  const afCount = thisWeekLogs.filter(r => (Number(r.total_ethanol_g) || 0) === 0).length
  const target = 3
  const color = afCount >= target ? C.forest : afCount >= 1 ? C.amber : C.terracotta

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
      <div className="num" style={{ fontSize: 52, color, lineHeight: 1, minWidth: 48 }}>{afCount}</div>
      <div>
        <div className="label-eyebrow">This week — Alcohol-free days</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
          Target: {target}+ per week &nbsp;·&nbsp;{' '}
          {afCount >= target
            ? <span style={{ color: C.forest, fontWeight: 500 }}>On track</span>
            : <span style={{ color: C.amber }}>Need {target - afCount} more this week</span>}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Counted from explicitly logged 0-drink entries only.</div>
      </div>
    </div>
  )
}

// =====================================================================
// DRINKS TAB
// =====================================================================
function DrinksTab({ data, refresh }) {
  const { drinkRankings, alcoholLog, drinkTypes, profile } = data
  const [editing, setEditing] = useState(null)
  const formRef = useRef(null)
  const latestRanking = drinkRankings?.[0] || null

  const openDay = (date, entry) => {
    const normPick = (p) => ({ ...p, qty: Number(p.qty ?? p.count ?? 1) })
    if (entry) {
      setEditing({ entry, prefillDate: entry.log_date, prefillPicks: (entry.drinks || []).map(normPick) })
    } else {
      setEditing({ entry: null, prefillDate: date, prefillPicks: buildBaselinePicks(profile, drinkTypes) })
    }
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const handleSaved = () => { setEditing(null); refresh() }
  const handleDeleted = () => { setEditing(null); refresh() }
  const formKey = editing?.entry?.id || editing?.prefillDate || 'new'

  return (
    <>
      <PageHeader
        eyebrow="05 — Drinks"
        title="The drink guide."
        subtitle="Current ranking, daily log, and baseline tracking."
      />

      <IntakeLabsChart
        alcoholLog={alcoholLog}
        markerHistory={data.markerHistory}
        profile={profile}
        drinkTypes={drinkTypes}
      />

      <ProgressVsBaselineChart
        alcoholLog={alcoholLog}
        markerHistory={data.markerHistory}
        profile={profile}
        drinkTypes={drinkTypes}
      />

      <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <AFDayCounter alcoholLog={alcoholLog} />
          <BaselineEditor profile={profile} drinkTypes={drinkTypes} onSaved={refresh} />
        </div>

        <div ref={formRef}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div className="label-eyebrow">Daily log</div>
              <h2 className="display" style={{ fontSize: 24, marginTop: 4 }}>
                {editing ? 'Edit entry' : 'Log a day'}
              </h2>
            </div>
            {editing && (
              <button onClick={() => setEditing(null)} className="btn btn-ghost" style={{ fontSize: 13 }}>
                Cancel edit
              </button>
            )}
          </div>
          <DrinkLogForm
            key={formKey}
            drinkTypes={drinkTypes || []}
            editEntry={editing?.entry || null}
            prefillDate={editing?.prefillDate || TODAY_ISO}
            prefillPicks={editing?.prefillPicks || []}
            defaultTypeId={profile?.baseline_drink_type_id || ''}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        </div>

        <h3 className="display" style={{ fontSize: 20, marginBottom: 12 }}>Last 14 days</h3>
        <DrinkDayList
          alcoholLog={alcoholLog}
          profile={profile}
          drinkTypes={drinkTypes}
          onClickDay={openDay}
        />
      </div>

      <RankingCard ranking={latestRanking} />
    </>
  )
}

// =====================================================================
// BRIEFINGS TAB (feature 2)
// =====================================================================
function BriefingsTab({ data }) {
  const [expandedId, setExpandedId] = useState(null)
  const briefings = data.briefings || []
  const rankings = data.drinkRankings || []

  if (briefings.length === 0) {
    return (
      <>
        <PageHeader eyebrow="06 — Briefings" title="The briefing archive." subtitle="Weekly digests with reading lists and the active ranking." />
        <div className="card" style={{ padding: 32, color: C.muted, fontStyle: 'italic', textAlign: 'center' }}>No briefings yet.</div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="06 — Briefings"
        title="The briefing archive."
        subtitle="Weekly digests — research, reading, and which ranking was active."
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {briefings.map(b => {
          const isOpen = expandedId === b.id
          const linkedRanking = rankings.find(r => r.id === b.ranking_id)
          return (
            <div key={b.id} className="card" style={{ overflow: 'hidden' }}>
              <div
                onClick={() => setExpandedId(isOpen ? null : b.id)}
                style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 20 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(237,231,219,0.5)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span className="label-eyebrow" style={{ color: C.amber }}>Edition {b.edition}</span>
                    <span className="mono" style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase' }}>{fmtDate(b.briefing_date)}</span>
                    {linkedRanking && (
                      <span className="pill" style={{ background: `${C.forest}10`, color: C.forest, border: `1px solid ${C.forest}30`, fontSize: 10 }}>
                        Ranking Ed.{linkedRanking.edition}
                      </span>
                    )}
                  </div>
                  {b.summary && <p style={{ fontSize: 14, color: C.ink2, lineHeight: 1.55, margin: 0 }}>{b.summary}</p>}
                </div>
                <span style={{ fontSize: 16, color: C.muted, flexShrink: 0, marginTop: 2 }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {isOpen && (
                <div style={{ padding: '0 24px 24px', borderTop: `1px solid ${C.rule}` }}>
                  {b.reading_list && b.reading_list.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div className="label-eyebrow" style={{ marginBottom: 12 }}>Reading list</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {b.reading_list.map((item, i) => {
                          const isAcademic = item.kind === 'academic'
                          const badgeColor = isAcademic ? C.ink : C.muted
                          return (
                            <div key={i} style={{ padding: '12px 16px', background: C.paper2, borderRadius: 2, borderLeft: `3px solid ${isAcademic ? C.ink : C.rule}` }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: item.note ? 6 : 0 }}>
                                <span className="pill" style={{ background: isAcademic ? `${C.ink}10` : `${C.muted}10`, color: badgeColor, border: `1px solid ${badgeColor}30`, fontSize: 9, flexShrink: 0 }}>
                                  {isAcademic ? 'Academic' : 'Popular'}
                                </span>
                                <div style={{ minWidth: 0 }}>
                                  {item.url
                                    ? <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: C.ink, fontWeight: 500, textDecoration: 'underline', textDecorationColor: `${C.amber}60`, wordBreak: 'break-word' }}>{item.title}</a>
                                    : <span style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</span>
                                  }
                                  {item.source && <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>{item.source}</span>}
                                </div>
                              </div>
                              {item.note && <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5, paddingLeft: 2 }}>{item.note}</p>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {linkedRanking && (
                    <div style={{ marginTop: 16, padding: '10px 16px', background: `${C.forest}08`, borderRadius: 2, fontSize: 13, color: C.ink2, borderLeft: `3px solid ${C.forest}40` }}>
                      <span className="label-eyebrow" style={{ color: C.forest, marginRight: 8 }}>Active ranking</span>
                      Edition {linkedRanking.edition} — ranked {fmtDate(linkedRanking.ranked_on)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

// =====================================================================
// LOGIN SCREEN — email OTP (magic link). Session stored by supabase-js
// so the user only needs to click the link once; subsequent visits
// auto-restore the session from localStorage.
// =====================================================================
function LoginScreen() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const attempt = async () => {
    const addr = email.trim().toLowerCase()
    if (!addr) return
    setBusy(true)
    setErr(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: addr,
      options: { shouldCreateUser: false },
    })
    setBusy(false)
    if (error) {
      setErr(error.message || 'Sign-in failed — make sure this email is registered.')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="zapp-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <style>{STYLE}</style>
      <div className="card" style={{ padding: 40, maxWidth: 400, width: '100%', margin: '0 24px' }}>
        <div className="label-eyebrow" style={{ color: C.amber, marginBottom: 4 }}>Personal Health Ledger</div>
        <h1 className="display" style={{ fontSize: 44, lineHeight: 1, margin: '4px 0 28px' }}>
          Zapp<span style={{ color: C.amber }}>.</span>
        </h1>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Check your email</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
              A sign-in link was sent to <strong>{email}</strong>.
              Click it to open the app — no password needed.
            </div>
            <button
              className="btn btn-ghost"
              style={{ marginTop: 20, fontSize: 13 }}
              onClick={() => { setSent(false); setEmail('') }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <div className="label-eyebrow" style={{ marginBottom: 6 }}>Email</div>
              <input
                className="input"
                type="email"
                placeholder="your email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErr(null) }}
                onKeyDown={e => e.key === 'Enter' && !busy && attempt()}
                autoFocus
              />
            </div>
            {err && (
              <div style={{ marginBottom: 12, fontSize: 13, color: C.terracotta }}>{err}</div>
            )}
            <button
              className="btn btn-primary"
              onClick={attempt}
              disabled={!email.trim() || busy}
              style={{ width: '100%' }}
            >
              {busy ? 'Sending…' : 'Send sign-in link'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// =====================================================================
// ERROR BOUNDARY — catches render crashes and shows the error on screen
// instead of a blank white page.
// =====================================================================
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(err) { return { error: err } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', background: '#FAF7F0', minHeight: '100vh' }}>
          <div style={{ fontSize: 20, color: '#9B3522', marginBottom: 16 }}>Render error — please report this</div>
          <pre style={{ fontSize: 12, color: '#1A1815', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error.toString()}
            {'\n'}
            {this.state.error.stack}
          </pre>
          <button onClick={() => this.setState({ error: null })}
            style={{ marginTop: 16, padding: '8px 16px', background: '#1A1815', color: '#FAF7F0', border: 'none', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// =====================================================================
// WELLNESS CALENDAR
// =====================================================================
const CAT_CFG = {
  hoxworth:        { label: 'Hoxworth',           color: '#9B3522', bg: '#9B352212', icon: Droplets },
  prime_iv:        { label: 'Prime IV + Kat',     color: '#3B5D44', bg: '#3B5D4412', icon: Activity },
  prime_iv_travel: { label: 'Prime IV Travel',    color: '#3B5D44', bg: '#3B5D4412', icon: Activity },
  elite_medspa:    { label: 'Elite MedSpa',       color: '#C9602B', bg: '#C9602B12', icon: Sparkles },
  bom_dia:         { label: 'Bom Dia',            color: '#C9602B', bg: '#C9602B12', icon: Heart },
  labs:            { label: 'Fasting Labs',       color: '#1A1815', bg: '#1A181510', icon: FlaskConical },
  golf:            { label: 'Golf',               color: '#3B5D44', bg: '#3B5D4412', icon: TreePine },
  firepit_forest:  { label: 'Fire Pit + Forest',  color: '#3B5D44', bg: '#3B5D4412', icon: Flame },
  travel:          { label: 'Travel',             color: '#8B8579', bg: '#8B857912', icon: Plane },
  blackout:        { label: 'Keep Open',          color: '#9B3522', bg: '#9B352212', icon: Ban },
  liv_work:        { label: 'LIV IV at Work',     color: '#3B5D44', bg: '#3B5D4412', icon: Droplets },
  massage_chair:   { label: 'Massage Chair',      color: '#C9602B', bg: '#C9602B12', icon: Zap },
  date_night:      { label: 'Date Night',         color: '#C9602B', bg: '#C9602B12', icon: Heart },
  screening:       { label: 'Screening',          color: '#1A1815', bg: '#1A181510', icon: Stethoscope },
}

function TravelBand({ ev }) {
  const startStr = fmtDate(ev.date, { month: 'short', day: 'numeric' })
  const endStr = ev.endDate ? fmtDate(ev.endDate, { month: 'short', day: 'numeric' }) : null
  return (
    <div style={{
      background: `${C.muted}18`,
      border: `1px solid ${C.muted}40`,
      borderRadius: 2,
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 6,
    }}>
      <Plane size={14} color={C.muted} />
      <span style={{ fontWeight: 500, fontSize: 14, flex: 1 }}>{ev.title}</span>
      <span className="mono" style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>
        {startStr}{endStr ? ` – ${endStr}` : ''}
      </span>
    </div>
  )
}

function BlackoutBand({ ev }) {
  const dayStr = new Date(ev.date + 'T00:00:00')
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return (
    <div style={{
      background: `${C.terracotta}10`,
      border: `1px dashed ${C.terracotta}50`,
      borderRadius: 2,
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 6,
    }}>
      <Ban size={14} color={C.terracotta} />
      <span style={{ fontWeight: 500, fontSize: 14, flex: 1, color: C.terracotta }}>{ev.title}</span>
      <span className="mono" style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>{dayStr}</span>
    </div>
  )
}

function CalEventRow({ ev, today }) {
  const cfg = CAT_CFG[ev.category] || { label: ev.category, color: C.ink, bg: `${C.ink}10`, icon: Activity }
  const Icon = cfg.icon
  const isPast = ev.date < today
  const d = new Date(ev.date + 'T00:00:00')
  const isFriday = d.getDay() === 5
  const dayStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="card" style={{
      padding: '12px 16px',
      marginBottom: 6,
      opacity: isPast ? 0.52 : 1,
      borderLeft: `3px solid ${cfg.color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: cfg.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 1,
        }}>
          <Icon size={13} color={cfg.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.35 }}>{ev.title}</div>
          {ev.location && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={10} color={C.muted} />{ev.location}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {ev.isPTO && isFriday && (
              <span className="pill" style={{ background: `${C.amber}18`, color: C.amber, border: `1px solid ${C.amber}35` }}>PTO Fri</span>
            )}
            {ev.isPTO && !isFriday && (
              <span className="pill" style={{ background: `${C.amber}12`, color: C.amber, border: `1px solid ${C.amber}25` }}>PTO</span>
            )}
            {ev.isPizzaNight && (
              <span className="pill" style={{ background: `${C.terracotta}12`, color: C.terracotta, border: `1px solid ${C.terracotta}35` }}>Pizza Night</span>
            )}
            {ev.withKat && (
              <span className="pill" style={{ background: `${C.forest}10`, color: C.forest, border: `1px solid ${C.forest}25` }}>+ Kat</span>
            )}
            {ev.needsBooking && (
              <span className="pill" style={{ background: `${C.ink}08`, color: C.ink2, border: `1px solid ${C.rule}` }}>Needs booking</span>
            )}
            {ev.payer === 'prescription' && (
              <span className="pill" style={{ background: `${C.forest}10`, color: C.forest, border: `1px solid ${C.forest}25` }}>Rx</span>
            )}
          </div>
          {ev.notes && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6, fontStyle: 'italic', lineHeight: 1.45 }}>{ev.notes}</div>
          )}
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right', marginLeft: 8 }}>
          <div className="mono" style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>{dayStr}</div>
        </div>
      </div>
    </div>
  )
}

function CalMonthSection({ monthKey, events, today }) {
  const [yr, mo] = monthKey.split('-').map(Number)
  const monthLabel = new Date(yr, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const isPastMonth = monthKey < today.slice(0, 7)
  const travelEvs = events.filter(e => e.category === 'travel')
  const blackoutEvs = events.filter(e => e.category === 'blackout')
  const otherEvs = events.filter(e => e.category !== 'travel' && e.category !== 'blackout')

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 12,
        marginBottom: 12, paddingBottom: 8,
        borderBottom: `1px solid ${C.rule}`,
      }}>
        <h2 className="display" style={{ fontSize: 24, margin: 0, color: isPastMonth ? C.muted : C.ink }}>{monthLabel}</h2>
        <span className="mono" style={{ fontSize: 11, color: C.muted }}>
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
      </div>
      {travelEvs.map(e => <TravelBand key={e.id} ev={e} />)}
      {blackoutEvs.map(e => <BlackoutBand key={e.id} ev={e} />)}
      {otherEvs.map(e => <CalEventRow key={e.id} ev={e} today={today} />)}
    </section>
  )
}

function CalendarTab() {
  const today = new Date().toISOString().slice(0, 10)
  const [showPast, setShowPast] = useState(false)

  const grouped = useMemo(() => {
    const map = {}
    for (const ev of WELLNESS_EVENTS) {
      const key = ev.date.slice(0, 7)
      if (!map[key]) map[key] = []
      map[key].push(ev)
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.date.localeCompare(b.date))
    }
    return map
  }, [])

  const monthKeys = Object.keys(grouped).sort()
  const todayMonth = today.slice(0, 7)
  const upcomingKeys = monthKeys.filter(k => k >= todayMonth)
  const pastKeys = [...monthKeys.filter(k => k < todayMonth)].reverse()

  const nextDonation = WELLNESS_EVENTS
    .filter(e => e.category === 'hoxworth' && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  return (
    <div>
      <PageHeader
        eyebrow="Health & Wellness"
        title="Calendar"
        subtitle="Recovery, restoration, and performance — Jun 2026 through May 2027."
      />

      {/* Hoxworth cycle banner */}
      <div style={{
        background: `${C.terracotta}10`,
        border: `1px solid ${C.terracotta}30`,
        borderRadius: 2,
        padding: '12px 16px',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <Droplets size={16} color={C.terracotta} />
        <span style={{ fontSize: 13, color: C.terracotta, fontWeight: 500 }}>
          Hoxworth donation cycle rolling every ~3 months: donate, recover, labs 3 days later.
        </span>
        {nextDonation && (
          <span style={{ fontSize: 13, color: C.muted }}>
            Next: {fmtDate(nextDonation.date)}
          </span>
        )}
      </div>

      {/* Pending 2027 screenings */}
      <section style={{ marginBottom: 40 }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 12,
          marginBottom: 12, paddingBottom: 8,
          borderBottom: `1px solid ${C.rule}`,
        }}>
          <h2 className="display" style={{ fontSize: 24, margin: 0, color: C.muted }}>2027 Screenings</h2>
          <span className="mono" style={{ fontSize: 11, color: C.muted }}>date TBD</span>
        </div>
        <div style={{
          background: `${C.amber}08`,
          border: `1px dashed ${C.amber}40`,
          borderRadius: 2,
          padding: '14px 16px',
        }}>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, color: C.ink2 }}>
            <Stethoscope size={13} color={C.amber} />
            Assistant to schedule in early 2027 (dates TBD)
          </div>
          {PENDING_SCREENINGS_2027.map(s => (
            <div key={s.id} style={{ marginBottom: 10, paddingLeft: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{s.notes}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Legend */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6,
        marginBottom: 32, padding: '12px 16px',
        background: C.paper2, borderRadius: 2, border: `1px solid ${C.rule}`,
      }}>
        <div className="label-eyebrow" style={{ width: '100%', marginBottom: 4 }}>Legend</div>
        {Object.entries(CAT_CFG).filter(([k]) => k !== 'screening').map(([k, cfg]) => {
          const Icon = cfg.icon
          return (
            <span key={k} className="pill" style={{
              background: cfg.bg, color: cfg.color,
              border: `1px solid ${cfg.color}35`, gap: 5,
            }}>
              <Icon size={10} />{cfg.label}
            </span>
          )
        })}
        <span className="pill" style={{ background: `${C.amber}12`, color: C.amber, border: `1px solid ${C.amber}30` }}>PTO Fri</span>
        <span className="pill" style={{ background: `${C.terracotta}12`, color: C.terracotta, border: `1px solid ${C.terracotta}30` }}>Pizza Night</span>
        <span className="pill" style={{ background: `${C.forest}10`, color: C.forest, border: `1px solid ${C.forest}25` }}>+ Kat</span>
      </div>

      {/* Upcoming months */}
      {upcomingKeys.map(k => (
        <CalMonthSection key={k} monthKey={k} events={grouped[k]} today={today} />
      ))}

      {/* Past months */}
      {pastKeys.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 13, marginBottom: 24 }}
            onClick={() => setShowPast(p => !p)}
          >
            {showPast ? 'Hide' : 'Show'} past months ({pastKeys.length})
          </button>
          {showPast && pastKeys.map(k => (
            <CalMonthSection key={k} monthKey={k} events={grouped[k]} today={today} />
          ))}
        </div>
      )}
    </div>
  )
}

// =====================================================================
// MAIN APP — all hooks must be called before any conditional return
// =====================================================================
export default function App() {
  // ── ALL hooks declared first ─────────────────────────────────────
  const [tab, setTab] = useState('overview')
  const [markerCode, setMarkerCode] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  // Start authed if localStorage flag set AND supabase session exists (checked below).
  const [authed, setAuthed] = useState(false)

  // useMemo MUST be here — before any early return — or React throws
  // "Rendered more hooks than during the previous render" on auth state change
  const briefingDueDate = useMemo(() => {
    if (!data?.briefings?.length) return null
    const maxDate = data.briefings.reduce((m, b) => b.briefing_date > m ? b.briefing_date : m, data.briefings[0].briefing_date)
    const d = new Date(maxDate + 'T00:00:00')
    d.setDate(d.getDate() + 7)
    return d
  }, [data])

  const loadAll = async () => {
    try {
      setError(null)
      const [profile, scorecard, history, panels, results, markers, medications, doses, treatments, events, questions, vitals, reports, activeMeds, drinkRankings, briefings, alcoholLog, drinkTypes, healthInbox] = await Promise.all([
        db.select('profiles', { id: `eq.${USER_ID}` }),
        db.select('v_marker_scorecard', { user_id: `eq.${USER_ID}`, order: 'display_order' }),
        db.select('v_latest_marker_values', { user_id: `eq.${USER_ID}`, order: 'collected_on.asc' }),
        db.select('lab_panels', { user_id: `eq.${USER_ID}`, order: 'collected_on.desc' }),
        db.select('lab_results', {}),
        db.select('markers', { order: 'display_order' }),
        db.select('medications', { user_id: `eq.${USER_ID}` }),
        db.select('medication_doses', {}),
        db.select('treatments', { user_id: `eq.${USER_ID}`, order: 'performed_on.desc' }),
        db.select('health_events', { user_id: `eq.${USER_ID}`, order: 'event_date.desc' }),
        db.select('doctor_questions', { user_id: `eq.${USER_ID}`, order: 'priority.asc,created_at.desc' }),
        db.select('vitals_log', { user_id: `eq.${USER_ID}`, order: 'recorded_on.desc' }),
        db.select('reports', { user_id: `eq.${USER_ID}`, order: 'generated_on.desc', limit: 20 }),
        db.select('v_active_medications', { user_id: `eq.${USER_ID}` }),
        db.select('drink_rankings', { order: 'ranked_on.desc' }),
        db.select('briefings', { order: 'briefing_date.desc' }),
        db.select('alcohol_log', { user_id: `eq.${USER_ID}`, order: 'log_date.desc', limit: 60 }),
        db.select('drink_types', { order: 'category,name' }),
        db.select('health_inbox', { user_id: `eq.${USER_ID}`, order: 'received_at.desc', limit: 50 })
      ])

      const histByCode = {}
      for (const r of history) (histByCode[r.code] ||= []).push({ date: r.collected_on, value: Number(r.value) })

      const markerHistory = {}
      for (const r of results) {
        const panel = panels.find(p => p.id === r.panel_id)
        if (!panel) continue
        const m = markers.find(mm => mm.id === r.marker_id)
        if (!m) continue
        (markerHistory[m.code] ||= []).push({ date: panel.collected_on, value: Number(r.value), flag: r.flag })
      }
      for (const k of Object.keys(markerHistory)) markerHistory[k].sort((a, b) => a.date.localeCompare(b.date))

      setData({
        profile: profile[0] || {},
        scorecard, history: histByCode, markerHistory,
        panels, results, markers, medications, doses, treatments, events, questions, vitals, reports, activeMeds,
        drinkRankings, briefings, alcoholLog, drinkTypes, healthInbox: healthInbox || []
      })
    } catch (e) {
      console.error('Data load failed', e)
      setError(e.message)
    }
  }

  // On mount: restore session from supabase-js (covers magic-link callback
  // where the URL hash carries the access_token, and normal page reloads
  // where supabase-js auto-refreshes from localStorage).
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        localStorage.setItem(AUTH_KEY, '1')
        setAuthed(true)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(AUTH_KEY)
        setAuthed(false)
        setData(null)
      } else if (session) {
        localStorage.setItem(AUTH_KEY, '1')
        setAuthed(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (authed) loadAll() }, [authed])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem(AUTH_KEY)
    setAuthed(false)
    setData(null)
  }

  if (!authed) return <LoginScreen />

  if (error) {
    return (
      <div className="zapp-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16, padding: 32 }}>
        <style>{STYLE}</style>
        <div className="display" style={{ fontSize: 32, color: C.terracotta }}>Couldn't load data</div>
        <div className="mono" style={{ fontSize: 12, color: C.muted, maxWidth: 600, textAlign: 'center' }}>{error}</div>
        <button className="btn btn-primary" onClick={loadAll}>Try again</button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="zapp-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <style>{STYLE}</style>
        <span className="display" style={{ fontSize: 24, fontStyle: 'italic', color: C.muted }}>Loading your ledger…</span>
      </div>
    )
  }

  const briefingOverdue = briefingDueDate && new Date() >= briefingDueDate

  return (
    <div className="zapp-root" style={{ display: 'flex' }}>
      <style>{STYLE}</style>
      <Sidebar tab={tab} setTab={(t) => { setTab(t); setMarkerCode(null) }} profile={data.profile} onSignOut={handleSignOut} />
      <main style={{ flex: 1, minWidth: 0 }}>
        {briefingOverdue && !bannerDismissed && (
          <div style={{
            background: C.amber, color: C.cream, padding: '12px 48px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            fontSize: 14, fontWeight: 500, borderBottom: `1px solid ${C.terracotta}40`
          }}>
            <span>
              Weekly briefing due — open Claude and say{' '}
              <span className="mono" style={{ fontSize: 13, background: 'rgba(0,0,0,0.15)', padding: '1px 6px', borderRadius: 2 }}>
                run my briefing
              </span>
            </span>
            <button
              onClick={() => setBannerDismissed(true)}
              style={{ background: 'none', border: 'none', color: C.cream, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0, opacity: 0.8 }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 48px' }}>
          {tab === 'overview' && <Dashboard data={data} setTab={setTab} setMarkerCode={setMarkerCode} refresh={loadAll} />}
          {tab === 'markers' && <MarkersList data={data} setTab={setTab} setMarkerCode={setMarkerCode} />}
          {tab === 'marker_detail' && markerCode && <MarkerDetail data={data} code={markerCode} setTab={setTab} />}
          {tab === 'medications' && <Medications data={data} />}
          {tab === 'treatments' && <Treatments data={data} />}
          {tab === 'drinks' && <DrinksTab data={data} refresh={loadAll} />}
          {tab === 'briefings' && <BriefingsTab data={data} />}
          {tab === 'questions' && <Questions data={data} refresh={loadAll} />}
          {tab === 'reports' && <Reports data={data} refresh={loadAll} />}
          {tab === 'profile' && <Profile data={data} refresh={loadAll} />}
          {tab === 'calendar' && <CalendarTab />}
        </div>
      </main>
    </div>
  )
}
