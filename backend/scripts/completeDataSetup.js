import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import bcrypt from "bcryptjs";
import { User } from "../models/userSchema.js";
import { Event } from "../models/eventSchema.js";
import { Booking } from "../models/bookingSchema.js";
import { Review } from "../models/reviewSchema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env file from backend root
dotenv.config({ path: join(__dirname, "..", ".env") });

const completeDataSetup = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to database\n");

    // Step 1: Create test users
    console.log("=" .repeat(60));
    console.log("STEP 1: Creating Test Users");
    console.log("=" .repeat(60) + "\n");

    const testUsers = [
      {
        name: "John Doe",
        email: "john@test.com",
        password: "User@123",
        role: "user"
      },
      {
        name: "Jane Smith",
        email: "jane@test.com",
        password: "User@123",
        role: "user"
      },
      {
        name: "Mike Johnson",
        email: "mike@test.com",
        password: "User@123",
        role: "user"
      },
      {
        name: "Sarah Williams",
        email: "sarah@test.com",
        password: "User@123",
        role: "user"
      },
      {
        name: "Test Merchant",
        email: "merchant@test.com",
        password: "Merchant@123",
        role: "merchant",
        businessName: "Event Services Co.",
        phone: "+91 9876543210",
        serviceType: "Events"
      }
    ];

    // Clear existing test users
    await User.deleteMany({
      $or: testUsers.map(u => ({ email: u.email }))
    });

    const createdUsers = [];
    for (const userData of testUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await User.create({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        businessName: userData.businessName || "",
        phone: userData.phone || "",
        serviceType: userData.serviceType || ""
      });
      
      createdUsers.push(user);
      console.log(`✅ Created ${userData.role.toUpperCase()}: ${userData.email}`);
    }
    console.log("");

    // Step 2: Create test events
    console.log("=" .repeat(60));
    console.log("STEP 2: Creating Test Events");
    console.log("=" .repeat(60) + "\n");

    const merchant = createdUsers.find(u => u.role === "merchant");
    const eventData = [
      {
        title: "Summer Music Festival 2024",
        description: "Join us for an amazing summer music festival with live performances from top artists",
        category: "Music",
        price: 1500,
        location: "Central Park, New York",
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        tickets: 500,
        features: ["Live Music", "Food Court", "VIP Lounge"],
        merchant: merchant._id
      },
      {
        title: "Tech Conference 2024",
        description: "Learn about the latest trends in technology and network with industry experts",
        category: "Technology",
        price: 2000,
        location: "Convention Center, San Francisco",
        date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        tickets: 300,
        features: ["Keynote Speeches", "Workshops", "Networking"],
        merchant: merchant._id
      },
      {
        title: "Food & Wine Tasting",
        description: "Experience exquisite cuisines and fine wines from around the world",
        category: "Food",
        price: 3000,
        location: "Grand Hotel Ballroom",
        date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        tickets: 150,
        features: ["Wine Tasting", "Gourmet Food", "Chef Demonstrations"],
        merchant: merchant._id
      },
      {
        title: "Art Exhibition Opening",
        description: "Discover contemporary art from emerging and established artists",
        category: "Art",
        price: 500,
        location: "Modern Art Gallery",
        date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        tickets: 200,
        features: ["Art Displays", "Artist Meet & Greet", "Refreshments"],
        merchant: merchant._id
      },
      {
        title: "Fitness & Wellness Expo",
        description: "Explore the latest in fitness, wellness, and healthy living",
        category: "Wellness",
        price: 800,
        location: "Sports Complex",
        date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        tickets: 400,
        features: ["Fitness Classes", "Health Seminars", "Product Demos"],
        merchant: merchant._id
      }
    ];

    // Clear existing events
    await Event.deleteMany({ merchant: merchant._id });

    const createdEvents = [];
    for (const event of eventData) {
      const createdEvent = await Event.create(event);
      createdEvents.push(createdEvent);
      console.log(`✅ Created Event: ${createdEvent.title}`);
    }
    console.log("");

    // Step 3: Create test bookings
    console.log("=" .repeat(60));
    console.log("STEP 3: Creating Test Bookings");
    console.log("=" .repeat(60) + "\n");

    const regularUsers = createdUsers.filter(u => u.role === "user");
    const bookings = [];

    for (let i = 0; i < createdEvents.length; i++) {
      const event = createdEvents[i];
      const user = regularUsers[i % regularUsers.length];

      const booking = await Booking.create({
        user: user._id,
        eventId: event._id,
        serviceId: event._id,
        quantity: 1,
        totalPrice: event.price,
        status: "completed",
        paymentStatus: "completed",
        bookingDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        serviceDate: event.date
      });

      bookings.push(booking);
      console.log(`✅ Created Booking: ${user.name} -> ${event.title}`);
    }
    console.log("");

    // Step 4: Create test reviews
    console.log("=" .repeat(60));
    console.log("STEP 4: Creating Test Reviews");
    console.log("=" .repeat(60) + "\n");

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

    const reviews = [];
    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars

      const review = await Review.create({
        user: booking.user,
        event: booking.eventId,
        rating: rating,
        reviewText: reviewTexts[i % reviewTexts.length]
      });

      reviews.push(review);
      console.log(`✅ Created Review: ${rating}⭐ for event`);
    }
    console.log("");

    // Summary
    console.log("=" .repeat(60));
    console.log("🎉 DATA SETUP COMPLETED SUCCESSFULLY!");
    console.log("=" .repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Users Created: ${createdUsers.length}`);
    console.log(`   ✅ Events Created: ${createdEvents.length}`);
    console.log(`   ✅ Bookings Created: ${bookings.length}`);
    console.log(`   ✅ Reviews Created: ${reviews.length}`);
    console.log(`\n📋 Test Credentials:`);
    console.log(`   Email: john@test.com | Password: User@123`);
    console.log(`   Email: jane@test.com | Password: User@123`);
    console.log(`   Email: merchant@test.com | Password: Merchant@123`);
    console.log(`\n✨ You can now visit /reviews page to see all reviews!\n`);

    await mongoose.disconnect();
    console.log("👋 Disconnected from database\n");

    process.exit(0);

  } catch (error) {
    console.error("\n❌ Error during data setup:");
    console.error(error);
    process.exit(1);
  }
};

completeDataSetup();
