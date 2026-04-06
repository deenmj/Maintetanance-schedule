const express = require("express");
const Service = require("../models/service");
const auth = require("../middleware/authMiddleware");
const mechanicOnly = require("../middleware/mechanicOnly");

const router = express.Router();

/* ===============================
   ADD SERVICE (MECHANIC ONLY)
================================ */
router.post("/", auth, mechanicOnly, async (req, res) => {
  try {
    const { vehicleNumber, mileageAtService, items } = req.body;

    if (!vehicleNumber || !mileageAtService || !items || !items.length) {
      return res.status(400).json({ message: "Missing service data" });
    }

    const service = new Service({
      vehicleNumber,
      mileageAtService,
      items,
      mechanicId: req.user.userId
    });

    await service.save();
    res.status(201).json(service);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save service" });
  }
});

/* ===============================
   MECHANIC SERVICE HISTORY
   (returns services logged by
    the authenticated mechanic)
================================ */
router.get("/mechanic/history", auth, mechanicOnly, async (req, res) => {
  try {
    const query = { mechanicId: req.user.userId };

    // Optional vehicle number filter
    if (req.query.vehicleNumber) {
      query.vehicleNumber = { $regex: req.query.vehicleNumber, $options: "i" };
    }

    const services = await Service.find(query)
      .sort({ serviceDate: -1 })
      .populate("mechanicId", "name");

    res.json(services);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load mechanic history" });
  }
});

/* ===============================
   GET SERVICE HISTORY (OWNER)
================================ */
router.get("/:vehicleNumber", auth, async (req, res) => {
  try {
    const vehicleNumber = req.params.vehicleNumber;

    const services = await Service.find({ vehicleNumber })
      .sort({ serviceDate: -1 })
      .populate("mechanicId", "name");

    res.json(services);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load services" });
  }
});

module.exports = router;
