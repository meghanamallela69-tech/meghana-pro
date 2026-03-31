import express from "express";
import { Notification } from "../models/notificationSchema.js";
import { auth } from "../middleware/authMiddleware.js";
import {
  getUnreadCounts,
  markAllAsRead,
  markAsRead,
  getRecentNotifications,
  markBookingNotificationsAsRead
} from "../controller/notificationController.js";

const router = express.Router();

// Get all notifications for current user
router.get("/", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(20);
    return res.status(200).json({ success: true, notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Create test notification (for debugging)
router.post("/create-test", auth, async (req, res) => {
  try {
    const { message, type } = req.body;
    
    console.log('=== CREATE TEST NOTIFICATION ===');
    console.log('User ID:', req.user.userId);
    console.log('Message:', message);
    console.log('Type:', type);
    
    // Validate type against enum
    const validTypes = ["booking", "payment", "general", "booking_update", "booking_approved", "booking_status_update", "payment_request", "booking_request"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}` 
      });
    }
    
    const notification = await Notification.create({
      user: req.user.userId,
      message: message || "Test notification",
      type: type || "general",
      read: false
    });
    
    console.log('✅ Notification created:', notification._id);
    
    return res.status(200).json({ 
      success: true, 
      notification,
      message: 'Test notification created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating test notification:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Create multiple test notifications at once
router.post("/create-test-batch", auth, async (req, res) => {
  try {
    const { notifications } = req.body;
    
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Notifications must be a non-empty array' 
      });
    }
    
    console.log(`=== CREATE BATCH NOTIFICATIONS ===`);
    console.log(`User ID: ${req.user.userId}`);
    console.log(`Count: ${notifications.length}`);
    
    const validTypes = ["booking", "payment", "general", "booking_update", "booking_approved", "booking_status_update", "payment_request", "booking_request"];
    const createdNotifications = [];
    
    for (const notif of notifications) {
      if (!validTypes.includes(notif.type)) {
        console.warn(`⚠️ Skipping invalid type: ${notif.type}`);
        continue;
      }
      
      const notification = await Notification.create({
        user: req.user.userId,
        message: notif.message || "Test notification",
        type: notif.type || "general",
        read: false
      });
      
      createdNotifications.push(notification);
      console.log(`✅ Created: ${notification._id} [${notif.type}]`);
    }
    
    console.log(`✅ Successfully created ${createdNotifications.length}/${notifications.length} notifications`);
    
    return res.status(200).json({ 
      success: true, 
      notifications: createdNotifications,
      count: createdNotifications.length,
      message: `${createdNotifications.length} test notifications created successfully`
    });
  } catch (error) {
    console.error('❌ Error creating batch notifications:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get unread counts
router.get("/unread-counts", auth, getUnreadCounts);

// Mark all as read
router.post("/mark-all-read", auth, markAllAsRead);

// Mark specific notification as read
router.patch("/:notificationId/read", auth, markAsRead);

// Get recent notifications
router.get("/recent", auth, getRecentNotifications);

// Mark booking notifications as read
router.post("/mark-booking-read", auth, markBookingNotificationsAsRead);

// Mark notification as read
router.patch("/:id/read", auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: "Not found" });
    return res.status(200).json({ success: true, notification });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delete notification
router.delete("/:id", auth, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.userId });
    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
