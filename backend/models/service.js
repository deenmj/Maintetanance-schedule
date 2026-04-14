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
  },
  // New fields for service reminder system
  nextServiceKm: {
    type: Number,
    default: 0
  },
  nextServiceDate: {
    type: Date
  }
});

// Pre-save hook to auto-calculate totalCost + nextService fields
serviceSchema.pre("save", function (next) {
  const partsCost = this.items.reduce((sum, item) => sum + (item.partCost || 0), 0);
  this.totalCost = partsCost + (this.laborCost || 0);

  // Auto-calculate nextServiceKm (smallest nextCheckKm from items)
  if (this.items.length > 0) {
    const minNextKm = Math.min(...this.items.map(i => i.nextCheckKm));
    this.nextServiceKm = minNextKm;
  }

  // Auto-calculate nextServiceDate (6 months from service date)
  if (!this.nextServiceDate) {
    const sDate = this.serviceDate || new Date();
    const next = new Date(sDate);
    next.setMonth(next.getMonth() + 6);
    this.nextServiceDate = next;
  }

  next();
});

module.exports = mongoose.model("Service", serviceSchema);
