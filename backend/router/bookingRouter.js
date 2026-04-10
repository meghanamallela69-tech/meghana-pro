import express from "express";
import { Booking } from "../models/bookingSchema.js";
import { Event } from "../models/eventSchema.js";
import {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
  updateBookingStatus as adminUpdateBookingStatus,
  processPayment,
  getMerchantBookings,
  respondToBooking,
  confirmBooking,
  completeBooking,
  submitRating,
  merchantUpdateBookingStatus,
  approveBooking,
  validateTicket,
  validateBookingTickets,
  requestAdvancePayment,
  payAdvance,
  acceptRejectBooking,
  payRemainingAmount,
  getMerchantAdvanceRequests,
} from "../controller/bookingController.js";
import { auth } from "../middleware/authMiddleware.js";
import { ensureRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Debug middleware for merchant routes
router.use((req, res, next) => {
  if (req.path.includes('/merchant/')) {
  }
  next();
});

// Merchant routes - MUST come FIRST before generic :id routes
router.get("/merchant/my-bookings", auth, ensureRole("merchant"), getMerchantBookings);
router.get("/merchant/advance-requests", auth, ensureRole("merchant"), getMerchantAdvanceRequests);
router.post("/merchant/:id/request-advance", auth, ensureRole("merchant"), requestAdvancePayment);
router.post("/merchant/:id/accept-reject", auth, ensureRole("merchant"), acceptRejectBooking);
router.put("/merchant/:id/respond", auth, ensureRole("merchant"), respondToBooking);
router.put("/merchant/:id/confirm", auth, ensureRole("merchant"), confirmBooking);
router.put("/merchant/:id/approve", auth, ensureRole("merchant"), approveBooking);
router.put("/merchant/:id/status", auth, ensureRole("merchant"), merchantUpdateBookingStatus);
router.get("/merchant/validate-ticket/:ticketId", auth, ensureRole("merchant"), validateTicket);
router.post("/merchant/:id/validate-tickets", auth, ensureRole("merchant"), validateBookingTickets);

// Admin routes - Also specific
router.get("/admin/all", auth, ensureRole("admin"), getAllBookings);
router.put("/admin/:id/status", auth, ensureRole("admin"), adminUpdateBookingStatus);

// User routes (require authentication) - Generic :id routes come AFTER specific ones
router.post("/test", auth, (req, res) => {
  res.json({ success: true, message: "Booking API is working", user: req.user, body: req.body });
});
router.post("/", auth, createBooking);
router.get("/my-bookings", auth, getUserBookings);
router.get("/:id", auth, getBookingById);
router.put("/:id/cancel", auth, cancelBooking);
router.post("/:id/pay", auth, processPayment);
router.put("/:id/complete", auth, completeBooking);
router.post("/:id/rate", auth, submitRating);

// Advance payment workflow routes (User)
router.post("/:id/pay-advance", auth, payAdvance);
router.post("/:id/pay-remaining", auth, payRemainingAmount);

// Migration: backfill ticketTypePrices for existing ticketed bookings
router.post("/admin/fix-ticket-prices", auth, ensureRole("admin"), async (req, res) => {
  try {
    const bookings = await Booking.find({ eventType: "ticketed" });
    let fixed = 0;
    for (const booking of bookings) {
      const eventId = booking.eventId || booking.serviceId;
      if (!eventId) continue;
      try {
        const event = await Event.findById(eventId);
        if (!event?.ticketTypes?.length) continue;
        const pricesMap = {};
        event.ticketTypes.forEach(t => { pricesMap[t.name] = t.price; });
        await Booking.findByIdAndUpdate(booking._id, { ticketTypePrices: pricesMap });
        fixed++;
      } catch {}
    }
    res.json({ success: true, fixed, total: bookings.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
