/**
 * Slot generation utility for appointment booking.
 * Generates time slots based on doctor's schedule and avgConsultationTime,
 * removing already booked ones.
 */

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Get the day name for a given date string (YYYY-MM-DD)
 */
function getDayName(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return DAYS[d.getDay()];
}

/**
 * Parse "HH:MM" (24h) into a Date on the given date string
 */
function parseTime(timeStr, dateStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const d = new Date(dateStr + "T00:00:00");
    d.setHours(hours, minutes, 0, 0);
    return d;
}

/**
 * Add minutes to a Date and return a new Date
 */
function addMinutes(date, mins) {
    return new Date(date.getTime() + mins * 60 * 1000);
}

/**
 * Format a Date to "HH:MM" 24h string
 */
function formatTimeStr(date) {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
}

/**
 * Generate available time slots for a doctor on a given date.
 *
 * @param {Object} doctor - User document with schedule[] and avgConsultationTime
 * @param {string} dateStr - Date in "YYYY-MM-DD" format
 * @param {string[]} bookedSlots - Already booked "HH:MM" slots for that day
 * @returns {{ time: string, label: string }[]} - Available slots
 */
function generateSlots(doctor, dateStr, bookedSlots = []) {
    const dayName = getDayName(dateStr);

    // Default schedule if doctor hasn't configured their hours
    const DEFAULT_SCHEDULE = [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
    ].map(day => ({ day, startTime: "09:00", endTime: "17:00" }));

    const scheduleList = (doctor.schedule && doctor.schedule.length > 0)
        ? doctor.schedule
        : DEFAULT_SCHEDULE;

    const schedule = scheduleList.find(s => s.day === dayName);

    if (!schedule || !schedule.startTime || !schedule.endTime) {
        return []; // Doctor not working that day (e.g. Sunday)
    }

    const stepMins = doctor.avgConsultationTime || 10;
    const now = new Date();
    const slots = [];

    let current = parseTime(schedule.startTime, dateStr);
    const end = parseTime(schedule.endTime, dateStr);

    while (current < end) {
        const timeStr = formatTimeStr(current);

        const isBooked = bookedSlots.includes(timeStr);
        const isPast = current <= now;

        if (!isBooked && !isPast) {
            // Human-readable label e.g. "9:00 AM"
            const label = current.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            });
            slots.push({ time: timeStr, label });
        }

        current = addMinutes(current, stepMins);
    }

    return slots;
}

module.exports = { generateSlots, getDayName, formatTimeStr };
