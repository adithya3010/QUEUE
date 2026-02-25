const IdempotencyKey = require('../models/IdempotencyKey');

const checkIdempotency = async (req, res, next) => {
    const idempotencyKey = req.header('Idempotency-Key');

    // If no key provided, just continue normally (or we could enforce it for strict B2B)
    if (!idempotencyKey) {
        return next();
    }

    try {
        const hospitalId = req.hospital._id;

        // Check if this key was already used by this hospital
        let keyRecord = await IdempotencyKey.findOne({ hospitalId, key: idempotencyKey });

        if (keyRecord) {
            // If we have a stored response, return it immediately to prevent duplicate processing
            if (keyRecord.responseBody) {
                return res.status(keyRecord.responseStatus).json(keyRecord.responseBody);
            } else {
                // The request is currently processing in another thread
                return res.status(409).json({
                    success: false,
                    error: 'Conflict',
                    message: 'A request with this Idempotency-Key is currently processing.'
                });
            }
        }

        // Lock the key: create a pending record
        keyRecord = new IdempotencyKey({
            hospitalId,
            key: idempotencyKey,
            requestPath: req.originalUrl,
            requestMethod: req.method,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // TTL 24 hours
        });
        await keyRecord.save();

        // Intercept res.json to save the response payload
        const originalJson = res.json;
        res.json = function (body) {
            // Save the payload async, don't block the response
            IdempotencyKey.updateOne(
                { _id: keyRecord._id },
                {
                    $set: {
                        responseStatus: res.statusCode,
                        responseBody: body
                    }
                }
            ).catch(err => console.error("Idempotency Save Error:", err));

            return originalJson.call(this, body);
        };

        next();
    } catch (err) {
        // If there's a unique constraint error, it means another request just created it
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                error: 'Conflict',
                message: 'A request with this Idempotency-Key is currently processing.'
            });
        }
        console.error('Idempotency error:', err);
        next();
    }
};

module.exports = { checkIdempotency };
