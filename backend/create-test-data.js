import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';
const EMAIL = 'admin@gmail.com';
const PASSWORD = 'Admin@123';

console.log('🔧 Creating test data for User Dashboard...\n');

try {
  // Login as admin
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: EMAIL,
    password: PASSWORD
  });

  if (!loginRes.data.success) {
    console.log('❌ Login failed');
    process.exit(1);
  }

  const token = loginRes.data.token;
  console.log('✅ Logged in as admin\n');

  // Get events first
  const eventsRes = await axios.get(`${API_BASE}/events`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!eventsRes.data.success) {
    console.log('❌ Failed to get events');
    process.exit(1);
  }

  const events = eventsRes.data.events;
  console.log(`Found ${events.length} events\n`);

  if (events.length === 0) {
    console.log('⚠️  No events found. Please create events first.');
    process.exit(1);
  }

  // Create test payment
  console.log('📝 Creating test payment...');
  
  const event = events[0];
  const paymentData = {
    eventId: event._id,
    eventName: event.title,
    eventType: event.eventType || event.category,
    totalAmount: 5000,
    paymentMethod: 'Card',
    paymentStatus: 'success',
    transactionId: `TEST_${Date.now()}`,
    description: `Test payment for ${event.title}`
  };

  try {
    const paymentRes = await axios.post(`${API_BASE}/payments/create`, paymentData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (paymentRes.data.success) {
      console.log('✅ Test payment created successfully!\n');
    } else {
      console.log('⚠️  Payment creation returned:', paymentRes.data.message);
    }
  } catch (error) {
    console.log('⚠️  Payment creation error:', error.response?.data?.message || error.message);
  }

  // Create test notifications
  console.log('📝 Creating test notifications...');
  
  const notifications = [
    {
      message: `Payment successful! Your booking for "${event.title}" is confirmed.`,
      type: 'payment',
      eventId: event._id
    },
    {
      message: `Booking approved for "${event.title}". Please proceed to payment.`,
      type: 'booking_approved',
      eventId: event._id
    },
    {
      message: `Your booking status has been updated for "${event.title}".`,
      type: 'booking_status_update',
      eventId: event._id
    },
    {
      message: `Payment request: Please complete payment for "${event.title}".`,
      type: 'payment_request',
      eventId: event._id
    }
  ];

  let created = 0;
  for (const notif of notifications) {
    try {
      const notifRes = await axios.post(`${API_BASE}/notifications/create`, notif, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (notifRes.data.success) {
        created++;
        console.log(`  ✓ Created: ${notif.type}`);
      }
    } catch (error) {
      console.log(`  ⚠️  Failed to create ${notif.type}:`, error.response?.data?.message || error.message);
    }
  }

  console.log(`\n✅ Created ${created}/${notifications.length} test notifications`);
  console.log('\n🎉 Test data creation complete!\n');
  console.log('📋 Next steps:');
  console.log('1. Clear browser cache (Ctrl + Shift + R)');
  console.log('2. Refresh the User Dashboard');
  console.log('3. Check Payments page - should show test payment');
  console.log('4. Check Notifications - should show 4 test notifications\n');

} catch (error) {
  console.error('❌ Error:', error.response?.data || error.message);
}
