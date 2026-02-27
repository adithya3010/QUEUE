const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcrypt");
const crypto   = require("crypto");
const jwt      = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User         = require("../models/User");
const Organization = require("../models/Organization");
const { orgSignupSchema, orgLoginSchema } = require("../validators/org_validator");
const logger       = require("../utils/logger");
const { generateTokenPair, verifyRefreshToken } = require("../utils/tokenUtils");
const { sendPasswordResetEmail, sendPasswordChangeConfirmation } = require("../utils/emailService");
const { auth } = require("../middleware/authMiddleware");

// ─── Google OAuth Strategy ───────────────────────────────────────────────────
passport.use(new GoogleStrategy({
    clientID:    process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ["profile", "email"]
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(null, false, { message: "No email from Google" });

        let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });
        if (user) {
            if (!user.googleId) { user.googleId = profile.id; await user.save(); }
            return done(null, user);
        }
        return done(null, false, { isNew: true, profile, email });
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done)   => done(null, user));
passport.deserializeUser((user, done) => done(null, user));
router.use(passport.initialize());

// ─── Cookie helpers ───────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === "production";

const accessTokenCookieOptions = {
    httpOnly: true,
    secure:   isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge:   15 * 60 * 1000
};

const refreshTokenCookieOptions = {
    httpOnly: true,
    secure:   isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge:   7 * 24 * 60 * 60 * 1000,
    path:     "/api/auth/refresh"
};

// ─── Rate limiter ─────────────────────────────────────────────────────────────
const authLimiter = process.env.NODE_ENV === "test"
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: { message: "Too many authentication attempts, please try again after 15 minutes" },
        standardHeaders: true,
        legacyHeaders:   false,
    });

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/signup — register ORG_ADMIN + Organization
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new organization admin account
 *     tags: [Authentication]
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
 *               hospitalName:
 *                 type: string
 *                 description: Deprecated — use orgName
 *                 example: City General Hospital
 *               name:
 *                 type: string
 *                 example: John Admin
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Organization admin registered
 *       400:
 *         description: Validation error or email exists
 */
router.post("/signup", authLimiter, async (req, res) => {
    try {
        // Accept both orgName (new) and hospitalName (legacy)
        const body = { ...req.body, orgName: req.body.orgName || req.body.hospitalName };
        const validatedData = orgSignupSchema.parse(body);
        const { name, email, password, orgName, industry } = validatedData;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already exists" });

        const existingOrg = await Organization.findOne({ email });
        if (existingOrg) return res.status(400).json({ message: "An organization with this email is already registered." });

        // Generate unique slug
        function generateSlug(n) {
            return n.toLowerCase().trim()
                .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 50);
        }
        let baseSlug = generateSlug(orgName);
        let slug = baseSlug;
        let c = 1;
        while (await Organization.findOne({ slug })) { slug = `${baseSlug}-${c++}`; }

        const org = await Organization.create({
            name: orgName,
            email,
            industry: industry || "other",
            slug,
            locations: [{ name: "Main Location", address: "Default Location" }]
        });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            organizationId: org._id,
            role:           "ORG_ADMIN",
            name,
            email,
            password:       hashedPassword
        });

        res.json({
            message: "Signup successful",
            user: {
                id:             user._id,
                role:           user.role,
                organizationId: user.organizationId,
                hospitalId:     user.organizationId, // compat alias
                name:           user.name,
                email:          user.email,
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
        logger.error("Signup Error", { error: err.message, stack: err.stack });
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/login — universal login for AGENT / OPERATOR / ORG_ADMIN
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login (Agent / Operator / Org Admin)
 *     tags: [Authentication]
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
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, cookies set
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", authLimiter, async (req, res) => {
    try {
        const validatedData = orgLoginSchema.parse(req.body);
        const { email, password } = validatedData;

        const user = await User.findOne({ email })
            .populate("assignedAgents", "name email serviceCategory availability");
        if (!user) return res.status(401).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

        const { accessToken, refreshToken, refreshTokenExpiry } = generateTokenPair({
            userId:         user._id,
            role:           user.role,
            organizationId: user.organizationId,
            hospitalId:     user.organizationId // keep in payload for legacy middleware
        });

        user.refreshToken       = refreshToken;
        user.refreshTokenExpiry = refreshTokenExpiry;
        await user.save();

        res.cookie("token", accessToken, accessTokenCookieOptions);
        res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

        logger.info("User logged in successfully", { userId: user._id, role: user.role });

        res.json({
            message: "Login successful",
            user: {
                id:             user._id,
                organizationId: user.organizationId,
                hospitalId:     user.organizationId, // compat alias
                role:           user.role,
                name:           user.name,
                email:          user.email,
                assignedAgents:  user.assignedAgents  || [],
                assignedDoctors: user.assignedAgents  || []  // compat alias
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
        logger.error("Login Error", { error: err.message, stack: err.stack });
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /auth/me — current user
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user details
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User details
 *       401:
 *         description: Not authenticated
 */
router.get("/me", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate("assignedAgents", "name email serviceCategory availability")
            .select("-password -refreshToken -resetPasswordToken");
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({
            id:              user._id,
            role:            user.role,
            organizationId:  user.organizationId,
            hospitalId:      user.organizationId, // compat alias
            name:            user.name,
            email:           user.email,
            assignedAgents:  user.assignedAgents  || [],
            assignedDoctors: user.assignedAgents  || []  // compat alias
        });
    } catch (err) {
        logger.error("Get Me Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/logout
// ─────────────────────────────────────────────────────────────────────────────
router.post("/logout", async (req, res) => {
    try {
        const token = req.cookies.token;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                await User.findByIdAndUpdate(decoded.userId, { refreshToken: null, refreshTokenExpiry: null });
                logger.info("User logged out", { userId: decoded.userId });
            } catch (_) { /* expired token — continue */ }
        }

        const clearOpts = { httpOnly: true, sameSite: isProduction ? "none" : "lax", secure: isProduction };
        res.clearCookie("token",        clearOpts);
        res.clearCookie("orgToken",     clearOpts);
        res.clearCookie("adminToken",   clearOpts);
        res.clearCookie("refreshToken", { ...clearOpts, path: "/api/auth/refresh" });

        res.json({ message: "Logout successful" });
    } catch (err) {
        logger.error("Logout Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/refresh — rotate refresh token
// ─────────────────────────────────────────────────────────────────────────────
router.post("/refresh", async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) return res.status(401).json({ message: "Refresh token not found" });

        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch (_) {
            return res.status(401).json({ message: "Invalid or expired refresh token" });
        }

        const user = await User.findById(decoded.userId);
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }
        if (user.refreshTokenExpiry && new Date() > user.refreshTokenExpiry) {
            return res.status(401).json({ message: "Refresh token expired" });
        }

        const { accessToken, refreshToken: newRefreshToken, refreshTokenExpiry } = generateTokenPair({
            userId:         user._id,
            role:           user.role,
            organizationId: user.organizationId,
            hospitalId:     user.organizationId
        });

        user.refreshToken       = newRefreshToken;
        user.refreshTokenExpiry = refreshTokenExpiry;
        await user.save();

        res.cookie("token",        accessToken,      accessTokenCookieOptions);
        res.cookie("refreshToken", newRefreshToken,  refreshTokenCookieOptions);

        res.json({ message: "Token refreshed successfully" });
    } catch (err) {
        logger.error("Refresh Token Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────
router.post("/forgot-password", authLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ message: "If an account exists with this email, a password reset link has been sent" });
        }

        const resetToken   = crypto.randomBytes(32).toString("hex");
        const hashedToken  = crypto.createHash("sha256").update(resetToken).digest("hex");

        user.resetPasswordToken  = hashedToken;
        user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000);
        await user.save();

        await sendPasswordResetEmail(email, resetToken, user.name);

        res.json({ message: "If an account exists with this email, a password reset link has been sent" });
    } catch (err) {
        logger.error("Forgot Password Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/reset-password/:token
// ─────────────────────────────────────────────────────────────────────────────
router.post("/reset-password/:token", authLimiter, async (req, res) => {
    try {
        const { token }    = req.params;
        const { password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters long" });
        }

        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
        const user = await User.findOne({
            resetPasswordToken:  hashedToken,
            resetPasswordExpiry: { $gt: Date.now() }
        });
        if (!user) return res.status(400).json({ message: "Invalid or expired reset token" });

        user.password            = await bcrypt.hash(password, 10);
        user.resetPasswordToken  = undefined;
        user.resetPasswordExpiry = undefined;
        await user.save();

        await sendPasswordChangeConfirmation(user.email, user.name);

        res.json({ message: "Password has been reset successfully" });
    } catch (err) {
        logger.error("Reset Password Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// ─── Google OAuth ─────────────────────────────────────────────────────────────
const GOOGLE_TEMP_TOKEN_SECRET = process.env.JWT_SECRET + "_google_temp";
const FRONTEND = process.env.FRONTEND_URL || "http://localhost:3000";

async function loginAndRedirect(res, user) {
    const org = await Organization.findById(user.organizationId);
    if (!org) return res.redirect(`${FRONTEND}/login?error=org_not_found`);

    // Fix missing locationId for legacy users
    if (!user.locationId && org.locations?.length > 0) {
        user.locationId = org.locations[0]._id;
    }

    const { accessToken, refreshToken, refreshTokenExpiry } = generateTokenPair({
        userId:         user._id,
        role:           user.role,
        organizationId: user.organizationId,
        hospitalId:     user.organizationId
    });

    user.refreshToken       = refreshToken;
    user.refreshTokenExpiry = refreshTokenExpiry;
    await user.save();

    const cookieOpts = { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax" };
    res.cookie("token",        accessToken,   { ...cookieOpts, maxAge: 15 * 60 * 1000 });
    res.cookie("refreshToken", refreshToken,  { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000, path: "/api/auth/refresh" });

    const redirectMap = {
        AGENT:     "/agent",
        OPERATOR:  "/operator",
        ORG_ADMIN: "/admin/dashboard",
        // Legacy role aliases (users that haven't migrated yet)
        DOCTOR:         "/agent",
        RECEPTIONIST:   "/operator",
        HOSPITAL_ADMIN: "/admin/dashboard"
    };
    res.redirect(`${FRONTEND}${redirectMap[user.role] || "/"}`);
}

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));

router.get("/google/callback",
    (req, res, next) => {
        passport.authenticate("google", { session: false }, async (err, user, info) => {
            if (err) {
                logger.error("Google OAuth error", { error: err.message });
                return res.redirect(`${FRONTEND}/login?error=oauth_error`);
            }
            if (user) return loginAndRedirect(res, user);

            if (info?.isNew) {
                const tempPayload = { googleId: info.profile.id, email: info.email, name: info.profile.displayName || "" };
                const tempToken   = jwt.sign(tempPayload, GOOGLE_TEMP_TOKEN_SECRET, { expiresIn: "15m" });
                return res.redirect(`${FRONTEND}/signup/google/complete?token=${tempToken}`);
            }
            return res.redirect(`${FRONTEND}/login?error=not_registered`);
        })(req, res, next);
    }
);

// POST /auth/google/complete — new admin user provides orgName
router.post("/google/complete", async (req, res) => {
    try {
        // Accept both orgName (new) and hospitalName (legacy)
        const { token } = req.body;
        const orgName   = req.body.orgName || req.body.hospitalName;

        if (!token || !orgName?.trim()) {
            return res.status(400).json({ message: "Token and organization name are required" });
        }

        let payload;
        try {
            payload = jwt.verify(token, GOOGLE_TEMP_TOKEN_SECRET);
        } catch {
            return res.status(401).json({ message: "Invalid or expired signup session. Please try again." });
        }

        const { googleId, email, name } = payload;

        const existingUser = await User.findOne({ $or: [{ googleId }, { email }] });
        if (existingUser) return res.status(400).json({ message: "Account already exists. Please log in." });

        // Clean up orphaned org from a previous failed attempt
        const existingOrg = await Organization.findOne({ email });
        if (existingOrg) {
            logger.warn("Deleting orphaned organization from a previous failed signup attempt", { email });
            await Organization.deleteOne({ _id: existingOrg._id });
        }

        // Generate slug
        function generateSlug(n) {
            return n.toLowerCase().trim()
                .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 50);
        }
        let baseSlug = generateSlug(orgName.trim());
        let slug = baseSlug; let c = 1;
        while (await Organization.findOne({ slug })) { slug = `${baseSlug}-${c++}`; }

        const org = await Organization.create({
            name:      orgName.trim(),
            email,
            industry:  "other",
            slug,
            locations: [{ name: "Main Location", address: "Default Location" }]
        });

        const newUser = await User.create({
            organizationId: org._id,
            locationId:     org.locations[0]._id,
            role:           "ORG_ADMIN",
            name:           name || email.split("@")[0],
            email,
            googleId,
            password:       undefined
        });

        const { accessToken, refreshToken, refreshTokenExpiry } = generateTokenPair({
            userId:         newUser._id,
            role:           newUser.role,
            organizationId: newUser.organizationId,
            hospitalId:     newUser.organizationId
        });

        newUser.refreshToken       = refreshToken;
        newUser.refreshTokenExpiry = refreshTokenExpiry;
        await newUser.save();

        const isProd    = process.env.NODE_ENV === "production";
        const cookieOpts = { httpOnly: true, secure: isProd, sameSite: isProd ? "none" : "lax" };
        res.cookie("token",        accessToken,  { ...cookieOpts, maxAge: 15 * 60 * 1000 });
        res.cookie("refreshToken", refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000, path: "/api/auth/refresh" });

        logger.info("New org admin registered via Google", { userId: newUser._id, email });

        return res.json({ message: "Signup successful", redirectTo: "/admin/dashboard" });
    } catch (err) {
        logger.error("Google Complete Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
