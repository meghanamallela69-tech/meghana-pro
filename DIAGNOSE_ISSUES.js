// 🔍 DIAGNOSTIC SCRIPT - Run in Browser Console (F12)
// 
// Instructions:
// 1. Open http://localhost:5173
// 2. Press F12 to open DevTools
// 3. Go to Console tab
// 4. Paste this entire script and press Enter
// 5. Check the output

console.log('🔍 Running Diagnostic for User Dashboard...\n');

const API_BASE = 'http://localhost:5000/api/v1';
const token = localStorage.getItem('token') || sessionStorage.getItem('token');

if (!token) {
  console.log('❌ Not logged in. Please login first.\n');
} else {
  console.log('✅ Found auth token\n');
  
  // Test 1: Payments API
  console.log('📊 TEST 1: Checking Payments API...\n');
  fetch(`${API_BASE}/payments/user/my-payments`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log(`✅ Found ${data.payments.length} payments\n`);
      
      if (data.payments.length === 0) {
        console.log('⚠️  No payments found in database\n');
        console.log('💡 To create test data:');
        console.log('   1. Book an event (as user)');
        console.log('   2. Approve booking (as merchant)');
        console.log('   3. Make payment (as user)\n');
      } else {
        data.payments.forEach((payment, i) => {
          const eventName = payment.eventName || payment.eventId?.title || payment.bookingId?.serviceTitle || 'MISSING ❌';
          const eventType = payment.eventType || payment.eventId?.eventType || payment.bookingId?.serviceCategory || 'MISSING ❌';
          
          console.log(`Payment #${i + 1}:`);
          console.log(`  ID: ${payment._id.slice(-8)}`);
          console.log(`  Event Name: ${eventName}`);
          console.log(`  Event Type: ${eventType}`);
          console.log(`  Amount: ₹${payment.totalAmount}`);
          console.log(`  Has eventId: ${payment.eventId ? '✅' : '❌'}`);
          console.log(`  Has bookingId: ${payment.bookingId ? '✅' : '❌'}`);
          console.log(`  Description: ${payment.description || 'None'}`);
          console.log('');
        });
        
        const missingNames = data.payments.filter(p => 
          !p.eventName && !p.eventId?.title && !p.bookingId?.serviceTitle
        ).length;
        
        if (missingNames > 0) {
          console.log(`⚠️  ${missingNames}/${data.payments.length} payments have missing event names`);
          console.log('💡 Backend populate might not be working\n');
        } else {
          console.log('✅ All payments have event names!\n');
        }
      }
    } else {
      console.log('❌ API Error:', data.message);
    }
  })
  .catch(err => console.error('❌ Fetch error:', err));
  
  // Test 2: Notifications API
  setTimeout(() => {
    console.log('\n📊 TEST 2: Checking Notifications API...\n');
    
    fetch(`${API_BASE}/notifications`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const notifications = data.notifications || [];
        console.log(`✅ Found ${notifications.length} notifications\n`);
        
        if (notifications.length === 0) {
          console.log('⚠️  No notifications found\n');
          console.log('💡 Notifications are created when:');
          console.log('   - You book an event');
          console.log('   - Merchant approves/rejects booking');
          console.log('   - You make a payment');
          console.log('   - Payment status changes\n');
        } else {
          notifications.forEach((n, i) => {
            console.log(`Notification #${i + 1}:`);
            console.log(`  Type: ${n.type}`);
            console.log(`  Message: ${n.message.substring(0, 60)}...`);
            console.log(`  Read: ${n.read ? 'Yes' : 'No'}`);
            console.log(`  Date: ${new Date(n.createdAt).toLocaleString()}`);
            console.log(`  Has Booking: ${n.bookingId ? '✅' : '❌'}`);
            console.log(`  Has Event: ${n.eventId ? '✅' : '❌'}`);
            console.log('');
          });
          
          // Count by type
          const typeCounts = {};
          notifications.forEach(n => {
            typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
          });
          
          console.log('📋 Notification Types Summary:');
          Object.keys(typeCounts).forEach(type => {
            console.log(`  ${type}: ${typeCounts[type]}`);
          });
          console.log('');
        }
      } else {
        console.log('❌ API Error:', data.message);
      }
    })
    .catch(err => console.error('❌ Fetch error:', err));
  }, 1000);
  
  // Test 3: Events API (to check eventType field)
  setTimeout(() => {
    console.log('\n📊 TEST 3: Checking Events API...\n');
    
    fetch(`${API_BASE}/events`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const events = data.events || [];
        console.log(`✅ Found ${events.length} events\n`);
        
        const fullServiceEvents = events.filter(e => 
          e.eventType === 'full-service' || e.eventType === 'fullService'
        );
        
        console.log(`Full Service Events: ${fullServiceEvents.length}`);
        console.log(`Other Events: ${events.length - fullServiceEvents.length}\n`);
        
        if (fullServiceEvents.length > 0) {
          console.log('Sample Full Service Event:');
          const sample = fullServiceEvents[0];
          console.log(`  Title: ${sample.title}`);
          console.log(`  Type: ${sample.eventType}`);
          console.log(`  Category: ${sample.category}`);
          console.log(`  Has Date: ${sample.date ? 'Yes' : 'No'}`);
          console.log(`  Frontend should HIDE date for this event ✅\n`);
        }
      } else {
        console.log('❌ API Error:', data.message);
      }
    })
    .catch(err => console.error('❌ Fetch error:', err));
  }, 2000);
}

console.log('\n✅ Diagnostic script started!\n');
console.log('Check output above for results...\n');
