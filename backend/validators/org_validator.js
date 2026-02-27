const { z } = require("zod");

const locationSeedSchema = z.object({
    name:     z.string().min(2, "Location name must be at least 2 characters"),
    address:  z.string().optional().default(""),
    timezone: z.string().optional().default("Asia/Kolkata"),
});

const serviceSeedSchema = z.object({
    name:               z.string().min(2, "Service name must be at least 2 characters"),
    description:        z.string().optional(),
    category:           z.string().optional(),
    avgSessionDuration: z.number().int().positive().optional(),
    maxCapacity:        z.number().int().positive().nullable().optional(),
});

// ── Organization Admin Signup ─────────────────────────────────────────────────
const orgSignupSchema = z.object({
    name:    z.string().min(2, "Name must be at least 2 characters"),
    email:   z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    orgName:  z.string().min(2, "Organization name must be at least 2 characters"),
    industry: z.enum(["healthcare", "banking", "government", "education", "salon", "retail", "other"])
               .optional()
               .default("other"),

    // Optional onboarding seeds
    primaryLocation: locationSeedSchema.optional(),
    services:        z.array(serviceSeedSchema).optional(),
});

// ── Organization Admin Login ──────────────────────────────────────────────────
const orgLoginSchema = z.object({
    email:    z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
});

// ── Add Agent (was: addDoctorSchema) ─────────────────────────────────────────
const addAgentSchema = z.object({
    name:            z.string().min(2, "Name must be at least 2 characters"),
    email:           z.string().email("Invalid email format"),
    serviceCategory: z.string().min(2, "Service category must be at least 2 characters"),
    password:        z.string().min(8, "Password must be at least 8 characters"),
    serviceId:       z.string().optional(),  // MongoDB ObjectId — assign to an existing Service
});

// ── Add Operator (was: addReceptionistSchema) ─────────────────────────────────
const addOperatorSchema = z.object({
    name:           z.string().min(2, "Name must be at least 2 characters"),
    email:          z.string().email("Invalid email format"),
    password:       z.string().min(8, "Password must be at least 8 characters"),
    assignedAgents: z.array(z.string()).optional(),  // array of Agent User ObjectIds
});

module.exports = {
    orgSignupSchema,
    orgLoginSchema,
    addAgentSchema,
    addOperatorSchema,
};
