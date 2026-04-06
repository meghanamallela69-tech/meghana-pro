# Testing Guide: Payment Modal for Advance & Remaining Payments

## Quick Test (10 minutes)

### Step 1: Create Full-Service Booking
```
1. Login as User
2. Go to Browse Events
3. Find a full-service event
4. Fill booking form and submit
5. Booking created with status "pending"
```

### Step 2: Merchant Requests Advance
```
1. Logout and login as Merchant
2. Go to Dashboard → "Advance Payment Requests"
3. Find the booking in "Pending" tab
4. Click "Request Advance (30%)"
5. Confirm in popup
6. Booking moves to "Awaiting Advance" tab
```

### Step 3: Test Payment Modal - Advance Payment
```
1. Logout and login as User
2. Go to "My Bookings"
3. Find booking with "Pay Advance Now" status
4. Click "Pay Advance (₹X)" button
```

**Expected Result**:
- ✅ Payment modal opens
- ✅ Shows "Pay Advance Amount" title
- ✅ Shows booking name
- ✅ Shows advance amount (30%)
- ✅ Shows remaining amount
- ✅ Shows payment method options (Card, UPI)
- ✅ Shows payment form fields

### Step 4: Enter Payment Details
```
1. Select "Card" payment method
2. Enter card details:
   - Card Number: 4111 1111 1111 1111
   - Cardholder Name: John Doe
   - Expiry: 12/25
   - CVV: 123
3. Click "Pay Advance ₹X" button
```

**Expected Result**:
- ✅ Button shows loading state
- ✅ Payment processes
- ✅ Success message appears
- ✅ Modal closes
- ✅ Bookings page refreshes
- ✅ Booking status changes to "Advance Paid - Awaiting Confirmation"

### Step 5: Merchant Accepts Booking
```
1. Logout and login as Merchant
2. Go to "Advance Payment Requests"
3. Find booking in "Advance Paid" tab
4. Click "Accept & Confirm Booking"
5. Confirm in popup
```

**Expected Result**:
- ✅ Booking status changes to "Accepted"
- ✅ Booking removed from Advance Requests page

### Step 6: Test Payment Modal - Remaining Payment
```
1. Logout and login as User
2. Go to "My Bookings"
3. Find booking with "Pay Remaining (₹X)" button
4. Click button
```

**Expected Result**:
- ✅ Payment modal opens
- ✅ Shows "Pay Remaining Amount" title
- ✅ Shows booking name
- ✅ Shows remaining amount
- ✅ Shows advance paid amount
- ✅ Shows total amount
- ✅ Shows payment method options

### Step 7: Enter Payment Details for Remaining
```
1. Select "UPI" payment method
2. Enter UPI ID: user@upi
3. Click "Pay Remaining ₹X" button
```

**Expected Result**:
- ✅ Button shows loading state
- ✅ Payment processes
- ✅ Success message appears
- ✅ Modal closes
- ✅ Bookings page refreshes
- ✅ Booking status changes to "Confirmed"
- ✅ "View Ticket" button appears

## Detailed Test Scenarios

### Scenario 1: Card Payment for Advance
```
Payment Method: Card
Card Number: 4111 1111 1111 1111
Cardholder: John Doe
Expiry: 12/25
CVV: 123
```

**Checklist**:
- [ ] Modal opens when clicking "Pay Advance"
- [ ] Card form displays correctly
- [ ] Card number formatting works (spaces added)
- [ ] All fields are required
- [ ] Payment processes successfully
- [ ] Success message shows
- [ ] Booking status updates to "advance_paid"
- [ ] Modal closes automatically

### Scenario 2: UPI Payment for Remaining
```
Payment Method: UPI
UPI ID: user@upi
```

**Checklist**:
- [ ] Modal opens when clicking "Pay Remaining"
- [ ] UPI form displays correctly
- [ ] UPI ID field is required
- [ ] Payment processes successfully
- [ ] Success message shows
- [ ] Booking status updates to "confirmed"
- [ ] Ticket is generated
- [ ] Modal closes automatically

### Scenario 3: Payment Modal Validation
```
Test form validation
```

**Checklist**:
- [ ] Cannot submit without card number
- [ ] Cannot submit without cardholder name
- [ ] Cannot submit without expiry date
- [ ] Cannot submit without CVV
- [ ] Cannot submit without UPI ID
- [ ] Error messages display correctly
- [ ] Form fields are properly formatted

### Scenario 4: Modal Close Behavior
```
Test closing the modal
```

**Checklist**:
- [ ] Can close by clicking X button
- [ ] Can close by clicking outside modal
- [ ] Can close by pressing Escape key
- [ ] Closing doesn't process payment
- [ ] Bookings page remains unchanged

### Scenario 5: Multiple Bookings
```
Create 3 bookings at different stages
```

**Checklist**:
- [ ] Can open payment modal for each booking
- [ ] Correct amount shown for each booking
- [ ] Correct payment type shown (advance vs remaining)
- [ ] Each payment processes independently
- [ ] Bookings update correctly

## Visual Verification

### Advance Payment Modal
```
✅ Header: "Pay Advance Amount"
✅ Booking name displayed
✅ Advance amount highlighted in blue
✅ Remaining amount shown below
✅ Payment method buttons visible
✅ Card form fields visible
✅ Security notice at bottom
✅ Pay button shows correct amount
```

### Remaining Payment Modal
```
✅ Header: "Pay Remaining Amount"
✅ Booking name displayed
✅ Remaining amount highlighted in green
✅ Advance paid amount shown
✅ Total amount shown
✅ Payment method buttons visible
✅ Card form fields visible
✅ Security notice at bottom
✅ Pay button shows correct amount
```

## Error Handling

### Test Error Scenarios
```
1. Network error during payment
   → Should show error message
   → Should allow retry

2. Invalid card details
   → Should show validation error
   → Should not process payment

3. Payment timeout
   → Should show timeout error
   → Should allow retry

4. Modal close during payment
   → Should prevent closing
   → Should show warning
```

## Performance Testing

### Load Test
```
1. Open payment modal
2. Check modal loads quickly (< 1 second)
3. Check form fields are responsive
4. Check payment processes in reasonable time (< 5 seconds)
```

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
- [ ] Desktop (1920px) - Modal displays correctly
- [ ] Tablet (768px) - Modal displays correctly
- [ ] Mobile (375px) - Modal displays correctly

## Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Tab order is logical
- [ ] Form labels are associated with inputs
- [ ] Error messages are announced
- [ ] Modal can be closed with Escape key
- [ ] Focus is managed properly

## Integration Testing

### Test with Different Booking Types
- [ ] Full-service bookings with advance
- [ ] Full-service bookings without advance
- [ ] Ticketed bookings (if applicable)

### Test with Different Statuses
- [ ] pending → awaiting_advance → advance_paid → accepted → confirmed
- [ ] pending → rejected
- [ ] awaiting_advance → cancelled

## Sign-Off Checklist

- [ ] Advance payment modal opens correctly
- [ ] Remaining payment modal opens correctly
- [ ] Payment details can be entered
- [ ] Payments process successfully
- [ ] Booking statuses update correctly
- [ ] Bookings page refreshes after payment
- [ ] No console errors
- [ ] No network errors
- [ ] Mobile responsive
- [ ] Accessibility compliant
- [ ] All browsers tested
- [ ] Ready for production

## Notes

- Test with multiple merchants
- Test with multiple users
- Test with different payment amounts
- Test with different payment methods
- Test payment modal multiple times
- Test closing modal at different stages
- Test network errors and retries
