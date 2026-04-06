import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Review } from "../models/reviewSchema.js";
import { User } from "../models/userSchema.js";
import { Event } from "../models/eventSchema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env file from backend root
dotenv.config({ path: join(__dirname, "..", ".env") });

const seedReviews = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to database\n");

    // Get sample users and events
    const users = await User.find({ role: "user" }).limit(5);
    const events = await Event.find().limit(5);

    if (users.length === 0 || events.length === 0) {
      console.log("❌ Not enough users or events in database");
      console.log(`   Users found: ${users.length}`);
      console.log(`   Events found: ${events.length}`);
      console.log("\n📝 Please create some users and events first!");
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`📊 Found ${users.length} users and ${events.length} events\n`);

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
    console.log("🗑️  Clearing existing reviews...");
    await Review.deleteMany({});
    console.log("✅ Existing reviews cleared\n");

    // Create sample reviews
    console.log("📝 Creating sample reviews...\n");
    const reviews = [];

    for (let i = 0; i < Math.min(users.length * events.length, 15); i++) {
      const userIndex = i % users.length;
      const eventIndex = Math.floor(i / users.length) % events.length;
      const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars mostly

      const review = {
        user: users[userIndex]._id,
        event: events[eventIndex]._id,
        rating: rating,
        reviewText: reviewTexts[i % reviewTexts.length]
      };

      reviews.push(review);
    }

    // Insert reviews
    const createdReviews = await Review.insertMany(reviews);
    console.log(`✅ Created ${createdReviews.length} sample reviews\n`);

    // Display created reviews
    console.log("📋 Sample Reviews Created:\n");
    for (let i = 0; i < Math.min(createdReviews.length, 5); i++) {
      const review = createdReviews[i];
      const user = users[i % users.length];
      const event = events[Math.floor(i / users.length) % events.length];
      
      console.log(`${i + 1}. ${user.name} - ${event.title}`);
      console.log(`   Rating: ${"⭐".repeat(review.rating)}`);
      console.log(`   Review: "${review.reviewText.substring(0, 60)}..."`);
      console.log("");
    }

    console.log("=" .repeat(60));
    console.log("\n🎉 SAMPLE REVIEWS CREATED SUCCESSFULLY!\n");
    console.log("=" .repeat(60));
    console.log(`\n✨ Total reviews created: ${createdReviews.length}`);
    console.log("✨ Visit /reviews page to see them!\n");

    await mongoose.disconnect();
    console.log("👋 Disconnected from database\n");

    process.exit(0);

  } catch (error) {
    console.error("\n❌ Error seeding reviews:");
    console.error(error);
    process.exit(1);
  }
};

seedReviews();
