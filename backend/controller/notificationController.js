import { Notification } from "../models/notificationSchema.js";

// Get unread notification counts for any user (user/merchant/admin)
export const getUnreadCounts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;


    // Get total unread count using 'read' field
    const totalUnread = await Notification.countDocuments({ 
      user: userId, 
      read: false 
    });

    // Get unread booking notifications count (includes all booking-related types)
    const bookingUnread = await Notification.countDocuments({ 
      user: userId, 
      read: false, 
      type: { $in: ["booking", "booking_update", "booking_approved", "booking_status_update", "booking_request", "booking_cancelled", "booking_completed"] } 
    });

    // Get unread payment notifications count (includes payment requests)
    const paymentUnread = await Notification.countDocuments({ 
      user: userId, 
      read: false, 
      type: { $in: ["payment", "payment_request", "payment_received", "payment_failed"] } 
    });

    // Get unread system notifications for admins
    const systemUnread = userRole === 'admin' ? await Notification.countDocuments({ 
      user: userId, 
      read: false, 
      type: { $in: ["system", "user_registration", "merchant_registration", "event_created", "report"] } 
    }) : 0;

    const result = {
      bookings: Math.min(bookingUnread, 99),
      payments: Math.min(paymentUnread, 99),
      system: Math.min(systemUnread, 99),
      total: Math.min(totalUnread, 99),
      hasMore: totalUnread > 99,
      role: userRole
    };
    return res.status(200).json({ 
      success: true, 
      data: result
    });
  } catch (error) {
    console.error("Get unread counts error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch unread counts" });
  }
};

// Get all notifications for a user with pagination and filtering
export const getAllNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type; // Filter by notification type
    const unreadOnly = req.query.unreadOnly === 'true';
    
    const skip = (page - 1) * limit;
    
    // Build query
    const query = { user: userId };
    if (type && type !== 'all') {
      if (type === 'booking') {
        query.type = { $in: ["booking", "booking_update", "booking_approved", "booking_status_update", "booking_request", "booking_cancelled", "booking_completed"] };
      } else if (type === 'payment') {
        query.type = { $in: ["payment", "payment_request", "payment_received", "payment_failed"] };
      } else if (type === 'system') {
        query.type = { $in: ["system", "user_registration", "merchant_registration", "event_created", "report"] };
      } else {
        query.type = type;
      }
    }
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('bookingId', 'serviceTitle eventDate totalPrice status')
      .populate('eventId', 'title date location');

    const total = await Notification.countDocuments(query);

    return res.status(200).json({ 
      success: true, 
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Get all notifications error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch notifications" });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    await Notification.updateMany(
      { user: userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    return res.status(200).json({ 
      success: true, 
      message: "All notifications marked as read" 
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to mark notifications as read" });
  }
};

// Mark specific notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findOne({ 
      _id: notificationId, 
      user: userId 
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    return res.status(200).json({ 
      success: true, 
      message: "Notification marked as read" 
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to mark notification as read" });
  }
};

// Get recent notifications (for dropdown/modal)
export const getRecentNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('bookingId', 'serviceTitle eventDate totalPrice status')
      .populate('eventId', 'title date location');

    return res.status(200).json({ 
      success: true, 
      notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error("Get recent notifications error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch notifications" });
  }
};

// Mark all booking notifications as read
export const markBookingNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    await Notification.updateMany(
      { 
        user: userId, 
        type: { $in: ["booking", "booking_update", "booking_approved", "booking_status_update", "booking_request", "booking_cancelled", "booking_completed"] }, 
        read: false 
      },
      { $set: { read: true, readAt: new Date() } }
    );

    return res.status(200).json({ 
      success: true, 
      message: "Booking notifications marked as read" 
    });
  } catch (error) {
    console.error("Mark booking notifications as read error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to mark booking notifications as read" });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findOneAndDelete({ 
      _id: notificationId, 
      user: userId 
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    return res.status(200).json({ 
      success: true, 
      message: "Notification deleted successfully" 
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to delete notification" });
  }
};

// Create notification (for system use)
export const createNotification = async (req, res) => {
  try {
    const { userId, message, type, eventId, bookingId } = req.body;

    const notification = await Notification.create({
      user: userId,
      message,
      type: type || 'general',
      eventId,
      bookingId
    });

    return res.status(201).json({ 
      success: true, 
      notification,
      message: "Notification created successfully" 
    });
  } catch (error) {
    console.error("Create notification error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to create notification" });
  }
};
