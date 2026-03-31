import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date
    },
    // Additional fields for booking notifications
    eventId: {
      type: String
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking"
    },
    type: {
      type: String,
      enum: [
        "booking", "booking_update", "booking_approved", "booking_status_update", 
        "booking_request", "booking_cancelled", "booking_completed",
        "payment", "payment_request", "payment_received", "payment_failed",
        "system", "user_registration", "merchant_registration", "event_created", "report",
        "general"
      ],
      default: "general"
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium"
    },
    // For action notifications (buttons/links)
    actionUrl: {
      type: String
    },
    actionText: {
      type: String
    }
  },
  { timestamps: true }
);

// Index for better query performance
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1, read: 1 });

export const Notification = mongoose.model("Notification", notificationSchema);
