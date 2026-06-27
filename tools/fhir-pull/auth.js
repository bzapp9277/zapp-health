/**
 * SMART on FHIR standalone patient launch — OAuth2 + PKCE, public client
 * Manages token storage in .token.json for silent re-pulls.
 */
import { createServer } from 'http'
import { randomBytes, createHash } from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'

const __dir = dirname(fileURLToPath(import.meta.url))
const TOKEN_FILE = resolve(__dir, '.token.json')
const REDIRECT_URI = 'http://127.0.0.1:8765/callback'
const CALLBACK_PORT = 8765

const AUTH_URL = 'https://sehproxy.stelizabeth.com/arr-fhir/oauth2/authorize'
const TOKEN_URL = 'https://sehproxy.stelizabeth.com/arr-fhir/oauth2/token'
const FHIR_BASE = 'https://sehproxy.stelizabeth.com/arr-fhir/SEH/api/FHIR/R4'

// SMART scopes — request only the APIs registered in the Epic app.
// Procedure omitted: not in the initial set of registered APIs.
// Epic will only grant scopes the app was registered for; requesting extras
// causes the authorize request to fail rather than silently downscoping.
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

function generatePkce() {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

function loadStoredToken() {
  if (!existsSync(TOKEN_FILE)) return null
  try { return JSON.parse(readFileSync(TOKEN_FILE, 'utf8')) } catch { return null }
}

function saveToken(data) {
  writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), 'utf8')
}

async function doRefresh(refreshTok, clientId) {
  const res = await fetch(TOKEN_URL, {
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
      const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`)

      if (url.pathname !== '/callback') {
        res.writeHead(404)
        res.end()
        return
      }

      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const error = url.searchParams.get('error')

      const html = (msg, ok = true) => `<!DOCTYPE html>
<html><head><title>Zapp Health</title><style>
body{font-family:-apple-system,sans-serif;background:#FAF7F0;color:#1A1815;padding:48px;max-width:480px;margin:0 auto}
h2{font-family:Georgia,serif;font-size:28px;margin:0 0 16px;letter-spacing:-0.03em}
p{color:#8B8579;line-height:1.6}
</style></head><body>
<h2>${ok ? 'Authorized ✓' : 'Authorization failed'}</h2>
<p>${msg}</p>
</body></html>`

      server.close()

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end(html(`${error}: ${url.searchParams.get('error_description') || 'Unknown error'}`, false))
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

    // 5-minute timeout
    setTimeout(() => {
      server.close()
      reject(new Error('Timed out waiting for OAuth callback (5 minutes)'))
    }, 5 * 60 * 1000)
  })
}

async function doFullAuthFlow(clientId) {
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
    aud: FHIR_BASE,
  })

  const authorizeUrl = `${AUTH_URL}?${params}`

  console.log('Opening Epic MyChart in your browser...')
  console.log('(If it does not open automatically, paste this URL:)')
  console.log(authorizeUrl)
  openBrowser(authorizeUrl)
  console.log('\nWaiting for authorization (5-minute window)...')

  const code = await waitForCallback(state)

  // Exchange code for tokens
  const tokenRes = await fetch(TOKEN_URL, {
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
    // Surface the full body so we can tell "client_id not recognized" from
    // "invalid_grant" from network errors
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
      'Possible causes: client not yet distributed to production by Epic, ' +
      'or app not configured for standalone patient launch. ' +
      `Full token response: ${JSON.stringify(tok)}`
    )
  }

  console.log(`  Granted scopes: ${tok.scope ?? '(not reported)'}`)
  return { tok, patientId }
}

export async function getAccessToken() {
  const clientId = process.env.FHIR_CLIENT_ID
  const stored = loadStoredToken()

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
      const tok = await doRefresh(stored.refresh_token, clientId)
      const refreshed = {
        access_token: tok.access_token,
        refresh_token: tok.refresh_token || stored.refresh_token,
        patient_id: tok.patient || stored.patient_id,
        expires_at: Date.now() + (tok.expires_in || 3600) * 1000,
      }
      saveToken(refreshed)
      console.log('✓ Token refreshed.')
      return { accessToken: refreshed.access_token, patientId: refreshed.patient_id }
    } catch (err) {
      console.log('Token refresh failed, doing full auth flow:', err.message)
    }
  }

  // Full browser-based auth flow
  const { tok, patientId } = await doFullAuthFlow(clientId)
  const stored2 = {
    access_token: tok.access_token,
    refresh_token: tok.refresh_token ?? null,
    patient_id: patientId,
    expires_at: Date.now() + (tok.expires_in || 3600) * 1000,
  }
  saveToken(stored2)
  console.log('✓ Tokens saved to .token.json for future silent pulls.')

  return { accessToken: tok.access_token, patientId }
}
