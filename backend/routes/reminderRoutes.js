const express = require("express");
const Service = require("../models/service");
const Vehicle = require("../models/vehicle");
const User = require("../models/user");
const auth = require("../middleware/authMiddleware");
const ownerOnly = require("../middleware/ownerOnly");
const mechanicOnly = require("../middleware/mechanicOnly");
const nodemailer = require("nodemailer");

const router = express.Router();

/* ===============================
   GET /api/reminders/all
   ALL vehicles with reminders (Mechanic only)
================================ */
router.get("/all", auth, mechanicOnly, async (req, res) => {
  try {
    const vehicles = await Vehicle.find().populate("ownerId", "name email");

    if (!vehicles.length) {
      return res.json([]);
    }

    const reminders = [];

    for (const vehicle of vehicles) {
      const latestService = await Service.findOne({ vehicleNumber: vehicle.vehicleNumber })
        .sort({ serviceDate: -1 });

      const ownerName = vehicle.ownerId && vehicle.ownerId.name ? vehicle.ownerId.name : "Unknown";
      const ownerEmail = vehicle.ownerId && vehicle.ownerId.email ? vehicle.ownerId.email : "";

      const reminder = {
        vehicleNumber: vehicle.vehicleNumber,
        model: vehicle.model,
        year: vehicle.year,
        currentMileage: vehicle.mileage,
        ownerName,
        ownerEmail,
        ownerId: vehicle.ownerId ? vehicle.ownerId._id : null,
        lastServiceDate: null,
        lastServiceMileage: null,
        nextServiceKm: null,
        nextServiceDate: null,
        kmRemaining: null,
        daysRemaining: null,
        status: "no-records",
        reminderSent: false,
        components: []
      };

      if (latestService) {
        reminder.lastServiceDate = latestService.serviceDate;
        reminder.lastServiceMileage = latestService.mileageAtService;
        reminder.nextServiceKm = latestService.nextServiceKm;
        reminder.nextServiceDate = latestService.nextServiceDate;
        reminder.reminderSent = latestService.reminderSent || false;

        if (latestService.nextServiceKm) {
          reminder.kmRemaining = latestService.nextServiceKm - vehicle.mileage;
        }

        if (latestService.nextServiceDate) {
          const now = new Date();
          const nextDate = new Date(latestService.nextServiceDate);
          const diffMs = nextDate - now;
          reminder.daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        }

        if (reminder.kmRemaining !== null && reminder.kmRemaining < 0) {
          reminder.status = "overdue";
        } else if (reminder.daysRemaining !== null && reminder.daysRemaining < 0) {
          reminder.status = "overdue";
        } else if (
          (reminder.kmRemaining !== null && reminder.kmRemaining <= 1000) ||
          (reminder.daysRemaining !== null && reminder.daysRemaining <= 30)
        ) {
          reminder.status = "due-soon";
        } else {
          reminder.status = "good";
        }

        reminder.components = latestService.items.map(item => ({
          component: item.component,
          action: item.action,
          nextCheckKm: item.nextCheckKm,
          kmRemaining: item.nextCheckKm - vehicle.mileage,
          status: (item.nextCheckKm - vehicle.mileage) < 0
            ? "overdue"
            : (item.nextCheckKm - vehicle.mileage) <= 1000
              ? "due-soon"
              : "good"
        }));
      }

      reminders.push(reminder);
    }

    res.json(reminders);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load reminders" });
  }
});

/* ===============================
   GET /api/reminders/my
   Owner's own vehicle reminders
================================ */
router.get("/my", auth, ownerOnly, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ ownerId: req.user.userId });

    if (!vehicles.length) {
      return res.json([]);
    }

    const reminders = [];

    for (const vehicle of vehicles) {
      const latestService = await Service.findOne({ vehicleNumber: vehicle.vehicleNumber })
        .sort({ serviceDate: -1 });

      const reminder = {
        vehicleNumber: vehicle.vehicleNumber,
        model: vehicle.model,
        year: vehicle.year,
        currentMileage: vehicle.mileage,
        lastServiceDate: null,
        lastServiceMileage: null,
        nextServiceKm: null,
        nextServiceDate: null,
        kmRemaining: null,
        daysRemaining: null,
        status: "no-records",
        components: []
      };

      if (latestService) {
        reminder.lastServiceDate = latestService.serviceDate;
        reminder.lastServiceMileage = latestService.mileageAtService;
        reminder.nextServiceKm = latestService.nextServiceKm;
        reminder.nextServiceDate = latestService.nextServiceDate;

        if (latestService.nextServiceKm) {
          reminder.kmRemaining = latestService.nextServiceKm - vehicle.mileage;
        }

        if (latestService.nextServiceDate) {
          const now = new Date();
          const nextDate = new Date(latestService.nextServiceDate);
          const diffMs = nextDate - now;
          reminder.daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        }

        if (reminder.kmRemaining !== null && reminder.kmRemaining < 0) {
          reminder.status = "overdue";
        } else if (reminder.daysRemaining !== null && reminder.daysRemaining < 0) {
          reminder.status = "overdue";
        } else if (
          (reminder.kmRemaining !== null && reminder.kmRemaining <= 1000) ||
          (reminder.daysRemaining !== null && reminder.daysRemaining <= 30)
        ) {
          reminder.status = "due-soon";
        } else {
          reminder.status = "good";
        }

        reminder.components = latestService.items.map(item => ({
          component: item.component,
          action: item.action,
          nextCheckKm: item.nextCheckKm,
          kmRemaining: item.nextCheckKm - vehicle.mileage,
          status: (item.nextCheckKm - vehicle.mileage) < 0
            ? "overdue"
            : (item.nextCheckKm - vehicle.mileage) <= 1000
              ? "due-soon"
              : "good"
        }));
      }

      reminders.push(reminder);
    }

    res.json(reminders);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load reminders" });
  }
});

/* ===============================
   POST /api/reminders/send/:vehicleNumber
   Send email reminder (MECHANIC ONLY)
================================ */
router.post("/send/:vehicleNumber", auth, mechanicOnly, async (req, res) => {
  try {
    const { vehicleNumber } = req.params;

    // Get vehicle with owner info
    const vehicle = await Vehicle.findOne({ vehicleNumber }).populate("ownerId", "name email");
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const owner = vehicle.ownerId;
    if (!owner) {
      return res.status(404).json({ message: "Vehicle owner not found" });
    }

    // Get the latest service
    const latestService = await Service.findOne({ vehicleNumber })
      .sort({ serviceDate: -1 });

    if (!latestService) {
      return res.status(404).json({ message: "No service records found for this vehicle" });
    }

    // Calculate reminder details
    const kmRemaining = latestService.nextServiceKm
      ? latestService.nextServiceKm - vehicle.mileage
      : null;

    const nextDateStr = latestService.nextServiceDate
      ? new Date(latestService.nextServiceDate).toLocaleDateString("en-GB", {
          day: "numeric", month: "long", year: "numeric"
        })
      : "Not set";

    let statusText = "On Track";
    let statusColor = "#34d399";
    if (kmRemaining !== null && kmRemaining < 0) {
      statusText = "OVERDUE";
      statusColor = "#fb7185";
    } else if (kmRemaining !== null && kmRemaining <= 1000) {
      statusText = "Due Soon";
      statusColor = "#fbbf24";
    }

    // Build component rows for the email
    let componentRows = "";
    latestService.items.forEach(item => {
      const itemKmLeft = item.nextCheckKm - vehicle.mileage;
      let itemStatus = "✅ Good";
      let itemColor = "#34d399";
      if (itemKmLeft < 0) {
        itemStatus = "🔴 Overdue";
        itemColor = "#fb7185";
      } else if (itemKmLeft <= 1000) {
        itemStatus = "🟡 Due Soon";
        itemColor = "#fbbf24";
      }
      componentRows += `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #eee;">${item.component}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #eee; text-align: center;">${item.nextCheckKm.toLocaleString()} km</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #eee; text-align: center; color: ${itemColor}; font-weight: 600;">${itemStatus}</td>
        </tr>
      `;
    });

    // Professional HTML email
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 0;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px; text-align: center;">
          <h1 style="color: #38bdf8; margin: 0; font-size: 24px;">🔧 ABC Fleet Maintenance</h1>
          <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Vehicle Service Reminder</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px; background: white;">
          <p style="color: #334155; font-size: 16px; margin: 0 0 24px;">
            Hello <strong>${owner.name}</strong>,
          </p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
            This is a friendly reminder from <strong>ABC Fleet Maintenance</strong> about an upcoming service for your vehicle. Please review the details below and schedule your appointment at your earliest convenience.
          </p>

          <!-- Vehicle Info Card -->
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #0f172a; margin: 0 0 12px; font-size: 16px;">📌 Vehicle Details</h3>
            <table style="width: 100%; font-size: 14px; color: #334155;">
              <tr>
                <td style="padding: 4px 0; font-weight: 600; width: 40%;">Vehicle:</td>
                <td>${vehicle.vehicleNumber} — ${vehicle.model}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: 600;">Current Mileage:</td>
                <td>${vehicle.mileage.toLocaleString()} km</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: 600;">Next Service At:</td>
                <td>${latestService.nextServiceKm ? latestService.nextServiceKm.toLocaleString() + ' km' : 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: 600;">Next Service Date:</td>
                <td>${nextDateStr}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: 600;">Status:</td>
                <td style="color: ${statusColor}; font-weight: 700;">${statusText}${kmRemaining !== null ? ' (' + (kmRemaining < 0 ? 'Overdue by ' + Math.abs(kmRemaining).toLocaleString() : kmRemaining.toLocaleString() + ' km remaining') + ')' : ''}</td>
              </tr>
            </table>
          </div>

          <!-- Component Breakdown -->
          <h3 style="color: #0f172a; margin: 0 0 12px; font-size: 16px;">🔩 Component Status</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 10px 12px; text-align: left; color: #475569; font-weight: 600;">Component</th>
                <th style="padding: 10px 12px; text-align: center; color: #475569; font-weight: 600;">Next Check</th>
                <th style="padding: 10px 12px; text-align: center; color: #475569; font-weight: 600;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${componentRows}
            </tbody>
          </table>

          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
            Please book a service appointment through our system or contact us directly to keep your vehicle running safely.
          </p>

          <!-- CTA -->
          <div style="text-align: center; margin: 32px 0;">
            <p style="color: #94a3b8; font-size: 12px;">Log in to your dashboard to book an appointment</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} ABC Fleet Maintenance · Sent by mechanic on your behalf
          </p>
        </div>
      </div>
    `;

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log("⚠️  Email not configured. Set EMAIL_USER and EMAIL_PASS in .env");
      console.log("📧 Email would have been sent to:", owner.email);

      // Mark reminder as sent even in preview mode
      latestService.reminderSent = true;
      await latestService.save();

      return res.json({
        message: "Reminder generated (email not configured — set EMAIL_USER & EMAIL_PASS in .env)",
        emailPreview: true,
        to: owner.email,
        subject: `🔧 Service Reminder: ${vehicle.vehicleNumber} — ${statusText}`
      });
    }

    // Send the email
    await transporter.sendMail({
      from: `"ABC Fleet Maintenance" <${process.env.EMAIL_USER}>`,
      to: owner.email,
      subject: `🔧 Service Reminder: ${vehicle.vehicleNumber} — ${statusText}`,
      html: emailHtml
    });

    // Mark reminder as sent
    latestService.reminderSent = true;
    await latestService.save();

    console.log(`📧 Reminder email sent to ${owner.email} for ${vehicleNumber}`);

    res.json({
      message: "Reminder email sent successfully to " + owner.email,
      to: owner.email
    });

  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ message: "Failed to send reminder email" });
  }
});

module.exports = router;
