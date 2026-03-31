import { Event } from "../models/eventSchema.js";
import { Registration } from "../models/registrationSchema.js";
import { Payment } from "../models/paymentSchema.js";
import { Withdrawal } from "../models/withdrawalSchema.js";
import { Booking } from "../models/bookingSchema.js";
import { User } from "../models/userSchema.js";
import { uploadMultipleImages, deleteMultipleImages } from "../util/cloudinary.js";

export const createEvent = async (req, res) => {
  try {
    console.log('📝 Creating event...');
    console.log('Request body:', req.body);
    console.log('Uploaded files:', req.files && Array.isArray(req.files) ? req.files.map(f => ({ name: f.originalname, fieldname: f.fieldname })) : 'No files');
    
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
    
    console.log('📸 Checking uploaded files...');
    console.log('req.files type:', typeof req.files);
    console.log('req.files is Array:', Array.isArray(req.files));
    console.log('req.files value:', req.files);
    console.log('req.file:', req.file);
    
    // Upload banner image (required)
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      console.log(`📸 Processing ${req.files.length} files from array`);
      
      // Find banner image (should be first or named bannerImage)
      const bannerFile = req.files.find(f => f.fieldname === 'bannerImage') || req.files[0];
      console.log('Banner file:', bannerFile?.fieldname, bannerFile?.originalname);
      
      if (bannerFile) {
        try {
          const uploadedBanner = await uploadMultipleImages([bannerFile.path]);
          console.log('Uploaded banner:', uploadedBanner);
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
      console.log(`Gallery files count: ${galleryFiles.length}`);
      
      if (galleryFiles && galleryFiles.length > 0) {
        try {
          const galleryPaths = galleryFiles.map(f => f.path);
          const uploadedGallery = await uploadMultipleImages(galleryPaths);
          console.log('Uploaded gallery:', uploadedGallery);
          images = [...images, ...uploadedGallery];
        } catch (uploadError) {
          console.error('Failed to upload gallery images:', uploadError.message);
          // Continue even if gallery upload fails - banner is the critical one
        }
      }
    } else if (req.files && typeof req.files === 'object' && !Array.isArray(req.files)) {
      // Handle multer.fields() which returns an object with arrays
      console.log('📸 Processing files from multer.fields() object');
      
      // Get banner image
      const bannerFiles = req.files.bannerImage || [];
      if (bannerFiles && bannerFiles.length > 0) {
        const bannerFile = bannerFiles[0];
        console.log('Banner file from object:', bannerFile.fieldname, bannerFile.originalname);
        
        try {
          const uploadedBanner = await uploadMultipleImages([bannerFile.path]);
          console.log('Uploaded banner:', uploadedBanner);
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
      console.log(`Gallery files from object: ${galleryFiles.length}`);
      
      if (galleryFiles && galleryFiles.length > 0) {
        try {
          const galleryPaths = galleryFiles.map(f => f.path);
          const uploadedGallery = await uploadMultipleImages(galleryPaths);
          console.log('Uploaded gallery:', uploadedGallery);
          images = [...images, ...uploadedGallery];
        } catch (uploadError) {
          console.error('Failed to upload gallery images:', uploadError.message);
          // Continue even if gallery upload fails
        }
      }
    } else if (req.file) {
      // Fallback: handle single file upload (if multer configuration changes)
      console.log('📸 Processing single file:', req.file.originalname);
      try {
        const uploadedImage = await uploadMultipleImages([req.file.path]);
        if (uploadedImage && uploadedImage.length > 0) {
          images.push(uploadedImage[0]);
        }
      } catch (uploadError) {
        console.error('Failed to upload image:', uploadError.message);
      }
    } else {
      console.log('⚠️ No images uploaded - event will be created without images');
    }
    
    console.log('✅ Total images to save:', images.length);
    console.log('Images array:', JSON.stringify(images, null, 2));

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

    console.log('Creating event with data:', {
      title: title.trim(),
      category,
      eventType,
      price: isTicketed ? lowestTicketPrice : (Number(price) || 0),
      images: images.length,
      ticketTypes: parsedTicketTypes.length
    });

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

    console.log('✅ Event created successfully:', event._id);
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
    console.log('📸 Update event - Checking uploaded files...');
    console.log('req.files:', req.files);
    console.log('req.files type:', typeof req.files);
    console.log('req.files is Array:', Array.isArray(req.files));
    
    let newImages = [];
    
    // Check if new files were uploaded
    if (req.files && typeof req.files === 'object' && !Array.isArray(req.files)) {
      // Handle multer.fields() which returns an object with arrays
      console.log('📸 Processing files from multer.fields() object for update');
      
      // Get banner image
      const bannerFiles = req.files.bannerImage || [];
      if (bannerFiles && bannerFiles.length > 0) {
        const bannerFile = bannerFiles[0];
        console.log('New banner file:', bannerFile.fieldname, bannerFile.originalname);
        
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
      console.log(`Gallery files for update: ${galleryFiles.length}`);
      
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
      console.log(`📸 Processing ${req.files.length} files from array for update`);
      try {
        const imagePaths = req.files.map(file => file.path);
        const uploadedImages = await uploadMultipleImages(imagePaths);
        newImages = uploadedImages;
      } catch (uploadError) {
        console.error('Failed to upload images:', uploadError.message);
      }
    } else if (req.file) {
      // Fallback: handle single file
      console.log('📸 Processing single file for update:', req.file.originalname);
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
      console.log(`✅ New images uploaded: ${newImages.length}`);
      
      // Delete old images from Cloudinary
      if (event.images && event.images.length > 0) {
        const oldPublicIds = event.images.map(img => img.public_id);
        console.log('Deleting old images from Cloudinary:', oldPublicIds);
        await deleteMultipleImages(oldPublicIds);
      }
      
      // Replace with new images
      event.images = newImages;
      console.log('Event images updated:', event.images.length);
    } else {
      console.log('ℹ️ No new images uploaded - keeping existing images');
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
    console.log("Listing events:", events);
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
    const payments = await Payment.find({ merchantId }).sort({ createdAt: -1 });
    
    // Calculate totals
    const totalEarnings = payments.reduce((sum, p) => sum + p.merchantAmount, 0);
    const totalCommission = payments.reduce((sum, p) => sum + p.adminCommission, 0);
    
    // Get pending withdrawals
    const pendingWithdrawals = await Withdrawal.find({ 
      merchant: merchantId, 
      status: { $in: ["pending", "processing"] } 
    });
    const pendingAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    
    // Available balance = total earnings - pending withdrawals
    const availableBalance = totalEarnings - pendingAmount;
    
    // Get completed withdrawals
    const completedWithdrawals = await Withdrawal.find({ 
      merchant: merchantId, 
      status: { $in: ["approved", "completed"] } 
    });
    const withdrawnAmount = completedWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    
    return res.status(200).json({ 
      success: true, 
      data: {
        totalEarnings,
        availableBalance,
        pendingAmount,
        withdrawnAmount,
        commissionDeducted: totalCommission,
        transactionList: payments.map(p => ({
          bookingId: p.bookingId,
          amount: p.merchantAmount,
          totalAmount: p.totalAmount,
          commission: p.adminCommission,
          date: p.createdAt,
          status: p.paymentStatus,
          paymentMethod: p.paymentMethod
        }))
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
    
    // Check available balance
    const payments = await Payment.find({ merchantId });
    const totalEarnings = payments.reduce((sum, p) => sum + p.merchantAmount, 0);
    
    const pendingWithdrawals = await Withdrawal.find({ 
      merchant: merchantId, 
      status: { $in: ["pending", "processing"] } 
    });
    const pendingAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    
    const availableBalance = totalEarnings - pendingAmount;
    
    if (amount > availableBalance) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient balance. Available: ₹${availableBalance.toFixed(2)}` 
      });
    }
    
    // Create withdrawal request
    const withdrawal = await Withdrawal.create({
      merchant: merchantId,
      amount,
      status: "pending",
      bankDetails: bankDetails || {}
    });
    
    return res.status(201).json({ 
      success: true, 
      message: "Withdrawal request submitted successfully",
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
    
    // Get all payments for this merchant
    const payments = await Payment.find({ merchantId })
      .sort({ createdAt: -1 })
      .populate('bookingId', 'eventId user')
      .populate('eventId', 'title')
      .populate('userId', 'name email');
    
    // Calculate stats
    const totalEarnings = payments.reduce((sum, p) => sum + p.merchantAmount, 0);
    
    // Format payments for frontend
    const formattedPayments = payments.map(p => ({
      _id: p._id,
      event: p.eventId,
      user: p.userId,
      customerName: p.userId?.name || 'Unknown',
      customerEmail: p.userId?.email || '',
      amount: p.merchantAmount,
      totalAmount: p.totalAmount,
      commission: p.adminCommission,
      status: p.paymentStatus,
      paymentMethod: p.paymentMethod,
      createdAt: p.createdAt,
      transactionId: p.transactionId
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
