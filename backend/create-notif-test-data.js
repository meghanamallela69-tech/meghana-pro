import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://akilan:Tamil%402024@cluster0.gfbrfcg.mongodb.net/eventhub';

console.log('🔧 Creating test notifications directly in database...\n');

try {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const Notification = mongoose.model('Notification', new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    eventId: { type: String },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    type: { 
      type: String, 
      enum: ['booking', 'payment', 'general', 'booking_update', 'booking_approved', 'booking_status_update', 'payment_request', 'booking_request'],
      default: 'general'
    }
  }, { timestamps: true }));

  const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    email: String
  }));

  // Find admin user
  const adminUser = await User.findOne({ email: 'admin@gmail.com' });
  
  if (!adminUser) {
    console.log('❌ Admin user not found');
    process.exit(1);
  }

  console.log(`Found admin user: ${adminUser.email}\n`);

  // Find an event
  const Event = mongoose.model('Event', new mongoose.Schema({
    title: String,
    eventType: String,
    category: String
  }));

  const event = await Event.findOne({});
  
  if (!event) {
    console.log('❌ No events found');
    process.exit(1);
  }

  console.log(`Using event: ${event.title}\n`);

  // Create test notifications
  const notifications = [
    {
      user: adminUser._id,
      message: `Payment successful! Your booking for "${event.title}" is confirmed.`,
      type: 'payment',
      eventId: event._id.toString(),
      createdAt: new Date(),
      read: false
    },
    {
      user: adminUser._id,
      message: `Booking approved for "${event.title}". Please proceed to payment.`,
      type: 'booking_approved',
      eventId: event._id.toString(),
      createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      read: false
    },
    {
      user: adminUser._id,
      message: `Your booking status has been updated for "${event.title}".`,
      type: 'booking_status_update',
      eventId: event._id.toString(),
      createdAt: new Date(Date.now() - 7200000), // 2 hours ago
      read: true
    },
    {
      user: adminUser._id,
      message: `Payment request: Please complete payment for "${event.title}".`,
      type: 'payment_request',
      eventId: event._id.toString(),
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      read: false
    }
  ];

  // Insert notifications
  const inserted = await Notification.insertMany(notifications);
  
  console.log(`✅ Successfully created ${inserted.length} test notifications\n`);
  console.log('📋 Created notifications:');
  inserted.forEach((n, i) => {
    console.log(`${i + 1}. [${n.type}] ${n.message.substring(0, 50)}...`);
  });

  console.log('\n🎉 Test data creation complete!\n');
  console.log('📋 Next steps:');
  console.log('1. Clear browser cache (Ctrl + Shift + R)');
  console.log('2. Login to User Dashboard');
  console.log('3. Check Notifications page - should show colorful notifications');
  console.log('4. Check Dashboard home - should show recent notifications\n');

  process.exit(0);

} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
