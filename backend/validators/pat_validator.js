const { z } = require("zod");

const patientZodSchema = z.object({
  name: z.string()
    .min(1, "Patient name is required")
    .max(100, "Name is too long"),

  doctorId: z.string()
    .min(1, "Doctor ID is required"),

  description: z.string()
    .max(500, "Description is too long")
    .optional()
    .or(z.literal("")),

  number: z.string()
    .min(5, "Phone number requires at least 5 characters")
    .max(20, "Phone number is too long"),

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
}).extend({
  doctorId: z.string().optional() // Optional: required for receptionists, not for doctors
});

module.exports = {
  patientZodSchema,
  addPatientSchema,
};
