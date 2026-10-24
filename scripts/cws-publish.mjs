// Upload a zip to the Chrome Web Store and publish it — waiting for the store to
// finish processing the upload in between.
//
// Why not `wxt submit` / publish-browser-extension for Chrome? Both call publish
// immediately after the upload PUT returns. For small packages that works, but our
// Chrome zip is ~55-80MB (bundled vocal model + ORT runtime) and the store answers
// the upload with uploadState=IN_PROGRESS, so the instant publish fails with
// "You may not publish this item yet as we are still processing your upload".
// This script polls the draft until uploadState=SUCCESS, then publishes.
//
// Usage:
//   node scripts/cws-publish.mjs <zip> [--publish-target default|trustedTesters]
//                                       [--dry-run] [--skip-publish] [--publish-only]
// Env (same names publish-browser-extension uses):
//   CHROME_EXTENSION_ID, CHROME_CLIENT_ID, CHROME_CLIENT_SECRET, CHROME_REFRESH_TOKEN
//   DRY_RUN=true  → same as --dry-run (only exchanges the refresh token)
import { readFileSync, existsSync, statSync } from 'node:fs'

const API = 'https://www.googleapis.com'
const POLL_MS = 10_000 // how often to re-check the draft while the store processes it
const PROCESS_TIMEOUT_MS = 15 * 60_000 // give up waiting for processing after this
const PUBLISH_RETRIES = 6 // extra retries if publish still says "processing"

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const opt = (name, fallback) => {
    const i = args.indexOf(name)
    return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}
const zip = args.find((a) => !a.startsWith('--') && a !== opt('--publish-target', ''))
const publishTarget = opt('--publish-target', 'default')
const dryRun = flag('--dry-run') || /^(1|true|yes)$/i.test(process.env.DRY_RUN ?? '')
const skipPublish = flag('--skip-publish')
const publishOnly = flag('--publish-only')

const env = (name) => {
    const v = process.env[name]
    if (!v) fail(`missing env ${name}`)
    return v
}
function fail(msg, detail) {
    console.error(`[cws-publish] ${msg}`)
    if (detail !== undefined)
        console.error(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2))
    process.exit(1)
}
const log = (msg) => console.log(`[cws-publish] ${msg}`)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getAccessToken() {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: env('CHROME_CLIENT_ID'),
            client_secret: env('CHROME_CLIENT_SECRET'),
            refresh_token: env('CHROME_REFRESH_TOKEN'),
            grant_type: 'refresh_token'
        })
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !body.access_token) fail(`token exchange failed: HTTP ${res.status}`, body)
    return body.access_token
}

async function cws(token, method, path, { body, headers } = {}) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'x-goog-api-version': '2', ...headers },
        body
    })
    const text = await res.text()
    let json
    try {
        json = JSON.parse(text)
    } catch {
        json = { raw: text }
    }
    return { ok: res.ok, status: res.status, json }
}

async function upload(token, itemId, zipPath) {
    const size = statSync(zipPath).size
    log(`uploading ${zipPath} (${(size / 1048576).toFixed(1)} MiB)`)
    const r = await cws(token, 'PUT', `/upload/chromewebstore/v1.1/items/${itemId}`, {
        body: readFileSync(zipPath),
        headers: { 'Content-Type': 'application/zip' }
    })
    if (!r.ok) fail(`upload failed: HTTP ${r.status}`, r.json)
    log(`upload accepted, uploadState=${r.json.uploadState}`)
    if (r.json.uploadState === 'FAILURE')
        fail('upload rejected by the store', r.json.itemError ?? r.json)
    return r.json
}

async function waitForProcessing(token, itemId) {
    const deadline = Date.now() + PROCESS_TIMEOUT_MS
    for (;;) {
        const r = await cws(token, 'GET', `/chromewebstore/v1.1/items/${itemId}?projection=DRAFT`)
        if (!r.ok) fail(`draft status check failed: HTTP ${r.status}`, r.json)
        const state = r.json.uploadState
        if (state === 'SUCCESS') {
            log(`draft processed (crxVersion ${r.json.crxVersion ?? '?'})`)
            return r.json
        }
        if (state === 'FAILURE')
            fail('store failed to process the upload', r.json.itemError ?? r.json)
        if (state === 'NOT_FOUND') fail('no draft found for this item', r.json)
        if (Date.now() > deadline)
            fail(
                `timed out after ${PROCESS_TIMEOUT_MS / 60000} min waiting for processing (state=${state})`
            )
        log(`store still processing (uploadState=${state}), re-checking in ${POLL_MS / 1000}s…`)
        await sleep(POLL_MS)
    }
}

async function publish(token, itemId) {
    for (let attempt = 1; ; attempt++) {
        const r = await cws(
            token,
            'POST',
            `/chromewebstore/v1.1/items/${itemId}/publish?publishTarget=${publishTarget}`
        )
        const stillProcessing = !r.ok && /still processing/i.test(JSON.stringify(r.json))
        if (stillProcessing && attempt <= PUBLISH_RETRIES) {
            log(
                `publish says the store is still processing; retry ${attempt}/${PUBLISH_RETRIES} in ${POLL_MS / 1000}s…`
            )
            await sleep(POLL_MS)
            continue
        }
        if (!r.ok) fail(`publish failed: HTTP ${r.status}`, r.json)
        const statuses = r.json.status ?? []
        const detail = r.json.statusDetail ?? []
        if (!statuses.every((s) => s === 'OK'))
            fail(`publish not accepted: ${statuses.join(', ')}`, detail)
        log(`published (target=${publishTarget}): ${detail.join(' ') || 'OK'}`)
        return r.json
    }
}

const itemId = env('CHROME_EXTENSION_ID')
if (!dryRun && !publishOnly) {
    if (!zip)
        fail(
            'usage: node scripts/cws-publish.mjs <zip> [--publish-target T] [--dry-run] [--skip-publish] [--publish-only]'
        )
    if (!existsSync(zip)) fail(`zip not found: ${zip}`)
}

log('getting an access token')
const token = await getAccessToken()
if (dryRun) {
    log('DRY RUN: credentials OK, skipped upload and publish')
    process.exit(0)
}
if (!publishOnly) await upload(token, itemId, zip)
await waitForProcessing(token, itemId)
if (skipPublish) {
    log('skipping publish (--skip-publish); the processed draft is in the developer dashboard')
    process.exit(0)
}
await publish(token, itemId)
