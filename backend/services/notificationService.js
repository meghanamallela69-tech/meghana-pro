import { Notification } from "../models/notificationSchema.js";
import { User } from "../models/userSchema.js";

// Notification service for creating system notifications
class NotificationService {
  
  // Create a notification
  static async createNotification({
    userId, message, type = 'general', priority = 'medium',
    eventId = null, bookingId = null, actionUrl = null, actionText = null
  }) {
    try {
      const notification = await Notification.create({
        user: userId, message, type, priority, eventId, bookingId, actionUrl, actionText
      });

      // Emit real-time socket event to the user's room
      try {
        const { getIO } = await import('../util/socketIO.js');
        const io = getIO();
        if (io) {
          io.to(`user_${userId}`).emit('newNotification', {
            _id: notification._id,
            message: notification.message,
            type: notification.type,
            priority: notification.priority,
            read: false,
            createdAt: notification.createdAt,
            bookingId: notification.bookingId,
            eventId: notification.eventId,
            actionUrl: notification.actionUrl,
            actionText: notification.actionText,
          });
        }
      } catch (socketErr) {
        // Non-fatal — notification is saved, just not pushed in real-time
      }

      return notification;
    } catch (error) {
      console.error('❌ Failed to create notification:', error.message);
      throw error;
    }
  }

  // Booking-related notifications
  static async notifyBookingCreated(userId, bookingId, eventTitle) {
    return this.createNotification({
      userId,
      message: `Your booking for "${eventTitle}" has been created successfully. Please complete payment to confirm.`,
      type: 'booking_request',
      priority: 'high',
      bookingId,
      actionUrl: `/dashboard/user/bookings`,
      actionText: 'View Booking'
    });
  }

  static async notifyBookingConfirmed(userId, bookingId, eventTitle) {
    return this.createNotification({
      userId,
      message: `Your booking for "${eventTitle}" has been confirmed! Get ready for the event.`,
      type: 'booking_approved',
      priority: 'high',
      bookingId,
      actionUrl: `/dashboard/user/bookings`,
      actionText: 'View Ticket'
    });
  }

  static async notifyBookingCancelled(userId, bookingId, eventTitle, reason = '') {
    const message = reason 
      ? `Your booking for "${eventTitle}" has been cancelled. Reason: ${reason}`
      : `Your booking for "${eventTitle}" has been cancelled.`;
    
    return this.createNotification({
      userId,
      message,
      type: 'booking_cancelled',
      priority: 'high',
      bookingId,
      actionUrl: `/dashboard/user/bookings`,
      actionText: 'View Details'
    });
  }

  static async notifyBookingCompleted(userId, bookingId, eventTitle) {
    return this.createNotification({
      userId,
      message: `Thank you for attending "${eventTitle}"! Please rate your experience.`,
      type: 'booking_completed',
      priority: 'medium',
      bookingId,
      actionUrl: `/dashboard/user/bookings`,
      actionText: 'Rate Event'
    });
  }

  // Payment-related notifications
  static async notifyPaymentReceived(userId, bookingId, amount, eventTitle) {
    return this.createNotification({
      userId,
      message: `Payment of ₹${amount} received for "${eventTitle}". Your booking is now confirmed!`,
      type: 'payment_received',
      priority: 'high',
      bookingId,
      actionUrl: `/dashboard/user/bookings`,
      actionText: 'View Ticket'
    });
  }

  static async notifyPaymentFailed(userId, bookingId, eventTitle) {
    return this.createNotification({
      userId,
      message: `Payment failed for "${eventTitle}". Please try again to confirm your booking.`,
      type: 'payment_failed',
      priority: 'high',
      bookingId,
      actionUrl: `/dashboard/user/bookings`,
      actionText: 'Retry Payment'
    });
  }

  // Merchant notifications
  static async notifyMerchantNewBooking(merchantId, bookingId, eventTitle, customerName) {
    return this.createNotification({
      userId: merchantId,
      message: `New booking request from ${customerName} for "${eventTitle}". Please review and respond.`,
      type: 'booking_request',
      priority: 'high',
      bookingId,
      actionUrl: `/dashboard/merchant/bookings`,
      actionText: 'Review Booking'
    });
  }

  static async notifyMerchantPaymentReceived(merchantId, bookingId, amount, eventTitle) {
    return this.createNotification({
      userId: merchantId,
      message: `Payment of ₹${amount} received for "${eventTitle}" booking. Funds will be transferred to your account.`,
      type: 'payment_received',
      priority: 'medium',
      bookingId,
      actionUrl: `/dashboard/merchant/earnings`,
      actionText: 'View Earnings'
    });
  }

  static async notifyMerchantEventApproved(merchantId, eventId, eventTitle) {
    return this.createNotification({
      userId: merchantId,
      message: `Your event "${eventTitle}" has been approved and is now live!`,
      type: 'event_created',
      priority: 'high',
      eventId,
      actionUrl: `/dashboard/merchant/events`,
      actionText: 'View Event'
    });
  }

  // Admin notifications
  static async notifyAdminNewUser(adminId, userId, userName, userRole) {
    return this.createNotification({
      userId: adminId,
      message: `New ${userRole} registration: ${userName} has joined the platform.`,
      type: userRole === 'merchant' ? 'merchant_registration' : 'user_registration',
      priority: 'medium',
      actionUrl: `/dashboard/admin/users`,
      actionText: 'View Users'
    });
  }

  static async notifyAdminNewEvent(adminId, eventId, eventTitle, merchantName) {
    return this.createNotification({
      userId: adminId,
      message: `New event "${eventTitle}" submitted by ${merchantName} for review.`,
      type: 'event_created',
      priority: 'medium',
      eventId,
      actionUrl: `/dashboard/admin/events`,
      actionText: 'Review Event'
    });
  }

  static async notifyAdminPaymentIssue(adminId, bookingId, issue, amount) {
    return this.createNotification({
      userId: adminId,
      message: `Payment issue reported: ${issue}. Amount: ₹${amount}. Requires investigation.`,
      type: 'report',
      priority: 'urgent',
      bookingId,
      actionUrl: `/dashboard/admin/payments`,
      actionText: 'Investigate'
    });
  }

  // Bulk notifications
  static async notifyAllUsers(message, type = 'system', priority = 'medium') {
    try {
      const users = await User.find({ role: 'user' }).select('_id');
      await Notification.insertMany(users.map(u => ({ user: u._id, message, type, priority })));
      return users.length;
    } catch (error) {
      console.error('❌ Failed to notify users:', error.message);
      throw error;
    }
  }

  static async notifyAllMerchants(message, type = 'system', priority = 'medium') {
    try {
      const merchants = await User.find({ role: 'merchant' }).select('_id');
      await Notification.insertMany(merchants.map(m => ({ user: m._id, message, type, priority })));
      return merchants.length;
    } catch (error) {
      console.error('❌ Failed to notify merchants:', error.message);
      throw error;
    }
  }

  // Get all admins for notifications
  static async getAdminIds() {
    try {
      const admins = await User.find({ role: 'admin' }).select('_id');
      return admins.map(admin => admin._id);
    } catch (error) {
      console.error('❌ Failed to get admin IDs:', error);
      return [];
    }
  }

  // Notify all admins
  static async notifyAllAdmins(message, type = 'system', priority = 'medium', eventId = null, bookingId = null) {
    try {
      const admins = await User.find({ role: 'admin' }).select('_id');
      if (!admins || admins.length === 0) return [];

      const results = [];
      for (const admin of admins) {
        try {
          const n = await Notification.create({
            user: admin._id, message, type, priority, read: false,
            ...(eventId && { eventId: String(eventId) }),
            ...(bookingId && { bookingId }),
          });
          results.push(n);
        } catch (err) {
          console.error(`❌ Admin notification failed for ${admin._id}:`, err.message);
        }
      }
      return results;
    } catch (error) {
      console.error('❌ Failed to notify admins:', error.message);
      return [];
    }
  }
}

export default NotificationService;