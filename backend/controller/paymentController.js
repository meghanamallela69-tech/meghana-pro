import { Booking } from "../models/bookingSchema.js";
import { Event } from "../models/eventSchema.js";
import { Notification } from "../models/notificationSchema.js";
import { Payment } from "../models/paymentSchema.js";
import { User } from "../models/userSchema.js";
import { processPaymentDistribution, processRefund } from "../services/paymentDistributionService.js";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import NotificationService from "../services/notificationService.js";

// Process payment for a booking with commission distribution
export const processPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { paymentMethod, paymentAmount } = req.body;
    const userId = req.user.userId;
    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify the booking belongs to the user
    if (String(booking.user) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Not authorized to pay for this booking" });
    }

    // Check if booking is in correct status for payment
    if (!["pending", "confirmed"].includes(booking.bookingStatus)) {
      return res.status(400).json({ 
        success: false, 
        message: "Booking must be confirmed before payment" 
      });
    }

    // Check if already paid
    if (booking.paymentStatus === "paid") {
      return res.status(400).json({ 
        success: false, 
        message: "Booking is already paid" 
      });
    }

    // Get event details
    const event = await Event.findById(booking.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // Determine payment amount (use finalAmount if available, otherwise totalPrice)
    const totalAmount = paymentAmount || booking.finalAmount || booking.totalPrice;
    
    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid payment amount" 
      });
    }

    // Generate transaction ID
    const transactionId = `TXN_${uuidv4().substring(0, 12).toUpperCase()}`;
    const ticketId = `TKT_${uuidv4().substring(0, 8).toUpperCase()}`;

    // Process payment distribution
    const distributionResult = await processPaymentDistribution({
      userId: booking.user,
      merchantId: booking.merchant || event.createdBy,
      bookingId: booking._id,
      eventId: event._id,
      totalAmount,
      paymentMethod: paymentMethod || "Cash",
      transactionId,
      paymentGateway: "manual",
      description: `Payment for ${event.title}`
    });

    // For ticketed events, convert reserved tickets to sold tickets
    if (booking.eventType === "ticketed" && booking.ticketType && booking.ticketCount) {
      const ticketType = event.ticketTypes.find(t => t.name === booking.ticketType);
      if (ticketType) {
        // Ensure we have the new field names
        if (!ticketType.quantityTotal && ticketType.quantity) {
          ticketType.quantityTotal = ticketType.quantity;
        }
        if (!ticketType.quantitySold) {
          ticketType.quantitySold = 0;
        }
        
        // Move from reserved to sold
        ticketType.quantitySold += booking.ticketCount;
        ticketType.quantityReserved = Math.max(0, (ticketType.quantityReserved || 0) - booking.ticketCount);
        
        // Recalculate total available tickets
        event.availableTickets = event.ticketTypes.reduce((total, ticket) => {
          const reserved = ticket.quantityReserved || 0;
          const totalQty = ticket.quantityTotal || ticket.quantity || 0;
          const sold = ticket.quantitySold || 0;
          return total + (totalQty - sold - reserved);
        }, 0);
        
        await event.save();
      }
    }

    // Update booking with additional details
    await Booking.findByIdAndUpdate(bookingId, {
      ticketId,
      ticketGenerated: true
    });

    // Create notification for user using NotificationService
    try {
      await NotificationService.notifyPaymentReceived(
        booking.user,
        booking._id,
        distributionResult.distribution.totalAmount,
        event.title
      );
    } catch (notifError) {
      console.error("Failed to create payment notification:", notifError);
    }

    // Create notification for merchant using NotificationService
    try {
      await NotificationService.notifyMerchantPaymentReceived(
        booking.merchant || event.createdBy,
        booking._id,
        distributionResult.distribution.merchantAmount,
        event.title
      );
    } catch (notifError) {
      console.error("Failed to create merchant notification:", notifError);
    }
    return res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      payment: distributionResult.payment,
      distribution: distributionResult.distribution,
      paymentDetails: {
        transactionId,
        ticketId,
        totalAmount,
        adminCommission: distributionResult.distribution.adminCommission,
        merchantAmount: distributionResult.distribution.merchantAmount,
        method: paymentMethod || "Cash",
        date: new Date()
      }
    });

  } catch (error) {
    console.error("Payment processing error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process payment",
      error: error.message
    });
  }
};

// Get user's bookings with payment status
export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookings = await Booking.find({
      user: userId,
      type: "event"
    })
      .populate("merchant", "name email")
      .sort({ createdAt: -1 });
    // Format bookings with additional info
    const formattedBookings = bookings.map(booking => ({
      ...booking.toObject(),
      canPay: booking.status === "approved" && booking.paymentStatus !== "Paid",
      isConfirmed: booking.status === "confirmed" && booking.paymentStatus === "Paid",
      merchantName: booking.merchant?.name || "Unknown Merchant"
    }));

    return res.status(200).json({
      success: true,
      bookings: formattedBookings
    });

  } catch (error) {
    console.error("Get user bookings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings"
    });
  }
};

// Get booking details for payment
export const getBookingForPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.userId;

    const booking = await Booking.findById(bookingId)
      .populate("merchant", "name email");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify the booking belongs to the user
    if (String(booking.user) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Get event details
    const event = await Event.findById(booking.eventId);

    return res.status(200).json({
      success: true,
      booking: {
        ...booking.toObject(),
        eventDetails: event,
        canPay: booking.status === "approved" && booking.paymentStatus !== "Paid"
      }
    });

  } catch (error) {
    console.error("Get booking for payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch booking details"
    });
  }
};

// Process refund for a booking
export const processBookingRefund = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { refundReason } = req.body;
    const userId = req.user.userId;
    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Check if user is authorized (booking owner or admin)
    const user = await User.findById(userId);
    const isAuthorized = String(booking.user) === String(userId) || user.role === "admin";
    
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: "Not authorized to refund this booking" });
    }

    // Check if booking is paid
    if (booking.paymentStatus !== "paid") {
      return res.status(400).json({ 
        success: false, 
        message: "Booking must be paid to process refund" 
      });
    }

    // Check if already refunded
    if (booking.refundStatus === "refunded") {
      return res.status(400).json({ 
        success: false, 
        message: "Booking is already refunded" 
      });
    }

    // Process refund
    const refundResult = await processRefund(bookingId, refundReason || "Booking cancelled");

    // Get event details for notification
    const event = await Event.findById(booking.eventId);

    // Create notification for user
    try {
      await Notification.create({
        user: booking.user,
        message: `Refund processed for "${event?.title || 'your booking'}". Amount: ₹${refundResult.refundAmount}`,
        eventId: event?._id,
        bookingId: booking._id,
        type: "refund"
      });
    } catch (notifError) {
      console.error("Failed to create refund notification:", notifError);
    }

    // Create notification for merchant
    try {
      await Notification.create({
        user: booking.merchant || event?.createdBy,
        message: `Refund processed for "${event?.title || 'booking'}". Your earnings adjusted accordingly.`,
        eventId: event?._id,
        bookingId: booking._id,
        type: "refund"
      });
    } catch (notifError) {
      console.error("Failed to create merchant refund notification:", notifError);
    }
    return res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      refund: {
        refundAmount: refundResult.refundAmount,
        refundTransactionId: refundResult.refundTransactionId,
        merchantWalletBalance: refundResult.merchantWalletBalance
      }
    });

  } catch (error) {
    console.error("Refund processing error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process refund",
      error: error.message
    });
  }
};

// Get payment statistics for admin dashboard
export const getPaymentStatistics = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    if (userRole !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    // Get overall payment statistics
    const stats = await Payment.aggregate([
      {
        $facet: {
          successfulPayments: [
            { $match: { paymentStatus: "success" } },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$totalAmount" },
                totalCommission: { $sum: "$adminCommission" },
                totalMerchantPayouts: { $sum: "$merchantAmount" },
                totalTransactions: { $sum: 1 },
                avgTransactionValue: { $avg: "$totalAmount" }
              }
            }
          ],
          refundedPayments: [
            { $match: { paymentStatus: "refunded" } },
            {
              $group: {
                _id: null,
                totalRefunds: { $sum: "$refundAmount" },
                refundCount: { $sum: 1 }
              }
            }
          ],
          monthlyStats: [
            { $match: { paymentStatus: "success" } },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" }
                },
                revenue: { $sum: "$totalAmount" },
                commission: { $sum: "$adminCommission" },
                transactions: { $sum: 1 }
              }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } },
            { $limit: 12 }
          ]
        }
      }
    ]);

    const successStats = stats[0].successfulPayments[0] || {};
    const refundStats = stats[0].refundedPayments[0] || {};
    const monthlyStats = stats[0].monthlyStats || [];

    return res.status(200).json({
      success: true,
      statistics: {
        totalRevenue: successStats.totalRevenue || 0,
        totalCommission: successStats.totalCommission || 0,
        totalMerchantPayouts: successStats.totalMerchantPayouts || 0,
        totalTransactions: successStats.totalTransactions || 0,
        avgTransactionValue: successStats.avgTransactionValue || 0,
        totalRefunds: refundStats.totalRefunds || 0,
        refundCount: refundStats.refundCount || 0,
        monthlyStats
      }
    });

  } catch (error) {
    console.error("Get payment statistics error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment statistics",
      error: error.message
    });
  }
};

// Get merchant earnings and wallet info
export const getMerchantEarnings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Allow merchants to view their own earnings, admins to view any merchant
    let merchantId = userId;
    if (userRole === "admin" && req.params.merchantId) {
      merchantId = req.params.merchantId;
    } else if (userRole !== "merchant" && userRole !== "admin") {
      return res.status(403).json({ success: false, message: "Merchant or admin access required" });
    }

    // Get merchant details
    const merchant = await User.findById(merchantId).select('name email walletBalance totalEarnings');
    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant not found" });
    }

    // Get payment statistics for this merchant
    const earnings = await Payment.aggregate([
      {
        $match: { 
          merchantId: new mongoose.Types.ObjectId(merchantId),
          paymentStatus: "success"
        }
      },
      {
        $facet: {
          totalStats: [
            {
              $group: {
                _id: null,
                totalEarnings: { $sum: "$merchantAmount" },
                totalTransactions: { $sum: 1 },
                avgEarningsPerTransaction: { $avg: "$merchantAmount" }
              }
            }
          ],
          monthlyEarnings: [
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" }
                },
                earnings: { $sum: "$merchantAmount" },
                transactions: { $sum: 1 }
              }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } },
            { $limit: 12 }
          ],
          recentTransactions: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: "bookings",
                localField: "bookingId",
                foreignField: "_id",
                as: "booking"
              }
            },
            {
              $lookup: {
                from: "events",
                localField: "eventId",
                foreignField: "_id",
                as: "event"
              }
            }
          ]
        }
      }
    ]);

    const totalStats = earnings[0].totalStats[0] || {};
    const monthlyEarnings = earnings[0].monthlyEarnings || [];
    const recentTransactions = earnings[0].recentTransactions || [];

    return res.status(200).json({
      success: true,
      merchant: {
        id: merchant._id,
        name: merchant.name,
        email: merchant.email
      },
      earnings: {
        walletBalance: merchant.walletBalance || 0,
        lifetimeEarnings: merchant.totalEarnings || 0,
        totalEarnings: totalStats.totalEarnings || 0,
        totalTransactions: totalStats.totalTransactions || 0,
        avgEarningsPerTransaction: totalStats.avgEarningsPerTransaction || 0,
        monthlyEarnings,
        recentTransactions: recentTransactions.map(tx => ({
          transactionId: tx.transactionId,
          amount: tx.merchantAmount,
          totalAmount: tx.totalAmount,
          commission: tx.adminCommission,
          date: tx.createdAt,
          eventTitle: tx.event[0]?.title || "Unknown Event",
          bookingId: tx.bookingId
        }))
      }
    });

  } catch (error) {
    console.error("Get merchant earnings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch merchant earnings",
      error: error.message
    });
  }
};

// Get all payments (admin only)
export const getAllPayments = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    if (userRole !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { page = 1, limit = 20, status, merchantId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {};
    if (status) {
      query.paymentStatus = status;
    }
    if (merchantId) {
      query.merchantId = merchantId;
    }

    const payments = await Payment.find(query)
      .populate('userId', 'name email')
      .populate('merchantId', 'name email businessName')
      .populate({
        path: 'bookingId',
        select: 'eventTitle ticketType ticketCount'
      })
      .populate({
        path: 'eventId',
        select: 'title category date location'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    return res.status(200).json({
      success: true,
      payments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalPayments: total,
        hasNext: skip + payments.length < total,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error("Get all payments error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message
    });
  }
};

// Get user's payments with optional status filter
export const getUserPayments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;

    // Cast to ObjectId for reliable matching
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // ── 1. Fetch from Payment collection ──────────────────────────────────
    const paymentQuery = { userId: userObjectId };
    if (status && status !== 'all') {
      if (['success', 'pending', 'failed', 'refunded'].includes(status)) {
        paymentQuery.paymentStatus = status;
      }
    }

    const paymentRecords = await Payment.find(paymentQuery)
      .populate('eventId', 'title eventType date location')
      .populate('bookingId', 'serviceTitle serviceCategory eventDate serviceType bookingStatus eventType')
      .sort({ createdAt: -1 })
      .limit(200);

    // Track which bookingIds already have a Payment record
    const coveredBookingIds = new Set(
      paymentRecords
        .filter(p => p.bookingId)
        .map(p => String(p.bookingId._id || p.bookingId))
    );

    // ── 2. Fetch paid bookings that have NO Payment record ─────────────────
    const bookingQuery = { user: userObjectId, paymentStatus: "paid" };
    // Map frontend status filter to booking paymentStatus
    if (status && status !== 'all') {
      if (status === 'success') bookingQuery.paymentStatus = 'paid';
      else if (status === 'pending') bookingQuery.paymentStatus = 'pending';
      else if (status === 'failed') bookingQuery.paymentStatus = 'failed';
      else if (status === 'refunded') bookingQuery.paymentStatus = 'refunded';
    } else {
      // "all" — include all payment statuses from bookings
      delete bookingQuery.paymentStatus;
      bookingQuery.paymentStatus = { $in: ['paid', 'partial_paid', 'pending', 'refunded', 'failed'] };
    }

    const paidBookings = await Booking.find(bookingQuery)
      .populate('eventId', 'title eventType date location')
      .sort({ createdAt: -1 })
      .limit(200);

    // ── 3. Build synthetic payment objects from bookings without Payment records ──
    const bookingFallbacks = paidBookings
      .filter(b => !coveredBookingIds.has(String(b._id)))
      .map(b => {
        const bo = b.toObject();
        const amount = bo.finalAmount || bo.totalPrice || bo.servicePrice || 0;
        const eventName = bo.eventId?.title || bo.serviceTitle || "Event";
        const eventType = bo.eventType || bo.eventId?.eventType || bo.serviceCategory || "full-service";
        // Map booking paymentStatus to Payment paymentStatus values
        const statusMap = { paid: 'success', partial_paid: 'pending', pending: 'pending', refunded: 'refunded', failed: 'failed' };
        return {
          _id: bo._id, // use booking _id as row key
          bookingId: bo,
          eventId: bo.eventId || null,
          userId: bo.user,
          totalAmount: amount,
          paymentStatus: statusMap[bo.paymentStatus] || 'pending',
          paymentMethod: bo.paymentMethod || 'Manual',
          transactionId: bo.paymentId || `BKG-${String(bo._id).slice(-8).toUpperCase()}`,
          paymentGateway: 'manual',
          description: `Payment for ${eventName}`,
          createdAt: bo.paymentDate || bo.updatedAt || bo.createdAt,
          // Flattened helpers
          eventName,
          eventType,
          eventDate: bo.eventId?.date || bo.eventDate,
          _fromBooking: true,
        };
      });

    // ── 4. Enhance Payment records with event/booking name ─────────────────
    const enhancedPayments = paymentRecords.map(payment => {
      const p = payment.toObject();
      if (p.eventId) {
        p.eventName = p.eventId.title;
        p.eventType = p.eventId.eventType;
        p.eventDate = p.eventId.date;
      } else if (p.bookingId) {
        p.eventName = p.bookingId.serviceTitle;
        p.eventType = p.bookingId.eventType || p.bookingId.serviceCategory || p.bookingId.serviceType;
        p.eventDate = p.bookingId.eventDate;
      }
      if (!p.eventName) p.eventName = p.description?.replace(/^Payment for\s*/i, '') || "Event";
      return p;
    });

    // ── 5. Merge, deduplicate, sort ────────────────────────────────────────
    const allPayments = [...enhancedPayments, ...bookingFallbacks]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      payments: allPayments,
      count: allPayments.length
    });

  } catch (error) {
    console.error("Get user payments error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user payments",
      error: error.message
    });
  }
};

// Get payment details by payment ID
export const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.userId;
    // Find payment and verify ownership
    const payment = await Payment.findOne({ 
      _id: paymentId,
      userId
    })
    .populate('eventId')
    .populate('merchantId', 'name email')
    .populate('bookingId');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found or access denied"
      });
    }
    // Get booking details if available
    let bookingDetails = null;
    if (payment.bookingId) {
      bookingDetails = await Booking.findById(payment.bookingId._id)
        .populate('serviceId');
    }
    
    // Get event details if available
    let eventDetails = null;
    if (payment.eventId) {
      eventDetails = await Event.findById(payment.eventId._id);
    }
    
    // Build receipt data
    const receiptData = {
      payment: payment.toObject(),
      booking: bookingDetails ? bookingDetails.toObject() : null,
      event: eventDetails ? eventDetails.toObject() : null,
      merchant: payment.merchantId,
      formattedData: {
        transactionId: payment.transactionId,
        amount: new Intl.NumberFormat('en-IN', { 
          style: 'currency', 
          currency: 'INR' 
        }).format(payment.totalAmount),
        date: new Date(payment.createdAt).toLocaleString('en-IN'),
        status: payment.paymentStatus.toUpperCase()
      }
    };
    
    return res.status(200).json({
      success: true,
      payment: receiptData
    });
    
  } catch (error) {
    console.error("Get payment details error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment details",
      error: error.message
    });
  }
};