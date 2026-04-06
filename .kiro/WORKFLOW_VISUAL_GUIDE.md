# Advance Payment Workflow - Visual Guide

## Complete User Journey

### Stage 1: Booking Creation
```
┌─────────────────────────────────────────────────────────────┐
│ USER SIDE                                                   │
├─────────────────────────────────────────────────────────────┤
│ 1. Browse Events                                            │
│ 2. Click on Full-Service Event                              │
│ 3. Fill Booking Form:                                       │
│    - Date, Time, Location                                   │
│    - Number of Guests                                       │
│    - Select Add-ons                                         │
│ 4. Submit Booking                                           │
│                                                             │
│ Status: PENDING ⏳                                           │
│ Button: None (Waiting for merchant)                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ MERCHANT SIDE                                               │
├─────────────────────────────────────────────────────────────┤
│ 1. Receives notification of new booking                     │
│ 2. Goes to "Advance Payment Requests"                       │
│ 3. Sees booking in "Pending" tab                            │
│ 4. Reviews booking details                                  │
│ 5. Clicks "Request Advance (30%)"                           │
│                                                             │
│ Status: AWAITING_ADVANCE ⏳                                  │
│ Button: "Waiting for customer to pay advance..."            │
└─────────────────────────────────────────────────────────────┘
```

### Stage 2: Advance Payment
```
┌─────────────────────────────────────────────────────────────┐
│ USER SIDE                                                   │
├─────────────────────────────────────────────────────────────┤
│ 1. Goes to "My Bookings"                                    │
│ 2. Sees booking with "Pay Advance Now" status 🔵            │
│ 3. Sees price breakdown:                                    │
│    - Total: ₹10,000                                         │
│    - Advance (30%): ₹3,000 ← MUST PAY                       │
│    - Remaining: ₹7,000 (pay later)                          │
│ 4. Clicks "Pay Advance (₹3,000)"                            │
│ 5. Confirms payment                                         │
│ 6. Payment processed ✓                                      │
│                                                             │
│ Status: ADVANCE_PAID ✓                                      │
│ Button: "Pay Remaining (₹7,000)"                            │
│ Message: "Advance Paid - Awaiting Confirmation"             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ MERCHANT SIDE                                               │
├─────────────────────────────────────────────────────────────┤
│ 1. Booking automatically moves to "Advance Paid" tab         │
│ 2. Sees:                                                    │
│    - Customer name & email                                  │
│    - Event date                                             │
│    - Total: ₹10,000                                         │
│    - Advance Paid: ₹3,000 ✓                                 │
│    - Remaining: ₹7,000                                      │
│ 3. Reviews booking details                                  │
│ 4. Decides to accept or reject                              │
│                                                             │
│ Options:                                                    │
│ - "Accept & Confirm Booking" → Status: ACCEPTED            │
│ - "Reject & Refund" → Status: REJECTED                      │
└─────────────────────────────────────────────────────────────┘
```

### Stage 3: Merchant Confirmation
```
┌─────────────────────────────────────────────────────────────┐
│ MERCHANT SIDE                                               │
├─────────────────────────────────────────────────────────────┤
│ 1. Clicks "Accept & Confirm Booking"                        │
│ 2. Booking confirmed ✓                                      │
│                                                             │
│ Status: ACCEPTED ✓                                          │
│ Button: None (Waiting for user to pay remaining)            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ USER SIDE                                                   │
├─────────────────────────────────────────────────────────────┤
│ 1. Booking status updates to "Approved - Pay Now" 🟢        │
│ 2. Sees "Pay Remaining (₹7,000)" button                     │
│ 3. Clicks button to pay remaining amount                    │
│ 4. Confirms payment                                         │
│ 5. Payment processed ✓                                      │
│                                                             │
│ Status: CONFIRMED ✓                                         │
│ Button: "View Ticket" 🎫                                    │
│ Message: "Confirmed"                                        │
└─────────────────────────────────────────────────────────────┘
```

### Stage 4: Booking Confirmed
```
┌─────────────────────────────────────────────────────────────┐
│ USER SIDE                                                   │
├─────────────────────────────────────────────────────────────┤
│ 1. Booking shows "Confirmed" status 🟢                      │
│ 2. Can click "View Ticket" to download/view ticket          │
│ 3. Ticket shows:                                            │
│    - Ticket Number                                          │
│    - QR Code                                                │
│    - Event Details                                          │
│    - Date & Time                                            │
│ 4. Ready for event! 🎉                                      │
│                                                             │
│ After Event:                                                │
│ - Status changes to "Completed"                             │
│ - "Rate Event" button appears                               │
│ - Can submit review and rating                              │
└─────────────────────────────────────────────────────────────┘
```

## Alternative Paths

### Rejection by Merchant (After Advance Paid)
```
┌─────────────────────────────────────────────────────────────┐
│ MERCHANT SIDE                                               │
├─────────────────────────────────────────────────────────────┤
│ Booking in "Advance Paid" tab                               │
│ Clicks "Reject & Refund"                                    │
│                                                             │
│ Status: REJECTED ❌                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ USER SIDE                                                   │
├─────────────────────────────────────────────────────────────┤
│ Booking shows "Rejected" status ❌                          │
│ Advance amount refunded to account                          │
│ Can book another event                                      │
└─────────────────────────────────────────────────────────────┘
```

### User Cancellation (Before Advance Paid)
```
┌─────────────────────────────────────────────────────────────┐
│ USER SIDE                                                   │
├─────────────────────────────────────────────────────────────┤
│ Booking in "Awaiting Advance" status                        │
│ Clicks "Cancel" button                                      │
│                                                             │
│ Status: CANCELLED ❌                                        │
│ No payment made, no refund needed                           │
└─────────────────────────────────────────────────────────────┘
```

## Status Badges & Colors

```
┌──────────────────────────────────────────────────────────────┐
│ USER DASHBOARD STATUS BADGES                                │
├──────────────────────────────────────────────────────────────┤
│ 🟡 Pending Approval        (Waiting for merchant)           │
│ 🔵 Pay Advance Now         (Action required)                │
│ 🟢 Advance Paid - Awaiting Confirmation (Waiting)           │
│ 🟢 Approved - Pay Now      (Action required)                │
│ 🟢 Confirmed               (Booking secured)                │
│ 🟣 Processing              (System processing)              │
│ ❌ Rejected                (Booking declined)               │
│ ⚫ Cancelled               (User cancelled)                 │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ MERCHANT DASHBOARD STATUS BADGES                            │
├──────────────────────────────────────────────────────────────┤
│ 🟡 Pending                 (New booking request)            │
│ 🔵 Awaiting Advance        (Waiting for payment)            │
│ 🟢 Advance Paid            (Ready to accept/reject)         │
└──────────────────────────────────────────────────────────────┘
```

## Price Breakdown Example

```
┌─────────────────────────────────────────────────────────────┐
│ BOOKING PRICE BREAKDOWN                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Service Price:              ₹8,000                          │
│ Add-ons:                    ₹2,000                          │
│ ─────────────────────────────────────────                   │
│ Total:                      ₹10,000                         │
│                                                             │
│ Advance Payment (30%):      ₹3,000  ← Pay Now              │
│ Remaining Amount:           ₹7,000  ← Pay Later            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Button States & Actions

### User Dashboard Buttons
```
Status: PENDING
├─ Cancel ❌

Status: AWAITING_ADVANCE
├─ Pay Advance (₹3,000) 💳
└─ Cancel ❌

Status: ADVANCE_PAID
├─ Pay Remaining (₹7,000) 💳

Status: ACCEPTED
├─ Pay Remaining (₹7,000) 💳

Status: CONFIRMED
├─ View Ticket 🎫
└─ Rate Event ⭐

Status: COMPLETED
├─ View Ticket 🎫
└─ Rate Event ⭐
```

### Merchant Dashboard Buttons
```
Status: PENDING
├─ Request Advance (30%) 💰
└─ Reject Booking ❌

Status: AWAITING_ADVANCE
├─ ⏳ Waiting for customer to pay advance...

Status: ADVANCE_PAID
├─ Accept & Confirm Booking ✓
└─ Reject & Refund ❌
```

## Timeline Example

```
Day 1: User Books Event
  └─ Status: PENDING ⏳

Day 1: Merchant Requests Advance
  └─ Status: AWAITING_ADVANCE ⏳

Day 2: User Pays Advance (₹3,000)
  └─ Status: ADVANCE_PAID ✓

Day 2: Merchant Accepts Booking
  └─ Status: ACCEPTED ✓

Day 3: User Pays Remaining (₹7,000)
  └─ Status: CONFIRMED ✓

Day 10: Event Happens
  └─ Status: COMPLETED ✓

Day 10: User Rates Event
  └─ Rating Submitted ⭐
```

## Key Metrics

```
Total Booking Value:        ₹10,000
├─ Advance (30%):           ₹3,000 (Secured upfront)
└─ Remaining (70%):         ₹7,000 (Paid after confirmation)

Payment Timeline:
├─ Advance: Immediate (when merchant requests)
└─ Remaining: After merchant accepts

Risk Mitigation:
├─ Merchant: Secures 30% upfront
├─ User: Pays in stages, can cancel before advance
└─ Platform: Ensures commitment from both parties
```
