# Full-Service Event Booking with Advance Payment Workflow

## Overview
This document describes the complete workflow for full-service event bookings with advance payment system.

## Booking Lifecycle

### Stage 1: User Books Event (Status: `pending`)
1. User fills out booking form in `FullServiceBookingModal`
2. Booking is created with status `pending`
3. Merchant receives notification about new booking request
4. **User Dashboard**: Shows "Pending Approval" status

### Stage 2: Merchant Requests Advance (Status: `awaiting_advance`)
1. Merchant views booking in "Advance Payment Requests" dashboard
2. Merchant clicks "Request Advance (30%)" button
3. System calculates 30% of total amount as advance
4. Booking status changes to `awaiting_advance`
5. **User Dashboard**: Shows "Pay Advance Now" status with blue badge
6. **User Action**: "Pay Advance" button appears with advance amount

### Stage 3: User Pays Advance (Status: `advance_paid`)
1. User clicks "Pay Advance" button in their bookings
2. User confirms payment of advance amount
3. Payment is processed
4. Booking status changes to `advance_paid`
5. **Merchant Dashboard**: Booking moves to "Advance Paid" tab
6. **User Dashboard**: Shows "Advance Paid - Awaiting Confirmation" status

### Stage 4: Merchant Accepts/Rejects (Status: `accepted` or `rejected`)
1. Merchant reviews booking details with advance paid
2. Merchant can:
   - **Accept**: Click "Accept & Confirm Booking" → Status becomes `accepted`
   - **Reject**: Click "Reject & Refund" → Status becomes `rejected`, advance refunded
3. **User Dashboard**: 
   - If accepted: Shows "Approved - Pay Now" status
   - If rejected: Shows "Rejected" status

### Stage 5: User Pays Remaining Amount (Status: `confirmed`)
1. User clicks "Pay Remaining" button
2. User confirms payment of remaining amount
3. Payment is processed
4. Booking status changes to `confirmed`
5. Ticket is generated
6. **User Dashboard**: Shows "Confirmed" status with "View Ticket" button

## Database Schema Fields

### Booking Model - Advance Payment Fields
```javascript
advanceRequired: Boolean (default: false)
advanceAmount: Number (calculated as totalPrice * advancePercentage / 100)
advancePercentage: Number (default: 30)
advancePaid: Boolean (default: false)
advancePaymentDate: Date
remainingAmount: Number (calculated as totalPrice - advanceAmount)
```

## API Endpoints

### Merchant Operations
- `POST /bookings/merchant/:id/request-advance` - Request advance payment
- `POST /bookings/merchant/:id/accept-reject` - Accept or reject booking after advance paid

### User Operations
- `POST /bookings/:id/pay-advance` - Pay advance amount
- `POST /bookings/:id/pay-remaining` - Pay remaining amount after advance

## UI Components Updated

### User Dashboard (UserMyEvents.jsx)
- **Status Badges**: Color-coded status indicators
- **Pay Advance Button**: Shows when status is `awaiting_advance`
- **Pay Remaining Button**: Shows when status is `advance_paid`
- **Price Breakdown**: Shows service price, add-ons, total, advance, and remaining amounts
- **Action Buttons**: Context-aware buttons based on booking status

### Merchant Dashboard (MerchantAdvanceRequests.jsx)
- **Filter Tabs**: All, Pending, Awaiting Advance, Advance Paid
- **Request Advance Button**: Available for `pending` bookings
- **Accept/Reject Buttons**: Available for `advance_paid` bookings
- **Status Indicators**: Visual feedback for each stage
- **Pricing Display**: Shows total, advance amount, and remaining amount

## Status Flow Diagram

```
pending 
  ↓ (Merchant requests advance)
awaiting_advance 
  ↓ (User pays advance)
advance_paid 
  ↓ (Merchant accepts)
accepted 
  ↓ (User pays remaining)
confirmed 
  ↓ (Event completed)
completed

Alternative paths:
- pending → rejected (merchant rejects)
- awaiting_advance → cancelled (user cancels)
- advance_paid → rejected (merchant rejects after advance paid)
```

## Key Features

1. **Advance Payment Protection**: Merchants can secure bookings with advance payment
2. **Two-Stage Payment**: Advance + Remaining amount for better cash flow
3. **Clear Status Tracking**: Users and merchants always know booking status
4. **Flexible Workflow**: Merchants can request advance or reject bookings
5. **User-Friendly UI**: Clear buttons and status indicators guide users through process

## Testing Checklist

- [ ] User can book full-service event (status: pending)
- [ ] Merchant can request advance payment (status: awaiting_advance)
- [ ] User can pay advance amount (status: advance_paid)
- [ ] Merchant can accept booking after advance paid (status: accepted)
- [ ] User can pay remaining amount (status: confirmed)
- [ ] User can view ticket after confirmation
- [ ] Merchant can reject booking at any stage
- [ ] User can cancel booking before advance paid
- [ ] Proper notifications sent at each stage
- [ ] Price calculations are correct (advance + remaining = total)
