import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';

// Use test credentials
const EMAIL = 'admin@gmail.com';
const PASSWORD = 'Admin@123';

console.log('🔍 Checking actual data from backend...\n');

try {
  // Login first
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: EMAIL,
    password: PASSWORD
  });

  if (!loginRes.data.success) {
    console.log('❌ Login failed');
    process.exit(1);
  }

  const token = loginRes.data.token;
  console.log('✅ Logged in successfully\n');

  // Check Events
  console.log('📋 CHECKING EVENTS...\n');
  const eventsRes = await axios.get(`${API_BASE}/events`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (eventsRes.data.success) {
    const events = eventsRes.data.events;
    console.log(`Found ${events.length} events\n`);

    events.forEach((event, i) => {
      if (i < 10) { // Show first 10 events
        console.log(`${i + 1}. ${event.title}`);
        console.log(`   Type: ${event.eventType || 'NOT SET'}`);
        console.log(`   Date: ${event.date || 'No date'}`);
        console.log(`   Category: ${event.category || 'No category'}\n`);
      }
    });

    const fullServiceEvents = events.filter(e => e.eventType === 'fullService');
    console.log(`\n✅ Full Service Events: ${fullServiceEvents.length}`);
    
    if (fullServiceEvents.length === 0) {
      console.log('⚠️  WARNING: No events have eventType="fullService"');
      console.log('This is why dates are still showing!');
    }
  }

  // Check Payments
  console.log('\n\n📋 CHECKING PAYMENTS...\n');
  const paymentsRes = await axios.get(`${API_BASE}/payments/user/my-payments`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (paymentsRes.data.success) {
    const payments = paymentsRes.data.payments;
    console.log(`Found ${payments.length} payments\n`);

    payments.forEach((payment, i) => {
      if (i < 5) {
        const eventName = payment.eventName || payment.eventId?.title || payment.bookingId?.serviceTitle || 'MISSING';
        const eventType = payment.eventType || payment.eventId?.eventType || payment.bookingId?.serviceCategory || 'MISSING';
        
        console.log(`${i + 1}. Payment ID: ${payment._id.slice(-6)}`);
        console.log(`   Event Name: ${eventName}`);
        console.log(`   Event Type: ${eventType}`);
        console.log(`   Amount: ₹${payment.totalAmount}`);
        console.log(`   Has eventId: ${payment.eventId ? 'YES' : 'NO'}`);
        console.log(`   Has bookingId: ${payment.bookingId ? 'YES' : 'NO'}\n`);
      }
    });
  }

  // Check Notifications
  console.log('\n📋 CHECKING NOTIFICATIONS...\n');
  const notifRes = await axios.get(`${API_BASE}/notifications`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (notifRes.data.success) {
    const notifications = notifRes.data.notifications || [];
    console.log(`Found ${notifications.length} notifications\n`);

    if (notifications.length === 0) {
      console.log('⚠️  No notifications found in database');
    } else {
      notifications.forEach((n, i) => {
        if (i < 5) {
          console.log(`${i + 1}. [${n.type}] ${n.message.substring(0, 60)}...`);
          console.log(`   Date: ${new Date(n.createdAt).toLocaleString()}`);
          console.log(`   Read: ${n.read ? 'Yes' : 'No'}\n`);
        }
      });
    }
  }

  console.log('\n✅ Diagnostic complete!\n');

} catch (error) {
  console.error('❌ Error:', error.response?.data || error.message);
}
