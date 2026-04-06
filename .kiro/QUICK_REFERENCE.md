# Advance Payment Workflow - Quick Reference

## 5-Stage Booking Flow

| Stage | User Action | Merchant Action | Status | User Sees | Merchant Sees |
|-------|-------------|-----------------|--------|-----------|---------------|
| 1 | Books event | Receives notification | `pending` | "Pending Approval" 🟡 | New booking in "Pending" tab |
| 2 | Waits | Requests advance (30%) | `awaiting_advance` | "Pay Advance Now" 🔵 | Booking in "Awaiting Advance" tab |
| 3 | Pays advance | Waits for payment | `advance_paid` | "Advance Paid - Awaiting Confirmation" 🟢 | Booking in "Advance Paid" tab |
| 4 | Waits | Accepts booking | `accepted` | "Approved - Pay Now" 🟢 | Booking accepted |
| 5 | Pays remaining | Waits for payment | `confirmed` | "Confirmed" 🟢 + "View Ticket" 🎫 | Booking confirmed |

## Status Codes

```
pending              → Initial booking state
awaiting_advance     → Merchant requested advance, waiting for user payment
advance_paid         → User paid advance, waiting for merchant confirmation
accepted             → Merchant accepted, waiting for remaining payment
confirmed            → All payments done, booking confirmed
completed            → Event happened
rejected             → Merchant rejected booking
cancelled            → User cancelled booking
```

## Button Reference

### User Dashboard
```
awaiting_advance  → "Pay Advance (₹X)" button
advance_paid      → "Pay Remaining (₹X)" button
confirmed         → "View Ticket" button
completed         → "Rate Event" button
pending           → "Cancel" button
awaiting_advance  → "Cancel" button
```

### Merchant Dashboard
```
pending           → "Request Advance (30%)" + "Reject Booking"
awaiting_advance  → "⏳ Waiting for customer to pay advance..."
advance_paid      → "Accept & Confirm Booking" + "Reject & Refund"
```

## Price Calculation

```
Total Price = Service Price + Add-ons - Discount

Advance Amount = Total Price × 30% (or custom percentage)
Remaining Amount = Total Price - Advance Amount

Example:
  Service: ₹8,000
  Add-ons: ₹2,000
  Total: ₹10,000
  
  Advance (30%): ₹3,000
  Remaining: ₹7,000
```

## API Endpoints

### User Endpoints
```
POST /bookings/:id/pay-advance
  → Sets status to "advance_paid"
  → Sets advancePaid = true

POST /bookings/:id/pay-remaining
  → Sets status to "confirmed"
  → Generates ticket
```

### Merchant Endpoints
```
POST /bookings/merchant/:id/request-advance
  → Sets status to "awaiting_advance"
  → Calculates advance amount (30%)

POST /bookings/merchant/:id/accept-reject
  → Sets status to "accepted" or "rejected"
  → Stores merchant response
```

## Database Fields

```javascript
// Advance Payment Fields
advanceRequired: Boolean        // true if advance is needed
advanceAmount: Number           // calculated amount
advancePercentage: Number       // default 30%
advancePaid: Boolean            // true after user pays
advancePaymentDate: Date        // when advance was paid
remainingAmount: Number         // total - advance
```

## Common Scenarios

### Scenario 1: Happy Path
```
1. User books → pending
2. Merchant requests advance → awaiting_advance
3. User pays advance → advance_paid
4. Merchant accepts → accepted
5. User pays remaining → confirmed
6. Event happens → completed
7. User rates → rating submitted
```

### Scenario 2: Merchant Rejects After Advance
```
1. User books → pending
2. Merchant requests advance → awaiting_advance
3. User pays advance → advance_paid
4. Merchant rejects → rejected
5. Advance refunded to user
```

### Scenario 3: User Cancels Before Advance
```
1. User books → pending
2. Merchant requests advance → awaiting_advance
3. User cancels → cancelled
4. No payment made
```

## Testing Checklist

- [ ] User can book full-service event
- [ ] Merchant receives notification
- [ ] Merchant can request advance
- [ ] User sees "Pay Advance" button
- [ ] User can pay advance amount
- [ ] Merchant sees booking in "Advance Paid" tab
- [ ] Merchant can accept booking
- [ ] User sees "Pay Remaining" button
- [ ] User can pay remaining amount
- [ ] Booking status becomes "confirmed"
- [ ] User can view ticket
- [ ] Merchant can reject at any stage
- [ ] User can cancel before advance paid
- [ ] Proper notifications sent
- [ ] Price calculations are correct

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Pay Advance" button not showing | Check booking status is `awaiting_advance` |
| "Pay Remaining" button not showing | Check booking status is `advance_paid` |
| Advance amount incorrect | Verify totalPrice and advancePercentage |
| Merchant can't request advance | Check merchant is booking owner |
| User can't pay advance | Check booking status is `awaiting_advance` |
| Ticket not generating | Check booking status is `confirmed` |

## Key Files

```
Frontend:
  frontend/src/pages/dashboards/UserMyEvents.jsx
  frontend/src/pages/dashboards/MerchantAdvanceRequests.jsx

Backend:
  backend/controller/bookingController.js
  backend/models/bookingSchema.js
  backend/router/bookingRouter.js

Documentation:
  .kiro/ADVANCE_PAYMENT_WORKFLOW.md
  .kiro/WORKFLOW_VISUAL_GUIDE.md
  .kiro/IMPLEMENTATION_SUMMARY.md
  .kiro/QUICK_REFERENCE.md
```

## Important Notes

1. **Advance Percentage**: Currently hardcoded to 30%, can be made configurable
2. **Payment Processing**: Currently marks as paid without actual payment gateway integration
3. **Refunds**: Rejection refunds are not automatically processed (manual refund needed)
4. **Notifications**: Ensure notification service is properly configured
5. **Timezone**: All dates stored in UTC, convert to user timezone on display

## Next Steps

1. Integrate payment gateway (Stripe, Razorpay, etc.)
2. Add automatic refund processing
3. Add email/SMS notifications
4. Add payment history/receipts
5. Add merchant analytics dashboard
6. Add automatic webhook handling for payment status
7. Add dispute resolution system
8. Add payment retry logic
