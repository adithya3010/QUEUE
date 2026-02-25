const rateLimit = require('express-rate-limit');

// For QaaS, we limit based on the Hospital ID attached by the API Key middleware.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: async (req, res) => {
        // Enforce quota based on subscription plan
        if (!req.hospital) return 100; // Fallback

        const plan = req.hospital.subscriptionPlan;
        if (plan === 'Enterprise') return 10000;
        if (plan === 'Pro') return 1000;
        return 100; // Basic plan limit per 15 minutes
    },
    keyGenerator: (req) => {
        return req.hospital ? req.hospital._id.toString() : (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
    },
    message: {
        success: false,
        error: 'Too Many Requests',
        message: 'You have exceeded your API quota. Please upgrade your subscription plan.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { apiLimiter };
