# Complete Workflow Diagram - User & Merchant

## Full Booking Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: USER BOOKS EVENT                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ USER SIDE                          │ MERCHANT SIDE                           │
│ Status: pending                    │ Status: pending                         │
│ Label: "Pending Approval" 🟡       │ Button: "🕐 Pending"                   │
│ Buttons: Cancel                    │ Buttons: Request Advance, Reject       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: MERCHANT REQUESTS ADVANCE                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ USER SIDE                          │ MERCHANT SIDE                           │
│ Status: awaiting_advance           │ Status: awaiting_advance                │
│ Label: "Pay Advance Now" 🔵        │ Button: (Auto - waiting)                │
│ Buttons: Pay Advance, Cancel       │ Buttons: Details, Validate              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: USER PAYS ADVANCE                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ USER SIDE                          │ MERCHANT SIDE                           │
│ Status: advance_paid               │ Status: advance_paid                    │
│ Label: "Advance Paid - Awaiting    │ Button: (Auto - waiting)                │
│         Confirmation" 🟢           │ Buttons: Details, Validate              │
│ Buttons: (Waiting)                 │                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: MERCHANT ACCEPTS BOOKING                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ USER SIDE                          │ MERCHANT SIDE                           │
│ Status: accepted                   │ Status: accepted                        │
│ Label: "Approved - Pay Remaining"  │ Button: "💳 Awaiting Payment"           │
│         🔵                         │ Buttons: Details, Validate              │
│ Buttons: Pay Remaining             │                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: USER PAYS REMAINING AMOUNT                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ USER SIDE                          │ MERCHANT SIDE                           │
│ Status: confirmed                  │ Status: confirmed                       │
│ Label: "Confirmed" 🟢              │ Button: "🕐 Processing"                 │
│ Buttons: View Ticket               │ Buttons: Mark Processing, Details       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 6: MERCHANT MARKS AS PROCESSING                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ USER SIDE                          │ MERCHANT SIDE                           │
│ Status: processing                 │ Status: processing                      │
│ Label: "Processing" 🟣             │ Button: "✓ Completed"                   │
│ Buttons: View Ticket               │ Buttons: Mark Completed, Details        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 7: EVENT HAPPENS & MERCHANT MARKS COMPLETE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ USER SIDE                          │ MERCHANT SIDE                           │
│ Status: completed                  │ Status: completed                       │
│ Label: "Completed" 🟢              │ Button: "✓ Completed" (disabled)        │
│ Buttons: View Ticket, Rate Event   │ Buttons: Details, Validate              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 8: USER RATES EVENT                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ USER SIDE                          │ MERCHANT SIDE                           │
│ Status: completed                  │ Status: completed                       │
│ Label: "Completed" 🟢              │ Button: "✓ Completed" (disabled)        │
│ Buttons: View Ticket (Rating ⭐)   │ Buttons: Details, Validate              │
│                                    │ (Event finished)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## User Dashboard Status Flow

```
┌──────────────┐
│   pending    │ ← User books event
│ "Pending     │
│  Approval"   │
│     🟡       │
└──────┬───────┘
       │ Merchant requests advance
       ↓
┌──────────────────────┐
│ awaiting_advance     │
│ "Pay Advance Now"    │
│        🔵            │
│ [Pay Advance] [Cancel]
└──────┬───────────────┘
       │ User pays advance
       ↓
┌──────────────────────────────┐
│    advance_paid              │
│ "Advance Paid - Awaiting     │
│  Confirmation"               │
│        🟢                    │
│ (Waiting for merchant)       │
└──────┬───────────────────────┘
       │ Merchant accepts
       ↓
┌──────────────────────────────┐
│      accepted                │
│ "Approved - Pay Remaining"   │
│        🔵                    │
│ [Pay Remaining (₹7,000)]     │
└──────┬───────────────────────┘
       │ User pays remaining
       ↓
┌──────────────────────────────┐
│     confirmed                │
│    "Confirmed"               │
│        🟢                    │
│ [View Ticket]                │
└──────┬───────────────────────┘
       │ Event starts
       ↓
┌──────────────────────────────┐
│    processing                │
│   "Processing"               │
│        🟣                    │
│ [View Ticket]                │
└──────┬───────────────────────┘
       │ Event completed
       ↓
┌──────────────────────────────┐
│    completed                 │
│   "Completed"                │
│        🟢                    │
│ [View Ticket] [Rate Event]   │
└──────────────────────────────┘
```

## Merchant Dashboard Status Flow

```
┌──────────────┐
│   pending    │ ← New booking
│ "🕐 Pending" │
│     🔵       │
│ [Request Advance] [Reject]
└──────┬───────┘
       │ Merchant requests advance
       ↓
┌──────────────────────────┐
│ awaiting_advance         │
│ (Auto - waiting)         │
│        🔵                │
│ [Details] [Validate]     │
└──────┬──────────────────┘
       │ User pays advance
       ↓
┌──────────────────────────┐
│  advance_paid            │
│ (Auto - waiting)         │
│        🟢                │
│ [Details] [Validate]     │
└──────┬──────────────────┘
       │ Merchant accepts
       ↓
┌──────────────────────────────┐
│      accepted                │
│ "💳 Awaiting Payment"        │
│        🟠                    │
│ [Details] [Validate]         │
└──────┬───────────────────────┘
       │ User pays remaining
       ↓
┌──────────────────────────────┐
│     confirmed                │
│ "🕐 Processing"              │
│        🟣                    │
│ [Mark Completed] [Details]   │
└──────┬───────────────────────┘
       │ Merchant marks processing
       ↓
┌──────────────────────────────┐
│    processing                │
│ "✓ Completed"                │
│        🟢                    │
│ [Mark Completed] [Details]   │
└──────┬───────────────────────┘
       │ Merchant marks complete
       ↓
┌──────────────────────────────┐
│    completed                 │
│ "✓ Completed" (disabled)     │
│        🟢                    │
│ [Details] [Validate]         │
└──────────────────────────────┘
```

## Button Reference

### User Dashboard Buttons

| Status | Buttons | Color |
|--------|---------|-------|
| pending | Cancel | Red |
| awaiting_advance | Pay Advance, Cancel | Blue, Red |
| advance_paid | (None - waiting) | - |
| accepted | Pay Remaining | Green |
| confirmed | View Ticket | Blue |
| processing | View Ticket | Blue |
| completed | View Ticket, Rate Event | Blue, Amber |

### Merchant Dashboard Buttons

| Status | Buttons | Color |
|--------|---------|-------|
| pending | 🕐 Pending, ✗ Reject, Details | Blue, Red, Blue |
| awaiting_advance | Details, Validate | Blue, Purple |
| advance_paid | Details, Validate | Blue, Purple |
| accepted | 💳 Awaiting Payment, Details | Amber, Blue |
| confirmed | 🕐 Processing, Details | Indigo, Blue |
| processing | ✓ Completed, Details | Green, Blue |
| completed | ✓ Completed (disabled), Details | Green, Blue |
| paid | ✓ Confirm, Details | Purple, Blue |
| rejected | ✗ Rejected (disabled), Details | Red, Blue |
| cancelled | ✗ Cancelled (disabled), Details | Gray, Blue |

## Color Legend

```
🟡 Amber   - Pending/Awaiting
🔵 Blue    - Action Required
🟢 Green   - Confirmed/Completed
🟣 Indigo  - Processing
🟠 Orange  - Payment Awaiting
🔴 Red     - Rejected/Cancelled
⚫ Gray    - Cancelled/Inactive
```

## Alternative Paths

### Rejection Path
```
pending → rejected
  ↓
(Booking rejected)
```

### Cancellation Path
```
pending → cancelled
  ↓
(User cancelled before advance)

OR

awaiting_advance → cancelled
  ↓
(User cancelled before paying advance)
```

## Payment Timeline

```
Timeline:
Day 1:  User books → pending
Day 1:  Merchant requests advance → awaiting_advance
Day 2:  User pays advance (30%) → advance_paid
Day 2:  Merchant accepts → accepted
Day 3:  User pays remaining (70%) → confirmed
Day 10: Event happens → processing
Day 10: Event completed → completed
Day 11: User rates event → completed (with rating)

Total Payment:
├─ Advance: 30% (₹3,000)
├─ Remaining: 70% (₹7,000)
└─ Total: 100% (₹10,000)
```

## Status Transition Rules

```
pending
  ├─ → awaiting_advance (Merchant requests advance)
  ├─ → rejected (Merchant rejects)
  └─ → cancelled (User cancels)

awaiting_advance
  ├─ → advance_paid (User pays advance)
  └─ → cancelled (User cancels)

advance_paid
  ├─ → accepted (Merchant accepts)
  └─ → rejected (Merchant rejects)

accepted
  └─ → confirmed (User pays remaining)

confirmed
  └─ → processing (Merchant marks processing)

processing
  └─ → completed (Merchant marks complete)

completed
  └─ (Final state)

rejected
  └─ (Final state)

cancelled
  └─ (Final state)
```

## Key Features

✅ Clear visual status indicators
✅ Color-coded buttons for quick identification
✅ Icons for better UX
✅ Status-specific actions
✅ Complete workflow support
✅ Alternative paths (rejection, cancellation)
✅ Professional appearance
✅ Easy to understand
