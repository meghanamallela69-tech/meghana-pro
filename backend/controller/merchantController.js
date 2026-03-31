import { Event } from "../models/eventSchema.js";
import { Registration } from "../models/registrationSchema.js";
import { Payment } from "../models/paymentSchema.js";
import { Withdrawal } from "../models/withdrawalSchema.js";
import { Booking } from "../models/bookingSchema.js";
import { User } from "../models/userSchema.js";
import { Notification } from "../models/notificationSchema.js";
import { uploadMultipleImages, deleteMultipleImages } from "../util/cloudinary.js";
import NotificationService from "../services/notificationService.js";

export const createEvent = async (req, res) => {
  try {
    
    const {
      title, description, category, price, rating, features,
      eventType, location, date, time, duration,
      totalTickets, ticketPrice, addons,
    } = req.body;

    // Validate title
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    // Handle image uploads - separate banner and gallery
    let images = [];
    // Upload banner image (required)
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      // Find banner image (should be first or named bannerImage)
      const bannerFile = req.files.find(f => f.fieldname === 'bannerImage') || req.files[0];
      if (bannerFile) {
        try {
          const uploadedBanner = await uploadMultipleImages([bannerFile.path]);
          if (uploadedBanner && uploadedBanner.length > 0) {
            images.push(uploadedBanner[0]);
          }
        } catch (uploadError) {
          console.error('Failed to upload banner:', uploadError.message);
          return res.status(500).json({ 
            success: false, 
            message: `Failed to upload banner image: ${uploadError.message}` 
          });
        }
      }
      
      // Upload gallery images (optional, max 3)
      const galleryFiles = req.files.filter(f => f.fieldname === 'galleryImages');
      if (galleryFiles && galleryFiles.length > 0) {
        try {
          const galleryPaths = galleryFiles.map(f => f.path);
          const uploadedGallery = await uploadMultipleImages(galleryPaths);
          images = [...images, ...uploadedGallery];
        } catch (uploadError) {
          console.error('Failed to upload gallery images:', uploadError.message);
          // Continue even if gallery upload fails - banner is the critical one
        }
      }
    } else if (req.files && typeof req.files === 'object' && !Array.isArray(req.files)) {
      // Handle multer.fields() which returns an object with arrays
      
      // Get banner image
      const bannerFiles = req.files.bannerImage || [];
      if (bannerFiles && bannerFiles.length > 0) {
        const bannerFile = bannerFiles[0];
        try {
          const uploadedBanner = await uploadMultipleImages([bannerFile.path]);
          if (uploadedBanner && uploadedBanner.length > 0) {
            images.push(uploadedBanner[0]);
          }
        } catch (uploadError) {
          console.error('Failed to upload banner:', uploadError.message);
          return res.status(500).json({ 
            success: false, 
            message: `Failed to upload banner image: ${uploadError.message}` 
          });
        }
      }
      
      // Get gallery images
      const galleryFiles = req.files.galleryImages || [];
      if (galleryFiles && galleryFiles.length > 0) {
        try {
          const galleryPaths = galleryFiles.map(f => f.path);
          const uploadedGallery = await uploadMultipleImages(galleryPaths);
          images = [...images, ...uploadedGallery];
        } catch (uploadError) {
          console.error('Failed to upload gallery images:', uploadError.message);
          // Continue even if gallery upload fails
        }
      }
    } else if (req.file) {
      // Fallback: handle single file upload (if multer configuration changes)
      try {
        const uploadedImage = await uploadMultipleImages([req.file.path]);
        if (uploadedImage && uploadedImage.length > 0) {
          images.push(uploadedImage[0]);
        }
      } catch (uploadError) {
        console.error('Failed to upload image:', uploadError.message);
      }
    } else {
    }

    // Parse features
    let parsedFeatures = features || [];
    if (typeof features === 'string') {
      try { parsedFeatures = JSON.parse(features); }
      catch { parsedFeatures = features.split(',').map(f => f.trim()).filter(f => f); }
    }

    // Parse addons [{name, price}]
    let parsedAddons = [];
    if (addons) {
      try {
        const raw = typeof addons === 'string' ? JSON.parse(addons) : addons;
        parsedAddons = raw
          .filter(a => a.name && a.name.trim())
          .map(a => ({ name: a.name.trim(), price: Number(a.price) || 0 }));
      } catch { parsedAddons = []; }
    }

    const isTicketed = eventType === "ticketed";

    // Parse ticketTypes for ticketed events
    let parsedTicketTypes = [];
    if (isTicketed && req.body.ticketTypes) {
      try {
        parsedTicketTypes = JSON.parse(req.body.ticketTypes);
      } catch {
        parsedTicketTypes = [];
      }
      // Ensure available = quantity on creation
      parsedTicketTypes = parsedTicketTypes.map((t) => ({
        name: t.name || "General",
        price: Number(t.price) || 0,
        quantity: Number(t.quantity) || 0,
        available: Number(t.quantity) || 0,
      }));
    }

    // Calculate totals from ticket types
    const totalFromTypes = parsedTicketTypes.reduce((sum, t) => sum + t.quantity, 0);
    const lowestTicketPrice = parsedTicketTypes.length
      ? Math.min(...parsedTicketTypes.map((t) => t.price))
      : Number(ticketPrice) || 0;

    const tickets = isTicketed ? (totalFromTypes || Number(totalTickets) || 0) : 0;

    const event = await Event.create({
      title: title.trim(),
      description: description || "",
      category: category || "",
      eventType: eventType || "full-service",
      price: isTicketed ? lowestTicketPrice : (Number(price) || 0),
      rating: Number(rating) || 0,
      location: location || "",
      date: date ? new Date(date) : null,
      time: time || "",
      duration: Number(duration) || 1,
      ticketedEventType: isTicketed ? (req.body.ticketedEventType || "upcoming") : undefined,
      totalTickets: tickets,
      availableTickets: tickets,
      ticketPrice: lowestTicketPrice,
      ticketTypes: parsedTicketTypes,
      images,
      features: parsedFeatures,
      addons: parsedAddons,
      createdBy: req.user.userId,
    });
    // Notify all admins about new event
    try {
      const merchant = await User.findById(req.user.userId).select("name");
      await NotificationService.notifyAllAdmins(
        `New event "${event.title}" created by merchant ${merchant?.name || "Unknown"}`,
        "event_created",
        "medium",
        event._id
      );
    } catch (notifErr) {
      console.error("Failed to notify admin of new event:", notifErr);
    }

    return res.status(201).json({ success: true, event });
  } catch (error) {
    console.error('❌ Create event error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: error.message, 
        errors: error.errors 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: `Failed to create event: ${error.message}`,
      error: error.name 
    });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    if (String(event.createdBy) !== String(req.user.userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    
    const { title, description, category, price, rating, features } = req.body;
    
    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (category !== undefined) event.category = category;
    if (price !== undefined) event.price = price;
    if (rating !== undefined) event.rating = rating;
    if (features !== undefined) {
      let parsedFeatures = features;
      if (typeof features === 'string') {
        try {
          parsedFeatures = JSON.parse(features);
        } catch (e) {
          parsedFeatures = features.split(',').map(f => f.trim()).filter(f => f);
        }
      }
      event.features = parsedFeatures;
    }

    // Handle image upload if new images are provided
    
    let newImages = [];
    
    // Check if new files were uploaded
    if (req.files && typeof req.files === 'object' && !Array.isArray(req.files)) {
      // Handle multer.fields() which returns an object with arrays
      
      // Get banner image
      const bannerFiles = req.files.bannerImage || [];
      if (bannerFiles && bannerFiles.length > 0) {
        const bannerFile = bannerFiles[0];
        try {
          const uploadedBanner = await uploadMultipleImages([bannerFile.path]);
          if (uploadedBanner && uploadedBanner.length > 0) {
            newImages.push(uploadedBanner[0]);
          }
        } catch (uploadError) {
          console.error('Failed to upload new banner:', uploadError.message);
        }
      }
      
      // Get gallery images
      const galleryFiles = req.files.galleryImages || [];
      if (galleryFiles && galleryFiles.length > 0) {
        try {
          const galleryPaths = galleryFiles.map(f => f.path);
          const uploadedGallery = await uploadMultipleImages(galleryPaths);
          newImages = [...newImages, ...uploadedGallery];
        } catch (uploadError) {
          console.error('Failed to upload gallery images:', uploadError.message);
        }
      }
    } else if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      // Fallback: handle if files come as array
      try {
        const imagePaths = req.files.map(file => file.path);
        const uploadedImages = await uploadMultipleImages(imagePaths);
        newImages = uploadedImages;
      } catch (uploadError) {
        console.error('Failed to upload images:', uploadError.message);
      }
    } else if (req.file) {
      // Fallback: handle single file
      try {
        const uploadedImage = await uploadMultipleImages([req.file.path]);
        if (uploadedImage && uploadedImage.length > 0) {
          newImages.push(uploadedImage[0]);
        }
      } catch (uploadError) {
        console.error('Failed to upload image:', uploadError.message);
      }
    }
    
    // If new images were uploaded, replace old ones
    if (newImages && newImages.length > 0) {
      // Delete old images from Cloudinary
      if (event.images && event.images.length > 0) {
        const oldPublicIds = event.images.map(img => img.public_id);
        await deleteMultipleImages(oldPublicIds);
      }
      
      // Replace with new images
      event.images = newImages;
    } else {
    }
    
    await event.save();
    return res.status(200).json({ success: true, event });
  } catch {
    return res.status(500).json({ success: false, message: "Unknown Error" });
  }
};

export const listMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.user.userId });
    return res.status(200).json({ success: true, events });
  } catch (error) {
    console.error("Error listing events:", error);
    return res.status(500).json({ success: false, message: "Unknown Error" });
  }
};

export const getEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    if (String(event.createdBy) !== String(req.user.userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    return res.status(200).json({ success: true, event });
  } catch {
    return res.status(500).json({ success: false, message: "Unknown Error" });
  }
};

export const participantsForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    if (String(event.createdBy) !== String(req.user.userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const regs = await Registration.find({ event: id }).populate("user", "name email role");
    return res.status(200).json({ success: true, participants: regs });
  } catch {
    return res.status(500).json({ success: false, message: "Unknown Error" });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    if (String(event.createdBy) !== String(req.user.userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    // Delete images from Cloudinary first
    if (event.images && event.images.length > 0) {
      const { deleteMultipleImages } = await import("../util/cloudinary.js");
      const publicIds = event.images.map(img => img.public_id);
      await deleteMultipleImages(publicIds);
    }
    await Event.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "Event deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unknown Error" });
  }
};

// Get merchant earnings summary
export const getEarnings = async (req, res) => {
  try {
    const merchantId = req.user.userId;
    
    // Get all payments for this merchant
    const payments = await Payment.find({ merchantId })
      .populate('userId', 'name email')
      .populate({
        path: 'bookingId',
        select: 'serviceTitle eventTitle user',
        populate: { path: 'user', select: 'name email' }
      })
      .populate('eventId', 'title')
      .sort({ createdAt: -1 });
    
    // Calculate totals
    const totalEarnings = payments.reduce((sum, p) => sum + (p.merchantAmount || 0), 0);
    const totalCommission = payments.reduce((sum, p) => sum + (p.adminCommission || 0), 0);
    
    // Get pending withdrawals
    const pendingWithdrawals = await Withdrawal.find({ 
      merchant: merchantId, 
      status: { $in: ["pending", "processing"] } 
    });
    const pendingAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    
    const completedWithdrawals = await Withdrawal.find({ 
      merchant: merchantId, 
      status: { $in: ["approved", "completed"] } 
    });
    const withdrawnAmount = completedWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    const availableBalance = Math.max(0, totalEarnings - pendingAmount - withdrawnAmount);

    // Build transaction list — resolve event name and customer name from all possible sources
    const transactionList = await Promise.all(payments.map(async (p) => {
      // Resolve event name: eventId.title > bookingId.serviceTitle > description > lookup from Event
      let eventName = p.eventId?.title 
        || p.bookingId?.serviceTitle 
        || p.bookingId?.eventTitle;
      
      // If still not found, try looking up the event directly from the booking's serviceId
      if (!eventName && p.bookingId?.serviceId) {
        try {
          const ev = await Event.findById(p.bookingId.serviceId).select('title');
          eventName = ev?.title;
        } catch {}
      }

      // Fallback to description field stored in Payment
      if (!eventName && p.description) {
        // description is like "Payment for Wedding" or "Payment for service: Birthday party"
        const match = p.description.match(/(?:for\s+(?:service:\s+)?|for booking:\s+)(.+)/i);
        eventName = match ? match[1].trim() : p.description;
      }

      eventName = eventName || 'Unknown Event';

      // Resolve customer name: userId.name > bookingId.user.name
      const customerName = p.userId?.name 
        || p.bookingId?.user?.name 
        || 'Unknown Customer';

      const customerEmail = p.userId?.email 
        || p.bookingId?.user?.email 
        || '';

      return {
        _id: p._id,
        eventName,
        customerName,
        customerEmail,
        amount: p.merchantAmount,
        totalAmount: p.totalAmount,
        commission: p.adminCommission,
        date: p.createdAt,
        status: p.paymentStatus,
        paymentMethod: p.paymentMethod,
      };
    }));
    
    return res.status(200).json({ 
      success: true, 
      data: {
        totalEarnings,
        availableBalance,
        pendingAmount,
        withdrawnAmount,
        commissionDeducted: totalCommission,
        transactionList
      }
    });
  } catch (error) {
    console.error("Error fetching earnings:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch earnings" });
  }
};

// Request withdrawal
export const requestWithdrawal = async (req, res) => {
  try {
    const { amount, bankDetails } = req.body;
    const merchantId = req.user.userId;
    
    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    if (amount < 100) {
      return res.status(400).json({ success: false, message: "Minimum withdrawal amount is ₹100" });
    }
    
    // Create withdrawal request (admin will verify balance before approving)
    const withdrawal = await Withdrawal.create({
      merchant: merchantId,
      amount,
      status: "pending",
      bankDetails: bankDetails || {}
    });
    // Notify all admins about withdrawal request
    try {
      const merchant = await User.findById(merchantId).select("name email");
      const merchantName = merchant?.name || "Unknown Merchant";
      const merchantEmail = merchant?.email || "";
      const adminIds = await User.find({ role: "admin" }).select("_id");
      for (const admin of adminIds) {
        await Notification.create({
          user: admin._id,
          message: `Withdrawal request of ₹${Number(amount).toLocaleString("en-IN")} from merchant ${merchantName} (${merchantEmail}) is pending your approval.`,
          type: "payment_request",
          priority: "high",
          read: false
        });
      }
    } catch (notifErr) {
      console.error("Failed to notify admin of withdrawal request:", notifErr);
    }

    return res.status(201).json({ 
      success: true, 
      message: "Withdrawal request submitted successfully. Admin will review and approve.",
      withdrawal 
    });
  } catch (error) {
    console.error("Error requesting withdrawal:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to request withdrawal" });
  }
};

// Get withdrawal history
export const getWithdrawalHistory = async (req, res) => {
  try {
    const merchantId = req.user.userId;
    const withdrawals = await Withdrawal.find({ merchant: merchantId }).sort({ createdAt: -1 });
    
    return res.status(200).json({ 
      success: true, 
      withdrawals 
    });
  } catch (error) {
    console.error("Error fetching withdrawal history:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch withdrawal history" });
  }
};

// Get merchant payments
export const getMerchantPayments = async (req, res) => {
  try {
    const merchantId = req.user.userId;
    
    // Get all payments for this merchant with full population
    const payments = await Payment.find({ merchantId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name email')
      .populate({
        path: 'bookingId',
        select: 'serviceTitle eventTitle serviceId user',
        populate: { path: 'user', select: 'name email' }
      })
      .populate('eventId', 'title');
    
    // Calculate stats
    const totalEarnings = payments.reduce((sum, p) => sum + (p.merchantAmount || 0), 0);
    
    // Format payments resolving event name and customer from all sources
    const formattedPayments = await Promise.all(payments.map(async (p) => {
      // Resolve event name
      let eventName = p.eventId?.title 
        || p.bookingId?.serviceTitle 
        || p.bookingId?.eventTitle;

      if (!eventName && p.bookingId?.serviceId) {
        try {
          const ev = await Event.findById(p.bookingId.serviceId).select('title');
          eventName = ev?.title;
        } catch {}
      }

      if (!eventName && p.description) {
        const match = p.description.match(/(?:for\s+(?:service:\s+)?|for booking:\s+)(.+)/i);
        eventName = match ? match[1].trim() : p.description;
      }

      eventName = eventName || 'Unknown Event';

      // Resolve customer name
      const customerName = p.userId?.name || p.bookingId?.user?.name || 'Unknown Customer';
      const customerEmail = p.userId?.email || p.bookingId?.user?.email || '';

      return {
        _id: p._id,
        eventName,
        customerName,
        customerEmail,
        amount: p.merchantAmount,
        totalAmount: p.totalAmount,
        commission: p.adminCommission,
        status: p.paymentStatus,
        paymentMethod: p.paymentMethod,
        createdAt: p.createdAt,
        transactionId: p.transactionId,
        description: p.description,
      };
    }));
    
    return res.status(200).json({ 
      success: true, 
      payments: formattedPayments,
      stats: {
        total: totalEarnings,
        count: payments.length
      }
    });
  } catch (error) {
    console.error("Error fetching merchant payments:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch payments" });
  }
};

// Get all bookings for merchant events (both ticketed and full-service)
export const getMerchantBookings = async (req, res) => {
  try {
    const merchantId = req.user.userId;
    
    // Get all events created by this merchant
    const merchantEvents = await Event.find({ createdBy: merchantId }).select('_id title eventType location date time');
    const eventIds = merchantEvents.map(ev => ev._id);
    
    // Get all bookings for these events
    const bookings = await Booking.find({ 
      serviceId: { $in: eventIds.map(id => id.toString()) }
    })
    .populate('user', 'name email phone')
    .sort({ createdAt: -1 });
    
    // Format bookings with event information
    const formattedBookings = bookings.map(booking => {
      const event = merchantEvents.find(ev => ev._id.toString() === booking.serviceId);
      
      return {
        _id: booking._id,
        bookingId: booking._id,
        user: booking.user,
        userName: booking.user?.name || 'Unknown',
        userEmail: booking.user?.email || '',
        eventName: event?.title || booking.serviceTitle || 'Unknown Event',
        eventType: booking.eventType || 'full-service',
        ticketType: booking.ticket?.ticketType || (booking.selectedTickets ? 'Multiple' : 'N/A'),
        quantity: booking.ticket?.quantity || 1,
        selectedTickets: booking.selectedTickets || {},
        date: booking.eventDate || event?.date || booking.bookingDate,
        time: booking.eventTime || event?.time || 'TBD',
        location: booking.location || event?.location || 'TBD',
        addons: booking.addons || [],
        totalAmount: booking.totalPrice || booking.servicePrice || 0,
        paymentStatus: booking.payment?.paid ? 'paid' : 'pending',
        bookingStatus: booking.status || 'pending',
        createdAt: booking.createdAt,
        notes: booking.notes || ''
      };
    });
    
    return res.status(200).json({ 
      success: true, 
      bookings: formattedBookings,
      count: formattedBookings.length
    });
  } catch (error) {
    console.error("Error fetching merchant bookings:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch bookings" });
  }
};

// Update booking status (for full-service events)
export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, message } = req.body;
    const merchantId = req.user.userId;
    
    // Validate status
    const validStatuses = [
      "pending", 
      "approved", 
      "accepted", 
      "rejected", 
      "cancelled", 
      "paid", 
      "confirmed", 
      "processing", 
      "completed"
    ];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    
    // Find booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    
    // Verify this booking belongs to merchant's event or service
    const event = await Event.findById(booking.serviceId);
    if (!event || String(event.createdBy) !== String(merchantId)) {
      // Check if merchant ID matches directly (fallback)
      if (booking.merchant?.toString() !== merchantId) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }
    }
    
    // Update booking status
    if (status) {
      booking.status = status;
    }
    
    // Update merchant response
    if (status === 'accepted' || status === 'rejected' || status === 'approved') {
      booking.merchantResponse = {
        accepted: status !== 'rejected',
        responseDate: new Date(),
        message: message || ''
      };
    }
    
    await booking.save();
    
    return res.status(200).json({ 
      success: true, 
      message: `Booking status updated to ${status} successfully`,
      booking 
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update booking status" });
  }
};

// Approve booking (for merchant workflow)
export const approveBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { message } = req.body;
    const merchantId = req.user.userId;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify ownership
    const event = await Event.findById(booking.serviceId);
    if (!event || String(event.createdBy) !== String(merchantId)) {
      if (booking.merchant?.toString() !== merchantId) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }
    }

    // Set to approved (awaiting payment)
    booking.status = "approved";
    booking.merchantResponse = {
      accepted: true,
      responseDate: new Date(),
      message: message || "Your booking has been approved. Please proceed with the payment."
    };

    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking approved successfully. Customer can now pay.",
      booking
    });
  } catch (error) {
    console.error("Error approving booking:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to approve booking" });
  }
};

// Get single booking details (for ticketed events view)
export const getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const merchantId = req.user.userId;
    
    const booking = await Booking.findById(bookingId)
      .populate('user', 'name email phone')
      .populate('eventId', 'title description location date time images');
    
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    
    // Verify this booking belongs to merchant's event
    const event = await Event.findById(booking.serviceId);
    if (!event || String(event.createdBy) !== String(merchantId)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    
    return res.status(200).json({ 
      success: true, 
      booking 
    });
  } catch (error) {
    console.error("Error fetching booking details:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch booking details" });
  }
};
