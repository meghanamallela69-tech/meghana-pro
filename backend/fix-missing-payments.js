import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Booking } from './models/bookingSchema.js';
import { Payment } from './models/paymentSchema.js';
import { Event } from './models/eventSchema.js';
import { processPaymentDistribution } from './services/paymentDistributionService.js';
import { dbConnection } from './database/dbConnection.js';

dotenv.config();

const fixExistingPayments = async () => {
  try {
    await dbConnection();
    console.log('Connected to database');

    // Find bookings that are 'paid', 'confirmed', or 'completed' but don't have commissionCalculated set to true
    const unpaidBookings = await Booking.find({
      status: { $in: ['paid', 'confirmed', 'completed'] },
      commissionCalculated: { $ne: true }
    });

    console.log(`Found ${unpaidBookings.length} bookings to process for earnings distribution.`);

    for (const booking of unpaidBookings) {
      console.log(`Processing booking ${booking._id} (${booking.serviceTitle})...`);
      
      try {
        const event = await Event.findById(booking.serviceId);
        const merchantId = event ? event.createdBy : booking.merchant;
        
        if (!merchantId) {
          console.warn(`Skipping booking ${booking._id}: No merchant found.`);
          continue;
        }

        const totalAmount = booking.finalAmount || booking.totalPrice || booking.servicePrice;
        
        await processPaymentDistribution({
          userId: booking.user,
          merchantId: merchantId,
          bookingId: booking._id,
          eventId: booking.serviceId,
          totalAmount: totalAmount,
          paymentMethod: booking.payment?.paymentMethod || 'Manual',
          transactionId: booking.payment?.paymentId || `FIX_${booking._id}`,
          paymentGateway: 'manual',
          description: `Retroactive distribution for ${booking.serviceTitle}`
        });

        console.log(`✅ Processed distribution for booking ${booking._id}`);
      } catch (err) {
        console.error(`❌ Failed to process booking ${booking._id}:`, err.message);
      }
    }

    console.log('Migration completed.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

fixExistingPayments();
