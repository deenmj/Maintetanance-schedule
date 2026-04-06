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
    const { vehicleNumber, mileageAtService, items, laborCost } = req.body;

    if (!vehicleNumber || !mileageAtService || !items || !items.length) {
      return res.status(400).json({ message: "Missing service data" });
    }

    const service = new Service({
      vehicleNumber,
      mileageAtService,
      items,
      laborCost: laborCost || 0,
      mechanicId: req.user.userId
    });

    await service.save();  // pre-save hook calculates totalCost
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
   VEHICLE COST SUMMARY
   (lifetime cost tracking)
================================ */
router.get("/costs/:vehicleNumber", auth, async (req, res) => {
  try {
    const vehicleNumber = req.params.vehicleNumber;
    const services = await Service.find({ vehicleNumber }).sort({ serviceDate: -1 });

    if (!services.length) {
      return res.json({
        vehicleNumber,
        totalLifetimeCost: 0,
        totalPartsCost: 0,
        totalLaborCost: 0,
        serviceCount: 0,
        costByService: []
      });
    }

    let totalLifetimeCost = 0;
    let totalPartsCost = 0;
    let totalLaborCost = 0;

    const costByService = services.map(s => {
      const partsCost = s.items.reduce((sum, i) => sum + (i.partCost || 0), 0);
      totalPartsCost += partsCost;
      totalLaborCost += (s.laborCost || 0);
      totalLifetimeCost += (s.totalCost || 0);

      return {
        serviceDate: s.serviceDate,
        mileageAtService: s.mileageAtService,
        partsCost,
        laborCost: s.laborCost || 0,
        totalCost: s.totalCost || 0,
        itemCount: s.items.length
      };
    });

    res.json({
      vehicleNumber,
      totalLifetimeCost,
      totalPartsCost,
      totalLaborCost,
      serviceCount: services.length,
      costByService
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load cost summary" });
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
