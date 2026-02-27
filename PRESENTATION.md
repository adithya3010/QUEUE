# Smart-Queue — Presentation Deck

---

## Slide 1 — Title

**Smart-Queue**
*Eliminating the Wait. Digitizing the Queue.*

> Real-time queue and appointment management for any organization that serves clients one at a time.

---

## Slide 2 — The Problem (Hook)

**"How long will I wait?"**

Every day, millions of people walk into a clinic, bank, or government office — and have no answer to this question.

- 🏥 Patients stand in disorganized lines with no visibility
- 🩺 Doctors don't know who's next or how many are waiting
- 📋 Receptionists manage chaos manually on paper or phone
- ❌ Missed appointments waste everyone's time
- 📵 No-shows go unnotified

> **The waiting room experience hasn't changed in 50 years. Smart-Queue changes that.**

---

## Slide 3 — The Solution

**Smart-Queue is a digital queue and appointment system** that works for hospitals, clinics, banks, salons, and government offices.

### How it works in 3 steps:

```
1. Patient scans a QR code → Joins the queue or books a slot
2. Staff manages everything from a live dashboard
3. Patient tracks their position live on their phone — no app needed
```

✅ No app install required  
✅ Works on any smartphone  
✅ WhatsApp notifications for every update  

---

## Slide 4 — Live Demo Flow

### Journey 1 — Walk-in Patient
1. Patient walks in, scans QR at reception
2. Gets a token number + WhatsApp confirmation
3. Tracks live position on their phone
4. Receives a "You're nearly up!" alert when 2nd in line

### Journey 2 — Appointment Booking (Kiosk)
1. Patient scans kiosk QR code
2. Selects doctor → picks a date → picks an available time slot
3. Gets WhatsApp confirmation with appointment details
4. Gets a reminder the day before

### Journey 3 — Doctor Dashboard
1. Doctor sees live queue with wait times and patient notes
2. Can prioritize emergencies with one click
3. Sees all upcoming appointments for the next 7 days
4. Receives daily stats — patients seen, busiest hour, avg time

---

## Slide 5 — Who Uses It (User Roles)

| Role | What They Do |
|---|---|
| **Patient / Client** | Self-registers via QR, tracks position on phone, gets WhatsApp alerts |
| **Agent / Doctor** | Manages live queue, views upcoming appointments, controls availability |
| **Operator / Receptionist** | Adds walk-ins, manages appointments, reorders queue |
| **Admin** | Manages staff, sets schedules, views all dashboards, generates QR codes |
| **TV Display** | Public screen shows current token being served |

---

## Slide 6 — Key Features

### ⚡ Real-Time Queue
- Live token tracking updated in under **100ms**
- All screens (doctor, receptionist, patient, TV) update simultaneously

### 📅 Smart Appointment Booking
- Slot generator respects doctor's weekly schedule and blocks taken slots
- Race condition protection — no double-bookings possible

### 💬 WhatsApp-First Communication
- Queue confirmation → "Nearly Up" alert → Day-before reminder
- No email, no SMS — WhatsApp where your patients already are

### 📊 Doctor Analytics
- Daily summary: patients seen, avg consultation time, busiest hour
- 7-day upcoming appointment view

### 📺 TV Display Board
- Public display shows current token — visible in the waiting area
- Auto-updates in real time

---

## Slide 7 — Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Backend** | Node.js + Express | High-throughput, event-driven |
| **Database** | MongoDB | Flexible, multi-tenant by design |
| **Real-time** | Socket.io | <100ms push updates, no polling |
| **Frontend** | Next.js 14 + TypeScript | Fast, SEO-ready, type-safe |
| **Auth** | JWT in HTTP-only cookies | XSS-proof session security |
| **Notifications** | WhatsApp API (Twilio/WATI) | Dominant channel in target market |
| **Monitoring** | Sentry + Winston logs | Production-grade error tracking |
| **Deployment** | Docker + GitHub Actions | One-command deploy anywhere |

---

## Slide 8 — The API (B2B Layer)

Smart-Queue is not just a product — it's a **platform**.

We expose a full **B2B REST API** for hospitals and enterprises that want to integrate queue management into their own systems:

```
POST   /api/v1/queue              → Add a patient programmatically
GET    /api/v1/queue/:id          → Get live wait time for a patient
DELETE /api/v1/queue/:id          → Cancel a queue entry
GET    /api/v1/doctor/:id/status  → Check if a doctor is available
POST   /api/v1/appointments/book  → Book an appointment via API
```

**Secured by:** API Key authentication + rate limiting + idempotency keys  
**Documented at:** `/api-docs` (auto-generated Swagger)

> Any EHR system, telehealth app, or hospital aggregator can plug in Smart-Queue in hours, not weeks.

---

## Slide 9 — What Makes Us Different

| Feature | Smart-Queue | Traditional Systems |
|---|---|---|
| Patient tracking | Live, on any phone browser | Physical token slip or nothing |
| Notifications | WhatsApp, automated | Manual calls or SMS |
| Appointment booking | Self-serve kiosk 24/7 | Receptionist phone booking |
| Real-time updates | <100ms via WebSocket | Page refresh / manual |
| B2B integration | Full REST API + webhooks | Proprietary, closed |
| Deployment | Cloud or on-premise Docker | Cloud-only or desktop software |
| Domain | Hospitals, banks, salons, govt | Hospital-specific |

---

## Slide 10 — Market & Use Cases

**Who can use Smart-Queue today — without changes:**

- 🏥 Hospitals and clinics
- 🏦 Bank branches and NBFCs
- 🏛️ Government service counters (RTO, ration offices, registrar)
- 💇 Salons and wellness studios
- 🏫 University admission counters
- 🏢 Corporate service desks

> The same platform, configured differently for each. The architecture is domain-agnostic by design.

---

## Slide 11 — Business Model

| Revenue Stream | How |
|---|---|
| **SaaS Subscription** | Monthly per-organization fee (Basic / Pro / Enterprise tiers) |
| **B2B API Access** | Per-call pricing or monthly quota for third-party integrations |
| **On-Premise Deployment** | One-time setup + annual maintenance for large hospitals |
| **White-Label** | License the platform to hospital chains under their branding |

---

## Slide 12 — Closing

**Smart-Queue in one sentence:**

> *We give every waiting person a number, a time, and a notification — so they never have to wonder again.*

### What we've built:
- ✅ Full-stack product live and running
- ✅ 30+ API endpoints across 3 security layers
- ✅ Real-time engine serving multiple organizations simultaneously
- ✅ WhatsApp notification pipeline active
- ✅ B2B API ready for enterprise integration
- ✅ Docker-deployable in one command

---

*Smart-Queue — Built to fix the one problem every person has experienced: waiting without knowing why.*
