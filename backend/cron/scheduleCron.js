const cron = require('node-cron');
const User = require('../models/User');
const logger = require('../utils/logger');

// Run every 15 minutes — auto-updates agent availability based on their schedule
const initScheduleCron = () => {
    logger.info("Initializing Agent Schedule Cron Job (Runs every 15m)");

    cron.schedule('*/15 * * * *', async () => {
        try {
            // Include both new role (AGENT) and legacy role (DOCTOR) for backward compat
            const agents = await User.find({
                role:          { $in: ['AGENT', 'DOCTOR'] },
                "schedule.0": { $exists: true }
            });

            const now = new Date();
            const currentDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const currentDay  = currentDayNames[now.getDay()];
            const currentHour = now.getHours().toString().padStart(2, '0');
            const currentMin  = now.getMinutes().toString().padStart(2, '0');
            const currentTime = `${currentHour}:${currentMin}`;

            for (const agent of agents) {
                const todaySchedule = agent.schedule.find(s => s.day === currentDay);
                let shouldBeAvailable = false;

                if (todaySchedule?.startTime && todaySchedule?.endTime) {
                    if (currentTime >= todaySchedule.startTime && currentTime <= todaySchedule.endTime) {
                        shouldBeAvailable = true;
                    }
                }

                // New enum value is "Unavailable"; keep "Not Available" for legacy records
                const desiredStatus = shouldBeAvailable ? "Available" : "Unavailable";
                const legacyDesired = shouldBeAvailable ? "Available" : "Not Available";

                const isAlreadyCorrect =
                    agent.availability === desiredStatus ||
                    agent.availability === legacyDesired;

                const isOnBreak = agent.availability === "Break" || agent.availability === "On Break";

                if (!isAlreadyCorrect && !isOnBreak) {
                    agent.availability = desiredStatus;
                    await agent.save();
                    logger.info(`Cron: Updated agent ${agent.name} availability to ${desiredStatus}`);

                    if (global.io) {
                        global.io.to(`agent_${agent._id}`).emit("agent.status_changed", {
                            agentId:      agent._id,
                            availability: desiredStatus
                        });
                        if (agent.organizationId) {
                            global.io.to(`org_${agent.organizationId}`).emit("agent.status_changed", {
                                agentId:      agent._id,
                                availability: desiredStatus
                            });
                        }
                    }
                }
            }
        } catch (err) {
            logger.error("Schedule Cron Job Error", { error: err.message });
        }
    });
};

module.exports = { initScheduleCron };
