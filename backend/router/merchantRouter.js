import express from "express";
import { auth } from "../middleware/authMiddleware.js";
import { ensureRole } from "../middleware/roleMiddleware.js";
import { 
  createEvent, 
  updateEvent, 
  deleteEvent, 
  listMyEvents, 
  getEvent, 
  participantsForEvent,
  getEarnings,
  requestWithdrawal,
  getWithdrawalHistory,
  getMerchantPayments,
  getMerchantBookings,
  approveBooking,
  updateBookingStatus,
  getBookingDetails,
  getMerchantRatings
} from "../controller/merchantController.js";
import { upload } from "../util/cloudinary.js";
import { Event } from "../models/eventSchema.js";

const router = express.Router();

// Configure multer to accept bannerImage (1) + galleryImages (3) = 4 total
router.post("/events", auth, ensureRole("merchant"), upload.fields([
  { name: 'bannerImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 3 }
]), createEvent);

router.put("/events/:id", auth, ensureRole("merchant"), upload.fields([
  { name: 'bannerImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 3 }
]), updateEvent);
router.get("/events", auth, ensureRole("merchant"), listMyEvents);
router.get("/events/:id", auth, ensureRole("merchant"), getEvent);
router.get("/events/:id/participants", auth, ensureRole("merchant"), participantsForEvent);
router.delete("/events/:id", auth, ensureRole("merchant"), deleteEvent);

// Earnings and Withdrawal routes
router.get("/earnings", auth, ensureRole("merchant"), getEarnings);
router.post("/withdrawal", auth, ensureRole("merchant"), requestWithdrawal);
router.get("/withdrawals", auth, ensureRole("merchant"), getWithdrawalHistory);
router.get("/payments", auth, ensureRole("merchant"), getMerchantPayments);

// Bookings routes
router.get("/bookings", auth, ensureRole("merchant"), getMerchantBookings);
router.put("/bookings/:bookingId/approve", auth, ensureRole("merchant"), approveBooking);
router.put("/bookings/:bookingId/status", auth, ensureRole("merchant"), updateBookingStatus);
router.get("/bookings/:bookingId/details", auth, ensureRole("merchant"), getBookingDetails);
router.get("/ratings", auth, ensureRole("merchant"), getMerchantRatings);

// One-time migration: fix legacy rating fields stored as numbers
router.post("/migrate/fix-ratings", auth, ensureRole("merchant"), async (req, res) => {
  try {
    const result = await Event.updateMany(
      { $or: [{ rating: { $type: "number" } }, { rating: null }, { rating: { $exists: false } }] },
      { $set: { rating: { average: 0, totalRatings: 0 } } }
    );
    res.json({ success: true, fixed: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
