const { z } = require("zod");

const doctorZodSchema = z.object({
  name: z.string().min(1, "Name is required"),

  specialization: z.string().min(1, "Specialization is required"),

  availability: z
    .enum(["Available", "Not Available", "Break"])
    .optional()
    .default("Available"),

  avgConsultationTime: z
    .number()
    .int()
    .positive()
    .optional()
    .default(8),

  email: z.string().email("Invalid email address"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

// Schema for signup (requires all fields)
const doctorSignupSchema = doctorZodSchema.pick({
  name: true,
  specialization: true,
  email: true,
  password: true,
});

// Schema for login (only email and password)
const doctorLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

module.exports = {
  doctorZodSchema,
  doctorSignupSchema,
  doctorLoginSchema,
};
