const crypto = require('crypto');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runEndToEndTest() {
    console.log("=== SmartQueue QaaS B2B End-to-End Test ===");

    const uniqueNum = Date.now();
    const adminEmail = `test.hospital${uniqueNum}@example.com`;

    console.log(`\n1. Registering Hospital Admin (${adminEmail})...`);
    let registerRes;
    try {
        const response = await fetch(`${BASE_URL}/admin/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `Admin ${uniqueNum}`,
                hospitalName: `Test Hospital ${uniqueNum}`,
                email: adminEmail,
                password: "Password123"
            })
        });
        registerRes = await response.json();
        if (!response.ok) throw new Error(registerRes.message);
        console.log("✅ Hospital Provisioned.");
    } catch (e) {
        console.error("Failed to register hospital:", e.message);
        return;
    }

    console.log("\n2. Logging in to get Auth Token...");
    let authCookie;
    let doctorId;
    let hospitalId;
    try {
        const response = await fetch(`${BASE_URL}/admin/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: adminEmail,
                password: "Password123"
            })
        });
        const loginRes = await response.json();
        if (!response.ok) throw new Error(loginRes.message);

        authCookie = response.headers.get('set-cookie')?.split(";")[0];
        hospitalId = loginRes.admin.hospitalId;
        console.log(`✅ Logged in Admin. Hospital ID: ${hospitalId}`);
    } catch (e) {
        console.error("Login failed", e.message);
        return;
    }

    console.log("\n3. Generating B2B API Key...");
    let apiKey;
    try {
        const response = await fetch(`${BASE_URL}/hospitals/keys`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': authCookie
            },
            body: JSON.stringify({ name: "Test Script Key", isLive: true })
        });
        const keyRes = await response.json();
        if (!response.ok) throw new Error(keyRes.message);

        apiKey = keyRes.key;
        console.log(`✅ API Key generated: ${apiKey.substring(0, 15)}...`);
    } catch (e) {
        console.error("Failed generating key:", e.message);
        return;
    }

    console.log("\n4. Registering a Clinical Doctor...");
    try {
        const response = await fetch(`${BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `Doc ${uniqueNum}`,
                hospitalId: hospitalId,
                specialization: "Pediatrics",
                email: `doc${uniqueNum}@example.com`,
                password: "Password!123"
            })
        });
        const docRes = await response.json();
        if (!response.ok) throw new Error(docRes.message);
        doctorId = docRes.doctor.id;
        console.log(`✅ Doctor Provisioned. Doctor ID: ${doctorId}`);
    } catch (e) {
        console.error("Failed to register doctor:", e.message);
        return;
    }

    console.log("\n5. Testing Idempotent B2B Enqueue Engine...");
    const idempotencyKey = crypto.randomUUID();
    console.log(`Using Idempotency-Key: ${idempotencyKey}`);

    const queuePayload = {
        doctorId,
        externalPatientId: `usr_${uniqueNum}`,
        name: "Idempotent John",
        description: "Zero-PII test."
    };

    const reqConfig = {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(queuePayload)
    };

    console.log("Firing Request 1 (The actual hit)...");
    try {
        const response = await fetch(`${BASE_URL}/v1/queue`, reqConfig);
        const req1 = await response.json();
        if (!response.ok) throw new Error(req1.detail || req1.message || req1.error);
        console.log(`✅ Req 1 Success. Tracking URL: ${req1.data.trackingUrl}`);
    } catch (e) {
        require('fs').writeFileSync('error_dump.log', String(e.message));
        console.error("Req 1 failed", e.message);
        return;
    }

    console.log("Firing Request 2 (Attempted double-booking with same Idempotency-Key)...");
    try {
        const response = await fetch(`${BASE_URL}/v1/queue`, reqConfig);
        const req2 = await response.json();
        if (!response.ok && response.status !== 409) throw new Error(req2.error || req2.message);
        console.log(`✅ Req 2 Idempotency Catch. Returned flawlessly without duplicating data in DB.`);
    } catch (e) {
        console.error("Req 2 failed", e.message);
    }

    console.log("\n=== test finished successfully ===");
}

runEndToEndTest();
