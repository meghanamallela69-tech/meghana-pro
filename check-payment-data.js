// 🔍 CHECK PAYMENT DATA - Run in Browser Console
//
// Instructions:
// 1. Login to app (http://localhost:5173)
// 2. Go to User Dashboard → Payments page
// 3. Press F12 → Console tab
// 4. Paste this code and press Enter

console.log('🔍 Checking Payment Data...\n');

const token = localStorage.getItem('token');

if (!token) {
  console.log('❌ Not logged in! Please login first.');
} else {
  fetch('http://localhost:5000/api/v1/payments/user', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(r => r.json())
  .then(data => {
    console.log('=== PAYMENTS API RESPONSE ===\n');
    
    if (!data.success || !data.payments || data.payments.length === 0) {
      console.log('❌ No payments found in database!');
      console.log('\n💡 Solution: You need to create a booking, get it approved, and make a payment first.');
    } else {
      console.log(`✅ Found ${data.payments.length} payment(s)\n`);
      
      data.payments.forEach((p, i) => {
        console.log(`\n--- Payment ${i + 1} ---`);
        console.log('Description:', p.description);
        console.log('Event Name field:', p.eventName);
        console.log('Event ID title:', p.eventId?.title);
        console.log('Booking Service Title:', p.bookingId?.serviceTitle);
        console.log('Event Type:', p.eventId?.eventType);
        
        // What frontend SHOULD display:
        const extractedName = (() => {
          const name = p.eventId?.title || p.bookingId?.serviceTitle || p.eventName;
          if (name) return name;
          if (p.description) {
            return p.description
              .replace('Payment for booking:', '')
              .replace('Payment for', '')
              .trim();
          }
          return 'N/A';
        })();
        
        console.log('\n✅ Frontend should display:', extractedName);
        console.log('─────────────────────────');
      });
      
      console.log('\n📋 Summary:');
      console.log('- If description has "Payment for booking:" but eventId.title exists → Cache issue');
      console.log('- If description is clean but still shows wrong → Check browser cache');
      console.log('- If all fields are wrong → Backend data issue');
    }
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
  });
}
