const express = require("express");
const bcrypt = require("bcryptjs");
const Vehicle = require("../models/vehicle");
const User = require("../models/user");
const auth = require("../middleware/authMiddleware");
const mechanicOnly = require("../middleware/mechanicOnly");

const router = express.Router();

router.post("/", auth, mechanicOnly, async (req, res) => {
  try {
    const { vehicleNumber, model, year, mileage, ownerName, ownerEmail, ownerPassword } = req.body;

    const exists = await Vehicle.findOne({ vehicleNumber });
    if (exists) {
      return res.status(400).json({ message: "Vehicle already exists" });
    }

    // Require owner details
    if (!ownerName || !ownerEmail || !ownerPassword) {
      return res.status(400).json({ message: "Owner name, email, and password are required" });
    }

    // Find or Create Owner
    let owner = await User.findOne({ email: ownerEmail });
    if (!owner) {
      const hashedPassword = await bcrypt.hash(ownerPassword, 10);
      owner = new User({
        name: ownerName,
        email: ownerEmail,
        password: hashedPassword,
        role: "owner"
      });
      await owner.save();
    }

    const vehicle = new Vehicle({
      vehicleNumber,
      model,
      year,
      mileage,
      ownerId: owner._id
    });

    await vehicle.save();
    res.status(201).json({ vehicle, owner });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add vehicle" });
  }
});

module.exports = router;
