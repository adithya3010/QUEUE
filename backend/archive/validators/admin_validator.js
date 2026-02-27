const { z } = require("zod");

const adminSignupSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    hospitalName: z.string().min(2, "Hospital name must be at least 2 characters"),
});

const adminLoginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
});

const addDoctorSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email format"),
    specialization: z.string().min(2, "Specialization must be at least 2 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

const addReceptionistSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    assignedDoctors: z.array(z.string()).optional(),
});

module.exports = {
    adminSignupSchema,
    adminLoginSchema,
    addDoctorSchema,
    addReceptionistSchema
};
