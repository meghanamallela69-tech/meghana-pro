import { Rating } from "../models/ratingSchema.js";
import { Event } from "../models/eventSchema.js";
import { Booking } from "../models/bookingSchema.js";

// Create or update rating
export const createRating = async (req, res) => {
  try {
    const { eventId, rating } = req.body;
    const userId = req.user.userId;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5 stars"
      });
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Check if user booked this event (check both serviceId and eventId fields)
    const booking = await Booking.findOne({
      user: userId,
      $or: [
        { serviceId: eventId.toString() },
        { eventId: eventId }
      ]
    });

    if (!booking) {
      return res.status(403).json({
        success: false,
        message: "You can only rate events you have booked"
      });
    }

    // Check if user already rated this event
    let existingRating = await Rating.findOne({
      user: userId,
      event: eventId
    });

    let isUpdate = false;
    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      await existingRating.save();
      isUpdate = true;
    } else {
      // Create new rating
      existingRating = await Rating.create({
        user: userId,
        event: eventId,
        rating: rating
      });
    }

    // Recalculate event average rating
    await updateEventRating(eventId);

    return res.status(isUpdate ? 200 : 201).json({
      success: true,
      message: isUpdate ? "Rating updated successfully" : "Rating created successfully",
      rating: existingRating
    });

  } catch (error) {
    console.error("Create rating error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create rating"
    });
  }
};

// Get ratings for an event
export const getEventRatings = async (req, res) => {
  try {
    const { eventId } = req.params;

    const ratings = await Rating.find({ event: eventId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      ratings
    });

  } catch (error) {
    console.error("Get event ratings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get ratings"
    });
  }
};

// Get user's ratings
export const getUserRatings = async (req, res) => {
  try {
    const userId = req.user.userId;

    const ratings = await Rating.find({ user: userId })
      .populate("event", "title category")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      ratings
    });

  } catch (error) {
    console.error("Get user ratings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get user ratings"
    });
  }
};

// Helper function to update event rating
const updateEventRating = async (eventId) => {
  try {
    const ratings = await Rating.find({ event: eventId });

    // First, ensure the rating field is an object (fix legacy number values)
    await Event.updateOne(
      { _id: eventId, $or: [{ rating: { $type: "number" } }, { rating: null }] },
      { $set: { rating: { average: 0, totalRatings: 0 } } }
    );

    if (ratings.length === 0) {
      await Event.findByIdAndUpdate(eventId, {
        $set: { "rating.average": 0, "rating.totalRatings": 0 }
      });
      return;
    }

    const totalScore = ratings.reduce((sum, r) => sum + r.rating, 0);
    const average = Math.round((totalScore / ratings.length) * 10) / 10;

    await Event.findByIdAndUpdate(eventId, {
      $set: { "rating.average": average, "rating.totalRatings": ratings.length }
    });

  } catch (error) {
    console.error("Update event rating error:", error);
  }
};