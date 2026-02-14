const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true,
    unique: true
  },
  model: String,
  year: Number,
  mileage: {
    type: Number,
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
});

module.exports = mongoose.model("Vehicle", vehicleSchema);
