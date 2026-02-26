const cron = require('node-cron');
const Patient = require('../models/Patient');
const logger = require('../utils/logger');
const { sendReturnVisitReminder } = require('../utils/notificationService');

// Run daily at 9:00 AM
const initReminderCron = () => {
    logger.info("Initializing Return Visit Reminder Cron Job (Runs daily at 9:00 AM)");

    cron.schedule('0 9 * * *', async () => {
        try {
            // Find patients whose nextVisitDate is tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

            const patientsDue = await Patient.find({
                nextVisitDate: {
                    $gte: tomorrow,
                    $lt: dayAfterTomorrow
                }
            }).populate('doctorId', 'name');

            if (patientsDue.length > 0) {
                logger.info(`Found ${patientsDue.length} patients with return visits tomorrow.`);
                for (const patient of patientsDue) {
                    if (patient.number && patient.doctorId) {
                        await sendReturnVisitReminder(
                            patient.number,
                            patient.name,
                            patient.doctorId.name,
                            patient.nextVisitDate
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
