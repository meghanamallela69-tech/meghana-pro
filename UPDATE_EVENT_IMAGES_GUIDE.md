# 🖼️ Update Event Images - Merchant Guide

## ✅ Feature Complete

Merchants can now update event images by uploading new photos. The system will:
1. **Upload new images** to Cloudinary
2. **Delete old images** from Cloudinary (to save storage)
3. **Replace with new images** in the database

---

## 🔧 Backend Implementation

### What Was Fixed

The update function now properly handles multer's `.fields()` structure:

```javascript
// BEFORE (WRONG):
if (req.files && req.files.length > 0) {
  const imagePaths = req.files.map(file => file.path);
  event.images = uploadedImages;
}

// AFTER (CORRECT):
if (req.files && typeof req.files === 'object' && !Array.isArray(req.files)) {
  // Get banner from req.files.bannerImage[0]
  // Get gallery from req.files.galleryImages[]
  // Upload and replace
}
```

---

## 📋 How to Use (Frontend)

### Example: Update Wedding Event Images

#### Step 1: Fetch Current Event Data
```javascript
const response = await axios.get(`${API_BASE}/merchant/events/${eventId}`, {
  headers: authHeaders(token)
});

const event = response.data.event;
console.log('Current images:', event.images);
```

#### Step 2: Prepare FormData with New Images
```javascript
const formData = new FormData();

// Add updated fields
formData.append('title', 'John & Sarah Wedding');
formData.append('description', 'Beautiful wedding ceremony');
formData.append('price', '5000');

// Add NEW banner image (if changing)
if (newBannerFile) {
  formData.append('bannerImage', newBannerFile);
}

// Add NEW gallery images (if changing) - can add multiple
if (newGalleryFiles && newGalleryFiles.length > 0) {
  newGalleryFiles.forEach(file => {
    formData.append('galleryImages', file);
  });
}
```

#### Step 3: Send Update Request
```javascript
const response = await axios.put(
  `${API_BASE}/merchant/events/${eventId}`,
  formData,
  {
    headers: {
      ...authHeaders(token),
      'Content-Type': 'multipart/form-data'
    }
  }
);

console.log('Event updated:', response.data.event);
console.log('New images:', response.data.event.images);
```

---

## 🔍 Backend Logs (What to Expect)

When you update an event with new images, you'll see:

```
📸 Update event - Checking uploaded files...
req.files: {
  bannerImage: [{ originalname: "wedding-banner-new.jpg", path: "...", ... }],
  galleryImages: [
    { originalname: "reception.jpg", path: "...", ... },
    { originalname: "ceremony.jpg", path: "...", ... }
  ]
}
req.files type: object
req.files is Array: false
📸 Processing files from multer.fields() object for update
New banner file: bannerImage wedding-banner-new.jpg
Gallery files for update: 2
✅ New images uploaded: 3
Deleting old images from Cloudinary: ['events/old_banner_id', 'events/old_gallery1_id', 'events/old_gallery2_id']
Event images updated: 3
✅ Event updated successfully
```

---

## 🎯 Different Update Scenarios

### Scenario 1: Replace ALL Images
Upload new banner + new gallery → Old ones deleted, new ones saved

### Scenario 2: Replace Banner Only
Upload only new banner → Old banner deleted, old gallery kept (NO - all replaced)

**Note:** Currently, uploading ANY new images replaces ALL old images. If you want to keep gallery and only change banner, don't upload gallery files.

### Scenario 3: Keep Existing Images
Don't upload any images → Existing images remain unchanged

---

## 💡 Best Practices

### 1. Clear Image Preview Before Upload
```javascript
// Show user current images
const [currentImages, setCurrentImages] = useState(event.images || []);
const [newBanner, setNewBanner] = useState(null);
const [newGallery, setNewGallery] = useState([]);

// When user selects new banner
const handleBannerChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    setNewBanner(file);
    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => setBannerPreview(reader.result);
    reader.readAsDataURL(file);
  }
};
```

### 2. Allow Removing Individual Images
```javascript
// Let users remove specific gallery images
const removeGalleryImage = (index) => {
  setNewGallery(prev => prev.filter((_, i) => i !== index));
};

// User can also keep existing images by not uploading new ones
```

### 3. Show Image Count Limit
```javascript
const MAX_GALLERY = 3;
const remainingSlots = MAX_GALLERY - newGallery.length;

if (remainingSlots <= 0) {
  toast.error(`Maximum ${MAX_GALLERY} gallery images allowed`);
  return;
}
```

---

## 🧪 Testing Instructions

### Test Case 1: Update Wedding Event with New Photos

1. **Create a wedding event** with basic images
2. **Go to Edit Event** page
3. **Upload new banner** (wedding couple photo)
4. **Upload 2-3 gallery images** (ceremony, reception, etc.)
5. **Click Update**
6. **Verify:**
   - ✅ Old images deleted from Cloudinary
   - ✅ New images saved to database
   - ✅ Event shows new images on frontend

### Test Case 2: Update Without Changing Images

1. **Edit event** but don't upload new images
2. **Change only text** (title, description)
3. **Click Update**
4. **Verify:**
   - ✅ Existing images remain unchanged
   - ✅ Console shows "No new images uploaded"

---

## ⚠️ Important Notes

### 1. Old Images Are Deleted
When new images are uploaded, **ALL old images are deleted** from Cloudinary to:
- Save storage space
- Avoid keeping unused images
- Keep data clean

### 2. Content-Type Header
Make sure frontend sends correct header:
```javascript
headers: {
  'Content-Type': 'multipart/form-data'
}
```

### 3. Field Names Must Match
Frontend must use exact field names:
- `bannerImage` (singular)
- `galleryImages` (plural, append multiple times)

---

## 🐛 Troubleshooting

### Issue: Images Not Updating

**Check:**
1. Backend logs show `req.files` object?
2. Files have correct field names (`bannerImage`, `galleryImages`)?
3. Cloudinary upload successful message?
4. Database save confirmation?

**Solution:**
```javascript
// Frontend debug
console.log('FormData entries:');
for (let pair of formData.entries()) {
  console.log(pair[0], pair[1]);
}
```

### Issue: Old Images Not Deleted

**Check:**
1. Old event had images with `public_id`?
2. Cloudinary delete function working?
3. Console shows delete message?

**Solution:**
```javascript
// Verify old images structure
console.log('Old images:', event.images);
// Should be: [{ public_id: "...", url: "..." }]
```

### Issue: Wrong Images Showing

**Check:**
1. Frontend properly re-fetches event after update?
2. Cache cleared/refetch triggered?
3. State updated with new event data?

**Solution:**
```javascript
// After successful update
await fetchEvent(eventId); // Re-fetch
// OR
queryClient.invalidateQueries(['event', eventId]); // If using React Query
```

---

## 📊 API Endpoint Summary

### PUT `/api/v1/merchant/events/:id`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (FormData):**
```
title: String (optional)
description: String (optional)
price: Number (optional)
bannerImage: File (optional, single file)
galleryImages: File[] (optional, up to 3 files)
...other fields
```

**Response:**
```json
{
  "success": true,
  "event": {
    "_id": "...",
    "title": "Updated Wedding Event",
    "images": [
      {
        "public_id": "events/new_banner",
        "url": "https://res.cloudinary.com/..."
      },
      {
        "public_id": "events/new_gallery1",
        "url": "https://res.cloudinary.com/..."
      }
    ],
    ...
  }
}
```

---

*Guide created: March 30, 2026*
