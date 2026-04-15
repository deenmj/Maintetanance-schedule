const nodemailer = require("nodemailer");

const sendServiceReminderEmail = async (vehicle, latestService) => {
  const owner = vehicle.ownerId;
  if (!owner || !owner.email) return { success: false, message: "No owner email found" };

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

  // Check date status too
  if (latestService.nextServiceDate) {
    const daysRemaining = Math.ceil((new Date(latestService.nextServiceDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) {
      statusText = "OVERDUE";
      statusColor = "#fb7185";
    } else if (daysRemaining <= 30 && statusText !== "OVERDUE") {
      statusText = "Due Soon";
      statusColor = "#fbbf24";
    }
  }

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

  const emailHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 0;">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px; text-align: center;">
        <h1 style="color: #38bdf8; margin: 0; font-size: 24px;">🔧 ABC Fleet Maintenance</h1>
        <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Vehicle Service Reminder</p>
      </div>
      <div style="padding: 32px; background: white;">
        <p style="color: #334155; font-size: 16px; margin: 0 0 24px;">Hello <strong>${owner.name}</strong>,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          This is an automated reminder from <strong>ABC Fleet Maintenance</strong> about an upcoming service for your vehicle.
        </p>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #0f172a; margin: 0 0 12px; font-size: 16px;">📌 Vehicle Details</h3>
          <table style="width: 100%; font-size: 14px; color: #334155;">
            <tr><td style="padding: 4px 0; font-weight: 600; width: 40%;">Vehicle:</td><td>${vehicle.vehicleNumber} — ${vehicle.model}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Current Mileage:</td><td>${vehicle.mileage.toLocaleString()} km</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Next Service Date:</td><td>${nextDateStr}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Status:</td><td style="color: ${statusColor}; font-weight: 700;">${statusText}</td></tr>
          </table>
        </div>
        <h3 style="color: #0f172a; margin: 0 0 12px; font-size: 16px;">🔩 Component Status</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
          <thead><tr style="background: #f1f5f9;"><th style="padding: 10px 12px; text-align: left;">Component</th><th style="padding: 10px 12px;">Next Check</th><th style="padding: 10px 12px;">Status</th></tr></thead>
          <tbody>${componentRows}</tbody>
        </table>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">Please book a service appointment through your dashboard or contact us directly.</p>
      </div>
      <div style="background: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ABC Fleet Maintenance · Auto-Generated</p>
      </div>
    </div>
  `;

  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`⚠️ Email not configured. Would have sent auto-reminder to ${owner.email}`);
    return { success: true, message: "Preview mode (credentials not set)" };
  }

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

  await transporter.sendMail({
    from: `"ABC Fleet Maintenance" <${process.env.EMAIL_USER}>`,
    to: owner.email,
    subject: `🔧 Service Reminder: ${vehicle.vehicleNumber} — ${statusText}`,
    html: emailHtml
  });

  return { success: true };
};

module.exports = { sendServiceReminderEmail };
