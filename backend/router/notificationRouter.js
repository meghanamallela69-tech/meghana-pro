import express from "express";
import { Notification } from "../models/notificationSchema.js";
import { User } from "../models/userSchema.js";
import { auth } from "../middleware/authMiddleware.js";
import {
  getUnreadCounts,
  getAllNotifications,
  markAllAsRead,
  markAsRead,
  getRecentNotifications,
  markBookingNotificationsAsRead,
  deleteNotification,
  createNotification
} from "../controller/notificationController.js";

const router = express.Router();

router.get("/", auth, getAllNotifications);
router.get("/recent", auth, getRecentNotifications);
router.get("/unread-counts", auth, getUnreadCounts);
router.post("/mark-all-read", auth, markAllAsRead);
router.patch("/:notificationId/read", auth, markAsRead);
router.delete("/:notificationId", auth, deleteNotification);
router.post("/mark-booking-read", auth, markBookingNotificationsAsRead);
router.post("/create", auth, createNotification);

// Admin: create notification for self (no role check needed - just uses logged-in user's ID)
router.post("/admin-self", auth, async (req, res) => {
  try {
    const { message, type = "general" } = req.body;
    const userId = req.user.userId;

    const notification = await Notification.create({
      user: userId,
      message: message || `Admin notification at ${new Date().toLocaleTimeString()}`,
      type,
      read: false,
    });

    return res.status(200).json({ success: true, notification });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
