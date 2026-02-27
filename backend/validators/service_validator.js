const { z } = require("zod");

// ── Create / Update Service ───────────────────────────────────────────────────
const createServiceSchema = z.object({
    name:               z.string().min(2, "Service name must be at least 2 characters"),
    description:        z.string().max(500).optional(),
    category:           z.string().optional(),  // grouping label, e.g. "Cardiology", "Loans"
    avgSessionDuration: z.number().int().positive().optional().default(5), // minutes
    maxCapacity:        z.number().int().positive().nullable().optional(),  // null = unlimited
    locationId:         z.string().optional(),  // ObjectId — null means all locations
    schedule: z.array(z.object({
        day:       z.enum(["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]),
        startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime must be HH:MM"),
        endTime:   z.string().regex(/^\d{2}:\d{2}$/, "endTime must be HH:MM"),
    })).optional(),
});

const updateServiceSchema = createServiceSchema.partial();

module.exports = { createServiceSchema, updateServiceSchema };
