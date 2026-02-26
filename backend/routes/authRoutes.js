const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const Hospital = require("../models/Hospital");
const { adminSignupSchema, adminLoginSchema } = require("../validators/admin_validator");
const logger = require("../utils/logger");
const { generateTokenPair, verifyRefreshToken } = require("../utils/tokenUtils");
const { sendPasswordResetEmail, sendPasswordChangeConfirmation } = require("../utils/emailService");
const { auth } = require("../middleware/authMiddleware");

// ─── Google OAuth Strategy ───────────────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  scope: ["profile", "email"]
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(null, false, { message: "No email from Google" });

    // Try to find existing user by googleId or email
    let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });

    if (user) {
      // Link googleId if not already linked
      if (!user.googleId) {
        user.googleId = profile.id;
        await user.save();
      }
      return done(null, user);
    }

    // New user — return profile info for signup flow
    return done(null, false, { isNew: true, profile, email });
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

router.use(passport.initialize());


// Cookie settings based on environment
const isProduction = process.env.NODE_ENV === 'production';

const accessTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 15 * 60 * 1000  // 15 minutes
};

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
  path: '/api/auth/refresh'  // Only sent to refresh endpoint
};

// Rate limiter for authentication endpoints
// Disabled in test environment to avoid interference with tests
const authLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()  // No-op middleware for tests
  : rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs for local testing
    message: { message: "Too many authentication attempts, please try again after 15 minutes" },
    standardHeaders: true,
    legacyHeaders: false,
  });

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new doctor
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - specialization
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Dr. John Smith
 *               specialization:
 *                 type: string
 *                 example: Cardiology
 *               email:
 *                 type: string
 *                 format: email
 *                 example: doctor@hospital.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Doctor registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Signup successful
 *                 doctor:
 *                   $ref: '#/components/schemas/Doctor'
 *       400:
 *         description: Validation error or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.post("/signup", authLimiter, async (req, res) => {
  try {
    // Validate input with Zod
    const validatedData = adminSignupSchema.parse(req.body);
    const { name, email, password, hospitalName } = validatedData;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const existingHospital = await Hospital.findOne({ email });
    if (existingHospital) {
      return res.status(400).json({ message: "A hospital with this email is already registered." });
    }

    const hospital = await Hospital.create({
      name: hospitalName,
      email: email,
      branches: [{ name: "Main Branch", address: "Local Branch" }]
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      hospitalId: hospital._id,
      role: "HOSPITAL_ADMIN",
      name,
      email,
      password: hashedPassword,
    }); // HOSPITAL_ADMIN doesn't require branchId

    res.json({
      message: "Signup successful",
      user: {
        id: user._id,
        role: user.role,
        hospitalId: user.hospitalId,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    // Handle Zod validation errors
    if (err.name === "ZodError" || err.issues) {
      return res.status(400).json({
        message: "Validation failed",
        errors: (err.issues || err.errors || []).map(e => ({
          field: e.path?.join('.') || 'unknown',
          message: e.message
        }))
      });
    }
    logger.error("Signup Error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Server error" });
  }
});


/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login as a doctor
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: doctor@hospital.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Login successful, cookies set
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: token=abc123; refreshToken=def456; HttpOnly
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 doctor:
 *                   $ref: '#/components/schemas/Doctor'
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.post("/login", authLimiter, async (req, res) => {
  try {
    // Validate input with Zod
    const validatedData = adminLoginSchema.parse(req.body);
    const { email, password } = validatedData;

    const user = await User.findOne({ email }).populate("assignedDoctors", "name email specialization availability");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken, refreshTokenExpiry } = generateTokenPair({
      userId: user._id,
      role: user.role,
      hospitalId: user.hospitalId,
      branchId: user.branchId
    });

    // Fix legacy users missing a branchId
    if (!user.branchId) {
      const Hospital = require("../models/Hospital");
      const hospital = await Hospital.findById(user.hospitalId);
      if (hospital && hospital.branches && hospital.branches.length > 0) {
        user.branchId = hospital.branches[0]._id;
      } else if (hospital) {
        // Create a default branch if none exist
        hospital.branches = [{ name: "Main Branch", address: "Legacy Auto-Created" }];
        await hospital.save();
        user.branchId = hospital.branches[0]._id;
      }
    }

    // Store refresh token in database
    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = refreshTokenExpiry;
    await user.save();

    // Set tokens in cookies
    res.cookie("token", accessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

    logger.info("User logged in successfully", { userId: user._id, role: user.role });

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        hospitalId: user.hospitalId,
        branchId: user.branchId,
        role: user.role,
        name: user.name,
        email: user.email,
        assignedDoctors: user.assignedDoctors || []
      },
    });
  } catch (err) {
    // Handle Zod validation errors
    if (err.name === "ZodError" || err.issues) {
      return res.status(400).json({
        message: "Validation failed",
        errors: (err.issues || err.errors || []).map(e => ({
          field: e.path?.join('.') || 'unknown',
          message: e.message
        }))
      });
    }
    logger.error("Login Error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Server error" });
  }
});

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
 *         description: User details retrieved
 *       401:
 *         description: Not authenticated
 */
router.get("/me", auth, async (req, res) => {
  try {
    // req.user is populated by the authMiddleware with role, hospitalId, and id
    const user = await User.findById(req.user.id)
      .populate("assignedDoctors", "name email specialization availability")
      .select("-password -refreshToken -resetPasswordToken");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user._id,
      role: user.role,
      hospitalId: user.hospitalId,
      name: user.name,
      email: user.email,
      assignedDoctors: user.assignedDoctors || []
    });
  } catch (err) {
    logger.error("Get Me Error", { error: err.message });
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout doctor and clear tokens
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *       500:
 *         description: Server error
 */
router.post("/logout", async (req, res) => {
  try {
    // Get doctor ID from token if available
    const token = req.cookies.token;
    if (token) {
      try {
        const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
        // Clear refresh token from database
        await User.findByIdAndUpdate(decoded.userId, {
          refreshToken: null,
          refreshTokenExpiry: null
        });
        logger.info("User logged out successfully", { userId: decoded.userId });
      } catch (err) {
        // Token might be expired, continue with logout
      }
    }

    // Clear both cookies
    const clearAccessCookieOptions = {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction
    };

    const clearRefreshCookieOptions = {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      path: '/api/auth/refresh'
    };

    res.clearCookie("token", clearAccessCookieOptions);
    res.clearCookie("refreshToken", clearRefreshCookieOptions);

    res.json({ message: "Logout successful" });
  } catch (err) {
    logger.error("Logout Error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     description: Issues a new access token and rotates the refresh token. Requires valid refresh token in cookie.
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: token=newToken123; refreshToken=newRefresh456; HttpOnly
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 *       500:
 *         description: Server error
 */
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not found" });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    // Find user and verify refresh token matches
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Check if refresh token is expired
    if (user.refreshTokenExpiry && new Date() > user.refreshTokenExpiry) {
      return res.status(401).json({ message: "Refresh token expired" });
    }

    // Generate new access token and rotate refresh token
    const { accessToken, refreshToken: newRefreshToken, refreshTokenExpiry } = generateTokenPair({
      userId: user._id,
      role: user.role,
      hospitalId: user.hospitalId
    });

    // Update refresh token in database (token rotation)
    user.refreshToken = newRefreshToken;
    user.refreshTokenExpiry = refreshTokenExpiry;
    await user.save();

    // Set new tokens in cookies
    res.cookie("token", accessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions);

    logger.info("Access token refreshed successfully", { userId: user._id });

    res.json({
      message: "Token refreshed successfully"
    });
  } catch (err) {
    logger.error("Refresh Token Error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset link
 *     description: Generates a secure reset token and sends an email with password reset link. Returns same message for both existing and non-existing emails (prevents enumeration).
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: doctor@hospital.com
 *     responses:
 *       200:
 *         description: Password reset email sent (or not, but message is same for security)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: If an account exists with this email, a password reset link has been sent
 *       400:
 *         description: Email is required
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.post("/forgot-password", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user by email
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    // Don't reveal if email exists or not
    if (!user) {
      logger.info("Password reset requested for non-existent email", { email });
      return res.json({
        message: "If an account exists with this email, a password reset link has been sent"
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set reset token and expiry (1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send reset email
    const emailSent = await sendPasswordResetEmail(email, resetToken, user.name);

    if (!emailSent) {
      logger.error("Failed to send password reset email", { email });
      // Still return success to user to prevent email enumeration
    }

    logger.info("Password reset email sent", { userId: user._id, email });

    res.json({
      message: "If an account exists with this email, a password reset link has been sent"
    });
  } catch (err) {
    logger.error("Forgot Password Error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   post:
 *     summary: Reset password using token
 *     description: Validates reset token and updates password. Token is single-use and expires after 1 hour.
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token from email
 *         example: abc123def456xyz789
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: NewSecurePass123
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password has been reset successfully
 *       400:
 *         description: Invalid token or weak password
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.post("/reset-password/:token", authLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long"
      });
    }

    // Hash the token from URL to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token"
      });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;

    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;

    await user.save();

    // Send confirmation email
    await sendPasswordChangeConfirmation(user.email, user.name);

    logger.info("Password reset successful", { userId: user._id });

    res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    logger.error("Reset Password Error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Google OAuth Routes ──────────────────────────────────────────────────────

const GOOGLE_TEMP_TOKEN_SECRET = process.env.JWT_SECRET + "_google_temp";
const FRONTEND = process.env.FRONTEND_URL || "http://localhost:3000";

// Helper: set JWT cookies + redirect to correct dashboard
async function loginAndRedirect(res, user) {
  const hospital = await Hospital.findById(user.hospitalId);
  if (!hospital) {
    return res.redirect(`${FRONTEND}/login?error=hospital_not_found`);
  }

  // Fix missing branchId for legacy users
  if (!user.branchId && hospital.branches?.length > 0) {
    user.branchId = hospital.branches[0]._id;
  }

  const { accessToken, refreshToken, refreshTokenExpiry } = generateTokenPair({
    userId: user._id,
    role: user.role,
    hospitalId: user.hospitalId,
    branchId: user.branchId
  });

  user.refreshToken = refreshToken;
  user.refreshTokenExpiry = refreshTokenExpiry;
  await user.save();

  const isProduction = process.env.NODE_ENV === "production";
  const cookieOpts = { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax" };

  res.cookie("token", accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000, path: "/api/auth/refresh" });

  const redirectMap = {
    DOCTOR: "/doctor",
    RECEPTIONIST: "/reception",
    HOSPITAL_ADMIN: "/admin/dashboard"
  };
  res.redirect(`${FRONTEND}${redirectMap[user.role] || "/"}`);
}

// GET /auth/google — initiate
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));

// GET /auth/google/callback
router.get("/google/callback",
  (req, res, next) => {
    passport.authenticate("google", { session: false }, async (err, user, info) => {
      if (err) {
        logger.error("Google OAuth error", { error: err.message });
        return res.redirect(`${FRONTEND}/login?error=oauth_error`);
      }

      // Existing user found → log in
      if (user) {
        return loginAndRedirect(res, user);
      }

      // New user — only allow new Hospital Admin registrations
      if (info?.isNew) {
        const tempPayload = {
          googleId: info.profile.id,
          email: info.email,
          name: info.profile.displayName || "",
        };
        const tempToken = jwt.sign(tempPayload, GOOGLE_TEMP_TOKEN_SECRET, { expiresIn: "15m" });
        return res.redirect(`${FRONTEND}/signup/google/complete?token=${tempToken}`);
      }

      return res.redirect(`${FRONTEND}/login?error=not_registered`);
    })(req, res, next);
  }
);

// POST /auth/google/complete — new Admin user provides hospitalName
router.post("/google/complete", async (req, res) => {
  try {
    const { token, hospitalName } = req.body;
    if (!token || !hospitalName?.trim()) {
      return res.status(400).json({ message: "Token and hospital name are required" });
    }

    let payload;
    try {
      payload = jwt.verify(token, GOOGLE_TEMP_TOKEN_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired signup session. Please try again." });
    }

    const { googleId, email, name } = payload;

    // Check if full account (User) already exists
    const existingUser = await User.findOne({ $or: [{ googleId }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: "Account already exists. Please log in." });
    }

    // Check for orphaned Hospital (created during a previously failed attempt)
    // If no User exists but a Hospital does, clean it up and recreate
    const existingHospital = await Hospital.findOne({ email });
    if (existingHospital) {
      logger.warn("Deleting orphaned hospital from a previous failed signup attempt", { email });
      await Hospital.deleteOne({ _id: existingHospital._id });
    }

    const hospital = await Hospital.create({
      name: hospitalName.trim(),
      email,
      branches: [{ name: "Main Branch", address: "Local Branch" }]
    });

    const newUser = await User.create({
      hospitalId: hospital._id,
      role: "HOSPITAL_ADMIN",
      name: name || email.split("@")[0],
      email,
      googleId,
      password: undefined // No password for Google users
    });

    // Assign branchId and issue JWT cookies
    newUser.branchId = hospital.branches[0]._id;

    const { accessToken, refreshToken, refreshTokenExpiry } = generateTokenPair({
      userId: newUser._id,
      role: newUser.role,
      hospitalId: newUser.hospitalId,
      branchId: newUser.branchId
    });

    newUser.refreshToken = refreshToken;
    newUser.refreshTokenExpiry = refreshTokenExpiry;
    await newUser.save();

    const isProd = process.env.NODE_ENV === "production";
    const cookieOpts = { httpOnly: true, secure: isProd, sameSite: isProd ? "none" : "lax" };
    res.cookie("token", accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
    res.cookie("refreshToken", refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000, path: "/api/auth/refresh" });

    logger.info("New admin registered via Google", { userId: newUser._id, email });

    // Return JSON — the frontend (Axios caller) will navigate
    return res.json({ message: "Signup successful", redirectTo: "/admin/dashboard" });
  } catch (err) {
    logger.error("Google Complete Error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
