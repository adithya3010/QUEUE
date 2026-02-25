import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Key, Zap, RefreshCw, Activity, ShieldCheck, FileJson } from 'lucide-react';

export const metadata = {
    title: 'SmartQueue - Developer API Docs',
    description: 'API documentation for SmartQueue Queue-as-a-Service',
};

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-[#060c21] text-gray-300 font-sans selection:bg-blue-500/30">

            {/* Navbar Minimal */}
            <nav className="border-b border-white/10 bg-[#060c21]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-white hover:text-cyan-400 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-bold">Back to SmartQueue</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20">v1.0 API</span>
                        <Link href="/login" className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition-colors">
                            Developer Portal
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-12">

                {/* Sidebar */}
                <aside className="w-full md:w-64 flex-shrink-0">
                    <div className="sticky top-24 space-y-8">
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Getting Started</h3>
                            <ul className="space-y-2 text-sm font-medium text-gray-400">
                                <li><a href="#auth" className="hover:text-cyan-400 transition-colors flex items-center gap-2"><Key className="w-4 h-4" /> Authentication</a></li>
                                <li><a href="#rate-limits" className="hover:text-cyan-400 transition-colors flex items-center gap-2"><Zap className="w-4 h-4" /> Rate Limits</a></li>
                                <li><a href="#idempotency" className="hover:text-cyan-400 transition-colors flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Idempotency</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Core Concepts</h3>
                            <ul className="space-y-2 text-sm font-medium text-gray-400">
                                <li><a href="#webhooks" className="hover:text-purple-400 transition-colors flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Webhooks</a></li>
                                <li><a href="#zero-pii" className="hover:text-emerald-400 transition-colors flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Zero-PII Compliance</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">API Reference</h3>
                            <ul className="space-y-2 text-sm font-medium text-gray-400">
                                <li><a href="#queue-mgmt" className="hover:text-blue-400 transition-colors flex items-center gap-2"><Activity className="w-4 h-4" /> Queue Management</a></li>
                                <li><a href="#playground" className="hover:text-fuchsia-400 transition-colors flex items-center gap-2"><Zap className="w-4 h-4 text-fuchsia-400" /> Live Playground</a></li>
                            </ul>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 max-w-3xl prose prose-invert prose-blue">
                    <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight">SmartQueue QaaS API</h1>
                    <p className="text-lg text-gray-400 mb-12">
                        Welcome to the SmartQueue B2B API documentation. This guide explains how external healthcare platforms, hospital booking aggregators, and custom frontends can integrate seamlessly with the SmartQueue infrastructure.
                    </p>

                    <hr className="border-white/10 my-10" />

                    <section id="auth" className="scroll-mt-24">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><Key className="text-cyan-400" /> Authentication (API Keys)</h2>
                        <p>SmartQueue uses header-based API key authentication for all external B2B requests.</p>

                        <h3 className="text-xl font-semibold text-gray-200 mt-6 mb-2">Acquiring a Key</h3>
                        <p>When your hospital account is provisioned, you will generate an API Key from the Developer Dashboard. Your keys will look like this: <code className="bg-white/10 px-1.5 py-0.5 rounded text-cyan-300">sq_live_xxxxxxxxxxxxxxxxxxxx</code> or <code className="bg-white/10 px-1.5 py-0.5 rounded text-cyan-300">sq_test_xxxxxxxxxxxxxxxxxxxx</code>.</p>

                        <h3 className="text-xl font-semibold text-gray-200 mt-6 mb-2">Making Authenticated Requests</h3>
                        <p>Include your API key in the <code className="text-cyan-300 bg-white/10 px-1.5 py-0.5 rounded">x-api-key</code> HTTP header for every request.</p>
                        <pre className="bg-[#0b1021] border border-white/10 p-4 rounded-xl overflow-x-auto text-sm my-4 text-gray-300">
                            {`curl -X GET "https://api.smartqueue.com/api/v1/doctor/DOC_ID/queue" \\
  -H "x-api-key: sq_live_your_api_key_here"`}
                        </pre>
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-red-200 text-sm flex items-start gap-3 my-6">
                            <ShieldCheck className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="m-0">Note: Do not share your live API keys in publicly accessible client-side code.</p>
                        </div>
                    </section>

                    <hr className="border-white/10 my-12" />

                    <section id="rate-limits" className="scroll-mt-24">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><Zap className="text-yellow-400" /> Rate Limits & Quotas</h2>
                        <p>To ensure platform stability, all endpoints are strictly rate-limited based on your hospital's subscription tier:</p>
                        <ul className="space-y-2 my-4 bg-white/5 border border-white/10 rounded-xl p-4">
                            <li><strong className="text-white">Basic:</strong> 100 requests / 15 mins</li>
                            <li><strong className="text-white">Pro:</strong> 1,000 requests / 15 mins</li>
                            <li><strong className="text-white">Enterprise:</strong> 10,000 requests / 15 mins</li>
                        </ul>
                        <p>If you exceed this quota, you will receive an <code className="text-yellow-300 bg-white/10 px-1.5 py-0.5 rounded">HTTP 429 Too Many Requests</code> response.</p>
                    </section>

                    <hr className="border-white/10 my-12" />

                    <section id="idempotency" className="scroll-mt-24">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><ShieldCheck className="text-emerald-400" /> Idempotency (Preventing Double Bookings)</h2>
                        <p>Network connections can drop. If you send a <code className="text-emerald-300 bg-white/10 px-1.5 py-0.5 rounded">POST /api/v1/queue</code> request to add a patient and don't receive a response, retrying the request could result in the patient being added to the queue <strong>twice</strong>.</p>
                        <p>To prevent this, include an <code className="text-emerald-300 bg-white/10 px-1.5 py-0.5 rounded">Idempotency-Key</code> header with a unique UUID string for each distinct operation. If you retry a request with the exact same Idempotency-Key, SmartQueue will safely return the original successful response instead of processing it again.</p>
                        <pre className="bg-[#0b1021] border border-white/10 p-4 rounded-xl overflow-x-auto text-sm my-4 text-gray-300">
                            {`POST /api/v1/queue
x-api-key: sq_live_your_api_key_here
Idempotency-Key: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Content-Type: application/json`}
                        </pre>
                    </section>

                    <hr className="border-white/10 my-12" />

                    <section id="webhooks" className="scroll-mt-24">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><RefreshCw className="text-purple-400" /> Webhooks (Real-Time Events)</h2>
                        <p>Polling our API continuously is inefficient and will trigger rate limits. Instead, register a <strong>Webhook Endpoint URL</strong> to receive real-time push notifications.</p>

                        <h3 className="text-xl font-semibold text-gray-200 mt-6 mb-2">Available Events</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                            <div className="bg-white/5 border border-white/10 p-3 rounded-lg"><code className="text-purple-300 text-sm">queue.created</code><p className="text-xs text-gray-400 mt-1">When a patient is added to a queue.</p></div>
                            <div className="bg-white/5 border border-white/10 p-3 rounded-lg"><code className="text-purple-300 text-sm">queue.updated</code><p className="text-xs text-gray-400 mt-1">When a queue is reordered or ETA shifts.</p></div>
                            <div className="bg-white/5 border border-white/10 p-3 rounded-lg"><code className="text-purple-300 text-sm">queue.completed</code><p className="text-xs text-gray-400 mt-1">When doctor finishes consultation.</p></div>
                            <div className="bg-white/5 border border-white/10 p-3 rounded-lg"><code className="text-purple-300 text-sm">doctor.status_changed</code><p className="text-xs text-gray-400 mt-1">When doctor pauses/resumes queue.</p></div>
                        </div>

                        <h3 className="text-xl font-semibold text-gray-200 mt-6 mb-2">Verification (HMAC SHA-256)</h3>
                        <p>All webhook payloads are cryptographically signed. The signature is sent in the <code className="text-purple-300 bg-white/10 px-1.5 py-0.5 rounded">SmartQueue-Signature</code> header. You should compute the HMAC SHA-256 hash using your Webhook Secret to prevent spoofing.</p>
                    </section>

                    <hr className="border-white/10 my-12" />

                    <section id="zero-pii" className="scroll-mt-24">
                        <div className="border border-blue-500/30 bg-blue-900/10 p-6 rounded-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full" />
                            <h2 className="text-xl font-bold text-blue-300 mb-2 flex items-center gap-2"><ShieldCheck /> Zero-PII Recommendation</h2>
                            <p className="text-sm text-gray-300">
                                To significantly reduce HIPAA/GDPR compliance liabilities, we strongly encourage integrators to pass opaque <code className="bg-black/30 text-blue-200 px-1 py-0.5 rounded">externalPatientId</code> strings to SmartQueue rather than explicit personally identifiable names or phone numbers. SmartQueue calculations depend on the mathematical position, not personal data.
                            </p>
                        </div>
                    </section>

                    <hr className="border-white/10 my-12" />

                    <section id="queue-mgmt" className="scroll-mt-24">
                        <h2 className="text-2xl font-bold text-white mb-4">Endpoints Reference</h2>
                        <p className="text-sm uppercase tracking-widest text-cyan-400 font-bold mb-4">Base URL: <code className="bg-cyan-900/40 text-cyan-200 px-2 py-1 rounded normal-case">/api/v1</code></p>

                        <div className="space-y-8">
                            {/* POST /queue */}
                            <div className="border border-white/10 rounded-xl overflow-hidden">
                                <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center gap-3">
                                    <span className="bg-green-500 text-green-950 font-black text-xs px-2 py-1 rounded">POST</span>
                                    <code className="text-gray-200 font-bold">/queue</code>
                                </div>
                                <div className="p-4">
                                    <p className="text-sm text-gray-400 mb-4">Creates a new queue entry for a specified doctor.</p>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">JSON Body</h4>
                                    <pre className="bg-[#0b1021] border border-white/5 p-3 rounded-lg text-sm text-blue-300">
                                        {`{
  "doctorId": "651a2b3c4d5e6f7g8h9i0j1k",
  "externalPatientId": "usr_987654321", // Zero-PII strategy
  "name": "John Doe",                   // Optional
  "description": "Routine Checkup"      // Optional
}`}
                                    </pre>
                                </div>
                            </div>

                            {/* GET /queue */}
                            <div className="border border-white/10 rounded-xl overflow-hidden">
                                <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center gap-3">
                                    <span className="bg-blue-500 text-blue-950 font-black text-xs px-2 py-1 rounded">GET</span>
                                    <code className="text-gray-200 font-bold">/queue/:uniqueLinkId</code>
                                </div>
                                <div className="p-4">
                                    <p className="text-sm text-gray-400">Retrieves the real-time status and ETA calculation for a specific patient link.</p>
                                </div>
                            </div>

                            {/* DELETE /queue */}
                            <div className="border border-white/10 rounded-xl overflow-hidden">
                                <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center gap-3">
                                    <span className="bg-red-500 text-red-950 font-black text-xs px-2 py-1 rounded">DELETE</span>
                                    <code className="text-gray-200 font-bold">/queue/:uniqueLinkId</code>
                                </div>
                                <div className="p-4">
                                    <p className="text-sm text-gray-400">Cancels an active queue entry.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <hr className="border-white/10 my-12" />

                    <section id="playground" className="scroll-mt-24">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><Zap className="text-fuchsia-400" /> Live API Playground (Swagger)</h2>
                        <p className="mb-6">
                            Interact with the SmartQueue B2B API directly through our integrated Swagger UI. You can generate an <code>x-api-key</code> in the Developer Portal and authorize your requests below to test fetching live active queues.
                        </p>

                        <div className="w-full h-[800px] bg-white rounded-2xl overflow-hidden border border-white/20 shadow-2xl relative">
                            {/* We replace the standard /api base url from the env with the /api-docs endpoint */}
                            <iframe
                                src={(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '') + '/api-docs/'}
                                className="w-full h-full border-none"
                                title="Swagger UI API Tester"
                            />
                        </div>
                    </section>

                </main>
            </div>
        </div>
    );
}
