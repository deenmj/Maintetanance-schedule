const express = require("express");
const Appointment = require("../models/appointment");
const Vehicle = require("../models/vehicle");
const auth = require("../middleware/authMiddleware");
const ownerOnly = require("../middleware/ownerOnly");
const mechanicOnly = require("../middleware/mechanicOnly");

const router = express.Router();

/* ===============================
   POST /api/appointments
   Create a new booking (Owner only)
================================ */
router.post("/", auth, ownerOnly, async (req, res) => {
  try {
    const { vehicleNumber, preferredDate, slot, serviceType, notes } = req.body;

    if (!vehicleNumber || !preferredDate || !slot || !serviceType) {
      return res.status(400).json({ message: "All booking fields are required" });
    }

    // Verify the vehicle belongs to this owner
    const vehicle = await Vehicle.findOne({ vehicleNumber, ownerId: req.user.userId });
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found or does not belong to you" });
    }

    // Check if there's already a pending/confirmed appointment for this vehicle on the same date & slot
    const existing = await Appointment.findOne({
      vehicleNumber,
      preferredDate: new Date(preferredDate),
      slot,
      status: { $in: ["Pending", "Confirmed"] }
    });

    if (existing) {
      return res.status(400).json({ message: "An appointment already exists for this vehicle on the selected date and slot" });
    }

    const appointment = new Appointment({
      vehicleNumber,
      vehicleModel: vehicle.model || "",
      ownerId: req.user.userId,
      preferredDate: new Date(preferredDate),
      slot,
      serviceType,
      notes: notes || ""
    });

    await appointment.save();
    res.status(201).json(appointment);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create appointment" });
  }
});

/* ===============================
   GET /api/appointments/my
   Owner's appointments
================================ */
router.get("/my", auth, ownerOnly, async (req, res) => {
  try {
    const appointments = await Appointment.find({ ownerId: req.user.userId })
      .sort({ preferredDate: -1 });

    res.json(appointments);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load appointments" });
  }
});

/* ===============================
   GET /api/appointments/pending
   All pending appointments (Mechanic only)
================================ */
router.get("/pending", auth, mechanicOnly, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      status: { $in: ["Pending", "Confirmed"] }
    })
      .populate("ownerId", "name email")
      .sort({ preferredDate: 1 });

    res.json(appointments);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load appointments" });
  }
});

/* ===============================
   PUT /api/appointments/:id/status
   Update appointment status (Mechanic only)
================================ */
router.put("/:id/status", auth, mechanicOnly, async (req, res) => {
  try {
    const { status, mechanicNote } = req.body;

    if (!["Confirmed", "Completed", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.status = status;
    if (mechanicNote) {
      appointment.mechanicNote = mechanicNote;
    }

    await appointment.save();
    res.json(appointment);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update appointment" });
  }
});

/* ===============================
   GET /api/slots/available
   Simple slot availability check
================================ */
router.get("/slots/available", auth, async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Count existing appointments per slot for the given date
    const allSlots = [
      "Morning (8AM-12PM)",
      "Afternoon (12PM-4PM)",
      "Evening (4PM-7PM)"
    ];

    const MAX_PER_SLOT = 5; // Maximum appointments per slot

    const slotAvailability = [];

    for (const slot of allSlots) {
      const count = await Appointment.countDocuments({
        preferredDate: { $gte: targetDate, $lt: nextDay },
        slot,
        status: { $in: ["Pending", "Confirmed"] }
      });

      slotAvailability.push({
        slot,
        booked: count,
        max: MAX_PER_SLOT,
        available: count < MAX_PER_SLOT
      });
    }

    res.json(slotAvailability);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to check slot availability" });
  }
});

module.exports = router;
