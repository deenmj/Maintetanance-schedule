const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true
  },
  vehicleModel: {
    type: String,
    default: ""
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  preferredDate: {
    type: Date,
    required: true
  },
  slot: {
    type: String,
    enum: ["Morning (8AM-12PM)", "Afternoon (12PM-4PM)", "Evening (4PM-7PM)"],
    required: true
  },
  serviceType: {
    type: String,
    enum: [
      "General Service",
      "Oil Change",
      "Brake Service",
      "Tyre Service",
      "Battery Replacement",
      "AC Service",
      "Engine Tune-Up",
      "Full Inspection",
      "Other"
    ],
    required: true
  },
  notes: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Completed", "Rejected"],
    default: "Pending"
  },
  mechanicNote: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Appointment", appointmentSchema);
