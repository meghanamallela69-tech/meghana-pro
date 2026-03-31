/**
 * Test script to verify dynamic ticket availability calculation
 * 
 * This script verifies that:
 * 1. Events API returns correct ticket availability
 * 2. quantityAvailable is calculated as quantityTotal - quantitySold
 * 3. availableTickets at event level matches sum of all ticket type availability
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';

async function testTicketAvailability() {
  try {
    console.log('🧪 Testing Dynamic Ticket Availability Calculation\n');
    console.log('=' .repeat(60));
    
    // Step 1: Login as user to get token
    console.log('\n📝 Step 1: Logging in as test user...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'user@test.com',
      password: 'User@123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    const token = loginResponse.data.token;
    console.log('✅ User logged in successfully');
    console.log(`   Token: ${token.substring(0, 20)}...\n`);
    
    // Step 2: Fetch all events
    console.log('📋 Step 2: Fetching all events...\n');
    const eventsResponse = await axios.get(`${API_BASE}/events`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!eventsResponse.data.success) {
      throw new Error('Failed to fetch events');
    }
    
    const events = eventsResponse.data.events;
    console.log(`✅ Found ${events.length} events\n`);
    
    // Step 3: Check ticketed events for dynamic availability
    console.log('🎫 Step 3: Checking ticketed events for dynamic availability\n');
    console.log('=' .repeat(60));
    
    let ticketedEventsFound = 0;
    let eventsWithCorrectAvailability = 0;
    
    events.forEach((event, index) => {
      if (event.eventType === 'ticketed') {
        ticketedEventsFound++;
        
        console.log(`\n📌 Event ${ticketedEventsFound}: ${event.title}`);
        console.log(`   Event ID: ${event._id}`);
        console.log(`   Event Type: ${event.eventType}`);
        
        if (!event.ticketTypes || event.ticketTypes.length === 0) {
          console.log('   ⚠️  No ticket types found\n');
          return;
        }
        
        console.log(`   Total Ticket Types: ${event.ticketTypes.length}`);
        
        let calculatedTotalAvailable = 0;
        let hasCorrectCalculation = true;
        
        // Check each ticket type
        event.ticketTypes.forEach((ticket, ticketIndex) => {
          const quantityTotal = ticket.quantityTotal || 0;
          const quantitySold = ticket.quantitySold || 0;
          const quantityAvailable = ticket.quantityAvailable || 0;
          const expectedAvailable = quantityTotal - quantitySold;
          
          console.log(`\n   🎟️  Ticket Type ${ticketIndex + 1}: ${ticket.name}`);
          console.log(`      Quantity Total: ${quantityTotal}`);
          console.log(`      Quantity Sold: ${quantitySold}`);
          console.log(`      Quantity Available (from DB): ${quantityAvailable}`);
          console.log(`      Expected Available (calculated): ${expectedAvailable}`);
          
          if (quantityAvailable === expectedAvailable) {
            console.log(`      ✅ CORRECT: ${quantityTotal} - ${quantitySold} = ${quantityAvailable}`);
          } else {
            console.log(`      ❌ INCORRECT: Should be ${expectedAvailable}, but got ${quantityAvailable}`);
            hasCorrectCalculation = false;
          }
          
          calculatedTotalAvailable += expectedAvailable;
        });
        
        // Check event-level available tickets
        console.log(`\n   📊 Event Level:`);
        console.log(`      Available Tickets (from DB): ${event.availableTickets || 0}`);
        console.log(`      Available Tickets (calculated): ${calculatedTotalAvailable}`);
        
        if (event.availableTickets === calculatedTotalAvailable) {
          console.log(`      ✅ CORRECT: Sum matches event available tickets`);
          eventsWithCorrectAvailability++;
        } else {
          console.log(`      ❌ INCORRECT: Should be ${calculatedTotalAvailable}, but got ${event.availableTickets || 0}`);
          hasCorrectCalculation = false;
        }
        
        if (hasCorrectCalculation) {
          console.log(`\n   ✅ Event ${ticketedEventsFound} PASSED: All calculations correct!`);
        } else {
          console.log(`\n   ❌ Event ${ticketedEventsFound} FAILED: Calculations incorrect!`);
        }
        
        console.log('=' .repeat(60));
      }
    });
    
    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Events: ${events.length}`);
    console.log(`Ticketed Events Found: ${ticketedEventsFound}`);
    console.log(`Events with Correct Availability: ${eventsWithCorrectAvailability}`);
    
    if (ticketedEventsFound === 0) {
      console.log('\n⚠️  No ticketed events found in the database.');
      console.log('   Please create a ticketed event with multiple bookings to test.');
    } else if (eventsWithCorrectAvailability === ticketedEventsFound) {
      console.log('\n✅ ALL TESTS PASSED!');
      console.log('   Dynamic ticket availability calculation is working correctly!');
    } else {
      console.log('\n❌ SOME TESTS FAILED!');
      console.log(`   ${ticketedEventsFound - eventsWithCorrectAvailability} event(s) have incorrect availability calculation.`);
      console.log('\n💡 The backend needs to recalculate availability on every request.');
    }
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Is the backend server running?');
    }
    process.exit(1);
  }
}

// Run the test
testTicketAvailability();
