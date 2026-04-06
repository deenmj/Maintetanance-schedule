/**
 * ═══════════════════════════════════════════════════
 *  ABC Fleet Maintenance – Database Seed Script
 * ═══════════════════════════════════════════════════
 *
 *  Creates demo users, vehicles, and service records
 *  (with realistic costs) so the application has data.
 *
 *  Usage:  node seed.js
 * ═══════════════════════════════════════════════════
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/user");
const Vehicle = require("./models/vehicle");
const Service = require("./models/service");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/vehicle-maintenance";

async function seed() {
  console.log("\n🌱  Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected!\n");

  /* ── CLEAR EXISTING DATA ── */
  await User.deleteMany({});
  await Vehicle.deleteMany({});
  await Service.deleteMany({});
  console.log("🗑️   Cleared existing data");

  /* ══════════════════════════════════════
     1. USERS
  ══════════════════════════════════════ */
  const hashedPass = await bcrypt.hash("pass123", 10);

  const owner1 = await User.create({
    name: "Ahmed Al-Balushi",
    email: "ahmed@abc.com",
    password: hashedPass,
    role: "owner"
  });

  const owner2 = await User.create({
    name: "Fatima Al-Hinai",
    email: "fatima@abc.com",
    password: hashedPass,
    role: "owner"
  });

  const mechanic1 = await User.create({
    name: "Ravi Kumar",
    email: "ravi@abc.com",
    password: hashedPass,
    role: "mechanic"
  });

  const mechanic2 = await User.create({
    name: "Carlos Santos",
    email: "carlos@abc.com",
    password: hashedPass,
    role: "mechanic"
  });

  console.log("👤  Created 4 users (2 owners, 2 mechanics)");

  /* ══════════════════════════════════════
     2. VEHICLES
  ══════════════════════════════════════ */
  const vehicles = await Vehicle.insertMany([
    { vehicleNumber: "BGT 2987",  model: "Toyota Camry 2.5",       year: 2022, mileage: 48500,  ownerId: owner1._id },
    { vehicleNumber: "MNR 4521",  model: "Nissan Patrol V8",       year: 2021, mileage: 72300,  ownerId: owner1._id },
    { vehicleNumber: "KLX 1100",  model: "Kia Sportage",           year: 2023, mileage: 22800,  ownerId: owner2._id },
    { vehicleNumber: "RYD 7788",  model: "Hyundai Tucson",         year: 2022, mileage: 38600,  ownerId: owner2._id },
    { vehicleNumber: "ABC 0001",  model: "Toyota Land Cruiser 300", year: 2024, mileage: 12000, ownerId: owner1._id },
  ]);

  console.log(`🚗  Created ${vehicles.length} vehicles`);

  /* ══════════════════════════════════════
     3. SERVICE RECORDS (with costs in LKR)
  ══════════════════════════════════════ */

  // ── BGT 2987 – Service 1 (older) ──
  await Service.create({
    vehicleNumber: "BGT 2987",
    mileageAtService: 40000,
    serviceDate: new Date("2025-08-15"),
    mechanicId: mechanic1._id,
    laborCost: 25,
    items: [
      { component: "Engine Oil & Oil Filter",     action: "Replaced",  nextCheckKm: 45000, partCost: 18 },
      { component: "Brake Pads & Discs",           action: "Checked",   nextCheckKm: 55000, partCost: 0 },
      { component: "Air Filter",                   action: "Replaced",  nextCheckKm: 50000, partCost: 8 },
      { component: "Battery & Charging System",    action: "Checked",   nextCheckKm: 60000, partCost: 0 },
    ]
  });

  // ── BGT 2987 – Service 2 (latest) ──
  await Service.create({
    vehicleNumber: "BGT 2987",
    mileageAtService: 45000,
    serviceDate: new Date("2026-01-20"),
    mechanicId: mechanic1._id,
    laborCost: 35,
    items: [
      { component: "Engine Oil & Oil Filter",     action: "Replaced",  nextCheckKm: 50000, partCost: 18 },
      { component: "Brake Pads & Discs",           action: "Checked",   nextCheckKm: 55000, partCost: 0 },
      { component: "Tyres & Wheel Alignment",      action: "Checked",   nextCheckKm: 48000, partCost: 0 },
      { component: "Radiator Coolant & Hoses",     action: "Replaced",  nextCheckKm: 60000, partCost: 12 },
      { component: "Fuel Filter",                  action: "Replaced",  nextCheckKm: 55000, partCost: 6 },
      { component: "Spark Plugs / Glow Plugs",     action: "Checked",   nextCheckKm: 49000, partCost: 0 },
    ]
  });

  // ── MNR 4521 – Service ──
  await Service.create({
    vehicleNumber: "MNR 4521",
    mileageAtService: 70000,
    serviceDate: new Date("2026-02-10"),
    mechanicId: mechanic2._id,
    laborCost: 45,
    items: [
      { component: "Engine Oil & Oil Filter",     action: "Replaced",  nextCheckKm: 75000, partCost: 22 },
      { component: "Brake Pads & Discs",           action: "Replaced",  nextCheckKm: 90000, partCost: 65 },
      { component: "Brake Fluid",                  action: "Replaced",  nextCheckKm: 80000, partCost: 8 },
      { component: "Gearbox / Transmission Oil",   action: "Checked",   nextCheckKm: 85000, partCost: 0 },
      { component: "Battery & Charging System",    action: "Replaced",  nextCheckKm: 100000, partCost: 45 },
    ]
  });

  // ── KLX 1100 – Service ──
  await Service.create({
    vehicleNumber: "KLX 1100",
    mileageAtService: 20000,
    serviceDate: new Date("2026-03-05"),
    mechanicId: mechanic1._id,
    laborCost: 20,
    items: [
      { component: "Engine Oil & Oil Filter",     action: "Replaced",  nextCheckKm: 25000, partCost: 16 },
      { component: "Air Filter",                   action: "Checked",   nextCheckKm: 30000, partCost: 0 },
      { component: "Tyres & Wheel Alignment",      action: "Checked",   nextCheckKm: 22000, partCost: 0 },
      { component: "Clutch System",                action: "Checked",   nextCheckKm: 40000, partCost: 0 },
    ]
  });

  // ── RYD 7788 – Service ──
  await Service.create({
    vehicleNumber: "RYD 7788",
    mileageAtService: 35000,
    serviceDate: new Date("2025-12-01"),
    mechanicId: mechanic2._id,
    laborCost: 30,
    items: [
      { component: "Engine Oil & Oil Filter",     action: "Replaced",  nextCheckKm: 40000, partCost: 18 },
      { component: "Brake Pads & Discs",           action: "Checked",   nextCheckKm: 38000, partCost: 0 },
      { component: "Radiator Coolant & Hoses",     action: "Checked",   nextCheckKm: 45000, partCost: 0 },
      { component: "Fuel Filter",                  action: "Replaced",  nextCheckKm: 45000, partCost: 6 },
      { component: "Spark Plugs / Glow Plugs",     action: "Replaced",  nextCheckKm: 50000, partCost: 14 },
    ]
  });

  console.log("🔧  Created 5 service records with costs across multiple vehicles\n");

  /* ── SUMMARY ── */
  console.log("═══════════════════════════════════════════════");
  console.log("  🎉  SEED COMPLETE!  ");
  console.log("═══════════════════════════════════════════════");
  console.log("");
  console.log("  DEMO ACCOUNTS:");
  console.log("  ┌──────────────────────────────────────────┐");
  console.log("  │  Owner:     ahmed@abc.com   / pass123    │");
  console.log("  │  Owner:     fatima@abc.com  / pass123    │");
  console.log("  │  Mechanic:  ravi@abc.com    / pass123    │");
  console.log("  │  Mechanic:  carlos@abc.com  / pass123    │");
  console.log("  └──────────────────────────────────────────┘");
  console.log("");
  console.log("  TEST VEHICLES:");
  console.log("  • BGT 2987  (Toyota Camry)       – 2 service records");
  console.log("  • MNR 4521  (Nissan Patrol)      – 1 service record");
  console.log("  • KLX 1100  (Kia Sportage)       – 1 service record");
  console.log("  • RYD 7788  (Hyundai Tucson)     – 1 service record");
  console.log("  • ABC 0001  (Land Cruiser 300)   – 0 records (new)");
  console.log("");

  await mongoose.disconnect();
  console.log("✅  Database connection closed.\n");
}

seed().catch(err => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
