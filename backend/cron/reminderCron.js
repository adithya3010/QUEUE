const cron        = require('node-cron');
const Appointment = require('../models/Appointment');
const logger      = require('../utils/logger');
const { sendReturnVisitReminder } = require('../utils/notificationService');

// Run daily at 9:00 AM — sends reminders for appointments scheduled for tomorrow
const initReminderCron = () => {
    logger.info("Initializing Appointment Reminder Cron Job (Runs daily at 9:00 AM)");

    cron.schedule('0 9 * * *', async () => {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

            const appointments = await Appointment.find({
                scheduledAt: { $gte: tomorrow, $lt: dayAfterTomorrow },
                status:      "scheduled"
            }).populate('agentId', 'name');

            if (appointments.length > 0) {
                logger.info(`Found ${appointments.length} appointments for tomorrow.`);
                for (const appt of appointments) {
                    if (appt.clientEmail && appt.agentId) {
                        await sendReturnVisitReminder(
                            appt.clientEmail,
                            appt.clientName,
                            appt.agentId.name,
                            appt.scheduledAt
                        );
                    }
                }
            }
        } catch (err) {
            logger.error("Reminder Cron Job Error", { error: err.message });
        }
    });
};

module.exports = { initReminderCron };
