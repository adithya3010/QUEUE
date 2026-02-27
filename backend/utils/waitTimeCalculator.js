/**
 * Calculates estimated waiting times for queue entries.
 * Based on:
 *  - queue position
 *  - agent's avg session duration (minutes)
 *  - agent availability state
 */

function calculateWaitTimes(queue, agent) {
  // Support both new field name (avgSessionDuration) and legacy (avgConsultationTime)
  const avgTime      = agent?.avgSessionDuration || agent?.avgConsultationTime || 8;
  const availability = agent?.availability || "Available";

  return queue.map((entry, index) => {
    // "Unavailable" is the new value; keep "Not Available" check for legacy data
    if (availability === "Unavailable" || availability === "Not Available") {
      return {
        ...entry.toObject(),
        waitMinutes: null,
        etaTime:     null,
        message:     "Agent is currently unavailable"
      };
    }

    // Agent on break
    if (availability === "Break") {
      return {
        ...entry.toObject(),
        waitMinutes: null,
        etaTime:     null,
        message:     "Agent is on break – please wait"
      };
    }

    // Normal calculation
    const waitMinutes = index * avgTime;
    const eta         = new Date(Date.now() + waitMinutes * 60000);

    return {
      ...entry.toObject(),
      waitMinutes,
      etaTime:    eta,
      isTopThree: index < 3
    };
  });
}

module.exports = { calculateWaitTimes };
