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
  },
  partCost: {
    type: Number,
    default: 0
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
  laborCost: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  mechanicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
});

// Pre-save hook to auto-calculate totalCost
serviceSchema.pre("save", function (next) {
  const partsCost = this.items.reduce((sum, item) => sum + (item.partCost || 0), 0);
  this.totalCost = partsCost + (this.laborCost || 0);
  next();
});

module.exports = mongoose.model("Service", serviceSchema);
