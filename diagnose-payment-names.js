// 🔍 DIAGNOSE PAYMENT NAMES - Run in Browser Console
//
// This will show EXACTLY what the API returns
// so we can fix the event name display properly

console.log('🔍 Diagnosing Payment Event Names...\n');

const token = localStorage.getItem('token');

if (!token) {
  console.log('❌ Not logged in! Please login first.');
} else {
  fetch('http://localhost:5000/api/v1/payments/user/my-payments', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(r => r.json())
  .then(data => {
    console.log('=== RAW API RESPONSE ===\n');
    
    if (!data.success || !data.payments || data.payments.length === 0) {
      console.log('❌ No payments found!');
      console.log('💡 You need to create bookings, get approved, and make payments first.');
    } else {
      console.log(`✅ Found ${data.payments.length} payment(s)\n`);
      
      data.payments.forEach((p, i) => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`PAYMENT #${i + 1}`);
        console.log('='.repeat(60));
        
        console.log('\n📊 BASIC INFO:');
        console.log('  Payment ID:', p._id);
        console.log('  Description:', p.description);
        console.log('  Total Amount:', p.totalAmount);
        
        console.log('\n🎯 EVENT NAME SOURCES:');
        console.log('  eventId.title:', p.eventId?.title || '❌ NULL');
        console.log('  bookingId.serviceTitle:', p.bookingId?.serviceTitle || '❌ NULL');
        console.log('  eventName (custom):', p.eventName || '❌ NULL');
        
        console.log('\n🏷️ EVENT TYPE SOURCES:');
        console.log('  eventId.eventType:', p.eventId?.eventType || '❌ NULL');
        console.log('  bookingId.serviceType:', p.bookingId?.serviceType || '❌ NULL');
        console.log('  bookingId.serviceCategory:', p.bookingId?.serviceCategory || '❌ NULL');
        console.log('  eventType (direct):', p.eventType || '❌ NULL');
        
        console.log('\n✅ WHAT FRONTEND WILL DISPLAY:');
        
        // Event Name Logic
        const displayName = (() => {
          if (p.eventId?.title) return p.eventId.title;
          if (p.bookingId?.serviceTitle) return p.bookingId.serviceTitle;
          if (p.eventName) return p.eventName;
          if (p.description) {
            return p.description.replace('Payment for booking:', '').replace('Payment for ', '').trim();
          }
          return 'N/A';
        })();
        
        // Event Type Logic
        let displayType = null;
        if (p.eventId?.eventType) displayType = p.eventId.eventType;
        else if (p.bookingId?.serviceType) displayType = p.bookingId.serviceType;
        else if (p.bookingId?.serviceCategory) displayType = p.bookingId.serviceCategory;
        else if (p.eventType) displayType = p.eventType;
        
        const displayTypeFormatted = (() => {
          if (!displayType) return 'N/A';
          if (displayType === 'ticketed') return 'Ticketed';
          if (displayType === 'full-service' || displayType === 'fullService') return 'Full Service';
          return displayType.charAt(0).toUpperCase() + displayType.slice(1);
        })();
        
        console.log(`  🎯 Event Name: "${displayName}"`);
        console.log(`  🏷️ Event Type: "${displayTypeFormatted}"`);
        
        console.log('\n🐛 ANALYSIS:');
        if (displayName === 'N/A') {
          console.log('  ❌ NO event name source available!');
          console.log('  💡 Need at least one of: eventId.title, bookingId.serviceTitle, eventName, or description');
        } else if (p.eventId?.title) {
          console.log('  ✅ eventId.title exists → Should display cleanly');
        } else if (p.bookingId?.serviceTitle) {
          console.log('  ✅ bookingId.serviceTitle exists → Should display cleanly');
        } else if (p.description) {
          console.log('  ℹ️ Using description extraction → Will remove "Payment for" prefix');
        }
        
        if (displayTypeFormatted === 'N/A') {
          console.log('  ❌ NO event type source available!');
        } else {
          console.log(`  ✅ Event type found: ${displayType} → Formatted as: ${displayTypeFormatted}`);
        }
      });
      
      console.log(`\n${'='.repeat(60)}`);
      console.log('📋 SUMMARY');
      console.log('='.repeat(60));
      
      const hasEventId = data.payments.some(p => p.eventId);
      const hasBookingId = data.payments.some(p => p.bookingId);
      const hasDescription = data.payments.some(p => p.description);
      
      console.log(`Payments with eventId populated: ${hasEventId ? '✅ YES' : '❌ NO'}`);
      console.log(`Payments with bookingId populated: ${hasBookingId ? '✅ YES' : '❌ NO'}`);
      console.log(`Payments with description: ${hasDescription ? '✅ YES' : '❌ NO'}`);
      
      console.log('\n🔧 RECOMMENDATION:');
      if (!hasEventId && !hasBookingId && !hasDescription) {
        console.log('  ❌ CRITICAL: No data sources available at all!');
        console.log('  💡 Payments were created without event/booking references');
        console.log('  🔄 Solution: Create NEW payments through proper booking flow');
      } else if (!hasEventId && !hasBookingId) {
        console.log('  ⚠️ Backend populate() not working OR old payment data');
        console.log('  🔄 Try: Clear cache AND create new test payments');
      } else {
        console.log('  ✅ Data sources exist → Frontend should display correctly');
        console.log('  🔄 If still showing N/A, CLEAR BROWSER CACHE (Ctrl+Shift+R)');
      }
    }
  })
  .catch(err => {
    console.error('❌ Error fetching payments:', err.message);
    console.log('💡 Make sure backend is running on http://localhost:5000');
  });
}
