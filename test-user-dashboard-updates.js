import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

// Test credentials
const TEST_USER_EMAIL = 'user@test.com';
const TEST_USER_PASSWORD = 'User@123';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`${colors.cyan}=============================================`);
console.log(`   User Dashboard Updates - Test Script`);
console.log(`=============================================${colors.reset}\n`);

// Login function
async function login(email, password) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password
    });
    
    if (response.data.success) {
      console.log(`${colors.green}✓${colors.reset} Login successful for ${email}`);
      return response.data.token;
    } else {
      console.log(`${colors.red}✗${colors.reset} Login failed: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Login error: ${error.message}`);
    return null;
  }
}

// Test 1: Check Events API for eventType field
async function testEventsAPI(token) {
  console.log(`\n${colors.yellow}[Test 1] Checking Events API...${colors.reset}`);
  
  try {
    const response = await axios.get(`${API_BASE}/events`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      const events = response.data.events;
      console.log(`${colors.green}✓${colors.reset} Found ${events.length} events`);
      
      // Check for full service events
      const fullServiceEvents = events.filter(e => e.eventType === 'fullService');
      const otherEvents = events.filter(e => e.eventType && e.eventType !== 'fullService');
      
      console.log(`${colors.blue}ℹ${colors.reset} Full Service Events: ${fullServiceEvents.length}`);
      console.log(`${colors.blue}ℹ${colors.reset} Other Events: ${otherEvents.length}`);
      
      if (fullServiceEvents.length > 0) {
        console.log(`${colors.green}✓${colors.reset} Sample Full Service Event:`);
        const sample = fullServiceEvents[0];
        console.log(`   - Title: ${sample.title}`);
        console.log(`   - Type: ${sample.eventType}`);
        console.log(`   - Has Date: ${sample.date ? 'Yes' : 'No'}`);
      }
      
      return true;
    } else {
      console.log(`${colors.red}✗${colors.reset} Events API failed`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Events API error: ${error.message}`);
    return false;
  }
}

// Test 2: Check User Payments API
async function testPaymentsAPI(token) {
  console.log(`\n${colors.yellow}[Test 2] Checking Payments API...${colors.reset}`);
  
  try {
    const response = await axios.get(`${API_BASE}/payments/user/my-payments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      const payments = response.data.payments;
      console.log(`${colors.green}✓${colors.reset} Found ${payments.length} payments`);
      
      // Check each payment for event name
      let naCount = 0;
      let withEventName = 0;
      
      payments.forEach((payment, index) => {
        const eventName = payment.eventName || payment.eventId?.title || payment.bookingId?.serviceTitle || 'N/A';
        
        if (eventName === 'N/A') {
          naCount++;
        } else {
          withEventName++;
        }
        
        if (index < 3) { // Show first 3 payments
          console.log(`${colors.blue}ℹ${colors.reset} Payment ${index + 1}:`);
          console.log(`   - Event Name: ${eventName}`);
          console.log(`   - Type: ${payment.eventType || payment.eventId?.eventType || payment.bookingId?.serviceCategory || 'N/A'}`);
          console.log(`   - Amount: ₹${payment.totalAmount}`);
        }
      });
      
      console.log(`\n${colors.green}✓${colors.reset} Payments with event names: ${withEventName}/${payments.length}`);
      
      if (naCount > 0) {
        console.log(`${colors.yellow}⚠${colors.reset} Payments without event names: ${naCount}`);
      }
      
      return true;
    } else {
      console.log(`${colors.red}✗${colors.reset} Payments API failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Payments API error: ${error.message}`);
    return false;
  }
}

// Test 3: Check Notifications API
async function testNotificationsAPI(token) {
  console.log(`\n${colors.yellow}[Test 3] Checking Notifications API...${colors.reset}`);
  
  try {
    const response = await axios.get(`${API_BASE}/notifications`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      const notifications = response.data.notifications || [];
      console.log(`${colors.green}✓${colors.reset} Found ${notifications.length} notifications`);
      
      // Count by type
      const typeCounts = {};
      notifications.forEach(notif => {
        typeCounts[notif.type] = (typeCounts[notif.type] || 0) + 1;
      });
      
      console.log(`${colors.blue}ℹ${colors.reset} Notification types:`);
      Object.keys(typeCounts).forEach(type => {
        console.log(`   - ${type}: ${typeCounts[type]}`);
      });
      
      // Show sample notifications
      if (notifications.length > 0) {
        console.log(`\n${colors.blue}ℹ${colors.reset} Sample notifications:`);
        notifications.slice(0, 3).forEach((notif, index) => {
          console.log(`${colors.blue}   Notification ${index + 1}:${colors.reset}`);
          console.log(`      Type: ${notif.type}`);
          console.log(`      Message: ${notif.message.substring(0, 60)}...`);
          console.log(`      Read: ${notif.read ? 'Yes' : 'No'}`);
          console.log(`      Has Booking ID: ${notif.bookingId ? 'Yes' : 'No'}`);
          console.log(`      Has Event ID: ${notif.eventId ? 'Yes' : 'No'}`);
        });
      }
      
      return true;
    } else {
      console.log(`${colors.red}✗${colors.reset} Notifications API failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Notifications API error: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log(`${colors.cyan}Starting tests...${colors.reset}\n`);
  
  // Login
  const token = await login(TEST_USER_EMAIL, TEST_USER_PASSWORD);
  
  if (!token) {
    console.log(`\n${colors.red}✗ Tests aborted - Login failed${colors.reset}`);
    console.log(`${colors.yellow}Make sure the backend is running and test user exists${colors.reset}`);
    return;
  }
  
  // Run all tests
  const results = {
    events: await testEventsAPI(token),
    payments: await testPaymentsAPI(token),
    notifications: await testNotificationsAPI(token)
  };
  
  // Summary
  console.log(`\n${colors.cyan}=============================================`);
  console.log(`   Test Summary`);
  console.log(`=============================================${colors.reset}\n`);
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.values(results).length;
  
  console.log(`${colors.blue}Events API:${colors.reset} ${results.events ? colors.green + 'PASS' + colors.reset : colors.red + 'FAIL' + colors.reset}`);
  console.log(`${colors.blue}Payments API:${colors.reset} ${results.payments ? colors.green + 'PASS' + colors.reset : colors.red + 'FAIL' + colors.reset}`);
  console.log(`${colors.blue}Notifications API:${colors.reset} ${results.notifications ? colors.green + 'PASS' + colors.reset : colors.red + 'FAIL' + colors.reset}`);
  
  console.log(`\n${colors.cyan}Overall: ${passed}/${total} tests passed${colors.reset}`);
  
  if (passed === total) {
    console.log(`${colors.green}✓ All tests passed!${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ Some tests failed. Check the logs above.${colors.reset}`);
  }
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
});
