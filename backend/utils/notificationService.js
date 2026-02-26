const axios = require("axios");

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID_CONFIRM = process.env.MSG91_TEMPLATE_ID_CONFIRM;
const MSG91_TEMPLATE_ID_ALERT = process.env.MSG91_TEMPLATE_ID_ALERT;
const MSG91_TEMPLATE_ID_REMINDER = process.env.MSG91_TEMPLATE_ID_REMINDER;

/**
 * Send Queue Confirmation via MSG91 (or simulate if no token)
 * @param {string} phone 
 * @param {string} name 
 * @param {number} position 
 * @param {string} trackingUrl 
 * @param {string} doctorName 
 */
async function sendQueueConfirmation(phone, name, position, trackingUrl, doctorName) {
    const message = `Hi ${name}, you are #${position} in Dr. ${doctorName}'s queue. Track live: ${trackingUrl}`;

    if (!MSG91_AUTH_KEY) {
        console.log(`[SIMULATED SMS/WA] To ${phone}: ${message}`);
        return true;
    }

    try {
        // Example MSG91 payload 
        const payload = {
            template_id: MSG91_TEMPLATE_ID_CONFIRM || "queue_confirm",
            short_url: "0",
            recipients: [{
                mobiles: phone,
                name: name,
                position: position,
                doctorName: doctorName,
                url: trackingUrl
            }]
        };

        const response = await axios.post("https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", payload, {
            headers: {
                "authkey": MSG91_AUTH_KEY,
                "Content-Type": "application/json"
            }
        });
        console.log(`[MSG91 SUCCESS] WhatsApp sent to ${phone}`, response.data);
        return true;
    } catch (err) {
        console.error(`[MSG91 ERROR] Failed to send WhatsApp to ${phone}`, err.response?.data || err.message);
        return false;
    }
}

/**
 * Send "Nearly Up" Alert
 * @param {string} phone 
 * @param {string} name 
 * @param {string} doctorName 
 */
async function sendNearlyUpAlert(phone, name, doctorName) {
    const message = `Hi ${name}, you are almost up to see Dr. ${doctorName}. Please proceed to the clinic in the next 5-10 minutes.`;

    if (!MSG91_AUTH_KEY) {
        console.log(`[SIMULATED SMS/WA] To ${phone}: ${message}`);
        return true;
    }

    try {
        const payload = {
            template_id: MSG91_TEMPLATE_ID_ALERT || "queue_alert",
            short_url: "0",
            recipients: [{
                mobiles: phone,
                name: name,
                doctorName: doctorName
            }]
        };

        const response = await axios.post("https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", payload, {
            headers: {
                "authkey": MSG91_AUTH_KEY,
                "Content-Type": "application/json"
            }
        });
        console.log(`[MSG91 SUCCESS] 'Nearly Up' sent to ${phone}`);
        return true;
    } catch (err) {
        console.error(`[MSG91 ERROR] Failed to send 'Nearly Up' to ${phone}`, err.message);
        return false;
    }
}

/**
 * Send Return Visit Reminder Notification
 * @param {string} phone 
 * @param {string} name 
 * @param {string} doctorName 
 * @param {Date} date 
 */
async function sendReturnVisitReminder(phone, name, doctorName, date) {
    const formattedDate = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const message = `Hi ${name}, this is to remind you about your upcoming return visit with Dr. ${doctorName} scheduled for tomorrow (${formattedDate}). Please manage your visit accordingly.`;

    if (!MSG91_AUTH_KEY) {
        console.log(`[SIMULATED SMS/WA] To ${phone}: ${message}`);
        return true;
    }

    try {
        const payload = {
            template_id: MSG91_TEMPLATE_ID_REMINDER || "return_reminder",
            short_url: "0",
            recipients: [{
                mobiles: phone,
                name: name,
                doctorName: doctorName,
                date: formattedDate
            }]
        };

        const response = await axios.post("https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", payload, {
            headers: {
                "authkey": MSG91_AUTH_KEY,
                "Content-Type": "application/json"
            }
        });
        console.log(`[MSG91 SUCCESS] Return Reminder sent to ${phone}`);
        return true;
    } catch (err) {
        console.error(`[MSG91 ERROR] Failed to send Return Reminder to ${phone}`, err.message);
        return false;
    }
}

module.exports = {
    sendQueueConfirmation,
    sendNearlyUpAlert,
    sendReturnVisitReminder
};
