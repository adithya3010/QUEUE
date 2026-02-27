const crypto = require('crypto');
const mongoose = require('mongoose');
const ApiKey = require('../models/ApiKey');
const ApiUsage = require('../models/ApiUsage');
const bcrypt = require('bcrypt');

const requireApiKey = async (req, res, next) => {
    try {
        const apiKeyHeader = req.header('x-api-key');

        if (!apiKeyHeader) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Missing x-api-key header'
            });
        }

        // We expect the key to format like: prefix_actualkey 
        // We will need to check all active keys for the given prefix or just fetch them all.
        // For performance, an API Key should ideally include a public ID (e.g. sq_live_PUBID_SECRET).
        // If not, we have to iterate through all active keys.
        // Alternatively, the Hospital ID can be passed in a header `x-hospital-id` to narrow it down.
        // Let's assume the external client passes just the key, and we look it up.
        // To avoid looping through the whole DB, standard practice is `prefix_PubKeyId_Secret`
        // For simplicity now, let's assume the key is passed, we find the first match, but in a real 
        // large SaaS we extract a fast lookup ID from the string. Let's design it with a lookup ID.
        // Format: {prefix}_{base64(apiKeyId)}_{secret}

        const parts = apiKeyHeader.split('_');

        if (parts.length < 4) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Malformed API Key'
            });
        }

        const prefix = `${parts[0]}_${parts[1]}`;
        const keyIdBase64 = parts[2];
        const secret = parts[3];

        const keyId = Buffer.from(keyIdBase64, 'base64').toString('utf8');

        if (!mongoose.isValidObjectId(keyId)) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Invalid API Key'
            });
        }

        const keyRecord = await ApiKey.findOne({ _id: keyId, status: 'Active' }).populate('hospitalId');

        if (!keyRecord || keyRecord.hospitalId.status !== 'Active') {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Invalid or revoked API Key'
            });
        }

        const isMatch = await bcrypt.compare(secret, keyRecord.keyHash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Invalid API Key'
            });
        }

        // Update Last Used
        keyRecord.lastUsedAt = new Date();
        await keyRecord.save();

        // Rate Limiting & Usage Tracking Logic
        const planLimits = {
            "Basic": 1000,
            "Pro": 10000,
            "Enterprise": Infinity
        };
        const hospitalPlan = keyRecord.hospitalId.subscriptionPlan || "Basic";
        const maxLimit = planLimits[hospitalPlan] || 1000;

        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        // Atomic increment (upserts if not exists)
        const usageRecord = await ApiUsage.findOneAndUpdate(
            { hospitalId: keyRecord.hospitalId._id, yearMonth: currentMonth },
            { $inc: { requestCount: 1 } },
            { new: true, upsert: true }
        );

        if (usageRecord.requestCount > maxLimit) {
            return res.status(429).json({
                success: false,
                error: 'Quota Exceeded',
                message: `Monthly API quota of ${maxLimit} requests for ${hospitalPlan} plan exceeded.`
            });
        }

        req.hospital = keyRecord.hospitalId;
        req.apiKey = keyRecord;

        next();
    } catch (err) {
        console.error('API Key Auth Error:', err);
        return res.status(500).json({
            success: false,
            error: 'Server Error',
            message: 'Error verifying API Key',
            detail: err.message
        });
    }
};

module.exports = { requireApiKey };
