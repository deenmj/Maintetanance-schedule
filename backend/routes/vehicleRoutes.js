const express = require("express");
const Vehicle = require("../models/vehicle");
const auth = require("../middleware/authMiddleware");
const mechanicOnly = require("../middleware/mechanicOnly");

const router = express.Router();

router.post("/", auth, mechanicOnly, async (req, res) => {
  try {
    const { vehicleNumber, model, year, mileage } = req.body;

    const exists = await Vehicle.findOne({ vehicleNumber });
    if (exists) {
      return res.status(400).json({ message: "Vehicle already exists" });
    }

    const vehicle = new Vehicle({
      vehicleNumber,
      model,
      year,
      mileage,
      ownerId: req.user.userId
    });

    await vehicle.save();
    res.status(201).json(vehicle);

  } catch (err) {
    res.status(500).json({ message: "Failed to add vehicle" });
  }
});

module.exports = router;
