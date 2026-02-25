# SmartQueue QaaS Developer API Guide

Welcome to the SmartQueue B2B API documentation. This guide explains how external healthcare platforms, hospital booking aggregators, and custom frontends can integrate seamlessly with the SmartQueue infrastructure.

---

## 🔒 1. Authentication (API Keys)

SmartQueue uses header-based API key authentication for all external B2B requests.

### Acquiring a Key
When your hospital account is provisioned, you will generate an API Key from the Developer Dashboard.
Your keys will look like this: `sq_live_xxxxxxxxxxxxxxxxxxxx` or `sq_test_xxxxxxxxxxxxxxxxxxxx`.

### Making Authenticated Requests
Include your API key in the `x-api-key` HTTP header for every request.

```bash
curl -X GET "https://api.smartqueue.com/api/v1/doctor/DOC_ID/queue" \
  -H "x-api-key: sq_live_your_api_key_here"
```

*Note: Do not share your live API keys in publicly accessible client-side code.*

---

## 🚦 2. Rate Limits & Quotas

To ensure platform stability, all endpoints are strictly rate-limited based on your hospital's subscription tier:
- **Basic:** 100 requests / 15 mins
- **Pro:** 1,000 requests / 15 mins
- **Enterprise:** 10,000 requests / 15 mins

If you exceed this quota, you will receive an ``HTTP 429 Too Many Requests`` response.

---

## 🛡️ 3. Idempotency (Preventing Double Bookings)

Network connections can drop. If you send a `POST /api/v1/queue` request to add a patient and don't receive a response, retrying the request could result in the patient being added to the queue *twice*.

To prevent this, include an `Idempotency-Key` header with a unique UUID string for each distinct operation. If you retry a request with the exact same Idempotency-Key, SmartQueue will safely return the original successful response instead of processing it again.

```http
POST /api/v1/queue
x-api-key: <your_key>
Idempotency-Key: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Content-Type: application/json
```

---

## 🎣 4. Webhooks (Real-Time Events)

Polling our API continuously is inefficient and will trigger rate limits. Instead, register a **Webhook Endpoint URL** to receive real-time push notifications.

### Available Events
- `queue.created`: Fired when a patient is added to a queue.
- `queue.updated`: Fired when a queue is reordered or an ETA drastically shifts.
- `queue.completed`: Fired when a doctor marks a consultation as finished.
- `doctor.status_changed`: Fired when a doctor pauses/resumes their queue.

### Handling Webhook Verification (HMAC SHA-256)
All webhook payloads are cryptographically signed to prove they originated from SmartQueue. The signature is sent in the `SmartQueue-Signature` header.

You should compute the HMAC SHA-256 hash of the raw request payload using your specific **Webhook Secret** and compare it to the header to prevent spoofing.

---

## 📡 5. REST Endpoints Overview

The base URL for all B2B requests is: `/api/v1`

### 🟣 Queue Management

#### `POST /queue`
Creates a new queue entry for a specified doctor.
**Body:**
```json
{
  "doctorId": "651a2b3c4d5e6f7g8h9i0j1k",
  "externalPatientId": "usr_987654321", // Highly Recommended: Zero-PII strategy
  "name": "John Doe",                   // Optional
  "description": "Routine Checkup"      // Optional
}
```

#### `GET /queue/:uniqueLinkId`
Retrieves the real-time status and ETA calculation for a specific patient link.

#### `DELETE /queue/:uniqueLinkId`
Cancels an active queue entry.

### ⚕️ Doctor Management

#### `GET /doctor/:doctorId/status`
Returns the doctor's current availability (`Available`, `Paused`, `Break`).

#### `GET /doctor/:doctorId/queue`
Returns the current active live queue list (useful for rendering external reception dashboards).

---

## 💡 Zero-PII Recommendation
To significantly reduce HIPAA/GDPR compliance liabilities, we strongly encourage integrators to pass opaque `externalPatientId` strings to SmartQueue rather than explicit personally identifiable names or phone numbers. SmartQueue will calculate the ETAs against this opaque token, and your frontend can map the token back to the real patient name locally.
