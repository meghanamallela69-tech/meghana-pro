import express from "express";
import { 
  listEvents, 
  registerForEvent, 
  userRegistrations,
  searchEvents,
  getRecentBookings,
  getEventById
} from "../controller/eventController.js";
import { auth } from "../middleware/authMiddleware.js";
import { ensureRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", listEvents);
router.get("/search", searchEvents);
router.get("/recent-bookings", auth, ensureRole("user"), getRecentBookings);
router.get("/me", auth, ensureRole("user"), userRegistrations);
router.get("/:id", getEventById); // Public — must be AFTER named routes
router.post("/:id/register", auth, ensureRole("user"), registerForEvent);

export default router;
