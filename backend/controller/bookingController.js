import { Booking } from "../models/bookingSchema.js";
import { Event } from "../models/eventSchema.js";
import { Coupon } from "../models/couponSchema.js";
import { CouponUsage } from "../models/couponUsageSchema.js";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { processPaymentDistribution } from "../services/paymentDistributionService.js";
import { Notification } from "../models/notificationSchema.js";

// Helper function to generate ticket
const generateTicket = (booking, eventType) => {
  const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const qrData = JSON.stringify({
    ticketNumber,
    bookingId: booking._id,
    userId: booking.user,
    eventId: booking.serviceId,
    eventType: eventType
  });
  return {
    ticketNumber,
    qrCode: qrData,
    generatedAt: new Date()
  };
};

// Create a new booking
export const createBooking = async (req, res) => {
  try {
    const { 
      userId,
      serviceId, 
      eventId,
      serviceTitle, 
      serviceCategory, 
      servicePrice, 
      eventType,
      eventDate,
      eventTime,
      timeSlot,
      date,
      time,
      location,
      notes,
      guestCount,
      locationType,
      selectedTickets,
      selectedAddOns,
      addons,
      totalAmount,
      discount,
      promoCode,
      status
    } = req.body;

    // Use authenticated user's ID or fall back to provided userId
    const authenticatedUserId = req.user?.userId || userId;
    
    if (!authenticatedUserId) {
      return res.status(401).json({ 
        success: false, 
        message: "User authentication required" 
      });
    }

    // Validate minimum required fields for full-service booking
    if (!serviceId && !eventId) {
      return res.status(400).json({ 
        success: false, 
        message: "Service ID or Event ID is required" 
      });
    }

    // Use eventId as serviceId if provided
    const finalServiceId = serviceId || eventId;

    // Set default category if not provided
    const finalServiceCategory = serviceCategory || "event";

    // Get event details to determine workflow
    const event = await Event.findById(finalServiceId);
    const evtType = eventType || (event?.eventType) || "full-service";

    // Calculate total price and guest count
    let finalTotalPrice = totalAmount || servicePrice || 0;
    let totalGuests = 0;
    
    if (evtType === "ticketed" && selectedTickets) {
      // For ticketed events with multiple ticket types
      totalGuests = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
      
      // Use provided totalAmount or calculate from selectedTickets
      if (!totalAmount && event?.ticketTypes) {
        finalTotalPrice = 0;
        Object.entries(selectedTickets).forEach(([ticketName, quantity]) => {
          const ticketType = event.ticketTypes.find(t => t.name === ticketName);
          if (ticketType) {
            finalTotalPrice += ticketType.price * quantity;
          }
        });
      }
      
      // Apply discount if provided
      if (discount && discount > 0) {
        finalTotalPrice = Math.max(0, finalTotalPrice - discount);
      }
    } else {
      // For full-service events
      totalGuests = parseInt(guestCount) || 1;
      
      // Use provided totalAmount or calculate from base price + addons
      if (!totalAmount && servicePrice) {
        finalTotalPrice = servicePrice * totalGuests;
        
        // Add addon prices
        const addonsArray = selectedAddOns || addons || [];
        if (Array.isArray(addonsArray) && addonsArray.length > 0) {
          addonsArray.forEach(addon => {
            if (addon.price) {
              finalTotalPrice += parseFloat(addon.price);
            }
          });
        }
      }
      
      // Apply discount if provided
      if (discount && discount > 0) {
        finalTotalPrice = Math.max(0, finalTotalPrice - discount);
      }
    }

    // Use eventDate/date and eventTime/time/timeSlot from request
    const finalEventDate = eventDate || date || (event?.date) || new Date();
    const finalEventTime = eventTime || time || timeSlot || (event?.time) || "06:00 PM";

    // Create booking object
    const bookingData = {
      user: authenticatedUserId,
      serviceId: finalServiceId.toString(), // Convert ObjectId to String as per schema
      merchant: event?.createdBy || null, // Set merchant from event creator
      serviceTitle: serviceTitle || "Event Booking",
      serviceCategory: finalServiceCategory,
      servicePrice: servicePrice || 0,
      eventType: evtType,
      eventDate: finalEventDate,
      eventTime: finalEventTime,
      notes: notes || "",
      guestCount: totalGuests,
      totalPrice: finalTotalPrice,
      bookingDate: new Date(),
      status: status || (evtType === "ticketed" ? "pending_payment" : "pending"),
      location: location || (event?.location) || "",
      locationType: locationType || "event",
    };

    // Add event-specific fields
    if (evtType === "ticketed") {
      // Store selected tickets information
      if (selectedTickets) {
        bookingData.selectedTickets = selectedTickets;
      }

      // Store per-type prices from event so frontend always has them
      if (event?.ticketTypes?.length > 0) {
        bookingData.ticketTypePrices = Object.fromEntries(
          event.ticketTypes.map(t => [t.name, t.price])
        );
      }
      
      // Add discount and promo code info (both optional)
      if (discount && discount > 0) {
        bookingData.discount = discount;
        bookingData.discountAmount = discount;
      }
      if (promoCode && promoCode.trim()) {
        bookingData.promoCode = promoCode.trim();
        bookingData.couponCode = promoCode.trim().toUpperCase();
      }
      
      // Set payment status for ticketed events
      bookingData.payment = {
        paid: false,
        amount: finalTotalPrice
      };
    } else {
      // Full service addons - accept both selectedAddOns and addons
      const addonsArray = selectedAddOns || addons || [];
      if (Array.isArray(addonsArray) && addonsArray.length > 0) {
        bookingData.addons = addonsArray;
      } else {
        bookingData.addons = []; // Default empty array
      }
      
      // Set payment object for full-service (schema uses payment.paid, not paymentStatus)
      bookingData.payment = {
        paid: false,
        amount: finalTotalPrice
      };
    }

    // Apply discount to calculate final amount
    if (discount && discount > 0) {
      bookingData.finalAmount = Math.max(0, finalTotalPrice - discount);
    } else {
      bookingData.finalAmount = finalTotalPrice;
    }
    // Validate data types before creating
    // Create booking
    const booking = await Booking.create(bookingData);
    // CRITICAL: Update ticket quantities for ticketed events
    if (evtType === "ticketed" && selectedTickets && finalServiceId) {
      const event = await Event.findById(finalServiceId);
      if (event && event.ticketTypes) {
        let updated = false;
        
        // Loop through all selected tickets and update quantitySold
        Object.entries(selectedTickets).forEach(([ticketName, quantity]) => {
          const ticketType = event.ticketTypes.find(t => t.name === ticketName);
          if (ticketType) {
            const oldSold = ticketType.quantitySold || 0;
            ticketType.quantitySold = oldSold + quantity;
            const totalQty = ticketType.quantityTotal || ticketType.quantity || 0;
            updated = true;
          } else {
          }
        });
        
        if (updated) {
          // Recalculate total available tickets
          const newAvailable = event.ticketTypes.reduce((total, ticket) => {
            const t = ticket.quantityTotal || ticket.quantity || 0;
            const s = ticket.quantitySold || 0;
            return total + (t - s);
          }, 0);
          
          event.availableTickets = newAvailable;
          
          // Fix legacy rating field if stored as number
          if (typeof event.rating !== "object" || event.rating === null) {
            event.rating = { average: 0, totalRatings: 0 };
          }

          await event.save();
        } else {
        }
      } else {
      }
    } else {
    }

    // Track coupon usage if promo code was used
    if (promoCode && promoCode.trim()) {
      try {
        const coupon = await Coupon.findOne({ 
          code: promoCode.trim().toUpperCase(),
          isActive: true 
        });

        if (coupon) {
          // Check if user has already used this specific coupon code
          const existingUsage = await CouponUsage.findOne({
            userId: authenticatedUserId,
            couponId: coupon._id
          });

          if (existingUsage) {
            // We should have caught this in validation, but double-check here
          } else {
            // Update booking with detailed coupon information
            booking.couponCode = coupon.code;
            booking.couponDetails = {
              couponId: coupon._id,
              code: coupon.code,
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
              appliedBy: coupon.createdBy // Merchant who created the coupon
            };
            await booking.save();

            // Record usage in CouponUsage collection (Permanent record)
            await CouponUsage.create({
              userId: authenticatedUserId,
              couponId: coupon._id,
              bookingId: booking._id,
              serviceId: finalServiceId,
              usedAt: new Date(),
              discountAmount: discount || 0
            });

            // Update usage count and history in Coupon model
            coupon.usedCount += 1;
            coupon.usageHistory.push({
              user: authenticatedUserId,
              booking: booking._id,
              usedAt: new Date(),
              discountAmount: discount || 0
            });

            await coupon.save();
          }
        }
      } catch (couponError) {
        console.error("⚠️ Failed to track coupon usage:", couponError.message);
      }
    }

    return res.status(201).json({ 
      success: true, 
      message: "Booking request sent successfully",
      booking,
      eventType: evtType
    });
  } catch (error) {
    console.error("❌ Booking creation error:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
    return res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to create booking" 
    });
  }
};

// Process payment for a booking
export const processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentId, amount } = req.body;
    const userId = req.user.userId;

    const booking = await Booking.findOne({ 
      _id: id, 
      user: userId 
    });

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: "Booking not found" 
      });
    }

    // Check if booking can be paid
    if (booking.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Cannot pay for a rejected booking"
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot pay for a cancelled booking"
      });
    }

    if (booking.payment?.paid) {
      return res.status(400).json({
        success: false,
        message: "Payment already completed"
      });
    }

    // For full-service events, must be accepted or approved first
    if (booking.eventType === "full-service" && !["accepted", "approved"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Booking must be accepted by merchant before payment"
      });
    }

    // Update payment details
    booking.payment = {
      paid: true,
      paymentId: paymentId || `PAY-${Date.now()}`,
      paymentDate: new Date(),
      amount: amount || booking.totalPrice
    };

    // Update status to paid
    booking.status = "paid";

    // Process payment distribution to merchant and admin
    try {
      const event = await Event.findById(booking.serviceId);
      await processPaymentDistribution({
        userId: booking.user,
        merchantId: event ? event.createdBy : booking.merchant,
        bookingId: booking._id,
        eventId: booking.serviceId,
        totalAmount: Number(amount || booking.totalPrice),
        paymentMethod: "Manual",
        transactionId: booking.payment.paymentId,
        paymentGateway: "manual",
        description: `Payment for ${booking.serviceTitle}`, // Changed from "Payment for booking:"
        eventName: event?.title || booking.serviceTitle // Store event name separately
      });
    } catch (distError) {
      console.error("❌ Payment distribution failed:", distError);
    }

    // Generate ticket for ticketed events immediately
    // For full-service, ticket generated after merchant confirms
    if (booking.eventType === "ticketed") {
      // Generate tickets for multiple ticket types
      const ticketInfo = generateTicket(booking, booking.eventType);
      
      // Create ticket summary for multiple types
      let ticketSummary = "";
      if (booking.selectedTickets && Object.keys(booking.selectedTickets).length > 0) {
        const ticketEntries = Object.entries(booking.selectedTickets);
        ticketSummary = ticketEntries.map(([type, qty]) => `${qty}x ${type}`).join(", ");
      } else {
        ticketSummary = `${booking.guestCount}x Standard`;
      }
      
      booking.ticket = {
        ...booking.ticket,
        ...ticketInfo,
        ticketType: ticketSummary
      };
      booking.status = "confirmed";
    }

    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Payment successful",
      booking
    });
  } catch (error) {
    console.error("Payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process payment"
    });
  }
};

// Get all bookings for the logged-in user
export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.userId;
    // Validate userId
    if (!userId) {
      console.error('❌ User ID is missing from token!');
      return res.status(401).json({
        success: false,
        message: "Authentication required - User ID not found in token"
      });
    }
    
    const bookings = await Booking.find({ user: userId })
      .sort({ createdAt: -1 });
    if (bookings.length === 0) {
    } else {
    }

    // Enhance bookings with event data if missing date/time
    const enhancedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const bookingObj = booking.toObject();
        
        // Convert selectedTickets Map to plain object for frontend
        if (bookingObj.selectedTickets instanceof Map) {
          bookingObj.selectedTickets = Object.fromEntries(bookingObj.selectedTickets);
        } else if (!bookingObj.selectedTickets) {
          bookingObj.selectedTickets = {};
        }

        // Convert ticketTypePrices Map to plain object
        if (bookingObj.ticketTypePrices instanceof Map) {
          bookingObj.ticketTypePrices = Object.fromEntries(bookingObj.ticketTypePrices);
        } else if (!bookingObj.ticketTypePrices) {
          bookingObj.ticketTypePrices = {};
        }

        // Build eventTicketTypes from stored prices (most reliable source)
        if (bookingObj.eventType === "ticketed" && Object.keys(bookingObj.ticketTypePrices).length > 0) {
          bookingObj.eventTicketTypes = Object.entries(bookingObj.ticketTypePrices).map(([name, price]) => ({ name, price }));
        }
        
        // Try to get event data to enhance the booking
        const eventLookupId = bookingObj.eventId || bookingObj.serviceId;
        if (eventLookupId) {
          try {
            const event = await Event.findById(eventLookupId);
            if (event) {
              // Update the booking in database with proper date/time if missing
              const updateData = {};
              if (event.date && !bookingObj.eventDate) {
                updateData.eventDate = event.date;
              }
              if (event.time && (!bookingObj.eventTime || bookingObj.eventTime === "TBD")) {
                updateData.eventTime = event.time;
              }

              // Persist ticketTypePrices for existing bookings that don't have them
              if (
                bookingObj.eventType === "ticketed" &&
                event.ticketTypes?.length > 0 &&
                Object.keys(bookingObj.ticketTypePrices || {}).length === 0
              ) {
                const pricesMap = {};
                event.ticketTypes.forEach(t => { pricesMap[t.name] = t.price; });
                updateData.ticketTypePrices = pricesMap;
                // Also update in-memory so frontend gets it immediately
                bookingObj.ticketTypePrices = pricesMap;
              }
              
              if (Object.keys(updateData).length > 0) {
                await Booking.findByIdAndUpdate(booking._id, updateData);
                Object.assign(bookingObj, updateData);
              }
              
              // Add event images to the booking object for frontend
              bookingObj.eventImages = event.images || [];
              bookingObj.eventImage = event.images && event.images.length > 0 ? event.images[0].url : null;

              // Always build eventTicketTypes from live event data (most accurate)
              if (event.ticketTypes?.length > 0) {
                bookingObj.eventTicketTypes = event.ticketTypes.map(t => ({
                  name: t.name,
                  price: t.price,
                }));
              }
            } else {
              // Event not found for booking — skip silently
            }
          } catch (error) {
            console.error(`Error enhancing booking ${booking._id}:`, error.message);
          }
        }

        // Final fallback: build eventTicketTypes from ticketTypePrices if event lookup failed
        if (
          bookingObj.eventType === "ticketed" &&
          !bookingObj.eventTicketTypes?.length &&
          Object.keys(bookingObj.ticketTypePrices || {}).length > 0
        ) {
          bookingObj.eventTicketTypes = Object.entries(bookingObj.ticketTypePrices).map(([name, price]) => ({ name, price }));
        }
        
        // Ensure advance payment fields are always present
        bookingObj.advanceRequired = bookingObj.advanceRequired || false;
        bookingObj.advancePercentage = bookingObj.advancePercentage || 0;
        bookingObj.advanceAmount = bookingObj.advanceAmount || 0;
        bookingObj.advancePaid = bookingObj.advancePaid || false;
        bookingObj.remainingAmount = bookingObj.remainingAmount || 0;
        
        return bookingObj;
      })
    );

    return res.status(200).json({ 
      success: true, 
      bookings: enhancedBookings
    });
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch bookings" 
    });
  }
};

// Get single booking by ID
export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const booking = await Booking.findOne({ 
      _id: id, 
      user: userId 
    });

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: "Booking not found" 
      });
    }

    return res.status(200).json({ 
      success: true, 
      booking 
    });
  } catch (error) {
    console.error("Fetch booking error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch booking" 
    });
  }
};

// Cancel a booking
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const booking = await Booking.findOne({ 
      _id: id, 
      user: userId 
    });

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: "Booking not found" 
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ 
        success: false, 
        message: "Booking is already cancelled" 
      });
    }

    if (booking.status === "completed") {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot cancel a completed booking" 
      });
    }

    booking.status = "cancelled";
    await booking.save();

    return res.status(200).json({ 
      success: true, 
      message: "Booking cancelled successfully",
      booking 
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to cancel booking" 
    });
  }
};

// Get all bookings (Admin only)
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ 
      success: true, 
      bookings 
    });
  } catch (error) {
    console.error("Fetch all bookings error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch bookings" 
    });
  }
};

// Update booking status (Admin/Merchant only)
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;

    const validStatuses = [
      "pending", 
      "approved", 
      "pending_payment", 
      "accepted", 
      "rejected", 
      "paid", 
      "confirmed", 
      "processing", 
      "cancelled", 
      "completed"
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid status" 
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: "Booking not found" 
      });
    }

    // Update status
    booking.status = status;
    
    // If merchant provides a message
    if (message) {
      booking.merchantResponse = {
        ...booking.merchantResponse,
        message,
        responseDate: new Date()
      };
    }

    await booking.save();

    // Create notification for the customer
    try {
      await Notification.create({
        user: booking.user, // Fixed: was 'recipient'
        sender: req.user.userId,
        type: "booking_update",
        title: "Booking Status Updated",
        message: `Your booking for "${booking.serviceTitle}" is now ${status.replace("_", " ")}.`,
        link: `/dashboard/customer/bookings/${booking._id}`,
        bookingId: booking._id
      });
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }

    return res.status(200).json({ 
      success: true, 
      message: `Booking status updated to ${status}`,
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

// Approve a booking (Merchant only)
export const approveBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: "Booking not found" 
      });
    }

    // For full-service, move to pending_payment after approval
    // For ticketed, it might already be pending_payment, but let's standardize
    booking.status = "approved";
    booking.merchantResponse = {
      accepted: true,
      message: message || "Your booking has been approved. Please proceed with the payment.",
      responseDate: new Date()
    };

    await booking.save();

    // Notify customer to pay
    try {
      await Notification.create({
        user: booking.user, // Fixed: was 'recipient'
        sender: req.user.userId,
        type: "booking_approved",
        title: "Booking Approved",
        message: `Your booking for "${booking.serviceTitle}" has been approved. Please proceed to payment.`,
        link: `/dashboard/customer/bookings/${booking._id}`,
        bookingId: booking._id
      });
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }

    return res.status(200).json({ 
      success: true, 
      message: "Booking approved. Customer notified to pay.",
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

// ==================== MERCHANT BOOKING MANAGEMENT ====================

// Get all bookings for merchant's events
export const getMerchantBookings = async (req, res) => {
  try {
    const merchantId = req.user.userId;
    
    // Get all events created by this merchant
    const merchantEvents = await Event.find({ createdBy: merchantId }).select('_id');
    const eventIds = merchantEvents.map(e => e._id.toString());

    // Get bookings for these events
    const bookings = await Booking.find({ 
      serviceId: { $in: eventIds }
    })
    .populate("user", "name email phone")
    .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error("Fetch merchant bookings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings"
    });
  }
};

// Merchant accept/reject booking
export const respondToBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, message } = req.body; // action: "accept" or "reject"
    const merchantId = req.user.userId;

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Use 'accept' or 'reject'"
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    // Verify this booking belongs to merchant's event
    const event = await Event.findOne({ 
      _id: booking.serviceId,
      createdBy: merchantId 
    });

    if (!event && booking.merchant?.toString() !== merchantId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to manage this booking"
      });
    }

    // Only allow response for full-service events in pending status
    if (booking.eventType !== "full-service") {
      return res.status(400).json({
        success: false,
        message: "This action is only for full-service events"
      });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot ${action} booking with status: ${booking.status}`
      });
    }

    // Update booking
    booking.status = action === "accept" ? "accepted" : "rejected";
    booking.merchantResponse = {
      accepted: action === "accept",
      responseDate: new Date(),
      message: message || null
    };

    await booking.save();

    return res.status(200).json({
      success: true,
      message: `Booking ${action}ed successfully`,
      booking
    });
  } catch (error) {
    console.error("Respond to booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to respond to booking"
    });
  }
};

// Merchant confirm booking after payment (generate ticket for full-service)
export const confirmBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.userId;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    // Verify this booking belongs to merchant's event
    const event = await Event.findOne({ 
      _id: booking.serviceId,
      createdBy: merchantId 
    });

    if (!event) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to manage this booking"
      });
    }

    // Only confirm paid bookings
    if (booking.status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Booking must be paid before confirmation"
      });
    }

    // Generate ticket
    booking.ticket = {
      ...booking.ticket,
      ...generateTicket(booking, booking.eventType)
    };
    booking.status = "confirmed";

    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking confirmed and ticket generated",
      booking
    });
  } catch (error) {
    console.error("Confirm booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to confirm booking"
    });
  }
};

// Mark booking as completed (after event date)
export const completeBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const booking = await Booking.findOne({
      _id: id,
      user: userId
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    if (booking.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed bookings can be marked as completed"
      });
    }

    booking.status = "completed";
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking marked as completed",
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

// Merchant update booking status (pending, processing, completed)
export const merchantUpdateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;
    const merchantId = req.user.userId;

    // Validate status
    const validStatuses = ["pending", "processing", "completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be: pending, processing, or completed"
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    // Verify this booking belongs to merchant's event or service
    // Some bookings might not have a direct event link, so check both
    const event = await Event.findOne({ 
      _id: booking.serviceId,
      createdBy: merchantId 
    });

    if (!event && booking.merchant?.toString() !== merchantId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this booking"
      });
    }

    // Update status
    booking.status = status;
    booking.bookingStatus = status; // keep both fields in sync
    
    // Optional merchant message
    if (message) {
      booking.merchantResponse = {
        ...booking.merchantResponse,
        message,
        responseDate: new Date()
      };
    }
    
    await booking.save();

    // Notify user — especially important when status = "completed" (pay remaining)
    let notifMessage = `Your booking "${booking.serviceTitle}" status is now: ${status}.`;
    if (status === "completed") {
      notifMessage = `Your event "${booking.serviceTitle}" is complete! Please pay the remaining amount of ₹${booking.remainingAmount || 0} to finalise.`;
    } else if (status === "processing") {
      notifMessage = `Your event "${booking.serviceTitle}" is now in progress!`;
    }

    // Notify customer
    try {
      await Notification.create({
        user: booking.user,
        sender: merchantId,
        type: "booking_status_update",
        title: "Booking Status Update",
        message: notifMessage,
        bookingId: booking._id
      });
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }

    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}`,
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

// Submit rating and review for completed booking
export const submitRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { score, review } = req.body;
    const userId = req.user.userId;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating score must be between 1 and 5"
      });
    }

    const booking = await Booking.findOne({
      _id: id,
      user: userId
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    if (booking.status !== "completed" && booking.bookingStatus !== "completed" && booking.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Can only rate completed and fully paid events"
      });
    }

    if (booking.rating?.score) {
      return res.status(400).json({
        success: false,
        message: "You have already rated this event"
      });
    }

    booking.rating = {
      score,
      review: review || "",
      createdAt: new Date()
    };

    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Rating submitted successfully",
      booking
    });
  } catch (error) {
    console.error("Submit rating error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit rating"
    });
  }
};

// Request advance payment (Merchant action)
export const requestAdvancePayment = async (req, res) => {
  try {
    const { id } = req.params; // Changed from bookingId to match router
    const { advancePercentage = 30 } = req.body; // Default 30%
    const merchantId = req.user.userId;
    // Validate MongoDB ObjectId format
    if (!id || id.length < 24) {
      console.error('❌ Invalid booking ID format:', id);
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID format"
      });
    }
    
    // First, just try to find ANY booking with this ID (no populate)
    let booking;
    try {
      booking = await Booking.findById(id);
    } catch (dbError) {
      console.error('❌ Database error:', dbError.message);
      return res.status(503).json({
        success: false,
        message: "Database connection failed. Please check MongoDB Atlas connection."
      });
    }
    if (booking) {
      // CRITICAL: Check if merchant field matches requesting merchant
      const bookingMerchantId = booking.merchant?.toString();
      if (!bookingMerchantId) {
        console.error('⚠️ WARNING: Booking has NO merchant field! This booking cannot be processed.');
        console.error('Booking details:', {
          _id: booking._id,
          serviceId: booking.serviceId,
          serviceTitle: booking.serviceTitle,
          merchant: booking.merchant
        });
        
        // Try to recover by finding the event/service and getting its creator
        try {
          const Event = mongoose.model('Event');
          const event = await Event.findById(booking.serviceId);
          if (event && event.createdBy) {
            // Note: We don't auto-fix here to avoid data integrity issues, just log it
          } else {
            console.error('❌ Cannot recover: Event not found or has no creator');
          }
        } catch (recoverError) {
          console.error('Recovery attempt failed:', recoverError.message);
        }
        
        return res.status(404).json({
          success: false,
          message: "Booking not found - missing merchant association. Please contact support."
        });
      }
    } else {
      console.error('❌ Booking truly does not exist in database!');
      console.error('🔍 Double-check: Is this the correct booking ID?');
      console.error('🔍 Try creating a new booking first, then request advance.');
      return res.status(404).json({
        success: false,
        message: "Booking not found - it does not exist in the database"
      });
    }

    // Now populate serviceId if it exists
    let eventCreatedBy = null;
    
    // Try method 1: Direct population
    if (booking.serviceId) {
      try {
        const populatedService = await Booking.findById(bookingId).populate("serviceId", "createdBy");
        eventCreatedBy = populatedService.serviceId?.createdBy;
        if (eventCreatedBy) {
        }
      } catch (popError) {
        console.error('Failed to populate serviceId:', popError.message);
      }
    } else {
    }
    
    // Try method 2: Query Event collection directly
    if (!eventCreatedBy && booking.serviceId) {
      try {
        const Event = mongoose.model('Event');
        const event = await Event.findById(booking.serviceId).select('createdBy');
        if (event && event.createdBy) {
          eventCreatedBy = event.createdBy;
        }
      } catch (directError) {
        console.error('Direct Event query failed:', directError.message);
      }
    }
    
    // Fallback to merchant field
    if (!eventCreatedBy && booking.merchant) {
      eventCreatedBy = booking.merchant;
    }
    if (!eventCreatedBy) {
      console.error('❌ Cannot determine event owner. Booking data:', {
        _id: booking._id,
        serviceId: booking.serviceId || 'null',
        merchant: booking.merchant || 'null',
        serviceTitle: booking.serviceTitle
      });
      return res.status(400).json({
        success: false,
        message: "Booking has no associated event or merchant. This booking may be corrupted. Please delete and recreate the booking."
      });
    }

    // Verify merchant owns this event
    if (String(eventCreatedBy) !== String(merchantId)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to manage this booking - you did not create this event"
      });
    }

    // Only for full-service events
    if (booking.eventType !== "full-service") {
      return res.status(400).json({
        success: false,
        message: "Advance payment only applicable for full-service events. This is a " + booking.eventType + " event."
      });
    }

    // Calculate advance amount
    const totalPrice = booking.totalPrice || booking.finalAmount || booking.servicePrice;
    const advanceAmount = (totalPrice * advancePercentage) / 100;
    const remainingAmount = totalPrice - advanceAmount;

    // Update booking
    booking.advanceRequired = true;
    booking.advanceAmount = advanceAmount;
    booking.advancePercentage = advancePercentage;
    booking.remainingAmount = remainingAmount;
    booking.status = "awaiting_advance";
    
    await booking.save();

    // Create notification for user
    try {
      await Notification.create({
        userId: booking.user,
        title: "Advance Payment Required",
        message: `Merchant has requested an advance payment of ₹${advanceAmount} (${advancePercentage}%) for your booking "${booking.serviceTitle}". Please pay the advance to confirm your booking.`,
        type: "payment",
        bookingId: booking._id
      });
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }
    return res.status(200).json({
      success: true,
      message: "Advance payment request sent to customer",
      booking: {
        _id: booking._id,
        status: booking.status,
        advanceRequired: booking.advanceRequired,
        advanceAmount: booking.advanceAmount,
        advancePercentage: booking.advancePercentage,
        remainingAmount: booking.remainingAmount,
        totalPrice: booking.totalPrice
      }
    });
  } catch (error) {
    console.error("Request advance payment error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.code
    });
    return res.status(500).json({
      success: false,
      message: "Failed to request advance payment: " + error.message,
      error: error.name
    });
  }
};

// Pay advance (User action)
export const payAdvance = async (req, res) => {
  try {
    const { id } = req.params; // Changed from bookingId to match router
    const { paymentMethod, paymentAmount } = req.body;
    const userId = req.user.userId;
    // Find booking
    const booking = await Booking.findById(id);
    
    if (!booking) {
      console.error('❌ Booking not found:', id);
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }
    // Verify user owns this booking
    if (String(booking.user) !== String(userId)) {
      console.error('❌ User mismatch. Booking user:', booking.user, 'Token user:', userId);
      return res.status(403).json({
        success: false,
        message: "Not authorized to pay for this booking"
      });
    }

    // Check if advance is required
    if (!booking.advanceRequired) {
      console.error('❌ Advance not required for this booking');
      return res.status(400).json({
        success: false,
        message: "Advance payment not required for this booking"
      });
    }

    // Check if already paid
    if (booking.advancePaid) {
      console.error('❌ Advance already paid');
      return res.status(400).json({
        success: false,
        message: "Advance payment already completed"
      });
    }

    // For advance payment, always use the stored advanceAmount
    // Frontend may or may not send paymentAmount - we use backend's value
    const actualAdvanceAmount = Number(booking.advanceAmount);
    // No validation needed - we trust the backend's stored advanceAmount
    // If frontend sends amount, we can log it but won't validate against it
    if (paymentAmount !== undefined && paymentAmount !== null) {
    }

    // Generate payment ID
    const paymentId = `ADV_PAY_${uuidv4().substring(0, 8).toUpperCase()}`;
    // Update booking with advance payment - use backend's stored amount
    booking.advancePaid = true;
    booking.advancePaymentDate = new Date();
    booking.paymentStatus = "partial_paid";
    // Auto-confirm booking after advance payment — no manual merchant approval needed
    booking.status = "confirmed";
    booking.bookingConfirmed = true;
    booking.merchantResponse = {
      accepted: true,
      responseDate: new Date(),
      message: "Booking auto-confirmed after advance payment."
    };
    booking.payment = {
      paid: true,
      paymentId: paymentId,
      paymentDate: new Date(),
      amount: actualAdvanceAmount
    };
    await booking.save();

    // Notify merchant — advance received, booking confirmed
    try {
      await NotificationService.notifyMerchantPaymentReceived(
        booking.merchant,
        booking._id,
        actualAdvanceAmount,
        booking.serviceTitle
      );
    } catch (notifError) {
      console.error("Failed to notify merchant:", notifError);
    }

    // Notify user — booking confirmed
    try {
      await NotificationService.notifyBookingConfirmed(
        booking.user,
        booking._id,
        booking.serviceTitle
      );
    } catch (notifError) {
      console.error("Failed to notify user:", notifError);
    }

    return res.status(200).json({
      success: true,
      message: "Advance payment successful! Your booking is confirmed. Pay the remaining amount after the event.",
      paymentId: paymentId,
      booking: {
        _id: booking._id,
        status: booking.status,
        advancePaid: booking.advancePaid,
        paymentStatus: booking.paymentStatus,
        remainingAmount: booking.remainingAmount
      }
    });
  } catch (error) {
    console.error("❌ Pay advance error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to process advance payment" + (error.message ? `: ${error.message}` : "")
    });
  }
};

// Accept/Reject booking after advance payment (Merchant action)
export const acceptRejectBooking = async (req, res) => {
  try {
    const { id } = req.params; // Changed from bookingId to match router
    const { accepted, message } = req.body;
    const merchantId = req.user.userId;
    if (typeof accepted !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "Accepted field must be a boolean"
      });
    }

    // Find booking
    const booking = await Booking.findById(id).populate("serviceId", "createdBy");
    
    if (!booking) {
      console.error('❌ Booking not found:', id);
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }
    // Verify merchant owns this event - check both merchant field and serviceId.createdBy
    const bookingMerchantId = booking.merchant?.toString();
    const serviceCreatorId = booking.serviceId?.createdBy?.toString();
    
    if (bookingMerchantId !== String(merchantId) && serviceCreatorId !== String(merchantId)) {
      console.error('❌ Merchant not authorized. Expected:', bookingMerchantId || serviceCreatorId, 'Got:', merchantId);
      return res.status(403).json({
        success: false,
        message: "Not authorized to manage this booking"
      });
    }

    // Check if advance was paid
    if (!booking.advancePaid) {
      return res.status(400).json({
        success: false,
        message: "Cannot accept/reject booking before advance payment"
      });
    }

    // Update booking
    booking.merchantResponse = {
      accepted: accepted,
      responseDate: new Date(),
      message: message || ""
    };

    if (accepted) {
      booking.status = "confirmed";
      booking.bookingConfirmed = true;
      
      // Create notification for user
      try {
        await Notification.create({
          userId: booking.user,
          title: "Booking Confirmed!",
          message: `Your booking "${booking.serviceTitle}" has been confirmed by the merchant. You can pay the remaining amount of ₹${booking.remainingAmount}.`,
          type: "booking",
          bookingId: booking._id
        });
      } catch (notifError) {
        console.error("Failed to create notification:", notifError);
      }
    } else {
      booking.status = "rejected";
      booking.bookingConfirmed = false;
      
      // TODO: Process refund for advance payment (if needed in future)
      
      // Create notification for user
      try {
        await Notification.create({
          userId: booking.user,
          title: "Booking Rejected",
          message: `Your booking "${booking.serviceTitle}" was rejected by the merchant. ${message ? 'Reason: ' + message : ''} The advance amount will be refunded.`,
          type: "booking",
          bookingId: booking._id
        });
      } catch (notifError) {
        console.error("Failed to create notification:", notifError);
      }
    }

    await booking.save();

    return res.status(200).json({
      success: true,
      message: `Booking ${accepted ? 'accepted' : 'rejected'} successfully`,
      booking: {
        _id: booking._id,
        status: booking.status,
        bookingConfirmed: booking.bookingConfirmed,
        merchantResponse: booking.merchantResponse
      }
    });
  } catch (error) {
    console.error("Accept/reject booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process booking acceptance"
    });
  }
};

// Pay remaining amount (User action - optional final payment)
export const payRemainingAmount = async (req, res) => {
  try {
    const { id } = req.params; // Changed from bookingId to match router
    const { paymentMethod, paymentAmount } = req.body;
    const userId = req.user.userId;
    // Find booking
    const booking = await Booking.findById(id);
    
    if (!booking) {
      console.error('❌ Booking not found:', id);
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }
    // Verify user owns this booking
    if (String(booking.user) !== String(userId)) {
      console.error('❌ User mismatch. Booking user:', booking.user, 'Token user:', userId);
      return res.status(403).json({
        success: false,
        message: "Not authorized to pay for this booking"
      });
    }

    // Check if advance was paid (required before paying remaining)
    if (!booking.advancePaid) {
      console.error('❌ Advance not paid yet');
      return res.status(400).json({
        success: false,
        message: "Advance payment must be completed first"
      });
    }

    // Check if there's actually a remaining amount to pay
    if (!booking.remainingAmount || booking.remainingAmount <= 0) {
      console.error('❌ No remaining amount to pay');
      return res.status(400).json({
        success: false,
        message: "No remaining amount to pay - booking is fully paid"
      });
    }

    // Already fully paid
    if (booking.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Booking is already fully paid"
      });
    }

    // Remaining payment is only allowed after booking is confirmed or merchant marks complete
    if (!['confirmed', 'completed', 'advance_paid', 'processing'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Remaining payment is only available after the booking is confirmed"
      });
    }

    const actualRemainingAmount = Number(booking.remainingAmount);
    const paymentId = `REM_PAY_${uuidv4().substring(0, 8).toUpperCase()}`;

    // Mark fully paid and completed
    booking.paymentStatus = "paid";
    booking.status = "completed";
    booking.payment = {
      ...booking.payment,
      paid: true,
      paymentId: paymentId,
      paymentDate: new Date(),
      amount: Number(booking.payment?.amount || 0) + actualRemainingAmount
    };
    await booking.save();

    // Process full payment distribution
    try {
      const { processPaymentDistribution } = await import('../services/paymentDistributionService.js');
      const { Event } = await import('../models/eventSchema.js');
      const event = await Event.findById(booking.serviceId);
      await processPaymentDistribution({
        userId: booking.user,
        merchantId: event ? event.createdBy : booking.merchant,
        bookingId: booking._id,
        eventId: booking.serviceId,
        totalAmount: Number(booking.totalPrice || booking.finalAmount),
        paymentMethod: 'Manual',
        transactionId: paymentId,
        paymentGateway: 'manual',
        description: `Full payment for: ${booking.serviceTitle}`
      });
    } catch (distErr) {
      console.error("Payment distribution failed:", distErr.message);
    }

    // Notify merchant
    try {
      await NotificationService.notifyMerchantPaymentReceived(
        booking.merchant,
        booking._id,
        actualRemainingAmount,
        booking.serviceTitle
      );
    } catch {}

    // Notify user
    try {
      await NotificationService.notifyBookingCompleted(booking.user, booking._id, booking.serviceTitle);
    } catch {}

    return res.status(200).json({
      success: true,
      message: "Final payment successful! Your booking is complete.",
      paymentId: paymentId,
      booking: {
        _id: booking._id,
        status: booking.status,
        paymentStatus: booking.paymentStatus
      }
    });
  } catch (error) {
    console.error("❌ Pay remaining amount error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to process final payment" + (error.message ? `: ${error.message}` : "")
    });
  }
};

// Get merchant advance requests (bookings awaiting advance or advance paid)
export const getMerchantAdvanceRequests = async (req, res) => {
  try {
    const merchantId = req.user.userId;
    // Get all events created by this merchant
    const merchantEvents = await Event.find({ createdBy: merchantId }).select('_id');
    const eventIds = merchantEvents.map(ev => ev._id.toString());
    // Get ALL bookings for these events (not filtering by status for debugging)
    const allBookings = await Booking.find({
      serviceId: { $in: eventIds }
    })
    .populate('user', 'name email phone')
    .sort({ createdAt: -1 });
    // Filter to only those in advance workflow
    const bookings = allBookings.filter(b => 
      b.eventType === 'full-service' && 
      ['pending', 'awaiting_advance', 'advance_paid'].includes(b.status)
    );
    // Log booking IDs for debugging
    bookings.forEach(b => {
    });

    return res.status(200).json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error("Get merchant advance requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch advance requests"
    });
  }
};

// Validate ticket for merchant
export const validateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const merchantId = req.user.userId;
    if (!ticketId || ticketId.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Ticket ID is required"
      });
    }

    // Check if ticketId is a valid ObjectId or a ticket number
    const isValidObjectId = mongoose.Types.ObjectId.isValid(ticketId);

    // Find booking by ticket number or _id
    let query;
    if (isValidObjectId) {
      // If it's a valid ObjectId, search by both _id and ticketNumber
      query = {
        $or: [
          { _id: ticketId },
          { "ticket.ticketNumber": ticketId.toUpperCase() }
        ]
      };
    } else {
      // If it's not a valid ObjectId, only search by ticketNumber
      query = {
        "ticket.ticketNumber": ticketId.toUpperCase()
      };
    }

    const booking = await Booking.findOne(query)
      .populate("user", "name email phone")
      .populate("serviceId", "title category eventType");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }
    // Verify this booking belongs to merchant's event
    // Use the populated serviceId if available, otherwise use the string ID
    let eventId = booking.serviceId?._id || booking.serviceId;
    const event = await Event.findOne({
      _id: eventId,
      createdBy: merchantId
    });

    if (!event) {
      return res.status(403).json({
        success: false,
        message: "Not authorized - this ticket does not belong to your event"
      });
    }

    // Validate the ticket
    const isUsed = booking.ticket?.isUsed || false;
    const usedAt = booking.ticket?.usedAt;
    const ticketNumber = booking.ticket?.ticketNumber;

    // Compute ticket summary from selectedTickets map
    const selectedTicketsObj = booking.selectedTickets instanceof Map
      ? Object.fromEntries(booking.selectedTickets)
      : (booking.selectedTickets || {});
    const ticketEntries = Object.entries(selectedTicketsObj).filter(([, v]) => Number(v) > 0);
    const totalQty = ticketEntries.length > 0
      ? ticketEntries.reduce((s, [, v]) => s + Number(v), 0)
      : (booking.ticket?.quantity || booking.guestCount || 1);
    const ticketTypeSummary = ticketEntries.length > 0
      ? ticketEntries.map(([type, qty]) => `${qty}× ${type}`).join(', ')
      : (typeof booking.ticket?.ticketType === 'string' ? booking.ticket.ticketType : 'Standard');

    if (isUsed) {
      return res.status(200).json({
        success: false,
        alreadyUsed: true,
        message: "Ticket has already been used",
        booking: {
          ticketNumber,
          userName: booking.user?.name || "Unknown",
          userEmail: booking.user?.email || "",
          userPhone: booking.user?.phone || "",
          eventTitle: event.title || booking.serviceTitle,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          totalPrice: booking.totalPrice,
          finalAmount: booking.finalAmount,
          quantity: totalQty,
          ticketType: ticketTypeSummary,
          usedAt,
        }
      });
    }

    // Mark ticket as used
    booking.ticket.isUsed = true;
    booking.ticket.usedAt = new Date();
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Ticket validated successfully",
      booking: {
        ticketNumber,
        userName: booking.user?.name || "Unknown",
        userEmail: booking.user?.email || "",
        userPhone: booking.user?.phone || "",
        eventTitle: event.title || booking.serviceTitle,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalPrice: booking.totalPrice,
        finalAmount: booking.finalAmount,
        quantity: totalQty,
        ticketType: ticketTypeSummary,
        validatedAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error("Validate ticket error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to validate ticket",
      error: error.message
    });
  }
};

// Validate all tickets for a specific booking (for merchants)
export const validateBookingTickets = async (req, res) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.userId;
    // Find booking
    const booking = await Booking.findById(id)
      .populate("user", "name email")
      .populate("serviceId", "title category eventType");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    // Verify this booking belongs to merchant's event
    let eventId = booking.serviceId?._id || booking.serviceId;
    const event = await Event.findOne({
      _id: eventId,
      createdBy: merchantId
    });

    if (!event) {
      return res.status(403).json({
        success: false,
        message: "Not authorized - this booking does not belong to your event"
      });
    }

    // Check if booking has tickets
    if (!booking.ticket || !booking.ticket.ticketNumber) {
      return res.status(400).json({
        success: false,
        message: "No tickets found for this booking"
      });
    }

    // Count total tickets
    const totalTickets = booking.ticket.quantity || 1;
    const isAlreadyUsed = booking.ticket.isUsed || false;

    if (isAlreadyUsed) {
      return res.status(200).json({
        success: true,
        message: `All tickets already validated/used`,
        validatedCount: totalTickets,
        status: "already_used"
      });
    }

    // Mark all tickets as used
    booking.ticket.isUsed = true;
    booking.ticket.usedAt = new Date();
    await booking.save();
    return res.status(200).json({
      success: true,
      message: `Successfully validated ${totalTickets} ticket(s)`,
      validatedCount: totalTickets,
      ticketNumbers: [booking.ticket.ticketNumber],
      status: "validated"
    });
  } catch (error) {
    console.error("Validate booking tickets error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to validate tickets",
      error: error.message
    });
  }
};
