import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, default: "" },
    eventType: { type: String, enum: ["full-service", "ticketed"], default: "full-service" },
    price: { type: Number, default: 0 },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      totalRatings: { type: Number, default: 0 }
    },
    // Location & schedule
    location: { type: String, default: "" },
    date: { type: Date, default: null },
    time: { type: String, default: "" },
    duration: { type: Number, default: 1 },
    // Ticketed event fields - NEW
    ticketedEventType: { type: String, enum: ["live", "upcoming"], default: "upcoming" },
    totalTickets: { type: Number, default: 0 },
    availableTickets: { type: Number, default: 0 },
    ticketPrice: { type: Number, default: 0 },
    // Ticket types (e.g. Regular, VIP, etc.)
    ticketTypes: [
      {
        name: { type: String, required: true },        // e.g. "Regular", "VIP"
        price: { type: Number, required: true, min: 0 },
        // Support both old and new field names for backward compatibility
        quantity: { type: Number, min: 0 }, // Old field name
        available: { type: Number, min: 0 }, // Old field name
        quantityTotal: { type: Number, min: 0 }, // New field name
        quantitySold: { type: Number, default: 0, min: 0 },
        quantityReserved: { type: Number, default: 0, min: 0 }, // For pending bookings
      }
    ],
    status: { type: String, enum: ["active", "inactive", "completed"], default: "active" },
    featured: { type: Boolean, default: false },
    images: [
      {
        public_id: { type: String, required: true },
        url: { type: String, required: true },
      }
    ],
    features: [String],
    // Add-on features for full-service events (e.g. Photography, Decoration)
    addons: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        type: { type: String, enum: ["fixed", "per_person"], default: "fixed" },
        unit: { type: String, default: "person" }, // label for per_person (e.g. "person", "plate")
      }
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Fix legacy documents where rating was stored as a number instead of an object
eventSchema.pre("save", function (next) {
  if (typeof this.rating !== "object" || this.rating === null || Array.isArray(this.rating)) {
    this.rating = { average: 0, totalRatings: 0 };
  }
  next();
});

export const Event = mongoose.model("Event", eventSchema);
