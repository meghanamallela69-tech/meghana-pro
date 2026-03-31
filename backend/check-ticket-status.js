/**
 * Check current booking and ticket status
 */

import mongoose from 'mongoose';
import { Event } from './models/eventSchema.js';
import { Booking } from './models/bookingSchema.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://eventhub_user:Dhanush123@cluster0.2fzgf.mongodb.net/eventhub?retryWrites=true&w=majority';

async function checkTicketStatus() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find all ticketed events
    const ticketedEvents = await Event.find({ eventType: 'ticketed' })
      .select('title ticketTypes totalTickets availableTickets')
      .lean();
    
    console.log('🎫 TICKETED EVENTS STATUS');
    console.log('=' .repeat(80));
    
    for (const event of ticketedEvents) {
      console.log(`\n📌 Event: ${event.title}`);
      console.log(`   _id: ${event._id}`);
      console.log(`   Total Tickets: ${event.totalTickets}`);
      console.log(`   Available Tickets (DB): ${event.availableTickets}`);
      
      if (event.ticketTypes && event.ticketTypes.length > 0) {
        console.log('\n   Ticket Types:');
        event.ticketTypes.forEach((ticket, idx) => {
          const quantityTotal = ticket.quantityTotal || ticket.quantity || 0;
          const quantitySold = ticket.quantitySold || 0;
          const available = ticket.available || ticket.quantityAvailable || 0;
          const calculated = quantityTotal - quantitySold;
          
          console.log(`   ${idx + 1}. ${ticket.name}:`);
          console.log(`      Total: ${quantityTotal}`);
          console.log(`      Sold: ${quantitySold}`);
          console.log(`      Available (stored): ${available}`);
          console.log(`      Available (calculated): ${calculated}`);
          console.log(`      Status: ${available === calculated ? '✅ CORRECT' : '❌ WRONG'}`);
        });
      }
      
      // Check bookings for this event
      const bookings = await Booking.find({ 
        eventId: event._id,
        eventType: 'ticketed'
      }).select('ticketType ticketCount status paymentStatus');
      
      if (bookings.length > 0) {
        console.log(`\n   📊 Bookings Found: ${bookings.length}`);
        bookings.forEach((booking, idx) => {
          console.log(`   ${idx + 1}. Type: ${booking.ticketType}, Count: ${booking.ticketCount}, Status: ${booking.status}`);
        });
        
        // Calculate total sold from bookings
        const totalSold = bookings.reduce((sum, b) => sum + (booking.ticketCount || 0), 0);
        console.log(`   Total tickets sold (from bookings): ${totalSold}`);
      } else {
        console.log('\n   ℹ️  No bookings found');
      }
      
      console.log('=' .repeat(80));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTicketStatus();
