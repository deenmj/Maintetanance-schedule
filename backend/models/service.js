const mongoose = require("mongoose");

const serviceItemSchema = new mongoose.Schema({
  component: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ["Checked", "Replaced"],
    required: true
  },
  nextCheckKm: {
    type: Number,
    required: true
  }
});

const serviceSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true
  },
  mileageAtService: {
    type: Number,
    required: true
  },
  serviceDate: {
    type: Date,
    default: Date.now
  },
  items: [serviceItemSchema],
  mechanicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
});

module.exports = mongoose.model("Service", serviceSchema);
