const logger = require("./logger");
const {
    sendQueueConfirmationEmail,
    sendNearlyUpAlertEmail,
    sendReturnVisitReminderEmail
} = require("./emailService");

const isEmail = (value) => typeof value === "string" && value.includes("@");

/**
 * Send Queue Confirmation via Email
 * @param {string} email
 * @param {string} name 
 * @param {number} position 
 * @param {string} trackingUrl 
 * @param {string} doctorName 
 */
async function sendQueueConfirmation(email, name, position, trackingUrl, doctorName) {
    if (!isEmail(email)) {
        logger.info("Queue confirmation skipped (no email)", { email });
        return true;
    }
    return sendQueueConfirmationEmail(email, name, position, trackingUrl, doctorName);
}

/**
 * Send "Nearly Up" Alert via Email
 * @param {string} email
 * @param {string} name 
 * @param {string} doctorName 
 */
async function sendNearlyUpAlert(email, name, doctorName) {
    if (!isEmail(email)) {
        logger.info("Nearly-up alert skipped (no email)", { email });
        return true;
    }
    return sendNearlyUpAlertEmail(email, name, doctorName);
}

/**
 * Send Return Visit Reminder Notification via Email
 * @param {string} email
 * @param {string} name 
 * @param {string} doctorName 
 * @param {Date} date 
 */
async function sendReturnVisitReminder(email, name, doctorName, date) {
    if (!isEmail(email)) {
        logger.info("Return visit reminder skipped (no email)", { email });
        return true;
    }
    return sendReturnVisitReminderEmail(email, name, doctorName, date);
}

module.exports = {
    sendQueueConfirmation,
    sendNearlyUpAlert,
    sendReturnVisitReminder
};
