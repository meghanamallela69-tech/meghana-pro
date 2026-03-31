/**
 * Quick check of Summer Music Fest ticket counts
 */

import mongoose from 'mongoose';
import { Event } from './models/eventSchema.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://eventhub_user:Dhanush123@cluster0.2fzgf.mongodb.net/eventhub?retryWrites=true&w=majority';

async function checkSummerFest() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find Summer Music Fest
    const event = await Event.findOne({ 
      title: { $regex: /summer music fest/i } 
    });
    
    if (!event) {
      console.log('❌ Summer Music Fest not found');
      process.exit(1);
    }
    
    console.log('🎵 Summer Music Fest 2026');
    console.log('=' .repeat(60));
    console.log(`Event ID: ${event._id}`);
    console.log(`Event Type: ${event.eventType}`);
    console.log(`Total Tickets: ${event.totalTickets}`);
    console.log(`Available Tickets: ${event.availableTickets}`);
    console.log('');
    
    if (event.ticketTypes && event.ticketTypes.length > 0) {
      console.log('Ticket Types:');
      event.ticketTypes.forEach((ticket, idx) => {
        const total = ticket.quantityTotal || ticket.quantity || 0;
        const sold = ticket.quantitySold || 0;
        const available = total - sold;
        
        console.log(`\n${idx + 1}. ${ticket.name}`);
        console.log(`   Total: ${total}`);
        console.log(`   Sold: ${sold}`);
        console.log(`   Available: ${available}`);
        console.log(`   Database fields: quantity=${ticket.quantity}, quantityTotal=${ticket.quantityTotal}, quantitySold=${ticket.quantitySold}`);
      });
    }
    
    console.log('\n' + '=' .repeat(60));
    
    // Check recent bookings for this event
    const { Booking } = await import('./models/bookingSchema.js');
    const bookings = await Booking.find({ 
      eventId: event._id,
      eventType: 'ticketed'
    }).sort('-createdAt').limit(5);
    
    if (bookings.length > 0) {
      console.log(`\n📊 Recent Bookings (${bookings.length}):`);
      bookings.forEach((b, i) => {
        console.log(`${i + 1}. ${b.ticketType || 'N/A'} x${b.ticketCount || b.guestCount || 1} - Status: ${b.status}, Payment: ${b.paymentStatus}`);
      });
    } else {
      console.log('\nℹ️  No bookings found for this event');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSummerFest();
