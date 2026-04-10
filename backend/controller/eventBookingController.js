import { Booking } from "../models/bookingSchema.js";
import { Event } from "../models/eventSchema.js";
import { Notification } from "../models/notificationSchema.js";
import { Coupon } from "../models/couponSchema.js";
import { v4 as uuidv4 } from "uuid";
import NotificationService from "../services/notificationService.js";

// Generic create booking endpoint that routes to appropriate handler
export const createBooking = async (req, res) => {
  try {
    const { eventId, quantity } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required"
      });
    }
    // Find the event to determine type
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }
    // Route to appropriate handler based on event type
    if (event.eventType === "full-service") {
      // For full-service events, we need additional fields
      const { serviceDate, notes, guestCount, couponCode } = req.body;
      req.body = { eventId, serviceDate, notes, guestCount, couponCode };
      return createFullServiceBooking(req, res);
    } else if (event.eventType === "ticketed") {
      // For ticketed events, use default ticket type if not specified
      const { ticketType, paymentMethod, couponCode } = req.body;
      req.body = { 
        eventId, 
        ticketType: ticketType || (event.ticketTypes && event.ticketTypes[0]?.name), 
        quantity: quantity || 1,
        paymentMethod: paymentMethod || "Cash",
        couponCode
      };
      return createTicketedBooking(req, res);
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid event type"
      });
    }

  } catch (error) {
    console.error("❌ Create booking error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create booking"
    });
  }
};

// Create booking for full-service events (requires merchant approval)
export const createFullServiceBooking = async (req, res) => {
  try {
    
    const { eventId, serviceDate, notes, guestCount, couponCode } = req.body;
    const userId = req.user.userId || req.user._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required"
      });
    }

    // Fetch user data for customer information
    const { User } = await import("../models/userSchema.js");
    const user = await User.findById(userId).select("name email");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }


    // Find the event
    const event = await Event.findById(eventId).populate("createdBy", "name email");
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    // Verify it's a full-service event
    if (event.eventType !== "full-service") {
      return res.status(400).json({ 
        success: false, 
        message: "This endpoint is only for full-service events" 
      });
    }
    // Calculate pricing with coupon if provided
    const originalAmount = event.price || 0;
    let discountAmount = 0;
    let finalAmount = originalAmount;
    let couponId = null;

    if (couponCode) {
      // Find and validate coupon
      const coupon = await Coupon.findOne({ 
        code: couponCode.toUpperCase(),
        isActive: true 
      });

      if (!coupon) {
        return res.status(400).json({
          success: false,
          message: "Invalid coupon code"
        });
      }

      // Check if coupon is expired
      if (new Date() > coupon.expiryDate) {
        return res.status(400).json({
          success: false,
          message: "Coupon has expired"
        });
      }

      // Check usage limit
      if (coupon.usedCount >= coupon.usageLimit) {
        return res.status(400).json({
          success: false,
          message: "Coupon usage limit exceeded"
        });
      }

      // Check minimum amount
      if (originalAmount < coupon.minAmount) {
        return res.status(400).json({
          success: false,
          message: `Minimum order amount of ₹${coupon.minAmount} required`
        });
      }

      // Check if user has already used this coupon
      const existingUsage = coupon.usageHistory.find(
        usage => usage.user.toString() === userId.toString()
      );

      if (existingUsage) {
        return res.status(400).json({
          success: false,
          message: "You have already used this coupon"
        });
      }

      // Calculate discount
      if (coupon.discountType === "percentage") {
        discountAmount = (originalAmount * coupon.discountValue) / 100;
        
        // Apply maximum discount cap if specified
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
          discountAmount = coupon.maxDiscount;
        }
      } else if (coupon.discountType === "flat") {
        discountAmount = coupon.discountValue;
        
        // Ensure discount doesn't exceed total amount
        if (discountAmount > originalAmount) {
          discountAmount = originalAmount;
        }
      }

      // Round discount to 2 decimal places
      discountAmount = Math.round(discountAmount * 100) / 100;
      finalAmount = originalAmount - discountAmount;
      couponId = coupon._id;
    }

    // Create booking with pending status
    const bookingData = {
      user: userId,
      merchant: event.createdBy._id,
      type: "event",
      eventType: "full-service",
      eventId: eventId,
      eventTitle: event.title,
      eventCategory: event.category,
      eventPrice: event.price,
      eventLocation: event.location || "Location TBD",
      eventTime: event.time || "06:00 PM",
      // Store customer information for easy access
      attendeeName: user.name || "Unknown User",
      attendeeEmail: user.email || "No email",
      serviceDate: serviceDate ? new Date(serviceDate) : (event.date || new Date()),
      serviceTime: "10:00 AM", // Default time, merchant can adjust
      bookingDate: new Date(),
      eventDate: event.date || new Date(),
      notes: notes || "",
      guestCount: guestCount || 1,
      totalPrice: originalAmount,
      originalAmount: originalAmount,
      discountAmount: discountAmount,
      finalAmount: finalAmount,
      couponCode: couponCode ? couponCode.toUpperCase() : null,
      couponId: couponId,
      bookingStatus: "pending", // Full-service starts as pending
      status: "pending", // IMPORTANT: Full-service bookings start as pending
      paymentStatus: "pending", // Payment pending until merchant approves
      rating: null,
      review: null
    };


    const booking = await Booking.create(bookingData);

    // If coupon was used, update coupon usage
    if (couponCode && couponId) {
      await Coupon.findByIdAndUpdate(couponId, {
        $inc: { usedCount: 1 },
        $push: {
          usageHistory: {
            user: userId,
            booking: booking._id,
            usedAt: new Date(),
            discountAmount: discountAmount
          }
        }
      });
    }
    // Create notification for merchant
    try {
      await Notification.create({
        user: event.createdBy._id,
        message: `New service booking request for "${event.title}" from ${req.user.name || "User"}`,
        eventId: event._id,
        bookingId: booking._id,
        type: "booking"
      });
    } catch (notifError) {
      console.error("⚠️ Failed to create notification:", notifError);
    }

    // Notify all admins about new booking
    try {
      await NotificationService.notifyAllAdmins(
        `New booking for "${event.title}" — ₹${bookingData.totalPrice || 0}`,
        "booking",
        "low",
        null,
        booking._id
      );
    } catch (notifErr) {
      console.error("Failed to notify admin of new booking:", notifErr);
    }
    return res.status(201).json({
      success: true,
      message: "Service booking request sent to merchant",
      booking: {
        ...booking.toObject(),
        merchantName: event.createdBy.name
      }
    });

  } catch (error) {
    console.error("❌ Create full service booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create booking request"
    });
  }
};

// Create booking for ticketed events (immediate confirmation after payment)
export const createTicketedBooking = async (req, res) => {
  try {
    const { eventId, ticketType, quantity, paymentMethod, couponCode } = req.body;
    const userId = req.user.userId || req.user._id;
    // Validate quantity
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket quantity"
      });
    }

    // Fetch user data for customer information
    const { User } = await import("../models/userSchema.js");
    const user = await User.findById(userId).select("name email");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }


    // Find the event
    const event = await Event.findById(eventId).populate("createdBy", "name email");
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // Verify it's a ticketed event
    if (event.eventType !== "ticketed") {
      return res.status(400).json({ 
        success: false, 
        message: "This endpoint is only for ticketed events" 
      });
    }

    // Find the specific ticket type
    const selectedTicketType = event.ticketTypes.find(t => t.name === ticketType);
    if (!selectedTicketType) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket type selected"
      });
    }

    // Check ticket availability (account for both sold and reserved tickets)
    const reservedQuantity = selectedTicketType.quantityReserved || 0;
    const totalQuantity = selectedTicketType.quantityTotal || selectedTicketType.quantity || 0;
    const soldQuantity = selectedTicketType.quantitySold || 0;
    const availableQuantity = totalQuantity - soldQuantity - reservedQuantity;
    
    if (availableQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: `${ticketType} tickets are sold out`
      });
    }

    if (quantity > availableQuantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${availableQuantity} ${ticketType} tickets available`
      });
    }

    // Calculate pricing with coupon if provided
    const originalAmount = selectedTicketType.price * quantity;
    let discountAmount = 0;
    let finalAmount = originalAmount;
    let couponId = null;

    if (couponCode) {
      // Find and validate coupon
      const coupon = await Coupon.findOne({ 
        code: couponCode.toUpperCase(),
        isActive: true 
      });

      if (!coupon) {
        return res.status(400).json({
          success: false,
          message: "Invalid coupon code"
        });
      }

      // Check if coupon is expired
      if (new Date() > coupon.expiryDate) {
        return res.status(400).json({
          success: false,
          message: "Coupon has expired"
        });
      }

      // Check usage limit
      if (coupon.usedCount >= coupon.usageLimit) {
        return res.status(400).json({
          success: false,
          message: "Coupon usage limit exceeded"
        });
      }

      // Check minimum amount
      if (originalAmount < coupon.minAmount) {
        return res.status(400).json({
          success: false,
          message: `Minimum order amount of ₹${coupon.minAmount} required`
        });
      }

      // Check if user has already used this coupon
      const existingUsage = coupon.usageHistory.find(
        usage => usage.user.toString() === userId.toString()
      );

      if (existingUsage) {
        return res.status(400).json({
          success: false,
          message: "You have already used this coupon"
        });
      }

      // Calculate discount
      if (coupon.discountType === "percentage") {
        discountAmount = (originalAmount * coupon.discountValue) / 100;
        
        // Apply maximum discount cap if specified
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
          discountAmount = coupon.maxDiscount;
        }
      } else if (coupon.discountType === "flat") {
        discountAmount = coupon.discountValue;
        
        // Ensure discount doesn't exceed total amount
        if (discountAmount > originalAmount) {
          discountAmount = originalAmount;
        }
      }

      // Round discount to 2 decimal places
      discountAmount = Math.round(discountAmount * 100) / 100;
      finalAmount = originalAmount - discountAmount;
      couponId = coupon._id;
    }

    // Generate payment and ticket IDs
    const paymentId = `PAY_${uuidv4().substring(0, 8).toUpperCase()}`;
    const ticketId = `TKT_${uuidv4().substring(0, 8).toUpperCase()}`;

    // Reserve tickets (don't update sold count until payment is confirmed)
    // Add reserved field to track pending bookings
    if (!selectedTicketType.quantityReserved) {
      selectedTicketType.quantityReserved = 0;
    }
    selectedTicketType.quantityReserved += quantity;
    
    // Ensure we have quantityTotal field (migrate from old quantity field if needed)
    if (!selectedTicketType.quantityTotal && selectedTicketType.quantity) {
      selectedTicketType.quantityTotal = selectedTicketType.quantity;
    }
    
    // Recalculate total available tickets (subtract both sold and reserved)
    event.availableTickets = event.ticketTypes.reduce((total, ticket) => {
      const reserved = ticket.quantityReserved || 0;
      const totalQty = ticket.quantityTotal || ticket.quantity || 0;
      const sold = ticket.quantitySold || 0;
      return total + (totalQty - sold - reserved);
    }, 0);
    
    // Save the event with updated reservation counts
    await event.save();
    // Create confirmed booking with pending payment (user needs to pay)
    const booking = await Booking.create({
      user: userId,
      merchant: event.createdBy._id,
      type: "event",
      eventType: "ticketed",
      eventId: eventId,
      eventTitle: event.title,
      eventCategory: event.category,
      eventLocation: event.location || "Location TBD",
      eventDate: event.date || new Date(),
      eventTime: event.time || "06:00 PM",
      // Store customer information for easy access
      attendeeName: user.name || "Unknown User",
      attendeeEmail: user.email || "No email",
      ticketType: ticketType,
      ticketCount: quantity,
      bookingDate: new Date(),
      totalPrice: originalAmount,
      originalAmount: originalAmount,
      discountAmount: discountAmount,
      finalAmount: finalAmount,
      couponCode: couponCode ? couponCode.toUpperCase() : null,
      couponId: couponId,
      bookingStatus: "confirmed", // Automatically confirmed for ticketed events
      status: "pending", // Will be completed after payment
      paymentStatus: "pending", // User needs to pay
      paymentId: paymentId,
      paymentAmount: finalAmount, // Use final amount for payment
      paymentMethod: paymentMethod || "Card",
      ticketId: ticketId,
      ticketGenerated: false, // Will be true after payment
      rating: null,
      review: null
    });

    // If coupon was used, update coupon usage
    if (couponCode && couponId) {
      await Coupon.findByIdAndUpdate(couponId, {
        $inc: { usedCount: 1 },
        $push: {
          usageHistory: {
            user: userId,
            booking: booking._id,
            usedAt: new Date(),
            discountAmount: discountAmount
          }
        }
      });
    }

    // Create notification for user using NotificationService
    try {
      await NotificationService.notifyBookingCreated(
        userId,
        booking._id,
        event.title
      );
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }


    // Notify all admins about new ticketed booking
    try {
      await NotificationService.notifyAllAdmins(
        `New ticket booking for "${event.title}" — ₹${finalAmount}`,
        "booking",
        "low",
        null,
        booking._id
      );
    } catch (notifErr) {
      console.error("Failed to notify admin of ticketed booking:", notifErr);
    }

    return res.status(201).json({
      success: true,
      message: "Ticket booking created successfully. Please complete payment.",
      booking: {
        ...booking.toObject(),
        merchantName: event.createdBy.name
      },
      ticketDetails: {
        ticketId,
        paymentId,
        eventTitle: event.title,
        eventDate: event.date,
        location: event.location,
        ticketType,
        quantity,
        originalAmount,
        discountAmount,
        finalAmount,
        couponApplied: !!couponCode
      }
    });

  } catch (error) {
    console.error("Create ticketed booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create ticket booking"
    });
  }
};

// Get available ticket types for an event
export const getEventTicketTypes = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (event.eventType !== "ticketed") {
      return res.status(400).json({
        success: false,
        message: "This event does not have ticket types"
      });
    }

    const ticketTypesWithAvailability = event.ticketTypes.map(ticket => {
      const totalQty = ticket.quantityTotal || ticket.quantity || 0;
      const sold = ticket.quantitySold || 0;
      const reserved = ticket.quantityReserved || 0;
      
      return {
        name: ticket.name,
        price: ticket.price,
        quantityTotal: totalQty,
        quantitySold: sold,
        quantityReserved: reserved,
        quantityAvailable: totalQty - sold - reserved
      };
    });

    return res.status(200).json({
      success: true,
      ticketTypes: ticketTypesWithAvailability,
      eventDetails: {
        title: event.title,
        date: event.date,
        location: event.location
      }
    });

  } catch (error) {
    console.error("Get ticket types error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch ticket types"
    });
  }
};

// Approve full-service booking (merchant only)
export const approveFullServiceBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const merchantId = req.user.userId;
    // Find the booking
    const booking = await Booking.findById(bookingId).populate("user", "name email");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify merchant owns this booking
    if (String(booking.merchant) !== String(merchantId)) {
      return res.status(403).json({
        success: false,
        message: "You can only approve your own event bookings"
      });
    }

    // Verify it's a full-service booking
    if (booking.eventType !== "full-service") {
      return res.status(400).json({
        success: false,
        message: "Only full-service bookings require approval"
      });
    }

    // Update booking status
    booking.bookingStatus = "confirmed";
    await booking.save();

    // Create notification for user
    try {
      await Notification.create({
        user: booking.user._id,
        message: `Your service booking for "${booking.eventTitle}" has been approved. Please proceed to payment.`,
        eventId: booking.eventId,
        bookingId: booking._id,
        type: "booking_approved"
      });
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }
    return res.status(200).json({
      success: true,
      message: "Booking approved successfully",
      booking
    });

  } catch (error) {
    console.error("Approve booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve booking"
    });
  }
};

// Reject full-service booking (merchant only)
export const rejectFullServiceBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const merchantId = req.user.userId;
    // Find the booking
    const booking = await Booking.findById(bookingId).populate("user", "name email");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify merchant owns this booking
    if (String(booking.merchant) !== String(merchantId)) {
      return res.status(403).json({
        success: false,
        message: "You can only reject your own event bookings"
      });
    }

    // Update booking status
    booking.bookingStatus = "cancelled";
    if (reason) {
      booking.review = `Rejection reason: ${reason}`;
    }
    await booking.save();

    // Create notification for user
    try {
      await Notification.create({
        user: booking.user._id,
        message: `Your service booking for "${booking.eventTitle}" has been rejected. ${reason ? `Reason: ${reason}` : ''}`,
        eventId: booking.eventId,
        bookingId: booking._id,
        type: "booking_cancelled"
      });
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }
    return res.status(200).json({
      success: true,
      message: "Booking rejected successfully",
      booking
    });

  } catch (error) {
    console.error("Reject booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject booking"
    });
  }
};

// Get merchant's service requests (full-service bookings only)
export const getMerchantServiceRequests = async (req, res) => {
  try {
    const merchantId = req.user.userId;
    const bookings = await Booking.find({
      merchant: merchantId,
      eventType: "full-service",
      type: "event"
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      bookings
    });

  } catch (error) {
    console.error("Get service requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch service requests"
    });
  }
};

// Update event (merchant only)
export const updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const merchantId = req.user.userId;
    const { title, description, category, location, date, time, price, ticketTypes, features } = req.body;
    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // Verify merchant owns this event
    if (String(event.createdBy) !== String(merchantId)) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own events"
      });
    }

    // Update basic fields
    if (title) event.title = title;
    if (description !== undefined) event.description = description;
    if (category) event.category = category;
    if (location !== undefined) event.location = location;
    if (date) event.date = new Date(date);
    if (time !== undefined) event.time = time;

    // Handle event type specific updates
    if (event.eventType === "full-service") {
      if (price !== undefined) event.price = Number(price) || 0;
      if (features) {
        event.features = Array.isArray(features) ? features : JSON.parse(features);
      }
    } else if (event.eventType === "ticketed") {
      if (ticketTypes) {
        const parsedTicketTypes = Array.isArray(ticketTypes) ? ticketTypes : JSON.parse(ticketTypes);
        
        // Update ticket types while preserving sold quantities
        parsedTicketTypes.forEach(newTicket => {
          const existingTicket = event.ticketTypes.find(t => t.name === newTicket.name);
          if (existingTicket) {
            // Update price and quantity, keep sold count
            existingTicket.price = Number(newTicket.price) || existingTicket.price;
            existingTicket.quantityTotal = Number(newTicket.quantityTotal) || existingTicket.quantityTotal;
            // quantitySold remains unchanged
          } else {
            // Add new ticket type
            event.ticketTypes.push({
              name: newTicket.name,
              price: Number(newTicket.price) || 0,
              quantityTotal: Number(newTicket.quantityTotal) || 0,
              quantitySold: 0
            });
          }
        });

        // Remove ticket types that are no longer in the update
        const newTicketNames = parsedTicketTypes.map(t => t.name);
        event.ticketTypes = event.ticketTypes.filter(ticket => 
          newTicketNames.includes(ticket.name)
        );

        // Recalculate total and available tickets
        event.totalTickets = event.ticketTypes.reduce((total, ticket) => {
          return total + ticket.quantityTotal;
        }, 0);
        
        event.availableTickets = event.ticketTypes.reduce((total, ticket) => {
          return total + (ticket.quantityTotal - ticket.quantitySold);
        }, 0);
      }
    }

    // Save the updated event
    await event.save();
    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event
    });

  } catch (error) {
    console.error("Update event error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update event"
    });
  }
};

// Accept booking (merchant only) - for full-service events
export const acceptBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.userId;
    const booking = await Booking.findById(id).populate("user", "name email");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify merchant owns this booking
    if (String(booking.merchant) !== String(merchantId)) {
      return res.status(403).json({
        success: false,
        message: "You can only accept your own bookings"
      });
    }

    // Only pending bookings can be accepted
    if (booking.bookingStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending bookings can be accepted"
      });
    }

    booking.bookingStatus = "confirmed";
    booking.status = "processing";
    await booking.save();

    // Create notification for user
    try {
      const { Notification } = await import("../models/notificationSchema.js");
      await Notification.create({
        user: booking.user._id,
        message: `Your booking for "${booking.eventTitle}" has been accepted. Please proceed to payment.`,
        eventId: booking.eventId,
        bookingId: booking._id,
        type: "booking_approved"
      });
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }
    return res.status(200).json({
      success: true,
      message: "Booking accepted successfully",
      booking
    });

  } catch (error) {
    console.error("Accept booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept booking"
    });
  }
};

// Reject booking (merchant only) - for full-service events
export const rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const merchantId = req.user.userId;
    const booking = await Booking.findById(id).populate("user", "name email");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify merchant owns this booking
    if (String(booking.merchant) !== String(merchantId)) {
      return res.status(403).json({
        success: false,
        message: "You can only reject your own bookings"
      });
    }

    // Only pending bookings can be rejected
    if (booking.bookingStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending bookings can be rejected"
      });
    }

    booking.bookingStatus = "cancelled";
    if (reason) {
      booking.review = `Rejection reason: ${reason}`;
    }
    await booking.save();

    // Create notification for user
    try {
      const { Notification } = await import("../models/notificationSchema.js");
      await Notification.create({
        user: booking.user._id,
        message: `Your booking for "${booking.eventTitle}" has been rejected. ${reason ? `Reason: ${reason}` : ''}`,
        eventId: booking.eventId,
        bookingId: booking._id,
        type: "booking_cancelled"
      });
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }
    return res.status(200).json({
      success: true,
      message: "Booking rejected successfully",
      booking
    });

  } catch (error) {
    console.error("Reject booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject booking"
    });
  }
};

// Complete booking (merchant only)
export const completeBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.userId;
    const booking = await Booking.findById(id).populate("user", "name email");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify merchant owns this booking
    if (String(booking.merchant) !== String(merchantId)) {
      return res.status(403).json({
        success: false,
        message: "You can only complete your own bookings"
      });
    }

    // Only confirmed and paid bookings can be completed
    if (booking.bookingStatus !== "confirmed" || booking.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed and paid bookings can be completed"
      });
    }

    booking.bookingStatus = "completed";
    booking.status = "completed";
    await booking.save();

    // Create notification for user
    try {
      const { Notification } = await import("../models/notificationSchema.js");
      await Notification.create({
        user: booking.user._id,
        message: `Your event "${booking.eventTitle}" has been completed. You can now rate and review this event.`,
        eventId: booking.eventId,
        bookingId: booking._id,
        type: "booking_completed"
      });
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }
    return res.status(200).json({
      success: true,
      message: "Booking completed successfully",
      booking
    });

  } catch (error) {
    console.error("Complete booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete booking"
    });
  }
};

// Process payment for booking
export const processPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.userId;
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify user owns this booking
    if (String(booking.user) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "You can only pay for your own bookings"
      });
    }

    // Only pending payments can be processed
    if (booking.paymentStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This booking has already been paid"
      });
    }

    booking.paymentStatus = "paid";
    booking.paymentDate = new Date();
    await booking.save();

    // Notify USER — payment confirmed
    try {
      await NotificationService.notifyPaymentReceived(
        booking.user,
        booking._id,
        booking.finalAmount || booking.totalPrice,
        booking.eventTitle || booking.serviceTitle || "Event"
      );
    } catch (notifErr) {
      console.error("Failed to notify user of payment:", notifErr);
    }

    // Notify MERCHANT — payment received
    try {
      if (booking.merchant) {
        await NotificationService.notifyMerchantPaymentReceived(
          booking.merchant,
          booking._id,
          booking.finalAmount || booking.totalPrice,
          booking.eventTitle || booking.serviceTitle || "Event"
        );
      }
    } catch (notifErr) {
      console.error("Failed to notify merchant of payment:", notifErr);
    }

    // Notify admin
    try {
      await NotificationService.notifyAllAdmins(
        `Payment of ₹${booking.finalAmount || booking.totalPrice} received for "${booking.eventTitle || 'Event'}"`,
        "payment", "medium", null, booking._id
      );
    } catch (notifErr) {
      console.error("Failed to notify admin of payment:", notifErr);
    }
    return res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      booking
    });

  } catch (error) {
    console.error("Process payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process payment"
    });
  }
};

// Add rating and review to booking
export const addRating = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.userId;
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify user owns this booking
    if (String(booking.user) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "You can only rate your own bookings"
      });
    }

    // Only completed and paid bookings can be rated
    // For ticketed events: just need to be paid (auto-completed after payment)
    // For full-service events: need to be completed by merchant AND paid
    const canRate = booking.paymentStatus === "paid" && 
      (booking.eventType === "ticketed" || booking.status === "completed");
    
    if (!canRate) {
      return res.status(400).json({
        success: false,
        message: booking.eventType === "ticketed" 
          ? "Only paid ticketed bookings can be rated"
          : "Only completed and paid bookings can be rated"
      });
    }

    // Check if already rated
    if (booking.rating && booking.rating.score) {
      return res.status(400).json({
        success: false,
        message: "This booking has already been rated"
      });
    }

    booking.rating = {
      score: rating,
      review: review || null
    };
    await booking.save();

    // Also create a record in Review collection and sync Event.rating from it
    try {
      const { Review } = await import("../models/reviewSchema.js");
      await Review.findOneAndUpdate(
        { user: userId, event: booking.eventId },
        { rating, reviewText: review || "" },
        { upsert: true, new: true }
      );
      // Recalculate Event.rating from Review collection as source of truth
      const allReviews = await Review.find({ event: booking.eventId });
      const avg = allReviews.length > 0
        ? Math.round((allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length) * 10) / 10
        : 0;
      const { Event } = await import("../models/eventSchema.js");
      await Event.findByIdAndUpdate(booking.eventId, {
        $set: { "rating.average": avg, "rating.totalRatings": allReviews.length }
      });
    } catch (reviewError) {
      console.error("Failed to create review record:", reviewError);
    }
    return res.status(200).json({
      success: true,
      message: "Rating added successfully",
      booking
    });

  } catch (error) {
    console.error("Add rating error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add rating"
    });
  }
};

// Get all bookings for merchant with ratings (CONFIRMED BOOKINGS)
export const getMerchantBookings = async (req, res) => {
  try {
    const merchantId = req.user.userId;
    // Get confirmed bookings: completed + paid (includes both full-service and ticketed)
    const bookings = await Booking.find({
      merchant: merchantId,
      type: "event",
      $or: [
        // Ticketed events: automatically completed after payment
        { eventType: "ticketed", paymentStatus: "paid" },
        // Full-service events: completed by merchant + paid
        { eventType: "full-service", bookingStatus: "completed", paymentStatus: "paid" }
      ]
    })
      .populate("user", "name email")
      .populate("eventId", "title date location time")
      .sort({ createdAt: -1 });
    // Format bookings with complete data
    const formattedBookings = bookings.map((booking) => {
      const bookingObj = booking.toObject();
      
      return {
        ...bookingObj,
        // Use booking fields first, then fall back to populated event data
        eventTitle: bookingObj.eventTitle || booking.eventId?.title || "Event",
        eventDate: bookingObj.eventDate || booking.eventId?.date,
        eventLocation: bookingObj.eventLocation || booking.eventId?.location || "Location TBD",
        eventTime: bookingObj.eventTime || booking.eventId?.time || "Time TBD",
        
        // Customer information
        customerName: bookingObj.attendeeName || booking.user?.name || "Unknown Customer",
        customerEmail: bookingObj.attendeeEmail || booking.user?.email || "No email",
        
        // Rating information (from booking itself)
        rating: bookingObj.rating || null,
        review: bookingObj.review || null,
        isRated: bookingObj.isRated || false,
        
        // Ensure all status fields are present
        bookingStatus: bookingObj.bookingStatus || "pending",
        paymentStatus: bookingObj.paymentStatus || "pending",
        status: bookingObj.status || "pending",
        
        // Event type for conditional logic
        eventType: bookingObj.eventType || "full-service",
        
        // Pricing information
        totalPrice: bookingObj.totalPrice || bookingObj.finalAmount || 0,
        finalAmount: bookingObj.finalAmount || bookingObj.totalPrice || 0,
        
        // Booking metadata
        bookingDate: bookingObj.bookingDate,
        paymentDate: bookingObj.paymentDate,
        createdAt: bookingObj.createdAt,
        updatedAt: bookingObj.updatedAt
      };
    });
    // Debug: Log first booking to verify data structure
    if (formattedBookings.length > 0) {
    }

    return res.status(200).json({
      success: true,
      bookings: formattedBookings
    });

  } catch (error) {
    console.error("Get merchant confirmed bookings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch confirmed bookings"
    });
  }
};

// Get user bookings
export const getBookingsByUserId = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const bookings = await Booking.find({
      user: userId,
      type: "event"
    })
      .populate("merchant", "name email")
      .populate("eventId", "eventType title") // Populate event details including eventType
      .sort({ createdAt: -1 });
    // Format bookings with additional info
    const formattedBookings = bookings.map(booking => {
      const bookingObj = booking.toObject();
      
      // Ensure eventType is set from the populated event if missing
      if (!bookingObj.eventType && bookingObj.eventId?.eventType) {
        bookingObj.eventType = bookingObj.eventId.eventType;
      }
      
      return {
        ...bookingObj,
        canPay: booking.bookingStatus === "confirmed" && booking.paymentStatus !== "paid",
        isConfirmed: booking.bookingStatus === "confirmed" && booking.paymentStatus === "paid",
        merchantName: booking.merchant?.name || "Unknown Merchant"
      };
    });

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

// Update booking status (merchant only) - for three-button system
export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const merchantId = req.user.userId;
    // Validate status
    const validStatuses = ["pending", "processing", "completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: pending, processing, completed"
      });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId).populate("user", "name email");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify merchant owns this booking
    if (String(booking.merchant) !== String(merchantId)) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own event bookings"
      });
    }

    // Update booking status
    booking.status = status;
    await booking.save();

    // Create notification for user based on status
    let notificationMessage = "";
    let notificationType = "booking_status_update";

    switch (status) {
      case "pending":
        notificationMessage = `Your booking for "${booking.eventTitle}" is now pending review.`;
        break;
      case "processing":
        notificationMessage = `Your booking for "${booking.eventTitle}" is being processed. Event preparations are underway.`;
        break;
      case "completed":
        notificationMessage = `Your event "${booking.eventTitle}" has been completed. You can now rate and review this event.`;
        notificationType = "booking_completed";
        break;
    }

    // Create notification for user
    try {
      await Notification.create({
        user: booking.user._id,
        message: notificationMessage,
        eventId: booking.eventId,
        bookingId: booking._id,
        type: notificationType
      });
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }
    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${status} successfully`,
      booking
    });

  } catch (error) {
    console.error("Update booking status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update booking status"
    });
  }
};

// Mark booking as completed (merchant only)
export const markBookingCompleted = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const merchantId = req.user.userId;
    // Find the booking
    const booking = await Booking.findById(bookingId).populate("user", "name email");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify merchant owns this booking
    if (String(booking.merchant) !== String(merchantId)) {
      return res.status(403).json({
        success: false,
        message: "You can only complete your own event bookings"
      });
    }

    // Verify booking is in a state that can be completed
    if (booking.bookingStatus !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed bookings can be marked as completed"
      });
    }

    // Update booking status to completed
    booking.bookingStatus = "completed";
    booking.status = "completed";
    await booking.save();

    // Create notification for user
    try {
      await Notification.create({
        user: booking.user._id,
        message: `Your event "${booking.eventTitle}" has been completed. You can now rate and review this event.`,
        eventId: booking.eventId,
        bookingId: booking._id,
        type: "booking_completed"
      });
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }
    return res.status(200).json({
      success: true,
      message: "Booking marked as completed successfully",
      booking
    });

  } catch (error) {
    console.error("Mark booking completed error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark booking as completed"
    });
  }
};

// Get bookings by user ID (for QR codes and admin purposes)
export const getBookingsByUserIdAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.userId || req.user._id;

    // Only allow users to access their own bookings or admin access
    if (userId !== requestingUserId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }
    const bookings = await Booking.find({
      user: userId,
      type: "event"
    })
      .populate("merchant", "name email")
      .sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      bookings: bookings
    });

  } catch (error) {
    console.error("Get bookings by user ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings"
    });
  }
};

// Cancel booking and release reserved tickets
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.userId || req.user._id;
    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify the booking belongs to the user
    if (String(booking.user) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Not authorized to cancel this booking" });
    }

    // Check if booking can be cancelled
    if (booking.paymentStatus === "paid") {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot cancel paid booking. Please request a refund instead." 
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ 
        success: false, 
        message: "Booking is already cancelled" 
      });
    }

    // For ticketed events, release reserved tickets
    if (booking.eventType === "ticketed" && booking.ticketType && booking.ticketCount) {
      const event = await Event.findById(booking.eventId);
      if (event) {
        const ticketType = event.ticketTypes.find(t => t.name === booking.ticketType);
        if (ticketType) {
          // Release reserved tickets
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
    }

    // Update booking status
    await Booking.findByIdAndUpdate(bookingId, {
      status: "cancelled",
      bookingStatus: "cancelled",
      cancelledAt: new Date(),
      cancelReason: "User cancelled"
    });

    // Create notification for user
    try {
      await Notification.create({
        user: booking.user,
        message: `Your booking for "${booking.eventTitle || 'Event'}" has been cancelled successfully.`,
        eventId: booking.eventId,
        bookingId: booking._id,
        type: "booking_cancelled"
      });
    } catch (notifError) {
      console.error("Failed to create cancellation notification:", notifError);
    }

    // Notify merchant about cancellation
    if (booking.merchant) {
      try {
        await Notification.create({
          user: booking.merchant,
          message: `Booking for "${booking.eventTitle || 'Event'}" has been cancelled by the customer.`,
          eventId: booking.eventId,
          bookingId: booking._id,
          type: "booking_cancelled"
        });
      } catch (notifError) {
        console.error("Failed to create merchant cancellation notification:", notifError);
      }
    }
    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      bookingId: bookingId
    });

  } catch (error) {
    console.error("Cancel booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
      error: error.message
    });
  }
};

// Cleanup expired reservations (should be called periodically)
export const cleanupExpiredReservations = async () => {
  try {
    // Find bookings that are pending payment for more than 30 minutes
    const expirationTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    
    const expiredBookings = await Booking.find({
      eventType: "ticketed",
      paymentStatus: "pending",
      status: "pending",
      createdAt: { $lt: expirationTime }
    });
    for (const booking of expiredBookings) {
      try {
        // Release reserved tickets
        const event = await Event.findById(booking.eventId);
        if (event && booking.ticketType && booking.ticketCount) {
          const ticketType = event.ticketTypes.find(t => t.name === booking.ticketType);
          if (ticketType) {
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

        // Mark booking as expired
        await Booking.findByIdAndUpdate(booking._id, {
          status: "expired",
          bookingStatus: "expired",
          expiredAt: new Date()
        });

        // Create notification for user
        try {
          await Notification.create({
            user: booking.user,
            message: `Your ticket reservation for "${booking.eventTitle || 'Event'}" has expired. Please book again if you still want to attend.`,
            eventId: booking.eventId,
            bookingId: booking._id,
            type: "booking"
          });
        } catch (notifError) {
          console.error("Failed to create expiration notification:", notifError);
        }

      } catch (bookingError) {
        console.error(`Failed to process expired booking ${booking._id}:`, bookingError);
      }
    }
    return expiredBookings.length;

  } catch (error) {
    console.error("Cleanup expired reservations error:", error);
    return 0;
  }
};