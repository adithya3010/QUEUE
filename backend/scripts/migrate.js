#!/usr/bin/env node
/**
 * SmartQueue Migration Script
 * Migrates data from the old hospital-centric schema to the new
 * Organization / Service / QueueEntry schema.
 *
 * Usage:
 *   node backend/scripts/migrate.js           # Dry-run (prints report only)
 *   node backend/scripts/migrate.js --execute # Actually performs the migration
 *
 * What it does:
 *   1. hospitals      → organizations
 *   2. DOCTOR users   → AGENT users (rename fields, create Service per doctor)
 *   3. RECEPTIONIST   → OPERATOR (rename assignedDoctors → assignedAgents)
 *   4. HOSPITAL_ADMIN → ORG_ADMIN (rename hospitalId → organizationId)
 *   5. patients       → queueentries
 *   6. appointments   → update refs/field names
 *   7. apikeys, apiusages, webhooks, idempotencykeys → rename hospitalId
 *
 * Safety:
 *   - Dry-run by default. Pass --execute to actually write to the database.
 *   - Skips records that have already been migrated (idempotent).
 *   - Writes a JSON report to backend/scripts/migrate-report.json
 */

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const mongoose = require("mongoose");
const fs       = require("fs");
const path     = require("path");
const { v4: uuidv4 } = require("uuid");

const DRY_RUN = !process.argv.includes("--execute");

// ─── Models ───────────────────────────────────────────────────────────────────
// Load via mongoose.connection.collection() so we can read old collections
// without schema enforcement.

// New models
const Organization = require("../models/Organization");
const Service      = require("../models/Service");
const User         = require("../models/User");
const QueueEntry   = require("../models/QueueEntry");
const Appointment  = require("../models/Appointment");
const ApiKey       = require("../models/ApiKey");
const ApiUsage     = require("../models/ApiUsage");
const Webhook      = require("../models/Webhook");
const IdempotencyKey = require("../models/IdempotencyKey");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function planToActual(label) {
    return DRY_RUN ? `[DRY RUN] Would ${label}` : label;
}

const report = {
    dryRun:        DRY_RUN,
    startedAt:     new Date().toISOString(),
    finishedAt:    null,
    steps: {},
    errors: [],
};

function logStep(step, counts) {
    report.steps[step] = counts;
    console.log(`\n  ${step}:`);
    for (const [k, v] of Object.entries(counts)) {
        console.log(`    ${k}: ${v}`);
    }
}

function logError(step, err) {
    report.errors.push({ step, message: err.message });
    console.error(`  [ERROR] ${step}: ${err.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN MAP: subscriptionPlan rename
// ─────────────────────────────────────────────────────────────────────────────
const planMap = { Basic: "Starter", Pro: "Growth", Enterprise: "Enterprise" };

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Migrate hospitals → organizations
// ─────────────────────────────────────────────────────────────────────────────
async function migrateHospitals() {
    const col = mongoose.connection.collection("hospitals");
    const hospitals = await col.find({}).toArray();

    let created = 0, skipped = 0, errors = 0;
    const hospitalToOrgMap = new Map(); // hospitalId (string) → orgId (string)

    for (const h of hospitals) {
        try {
            // Check if already migrated
            const existing = await Organization.findOne({ email: h.email });
            if (existing) {
                hospitalToOrgMap.set(h._id.toString(), existing._id.toString());
                skipped++;
                continue;
            }

            // Build slug from hospital name
            const slug = h.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .slice(0, 60) + `-${Date.now().toString(36).slice(-4)}`;

            const locations = (h.branches || []).map(b => ({
                name:     b.name,
                address:  b.address || "",
                isActive: b.isActive !== false,
            }));
            // Default location if no branches
            if (locations.length === 0) {
                locations.push({ name: "Main Branch", address: "", isActive: true });
            }

            if (!DRY_RUN) {
                const org = await Organization.create({
                    name:             h.name,
                    email:            h.email,
                    industry:         "healthcare",  // default — hospitals are healthcare
                    slug,
                    locations,
                    subscriptionPlan: planMap[h.subscriptionPlan] || "Starter",
                    status:           h.status || "Active",
                    createdAt:        h.createdAt,
                    updatedAt:        h.updatedAt,
                });
                hospitalToOrgMap.set(h._id.toString(), org._id.toString());
            } else {
                // In dry-run, store a placeholder mapping using the existing _id
                hospitalToOrgMap.set(h._id.toString(), `[new-org-for-${h._id}]`);
            }
            created++;
        } catch (err) {
            logError(`Step 1 hospital ${h._id}`, err);
            errors++;
        }
    }

    logStep("Step 1: hospitals → organizations", { found: hospitals.length, created, skipped, errors });
    return hospitalToOrgMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Migrate DOCTOR users → AGENT + create Service per doctor
// ─────────────────────────────────────────────────────────────────────────────
async function migrateDoctoUsers(hospitalToOrgMap) {
    const doctors = await User.find({ role: "DOCTOR" });

    let migrated = 0, skipped = 0, services = 0, errors = 0;
    const doctorToServiceMap = new Map(); // doctorId → serviceId

    for (const doc of doctors) {
        try {
            // Already migrated?
            if (doc.serviceId) {
                doctorToServiceMap.set(doc._id.toString(), doc.serviceId.toString());
                skipped++;
                continue;
            }

            const orgId = doc.organizationId?.toString() ||
                          (doc.hospitalId && hospitalToOrgMap.get(doc.hospitalId.toString()));

            if (!orgId || orgId.startsWith("[new-org-for-")) {
                // Can't create service without an org — skip
                logError(`Step 2 doctor ${doc._id}`, new Error("No org mapping found"));
                errors++;
                continue;
            }

            if (!DRY_RUN) {
                // Create a Service for this doctor
                const svc = await Service.create({
                    organizationId:    orgId,
                    locationId:        doc.branchId || doc.locationId || null,
                    name:              doc.specialization || doc.serviceCategory
                                           ? `${doc.name} — ${doc.serviceCategory || doc.specialization}`
                                           : doc.name,
                    description:       `Queue channel for ${doc.name}`,
                    category:          doc.serviceCategory || doc.specialization || "General",
                    avgSessionDuration: doc.avgConsultationTime || doc.avgSessionDuration || 5,
                    isActive:          true,
                    schedule:          doc.schedule || [],
                });

                doctorToServiceMap.set(doc._id.toString(), svc._id.toString());
                services++;

                // Update the user: role → AGENT, add serviceId, rename fields
                await User.updateOne({ _id: doc._id }, {
                    $set: {
                        role:               "AGENT",
                        organizationId:     orgId,
                        serviceId:          svc._id,
                        serviceCategory:    doc.specialization || doc.serviceCategory || "",
                        avgSessionDuration: doc.avgConsultationTime || doc.avgSessionDuration || 5,
                        statusMessage:      doc.pauseMessage || doc.statusMessage || "",
                    },
                    $unset: { hospitalId: "", branchId: "", specialization: "", avgConsultationTime: "", pauseMessage: "" }
                });
                migrated++;
            } else {
                services++;
                migrated++;
            }
        } catch (err) {
            logError(`Step 2 doctor ${doc._id}`, err);
            errors++;
        }
    }

    logStep("Step 2: DOCTOR users → AGENT + Services", { found: doctors.length, migrated, skipped, servicesCreated: services, errors });
    return doctorToServiceMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: Migrate RECEPTIONIST → OPERATOR
// ─────────────────────────────────────────────────────────────────────────────
async function migrateReceptionistUsers(hospitalToOrgMap) {
    const receptionists = await User.find({ role: "RECEPTIONIST" });

    let migrated = 0, skipped = 0, errors = 0;

    for (const r of receptionists) {
        try {
            if (r.role === "OPERATOR") { skipped++; continue; }

            const orgId = r.organizationId?.toString() ||
                          (r.hospitalId && hospitalToOrgMap.get(r.hospitalId.toString()));

            if (!DRY_RUN) {
                await User.updateOne({ _id: r._id }, {
                    $set: {
                        role:           "OPERATOR",
                        organizationId: orgId || r.organizationId,
                        // assignedAgents kept as-is if already populated; field rename happens in-place
                        assignedAgents: r.assignedAgents?.length ? r.assignedAgents : (r.assignedDoctors || []),
                    },
                    $unset: { hospitalId: "", branchId: "", assignedDoctors: "" }
                });
            }
            migrated++;
        } catch (err) {
            logError(`Step 3 receptionist ${r._id}`, err);
            errors++;
        }
    }

    logStep("Step 3: RECEPTIONIST → OPERATOR", { found: receptionists.length, migrated, skipped, errors });
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4: Migrate HOSPITAL_ADMIN → ORG_ADMIN
// ─────────────────────────────────────────────────────────────────────────────
async function migrateAdminUsers(hospitalToOrgMap) {
    const admins = await User.find({ role: "HOSPITAL_ADMIN" });

    let migrated = 0, skipped = 0, errors = 0;

    for (const a of admins) {
        try {
            if (a.role === "ORG_ADMIN") { skipped++; continue; }

            const orgId = a.organizationId?.toString() ||
                          (a.hospitalId && hospitalToOrgMap.get(a.hospitalId.toString()));

            if (!DRY_RUN) {
                await User.updateOne({ _id: a._id }, {
                    $set: {
                        role:           "ORG_ADMIN",
                        organizationId: orgId || a.organizationId,
                    },
                    $unset: { hospitalId: "", branchId: "" }
                });
            }
            migrated++;
        } catch (err) {
            logError(`Step 4 admin ${a._id}`, err);
            errors++;
        }
    }

    logStep("Step 4: HOSPITAL_ADMIN → ORG_ADMIN", { found: admins.length, migrated, skipped, errors });
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5: Migrate patients → queueentries
// ─────────────────────────────────────────────────────────────────────────────
async function migratePatients(hospitalToOrgMap, doctorToServiceMap) {
    const col = mongoose.connection.collection("patients");
    const patients = await col.find({}).toArray();

    let created = 0, skipped = 0, errors = 0;

    for (const p of patients) {
        try {
            // Already migrated?
            const existing = await QueueEntry.findOne({ uniqueLinkId: p.uniqueLinkId });
            if (existing) { skipped++; continue; }

            const orgId = hospitalToOrgMap.get(p.hospitalId?.toString()) || p.hospitalId?.toString();
            const agentId = p.doctorId;
            const serviceId = agentId && doctorToServiceMap.get(agentId.toString());

            if (!DRY_RUN) {
                await QueueEntry.create({
                    organizationId:  orgId,
                    locationId:      p.branchId || null,
                    serviceId:       serviceId || null,
                    agentId:         agentId || null,
                    externalClientId: p.externalPatientId || undefined,
                    clientName:      p.name || "Unknown",
                    clientPhone:     p.number || "",
                    notes:           p.notes || p.description || "",
                    tokenNumber:     p.tokenNumber,
                    sortOrder:       p.sortOrder || p.tokenNumber,
                    uniqueLinkId:    p.uniqueLinkId,
                    status:          p.status,
                    feedback:        p.feedback || undefined,
                    createdAt:       p.createdAt,
                    completedAt:     p.completedAt || undefined,
                });
            }
            created++;
        } catch (err) {
            logError(`Step 5 patient ${p._id}`, err);
            errors++;
        }
    }

    logStep("Step 5: patients → queueentries", { found: patients.length, created, skipped, errors });
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6: Update Appointments
// ─────────────────────────────────────────────────────────────────────────────
async function migrateAppointments(hospitalToOrgMap, doctorToServiceMap) {
    const appointments = await Appointment.find({});

    let migrated = 0, skipped = 0, errors = 0;

    for (const a of appointments) {
        try {
            const updates = {};

            // organizationId (hospitalId → organizationId)
            if (!a.organizationId && a.hospitalId) {
                const orgId = hospitalToOrgMap.get(a.hospitalId.toString());
                if (orgId && !orgId.startsWith("[new-org-for-")) updates.organizationId = orgId;
            }

            // agentId (doctorId → agentId field — model already has agentId)
            // If Appointment model uses doctorId, we keep it; if agentId, it should be set
            // Check if the appointment needs serviceId
            if (!a.serviceId && a.agentId) {
                const svcId = doctorToServiceMap.get(a.agentId.toString());
                if (svcId) updates.serviceId = svcId;
            } else if (!a.serviceId && a.doctorId) {
                const svcId = doctorToServiceMap.get(a.doctorId.toString());
                if (svcId) updates.serviceId = svcId;
                if (a.doctorId) updates.agentId = a.doctorId;
            }

            // clientName (patientName → clientName)
            if (!a.clientName && a.patientName) {
                updates.clientName = a.patientName;
            }
            // clientPhone (phone → clientPhone)
            if (!a.clientPhone && a.phone) {
                updates.clientPhone = a.phone;
            }

            if (Object.keys(updates).length === 0) { skipped++; continue; }

            if (!DRY_RUN) {
                await Appointment.updateOne({ _id: a._id }, { $set: updates });
            }
            migrated++;
        } catch (err) {
            logError(`Step 6 appointment ${a._id}`, err);
            errors++;
        }
    }

    logStep("Step 6: appointments field update", { found: appointments.length, migrated, skipped, errors });
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7: Update ApiKeys, ApiUsages, Webhooks, IdempotencyKeys
// ─────────────────────────────────────────────────────────────────────────────
async function migrateApiRelated(hospitalToOrgMap) {
    let counts = { apikeys: 0, apiusages: 0, webhooks: 0, idempotencykeys: 0 };

    // ApiKey
    const keys = await ApiKey.find({ organizationId: { $exists: false } });
    for (const k of keys) {
        const orgId = k.hospitalId && hospitalToOrgMap.get(k.hospitalId.toString());
        if (!orgId || orgId.startsWith("[new-org-for-")) continue;
        if (!DRY_RUN) await ApiKey.updateOne({ _id: k._id }, { $set: { organizationId: orgId }, $unset: { hospitalId: "" } });
        counts.apikeys++;
    }

    // ApiUsage
    const usages = await ApiUsage.find({ organizationId: { $exists: false } });
    for (const u of usages) {
        const orgId = u.hospitalId && hospitalToOrgMap.get(u.hospitalId.toString());
        if (!orgId || orgId.startsWith("[new-org-for-")) continue;
        if (!DRY_RUN) await ApiUsage.updateOne({ _id: u._id }, { $set: { organizationId: orgId }, $unset: { hospitalId: "" } });
        counts.apiusages++;
    }

    // Webhooks — also update event enum: doctor.status_changed → agent.status_changed
    const webhooks = await Webhook.find({});
    for (const w of webhooks) {
        const updates = {};
        if (!w.organizationId && w.hospitalId) {
            const orgId = hospitalToOrgMap.get(w.hospitalId.toString());
            if (orgId && !orgId.startsWith("[new-org-for-")) updates.organizationId = orgId;
        }
        if (w.events && w.events.includes("doctor.status_changed")) {
            updates.events = w.events.map(e => e === "doctor.status_changed" ? "agent.status_changed" : e);
        }
        if (Object.keys(updates).length > 0) {
            if (!DRY_RUN) await Webhook.updateOne({ _id: w._id }, { $set: updates, $unset: w.hospitalId ? { hospitalId: "" } : {} });
            counts.webhooks++;
        }
    }

    // IdempotencyKey
    const idempKeys = await IdempotencyKey.find({ organizationId: { $exists: false } });
    for (const ik of idempKeys) {
        const orgId = ik.hospitalId && hospitalToOrgMap.get(ik.hospitalId.toString());
        if (!orgId || orgId.startsWith("[new-org-for-")) continue;
        if (!DRY_RUN) await IdempotencyKey.updateOne({ _id: ik._id }, { $set: { organizationId: orgId }, $unset: { hospitalId: "" } });
        counts.idempotencykeys++;
    }

    logStep("Step 7: API-related collections update", counts);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function run() {
    console.log("\n======================================================");
    console.log(" SmartQueue Migration Script");
    console.log(`  Mode: ${DRY_RUN ? "DRY RUN (pass --execute to apply)" : "⚠ LIVE EXECUTION"}`);
    console.log("======================================================\n");

    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log("  ✓ Connected to MongoDB");

        const hospitalToOrgMap  = await migrateHospitals();
        const doctorToServiceMap = await migrateDoctoUsers(hospitalToOrgMap);
        await migrateReceptionistUsers(hospitalToOrgMap);
        await migrateAdminUsers(hospitalToOrgMap);
        await migratePatients(hospitalToOrgMap, doctorToServiceMap);
        await migrateAppointments(hospitalToOrgMap, doctorToServiceMap);
        await migrateApiRelated(hospitalToOrgMap);

    } catch (err) {
        console.error("\n  [FATAL]", err.message);
        report.fatalError = err.message;
    } finally {
        report.finishedAt = new Date().toISOString();

        const reportPath = path.join(__dirname, "migrate-report.json");
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log("\n======================================================");
        console.log(` Migration ${DRY_RUN ? "dry-run" : "execution"} complete.`);
        console.log(` Report saved to: ${reportPath}`);
        if (report.errors.length > 0) {
            console.log(` Errors encountered: ${report.errors.length}`);
        }
        if (DRY_RUN) {
            console.log("\n  To apply changes, run:");
            console.log("  node backend/scripts/migrate.js --execute");
        }
        console.log("======================================================\n");

        await mongoose.disconnect();
    }
}

run();
