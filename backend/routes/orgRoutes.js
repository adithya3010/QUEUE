const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcrypt");
const crypto   = require("crypto");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

const Organization  = require("../models/Organization");
const User          = require("../models/User");
const Service       = require("../models/Service");
const ApiKey        = require("../models/ApiKey");
const Webhook       = require("../models/Webhook");
const ApiUsage      = require("../models/ApiUsage");
const QueueEntry    = require("../models/QueueEntry");

const orgAuth = require("../middleware/orgAuthMiddleware");
const { generateTokenPair } = require("../utils/tokenUtils");
const logger  = require("../utils/logger");

const {
    orgSignupSchema,
    orgLoginSchema,
    addAgentSchema,
    addOperatorSchema
} = require("../validators/org_validator");
const { createServiceSchema, updateServiceSchema } = require("../validators/service_validator");

const isProduction = process.env.NODE_ENV === "production";

const orgCookieOptions = {
    httpOnly: true,
    secure:   isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge:   15 * 60 * 1000  // 15 minutes
};

const orgLimiter = process.env.NODE_ENV === "test"
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: { message: "Too many authentication attempts, please try again after 15 minutes" },
        standardHeaders: true,
        legacyHeaders: false,
    });

// ─── Helper to generate a URL-friendly slug from a name ───────────────────────
function generateSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 50);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /org/signup — register new organization + ORG_ADMIN user
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /org/signup:
 *   post:
 *     summary: Register a new organization
 *     description: Creates an Organization and an ORG_ADMIN user account. Provisions a default location and a default Service.
 *     tags: [Organization Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orgName, name, email, password]
 *             properties:
 *               orgName:
 *                 type: string
 *                 example: City General Hospital
 *               industry:
 *                 type: string
 *                 enum: [healthcare, banking, government, education, salon, retail, other]
 *                 example: healthcare
 *               name:
 *                 type: string
 *                 example: John Admin
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@citygeneral.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Organization registered successfully
 *       400:
 *         description: Validation error or email already exists
 *       429:
 *         description: Too many requests
 */
router.post("/signup", orgLimiter, async (req, res) => {
    try {
        const validatedData = orgSignupSchema.parse(req.body);
        const { name, email, password, orgName, industry } = validatedData;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already exists" });

        const existingOrg = await Organization.findOne({ email });
        if (existingOrg) return res.status(400).json({ message: "An organization with this email is already registered." });

        // Generate unique slug
        let baseSlug = generateSlug(orgName);
        let slug = baseSlug;
        let slugCounter = 1;
        while (await Organization.findOne({ slug })) {
            slug = `${baseSlug}-${slugCounter++}`;
        }

        const org = await Organization.create({
            name:  orgName,
            email,
            industry: industry || "other",
            slug,
            locations: [{ name: "Main Location", address: "Default Location" }]
        });

        const hashedPassword = await bcrypt.hash(password, 10);
        const admin = await User.create({
            organizationId: org._id,
            locationId:     org.locations[0]._id,
            role:           "ORG_ADMIN",
            name,
            email,
            password: hashedPassword
        });

        res.json({
            message: "Organization signup successful",
            admin: {
                id:             admin._id,
                organizationId: admin.organizationId,
                role:           admin.role,
                name:           admin.name,
                email:          admin.email,
            },
            organization: {
                id:   org._id,
                name: org.name,
                slug: org.slug
            }
        });
    } catch (err) {
        if (err.name === "ZodError" || err.issues) {
            return res.status(400).json({
                message: "Validation failed",
                errors: (err.issues || err.errors || []).map(e => ({
                    field:   e.path?.join(".") || "unknown",
                    message: e.message
                }))
            });
        }
        logger.error("Org Signup Error", { error: err.message, stack: err.stack });
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /org/login — ORG_ADMIN login
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /org/login:
 *   post:
 *     summary: Organization admin login
 *     tags: [Organization Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@citygeneral.com
 *               password:
 *                 type: string
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Login successful — copy accessToken and use as Bearer token
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", orgLimiter, async (req, res) => {
    try {
        const validatedData = orgLoginSchema.parse(req.body);
        const { email, password } = validatedData;

        const admin = await User.findOne({ email, role: "ORG_ADMIN" });
        if (!admin) return res.status(401).json({ message: "Invalid credentials or not an Organization Admin" });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

        const { accessToken, refreshToken, refreshTokenExpiry } = generateTokenPair({
            orgAdminId:     admin._id,
            userId:         admin._id,
            role:           admin.role,
            organizationId: admin.organizationId
        });

        admin.refreshToken       = refreshToken;
        admin.refreshTokenExpiry = refreshTokenExpiry;
        await admin.save();

        res.cookie("orgToken", accessToken, orgCookieOptions);
        // Keep adminToken cookie for backward compat with existing frontend
        res.cookie("adminToken", accessToken, orgCookieOptions);

        logger.info("Org admin logged in", { adminId: admin._id });

        res.json({
            message: "Login successful",
            accessToken,
            admin: {
                id:             admin._id,
                organizationId: admin.organizationId,
                role:           admin.role,
                name:           admin.name,
                email:          admin.email,
            }
        });
    } catch (err) {
        if (err.name === "ZodError" || err.issues) {
            return res.status(400).json({ message: "Validation failed" });
        }
        logger.error("Org Login Error", { error: err.message, stack: err.stack });
        res.status(500).json({ message: "Server error" });
    }
});

// POST /org/logout
router.post("/logout", (req, res) => {
    const cookieOpts = { httpOnly: true, sameSite: isProduction ? "none" : "lax", secure: isProduction };
    res.clearCookie("orgToken",   cookieOpts);
    res.clearCookie("adminToken", cookieOpts);
    res.clearCookie("token",      cookieOpts);
    res.json({ message: "Logout successful" });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /org/info — ORG_ADMIN profile (protected)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /org/info:
 *   get:
 *     summary: Get organization admin profile
 *     tags: [Organization Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Admin and organization profile returned
 *       401:
 *         description: Not authenticated
 */
router.get("/info", orgAuth, async (req, res) => {
    try {
        const admin = await User.findOne({ _id: req.orgAdminId, role: "ORG_ADMIN" })
            .select("-password -refreshToken")
            .populate("organizationId", "name slug industry subscriptionPlan status settings locations");
        if (!admin) return res.status(404).json({ message: "Admin not found" });
        res.json(admin);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Staff Provisioning
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /org/staff/agent:
 *   post:
 *     summary: Add an Agent to the organization
 *     tags: [Organization — Staff]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, serviceCategory, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Dr. Sarah Chen
 *               email:
 *                 type: string
 *                 format: email
 *                 example: sarah@citygeneral.com
 *               serviceCategory:
 *                 type: string
 *                 example: Cardiology
 *               serviceId:
 *                 type: string
 *                 description: Optional — assign agent to an existing Service
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Agent created
 *       400:
 *         description: Validation error or email already exists
 *       401:
 *         description: Not authenticated
 */
router.post("/staff/agent", orgAuth, async (req, res) => {
    try {
        const validatedData = addAgentSchema.parse(req.body);
        const { name, email, serviceCategory, password, serviceId } = validatedData;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User with this email already exists." });

        // If serviceId provided, verify it belongs to this org
        if (serviceId) {
            const svc = await Service.findOne({ _id: serviceId, organizationId: req.organizationId });
            if (!svc) return res.status(400).json({ message: "Service not found in your organization" });
        }

        const org = await Organization.findById(req.organizationId);
        const locationId = org?.locations?.[0]?._id;

        const hashedPassword = await bcrypt.hash(password, 10);
        const agent = await User.create({
            organizationId:  req.organizationId,
            locationId,
            role:            "AGENT",
            name,
            email,
            serviceCategory,
            serviceId:       serviceId || undefined,
            password:        hashedPassword
        });

        res.json({
            message: "Agent created successfully",
            agent: {
                id:              agent._id,
                name:            agent.name,
                email:           agent.email,
                serviceCategory: agent.serviceCategory,
                serviceId:       agent.serviceId
            }
        });
    } catch (err) {
        if (err.name === "ZodError" || err.issues) {
            return res.status(400).json({
                message: "Validation failed",
                errors: (err.issues || err.errors || []).map(e => ({
                    field:   e.path?.join(".") || "unknown",
                    message: e.message
                }))
            });
        }
        logger.error("Create Agent Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @swagger
 * /org/staff/operator:
 *   post:
 *     summary: Add an Operator to the organization
 *     tags: [Organization — Staff]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Operator
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@citygeneral.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass123
 *               assignedAgents:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Agent ObjectIds from POST /org/staff/agent responses
 *                 example: ["507f1f77bcf86cd799439011"]
 *     responses:
 *       200:
 *         description: Operator created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 */
router.post("/staff/operator", orgAuth, async (req, res) => {
    try {
        const validatedData = addOperatorSchema.parse(req.body);
        const { name, email, password, assignedAgents } = validatedData;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User with this email already exists." });

        // Verify assigned agents belong to this org
        const validAgents = [];
        if (assignedAgents && assignedAgents.length > 0) {
            const validIds = assignedAgents.filter(id => mongoose.isValidObjectId(id));
            if (validIds.length !== assignedAgents.length) {
                return res.status(400).json({ message: "One or more assignedAgents IDs are not valid ObjectIds" });
            }
            const agents = await User.find({
                _id:            { $in: validIds },
                organizationId: req.organizationId,
                role:           "AGENT"
            });
            validAgents.push(...agents.map(a => a._id));
        }

        const org = await Organization.findById(req.organizationId);
        const locationId = org?.locations?.[0]?._id;

        const hashedPassword = await bcrypt.hash(password, 10);
        const operator = await User.create({
            organizationId: req.organizationId,
            locationId,
            role:           "OPERATOR",
            name,
            email,
            password:       hashedPassword,
            assignedAgents: validAgents
        });

        res.json({
            message: "Operator created successfully",
            operator: {
                id:             operator._id,
                name:           operator.name,
                email:          operator.email,
                assignedAgents: operator.assignedAgents
            }
        });
    } catch (err) {
        if (err.name === "ZodError" || err.issues) {
            return res.status(400).json({
                message: "Validation failed",
                errors: (err.issues || err.errors || []).map(e => ({
                    field:   e.path?.join(".") || "unknown",
                    message: e.message
                }))
            });
        }
        logger.error("Create Operator Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /org/staff/:id/schedule — update agent schedule
router.put("/staff/:id/schedule", orgAuth, async (req, res) => {
    try {
        const { schedule } = req.body;
        const agent = await User.findOne({
            _id:            req.params.id,
            organizationId: req.organizationId,
            role:           "AGENT"
        });
        if (!agent) return res.status(404).json({ message: "Agent not found in your organization" });

        agent.schedule = schedule;
        await agent.save();
        res.json({ message: "Schedule updated successfully", schedule: agent.schedule });
    } catch (err) {
        logger.error("Update Schedule Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @swagger
 * /org/staff:
 *   get:
 *     summary: List all staff in the organization
 *     tags: [Organization — Staff]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of staff members
 */
router.get("/staff", orgAuth, async (req, res) => {
    try {
        const staff = await User.find({
            organizationId: req.organizationId,
            role:           { $in: ["AGENT", "OPERATOR"] }
        })
            .populate("assignedAgents",  "name email serviceCategory availability")
            .populate("serviceId",       "name category")
            .select("-password -refreshToken -resetPasswordToken");
        res.json(staff);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// GET /org/operator/agents — assigned agents for the logged-in operator (no orgAuth, uses token)
router.get("/operator/agents", async (req, res) => {
    try {
        const jwt = require("jsonwebtoken");
        const token = req.cookies.token || req.cookies.orgToken || req.header("Authorization")?.replace("Bearer ", "");
        if (!token) return res.status(401).json({ message: "Authentication required" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId || decoded.orgAdminId;
        const user   = await User.findById(userId);

        if (!user || user.role !== "OPERATOR") {
            return res.status(403).json({ message: "Only Operators can access this route" });
        }

        const agents = await User.find({
            _id:  { $in: user.assignedAgents },
            role: "AGENT"
        }).select("name serviceCategory avgSessionDuration availability statusMessage serviceId");

        res.json(agents);
    } catch (err) {
        logger.error("Operator agents fetch error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Services (queue channels)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /org/services:
 *   get:
 *     summary: List all services for the organization
 *     tags: [Organization — Services]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of services
 */
router.get("/services", orgAuth, async (req, res) => {
    try {
        const services = await Service.find({ organizationId: req.organizationId })
            .sort({ createdAt: -1 });
        res.json(services);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @swagger
 * /org/services:
 *   post:
 *     summary: Create a new service (queue channel)
 *     tags: [Organization — Services]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: General Consultation
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 example: Cardiology
 *               avgSessionDuration:
 *                 type: number
 *                 example: 10
 *               maxCapacity:
 *                 type: number
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Service created
 *       400:
 *         description: Validation error
 */
router.post("/services", orgAuth, async (req, res) => {
    try {
        const validatedData = createServiceSchema.parse(req.body);
        const service = await Service.create({
            organizationId: req.organizationId,
            ...validatedData
        });
        res.status(201).json({ message: "Service created successfully", service });
    } catch (err) {
        if (err.name === "ZodError" || err.issues) {
            return res.status(400).json({
                message: "Validation failed",
                errors: (err.issues || err.errors || []).map(e => ({
                    field:   e.path?.join(".") || "unknown",
                    message: e.message
                }))
            });
        }
        logger.error("Create Service Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /org/services/:id — update a service
router.put("/services/:id", orgAuth, async (req, res) => {
    try {
        const validatedData = updateServiceSchema.parse(req.body);
        const service = await Service.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.organizationId },
            validatedData,
            { new: true }
        );
        if (!service) return res.status(404).json({ message: "Service not found" });
        res.json({ message: "Service updated successfully", service });
    } catch (err) {
        if (err.name === "ZodError" || err.issues) {
            return res.status(400).json({
                message: "Validation failed",
                errors: (err.issues || err.errors || []).map(e => ({
                    field:   e.path?.join(".") || "unknown",
                    message: e.message
                }))
            });
        }
        logger.error("Update Service Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE /org/services/:id — deactivate a service
router.delete("/services/:id", orgAuth, async (req, res) => {
    try {
        const service = await Service.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.organizationId },
            { isActive: false },
            { new: true }
        );
        if (!service) return res.status(404).json({ message: "Service not found" });
        res.json({ message: "Service deactivated", service });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// API Keys Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /org/keys:
 *   get:
 *     summary: List API keys for the organization
 *     tags: [Organization — API Keys]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of API keys (hash not included)
 */
router.get("/keys", orgAuth, async (req, res) => {
    try {
        const keys = await ApiKey.find({ organizationId: req.organizationId })
            .select("-keyHash")
            .sort({ createdAt: -1 });
        res.json({ success: true, data: keys });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /org/keys:
 *   post:
 *     summary: Generate a new API key
 *     description: Returns the raw full key once — store it securely, it is not recoverable.
 *     tags: [Organization — API Keys]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Production Key
 *               isLive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Key created — shown once
 *       400:
 *         description: Name required
 */
router.post("/keys", orgAuth, async (req, res) => {
    try {
        const { name, isLive } = req.body;
        if (!name) return res.status(400).json({ message: "Key name is required" });

        const prefix    = isLive ? "sq_live_" : "sq_test_";
        const rawSecret = crypto.randomBytes(32).toString("hex");

        const newKeyDoc = new ApiKey({
            organizationId: req.organizationId,
            name,
            prefix,
            keyHash: await bcrypt.hash(rawSecret, 10),
            status:  "Active"
        });

        const keyIdBase64 = Buffer.from(newKeyDoc._id.toString(), "utf8").toString("base64");
        const fullRawKey  = `${prefix}${keyIdBase64}_${rawSecret}`;

        await newKeyDoc.save();

        res.status(201).json({
            success: true,
            message: "Key generated successfully. This will only be shown once.",
            key:       fullRawKey,
            keyRecord: {
                id:        newKeyDoc._id,
                name:      newKeyDoc.name,
                prefix:    newKeyDoc.prefix,
                createdAt: newKeyDoc.createdAt
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error generating key" });
    }
});

// DELETE /org/keys/:id — revoke a key
router.delete("/keys/:id", orgAuth, async (req, res) => {
    try {
        await ApiKey.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.organizationId },
            { status: "Revoked" }
        );
        res.json({ success: true, message: "API Key revoked" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Webhooks Management
// ─────────────────────────────────────────────────────────────────────────────

router.get("/webhooks", orgAuth, async (req, res) => {
    try {
        const webhooks = await Webhook.find({ organizationId: req.organizationId }).sort({ createdAt: -1 });
        res.json({ success: true, data: webhooks });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

router.post("/webhooks", orgAuth, async (req, res) => {
    try {
        const { url, events } = req.body;
        if (!url || !events || !events.length) {
            return res.status(400).json({ message: "URL and events are required" });
        }

        const secret  = crypto.randomBytes(24).toString("hex");
        const webhook = await Webhook.create({
            organizationId: req.organizationId,
            url,
            secret,
            events,
            isActive: true
        });
        res.status(201).json({ success: true, data: webhook });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error creating webhook" });
    }
});

router.delete("/webhooks/:id", orgAuth, async (req, res) => {
    try {
        await Webhook.findOneAndDelete({ _id: req.params.id, organizationId: req.organizationId });
        res.json({ success: true, message: "Webhook deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// API Usage
// ─────────────────────────────────────────────────────────────────────────────

router.get("/usage", orgAuth, async (req, res) => {
    try {
        const org = await Organization.findById(req.organizationId);
        const plan = org?.subscriptionPlan || "Starter";

        const planLimits = { Starter: 1000, Growth: 10000, Enterprise: null };
        const maxLimit   = planLimits[plan] ?? null;

        const currentMonth = new Date().toISOString().slice(0, 7);
        const usage = await ApiUsage.findOne({ organizationId: req.organizationId, yearMonth: currentMonth });

        res.json({
            success: true,
            data: {
                used:  usage ? usage.requestCount : 0,
                limit: maxLimit,
                plan,
                month: currentMonth
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /org/analytics:
 *   get:
 *     summary: Get organization analytics (last 30 days)
 *     tags: [Organization — Analytics]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Analytics data including daily volume, agent performance, and heatmap
 */
router.get("/analytics", orgAuth, async (req, res) => {
    try {
        const organizationId = new mongoose.Types.ObjectId(req.organizationId);
        const thirtyDaysAgo  = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        // 1. Daily client volume (last 30 days)
        const dailyVolume = await QueueEntry.aggregate([
            { $match: { organizationId, createdAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        // 2. Agent performance
        const agentPerformance = await QueueEntry.aggregate([
            { $match: { organizationId, createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id:       "$agentId",
                    completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
                    total:     { $sum: 1 },
                    avgWaitTime: {
                        $avg: {
                            $cond: [
                                { $eq: ["$status", "completed"] },
                                { $divide: [{ $subtract: ["$completedAt", "$createdAt"] }, 60000] },
                                null
                            ]
                        }
                    }
                }
            },
            { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "agent" } },
            { $unwind: "$agent" },
            {
                $project: {
                    agentName:   "$agent.name",
                    completed:   1,
                    cancelled:   1,
                    total:       1,
                    avgWaitTime: { $round: ["$avgWaitTime", 0] }
                }
            }
        ]);

        // 3. Heatmap (day of week × hour of day)
        const heatmapRaw = await QueueEntry.aggregate([
            { $match: { organizationId, createdAt: { $gte: thirtyDaysAgo } } },
            {
                $project: {
                    dayOfWeek: { $dayOfWeek: "$createdAt" },
                    hourOfDay: { $hour:      "$createdAt" }
                }
            },
            { $group: { _id: { dayOfWeek: "$dayOfWeek", hourOfDay: "$hourOfDay" }, count: { $sum: 1 } } }
        ]);

        const heatmap = heatmapRaw.map(item => ({
            dayOfWeek: item._id.dayOfWeek - 1,
            hourOfDay: item._id.hourOfDay,
            count:     item.count
        }));

        res.json({
            dailyVolume:     dailyVolume.map(v => ({ date: v._id, count: v.count })),
            agentPerformance,
            heatmap
        });
    } catch (err) {
        logger.error("Analytics fetch error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
