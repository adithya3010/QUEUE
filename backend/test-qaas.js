/**
 * Smart Queue B2B API — Full Integration Test
 * Tests all Phase 1–5 endpoints against a live server.
 *
 * Usage:
 *   node test-qaas.js
 *
 * Prerequisites:
 *   - Server running on http://localhost:5000
 *   - .env configured with valid MONGODB_URL
 */

const crypto = require('crypto');

const BASE_URL = 'http://127.0.0.1:5000/api';
const uniqueNum = Date.now();

let apiKey = null;
let doctorId = null;
let trackingUrl = null;
let uniqueLinkId = null;
let appointmentId = null;
let adminCookie = null;

// ─── Helpers ───────────────────────────────────────────────────────────────

function pass(label, extra = '') {
    console.log(`  ✅ ${label}${extra ? ' — ' + extra : ''}`);
}

function fail(label, detail) {
    console.error(`  ❌ ${label} — ${detail}`);
}

async function api(method, path, body = null, headers = {}) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${path}`, opts);
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json, headers: res.headers };
}

function b2b(method, path, body = null, extraHeaders = {}) {
    return api(method, path, body, { 'x-api-key': apiKey, ...extraHeaders });
}

// ─── Setup ─────────────────────────────────────────────────────────────────

async function setup() {
    console.log('\n━━━ SETUP: Provisioning hospital, doctor, and API key ━━━\n');

    // 1. Register hospital admin
    const adminEmail = `test.admin.${uniqueNum}@example.com`;
    const signupRes = await api('POST', '/admin/signup', {
        name: `Test Admin ${uniqueNum}`,
        hospitalName: `Test Hospital ${uniqueNum}`,
        email: adminEmail,
        password: 'TestPass123!'
    });
    if (signupRes.status !== 200) {
        fail('Admin signup', JSON.stringify(signupRes.json));
        return false;
    }
    pass('Hospital admin registered', `hospitalId: ${signupRes.json.admin?.hospitalId}`);

    // 2. Login
    const loginRes = await api('POST', '/admin/login', {
        email: adminEmail,
        password: 'TestPass123!'
    });
    if (loginRes.status !== 200) {
        fail('Admin login', JSON.stringify(loginRes.json));
        return false;
    }
    adminCookie = loginRes.headers.get('set-cookie')?.split(';')[0];
    pass('Admin logged in', `cookie: ${adminCookie?.substring(0, 30)}...`);

    // 3. Create a doctor
    const doctorRes = await api('POST', '/hospitals/doctors', {
        name: `Dr. Test ${uniqueNum}`,
        email: `doctor.${uniqueNum}@example.com`,
        specialization: 'Cardiology',
        password: 'DoctorPass123!'
    }, { Cookie: adminCookie });
    if (doctorRes.status !== 201) {
        fail('Doctor creation', JSON.stringify(doctorRes.json));
        return false;
    }
    doctorId = doctorRes.json.doctor?.id;
    pass('Doctor created', `doctorId: ${doctorId}`);

    // 4. Generate API key
    const keyRes = await api('POST', '/hospitals/keys', {
        name: 'Integration Test Key',
        isLive: false
    }, { Cookie: adminCookie });
    if (keyRes.status !== 201) {
        fail('API key generation', JSON.stringify(keyRes.json));
        return false;
    }
    apiKey = keyRes.json.key;
    pass('API key generated', `${apiKey?.substring(0, 20)}...`);

    return true;
}

// ─── Phase 1: Discovery Layer ───────────────────────────────────────────────

async function testDiscovery() {
    console.log('\n━━━ PHASE 1: Discovery Layer ━━━\n');

    // GET /v1/info
    const infoRes = await b2b('GET', '/v1/info');
    if (infoRes.status === 200 && infoRes.json.success) {
        pass('GET /v1/info', `hospital: "${infoRes.json.data?.name}", plan: ${infoRes.json.data?.subscriptionPlan}`);
    } else {
        fail('GET /v1/info', JSON.stringify(infoRes.json));
    }

    // GET /v1/branches
    const branchRes = await b2b('GET', '/v1/branches');
    if (branchRes.status === 200 && branchRes.json.success) {
        pass('GET /v1/branches', `${branchRes.json.total} branch(es) found`);
    } else {
        fail('GET /v1/branches', JSON.stringify(branchRes.json));
    }

    // GET /v1/doctors
    const doctorsRes = await b2b('GET', '/v1/doctors');
    if (doctorsRes.status === 200 && doctorsRes.json.success) {
        pass('GET /v1/doctors', `${doctorsRes.json.total} doctor(s) found`);
    } else {
        fail('GET /v1/doctors', JSON.stringify(doctorsRes.json));
    }

    // GET /v1/doctors?specialty=cardio (partial match)
    const filteredRes = await b2b('GET', '/v1/doctors?specialty=cardio');
    if (filteredRes.status === 200 && filteredRes.json.success) {
        pass('GET /v1/doctors?specialty=cardio', `${filteredRes.json.total} matched`);
    } else {
        fail('GET /v1/doctors?specialty=cardio', JSON.stringify(filteredRes.json));
    }

    // GET /v1/doctors/:id/slots
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    const slotsRes = await b2b('GET', `/v1/doctors/${doctorId}/slots?date=${dateStr}`);
    if (slotsRes.status === 200 && slotsRes.json.success) {
        pass(`GET /v1/doctors/:id/slots?date=${dateStr}`, `${slotsRes.json.data?.totalAvailable} slot(s) available`);
    } else {
        fail('GET /v1/doctors/:id/slots', JSON.stringify(slotsRes.json));
    }

    // GET /v1/doctor/:id/status (existing)
    const statusRes = await b2b('GET', `/v1/doctor/${doctorId}/status`);
    if (statusRes.status === 200 && statusRes.json.success) {
        pass('GET /v1/doctor/:id/status', `availability: ${statusRes.json.data?.availability}`);
    } else {
        fail('GET /v1/doctor/:id/status', JSON.stringify(statusRes.json));
    }
}

// ─── Phase 2: Queue Controls ────────────────────────────────────────────────

async function testQueueControls() {
    console.log('\n━━━ PHASE 2: Richer Queue Controls ━━━\n');

    // POST /v1/queue (single patient — existing, now with Idempotency-Key)
    const idempotencyKey = crypto.randomUUID();
    const enqueueRes = await b2b('POST', '/v1/queue', {
        doctorId,
        externalPatientId: `ext_single_${uniqueNum}`,
        description: 'Single enqueue test'
    }, { 'Idempotency-Key': idempotencyKey });

    if (enqueueRes.status === 201 && enqueueRes.json.success) {
        trackingUrl = enqueueRes.json.data?.trackingUrl;
        uniqueLinkId = trackingUrl?.split('/status/')[1];
        pass('POST /v1/queue', `token #${enqueueRes.json.data?.tokenNumber}, linkId: ${uniqueLinkId?.substring(0, 8)}...`);
    } else {
        fail('POST /v1/queue', JSON.stringify(enqueueRes.json));
        return; // Can't continue without a queue entry
    }

    // Idempotency check: same key should return same response, not insert again
    const idempRes = await b2b('POST', '/v1/queue', {
        doctorId,
        externalPatientId: `ext_single_${uniqueNum}`,
        description: 'Duplicate check'
    }, { 'Idempotency-Key': idempotencyKey });
    if (idempRes.json?.data?.tokenNumber === enqueueRes.json?.data?.tokenNumber) {
        pass('Idempotency check', 'Same token returned, no duplicate created');
    } else {
        fail('Idempotency check', JSON.stringify(idempRes.json));
    }

    // POST /v1/queue/bulk
    const bulkRes = await b2b('POST', '/v1/queue/bulk', {
        doctorId,
        patients: [
            { externalPatientId: `ext_bulk_1_${uniqueNum}`, description: 'Bulk patient A' },
            { externalPatientId: `ext_bulk_2_${uniqueNum}`, description: 'Bulk patient B' },
            { externalPatientId: `ext_bulk_3_${uniqueNum}`, description: 'Bulk patient C' },
        ]
    });
    if (bulkRes.status === 201 && bulkRes.json.success) {
        pass('POST /v1/queue/bulk', `${bulkRes.json.data?.length} patients added`);
    } else {
        fail('POST /v1/queue/bulk', JSON.stringify(bulkRes.json));
    }

    // GET /v1/queue?status=waiting
    const listRes = await b2b('GET', `/v1/queue?doctorId=${doctorId}&status=waiting`);
    if (listRes.status === 200 && listRes.json.success) {
        pass('GET /v1/queue', `${listRes.json.total} patients waiting`);
    } else {
        fail('GET /v1/queue', JSON.stringify(listRes.json));
    }

    // GET /v1/queue/stats
    const statsRes = await b2b('GET', `/v1/queue/stats?doctorId=${doctorId}`);
    if (statsRes.status === 200 && statsRes.json.success) {
        const d = statsRes.json.data?.perDoctor?.[0];
        pass('GET /v1/queue/stats', `${statsRes.json.data?.totalWaiting} waiting, ETA: ${d?.estimatedClearTimeMinutes}min`);
    } else {
        fail('GET /v1/queue/stats', JSON.stringify(statsRes.json));
    }

    // GET /v1/queue/:uniqueLinkId (existing)
    const queueStatusRes = await b2b('GET', `/v1/queue/${uniqueLinkId}`);
    if (queueStatusRes.status === 200 && queueStatusRes.json.success) {
        pass('GET /v1/queue/:uniqueLinkId', `position: ${queueStatusRes.json.data?.position}, wait: ${queueStatusRes.json.data?.estimatedWaitTimeMinutes}min`);
    } else {
        fail('GET /v1/queue/:uniqueLinkId', JSON.stringify(queueStatusRes.json));
    }

    // PUT /v1/queue/:uniqueLinkId/notes
    const notesRes = await b2b('PUT', `/v1/queue/${uniqueLinkId}/notes`, {
        notes: 'BP 140/90, c/o chest pain. Urgent.'
    });
    if (notesRes.status === 200 && notesRes.json.success) {
        pass('PUT /v1/queue/:id/notes', 'Clinical note attached');
    } else {
        fail('PUT /v1/queue/:id/notes', JSON.stringify(notesRes.json));
    }

    // PUT /v1/queue/:uniqueLinkId/priority
    const priorityRes = await b2b('PUT', `/v1/queue/${uniqueLinkId}/priority`);
    if (priorityRes.status === 200 && priorityRes.json.success) {
        pass('PUT /v1/queue/:id/priority', `Moved to front, token #${priorityRes.json.tokenNumber}`);
    } else {
        fail('PUT /v1/queue/:id/priority', JSON.stringify(priorityRes.json));
    }

    // GET /v1/doctor/:id/queue (existing)
    const drQueueRes = await b2b('GET', `/v1/doctor/${doctorId}/queue`);
    if (drQueueRes.status === 200 && drQueueRes.json.success) {
        pass('GET /v1/doctor/:id/queue', `${drQueueRes.json.data?.length} patients in doctor queue`);
    } else {
        fail('GET /v1/doctor/:id/queue', JSON.stringify(drQueueRes.json));
    }

    // DELETE /v1/queue/:uniqueLinkId — cancel one of the bulk entries
    if (bulkRes.json.data?.[0]) {
        const cancelLinkId = bulkRes.json.data[0].trackingUrl?.split('/status/')[1];
        const cancelRes = await b2b('DELETE', `/v1/queue/${cancelLinkId}`);
        if (cancelRes.status === 200 && cancelRes.json.success) {
            pass('DELETE /v1/queue/:id', 'Queue entry cancelled');
        } else {
            fail('DELETE /v1/queue/:id', JSON.stringify(cancelRes.json));
        }
    }
}

// ─── Phase 3: Appointment Lifecycle ─────────────────────────────────────────

async function testAppointmentLifecycle() {
    console.log('\n━━━ PHASE 3: Appointment Lifecycle ━━━\n');

    // Book appointment via B2B API
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const bookRes = await b2b('POST', '/v1/appointments/book', {
        doctorId,
        patientName: 'Jane B2B Patient',
        phone: '9876543210',
        scheduledAt: tomorrow.toISOString(),
        notes: 'Annual checkup'
    });
    if (bookRes.status === 201 && bookRes.json.success) {
        appointmentId = bookRes.json.data?.id;
        pass('POST /v1/appointments/book', `appointmentId: ${appointmentId}`);
    } else {
        fail('POST /v1/appointments/book', JSON.stringify(bookRes.json));
        return;
    }

    // GET /v1/appointments (list with date filter)
    const dateStr = tomorrow.toISOString().slice(0, 10);
    const listRes = await b2b('GET', `/v1/appointments?doctorId=${doctorId}&date=${dateStr}&status=scheduled`);
    if (listRes.status === 200 && listRes.json.success) {
        pass('GET /v1/appointments', `${listRes.json.total} scheduled appointment(s)`);
    } else {
        fail('GET /v1/appointments', JSON.stringify(listRes.json));
    }

    // Book a second appointment to cancel
    const tomorrow2 = new Date(tomorrow);
    tomorrow2.setHours(11, 0, 0, 0);
    const bookRes2 = await b2b('POST', '/v1/appointments/book', {
        doctorId,
        patientName: 'Cancel Test Patient',
        phone: '1234567890',
        scheduledAt: tomorrow2.toISOString(),
        notes: 'Will be cancelled'
    });
    if (bookRes2.status === 201 && bookRes2.json.success) {
        const cancelApptId = bookRes2.json.data?.id;
        pass('Booked second appointment for cancel test', `id: ${cancelApptId}`);

        // PUT /v1/appointments/:id/cancel
        const cancelRes = await b2b('PUT', `/v1/appointments/${cancelApptId}/cancel`);
        if (cancelRes.status === 200 && cancelRes.json.success) {
            pass('PUT /v1/appointments/:id/cancel', 'Appointment cancelled');
        } else {
            fail('PUT /v1/appointments/:id/cancel', JSON.stringify(cancelRes.json));
        }
    }

    // PUT /v1/appointments/:id/arrive → should create live queue token
    const arriveRes = await b2b('PUT', `/v1/appointments/${appointmentId}/arrive`);
    if (arriveRes.status === 200 && arriveRes.json.success) {
        const d = arriveRes.json.data;
        pass('PUT /v1/appointments/:id/arrive', `token #${d?.tokenNumber}, queue entry: ${d?.queueEntryId}`);
    } else {
        fail('PUT /v1/appointments/:id/arrive', JSON.stringify(arriveRes.json));
    }
}

// ─── Phase 4: Analytics ─────────────────────────────────────────────────────

async function testAnalytics() {
    console.log('\n━━━ PHASE 4: Analytics ━━━\n');

    // GET /v1/analytics/summary?period=today
    const summaryRes = await b2b('GET', '/v1/analytics/summary?period=today');
    if (summaryRes.status === 200 && summaryRes.json.success) {
        const d = summaryRes.json.data;
        pass('GET /v1/analytics/summary?period=today', `total: ${d?.total}, waiting: ${d?.waiting}, completionRate: ${d?.completionRate}`);
    } else {
        fail('GET /v1/analytics/summary?period=today', JSON.stringify(summaryRes.json));
    }

    // GET /v1/analytics/summary?period=week
    const weekRes = await b2b('GET', '/v1/analytics/summary?period=week');
    if (weekRes.status === 200 && weekRes.json.success) {
        pass('GET /v1/analytics/summary?period=week', `total: ${weekRes.json.data?.total}`);
    } else {
        fail('GET /v1/analytics/summary?period=week', JSON.stringify(weekRes.json));
    }

    // GET /v1/analytics/doctor/:id
    const docRes = await b2b('GET', `/v1/analytics/doctor/${doctorId}?period=today`);
    if (docRes.status === 200 && docRes.json.success) {
        const d = docRes.json.data;
        pass('GET /v1/analytics/doctor/:id', `doctor: ${d?.name}, total today: ${d?.total}`);
    } else {
        fail('GET /v1/analytics/doctor/:id', JSON.stringify(docRes.json));
    }

    // GET /v1/analytics/wait-times
    const waitRes = await b2b('GET', '/v1/analytics/wait-times');
    if (waitRes.status === 200 && waitRes.json.success) {
        const d = waitRes.json.data;
        pass('GET /v1/analytics/wait-times', `date: ${d?.date}, peakHour: ${d?.peakHour ?? 'N/A (no data yet)'}, hours returned: ${d?.hours?.length}`);
    } else {
        fail('GET /v1/analytics/wait-times', JSON.stringify(waitRes.json));
    }
}

// ─── Phase 5: Developer Tooling ─────────────────────────────────────────────

async function testDeveloperTooling() {
    console.log('\n━━━ PHASE 5: Developer Tooling ━━━\n');

    // POST /v1/webhooks/test — expect 404 since no webhooks registered yet
    const testRes = await b2b('POST', '/v1/webhooks/test', {
        event: 'queue.created'
    });
    if (testRes.status === 404 && !testRes.json.success) {
        pass('POST /v1/webhooks/test (no endpoints)', 'Correctly returned 404 — no webhooks registered for event');
    } else if (testRes.status === 200 && testRes.json.success) {
        pass('POST /v1/webhooks/test', `dispatched to ${testRes.json.endpoints?.length} endpoint(s)`);
    } else {
        fail('POST /v1/webhooks/test', JSON.stringify(testRes.json));
    }

    // Validation: invalid event name
    const badEventRes = await b2b('POST', '/v1/webhooks/test', { event: 'invalid.event' });
    if (badEventRes.status === 400 && !badEventRes.json.success) {
        pass('POST /v1/webhooks/test — invalid event rejected', '400 returned correctly');
    } else {
        fail('POST /v1/webhooks/test — invalid event', JSON.stringify(badEventRes.json));
    }
}

// ─── Error / Validation Checks ───────────────────────────────────────────────

async function testValidationEdgeCases() {
    console.log('\n━━━ EDGE CASES: Validation & Auth ━━━\n');

    // No API key
    const noKeyRes = await api('GET', '/v1/info');
    if (noKeyRes.status === 401) {
        pass('No API key → 401', 'Auth enforced correctly');
    } else {
        fail('No API key auth check', `expected 401, got ${noKeyRes.status}`);
    }

    // Invalid doctor ID format
    const badDrRes = await b2b('GET', '/v1/doctors/not-an-objectid/slots?date=2026-01-01');
    if (badDrRes.status === 400) {
        pass('Invalid doctorId format → 400', badDrRes.json.error);
    } else {
        fail('Invalid doctorId format', `expected 400, got ${badDrRes.status}`);
    }

    // GET /v1/queue stats with invalid doctorId
    const badStatsRes = await b2b('GET', '/v1/queue/stats?doctorId=bad-id');
    if (badStatsRes.status === 400) {
        pass('Invalid doctorId in stats → 400', badStatsRes.json.error);
    } else {
        fail('Invalid doctorId in stats', `expected 400, got ${badStatsRes.status}`);
    }

    // Bulk with > 50 patients
    const bigBulkRes = await b2b('POST', '/v1/queue/bulk', {
        doctorId,
        patients: Array.from({ length: 51 }, (_, i) => ({ externalPatientId: `ext_${i}` }))
    });
    if (bigBulkRes.status === 400) {
        pass('Bulk > 50 patients → 400', bigBulkRes.json.error);
    } else {
        fail('Bulk > 50 limit', `expected 400, got ${bigBulkRes.status}`);
    }

    // Analytics with invalid period
    const badPeriodRes = await b2b('GET', '/v1/analytics/summary?period=year');
    if (badPeriodRes.status === 400) {
        pass('Invalid analytics period → 400', badPeriodRes.json.error);
    } else {
        fail('Invalid analytics period', `expected 400, got ${badPeriodRes.status}`);
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     Smart Queue  B2B API  —  Full Integration Test       ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    const ready = await setup();
    if (!ready) {
        console.error('\n❌ Setup failed — cannot continue.\n');
        process.exit(1);
    }

    await testDiscovery();
    await testQueueControls();
    await testAppointmentLifecycle();
    await testAnalytics();
    await testDeveloperTooling();
    await testValidationEdgeCases();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Test run complete. Check ✅ / ❌ above for results.\n');
}

run().catch(err => {
    console.error('\nUnhandled error during test run:', err.message);
    process.exit(1);
});
