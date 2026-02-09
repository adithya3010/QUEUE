const { z } = require("zod");

const patientZodSchema = z.object({
  name: z.string()
    .min(1, "Patient name is required")
    .max(100, "Name is too long"),

  doctorId: z.string()
    .min(1, "Doctor ID is required"),

  description: z.string()
    .min(1, "Description is required")
    .max(500, "Description is too long"),

  number: z.string()
    .regex(/^\d{10}$/, "Phone number must be 10 digits"),

  tokenNumber: z
    .number()
    .int()
    .positive()
    .optional(),

  status: z
    .enum(["waiting", "completed", "cancelled"])
    .optional()
    .default("waiting"),

  uniqueLinkId: z
    .string()
    .min(1, "Unique link ID is required")
    .optional(),

  createdAt: z
    .date()
    .optional(),

  completedAt: z
    .date()
    .optional(),
});

// Schema for adding a patient (only required fields from frontend)
const addPatientSchema = patientZodSchema.pick({
  name: true,
  description: true,
  number: true,
});

module.exports = {
  patientZodSchema,
  addPatientSchema,
};
