const router = require("express").Router();
const User = require("../models/User");
const { auth } = require("../middleware/authMiddleware");

// GET - Doctor info
router.get("/info", auth, async (req, res) => {
  try {
    const doctor = await User.findOne({ _id: req.user.id, role: "DOCTOR" }).select("-password -refreshToken");
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT - Update availability + optional pause message
router.put("/availability", auth, async (req, res) => {
  try {
    const { availability, pauseMessage } = req.body;

    const updatePayload = { availability };
    // Clear the message when going back to Available; set it when pausing
    if (availability === "Not Available" && pauseMessage) {
      updatePayload.pauseMessage = pauseMessage.trim().slice(0, 200);
    } else {
      updatePayload.pauseMessage = "";
    }

    const doctor = await User.findOneAndUpdate(
      { _id: req.user.id, role: "DOCTOR" },
      updatePayload,
      { new: true }
    );

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    if (global.io) {
      global.io.to(req.user.id.toString()).emit("doctorAvailabilityChanged", {
        availability: doctor.availability,
        pauseMessage: doctor.pauseMessage
      });
      global.io.to(`doctor_public_${req.user.id.toString()}`).emit("doctorAvailabilityChanged", {
        availability: doctor.availability,
        pauseMessage: doctor.pauseMessage
      });
      if (doctor.hospitalId) {
        global.io.to(`hospital_public_${doctor.hospitalId.toString()}`).emit("doctorAvailabilityChanged", {
          availability: doctor.availability,
          pauseMessage: doctor.pauseMessage
        });
      }

      global.io.to(req.user.id.toString()).emit("queueUpdated");
      global.io.to(`doctor_public_${req.user.id.toString()}`).emit("queueUpdated");
      if (doctor.hospitalId) {
        global.io.to(`hospital_public_${doctor.hospitalId.toString()}`).emit("queueUpdated");
      }
    }

    res.json(doctor);
  } catch (err) {
    console.error("Availability Update Error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT - Update average consultation time
router.put("/update-avg-time", auth, async (req, res) => {
  try {
    const { avgTime } = req.body;

    if (!avgTime || avgTime <= 0)
      return res.status(400).json({ message: "Invalid time" });

    const doctor = await User.findOneAndUpdate(
      { _id: req.user.id, role: "DOCTOR" },
      { avgConsultationTime: avgTime },
      { new: true }
    );

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    if (global.io) {
      global.io.to(req.user.id.toString()).emit("queueUpdated");
      global.io.to(`doctor_public_${req.user.id.toString()}`).emit("queueUpdated");
      if (doctor.hospitalId) {
        global.io.to(`hospital_public_${doctor.hospitalId.toString()}`).emit("queueUpdated");
      }
    }

    res.json({ message: "Updated Successfully", doctor });
  } catch (err) {
    console.error("Update avg time error", err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
