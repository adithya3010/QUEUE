# Smart-Queue

> **Real-time queue and appointment management — for everyone who waits.**

---

## 💡 The Idea

Walk into any clinic, government office, or service center in India — you'll find people standing in chaotic lines, with no idea how long they'll wait or when to arrive. **Smart-Queue** eliminates that chaos entirely.

It is a **real-time queue and appointment management platform** that lets service providers (hospitals, clinics, salons, banks, government offices) manage client flow digitally — and lets clients track their position live from their own phones, without installing any app.

The product works for **any organization with agents serving clients in sequence.** Originally designed for hospitals, the architecture has been generalized to support doctors, consultants, government officers, or any "agent" who sees people one at a time.

---

## 🔴 The Problem It Solves

| Old Way | Smart-Queue Way |
|---|---|
| Patients stand in physical queues | Patients check in via QR at a kiosk |
| Nobody knows estimated wait time | Live token tracking with estimated wait time on their phone |
| Receptionists shout out names | WhatsApp alerts sent automatically when they're nearly up |
| Doctors have no visibility into who's next | Doctors see their live queue + upcoming appointments on one dashboard |
| Admin has no system-wide view | Admin sees all staff, all queues, all appointments in one place |
| No-shows waste doctor time | Automated WhatsApp reminders before scheduled appointments |

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express.js** | REST API server |
| **MongoDB + Mongoose** | Multi-tenant database with compound indexes |
| **Socket.io** | Real-time live queue updates pushed to all clients |
| **JWT (HTTP-only cookies)** | Stateless, secure authentication |
| **node-cron** | Scheduled daily WhatsApp reminders |
| **Zod** | Request validation schemas |
| **Helmet + express-mongo-sanitize** | Security hardening |
| **Winston** | Structured logging with requestId tracing |
| **Sentry** | Production error monitoring |
| **Swagger / OpenAPI** | Auto-generated API documentation |

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 14 (App Router)** | Server-side capable, SEO-friendly React framework |
| **TypeScript** | Type-safe across all components |
| **Socket.io client** | Live queue subscriptions |
| **@dnd-kit** | Drag-and-drop patient reordering |
| **Lucide React** | Consistent icon system |
| **Custom CSS design system** | Dark mode, brand tokens, responsive layout |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker + docker-compose** | Containerized deployment |
| **GitHub Actions** | CI/CD pipeline |
| **WhatsApp API (Twilio/WATI)** | Patient/client notifications |

---

## 🏗️ Architecture Overview

### Multi-Tenant by Design
Every data record is scoped by `organizationId` (hospital/business) and `locationId` (branch). A single backend instance safely serves hundreds of organizations — no data crossover possible.

### Role-Based Access Control
Three distinct roles enforced at the middleware level:
- **Admin** — manages staff, schedules, views all queues and appointments
- **Receptionist** — adds walk-in patients, manages appointments, reorders queue
- **Doctor / Agent** — views their own live queue and upcoming appointments

### Dual Interface
1. **Staff Dashboard** — authenticated web app for doctors, receptionists, and admin
2. **Kiosk** — public-facing page accessed via QR code (no login required), for patient self-registration and appointment booking

### Real-Time Engine
When any queue action occurs (patient added, completed, reordered), a Socket.io event is instantly broadcast to:
- The doctor's dashboard
- The reception dashboard
- The patient's live status page
- The public TV display board

---

## ⭐ Key Features

### For Patients / Clients
- 📱 **QR Self Check-In** — scan a code, join the queue instantly — no app, no registration
- 🔢 **Live Token Tracking** — see exact queue position, updated in real time
- ⏱️ **Estimated Wait Time** — calculated from the agent's average session duration
- 📅 **Appointment Booking** — pick an agent, date, and available time slot at the kiosk
- 💬 **WhatsApp Notifications** — confirmation on check-in, alert when nearly up, reminder before appointment

### For Doctors / Agents
- 🩺 **Live Queue Dashboard** — see who's waiting with priority flags and clinical notes
- ⬆️ **Patient Prioritisation** — move any patient to #1 with one click
- 📊 **Daily Summary Cards** — patients seen, average consult time, busiest hour of the day
- 📅 **Upcoming Appointments** — 7-day forward view of all scheduled appointments
- ⏸️ **Queue Pause with Broadcast** — pause the queue and send a custom message to all waiting patients

### For Receptionists
- ➕ **Walk-In Registration** — add patients with clinical notes and priority (Normal / High / Emergency / SOS)
- 🔄 **Drag-and-Drop Reorder** — reorder the top 3 queue positions live
- ✅ **Appointment Arrival** — mark a patient arrived to instantly transfer them to the live queue
- 📅 **7-Day Appointment View** — see all upcoming appointments for all assigned doctors

### For Admins
- 👥 **Staff Management** — add doctors and receptionists, assign receptionists to specific doctors
- 🗓️ **Doctor Scheduling** — configure per-doctor working hours, per day of the week
- 📋 **Appointments Overview** — filter by doctor to see their full 7-day appointment list
- 📺 **TV Display Mode** — public display board showing the current token being served
- 📱 **QR Code Generator** — download the kiosk QR to print and place at reception

### For B2B Integrators
- 🔑 **REST API with API Key auth** — add patients to queues programmatically
- 🔁 **Idempotency Keys** — prevent duplicate entries from retried requests
- 🔔 **Webhooks** — receive real-time events when queue status changes
- 🧩 **Zero-PII Mode** — enqueue clients with an anonymous external ID — no personal data stored
- 📄 **Swagger Docs** — auto-generated, always up-to-date API reference at `/api-docs`

---

## 🌟 What Makes It Stand Out

**1. Works without an app**
Patients only need to scan a QR code and open a browser link. No download, no account, no friction.

**2. Real-time for all parties simultaneously**
Doctor, receptionist, patient, and display board all update from the same Socket.io event in under 100ms.

**3. Kiosk appointment booking with slot intelligence**
The slot generator respects each doctor's working schedule and blocks already-booked slots in real time — no double-bookings possible.

**4. WhatsApp-first communication**
In the Indian healthcare and services market, WhatsApp is the dominant channel. Every patient notification is delivered via WhatsApp, not email.

**5. Domain-agnostic by design**
The platform uses `organization → location → agent → client` naming. The same system works for a hospital, a bank branch, a government counter, or a salon chain — without code changes.

**6. Zero-PII B2B mode**
External hospital aggregators or EHR systems can use the API to enqueue patients using only an anonymous ID — enabling compliance with data minimization regulations.

**7. Production-grade from day one**
Sentry error tracking, structured Winston logging with per-request IDs, Helmet security hardening, Swagger documentation, Docker support, GitHub Actions CI/CD, idempotency keys — all built in, not bolted on.

---

## 📁 Repository Structure

```
Smart-Queue/
├── backend/                  # Node.js + Express API
│   ├── models/               # Mongoose schemas (User, Patient, Appointment, Hospital…)
│   ├── routes/               # Route handlers (queue, auth, admin, appointments, kiosk…)
│   ├── middleware/           # Auth, rate limit, idempotency, error handling
│   ├── utils/                # Logger, notification service, slot generator, wait time calc
│   ├── cron/                 # Scheduled jobs (reminders, schedule sync)
│   ├── socket/               # Socket.io event handlers
│   └── config/               # DB, Sentry, Swagger configuration
│
├── frontend-next/            # Next.js 14 frontend
│   └── src/app/
│       ├── (dashboard)/      # Protected staff dashboards (doctor, reception, admin)
│       ├── kiosk/            # Public kiosk + TV display
│       ├── status/           # Patient live-tracking page
│       └── login / signup /  # Auth flows
│
└── docker-compose.yml        # Full-stack containerized setup
```

---

## 🚀 Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/your-username/smart-queue.git

# 2. Set up environment variables
cp backend/.env.example backend/.env
cp frontend-next/.env.local.example frontend-next/.env.local

# 3. Run with Docker
docker-compose up --build

# — OR — run locally
cd backend && npm install && node server.js
cd frontend-next && npm install && npm run dev
```

API docs available at: `http://localhost:5000/api-docs`

---

*Built with ❤️ to fix the one problem every Indian has experienced — waiting without knowing why.*
