const crypto = require('crypto');
const axios = require('axios');
const Webhook = require('../models/Webhook');

/**
 * Dispatches an outbound webhook event securely using HMAC SHA-256 signatures.
 * @param {ObjectId} organizationId
 * @param {String} event ("queue.created", "queue.updated", "agent.status_changed", etc)
 * @param {Object} payload The JSON object to send
 */
const dispatchWebhook = async (organizationId, event, payload) => {
    try {
        // Find all active subscriptions for this organization to this event
        const endpoints = await Webhook.find({
            organizationId,
            isActive: true,
            events: { $in: [event] }
        });

        if (!endpoints || endpoints.length === 0) return;

        // Build the payload envelope
        const deliveryPayload = {
            id: crypto.randomUUID(),
            event: event,
            timestamp: new Date().toISOString(),
            data: payload
        };

        const payloadString = JSON.stringify(deliveryPayload);

        // Dispatch to all endpoints 
        for (const endpoint of endpoints) {
            try {
                // Generate Signature
                const signature = crypto.createHmac('sha256', endpoint.secret)
                    .update(payloadString)
                    .digest('hex');

                // In B2B SaaS, this should be sent to a background worker (BullMQ/Redis)
                // For demonstration, firing async
                axios.post(endpoint.url, deliveryPayload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'SmartQueue-Signature': signature,
                        'SmartQueue-Event': event
                    },
                    timeout: 5000
                }).catch(err => {
                    // Log delivery failure to WebhookDeliveryLog model (Phase 3)
                    console.error(`[Webhook] Delivery failed to ${endpoint.url}:`, err.message);
                });

            } catch (dispatchErr) {
                console.error(`[Webhook] Internal dispatch error:`, dispatchErr);
            }
        }
    } catch (err) {
        console.error(`[Webhook] Fetch error:`, err);
    }
};

module.exports = { dispatchWebhook };
