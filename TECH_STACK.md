# Tech Stack & Technical Implementation

> **Smart-Queue is a multi-tenant, real-time SaaS platform** — a single backend serves unlimited organizations simultaneously, each fully isolated, with zero-latency queue updates pushed live to all connected screens.

---

## How It's Built

### 🔷 Backend — Node.js + Express.js
Built on **Node.js with Express** for its event-driven, non-blocking architecture — critical when hundreds of queue events fire simultaneously across multiple organizations. The API is fully RESTful with clean route separation by domain (queue, appointments, auth, kiosk, B2B).

### 🗃️ Database — MongoDB + Mongoose
**MongoDB** is structured for multi-tenancy from day one. Every record is stamped with `organizationId` and `locationId` — one database cluster safely serves hundreds of organizations with guaranteed data isolation. Compound indexes on the most queried fields ensure sub-millisecond query performance at scale.

### ⚡ Real-Time Engine — Socket.io
The core technical differentiator. Instead of clients polling every few seconds, **Socket.io maintains a persistent WebSocket connection** from every dashboard and patient screen. When any queue event fires (patient added, completed, reordered), the server pushes the update simultaneously to:
- The agent's dashboard
- The operator's (receptionist's) dashboard
- The patient's phone tracking page
- The lobby TV display board

All four update in under **100 milliseconds** — without a single page refresh.

### 🔐 Security Layer
| Layer | Technology | Purpose |
|---|---|---|
| Authentication | JWT in HTTP-only cookies | Immune to XSS — JavaScript cannot read the token |
| HTTP hardening | Helmet.js | 14 security headers set automatically |
| Injection prevention | express-mongo-sanitize | Blocks MongoDB injection attacks |
| Input validation | Zod schemas | Every API input shape-validated before DB access |
| Access control | RBAC middleware | `AGENT`, `OPERATOR`, `ORG_ADMIN` enforced per route |

### 📱 Frontend — Next.js 14 + TypeScript
Staff dashboards built in **Next.js 14** with TypeScript for type-safe API interactions and components. Kiosk and patient tracking pages are **public routes with no login** — a patient scans a QR code and sees their live status immediately.

### 🔔 WhatsApp Notifications — Twilio / WATI
All client-facing communication goes via **WhatsApp** — the dominant channel in the target market. Triggered automatically at three points:
1. **Check-in** — confirmation with token number and live tracking link
2. **2nd in queue** — "You're nearly up" alert
3. **Day before appointment** — reminder sent by scheduled cron job

### ⏰ Scheduled Jobs — node-cron
Daily server-side cron jobs send appointment reminders and sync schedules automatically — no manual intervention required.

### 📊 Observability Stack
- **Sentry** — real-time error tracking and alerting in production
- **Winston** — structured JSON logs with a unique `requestId` per request, enabling end-to-end tracing
- **Swagger** — auto-generated, always-current API docs at `/api-docs`

### 📦 Deployment — Docker + GitHub Actions
Fully containerized with **Docker + docker-compose**. The entire stack deploys to any cloud or on-premise server with a single command. **GitHub Actions** handles the CI/CD pipeline.

---

## The B2B API Layer

Beyond the consumer-facing product, Smart-Queue exposes a **headless B2B API** (`/api/v1`) — secured by API keys, rate-limited, and idempotency-protected. Third-party systems (EHR platforms, aggregators, telehealth apps) can integrate queue management directly into their own software. This is the **SaaS revenue multiplier** — hospitals push patients into Smart-Queue without staff touching any dashboard.

---

## Why This Stack

| Decision | Reason |
|---|---|
| MongoDB over SQL | Flexible schema fits hospitals, banks, salons, govt offices without migrations |
| Socket.io over polling | Real-time at <100ms vs eventual at 5–10s — critical for queue UX |
| HTTP-only JWT cookies | More secure than localStorage for sensitive healthcare data |
| WhatsApp over SMS/email | 95%+ of Indian smartphone users are active on WhatsApp daily |
| Next.js over plain React | SSR for kiosk/status pages improves load time on slow mobile networks |
| Docker from day one | One-command deployment to any hospital's on-premise server or cloud |

---

## Architecture Summary

```
Client (Browser / Phone)
        │
        │  WebSocket (Socket.io)     HTTP (REST API)
        ▼                                   ▼
┌─────────────────────────────────────────────────┐
│              Node.js + Express Backend          │
│   Auth │ Queue │ Appointments │ Kiosk │ B2B API  │
│         Middleware: JWT · RBAC · Zod · Helmet    │
└────────────────────┬────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │  MongoDB (Atlas /   │
          │  Self-hosted)       │
          │  Multi-tenant with  │
          │  compound indexes   │
          └─────────────────────┘
                     │
          ┌──────────▼──────────┐
          │  WhatsApp API       │
          │  Sentry · Winston   │
          │  node-cron jobs     │
          └─────────────────────┘
```
