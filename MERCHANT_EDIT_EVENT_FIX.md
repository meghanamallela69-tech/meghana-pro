# 🔧 Merchant Edit Event - Fixes Applied

## Issues Fixed (March 30, 2026)

---

## 🎯 Problems Identified

### Problem 1: Categories API 404 Error
```
GET http://localhost:5000/api/v1/api/v1/categories
Status: 404 Not Found
```

**Root Cause:** Duplicate `/api/v1` in the URL path

---

### Problem 2: MulterError: Unexpected field
```
MulterError: Unexpected field
at wrappedFileFilter (...)
```

**Root Cause:** Frontend was sending files with wrong field name (`"images"` instead of `"bannerImage"` and `"galleryImages"`)

---

## ✅ Fixes Applied

### Fix 1: Corrected Categories API Path

**File:** `frontend/src/pages/dashboards/MerchantEditEvent.jsx`  
**Line:** 64

```javascript
// BEFORE (WRONG):
const response = await axios.get(`${API_BASE}/api/v1/categories`, {

// AFTER (CORRECT):
const response = await axios.get(`${API_BASE}/categories`, {
```

**Note:** `API_BASE = "http://localhost:5000/api/v1"` already includes the version prefix

---

### Fix 2: Updated Image Field Names to Match Backend

**File:** `frontend/src/pages/dashboards/MerchantEditEvent.jsx`  
**Lines:** 175-194

```javascript
// BEFORE (WRONG):
images.forEach((image) => {
  formData.append("images", image);
});

// AFTER (CORRECT):
if (images.length > 0) {
  // First image becomes banner
  formData.append("bannerImage", images[0]);
  
  // Remaining images become gallery (max 3)
  const galleryFiles = images.slice(1, 4);
  galleryFiles.forEach((file) => {
    formData.append("galleryImages", file);
  });
}
```

---

### Fix 3: Improved Image Upload Logic

**File:** `frontend/src/pages/dashboards/MerchantEditEvent.jsx`  
**Lines:** 84-114

```javascript
// BEFORE:
const totalImages = files.length + existingImages.length + images.length;
if (totalImages > 4) {
  toast.error("You can upload maximum 4 images");
  return;
}

// AFTER:
// Allow maximum 4 new images (1 banner + 3 gallery)
if (files.length > 4) {
  toast.error("You can upload maximum 4 images at a time");
  return;
}
```

**Reason:** The old logic counted existing images from database, which was incorrect. We should only limit NEW uploads.

---

## 📊 How It Works Now

### Image Upload Flow

1. **User selects images** (up to 4 files)
2. **Frontend separates them:**
   - First image → `bannerImage` field
   - Remaining 0-3 images → `galleryImages` field
3. **Backend receives:**
   ```javascript
   req.files = {
     bannerImage: [FileObject1],
     galleryImages: [FileObject2, FileObject3, FileObject4]
   }
   ```
4. **Backend processes:**
   - Uploads all to Cloudinary
   - Deletes old images from Cloudinary
   - Saves new images to database

---

## 🧪 Testing Instructions

### Test Case 1: Update Event with New Images

1. **Go to Merchant Dashboard** → My Events
2. **Click Edit** on any event (e.g., Wedding event)
3. **Upload 1-4 new images**
4. **Update other fields** (title, price, etc.)
5. **Click Update**

**Expected Result:**
- ✅ No 404 error for categories
- ✅ No "Unexpected field" error
- ✅ Success message shown
- ✅ Event updated with new images
- ✅ Old images deleted from Cloudinary

**Console Output:**
```
📸 Update event - Checking uploaded files...
req.files type: object
req.files is Array: false
📸 Processing files from multer.fields() object for update
New banner file: bannerImage wedding-photo.jpg
Gallery files for update: 2
✅ New images uploaded: 3
Deleting old images from Cloudinary: ['old_id1', 'old_id2']
Event images updated: 3
✅ Event updated successfully
```

---

### Test Case 2: Update Without Images

1. **Edit event**
2. **Change only text fields** (title, description)
3. **Don't upload new images**
4. **Click Update**

**Expected Result:**
- ✅ Event updated successfully
- ✅ Existing images remain unchanged
- ✅ Console shows "No new images uploaded"

---

## 🔍 Debug Checklist

If you still encounter issues, check these in order:

### 1. Categories Loading
```javascript
// Check browser console
GET /api/v1/categories
// Should return: 200 OK with categories array
```

### 2. FormData Structure
```javascript
// Before sending, log FormData
for (let pair of formData.entries()) {
  console.log(pair[0], pair[1]);
}
// Should show:
// bannerImage: File {...}
// galleryImages: File {...}
// galleryImages: File {...}
// title: "Wedding"
// ...
```

### 3. Backend Logs
Check terminal where backend is running:
- Does it show `req.files` object?
- Are field names correct (`bannerImage`, `galleryImages`)?
- Any multer errors?

### 4. Network Tab
- Check request headers: `Content-Type: multipart/form-data`
- Check response status: Should be 200, not 500

---

## 📝 Files Modified

1. **`frontend/src/pages/dashboards/MerchantEditEvent.jsx`**
   - Line 64: Fixed categories API path
   - Lines 84-114: Fixed image upload validation
   - Lines 175-194: Fixed FormData field names

---

## 🎯 Key Learnings

### 1. Multer .fields() Structure
When using:
```javascript
upload.fields([
  { name: 'bannerImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 3 }
])
```

The result is an **OBJECT**, not array:
```javascript
req.files = {
  bannerImage: [file1],      // Array with 1 item
  galleryImages: [file2, file3]  // Array with multiple items
}
```

### 2. Field Names Must Match Exactly
Frontend field names MUST match backend configuration:
- ❌ `"images"` → Wrong
- ✅ `"bannerImage"` → Correct (singular)
- ✅ `"galleryImages"` → Correct (plural, multiple appends)

### 3. API Base Constants
If `API_BASE = "http://localhost:5000/api/v1"`, then:
- ❌ `${API_BASE}/api/v1/categories` → Wrong (duplicate)
- ✅ `${API_BASE}/categories` → Correct

---

## ✅ Result

✅ Categories load without 404 error  
✅ Event updates work with images  
✅ No "Unexpected field" errors  
✅ Images properly uploaded to Cloudinary  
✅ Old images replaced correctly  

---

*Fix completed: March 30, 2026*
