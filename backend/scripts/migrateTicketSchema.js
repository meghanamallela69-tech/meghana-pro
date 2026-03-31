import mongoose from "mongoose";
import { Event } from "../models/eventSchema.js";
import dotenv from "dotenv";

dotenv.config();

const migrateTicketSchema = async () => {
  try {
    console.log("🔄 Starting ticket schema migration...");
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find all events with the old ticket schema
    const events = await Event.find({
      eventType: "ticketed",
      "ticketTypes.quantity": { $exists: true }
    });

    console.log(`📊 Found ${events.length} events to migrate`);

    for (const event of events) {
      console.log(`🔄 Migrating event: ${event.title}`);
      
      // Update each ticket type
      event.ticketTypes = event.ticketTypes.map(ticket => ({
        name: ticket.name,
        price: ticket.price,
        quantityTotal: ticket.quantity || ticket.quantityTotal || 0,
        quantitySold: ticket.quantitySold || 0,
        quantityReserved: ticket.quantityReserved || 0
      }));

      // Recalculate availableTickets
      event.availableTickets = event.ticketTypes.reduce((total, ticket) => {
        const reserved = ticket.quantityReserved || 0;
        return total + (ticket.quantityTotal - ticket.quantitySold - reserved);
      }, 0);

      await event.save();
      console.log(`✅ Migrated: ${event.title}`);
    }

    console.log("🎉 Migration completed successfully!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

migrateTicketSchema();