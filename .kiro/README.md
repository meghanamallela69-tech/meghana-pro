# Advance Payment Workflow Implementation

## 📋 Overview

This folder contains complete documentation for the **Advance Payment Workflow** implementation for full-service event bookings. The system enables merchants to request 30% advance payment from users before confirming bookings, with a two-stage payment process.

## 📚 Documentation Files

### 1. **QUICK_REFERENCE.md** ⭐ START HERE
   - **Best for**: Quick lookup and troubleshooting
   - **Contains**: 
     - 5-stage booking flow table
     - Status codes reference
     - Button reference guide
     - Common scenarios
     - Troubleshooting guide
   - **Read time**: 5 minutes

### 2. **WORKFLOW_VISUAL_GUIDE.md** 🎨
   - **Best for**: Understanding the complete user journey
   - **Contains**:
     - Visual diagrams of each stage
     - User and merchant perspectives
     - Alternative paths (rejection, cancellation)
     - Status badges and colors
     - Timeline examples
     - Price breakdown examples
   - **Read time**: 10 minutes

### 3. **ADVANCE_PAYMENT_WORKFLOW.md** 📖
   - **Best for**: Complete workflow documentation
   - **Contains**:
     - Detailed booking lifecycle
     - Database schema fields
     - API endpoints reference
     - Status flow diagram
     - Key features
     - Testing checklist
   - **Read time**: 15 minutes

### 4. **IMPLEMENTATION_SUMMARY.md** 🔧
   - **Best for**: Technical implementation details
   - **Contains**:
     - What was updated in each file
     - Frontend changes
     - Backend changes
     - Database fields used
     - API endpoints
     - Testing workflow
     - Next steps
   - **Read time**: 10 minutes

### 5. **CHANGES_SUMMARY.md** 📝
   - **Best for**: Complete change log
   - **Contains**:
     - All files modified
     - All files created
     - Detailed changes in each file
     - Workflow summary
     - Database schema
     - API endpoints
     - Testing scenarios
     - Deployment checklist
   - **Read time**: 15 minutes

## 🚀 Quick Start

### For Users
1. Read: **WORKFLOW_VISUAL_GUIDE.md** (Stage 1-5)
2. Reference: **QUICK_REFERENCE.md** (Button Reference)

### For Merchants
1. Read: **WORKFLOW_VISUAL_GUIDE.md** (Merchant Side)
2. Reference: **QUICK_REFERENCE.md** (Button Reference)

### For Developers
1. Read: **IMPLEMENTATION_SUMMARY.md**
2. Reference: **QUICK_REFERENCE.md** (API Endpoints)
3. Check: **CHANGES_SUMMARY.md** (All changes)

### For QA/Testing
1. Read: **QUICK_REFERENCE.md** (Testing Checklist)
2. Reference: **WORKFLOW_VISUAL_GUIDE.md** (Scenarios)
3. Check: **ADVANCE_PAYMENT_WORKFLOW.md** (Testing Checklist)

## 📊 Booking Flow at a Glance

```
User Books Event
    ↓ (pending)
Merchant Requests Advance
    ↓ (awaiting_advance)
User Pays Advance (30%)
    ↓ (advance_paid)
Merchant Accepts Booking
    ↓ (accepted)
User Pays Remaining (70%)
    ↓ (confirmed)
Event Happens
    ↓ (completed)
```

## 🎯 Key Features

✅ **Two-Stage Payment**: Advance (30%) + Remaining (70%)
✅ **Clear Status Tracking**: Both users and merchants know booking status
✅ **Flexible Workflow**: Merchants can request advance or reject bookings
✅ **User-Friendly UI**: Clear buttons and status indicators
✅ **Loading States**: Visual feedback during processing
✅ **Error Handling**: Proper error messages and notifications
✅ **Mobile Responsive**: Works on all devices
✅ **Accessible**: Keyboard navigation and screen reader support

## 📁 Files Modified

### Frontend
- `frontend/src/pages/dashboards/UserMyEvents.jsx` - Complete rewrite
- `frontend/src/pages/dashboards/MerchantAdvanceRequests.jsx` - Updated UI

### Backend
- `backend/controller/bookingController.js` - Fixed acceptRejectBooking function

## 🔗 API Endpoints

### User Endpoints
```
POST /bookings/:id/pay-advance
POST /bookings/:id/pay-remaining
```

### Merchant Endpoints
```
POST /bookings/merchant/:id/request-advance
POST /bookings/merchant/:id/accept-reject
GET /bookings/merchant/advance-requests
```

## 💾 Database Fields

```javascript
advanceRequired: Boolean
advanceAmount: Number
advancePercentage: Number (default: 30)
advancePaid: Boolean
advancePaymentDate: Date
remainingAmount: Number
```

## ✅ Testing Checklist

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

## 🐛 Troubleshooting

### "Pay Advance" button not showing
→ Check booking status is `awaiting_advance`

### "Pay Remaining" button not showing
→ Check booking status is `advance_paid`

### Advance amount incorrect
→ Verify totalPrice and advancePercentage (default 30%)

### Merchant can't request advance
→ Check merchant is booking owner

### User can't pay advance
→ Check booking status is `awaiting_advance`

### Ticket not generating
→ Check booking status is `confirmed`

See **QUICK_REFERENCE.md** for more troubleshooting tips.

## 📞 Support

For questions or issues:
1. Check **QUICK_REFERENCE.md** for common issues
2. Review **WORKFLOW_VISUAL_GUIDE.md** for workflow details
3. Check **IMPLEMENTATION_SUMMARY.md** for technical details
4. Review code comments in modified files

## 🔄 Status Codes

| Code | Meaning | User Sees | Merchant Sees |
|------|---------|-----------|---------------|
| `pending` | Initial booking | "Pending Approval" 🟡 | "Pending" tab |
| `awaiting_advance` | Waiting for advance | "Pay Advance Now" 🔵 | "Awaiting Advance" tab |
| `advance_paid` | Advance paid | "Advance Paid - Awaiting Confirmation" 🟢 | "Advance Paid" tab |
| `accepted` | Merchant accepted | "Approved - Pay Now" 🟢 | Booking accepted |
| `confirmed` | All payments done | "Confirmed" 🟢 | Booking confirmed |
| `completed` | Event happened | "Completed" 🟢 | Event completed |
| `rejected` | Booking declined | "Rejected" ❌ | Booking rejected |
| `cancelled` | User cancelled | "Cancelled" ⚫ | Booking cancelled |

## 📈 Metrics

```
Total Booking Value:        ₹10,000 (example)
├─ Advance (30%):           ₹3,000 (Secured upfront)
└─ Remaining (70%):         ₹7,000 (Paid after confirmation)

Payment Timeline:
├─ Advance: Immediate (when merchant requests)
└─ Remaining: After merchant accepts
```

## 🎓 Learning Path

**Beginner** (5 min)
→ Read: QUICK_REFERENCE.md

**Intermediate** (15 min)
→ Read: WORKFLOW_VISUAL_GUIDE.md

**Advanced** (30 min)
→ Read: IMPLEMENTATION_SUMMARY.md + ADVANCE_PAYMENT_WORKFLOW.md

**Expert** (45 min)
→ Read: All files + Review code

## 📅 Implementation Timeline

- **Stage 1**: User books event (pending)
- **Stage 2**: Merchant requests advance (awaiting_advance)
- **Stage 3**: User pays advance (advance_paid)
- **Stage 4**: Merchant accepts (accepted)
- **Stage 5**: User pays remaining (confirmed)

## 🚀 Next Steps

1. **Testing**: Run through all test scenarios
2. **Deployment**: Follow deployment checklist
3. **Monitoring**: Monitor error logs
4. **Feedback**: Collect user feedback
5. **Optimization**: Optimize based on feedback

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Apr 2, 2026 | Initial implementation |

## 📄 License

This implementation is part of the Event Management System.

---

**Last Updated**: April 2, 2026
**Status**: ✅ Complete and Ready for Testing
**Maintained By**: Development Team
