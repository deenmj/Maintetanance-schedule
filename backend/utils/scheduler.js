const cron = require('node-cron');
const Vehicle = require('../models/vehicle');
const Service = require('../models/service');
const { sendServiceReminderEmail } = require('./emailService');

const initScheduler = () => {
  // Run every day at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Running daily service reminder scan...');
    try {
      const vehicles = await Vehicle.find().populate('ownerId');
      
      for (const vehicle of vehicles) {
        const latestService = await Service.findOne({ vehicleNumber: vehicle.vehicleNumber })
          .sort({ serviceDate: -1 });

        if (!latestService) continue;

        // Skip if reminder already sent for this service record
        if (latestService.reminderSent) continue;

        const now = new Date();
        const nextDate = new Date(latestService.nextServiceDate);
        const diffMs = nextDate - now;
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        const kmRemaining = latestService.nextServiceKm ? latestService.nextServiceKm - vehicle.mileage : 99999;

        // Trigger if: 
        // 1. Overdue by days (6 months passed)
        // 2. Due soon by days (30 days left)
        // 3. Overdue by km
        // 4. Due soon by km (1000km left)
        if (daysRemaining <= 30 || kmRemaining <= 1000) {
          console.log(`📡 Auto-triggering reminder for ${vehicle.vehicleNumber} (Days: ${daysRemaining}, KM Left: ${kmRemaining})`);
          
          const result = await sendServiceReminderEmail(vehicle, latestService);
          
          if (result.success) {
            latestService.reminderSent = true;
            await latestService.save();
            console.log(`✅ Auto-reminder sent for ${vehicle.vehicleNumber}`);
          } else {
            console.error(`❌ Auto-reminder failed for ${vehicle.vehicleNumber}: ${result.message}`);
          }
        }
      }
    } catch (err) {
      console.error('❌ Scheduler error:', err);
    }
  });

  console.log('🚀 Service reminder scheduler initialized (Daily at 00:00)');
};

module.exports = { initScheduler };
