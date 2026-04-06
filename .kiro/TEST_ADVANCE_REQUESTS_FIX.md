# Testing Guide: Advance Requests Page Fix

## Quick Test (5 minutes)

### Step 1: Create a Full-Service Booking
```
1. Login as User
2. Go to Browse Events
3. Find a full-service event
4. Fill booking form:
   - Date: Tomorrow
   - Time: 10:00 AM
   - Guests: 5
   - Location: Your address
   - Add-ons: Select any
5. Click "Book Now"
6. Confirm booking
```

**Expected Result**: Booking created successfully ✅

### Step 2: Check Advance Requests Page
```
1. Logout and login as Merchant (who created the event)
2. Go to Dashboard → "Advance Payment Requests"
3. Look for the booking you just created
```

**Expected Result**: 
- Booking appears in "Pending" tab ✅
- Shows customer name ✅
- Shows event date ✅
- Shows total price ✅
- "Request Advance (30%)" button visible ✅

### Step 3: Request Advance
```
1. Click "Request Advance (30%)" button
2. Confirm in popup
```

**Expected Result**:
- Booking moves to "Awaiting Advance" tab ✅
- Shows "Waiting for customer to pay advance..." message ✅
- Advance amount calculated correctly (30% of total) ✅

### Step 4: User Pays Advance
```
1. Logout and login as User
2. Go to "My Bookings"
3. Find the booking with "Pay Advance Now" status
4. Click "Pay Advance (₹X)" button
5. Confirm payment
```

**Expected Result**:
- Status changes to "Advance Paid - Awaiting Confirmation" ✅
- "Pay Remaining" button appears ✅

### Step 5: Merchant Accepts Booking
```
1. Logout and login as Merchant
2. Go to "Advance Payment Requests"
3. Booking should be in "Advance Paid" tab
4. Click "Accept & Confirm Booking"
5. Confirm in popup
```

**Expected Result**:
- Booking status changes to "Accepted" ✅
- Booking removed from "Advance Requests" page ✅
- Booking no longer in any tab ✅

### Step 6: User Pays Remaining
```
1. Logout and login as User
2. Go to "My Bookings"
3. Find booking with "Pay Remaining" button
4. Click "Pay Remaining (₹X)"
5. Confirm payment
```

**Expected Result**:
- Status changes to "Confirmed" ✅
- "View Ticket" button appears ✅
- Ticket can be downloaded ✅

## Detailed Test Scenarios

### Scenario 1: Happy Path (Complete Workflow)
```
User Books → Merchant Requests Advance → User Pays Advance 
→ Merchant Accepts → User Pays Remaining → Booking Confirmed
```

**Checklist**:
- [ ] Booking visible in Advance Requests (Pending tab)
- [ ] Advance amount = 30% of total
- [ ] Remaining amount = 70% of total
- [ ] All buttons work correctly
- [ ] Status updates correctly at each stage
- [ ] Booking removed after acceptance

### Scenario 2: Merchant Rejects After Advance Paid
```
User Books → Merchant Requests Advance → User Pays Advance 
→ Merchant Rejects
```

**Checklist**:
- [ ] Booking visible in Advance Requests (Pending tab)
- [ ] After advance paid, booking in "Advance Paid" tab
- [ ] "Reject & Refund" button works
- [ ] Booking status changes to "Rejected"
- [ ] Booking removed from Advance Requests page

### Scenario 3: User Cancels Before Advance
```
User Books → Merchant Requests Advance → User Cancels
```

**Checklist**:
- [ ] Booking visible in Advance Requests (Pending tab)
- [ ] After advance requested, booking in "Awaiting Advance" tab
- [ ] User can click "Cancel" button
- [ ] Booking status changes to "Cancelled"
- [ ] Booking removed from Advance Requests page

### Scenario 4: Multiple Bookings
```
Create 3 full-service bookings at different stages
```

**Checklist**:
- [ ] All 3 bookings visible in Advance Requests
- [ ] Correct count in each tab
- [ ] Can manage each booking independently
- [ ] Statuses update correctly

## Database Verification

### Check Booking Status
```javascript
// In MongoDB or your database client
db.bookings.find({
  merchant: ObjectId("merchant_id"),
  eventType: "full-service",
  status: { $in: ["pending", "awaiting_advance", "advance_paid"] }
})

// Should return all full-service bookings in these statuses
```

### Check Advance Fields
```javascript
// After requesting advance
db.bookings.findOne({ _id: ObjectId("booking_id") })

// Should show:
{
  advanceRequired: true,
  advanceAmount: 3000,        // 30% of total
  advancePercentage: 30,
  advancePaid: false,
  remainingAmount: 7000,      // 70% of total
  status: "awaiting_advance"
}

// After user pays advance
{
  advanceRequired: true,
  advanceAmount: 3000,
  advancePercentage: 30,
  advancePaid: true,          // ✅ Changed to true
  advancePaymentDate: ISODate("2026-04-02T..."),
  remainingAmount: 7000,
  status: "advance_paid"      // ✅ Changed to advance_paid
}
```

## API Testing

### Test Endpoint: Get Advance Requests
```bash
curl -X GET http://localhost:5000/api/bookings/merchant/advance-requests \
  -H "Authorization: Bearer <merchant_token>" \
  -H "Content-Type: application/json"

# Expected Response:
{
  "success": true,
  "bookings": [
    {
      "_id": "...",
      "serviceTitle": "Wedding Catering",
      "eventType": "full-service",
      "status": "pending",
      "totalPrice": 10000,
      "user": {
        "_id": "...",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "advanceRequired": false,
      "advanceAmount": 0,
      "advancePaid": false,
      ...
    }
  ]
}
```

### Test Endpoint: Request Advance
```bash
curl -X POST http://localhost:5000/api/bookings/merchant/<booking_id>/request-advance \
  -H "Authorization: Bearer <merchant_token>" \
  -H "Content-Type: application/json" \
  -d '{"advancePercentage": 30}'

# Expected Response:
{
  "success": true,
  "message": "Advance payment requested successfully",
  "booking": {
    "status": "awaiting_advance",
    "advanceRequired": true,
    "advanceAmount": 3000,
    "advancePercentage": 30,
    "remainingAmount": 7000,
    ...
  }
}
```

## Performance Testing

### Load Test: Multiple Bookings
```
1. Create 100 full-service bookings
2. Request advance on 50 of them
3. Pay advance on 25 of them
4. Check Advance Requests page loads quickly
```

**Expected Result**: Page loads in < 2 seconds ✅

## Browser Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari Mobile
- [ ] Firefox Mobile

### Responsive Design
- [ ] Desktop (1920px)
- [ ] Tablet (768px)
- [ ] Mobile (375px)

## Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Tab order is logical
- [ ] Buttons have proper labels
- [ ] Color not sole indicator
- [ ] Screen reader compatible

## Error Handling

### Test Error Scenarios
```
1. Request advance on non-existent booking
   → Should show error message

2. Request advance as non-merchant
   → Should show "Unauthorized" error

3. Request advance twice
   → Should show error or prevent duplicate

4. Network error during request
   → Should show error and allow retry
```

## Rollback Plan

If issues occur:
```
1. Revert backend/controller/bookingController.js
2. Restart backend server
3. Clear browser cache
4. Test again
```

## Sign-Off Checklist

- [ ] All test scenarios pass
- [ ] No console errors
- [ ] No database errors
- [ ] Performance acceptable
- [ ] Mobile responsive
- [ ] Accessibility compliant
- [ ] Error handling works
- [ ] Ready for production

## Notes

- Test with multiple merchants
- Test with multiple users
- Test with different event types
- Test with different booking statuses
- Test with different advance percentages
