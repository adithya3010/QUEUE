const router = require("express").Router();
const Doctor = require("../models/Doctor");
const { auth } = require("../middleware/authMiddleware");
router.get("/info", auth, async (req, res) => {
  const doctors = await Doctor.findById(req.doctorId);
  res.json(doctors);
});


router.put("/availability", auth, async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.doctorId,
      { availability: req.body.availability },
      { new: true }
    );

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    global.io.to(req.doctorId.toString()).emit(
      "doctorAvailabilityChanged",
      doctor.availability
    );
    global.io.to(req.doctorId.toString()).emit("queueUpdated");

    res.json(doctor);
  } catch (err) {
    console.error("Availability Update Error", err);
    res.status(500).json({ message: "Server error" });
  }
});


router.put("/update-avg-time", auth, async (req, res) => {
  try {
    const doctorId = req.doctorId;
    const { avgTime } = req.body;

    if (!avgTime || avgTime <= 0)
      return res.status(400).json({ message: "Invalid time" });

    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      { avgConsultationTime: avgTime },
      { new: true }
    );
    global.io.to(doctorId.toString()).emit("queueUpdated");
    res.json({ message: "Updated Successfully", doctor });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
});


module.exports = router;
