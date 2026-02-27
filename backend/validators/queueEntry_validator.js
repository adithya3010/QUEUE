const { z } = require("zod");

const queueEntryZodSchema = z.object({
    clientName:      z.string().min(1, "Client name is required").max(100).optional(),
    agentId:         z.string().optional(),   // was: doctorId
    serviceId:       z.string().optional(),   // new — queue channel
    externalClientId: z.string().optional(),  // zero-PII external ref
    notes:           z.string().max(500, "Notes too long").optional().or(z.literal("")),
    clientPhone:     z.string().min(5, "Phone number too short").max(20).optional(),
    clientEmail:     z.string().email("Invalid email").max(320).optional(),
    tokenNumber:     z.number().int().positive().optional(),
    status:          z.enum(["waiting", "serving", "completed", "cancelled", "no-show"])
                      .optional()
                      .default("waiting"),
    uniqueLinkId:    z.string().optional(),
    createdAt:       z.date().optional(),
    completedAt:     z.date().optional(),
});

// Schema for walk-in / internal add (from agent or operator dashboard)
const addQueueEntrySchema = z.object({
    clientName:      z.string().min(1, "Client name is required").max(100).optional(),
    clientPhone:     z.string().min(5).max(20).optional(),
    clientEmail:     z.string().email("Invalid email").max(320).optional(),
    notes:           z.string().max(500).optional().or(z.literal("")),
    agentId:         z.string().optional(),   // required for OPERATOR; auto-set for AGENT
    serviceId:       z.string().optional(),   // required if agentId not set
    externalClientId: z.string().optional(),
});

module.exports = { queueEntryZodSchema, addQueueEntrySchema };
