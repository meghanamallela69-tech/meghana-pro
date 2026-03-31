// 📝 CREATE TEST NOTIFICATIONS - Run in Browser Console
//
// Instructions:
// 1. Login to the app (http://localhost:5173)
// 2. Press F12 → Console tab
// 3. Paste this code and press Enter
// 4. Refresh the Notifications page

console.log('📝 Creating test notifications...\n');

const API_BASE = 'http://localhost:5000/api/v1';
const token = localStorage.getItem('token') || sessionStorage.getItem('token');

if (!token) {
  console.log('❌ Please login first!\n');
} else {
  const testNotifications = [
    {
      message: 'Payment successful! Your booking for "Wedding" is confirmed.',
      type: 'payment'
    },
    {
      message: 'Booking approved for "Wedding". Please proceed to payment.',
      type: 'booking_approved'
    },
    {
      message: 'Your booking status has been updated for "Wedding".',
      type: 'booking_status_update'
    },
    {
      message: 'Payment request: Please complete payment for "Wedding".',
      type: 'payment_request'
    },
    {
      message: 'New booking request received for "Birthday Party".',
      type: 'booking_request'
    }
  ];

  async function createNotifications() {
    try {
      // Use batch endpoint for better reliability
      const response = await fetch(`${API_BASE}/notifications/create-test-batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notifications: testNotifications })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`\n🎉 Successfully created ${data.count} test notifications!\n`);
        data.notifications.forEach((n, i) => {
          console.log(`${i + 1}. [${n.type}] ${n.message.substring(0, 50)}...`);
        });
        console.log('\n📋 Next steps:');
        console.log('1. Go to User Dashboard → Notifications');
        console.log('2. You should see 5 colorful notifications with badges\n');
      } else {
        console.log('❌ Failed:', data.message);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }

  createNotifications();
}
