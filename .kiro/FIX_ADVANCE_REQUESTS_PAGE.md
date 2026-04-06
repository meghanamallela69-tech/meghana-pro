# Fix: Full-Service Bookings Not Showing in Advance Requests Page

## Problem
Full-service event bookings were not visible in the "Advance Payment Requests" page, even though they should be shown for merchants to request advance payment.

## Root Cause
The `getMerchantAdvanceRequests` endpoint was filtering bookings with `advanceRequired: true`, but:
- Full-service bookings are created with `advanceRequired: false` by default
- The `advanceRequired` flag is only set to `true` when the merchant requests advance payment
- This created a catch-22: bookings couldn't be shown until advance was requested, but merchants couldn't request advance if bookings weren't shown

## Solution
Updated the `getMerchantAdvanceRequests` function to filter by:
1. **Merchant ID**: Only show bookings for the logged-in merchant
2. **Event Type**: Only show `"full-service"` bookings (not ticketed)
3. **Status**: Show bookings in `["pending", "awaiting_advance", "advance_paid"]` status

### Before
```javascript
export const getMerchantAdvanceRequests = async (req, res) => {
  try {
    const bookings = await Booking.find({ 
      merchant: req.user.userId,
      advanceRequired: true  // ❌ This was the problem
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

### After
```javascript
export const getMerchantAdvanceRequests = async (req, res) => {
  try {
    const bookings = await Booking.find({ 
      merchant: req.user.userId,
      eventType: "full-service",  // ✅ Only full-service events
      status: { $in: ["pending", "awaiting_advance", "advance_paid"] }  // ✅ Relevant statuses
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

## What Now Shows in Advance Requests Page

### Pending Bookings (Status: `pending`)
- New full-service bookings that just came in
- Merchant can click "Request Advance (30%)"
- Button: "Request Advance (30%)" + "Reject Booking"

### Awaiting Advance Bookings (Status: `awaiting_advance`)
- Merchant has requested advance, waiting for user to pay
- Button: "⏳ Waiting for customer to pay advance..."

### Advance Paid Bookings (Status: `advance_paid`)
- User has paid the advance amount
- Merchant can accept or reject the booking
- Button: "Accept & Confirm Booking" + "Reject & Refund"

## Workflow Now Works Correctly

```
1. User Books Event
   └─ Status: pending
   └─ Appears in "Advance Requests" page ✅

2. Merchant Requests Advance
   └─ Status: awaiting_advance
   └─ Still visible in "Advance Requests" page ✅

3. User Pays Advance
   └─ Status: advance_paid
   └─ Still visible in "Advance Requests" page ✅

4. Merchant Accepts/Rejects
   └─ Status: accepted or rejected
   └─ Removed from "Advance Requests" page (workflow complete)
```

## Testing the Fix

1. **Create a full-service booking**
   - Go to browse events
   - Book a full-service event
   - Booking created with status `pending`

2. **Check Advance Requests page**
   - Go to Merchant Dashboard → "Advance Payment Requests"
   - Should see the new booking in "Pending" tab ✅

3. **Request advance**
   - Click "Request Advance (30%)"
   - Booking moves to "Awaiting Advance" tab ✅

4. **User pays advance**
   - User goes to "My Bookings"
   - Clicks "Pay Advance"
   - Booking moves to "Advance Paid" tab ✅

5. **Merchant accepts**
   - Merchant sees booking in "Advance Paid" tab
   - Clicks "Accept & Confirm Booking"
   - Booking status becomes `accepted`
   - Removed from "Advance Requests" page ✅

## Files Modified

- `backend/controller/bookingController.js` - Updated `getMerchantAdvanceRequests` function

## Impact

✅ Full-service bookings now visible in Advance Requests page
✅ Merchants can see all pending bookings
✅ Complete workflow from booking to confirmation works
✅ No changes needed to frontend
✅ Backward compatible with existing bookings

## Verification

To verify the fix is working:

```bash
# Check that full-service bookings appear
curl -X GET http://localhost:5000/api/bookings/merchant/advance-requests \
  -H "Authorization: Bearer <merchant_token>"

# Should return bookings with:
# - eventType: "full-service"
# - status: "pending" or "awaiting_advance" or "advance_paid"
```

## Related Files

- `backend/controller/bookingController.js` - Fixed function
- `frontend/src/pages/dashboards/MerchantAdvanceRequests.jsx` - UI component
- `backend/models/bookingSchema.js` - Booking schema with status field
