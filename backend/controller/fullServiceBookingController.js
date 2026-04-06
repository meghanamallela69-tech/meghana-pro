import { Booking } from "../models/bookingSchema.js";
import { Event } from "../models/eventSchema.js";
import { User } from "../models/userSchema.js";
import { Payment } from "../models/paymentSchema.js";
import NotificationService from "../services/notificationService.js";
import { processPaymentDistribution } from "../services/paymentDistributionService.js";
import { v4 as uuidv4 } from "uuid";

/**
 * STEP 1: User Books Event
 * Creates booking with pending status
 */
export const bookFullServiceEvent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      eventId,
      eventDate,
      eventTime,
      guestCount = 1,
      selectedAddons = [],
      location,
      notes = "",
      totalAmount
    } = req.body;

    // Validate event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // Calculate addon costs
    let addonTotal = 0;
    const processedAddons = selectedAddons.map(addon => {
      const addonCost = addon.price * (addon.quantity || 1);
      addonTotal += addonCost;
      return {
        name: addon.name,
        price: addon.price,
        quantity: addon.quantity || 1,
        total: addonCost
      };
    });

    // Calculate final amount
    const baseAmount = event.price * guestCount;
    const finalAmount = baseAmount + addonTotal;

    // Create booking
    const booking = await Booking.create({
      user: userId,
      serviceId: eventId,
      eventId: eventId,
      serviceTitle: event.title,
      serviceCategory: event.category,
      servicePrice: event.price,
      eventType: "full-service",
      bookingDate: new Date(),
      eventDate: new Date(eventDate),
      eventTime: eventTime,
      guestCount: parseInt(guestCount),
      location: location || event.location,
      notes: notes,
      addons: processedAddons,
      totalPrice: finalAmount,
      finalAmount: finalAmount,
      status: "pending",
      paymentStatus: "pending",
      merchant: event.createdBy,
      advanceRequired: true,
      advancePercentage: 30,
      advanceAmount: Math.round((finalAmount * 30) / 100 * 100) / 100,
      remainingAmount: Math.round((finalAmount * 70) / 100 * 100) / 100
    });

    // Notify merchant about new booking
    await NotificationService.notifyMerchantNewBooking(
      event.createdBy,
      booking._id,
      event.title,
      guestCount
    );

    // Notify user
    await NotificationService.notifyBookingCreated(
      userId,
      booking._id,
      event.title
    );

    res.status(201).json({
      success: true,
      message: "Booking created successfully. Waiting for merchant approval.",
      booking: await booking.populate("merchant", "name email phone")
    });

  } catch (error) {
    console.error("❌ Booking error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * STEP 2: Merchant Requests Advance Payment
 * Updates booking status to advance_requested
 */
export const requestAdvancePayment = async (req, res) => {
  try {
    const merchantId = req.user.userId;
    const { bookingId } = req.params;
    const { message = "" } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify merchant owns this booking
    if (String(booking.merchant) !== String(merchantId)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Can only request advance if booking is pending
    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot request advance. Current status: ${booking.status}`
      });
    }

    // Update booking status
    booking.status = "advance_requested";
    booking.merchantResponse = {
      accepted: true,
      responseDate: new Date(),
      message: message || "Please pay 30% advance to confirm booking"
    };
    await booking.save();

    // Notify user about advance payment request
    await NotificationService.createNotification({
      userId: booking.user,
      message: `Advance payment of ₹${booking.advanceAmount} requested for "${booking.serviceTitle}". Please pay to confirm your booking.`,
      type: "payment_request",
      priority: "high",
      bookingId: booking._id,
      actionUrl: `/dashboard/user/bookings/${booking._id}`,
      actionText: "Pay Now"
    });

    res.json({
      success: true,
      message: "Advance payment requested from user",
      booking
    });

  } catch (error) {
    console.error("❌ Error requesting advance:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * STEP 3: User Pays Advance (30%)
 * Processes advance payment and updates booking
 */
export const payAdvanceAmount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bookingId } = req.params;
    const { paymentMethod = "Card" } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify user owns this booking
    if (String(booking.user) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Check if advance is required and not already paid
    if (!booking.advanceRequired || booking.advancePaid) {
      return res.status(400).json({
        success: false,
        message: "Advance payment not required or already paid"
      });
    }

    // Process advance payment
    const transactionId = `ADV_${uuidv4().substring(0, 12).toUpperCase()}`;

    const paymentResult = await processPaymentDistribution({
      userId: booking.user,
      merchantId: booking.merchant,
      bookingId: booking._id,
      eventId: booking.eventId,
      totalAmount: booking.advanceAmount,
      paymentMethod: paymentMethod,
      transactionId: transactionId,
      description: `Advance payment (30%) for ${booking.serviceTitle}`
    });

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: "Payment processing failed"
      });
    }

    // Update booking
    booking.advancePaid = true;
    booking.advancePaymentDate = new Date();
    booking.status = "advance_paid";
    booking.paymentStatus = "partial_paid";
    await booking.save();

    // Notify merchant about advance payment
    await NotificationService.createNotification({
      userId: booking.merchant,
      message: `Advance payment of ₹${booking.advanceAmount} received for "${booking.serviceTitle}". Please accept the booking to proceed.`,
      type: "payment_received",
      priority: "high",
      bookingId: booking._id,
      actionUrl: `/dashboard/merchant/bookings/${booking._id}`,
      actionText: "Accept Booking"
    });

    // Notify user
    await NotificationService.createNotification({
      userId: booking.user,
      message: `Advance payment of ₹${booking.advanceAmount} confirmed! Waiting for merchant to accept your booking.`,
      type: "payment_received",
      priority: "high",
      bookingId: booking._id
    });

    res.json({
      success: true,
      message: "Advance payment processed successfully",
      booking,
      payment: paymentResult.payment
    });

  } catch (error) {
    console.error("❌ Error processing advance payment:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * STEP 4: Merchant Accepts Booking
 * Updates booking to accepted status
 */
export const acceptBooking = async (req, res) => {
  try {
    const merchantId = req.user.userId;
    const { bookingId } = req.params;
    const { message = "" } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify merchant owns this booking
    if (String(booking.merchant) !== String(merchantId)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Can only accept if advance is paid
    if (booking.status !== "advance_paid") {
      return res.status(400).json({
        success: false,
        message: `Cannot accept booking. Current status: ${booking.status}`
      });
    }

    // Update booking
    booking.status = "accepted";
    booking.merchantResponse = {
      accepted: true,
      responseDate: new Date(),
      message: message || "Booking accepted! We'll see you soon."
    };
    await booking.save();

    // Notify user
    await NotificationService.createNotification({
      userId: booking.user,
      message: `Great! Your booking for "${booking.serviceTitle}" has been accepted. Event date: ${new Date(booking.eventDate).toLocaleDateString()}`,
      type: "booking_approved",
      priority: "high",
      bookingId: booking._id,
      actionUrl: `/dashboard/user/bookings/${booking._id}`,
      actionText: "View Booking"
    });

    res.json({
      success: true,
      message: "Booking accepted successfully",
      booking
    });

  } catch (error) {
    console.error("❌ Error accepting booking:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * STEP 5: Update Booking Status (Processing/Completed)
 * Merchant updates status as event progresses
 */
export const updateBookingStatus = async (req, res) => {
  try {
    const merchantId = req.user.userId;
    const { bookingId } = req.params;
    const { newStatus, message = "" } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify merchant owns this booking
    if (String(booking.merchant) !== String(merchantId)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Validate status transition
    const validStatuses = ["processing", "completed"];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      });
    }

    const oldStatus = booking.status;
    booking.status = newStatus;

    if (newStatus === "completed") {
      booking.completedAt = new Date();
    }

    await booking.save();

    // Notify user about status update
    const statusMessages = {
      processing: "Your event is now in progress!",
      completed: "Your event has been completed. Please pay the remaining amount and rate your experience."
    };

    await NotificationService.createNotification({
      userId: booking.user,
      message: `${statusMessages[newStatus]} ${message ? `- ${message}` : ""}`,
      type: "booking_status_update",
      priority: "medium",
      bookingId: booking._id,
      actionUrl: `/dashboard/user/bookings/${booking._id}`,
      actionText: "View Details"
    });

    res.json({
      success: true,
      message: `Booking status updated to ${newStatus}`,
      booking
    });

  } catch (error) {
    console.error("❌ Error updating booking status:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * STEP 6: User Pays Remaining Amount (70%)
 * After event completion
 */
export const payRemainingAmount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bookingId } = req.params;
    const { paymentMethod = "Card" } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify user owns this booking
    if (String(booking.user) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Check if remaining payment is due
    if (booking.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Booking is already fully paid"
      });
    }

    if (!booking.advancePaid) {
      return res.status(400).json({
        success: false,
        message: "Advance payment must be completed first"
      });
    }

    // Process remaining payment
    const transactionId = `REM_${uuidv4().substring(0, 12).toUpperCase()}`;

    const paymentResult = await processPaymentDistribution({
      userId: booking.user,
      merchantId: booking.merchant,
      bookingId: booking._id,
      eventId: booking.eventId,
      totalAmount: booking.remainingAmount,
      paymentMethod: paymentMethod,
      transactionId: transactionId,
      description: `Remaining payment (70%) for ${booking.serviceTitle}`
    });

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: "Payment processing failed"
      });
    }

    // Update booking
    booking.paymentStatus = "paid";
    booking.status = "completed";
    await booking.save();

    // Notify merchant
    await NotificationService.createNotification({
      userId: booking.merchant,
      message: `Remaining payment of ₹${booking.remainingAmount} received for "${booking.serviceTitle}". Booking is now complete.`,
      type: "payment_received",
      priority: "high",
      bookingId: booking._id
    });

    // Notify user
    await NotificationService.createNotification({
      userId: booking.user,
      message: `Payment complete! Thank you for booking "${booking.serviceTitle}". Please rate your experience.`,
      type: "booking_completed",
      priority: "medium",
      bookingId: booking._id,
      actionUrl: `/dashboard/user/bookings/${booking._id}`,
      actionText: "Rate Event"
    });

    res.json({
      success: true,
      message: "Remaining payment processed successfully",
      booking,
      payment: paymentResult.payment
    });

  } catch (error) {
    console.error("❌ Error processing remaining payment:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get booking details with full workflow info
 */
export const getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.userId;

    const booking = await Booking.findById(bookingId)
      .populate("user", "name email phone")
      .populate("merchant", "name email phone businessName")
      .populate("eventId", "title category price location");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify user has access
    if (String(booking.user._id) !== String(userId) && String(booking.merchant._id) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    res.json({
      success: true,
      booking
    });

  } catch (error) {
    console.error("❌ Error fetching booking:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get user's bookings with workflow status
 */
export const getUserBookingsWithStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, sortBy = "createdAt" } = req.query;

    let query = { user: userId };
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate("merchant", "name email businessName")
      .populate("eventId", "title category price location")
      .sort({ [sortBy]: -1 });

    res.json({
      success: true,
      count: bookings.length,
      bookings
    });

  } catch (error) {
    console.error("❌ Error fetching bookings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get merchant's bookings with workflow status
 */
export const getMerchantBookingsWithStatus = async (req, res) => {
  try {
    const merchantId = req.user.userId;
    const { status, sortBy = "createdAt" } = req.query;

    let query = { merchant: merchantId };
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate("user", "name email phone")
      .populate("eventId", "title category price")
      .sort({ [sortBy]: -1 });

    res.json({
      success: true,
      count: bookings.length,
      bookings
    });

  } catch (error) {
    console.error("❌ Error fetching merchant bookings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
