import mongoose from 'mongoose';
import { Booking } from './models/bookingSchema.js';
import { Event } from './models/eventSchema.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://meghana123:meghana1234@cluster0.gfbrfcg.mongodb.net/eventhub?retryWrites=true&w=majority&appName=Cluster0';

async function fixBookings() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    // Find all bookings without merchant field OR with null serviceId
    const problematicBookings = await Booking.find({ 
      $or: [
        { merchant: { $exists: false } },
        { merchant: null },
        { serviceId: null }
      ]
    });
    
    console.log(`📋 Found ${problematicBookings.length} bookings that need fixing\n`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const booking of problematicBookings) {
      try {
        console.log(`Processing: ${booking._id}`);
        
        // Get the event to find the merchant
        let event = null;
        if (booking.serviceId) {
          event = await Event.findById(booking.serviceId).select('createdBy');
        }
        
        // If no serviceId or event not found, try to find by event title match
        if (!event && booking.serviceTitle) {
          console.log(`  ⚠️  Event not found by serviceId, trying title match...`);
          event = await Event.findOne({ title: booking.serviceTitle }).select('createdBy');
        }
        
        if (event && event.createdBy) {
          booking.merchant = event.createdBy;
          await booking.save();
          console.log(`  ✅ Fixed: Merchant set to ${event.createdBy}\n`);
          fixedCount++;
        } else {
          console.log(`  ⚠️  Skip: Cannot find associated event - manual fix required\n`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`  ❌ Error fixing ${booking._id}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log('\n===========================================');
    console.log(`🎉 Migration Complete!`);
    console.log(`   ✅ Fixed: ${fixedCount} bookings`);
    console.log(`   ⚠️  Skipped: ${skippedCount} bookings (need manual review)`);
    console.log('===========================================\n');
    
    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixBookings();
