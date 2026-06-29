/**
 * SMART on FHIR standalone patient launch — OAuth2 + PKCE, public client.
 * Supports FHIR_ENV=sandbox for Epic's non-production sandbox (separate client
 * ID, separate token file, separate endpoints) without touching production config.
 */
import { createServer } from 'http'
import { randomBytes, createHash } from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'

const __dir = dirname(fileURLToPath(import.meta.url))
const REDIRECT_URI = 'http://127.0.0.1:8765/callback'
const CALLBACK_PORT = 8765

// ── Environment-specific config ───────────────────────────────────────────────
// Production: St. Elizabeth Healthcare, Epic instance at sehproxy.stelizabeth.com
const PROD = {
  clientId:  () => process.env.FHIR_CLIENT_ID,
  authUrl:   'https://sehproxy.stelizabeth.com/arr-fhir/oauth2/authorize',
  tokenUrl:  'https://sehproxy.stelizabeth.com/arr-fhir/oauth2/token',
  fhirBase:  'https://sehproxy.stelizabeth.com/arr-fhir/SEH/api/FHIR/R4',
  tokenFile: resolve(__dir, '.token.json'),
}

// Sandbox: Epic's public non-production environment at fhir.epic.com
// Non-production client ID registered on open.epic.com for sandbox testing.
// Endpoints discovered from https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/.well-known/smart-configuration
const SANDBOX = {
  clientId:  () => 'e82e004c-84f9-4c8b-ba12-901e7192b70d',
  authUrl:   'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize',
  tokenUrl:  'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
  fhirBase:  'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
  tokenFile: resolve(__dir, '.token.sandbox.json'),
}

// SMART scopes requested for both environments
const SCOPES = [
  'openid',
  'fhirUser',
  'offline_access',
  'patient/Patient.read',
  'patient/Observation.read',
  'patient/Condition.read',
  'patient/MedicationRequest.read',
  'patient/AllergyIntolerance.read',
  'patient/Immunization.read',
  'patient/DiagnosticReport.read',
].join(' ')

// ── Helpers ───────────────────────────────────────────────────────────────────

function generatePkce() {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

function loadStoredToken(tokenFile) {
  if (!existsSync(tokenFile)) return null
  try { return JSON.parse(readFileSync(tokenFile, 'utf8')) } catch { return null }
}

function saveToken(tokenFile, data) {
  writeFileSync(tokenFile, JSON.stringify(data, null, 2), 'utf8')
}

async function doRefresh(refreshTok, tokenUrl, clientId) {
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshTok,
      client_id: clientId,
    }).toString(),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Token refresh failed (${res.status}): ${body}`)
  }
  return res.json()
}

function openBrowser(url) {
  const cmd = process.platform === 'win32'
    ? `cmd.exe /c start "" "${url}"`
    : process.platform === 'darwin'
    ? `open "${url}"`
    : `xdg-open "${url}"`
  exec(cmd)
}

function waitForCallback(expectedState) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${CALLBACK_PORT}`)

      if (url.pathname !== '/callback') {
        res.writeHead(404); res.end(); return
      }

      const code  = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const error = url.searchParams.get('error')

      const html = (msg, ok = true) => `<!DOCTYPE html>
<html><head><title>Zapp Health</title><style>
body{font-family:-apple-system,sans-serif;background:#FAF7F0;color:#1A1815;padding:48px;max-width:480px;margin:0 auto}
h2{font-family:Georgia,serif;font-size:28px;margin:0 0 16px;letter-spacing:-0.03em}
p{color:#8B8579;line-height:1.6}
</style></head><body>
<h2>${ok ? 'Authorized ✓' : 'Authorization failed'}</h2><p>${msg}</p>
</body></html>`

      server.close()

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end(html(`${error}: ${url.searchParams.get('error_description') || 'unknown'}`, false))
        reject(new Error(`OAuth error: ${error} — ${url.searchParams.get('error_description') || ''}`))
        return
      }

      if (state !== expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end(html('State mismatch — please try again.', false))
        reject(new Error('OAuth state mismatch (CSRF check failed)'))
        return
      }

      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(html('You can close this tab. The pull is running in your terminal.'))
      resolve(code)
    })

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${CALLBACK_PORT} is already in use. Close whatever is using it and try again.`))
      } else {
        reject(err)
      }
    })

    server.listen(CALLBACK_PORT, '127.0.0.1')

    setTimeout(() => {
      server.close()
      reject(new Error('Timed out waiting for OAuth callback (5 minutes)'))
    }, 5 * 60 * 1000)
  })
}

async function doFullAuthFlow(cfg) {
  const clientId = cfg.clientId()
  const { verifier, challenge } = generatePkce()
  const state = randomBytes(16).toString('hex')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    aud: cfg.fhirBase,
  })

  const authorizeUrl = `${cfg.authUrl}?${params}`

  console.log('Opening Epic MyChart in your browser...')
  console.log('(If it does not open automatically, paste this URL:)')
  console.log(authorizeUrl)
  openBrowser(authorizeUrl)
  console.log('\nWaiting for authorization (5-minute window)...')

  const code = await waitForCallback(state)

  const tokenRes = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier,
    }).toString(),
  })

  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    throw new Error(`Token exchange failed (${tokenRes.status}): ${text}`)
  }

  const tok = await tokenRes.json()
  if (!tok.access_token) {
    throw new Error(`Token response contained no access_token. Full response: ${JSON.stringify(tok)}`)
  }

  const patientId = tok.patient
  if (!patientId) {
    throw new Error(
      'Token response had no patient context (tok.patient missing). ' +
      'Ensure app is configured for standalone patient launch. ' +
      `Full token response: ${JSON.stringify(tok)}`
    )
  }

  console.log(`  Granted scopes: ${tok.scope ?? '(not reported)'}`)
  return { tok, patientId }
}

// ── Public export ─────────────────────────────────────────────────────────────

export async function getAccessToken() {
  const isSandbox = process.env.FHIR_ENV === 'sandbox'
  const cfg = isSandbox ? SANDBOX : PROD
  const clientId = cfg.clientId()

  if (!isSandbox && !clientId) {
    throw new Error('FHIR_CLIENT_ID not set in .env — required for production mode')
  }

  const stored = loadStoredToken(cfg.tokenFile)

  // Use valid cached access token
  if (stored?.access_token && stored.expires_at && Date.now() < stored.expires_at - 60_000) {
    console.log('Using cached access token (expires in ~' +
      Math.round((stored.expires_at - Date.now()) / 60_000) + ' min).')
    return { accessToken: stored.access_token, patientId: stored.patient_id }
  }

  // Try refresh token
  if (stored?.refresh_token) {
    console.log('Refreshing access token...')
    try {
      const tok = await doRefresh(stored.refresh_token, cfg.tokenUrl, clientId)
      const refreshed = {
        access_token: tok.access_token,
        refresh_token: tok.refresh_token || stored.refresh_token,
        patient_id: tok.patient || stored.patient_id,
        expires_at: Date.now() + (tok.expires_in || 3600) * 1000,
      }
      saveToken(cfg.tokenFile, refreshed)
      console.log('✓ Token refreshed.')
      return { accessToken: refreshed.access_token, patientId: refreshed.patient_id }
    } catch (err) {
      console.log('Token refresh failed, doing full auth flow:', err.message)
    }
  }

  // Full browser-based auth flow
  const { tok, patientId } = await doFullAuthFlow(cfg)
  const stored2 = {
    access_token: tok.access_token,
    refresh_token: tok.refresh_token ?? null,
    patient_id: patientId,
    expires_at: Date.now() + (tok.expires_in || 3600) * 1000,
  }
  saveToken(cfg.tokenFile, stored2)
  console.log(`✓ Tokens saved to ${isSandbox ? '.token.sandbox.json' : '.token.json'} for future silent pulls.`)

  return { accessToken: tok.access_token, patientId }
}

// Expose config for index.js to read FHIR base URL
export function getFhirBase() {
  return process.env.FHIR_ENV === 'sandbox'
    ? SANDBOX.fhirBase
    : PROD.fhirBase
}
