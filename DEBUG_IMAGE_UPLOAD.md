# 📸 Debug Image Upload Issue

## Problem
Event is created successfully but images are not being saved.

## Solution Applied

The issue is that **multer's `.fields()` method returns an OBJECT**, not an array. 

When you use:
```javascript
upload.fields([
  { name: 'bannerImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 3 }
])
```

Multer returns:
```javascript
req.files = {
  bannerImage: [FileObject1],      // Array with 1 file
  galleryImages: [FileObject2, FileObject3]  // Array with multiple files
}
```

NOT:
```javascript
req.files = [FileObject1, FileObject2, FileObject3]  // This is WRONG
```

## What Was Fixed

### Before (WRONG):
```javascript
if (req.files && req.files.length > 0) {
  const bannerFile = req.files.find(f => f.fieldname === 'bannerImage');
  const galleryFiles = req.files.filter(f => f.fieldname === 'galleryImages');
}
```

This doesn't work because `req.files` is an object, not an array!

### After (CORRECT):
```javascript
if (req.files && typeof req.files === 'object' && !Array.isArray(req.files)) {
  // Get banner image
  const bannerFiles = req.files.bannerImage || [];
  if (bannerFiles && bannerFiles.length > 0) {
    const bannerFile = bannerFiles[0];
    // Upload banner...
  }
  
  // Get gallery images
  const galleryFiles = req.files.galleryImages || [];
  if (galleryFiles && galleryFiles.length > 0) {
    // Upload gallery...
  }
}
```

## Testing Instructions

### 1. Restart Backend Server

Since the server is already running on port 5000, you need to restart it:

**Option A: Using PowerShell**
```powershell
# Find and kill Node process
Get-Process -Name node | Stop-Process -Force

# Restart server
cd c:\Users\Home\Desktop\event-main-11-main-m-main\backend
node server.js
```

**Option B: Manual**
1. Press `Ctrl+C` in the terminal where backend is running
2. Run: `cd backend` then `node server.js`

### 2. Create Event with Images

1. Open your frontend
2. Login as merchant
3. Go to "Create Event"
4. Upload:
   - Banner image (required)
   - Gallery images (optional, up to 3)
5. Fill other details
6. Submit

### 3. Check Backend Console

You should now see detailed logs like:

```
📝 Creating event...
Request body: { title: "My Event", ... }
📸 Checking uploaded files...
req.files type: object
req.files is Array: false
req.files value: {
  bannerImage: [{ originalname: "banner.jpg", path: "...", ... }],
  galleryImages: [{ originalname: "gallery1.jpg", path: "...", ... }]
}
📸 Processing files from multer.fields() object
Banner file from object: bannerImage banner.jpg
Uploaded banner: [{ public_id: "...", url: "..." }]
Gallery files from object: 2
Uploaded gallery: [{ public_id: "...", url: "..." }, { public_id: "...", url: "..." }]
✅ Total images to save: 3
Images array: [
  { "public_id": "...", "url": "..." },
  { "public_id": "...", "url": "..." },
  { "public_id": "...", "url": "..." }
]
Creating event with data: { title: "My Event", images: 3, ... }
✅ Event created successfully
```

### 4. Verify in Database

Check if the event has images:

```javascript
// In MongoDB or your database tool
db.events.find({ title: "My Event" }).pretty()
```

Look for the `images` array in the result.

## Expected Result

✅ Event created WITH images saved properly
✅ Console shows "Total images to save: X" (where X > 0)
✅ Images array contains objects with `public_id` and `url`

## If Still Not Working

### Check these in order:

1. **Frontend FormData:**
   - Open browser DevTools → Network tab
   - Find the POST request to `/merchant/events`
   - Check Payload/FormData:
     ```
     bannerImage: (file)
     galleryImages: (file)
     galleryImages: (file)
     title: "..."
     ...
     ```

2. **Backend Logs:**
   - What does `req.files` show?
   - Is it an object or array?
   - Are files actually uploaded?

3. **Cloudinary Upload:**
   - Check console for "Uploaded banner: [...]" message
   - Does it return URL and public_id?

4. **Database Save:**
   - Check console for "Images array: [...]" 
   - Does it have the correct structure?
   - `{ public_id: "...", url: "..." }`

## Common Issues

### Issue 1: Frontend sending wrong field names
**Fix:** Make sure frontend uses exact field names:
- `bannerImage` (singular)
- `galleryImages` (plural, multiple files)

### Issue 2: Files not reaching backend
**Fix:** Check FormData append in frontend:
```javascript
formData.append('bannerImage', bannerFile);
galleryImages.forEach(file => {
  formData.append('galleryImages', file);
});
```

### Issue 3: Cloudinary configuration
**Fix:** Check `.env` file:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Issue 4: Images saved but not showing
**Fix:** Check if images array structure matches schema:
```javascript
images: [
  { public_id: "folder/image1", url: "https://..." },
  { public_id: "folder/image2", url: "https://..." }
]
```

---

*Debug guide created: March 30, 2026*
