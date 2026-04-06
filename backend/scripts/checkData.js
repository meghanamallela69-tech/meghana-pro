import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { User } from "../models/userSchema.js";
import { Event } from "../models/eventSchema.js";
import { Review } from "../models/reviewSchema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env") });

const checkData = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to database\n");

    // Check users
    const users = await User.find().limit(10);
    console.log(`📊 Total Users: ${await User.countDocuments()}`);
    console.log(`   Sample users: ${users.length}`);
    if (users.length > 0) {
      users.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.name} (${u.email}) - Role: ${u.role}`);
      });
    }
    console.log("");

    // Check events
    const events = await Event.find().limit(10);
    console.log(`📊 Total Events: ${await Event.countDocuments()}`);
    console.log(`   Sample events: ${events.length}`);
    if (events.length > 0) {
      events.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.title || e.name} (ID: ${e._id})`);
      });
    }
    console.log("");

    // Check reviews
    const reviews = await Review.find().limit(10);
    console.log(`📊 Total Reviews: ${await Review.countDocuments()}`);
    console.log(`   Sample reviews: ${reviews.length}`);
    if (reviews.length > 0) {
      reviews.forEach((r, i) => {
        console.log(`   ${i + 1}. Rating: ${r.rating}⭐ - Text: "${r.reviewText.substring(0, 40)}..."`);
      });
    }
    console.log("");

    console.log("=" .repeat(60));
    console.log("\n✨ Data Check Complete!\n");

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
};

checkData();
