import React from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Key, Zap, RefreshCw, Activity, ShieldCheck,
    Search, Calendar, BarChart2, Wrench, ChevronRight, Terminal,
    Globe, Users, Clock, TrendingUp, AlertCircle, CheckCircle,
    BookOpen
} from 'lucide-react';

export const metadata = {
    title: 'SmartQueue — B2B API Reference',
    description: 'Complete API documentation for the SmartQueue Queue-as-a-Service B2B integration platform.',
};

// ─── Reusable inline components ──────────────────────────────────────────────

function MethodBadge({ method }: { method: 'GET' | 'POST' | 'PUT' | 'DELETE' }) {
    const colors = {
        GET: 'bg-blue-500 text-blue-950',
        POST: 'bg-emerald-500 text-emerald-950',
        PUT: 'bg-amber-400 text-amber-950',
        DELETE: 'bg-red-500 text-red-950',
    };
    return (
        <span className={`${colors[method]} font-black text-xs px-2 py-1 rounded`}>{method}</span>
    );
}

function EndpointHeader({ method, path, summary }: { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string; summary: string }) {
    return (
        <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex flex-wrap items-center gap-3">
            <MethodBadge method={method} />
            <code className="text-gray-100 font-bold text-sm">/api/v1{path}</code>
            <span className="text-gray-400 text-sm ml-auto">{summary}</span>
        </div>
    );
}

function CodeBlock({ children, lang = 'json' }: { children: string; lang?: string }) {
    return (
        <pre className={`bg-[#0b1021] border border-white/10 p-4 rounded-xl overflow-x-auto text-sm my-3 text-gray-300 language-${lang}`}>
            {children}
        </pre>
    );
}

function ParamRow({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) {
    return (
        <tr className="border-b border-white/5">
            <td className="py-2 pr-4">
                <code className="text-cyan-300 text-sm">{name}</code>
                {required && <span className="ml-1 text-xs text-red-400">*</span>}
            </td>
            <td className="py-2 pr-4 text-gray-500 text-sm">{type}</td>
            <td className="py-2 text-gray-400 text-sm">{desc}</td>
        </tr>
    );
}

function SectionTitle({ id, icon, children, color = 'text-white' }: { id: string; icon: React.ReactNode; children: React.ReactNode; color?: string }) {
    return (
        <h2 id={id} className={`text-2xl font-bold ${color} mb-4 flex items-center gap-2 scroll-mt-24`}>
            {icon}{children}
        </h2>
    );
}

function InfoBox({ type, children }: { type: 'warning' | 'tip' | 'info'; children: React.ReactNode }) {
    const styles = {
        warning: 'border-amber-500/30 bg-amber-900/10 text-amber-200',
        tip: 'border-emerald-500/30 bg-emerald-900/10 text-emerald-200',
        info: 'border-blue-500/30 bg-blue-900/10 text-blue-200',
    };
    const icons = {
        warning: <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />,
        tip: <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />,
        info: <BookOpen className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />,
    };
    return (
        <div className={`border ${styles[type]} p-4 rounded-lg text-sm flex items-start gap-3 my-4`}>
            {icons[type]}
            <div>{children}</div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-[#060c21] text-gray-300 font-sans selection:bg-blue-500/30">

            {/* Navbar */}
            <nav className="border-b border-white/10 bg-[#060c21]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-white hover:text-cyan-400 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-bold">SmartQueue</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20">API v1</span>
                        <Link href="/login" className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition-colors">
                            Developer Portal
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-12">

                {/* ── Sidebar ── */}
                <aside className="w-full md:w-64 flex-shrink-0">
                    <div className="sticky top-24 space-y-6 text-sm">

                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Getting Started</p>
                            <ul className="space-y-1.5 font-medium text-gray-400">
                                <li><a href="#authentication" className="hover:text-cyan-400 transition-colors flex items-center gap-2"><Key className="w-4 h-4" /> Authentication</a></li>
                                <li><a href="#rate-limits" className="hover:text-cyan-400 transition-colors flex items-center gap-2"><Zap className="w-4 h-4" /> Rate Limits</a></li>
                                <li><a href="#idempotency" className="hover:text-cyan-400 transition-colors flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Idempotency</a></li>
                                <li><a href="#errors" className="hover:text-cyan-400 transition-colors flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Error Codes</a></li>
                            </ul>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Core Concepts</p>
                            <ul className="space-y-1.5 font-medium text-gray-400">
                                <li><a href="#webhooks" className="hover:text-purple-400 transition-colors flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Webhooks</a></li>
                                <li><a href="#zero-pii" className="hover:text-emerald-400 transition-colors flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Zero-PII</a></li>
                            </ul>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Discovery</p>
                            <ul className="space-y-1.5 font-medium text-gray-400">
                                <li><a href="#info" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> GET /info</a></li>
                                <li><a href="#branches" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> GET /branches</a></li>
                                <li><a href="#doctors" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> GET /doctors</a></li>
                                <li><a href="#slots" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> GET /doctors/:id/slots</a></li>
                                <li><a href="#doctor-status" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> GET /doctor/:id/status</a></li>
                            </ul>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Queue</p>
                            <ul className="space-y-1.5 font-medium text-gray-400">
                                <li><a href="#queue-create" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> POST /queue</a></li>
                                <li><a href="#queue-bulk" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> POST /queue/bulk</a></li>
                                <li><a href="#queue-list" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> GET /queue</a></li>
                                <li><a href="#queue-stats" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> GET /queue/stats</a></li>
                                <li><a href="#queue-status" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> GET /queue/:id</a></li>
                                <li><a href="#queue-priority" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> PUT /queue/:id/priority</a></li>
                                <li><a href="#queue-notes" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> PUT /queue/:id/notes</a></li>
                                <li><a href="#queue-cancel" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> DELETE /queue/:id</a></li>
                                <li><a href="#doctor-queue" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> GET /doctor/:id/queue</a></li>
                            </ul>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Appointments</p>
                            <ul className="space-y-1.5 font-medium text-gray-400">
                                <li><a href="#appt-book" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> POST /appointments/book</a></li>
                                <li><a href="#appt-list" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> GET /appointments</a></li>
                                <li><a href="#appt-arrive" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> PUT /appointments/:id/arrive</a></li>
                                <li><a href="#appt-cancel" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> PUT /appointments/:id/cancel</a></li>
                            </ul>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Analytics</p>
                            <ul className="space-y-1.5 font-medium text-gray-400">
                                <li><a href="#analytics-summary" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> GET /analytics/summary</a></li>
                                <li><a href="#analytics-doctor" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> GET /analytics/doctor/:id</a></li>
                                <li><a href="#analytics-wait" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> GET /analytics/wait-times</a></li>
                            </ul>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Developer Tools</p>
                            <ul className="space-y-1.5 font-medium text-gray-400">
                                <li><a href="#webhook-test" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> POST /webhooks/test</a></li>
                                <li><a href="#testing" className="hover:text-fuchsia-400 transition-colors flex items-center gap-2"><Terminal className="w-4 h-4" /> Integration Testing</a></li>
                                <li><a href="#playground" className="hover:text-fuchsia-400 transition-colors flex items-center gap-2"><Zap className="w-4 h-4" /> Live Playground</a></li>
                            </ul>
                        </div>

                    </div>
                </aside>

                {/* ── Main Content ── */}
                <main className="flex-1 min-w-0 space-y-0">

                    {/* Hero */}
                    <div className="mb-12">
                        <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight">SmartQueue B2B API</h1>
                        <p className="text-lg text-gray-400 max-w-2xl">
                            Embed live queue management into your EHR, clinic booking system, or patient-facing app. All endpoints are scoped to your hospital via an API key — no server-side session required.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
                            <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-cyan-300">Base URL: /api/v1</span>
                            <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-gray-300">Content-Type: application/json</span>
                            <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-gray-300">Auth: x-api-key header</span>
                        </div>
                    </div>

                    <hr className="border-white/10 my-10" />

                    {/* ────────── GETTING STARTED ────────── */}

                    <section id="authentication" className="scroll-mt-24 mb-12">
                        <SectionTitle id="authentication" icon={<Key className="text-cyan-400" />} color="text-white">Authentication</SectionTitle>
                        <p className="text-gray-400 mb-4">
                            All B2B endpoints require an <code className="bg-white/10 text-cyan-300 px-1.5 py-0.5 rounded">x-api-key</code> header. Keys are scoped to a hospital — every request automatically operates within that hospital&apos;s data boundary.
                        </p>
                        <h3 className="text-base font-semibold text-gray-200 mb-2">Key Format</h3>
                        <p className="text-gray-400 text-sm mb-3">
                            Keys are prefixed to indicate environment. Use <code className="text-amber-300 bg-white/10 px-1 py-0.5 rounded">sq_test_*</code> during development and <code className="text-emerald-300 bg-white/10 px-1 py-0.5 rounded">sq_live_*</code> in production.
                        </p>
                        <CodeBlock lang="bash">{`# Every request must include this header:
x-api-key: sq_live_BASE64_KEY_ID_secret

# Example curl:
curl https://your-domain.com/api/v1/info \\
  -H "x-api-key: sq_live_your_key_here"`}</CodeBlock>
                        <InfoBox type="warning">
                            Never expose your <strong>sq_live_*</strong> keys in client-side (browser) code. Generate keys in the Developer Portal and rotate them if compromised.
                        </InfoBox>
                    </section>

                    <hr className="border-white/10 my-10" />

                    <section id="rate-limits" className="scroll-mt-24 mb-12">
                        <SectionTitle id="rate-limits" icon={<Zap className="text-yellow-400" />} color="text-white">Rate Limits</SectionTitle>
                        <p className="text-gray-400 mb-4">Limits are enforced per API key on a rolling 15-minute window and a soft monthly cap tied to your subscription plan.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border border-white/10 rounded-xl overflow-hidden">
                                <thead className="bg-white/5 text-gray-300 font-semibold">
                                    <tr>
                                        <th className="text-left px-4 py-3 border-b border-white/10">Plan</th>
                                        <th className="text-left px-4 py-3 border-b border-white/10">Requests / 15 min</th>
                                        <th className="text-left px-4 py-3 border-b border-white/10">Monthly Cap</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-400">
                                    <tr className="border-b border-white/5"><td className="px-4 py-3 text-white font-medium">Basic</td><td className="px-4 py-3">100</td><td className="px-4 py-3">1,000</td></tr>
                                    <tr className="border-b border-white/5"><td className="px-4 py-3 text-white font-medium">Pro</td><td className="px-4 py-3">1,000</td><td className="px-4 py-3">10,000</td></tr>
                                    <tr><td className="px-4 py-3 text-white font-medium">Enterprise</td><td className="px-4 py-3">10,000</td><td className="px-4 py-3">Unlimited</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-400 text-sm mt-3">Exceeding the window limit returns <code className="text-yellow-300 bg-white/10 px-1 py-0.5 rounded">HTTP 429 Too Many Requests</code>. Exceeding the monthly cap returns <code className="text-yellow-300 bg-white/10 px-1 py-0.5 rounded">HTTP 402 Payment Required</code>.</p>
                    </section>

                    <hr className="border-white/10 my-10" />

                    <section id="idempotency" className="scroll-mt-24 mb-12">
                        <SectionTitle id="idempotency" icon={<ShieldCheck className="text-emerald-400" />} color="text-white">Idempotency</SectionTitle>
                        <p className="text-gray-400 mb-4">
                            On network failures, retrying a <code className="bg-white/10 px-1 py-0.5 rounded text-cyan-300">POST /queue</code> request without an idempotency key would add the patient twice. Pass a <code className="bg-white/10 px-1 py-0.5 rounded text-emerald-300">Idempotency-Key</code> header with any UUID. If you repeat a request with the same key, SmartQueue returns the original result without creating a duplicate.
                        </p>
                        <CodeBlock lang="bash">{`POST /api/v1/queue
x-api-key: sq_live_your_key_here
Idempotency-Key: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Content-Type: application/json

{
  "doctorId": "64f1a2b3c4d5e6f7g8h9i0j4",
  "externalPatientId": "usr_987654321"
}`}</CodeBlock>
                        <InfoBox type="tip">
                            Idempotency keys expire after <strong>24 hours</strong>. Generate a fresh UUID per logical operation, not per HTTP retry.
                        </InfoBox>
                    </section>

                    <hr className="border-white/10 my-10" />

                    <section id="errors" className="scroll-mt-24 mb-12">
                        <SectionTitle id="errors" icon={<AlertCircle className="text-red-400" />} color="text-white">Error Codes</SectionTitle>
                        <p className="text-gray-400 mb-4">All error responses return a consistent JSON shape:</p>
                        <CodeBlock>{`{
  "success": false,
  "error": "Human-readable message or validation detail"
}`}</CodeBlock>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border border-white/10 rounded-xl overflow-hidden">
                                <thead className="bg-white/5 text-gray-300 font-semibold">
                                    <tr>
                                        <th className="text-left px-4 py-3 border-b border-white/10">Status</th>
                                        <th className="text-left px-4 py-3 border-b border-white/10">Meaning</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-400 text-sm">
                                    <tr className="border-b border-white/5"><td className="px-4 py-2.5 text-red-300 font-mono">400</td><td className="px-4 py-2.5">Bad Request — missing or invalid parameters</td></tr>
                                    <tr className="border-b border-white/5"><td className="px-4 py-2.5 text-red-300 font-mono">401</td><td className="px-4 py-2.5">Unauthorized — missing or invalid API key</td></tr>
                                    <tr className="border-b border-white/5"><td className="px-4 py-2.5 text-red-300 font-mono">402</td><td className="px-4 py-2.5">Monthly quota exceeded — upgrade your plan</td></tr>
                                    <tr className="border-b border-white/5"><td className="px-4 py-2.5 text-red-300 font-mono">404</td><td className="px-4 py-2.5">Not Found — resource does not exist or belongs to another hospital</td></tr>
                                    <tr className="border-b border-white/5"><td className="px-4 py-2.5 text-red-300 font-mono">409</td><td className="px-4 py-2.5">Conflict — e.g. patient already in queue</td></tr>
                                    <tr className="border-b border-white/5"><td className="px-4 py-2.5 text-red-300 font-mono">429</td><td className="px-4 py-2.5">Too Many Requests — rate limit window exceeded</td></tr>
                                    <tr><td className="px-4 py-2.5 text-red-300 font-mono">500</td><td className="px-4 py-2.5">Internal Server Error — retry with exponential back-off</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <hr className="border-white/10 my-10" />

                    {/* ────────── CORE CONCEPTS ────────── */}

                    <section id="webhooks" className="scroll-mt-24 mb-12">
                        <SectionTitle id="webhooks" icon={<RefreshCw className="text-purple-400" />} color="text-white">Webhooks</SectionTitle>
                        <p className="text-gray-400 mb-4">
                            Instead of polling for queue changes, register HTTPS endpoints to receive real-time push events. Configure webhooks in the Developer Portal under <strong>Settings → Webhooks</strong>.
                        </p>
                        <h3 className="text-base font-semibold text-gray-200 mb-3">Available Events</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                            {[
                                ['queue.created', 'A patient was added to a queue'],
                                ['queue.updated', 'Queue reordered or ETA changed'],
                                ['queue.completed', 'Doctor finished a consultation'],
                                ['queue.cancelled', 'A queue entry was cancelled'],
                                ['doctor.status_changed', 'Doctor paused or resumed availability'],
                            ].map(([event, desc]) => (
                                <div key={event} className="bg-white/5 border border-white/10 p-3 rounded-lg">
                                    <code className="text-purple-300 text-sm">{event}</code>
                                    <p className="text-xs text-gray-400 mt-1">{desc}</p>
                                </div>
                            ))}
                        </div>
                        <h3 className="text-base font-semibold text-gray-200 mb-2">Payload Structure</h3>
                        <CodeBlock>{`{
  "event": "queue.created",
  "hospitalId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "data": { /* event-specific fields */ },
  "_test": false
}`}</CodeBlock>
                        <h3 className="text-base font-semibold text-gray-200 mb-2">Signature Verification (HMAC SHA-256)</h3>
                        <p className="text-gray-400 text-sm mb-3">Every delivery includes a <code className="text-purple-300 bg-white/10 px-1 py-0.5 rounded">SmartQueue-Signature</code> header. Verify it to reject spoofed requests.</p>
                        <CodeBlock lang="js">{`// Node.js verification example
const crypto = require('crypto');

function verifyWebhook(rawBody, signatureHeader, webhookSecret) {
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody, 'utf8')
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader)
  );
}`}</CodeBlock>
                    </section>

                    <hr className="border-white/10 my-10" />

                    <section id="zero-pii" className="scroll-mt-24 mb-12">
                        <div className="border border-blue-500/30 bg-blue-900/10 p-6 rounded-2xl">
                            <h2 className="text-xl font-bold text-blue-300 mb-2 flex items-center gap-2 scroll-mt-24"><ShieldCheck /> Zero-PII Recommendation</h2>
                            <p className="text-sm text-gray-300">
                                To reduce HIPAA/GDPR exposure, pass an opaque <code className="bg-black/30 text-blue-200 px-1 py-0.5 rounded">externalPatientId</code> (your internal record ID) instead of patient names or phone numbers. SmartQueue position calculations depend on order, not identity. Names and phone numbers in request bodies are <strong>always optional</strong>.
                            </p>
                        </div>
                    </section>

                    <hr className="border-white/10 my-10" />

                    {/* ────────── PHASE 1: DISCOVERY ────────── */}

                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <Search className="text-blue-400 w-5 h-5" />
                            <h2 className="text-xl font-bold text-white">Discovery</h2>
                            <span className="text-xs bg-blue-400/10 text-blue-300 border border-blue-400/20 px-2 py-0.5 rounded-full">Phase 1</span>
                        </div>
                        <p className="text-gray-400 text-sm">Introspect the hospital&apos;s structure — branches, doctors, and available slots — before placing patients.</p>
                    </div>

                    {/* GET /info */}
                    <div id="info" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="GET" path="/info" summary="Hospital profile" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">Returns the hospital name, subscription plan, status, and branch count associated with the API key in use.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Response 200</h4>
                            <CodeBlock>{`{
  "success": true,
  "data": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "name": "City General Hospital",
    "email": "admin@citygeneral.com",
    "subscriptionPlan": "Pro",
    "status": "Active",
    "branchCount": 3
  }
}`}</CodeBlock>
                        </div>
                    </div>

                    {/* GET /branches */}
                    <div id="branches" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="GET" path="/branches" summary="List branches" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">Returns all branches for the hospital.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Response 200</h4>
                            <CodeBlock>{`{
  "success": true,
  "total": 2,
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7g8h9i0j2",
      "name": "Main Campus",
      "address": "123 Health St",
      "isActive": true
    },
    {
      "id": "64f1a2b3c4d5e6f7g8h9i0j3",
      "name": "North Clinic",
      "address": "456 Care Ave",
      "isActive": true
    }
  ]
}`}</CodeBlock>
                        </div>
                    </div>

                    {/* GET /doctors */}
                    <div id="doctors" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="GET" path="/doctors" summary="List doctors" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">Returns all doctors. Filter by branch, specialization, or availability.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Query Parameters</h4>
                            <table className="w-full text-sm mb-4">
                                <tbody>
                                    <ParamRow name="branchId" type="string" desc="Filter to a specific branch" />
                                    <ParamRow name="specialty" type="string" desc="Case-insensitive partial match on specialization (e.g. cardio)" />
                                    <ParamRow name="availability" type="Available | Not Available" desc="Filter by current availability status" />
                                </tbody>
                            </table>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Response 200</h4>
                            <CodeBlock>{`{
  "success": true,
  "total": 1,
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7g8h9i0j4",
      "name": "Dr. Sarah Chen",
      "specialization": "Cardiology",
      "availability": "Available",
      "avgConsultationTime": 10,
      "branchId": "64f1a2b3c4d5e6f7g8h9i0j2",
      "pauseMessage": null,
      "workingDays": ["Monday","Tuesday","Wednesday","Thursday","Friday"]
    }
  ]
}`}</CodeBlock>
                        </div>
                    </div>

                    {/* GET /doctors/:id/slots */}
                    <div id="slots" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="GET" path="/doctors/:doctorId/slots" summary="Available appointment slots" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">Returns available time slots for a doctor on a given date. Slots are derived from the doctor&apos;s schedule and <code className="text-cyan-300 bg-white/10 px-1 py-0.5 rounded">avgConsultationTime</code>, minus already-booked slots. Bookable up to 7 days in advance.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Path Parameters</h4>
                            <table className="w-full text-sm mb-4">
                                <tbody>
                                    <ParamRow name="doctorId" type="string" required desc="MongoDB ObjectId of the doctor" />
                                </tbody>
                            </table>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Query Parameters</h4>
                            <table className="w-full text-sm mb-4">
                                <tbody>
                                    <ParamRow name="date" type="YYYY-MM-DD" required desc="Date to check availability for" />
                                </tbody>
                            </table>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Response 200</h4>
                            <CodeBlock>{`{
  "success": true,
  "data": {
    "doctorId": "64f1a2b3c4d5e6f7g8h9i0j4",
    "doctorName": "Dr. Sarah Chen",
    "specialization": "Cardiology",
    "availability": "Available",
    "date": "2026-02-28",
    "totalAvailable": 3,
    "slots": [
      { "time": "09:00", "label": "9:00 AM" },
      { "time": "09:10", "label": "9:10 AM" },
      { "time": "09:20", "label": "9:20 AM" }
    ]
  }
}`}</CodeBlock>
                        </div>
                    </div>

                    {/* GET /doctor/:id/status */}
                    <div id="doctor-status" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="GET" path="/doctor/:doctorId/status" summary="Doctor availability status" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">Returns a doctor&apos;s current availability and average consultation time. Useful for real-time status widgets.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Response 200</h4>
                            <CodeBlock>{`{
  "success": true,
  "data": {
    "availability": "Available",
    "avgConsultationTime": 10,
    "pauseMessage": null
  }
}`}</CodeBlock>
                        </div>
                    </div>

                    <hr className="border-white/10 my-10" />

                    {/* ────────── PHASE 2: QUEUE ────────── */}

                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <Activity className="text-cyan-400 w-5 h-5" />
                            <h2 className="text-xl font-bold text-white">Queue Management</h2>
                            <span className="text-xs bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 px-2 py-0.5 rounded-full">Phase 2</span>
                        </div>
                        <p className="text-gray-400 text-sm">Add patients, check position, bulk-import, prioritize, and cancel queue entries.</p>
                    </div>

                    {/* POST /queue */}
                    <div id="queue-create" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="POST" path="/queue" summary="Add a patient to the queue" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">Enqueues a patient for a doctor. Returns a token number and a public tracking URL. Supports idempotency via the <code className="text-emerald-300 bg-white/10 px-1 py-0.5 rounded">Idempotency-Key</code> header.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Request Body</h4>
                            <table className="w-full text-sm mb-4">
                                <tbody>
                                    <ParamRow name="doctorId" type="string" required desc="Target doctor ObjectId" />
                                    <ParamRow name="externalPatientId" type="string" desc="Your system's opaque patient identifier (recommended)" />
                                    <ParamRow name="name" type="string" desc="Patient display name (optional)" />
                                    <ParamRow name="description" type="string" desc="Visit reason or triage note (optional)" />
                                </tbody>
                            </table>
                            <CodeBlock lang="bash">{`curl -X POST /api/v1/queue \\
  -H "x-api-key: sq_live_your_key" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -H "Content-Type: application/json" \\
  -d '{
    "doctorId": "64f1a2b3c4d5e6f7g8h9i0j4",
    "externalPatientId": "usr_987654321",
    "description": "Chest pain follow-up"
  }'`}</CodeBlock>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 mt-4">Response 201</h4>
                            <CodeBlock>{`{
  "success": true,
  "data": {
    "id": "64f2b3c4d5e6f7g8h9i0j1k2",
    "tokenNumber": 5,
    "trackingUrl": "https://your-domain.com/status/uuid-here",
    "estimatedWaitTimeMinutes": 40
  }
}`}</CodeBlock>
                        </div>
                    </div>

                    {/* POST /queue/bulk */}
                    <div id="queue-bulk" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="POST" path="/queue/bulk" summary="Bulk-add up to 50 patients" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">Inserts multiple patients in a single call. Tokens are assigned sequentially. Ideal for morning sync from a PMS/HIS system.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Request Body</h4>
                            <CodeBlock>{`{
  "doctorId": "64f1a2b3c4d5e6f7g8h9i0j4",
  "patients": [
    { "externalPatientId": "ext_001", "description": "Routine checkup" },
    { "externalPatientId": "ext_002", "description": "Follow-up" },
    { "externalPatientId": "ext_003", "name": "Jane Doe" }
  ]
}`}</CodeBlock>
                            <InfoBox type="info">Maximum 50 patients per call. A <code>400</code> is returned if the array exceeds this limit.</InfoBox>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Response 201</h4>
                            <CodeBlock>{`{
  "success": true,
  "message": "3 patients added to queue",
  "data": [
    { "id": "...", "externalPatientId": "ext_001", "tokenNumber": 6, "trackingUrl": "..." },
    { "id": "...", "externalPatientId": "ext_002", "tokenNumber": 7, "trackingUrl": "..." },
    { "id": "...", "externalPatientId": "ext_003", "tokenNumber": 8, "trackingUrl": "..." }
  ]
}`}</CodeBlock>
                        </div>
                    </div>

                    {/* GET /queue (list) */}
                    <div id="queue-list" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="GET" path="/queue" summary="List queue entries" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">Returns queue entries for the hospital. Defaults to <code className="text-cyan-300 bg-white/10 px-1 py-0.5 rounded">status=waiting</code>.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Query Parameters</h4>
                            <table className="w-full text-sm mb-4">
                                <tbody>
                                    <ParamRow name="doctorId" type="string" desc="Filter to a specific doctor" />
                                    <ParamRow name="branchId" type="string" desc="Filter to a specific branch" />
                                    <ParamRow name="status" type="waiting | completed | cancelled" desc="Defaults to waiting" />
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* GET /queue/stats */}
                    <div id="queue-stats" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="GET" path="/queue/stats" summary="Live queue statistics" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">Returns waiting counts and estimated clear times per active doctor.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Query Parameters</h4>
                            <table className="w-full text-sm mb-4">
                                <tbody>
                                    <ParamRow name="doctorId" type="string" desc="Optional — filter to a single doctor" />
                                </tbody>
                            </table>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Response 200</h4>
                            <CodeBlock>{`{
  "success": true,
  "data": {
    "totalWaiting": 12,
    "activeDoctors": 3,
    "perDoctor": [
      {
        "doctorId": "64f1...",
        "doctorName": "Dr. Sarah Chen",
        "availability": "Available",
        "waitingCount": 4,
        "estimatedClearTimeMinutes": 40
      }
    ]
  }
}`}</CodeBlock>
                        </div>
                    </div>

                    {/* GET /queue/:uniqueLinkId */}
                    <div id="queue-status" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="GET" path="/queue/:uniqueLinkId" summary="Patient queue status" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">Retrieves real-time position and ETA for a specific patient. The <code className="text-cyan-300 bg-white/10 px-1 py-0.5 rounded">uniqueLinkId</code> is the UUID segment returned when the patient was added.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Response 200</h4>
                            <CodeBlock>{`{
  "success": true,
  "data": {
    "status": "waiting",
    "tokenNumber": 5,
    "position": 3,
    "estimatedWaitTimeMinutes": 15
  }
}`}</CodeBlock>
                        </div>
                    </div>

                    {/* PUT /queue/:id/priority */}
                    <div id="queue-priority" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="PUT" path="/queue/:uniqueLinkId/priority" summary="Move patient to front of queue" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">Sets the patient&apos;s sort order to make them next to be seen. Emits a real-time socket update and fires a <code className="text-purple-300 bg-white/10 px-1 py-0.5 rounded">queue.updated</code> webhook.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Response 200</h4>
                            <CodeBlock>{`{
  "success": true,
  "message": "Patient moved to front of queue",
  "tokenNumber": 5
}`}</CodeBlock>
                        </div>
                    </div>

                    {/* PUT /queue/:id/notes */}
                    <div id="queue-notes" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="PUT" path="/queue/:uniqueLinkId/notes" summary="Attach clinical notes" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">Attach or overwrite a triage note on a waiting queue entry. Visible to the doctor on their dashboard.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Request Body</h4>
                            <CodeBlock>{`{ "notes": "BP 140/90, c/o chest pain. Flagged urgent." }`}</CodeBlock>
                        </div>
                    </div>

                    {/* DELETE /queue/:id */}
                    <div id="queue-cancel" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="DELETE" path="/queue/:uniqueLinkId" summary="Cancel a queue entry" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm">Cancels an active (waiting) queue entry. Subsequent <code className="text-cyan-300 bg-white/10 px-1 py-0.5 rounded">GET /queue/:id</code> calls will return <code className="text-gray-300 bg-white/10 px-1 py-0.5 rounded">status: &quot;cancelled&quot;</code>.</p>
                        </div>
                    </div>

                    {/* GET /doctor/:id/queue */}
                    <div id="doctor-queue" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="GET" path="/doctor/:doctorId/queue" summary="All waiting patients for a doctor" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm">Returns the ordered list of all currently waiting patients for a specific doctor, including token numbers and wait estimates.</p>
                        </div>
                    </div>

                    <hr className="border-white/10 my-10" />

                    {/* ────────── PHASE 3: APPOINTMENTS ────────── */}

                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <Calendar className="text-amber-400 w-5 h-5" />
                            <h2 className="text-xl font-bold text-white">Appointment Lifecycle</h2>
                            <span className="text-xs bg-amber-400/10 text-amber-300 border border-amber-400/20 px-2 py-0.5 rounded-full">Phase 3</span>
                        </div>
                        <p className="text-gray-400 text-sm">Book scheduled appointments, and bridge them into the live queue when the patient arrives.</p>
                    </div>

                    {/* POST /appointments/book */}
                    <div id="appt-book" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="POST" path="/appointments/book" summary="Schedule an appointment" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">Creates a future appointment for a doctor. The slot at <code className="text-cyan-300 bg-white/10 px-1 py-0.5 rounded">scheduledAt</code> is blocked from future bookings.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Request Body</h4>
                            <table className="w-full text-sm mb-4">
                                <tbody>
                                    <ParamRow name="doctorId" type="string" required desc="Target doctor ObjectId" />
                                    <ParamRow name="patientName" type="string" required desc="Patient display name" />
                                    <ParamRow name="phone" type="string" required desc="Contact number" />
                                    <ParamRow name="scheduledAt" type="ISO 8601 datetime" required desc="Appointment datetime (UTC)" />
                                    <ParamRow name="notes" type="string" desc="Pre-visit notes (optional)" />
                                </tbody>
                            </table>
                            <CodeBlock lang="bash">{`curl -X POST /api/v1/appointments/book \\
  -H "x-api-key: sq_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "doctorId": "64f1a2b3c4d5e6f7g8h9i0j4",
    "patientName": "Jane Patient",
    "phone": "9876543210",
    "scheduledAt": "2026-03-01T10:00:00.000Z",
    "notes": "Annual checkup"
  }'`}</CodeBlock>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 mt-4">Response 201</h4>
                            <CodeBlock>{`{
  "success": true,
  "data": {
    "id": "64f3c4d5e6f7g8h9i0j1k2l3",
    "status": "scheduled",
    "scheduledAt": "2026-03-01T10:00:00.000Z",
    "doctorName": "Dr. Sarah Chen"
  }
}`}</CodeBlock>
                        </div>
                    </div>

                    {/* GET /appointments */}
                    <div id="appt-list" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="GET" path="/appointments" summary="List appointments" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">Returns appointments for the hospital. Filter by doctor, date, or status.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Query Parameters</h4>
                            <table className="w-full text-sm">
                                <tbody>
                                    <ParamRow name="doctorId" type="string" desc="Filter by doctor" />
                                    <ParamRow name="date" type="YYYY-MM-DD" desc="Filter by scheduled date" />
                                    <ParamRow name="status" type="scheduled | arrived | completed | cancelled" desc="Filter by status" />
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* PUT /appointments/:id/arrive */}
                    <div id="appt-arrive" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="PUT" path="/appointments/:id/arrive" summary="Mark patient as arrived → auto-queue" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">Changes the appointment status to <code className="text-cyan-300 bg-white/10 px-1 py-0.5 rounded">arrived</code> and <strong>automatically creates a live queue token</strong>. The doctor&apos;s dashboard updates in real time.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Response 200</h4>
                            <CodeBlock>{`{
  "success": true,
  "message": "Patient arrived and added to live queue",
  "data": {
    "appointmentId": "64f3c4d5e6f7g8h9i0j1k2l3",
    "queueEntryId": "64f4d5e6f7g8h9i0j1k2l3m4",
    "tokenNumber": 8,
    "trackingUrl": "https://your-domain.com/status/uuid-here"
  }
}`}</CodeBlock>
                        </div>
                    </div>

                    {/* PUT /appointments/:id/cancel */}
                    <div id="appt-cancel" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="PUT" path="/appointments/:id/cancel" summary="Cancel an appointment" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm">Cancels a <code className="bg-white/10 px-1 py-0.5 rounded text-cyan-300">scheduled</code> or <code className="bg-white/10 px-1 py-0.5 rounded text-cyan-300">arrived</code> appointment. Already-completed appointments cannot be cancelled — a <code className="text-red-300 bg-white/10 px-1 py-0.5 rounded">404</code> is returned.</p>
                        </div>
                    </div>

                    <hr className="border-white/10 my-10" />

                    {/* ────────── PHASE 4: ANALYTICS ────────── */}

                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <BarChart2 className="text-violet-400 w-5 h-5" />
                            <h2 className="text-xl font-bold text-white">Analytics</h2>
                            <span className="text-xs bg-violet-400/10 text-violet-300 border border-violet-400/20 px-2 py-0.5 rounded-full">Phase 4</span>
                        </div>
                        <p className="text-gray-400 text-sm">Embed queue performance metrics into your hospital dashboards.</p>
                    </div>

                    {/* GET /analytics/summary */}
                    <div id="analytics-summary" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="GET" path="/analytics/summary" summary="Hospital-wide queue summary" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">Returns patient volume, completion rate, and average wait time for today, the last 7 days, or the last 30 days.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Query Parameters</h4>
                            <table className="w-full text-sm mb-4">
                                <tbody>
                                    <ParamRow name="period" type="today | week | month" desc="Defaults to today" />
                                </tbody>
                            </table>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Response 200</h4>
                            <CodeBlock>{`{
  "success": true,
  "data": {
    "period": "today",
    "from": "2026-02-27T00:00:00.000Z",
    "to": "2026-02-27T14:30:00.000Z",
    "total": 47,
    "completed": 38,
    "cancelled": 3,
    "waiting": 6,
    "completionRate": "81%",
    "avgWaitMinutes": 22
  }
}`}</CodeBlock>
                        </div>
                    </div>

                    {/* GET /analytics/doctor/:id */}
                    <div id="analytics-doctor" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="GET" path="/analytics/doctor/:doctorId" summary="Per-doctor analytics" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">Throughput, wait time, and completion metrics for a single doctor. Supports the same <code className="text-cyan-300 bg-white/10 px-1 py-0.5 rounded">period</code> filter.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Response 200</h4>
                            <CodeBlock>{`{
  "success": true,
  "data": {
    "doctorId": "64f1a2b3c4d5e6f7g8h9i0j4",
    "name": "Dr. Sarah Chen",
    "specialization": "Cardiology",
    "availability": "Available",
    "avgConsultationTime": 10,
    "period": "today",
    "total": 14,
    "completed": 11,
    "cancelled": 1,
    "waiting": 2,
    "avgWaitMinutes": 18,
    "allTimePatientsSeen": 1240
  }
}`}</CodeBlock>
                        </div>
                    </div>

                    {/* GET /analytics/wait-times */}
                    <div id="analytics-wait" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="GET" path="/analytics/wait-times" summary="Hourly patient volume" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">24-hour breakdown of arrivals, completions, and avg wait per hour. Useful for capacity planning and identifying peak hours.</p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Query Parameters</h4>
                            <table className="w-full text-sm mb-4">
                                <tbody>
                                    <ParamRow name="date" type="YYYY-MM-DD" desc="Defaults to today" />
                                </tbody>
                            </table>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Response 200</h4>
                            <CodeBlock>{`{
  "success": true,
  "data": {
    "date": "2026-02-27",
    "peakHour": "10:00",
    "hours": [
      { "hour": 9,  "label": "09:00", "total": 5,  "completed": 5, "avgWaitMinutes": 12 },
      { "hour": 10, "label": "10:00", "total": 11, "completed": 9, "avgWaitMinutes": 28 }
    ]
  }
}`}</CodeBlock>
                        </div>
                    </div>

                    <hr className="border-white/10 my-10" />

                    {/* ────────── PHASE 5: DEVELOPER TOOLS ────────── */}

                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <Wrench className="text-fuchsia-400 w-5 h-5" />
                            <h2 className="text-xl font-bold text-white">Developer Tools</h2>
                            <span className="text-xs bg-fuchsia-400/10 text-fuchsia-300 border border-fuchsia-400/20 px-2 py-0.5 rounded-full">Phase 5</span>
                        </div>
                        <p className="text-gray-400 text-sm">Tools to validate your integration before going live.</p>
                    </div>

                    {/* POST /webhooks/test */}
                    <div id="webhook-test" className="border border-white/10 rounded-xl overflow-hidden mb-6 scroll-mt-24">
                        <EndpointHeader method="POST" path="/webhooks/test" summary="Fire a test webhook event" />
                        <div className="p-5">
                            <p className="text-gray-400 text-sm mb-4">
                                Dispatches a simulated event to all registered webhook endpoints subscribed to the given event type.
                                The payload includes a <code className="text-fuchsia-300 bg-white/10 px-1 py-0.5 rounded">_test: true</code> flag so your receiver can distinguish test deliveries.
                                Returns <code className="text-red-300 bg-white/10 px-1 py-0.5 rounded">404</code> if no webhooks are registered for that event.
                            </p>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Request Body</h4>
                            <table className="w-full text-sm mb-4">
                                <tbody>
                                    <ParamRow name="event" required type="string" desc="One of: queue.created, queue.updated, queue.completed, queue.cancelled, doctor.status_changed" />
                                </tbody>
                            </table>
                            <CodeBlock>{`{
  "event": "queue.created"
}`}</CodeBlock>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 mt-4">Response 200</h4>
                            <CodeBlock>{`{
  "success": true,
  "message": "Test \"queue.created\" event dispatched to 1 endpoint(s)",
  "endpoints": [
    { "url": "https://yourapp.com/webhooks/smartqueue", "id": "64f1..." }
  ]
}`}</CodeBlock>
                        </div>
                    </div>

                    <hr className="border-white/10 my-10" />

                    {/* ────────── TESTING ────────── */}

                    <section id="testing" className="scroll-mt-24 mb-12">
                        <SectionTitle id="testing" icon={<Terminal className="text-fuchsia-400" />} color="text-white">Integration Testing</SectionTitle>
                        <p className="text-gray-400 mb-6">
                            The repository ships with a self-contained integration test that exercises all 29 API scenarios end-to-end against a running server. No mocks, no fixtures — it auto-provisions a hospital account each run.
                        </p>

                        <h3 className="text-base font-semibold text-gray-200 mb-2">Run the full test suite</h3>
                        <CodeBlock lang="bash">{`# Prerequisites: server running on localhost:5000
node backend/test-qaas.js`}</CodeBlock>

                        <p className="text-gray-400 text-sm mb-6">The script covers: admin signup → login → doctor provision → API key generation → all 21 endpoints → 5 validation edge cases.</p>

                        <h3 className="text-base font-semibold text-gray-200 mb-3">Key integration flows (curl)</h3>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2"><Globe className="w-3 h-3" /> 1. Discover available doctors</p>
                                <CodeBlock lang="bash">{`curl /api/v1/doctors?specialty=cardio \\
  -H "x-api-key: sq_test_your_key"`}</CodeBlock>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2"><Users className="w-3 h-3" /> 2. Enqueue a patient (with idempotency)</p>
                                <CodeBlock lang="bash">{`curl -X POST /api/v1/queue \\
  -H "x-api-key: sq_test_your_key" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -H "Content-Type: application/json" \\
  -d '{"doctorId":"DOC_ID","externalPatientId":"ext_001"}'`}</CodeBlock>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2"><Clock className="w-3 h-3" /> 3. Check real-time queue status</p>
                                <CodeBlock lang="bash">{`curl /api/v1/queue/UNIQUE_LINK_ID \\
  -H "x-api-key: sq_test_your_key"`}</CodeBlock>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2"><TrendingUp className="w-3 h-3" /> 4. Pull today&apos;s analytics summary</p>
                                <CodeBlock lang="bash">{`curl "/api/v1/analytics/summary?period=today" \\
  -H "x-api-key: sq_test_your_key"`}</CodeBlock>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2"><RefreshCw className="w-3 h-3" /> 5. Test your webhook receiver</p>
                                <CodeBlock lang="bash">{`curl -X POST /api/v1/webhooks/test \\
  -H "x-api-key: sq_test_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"event":"queue.created"}'`}</CodeBlock>
                            </div>
                        </div>
                    </section>

                    <hr className="border-white/10 my-10" />

                    {/* ────────── LIVE PLAYGROUND ────────── */}

                    <section id="playground" className="scroll-mt-24 mb-12">
                        <SectionTitle id="playground" icon={<Zap className="text-fuchsia-400" />} color="text-white">Live API Playground</SectionTitle>
                        <p className="text-gray-400 mb-6">
                            Use the embedded Swagger UI below to invoke B2B endpoints directly in your browser. Click <strong>Authorize</strong>, enter your <code className="text-cyan-300 bg-white/10 px-1 py-0.5 rounded">x-api-key</code>, then try any endpoint.
                        </p>
                        <div className="w-full h-[860px] bg-white rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
                            <iframe
                                src={(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '') + '/api-docs/'}
                                className="w-full h-full border-none"
                                title="Swagger UI — SmartQueue B2B API Playground"
                            />
                        </div>
                    </section>

                </main>
            </div>

            {/* Footer */}
            <footer className="border-t border-white/10 mt-12">
                <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
                    <span>SmartQueue QaaS — B2B API v1</span>
                    <div className="flex items-center gap-6">
                        <Link href="/login" className="hover:text-cyan-400 transition-colors">Developer Portal</Link>
                        <a href="#authentication" className="hover:text-cyan-400 transition-colors">Authentication</a>
                        <a href="#testing" className="hover:text-cyan-400 transition-colors">Testing</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
