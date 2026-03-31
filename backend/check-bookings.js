import mongoose from 'mongoose';
import { Booking } from './models/bookingSchema.js';
import { Event } from './models/eventSchema.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://meghana123:meghana1234@cluster0.gfbrfcg.mongodb.net/eventhub?retryWrites=true&w=majority&appName=Cluster0';

async function checkBookings() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Get all bookings
    const bookings = await Booking.find({}).limit(10).sort({ createdAt: -1 });
    
    console.log(`\n📋 Found ${bookings.length} bookings:\n`);
    
    bookings.forEach((booking, index) => {
      console.log(`${index + 1}. ID: ${booking._id}`);
      console.log(`   Title: ${booking.serviceTitle}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   EventType: ${booking.eventType}`);
      console.log(`   ServiceId: ${booking.serviceId}`);
      console.log(`   Merchant: ${booking.merchant || 'NOT SET'}`);
      console.log(`   User: ${booking.user}`);
      console.log(`   Created: ${booking.createdAt}\n`);
    });

    // Check if there are any full-service bookings
    const fullServiceBookings = bookings.filter(b => b.eventType === 'full-service');
    console.log(`\n🎯 Full-service bookings: ${fullServiceBookings.length}`);
    
    // Check pending bookings
    const pendingBookings = bookings.filter(b => ['pending', 'awaiting_advance', 'advance_paid'].includes(b.status));
    console.log(`📝 Pending/Awaiting bookings: ${pendingBookings.length}`);
    
    pendingBookings.forEach(b => {
      console.log(`   ✅ VALID FOR ADVANCE: ${b._id} - ${b.serviceTitle}`);
    });

    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBookings();
