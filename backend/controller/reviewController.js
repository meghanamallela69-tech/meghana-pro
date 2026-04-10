import { Review } from "../models/reviewSchema.js";
import { Event } from "../models/eventSchema.js";
import { Booking } from "../models/bookingSchema.js";

// Helper: recalculate and sync Event.rating from Review collection
const syncEventRating = async (eventId) => {
  const reviews = await Review.find({ event: eventId });
  if (reviews.length === 0) {
    await Event.findByIdAndUpdate(eventId, {
      $set: { "rating.average": 0, "rating.totalRatings": 0 }
    });
  } else {
    const avg = Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
    await Event.findByIdAndUpdate(eventId, {
      $set: { "rating.average": avg, "rating.totalRatings": reviews.length }
    });
  }
};

// Create review
export const createReview = async (req, res) => {
  try {
    const { eventId, rating, reviewText } = req.body;
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
        message: "You can only review events you have booked"
      });
    }

    // Check if user already reviewed this event
    const existingReview = await Review.findOne({
      user: userId,
      event: eventId
    });

    if (existingReview) {
      // Update existing review
      existingReview.rating = rating;
      existingReview.reviewText = reviewText || "";
      await existingReview.save();
      await syncEventRating(eventId);

      return res.status(200).json({
        success: true,
        message: "Review updated successfully",
        review: existingReview
      });
    } else {
      // Create new review
      const review = await Review.create({
        user: userId,
        event: eventId,
        rating: rating,
        reviewText: reviewText || ""
      });
      await syncEventRating(eventId);

      return res.status(201).json({
        success: true,
        message: "Review created successfully",
        review: review
      });
    }

  } catch (error) {
    console.error("Create review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create review"
    });
  }
};

// Get reviews for an event
export const getEventReviews = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ event: eventId })
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalReviews = await Review.countDocuments({ event: eventId });

    return res.status(200).json({
      success: true,
      reviews,
      totalReviews,
      currentPage: page,
      totalPages: Math.ceil(totalReviews / limit)
    });

  } catch (error) {
    console.error("Get event reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get reviews"
    });
  }
};

// Get user's reviews
export const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.userId;

    const reviews = await Review.find({ user: userId })
      .populate("event", "title category")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      reviews
    });

  } catch (error) {
    console.error("Get user reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get user reviews"
    });
  }
};

// Delete review
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId;

    const review = await Review.findOne({
      _id: reviewId,
      user: userId
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found or you don't have permission to delete it"
      });
    }

    const eventId = review.event;
    await Review.deleteOne({ _id: reviewId });
    await syncEventRating(eventId);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully"
    });

  } catch (error) {
    console.error("Delete review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete review"
    });
  }
};

// Get latest reviews (public – for homepage testimonials)
export const getLatestReviews = async (req, res) => {
  try {
    // Get reviews from Review collection with non-empty text
    const allReviews = await Review.find({})
      .populate("user", "name")
      .populate("event", "title")
      .sort({ createdAt: -1 });

    // Filter in JS to be safe — only keep reviews with actual text
    const reviews = allReviews
      .filter(r => r.reviewText && r.reviewText.trim().length > 0)
      .slice(0, 6);

    // If not enough, supplement from Booking collection ratings that have review text
    let result = reviews;
    if (reviews.length < 6) {
      const bookingReviews = await Booking.find({
        "rating.score": { $exists: true },
        "rating.review": { $exists: true }
      })
        .populate("user", "name")
        .populate("eventId", "title")
        .sort({ updatedAt: -1 });

      const mapped = bookingReviews
        .filter(b => b.rating?.review && b.rating.review.trim().length > 0)
        .slice(0, 6 - reviews.length)
        .map(b => ({
          _id: b._id,
          user: b.user,
          event: b.eventId,
          rating: b.rating.score,
          reviewText: b.rating.review,
          createdAt: b.rating.createdAt || b.updatedAt
        }));

      result = [...reviews, ...mapped];
    }

    return res.status(200).json({ success: true, reviews: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get reviews" });
  }
};


// Seed sample reviews (for development only)
export const seedReviews = async (req, res) => {
  try {
    // Get sample users and events
    const { User } = await import("../models/userSchema.js");
    const users = await User.find({ role: "user" }).limit(5);
    const events = await Event.find().limit(5);

    if (users.length === 0 || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Not enough data. Users: ${users.length}, Events: ${events.length}`
      });
    }

    // Sample review texts
    const reviewTexts = [
      "Amazing event! The organization was perfect and everyone had a great time. Highly recommended!",
      "Great experience overall. The venue was beautiful and the staff was very helpful.",
      "Excellent event! Would definitely attend again. Everything was well planned.",
      "Very well organized event. The food was delicious and the entertainment was top-notch.",
      "Outstanding! One of the best events I've attended. Great atmosphere and wonderful people.",
      "Good event with nice ambiance. Could have been better with more activities.",
      "Fantastic! The event exceeded my expectations. Will definitely recommend to friends.",
      "Wonderful experience! The team did an excellent job organizing everything.",
      "Great event! Enjoyed every moment. Looking forward to the next one.",
      "Perfect! Everything was organized beautifully. Great job to the team!",
      "Excellent service and great atmosphere. Had a wonderful time!",
      "Amazing! The event was well-executed and very enjoyable.",
      "Very good event. The organizers did a fantastic job!",
      "Loved it! Great event with wonderful people and amazing food.",
      "Outstanding event! Highly recommend to everyone!"
    ];

    // Clear existing reviews
    await Review.deleteMany({});

    // Create sample reviews
    const reviews = [];
    for (let i = 0; i < Math.min(users.length * events.length, 15); i++) {
      const userIndex = i % users.length;
      const eventIndex = Math.floor(i / users.length) % events.length;
      const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars mostly

      reviews.push({
        user: users[userIndex]._id,
        event: events[eventIndex]._id,
        rating: rating,
        reviewText: reviewTexts[i % reviewTexts.length]
      });
    }

    // Insert reviews
    const createdReviews = await Review.insertMany(reviews);

    return res.status(200).json({
      success: true,
      message: `Created ${createdReviews.length} sample reviews`,
      count: createdReviews.length
    });
  } catch (error) {
    console.error("Seed reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to seed reviews",
      error: error.message
    });
  }
};
