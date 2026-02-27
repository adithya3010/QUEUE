/**
 * SmartQueue — Complete API Test Suite
 * Covers all endpoints documented at /docs + Swagger playground.
 * Runs fully self-contained: provisions admin → doctor → API key → B2B resources.
 *
 * Usage:  node backend/test-all-endpoints.js
 * Output: backend/test-results-<timestamp>.txt
 *
 * Requirements: server running on localhost:5000, Node 18+
 */

const fs   = require('fs');
const path = require('path');

const BASE_URL  = process.env.API_URL || 'http://localhost:5000';
const TIMESTAMP = Date.now();
const PREFIX    = `tst_${TIMESTAMP}`;  // unique prefix — prevents email collisions on re-runs

// ── Provisioned resource IDs (populated during setup) ──────────────────────
const S = {
  accessToken         : null,   // admin JWT (Bearer)
  adminTokenCookie    : null,   // adminToken cookie value  (fallback)
  doctorTokenCookie   : null,   // doctor JWT cookie (token=...)
  apiKey              : null,   // B2B sq_test_... key
  doctorId            : null,
  hospitalId          : null,
  // B2B resources
  queueUniqueId       : null,   // uniqueLinkId of q1 (used for priority/notes/status)
  cancelQueueUniqueId : null,   // uniqueLinkId of q2 (used for DELETE)
  appointmentId1      : null,   // appointment to arrive
  appointmentIdCancel : null,   // appointment to cancel
};

// ── Result store ───────────────────────────────────────────────────────────
const results = [];
let passed = 0, failed = 0, skipped = 0;
let currentSection = '';

// ── Helpers ────────────────────────────────────────────────────────────────

function print(msg) { process.stdout.write(msg + '\n'); }

function section(name) {
  currentSection = name;
  print(`\n${'═'.repeat(65)}`);
  print(`  ${name}`);
  print('═'.repeat(65));
}

/** Build Authorization header for admin endpoints */
function adminH(extra = {}) {
  return S.accessToken
    ? { 'Authorization': `Bearer ${S.accessToken}`, ...extra }
    : { 'Cookie': `adminToken=${S.adminTokenCookie}`, ...extra };
}

/** Build Cookie header for doctor endpoints */
function doctorH(extra = {}) {
  return { 'Cookie': `token=${S.doctorTokenCookie}`, ...extra };
}

/** Build x-api-key header for B2B endpoints */
function apiH(extra = {}) {
  return { 'x-api-key': S.apiKey, ...extra };
}

/** Today's date as YYYY-MM-DD */
function today() { return new Date().toISOString().split('T')[0]; }

/** N days from now as ISO string */
function futureISO(days) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

/**
 * Run a single API test.
 * @param {string}   name            Human-readable test label
 * @param {string}   method          HTTP method
 * @param {string}   urlPath         Path (appended to BASE_URL)
 * @param {object}   opts
 * @param {object}   opts.body       Request body (JSON)
 * @param {object}   opts.headers    Extra headers
 * @param {number|number[]} opts.expect  Accepted HTTP status code(s) — default 200
 * @param {boolean}  opts.skip       If true, skip this test
 * @param {Function} opts.extract    (responseData) => void — extract data into S
 * @param {string}   opts.note       Contextual note written to report
 */
async function test(name, method, urlPath, opts = {}) {
  const {
    body    = null,
    headers = {},
    expect  = 200,
    skip    = false,
    extract = null,
    note    = null,
  } = opts;

  const accepted = Array.isArray(expect) ? expect : [expect];

  // ── Skip ──
  if (skip) {
    skipped++;
    results.push({ section: currentSection, name, method, urlPath, status: 'SKIP',
                   responseCode: null, accepted, responseBody: null, note: 'Prerequisite missing' });
    print(`  ⏩ SKIP   ${method.padEnd(6)} ${urlPath}`);
    return null;
  }

  // ── Execute ──
  const fetchOpts = {
    method,
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...headers },
  };
  if (body) fetchOpts.body = JSON.stringify(body);

  let statusCode = 0, responseData = null, fetchError = null;
  try {
    const res = await fetch(`${BASE_URL}${urlPath}`, fetchOpts);
    statusCode = res.status;
    const rawText = await res.text();
    try { responseData = JSON.parse(rawText); }
    catch { responseData = { _raw: rawText.slice(0, 400) }; }
  } catch (err) {
    fetchError = err.message;
  }

  // ── Evaluate ──
  const pass   = accepted.includes(statusCode);
  const status = pass ? 'PASS' : 'FAIL';
  if (pass) passed++; else failed++;

  const icon = pass ? '✅' : '❌';
  const acceptStr = accepted.length === 1 ? `${accepted[0]}` : `[${accepted.join('|')}]`;
  print(`  ${icon} ${status}  [${String(statusCode).padStart(3)}]  ${method.padEnd(6)} ${urlPath}`);
  if (!pass) {
    print(`         Expected: ${acceptStr}  |  Got: ${statusCode}`);
    if (responseData) print(`         Body: ${JSON.stringify(responseData).slice(0, 220)}`);
  }
  if (fetchError) print(`         ⚠ Fetch error: ${fetchError}`);

  results.push({ section: currentSection, name, method, urlPath, status,
                 responseCode: statusCode, accepted, responseBody: responseData,
                 note, fetchError });

  // ── Extract ──
  if (extract && responseData && pass) {
    try { extract(responseData); }
    catch (e) { print(`         ⚠ Extract failed: ${e.message}`); }
  }

  return responseData;
}

// ── Capture Set-Cookie from response ──────────────────────────────────────
async function fetchWithCookieCapture(urlPath, body) {
  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method  : 'POST',
    headers : { 'Content-Type': 'application/json' },
    body    : JSON.stringify(body),
  });
  const setCookie = res.headers.get('set-cookie') || '';
  const data      = await res.json().catch(() => ({}));
  return { status: res.status, data, setCookie };
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════
async function run() {
  const startMs = Date.now();
  print('\n' + '═'.repeat(65));
  print('  SMARTQUEUE — COMPLETE API TEST SUITE');
  print(`  Started : ${new Date().toISOString()}`);
  print(`  Base URL: ${BASE_URL}`);
  print(`  Prefix  : ${PREFIX}`);
  print('═'.repeat(65));

  // ──────────────────────────────────────────────────────────────────────────
  section('SECTION 1 — Admin Auth  (/api/admin/*)');
  // ──────────────────────────────────────────────────────────────────────────

  await test('POST /admin/signup — create hospital admin', 'POST', '/api/admin/signup', {
    body    : { hospitalName: `${PREFIX} Hospital`, name: 'Test Admin',
                email: `admin_${TIMESTAMP}@testsmartqueue.com`, password: 'TestPass123!' },
    expect  : 200,
    extract : d => {
      S.hospitalId = d.admin?.hospitalId;
      print(`         → hospitalId: ${S.hospitalId}`);
    },
  });

  // Capture cookie + accessToken together
  {
    const { status, data, setCookie } = await fetchWithCookieCapture('/api/admin/login', {
      email: `admin_${TIMESTAMP}@testsmartqueue.com`, password: 'TestPass123!',
    });
    const pass = status === 200;
    if (pass) passed++; else failed++;
    const icon = pass ? '✅' : '❌';
    print(`  ${icon} ${pass ? 'PASS' : 'FAIL'}  [${status}]  POST   /api/admin/login`);
    S.accessToken = data.accessToken;
    const cookieMatch = setCookie.match(/(?:^|,\s*)adminToken=([^;,]+)/);
    S.adminTokenCookie = cookieMatch ? cookieMatch[1] : null;
    print(`         → accessToken : ${S.accessToken ? S.accessToken.slice(0, 30) + '…' : 'MISSING'}`);
    results.push({ section: currentSection, name: 'POST /admin/login — get accessToken',
                   method: 'POST', urlPath: '/api/admin/login', status: pass ? 'PASS' : 'FAIL',
                   responseCode: status, accepted: [200], responseBody: data, note: null });
  }

  await test('GET /admin/info — admin profile', 'GET', '/api/admin/info', {
    headers : adminH(),
    expect  : 200,
    skip    : !S.accessToken,
  });

  // ──────────────────────────────────────────────────────────────────────────
  section('SECTION 2 — Admin Staff  (/api/admin/staff/*)');
  // ──────────────────────────────────────────────────────────────────────────

  await test('POST /admin/staff/doctor — create doctor', 'POST', '/api/admin/staff/doctor', {
    headers : adminH(),
    body    : { name: 'Dr. Test', email: `doctor_${TIMESTAMP}@testsmartqueue.com`,
                specialization: 'Cardiology', password: 'DoctorPass123!' },
    expect  : 200,
    skip    : !S.accessToken,
    extract : d => {
      S.doctorId = d.doctor?.id;
      print(`         → doctorId: ${S.doctorId}`);
    },
  });

  await test('POST /admin/staff/receptionist — create receptionist', 'POST', '/api/admin/staff/receptionist', {
    headers : adminH(),
    body    : { name: 'Test Receptionist', email: `recep_${TIMESTAMP}@testsmartqueue.com`,
                password: 'RecepPass123!', assignedDoctors: S.doctorId ? [S.doctorId] : [] },
    expect  : 200,
    skip    : !S.accessToken || !S.doctorId,
  });

  await test('GET /admin/staff — list staff', 'GET', '/api/admin/staff', {
    headers : adminH(),
    expect  : 200,
    skip    : !S.accessToken,
  });

  // ──────────────────────────────────────────────────────────────────────────
  section('SECTION 3 — Setup: API Key + Doctor Login');
  // ──────────────────────────────────────────────────────────────────────────

  await test('POST /hospitals/keys — generate B2B API key', 'POST', '/api/hospitals/keys', {
    headers : adminH(),
    body    : { name: `${PREFIX} Key`, isLive: false },
    expect  : 201,
    skip    : !S.accessToken,
    extract : d => {
      S.apiKey = d.key;
      print(`         → apiKey: ${S.apiKey ? S.apiKey.slice(0, 24) + '…' : 'MISSING'}`);
    },
  });

  // Doctor login — capture cookie from Set-Cookie header
  {
    const { status, data, setCookie } = await fetchWithCookieCapture('/api/auth/login', {
      email: `doctor_${TIMESTAMP}@testsmartqueue.com`, password: 'DoctorPass123!',
    });
    const skip = !S.doctorId;
    if (skip) { skipped++; print(`  ⏩ SKIP   POST   /api/auth/login  (doctor)`); }
    else {
      const pass = status === 200;
      if (pass) passed++; else failed++;
      print(`  ${pass ? '✅' : '❌'} ${pass ? 'PASS' : 'FAIL'}  [${status}]  POST   /api/auth/login  (doctor)`);
      const match = setCookie.match(/(?:^|,\s*)token=([^;,]+)/);
      S.doctorTokenCookie = match ? match[1] : null;
      print(`         → doctor token cookie: ${S.doctorTokenCookie ? 'captured' : 'MISSING'}`);
      results.push({ section: currentSection, name: 'POST /auth/login — doctor login',
                     method: 'POST', urlPath: '/api/auth/login', status: pass ? 'PASS' : 'FAIL',
                     responseCode: status, accepted: [200], responseBody: data, note: null });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  section('SECTION 4 — Internal Queue Routes  (/api/queue/*)');
  // ──────────────────────────────────────────────────────────────────────────

  let internalPatientId   = null;
  let internalUniqueId    = null;
  let internalPatientId2  = null;  // for cancel

  await test('POST /queue/add — enqueue patient', 'POST', '/api/queue/add', {
    headers : doctorH(),
    body    : { name: 'Internal Test Patient', number: '9876543210', description: 'Test visit' },
    expect  : [200, 201],
    skip    : !S.doctorTokenCookie,
    extract : d => {
      internalPatientId = d.patient?._id || d.patient?.id;
      internalUniqueId  = d.patient?.uniqueLinkId;
      print(`         → patientId: ${internalPatientId}  uniqueLinkId: ${internalUniqueId}`);
    },
  });

  await test('POST /queue/add — second patient (for cancel)', 'POST', '/api/queue/add', {
    headers : doctorH(),
    body    : { name: 'Cancel Patient', number: '9876543211' },
    expect  : [200, 201],
    skip    : !S.doctorTokenCookie,
    extract : d => { internalPatientId2 = d.patient?._id || d.patient?.id; },
  });

  await test('GET /queue/:doctorId — waiting queue for doctor', 'GET', `/api/queue/${S.doctorId}`, {
    headers : doctorH(),
    expect  : 200,
    skip    : !S.doctorTokenCookie || !S.doctorId,
  });

  await test('GET /queue/status/:uniqueLinkId — public patient status', 'GET',
    `/api/queue/status/${internalUniqueId || 'missing'}`, {
    expect : internalUniqueId ? 200 : 404,
    skip   : !internalUniqueId,
  });

  await test('GET /queue/summary/today — doctor daily summary', 'GET', '/api/queue/summary/today', {
    headers : doctorH(),
    expect  : 200,
    skip    : !S.doctorTokenCookie,
  });

  await test('GET /queue/history/ — queue history', 'GET', '/api/queue/history/', {
    headers : doctorH(),
    expect  : 200,
    skip    : !S.doctorTokenCookie,
  });

  await test('PUT /queue/prioritise/:id — prioritize patient', 'PUT',
    `/api/queue/prioritise/${internalPatientId || 'missing'}`, {
    headers : doctorH(),
    expect  : 200,
    skip    : !S.doctorTokenCookie || !internalPatientId,
  });

  await test('PUT /queue/cancel/:id — cancel a patient', 'PUT',
    `/api/queue/cancel/${internalPatientId2 || 'missing'}`, {
    headers : doctorH(),
    expect  : 200,
    skip    : !S.doctorTokenCookie || !internalPatientId2,
  });

  await test('PUT /queue/complete/:id — complete a patient', 'PUT',
    `/api/queue/complete/${internalPatientId || 'missing'}`, {
    headers : doctorH(),
    expect  : 200,
    skip    : !S.doctorTokenCookie || !internalPatientId,
  });

  // ──────────────────────────────────────────────────────────────────────────
  section('SECTION 5 — B2B Phase 1: Discovery  (/api/v1/*)');
  // ──────────────────────────────────────────────────────────────────────────

  await test('GET /v1/info — hospital info', 'GET', '/api/v1/info', {
    headers : apiH(),
    expect  : 200,
    skip    : !S.apiKey,
  });

  await test('GET /v1/branches — list branches', 'GET', '/api/v1/branches', {
    headers : apiH(),
    expect  : 200,
    skip    : !S.apiKey,
  });

  await test('GET /v1/doctors — list all doctors', 'GET', '/api/v1/doctors', {
    headers : apiH(),
    expect  : 200,
    skip    : !S.apiKey,
  });

  await test('GET /v1/doctors?specialty=Cardiology — filter by specialty', 'GET',
    '/api/v1/doctors?specialty=Cardiology', {
    headers : apiH(),
    expect  : 200,
    skip    : !S.apiKey,
  });

  await test(`GET /v1/doctors/:id/slots?date=${today()} — available slots`, 'GET',
    `/api/v1/doctors/${S.doctorId}/slots?date=${today()}`, {
    headers : apiH(),
    expect  : 200,
    skip    : !S.apiKey || !S.doctorId,
  });

  await test('GET /v1/doctor/:id/status — availability status', 'GET',
    `/api/v1/doctor/${S.doctorId}/status`, {
    headers : apiH(),
    expect  : 200,
    skip    : !S.apiKey || !S.doctorId,
  });

  // ──────────────────────────────────────────────────────────────────────────
  section('SECTION 6 — B2B Phase 2: Queue Management  (/api/v1/queue/*)');
  // ──────────────────────────────────────────────────────────────────────────

  await test('POST /v1/queue — enqueue single patient', 'POST', '/api/v1/queue', {
    headers : apiH({ 'Idempotency-Key': `${PREFIX}-q1` }),
    body    : { doctorId: S.doctorId, externalPatientId: `${PREFIX}_p1`, description: 'B2B visit 1' },
    expect  : 201,
    skip    : !S.apiKey || !S.doctorId,
    extract : d => {
      S.queueUniqueId = d.data?.trackingUrl?.split('/').pop();
      print(`         → uniqueLinkId: ${S.queueUniqueId}`);
    },
  });

  // Second patient — will be used for DELETE test
  await test('POST /v1/queue — enqueue patient for cancel test', 'POST', '/api/v1/queue', {
    headers : apiH({ 'Idempotency-Key': `${PREFIX}-q2` }),
    body    : { doctorId: S.doctorId, externalPatientId: `${PREFIX}_p2` },
    expect  : 201,
    skip    : !S.apiKey || !S.doctorId,
    extract : d => { S.cancelQueueUniqueId = d.data?.trackingUrl?.split('/').pop(); },
  });

  await test('POST /v1/queue/bulk — enqueue 3 patients at once', 'POST', '/api/v1/queue/bulk', {
    headers : apiH(),
    body    : {
      doctorId : S.doctorId,
      patients : [
        { externalPatientId: `${PREFIX}_b1` },
        { externalPatientId: `${PREFIX}_b2` },
        { externalPatientId: `${PREFIX}_b3` },
      ],
    },
    expect  : 201,
    skip    : !S.apiKey || !S.doctorId,
  });

  await test('GET /v1/queue — list waiting patients', 'GET',
    `/api/v1/queue?doctorId=${S.doctorId}&status=waiting`, {
    headers : apiH(),
    expect  : 200,
    skip    : !S.apiKey || !S.doctorId,
  });

  await test('GET /v1/queue/stats — live queue statistics', 'GET', '/api/v1/queue/stats', {
    headers : apiH(),
    expect  : 200,
    skip    : !S.apiKey,
  });

  await test('GET /v1/queue/:uniqueLinkId — patient queue status', 'GET',
    `/api/v1/queue/${S.queueUniqueId || 'missing'}`, {
    headers : apiH(),
    expect  : 200,
    skip    : !S.apiKey || !S.queueUniqueId,
  });

  await test('PUT /v1/queue/:id/priority — move patient to front', 'PUT',
    `/api/v1/queue/${S.queueUniqueId || 'missing'}/priority`, {
    headers : apiH(),
    expect  : 200,
    skip    : !S.apiKey || !S.queueUniqueId,
  });

  await test('PUT /v1/queue/:id/notes — attach clinical note', 'PUT',
    `/api/v1/queue/${S.queueUniqueId || 'missing'}/notes`, {
    headers : apiH(),
    body    : { notes: 'BP 140/90 — flagged urgent by B2B system' },
    expect  : 200,
    skip    : !S.apiKey || !S.queueUniqueId,
  });

  await test('GET /v1/doctor/:id/queue — all waiting patients for doctor', 'GET',
    `/api/v1/doctor/${S.doctorId}/queue`, {
    headers : apiH(),
    expect  : 200,
    skip    : !S.apiKey || !S.doctorId,
  });

  await test('DELETE /v1/queue/:id — cancel queue entry', 'DELETE',
    `/api/v1/queue/${S.cancelQueueUniqueId || 'missing'}`, {
    headers : apiH(),
    expect  : 200,
    skip    : !S.apiKey || !S.cancelQueueUniqueId,
  });

  // ──────────────────────────────────────────────────────────────────────────
  section('SECTION 7 — B2B Phase 3: Appointment Lifecycle  (/api/v1/appointments/*)');
  // ──────────────────────────────────────────────────────────────────────────

  await test('POST /v1/appointments/book — book appointment (arrive test)', 'POST',
    '/api/v1/appointments/book', {
    headers : apiH(),
    body    : { doctorId: S.doctorId, patientName: 'Arrive Patient',
                phone: '9000000001', scheduledAt: futureISO(1), notes: 'Arrive test' },
    expect  : 201,
    skip    : !S.apiKey || !S.doctorId,
    extract : d => { S.appointmentId1 = d.data?.id; },
  });

  await test('POST /v1/appointments/book — book appointment (cancel test)', 'POST',
    '/api/v1/appointments/book', {
    headers : apiH(),
    body    : { doctorId: S.doctorId, patientName: 'Cancel Patient',
                phone: '9000000002', scheduledAt: futureISO(2) },
    expect  : 201,
    skip    : !S.apiKey || !S.doctorId,
    extract : d => { S.appointmentIdCancel = d.data?.id; },
  });

  await test('GET /v1/appointments — list appointments', 'GET',
    `/api/v1/appointments?doctorId=${S.doctorId}&status=scheduled`, {
    headers : apiH(),
    expect  : 200,
    skip    : !S.apiKey || !S.doctorId,
  });

  await test('PUT /v1/appointments/:id/arrive — mark arrived → auto-queue', 'PUT',
    `/api/v1/appointments/${S.appointmentId1 || 'missing'}/arrive`, {
    headers : apiH(),
    expect  : 200,
    skip    : !S.apiKey || !S.appointmentId1,
  });

  await test('PUT /v1/appointments/:id/cancel — cancel appointment', 'PUT',
    `/api/v1/appointments/${S.appointmentIdCancel || 'missing'}/cancel`, {
    headers : apiH(),
    expect  : 200,
    skip    : !S.apiKey || !S.appointmentIdCancel,
  });

  // ──────────────────────────────────────────────────────────────────────────
  section('SECTION 8 — B2B Phase 4: Analytics  (/api/v1/analytics/*)');
  // ──────────────────────────────────────────────────────────────────────────

  for (const period of ['today', 'week', 'month']) {
    await test(`GET /v1/analytics/summary?period=${period}`, 'GET',
      `/api/v1/analytics/summary?period=${period}`, {
      headers : apiH(),
      expect  : 200,
      skip    : !S.apiKey,
    });
  }

  await test('GET /v1/analytics/doctor/:id — per-doctor analytics', 'GET',
    `/api/v1/analytics/doctor/${S.doctorId}?period=today`, {
    headers : apiH(),
    expect  : 200,
    skip    : !S.apiKey || !S.doctorId,
  });

  await test(`GET /v1/analytics/wait-times?date=${today()} — hourly breakdown`, 'GET',
    `/api/v1/analytics/wait-times?date=${today()}`, {
    headers : apiH(),
    expect  : 200,
    skip    : !S.apiKey,
  });

  // ──────────────────────────────────────────────────────────────────────────
  section('SECTION 9 — B2B Phase 5: Developer Tools  (/api/v1/webhooks/*)');
  // ──────────────────────────────────────────────────────────────────────────

  await test('POST /v1/webhooks/test — fire test event', 'POST', '/api/v1/webhooks/test', {
    headers : apiH(),
    body    : { event: 'queue.created' },
    expect  : [200, 404],   // 404 = no webhooks registered (expected in fresh env)
    skip    : !S.apiKey,
    note    : '200 = dispatched, 404 = no webhooks registered (both are valid)',
  });

  // ──────────────────────────────────────────────────────────────────────────
  section('SECTION 10 — Validation & Security Edge Cases');
  // ──────────────────────────────────────────────────────────────────────────

  await test('GET /v1/info — no API key → 401', 'GET', '/api/v1/info', {
    expect : 401,
    note   : 'Missing x-api-key must return 401',
  });

  await test('GET /v1/info — invalid API key → 401', 'GET', '/api/v1/info', {
    headers : { 'x-api-key': 'sq_test_invalid_key_value' },
    expect  : 401,
    note    : 'Bad key must return 401',
  });

  await test('POST /v1/queue — missing doctorId → 400', 'POST', '/api/v1/queue', {
    headers : apiH(),
    body    : { externalPatientId: 'edge_case_no_doctor' },
    expect  : 400,
    skip    : !S.apiKey,
    note    : 'doctorId is required',
  });

  await test('POST /v1/queue/bulk — 51 patients → 400 (limit is 50)', 'POST', '/api/v1/queue/bulk', {
    headers : apiH(),
    body    : {
      doctorId : S.doctorId,
      patients : Array.from({ length: 51 }, (_, i) => ({ externalPatientId: `bulk_edge_${i}` })),
    },
    expect  : 400,
    skip    : !S.apiKey || !S.doctorId,
    note    : 'Bulk limit is 50 — should return 400',
  });

  await test('GET /v1/queue/nonexistent-uuid → 404', 'GET', '/api/v1/queue/00000000-0000-0000-0000-000000000000', {
    headers : apiH(),
    expect  : 404,
    skip    : !S.apiKey,
    note    : 'Unknown uniqueLinkId must return 404',
  });

  await test('POST /admin/login — wrong password → 401', 'POST', '/api/admin/login', {
    body   : { email: `admin_${TIMESTAMP}@testsmartqueue.com`, password: 'WrongPassword999' },
    expect : [401, 429],
    note   : '401 = invalid credentials, 429 = rate limiter (both indicate auth rejection)',
  });

  await test('POST /admin/staff/doctor — no auth → 401', 'POST', '/api/admin/staff/doctor', {
    body   : { name: 'x', email: 'x@x.com', specialization: 'x', password: 'x' },
    expect : 401,
    note   : 'Protected route must return 401 without token',
  });

  await test('POST /admin/signup — duplicate email → 400', 'POST', '/api/admin/signup', {
    body   : { hospitalName: 'Dup Hospital', name: 'Dup Admin',
               email: `admin_${TIMESTAMP}@testsmartqueue.com`, password: 'TestPass123!' },
    expect : [400, 429],
    note   : '400 = duplicate email, 429 = rate limiter (signup is also rate-limited)',
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SUMMARY + REPORT
  // ──────────────────────────────────────────────────────────────────────────

  const durationSec = ((Date.now() - startMs) / 1000).toFixed(1);
  const total       = passed + failed + skipped;

  print(`\n${'═'.repeat(65)}`);
  print('  FINAL SUMMARY');
  print('═'.repeat(65));
  print(`  Total   : ${total}`);
  print(`  Passed  : ${passed}  ✅`);
  print(`  Failed  : ${failed}  ❌`);
  print(`  Skipped : ${skipped}  ⏩`);
  print(`  Duration: ${durationSec}s`);
  print('═'.repeat(65));

  if (failed > 0) {
    print('\n  ❌ Failed tests:');
    results.filter(r => r.status === 'FAIL')
           .forEach(r => print(`     [${r.responseCode}] ${r.method} ${r.urlPath}  — ${r.name}`));
  }

  // ── Write report file ────────────────────────────────────────────────────
  const reportPath = path.join(__dirname, `test-results-${TIMESTAMP}.txt`);
  const L = [];  // lines

  const hr  = () => L.push('='.repeat(70));
  const hr2 = () => L.push('-'.repeat(70));

  hr();
  L.push('SMARTQUEUE — COMPLETE API TEST REPORT');
  L.push(`Generated : ${new Date().toISOString()}`);
  L.push(`Base URL  : ${BASE_URL}`);
  L.push(`Prefix    : ${PREFIX}`);
  L.push(`Duration  : ${durationSec}s`);
  L.push(`Result    : ${passed} passed / ${failed} failed / ${skipped} skipped (${total} total)`);
  hr();
  L.push('');
  L.push('PROVISIONED RESOURCES');
  L.push(`  hospitalId    : ${S.hospitalId}`);
  L.push(`  doctorId      : ${S.doctorId}`);
  L.push(`  apiKey        : ${S.apiKey}`);
  L.push(`  queueUniqueId : ${S.queueUniqueId}`);
  L.push(`  appointmentId1: ${S.appointmentId1}`);
  L.push('');

  let lastSec = '';
  for (const r of results) {
    if (r.section !== lastSec) {
      L.push('');
      hr2();
      L.push(`  ${r.section}`);
      hr2();
      lastSec = r.section;
    }

    const statusTag  = r.status === 'PASS' ? '[PASS]' : r.status === 'FAIL' ? '[FAIL]' : '[SKIP]';
    const acceptStr  = r.accepted ? `(expected ${Array.isArray(r.accepted) ? r.accepted.join('|') : r.accepted})` : '';
    L.push('');
    L.push(`${statusTag} ${r.method} ${r.urlPath}`);
    L.push(`  Name        : ${r.name}`);
    L.push(`  HTTP Status : ${r.responseCode ?? 'N/A'} ${acceptStr}`);
    if (r.note)       L.push(`  Note        : ${r.note}`);
    if (r.fetchError) L.push(`  Fetch Error : ${r.fetchError}`);
    if (r.responseBody) {
      const bodyStr = JSON.stringify(r.responseBody, null, 2);
      const display = bodyStr.length > 1000 ? bodyStr.slice(0, 1000) + '\n  …(truncated)' : bodyStr;
      L.push('  Response    :');
      display.split('\n').forEach(line => L.push(`    ${line}`));
    }
  }

  L.push('');
  hr();
  L.push('SUMMARY');
  hr();
  L.push(`Total   : ${total}`);
  L.push(`Passed  : ${passed}`);
  L.push(`Failed  : ${failed}`);
  L.push(`Skipped : ${skipped}`);
  L.push('');

  if (failed > 0) {
    L.push('FAILED TESTS:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      L.push(`  [${r.responseCode}] ${r.method} ${r.urlPath}`);
      L.push(`    ${r.name}`);
      if (r.responseBody) L.push(`    ${JSON.stringify(r.responseBody).slice(0, 300)}`);
    });
    L.push('');
  }

  hr();

  fs.writeFileSync(reportPath, L.join('\n'), 'utf8');
  print(`\n  📄 Full report saved to:\n     ${reportPath}\n`);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
