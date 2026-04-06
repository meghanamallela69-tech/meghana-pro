import express from "express";
import {
  bookFullServiceEvent,
  requestAdvancePayment,
  payAdvanceAmount,
  acceptBooking,
  updateBookingStatus,
  payRemainingAmount,
  getBookingDetails,
  getUserBookingsWithStatus,
  getMerchantBookingsWithStatus
} from "../controller/fullServiceBookingController.js";
import { auth } from "../middleware/authMiddleware.js";
import { ensureRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// ============ USER ROUTES ============

// Step 1: User books event
router.post("/book", auth, ensureRole("user"), bookFullServiceEvent);

// Step 3: User pays advance
router.post("/:bookingId/pay-advance", auth, ensureRole("user"), payAdvanceAmount);

// Step 6: User pays remaining
router.post("/:bookingId/pay-remaining", auth, ensureRole("user"), payRemainingAmount);

// Get user's bookings
router.get("/user/my-bookings", auth, ensureRole("user"), getUserBookingsWithStatus);

// Get booking details
router.get("/:bookingId", auth, getBookingDetails);

// ============ MERCHANT ROUTES ============

// Step 2: Merchant requests advance
router.post("/merchant/:bookingId/request-advance", auth, ensureRole("merchant"), requestAdvancePayment);

// Step 4: Merchant accepts booking
router.post("/merchant/:bookingId/accept", auth, ensureRole("merchant"), acceptBooking);

// Step 5: Merchant updates status (processing/completed)
router.put("/merchant/:bookingId/status", auth, ensureRole("merchant"), updateBookingStatus);

// Get merchant's bookings
router.get("/merchant/my-bookings", auth, ensureRole("merchant"), getMerchantBookingsWithStatus);

export default router;
