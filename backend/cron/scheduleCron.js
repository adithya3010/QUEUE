const cron = require('node-cron');
const User = require('../models/User');
const logger = require('../utils/logger');

// Run every 15 minutes
const initScheduleCron = () => {
    logger.info("Initializing Doctor Schedule Cron Job (Runs every 15m)");

    cron.schedule('*/15 * * * *', async () => {
        try {
            const doctors = await User.find({ role: 'DOCTOR', "schedule.0": { $exists: true } });

            const now = new Date();
            const currentDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const currentDay = currentDayNames[now.getDay()];

            // Format current time as HH:MM
            const currentHour = now.getHours().toString().padStart(2, '0');
            const currentMin = now.getMinutes().toString().padStart(2, '0');
            const currentTime = `${currentHour}:${currentMin}`;

            for (const doc of doctors) {
                // Find today's schedule
                const todaySchedule = doc.schedule.find(s => s.day === currentDay);

                let shouldBeAvailable = false;

                if (todaySchedule && todaySchedule.startTime && todaySchedule.endTime) {
                    if (currentTime >= todaySchedule.startTime && currentTime <= todaySchedule.endTime) {
                        shouldBeAvailable = true;
                    }
                }

                const desiredStatus = shouldBeAvailable ? "Available" : "Not Available";

                if (doc.availability !== desiredStatus && doc.availability !== "On Break") {
                    doc.availability = desiredStatus;
                    await doc.save();
                    logger.info(`Cron: Updated Dr. ${doc.name} availability to ${desiredStatus}`);

                    // Fire socket event if available
                    // This is optional since they will see it when they log in 
                    // and patients will naturally just be blocked if Not Available
                }
            }
        } catch (err) {
            logger.error("Schedule Cron Job Error", { error: err.message });
        }
    });
};

module.exports = { initScheduleCron };
