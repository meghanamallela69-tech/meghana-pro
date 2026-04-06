# Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: "No reviews found" on /reviews page

**Symptoms:**
- Reviews page loads but shows "No reviews found" message
- Statistics show 0 reviews

**Solutions:**

1. **Check if backend is running:**
   ```bash
   curl http://localhost:5000/api/v1/health
   ```
   - If this fails, start the backend: `cd backend && npm run dev`

2. **Check if data was populated:**
   ```bash
   # In backend directory
   node scripts/checkData.js
   ```
   - If this shows 0 users/events, run the setup script

3. **Run the data setup script:**
   ```bash
   cd backend
   node scripts/completeDataSetup.js
   ```
   - Wait for: `🎉 DATA SETUP COMPLETED SUCCESSFULLY!`

4. **Clear browser cache:**
   - Press Ctrl+Shift+Delete
   - Clear all cache
   - Refresh the page

5. **Restart frontend:**
   ```bash
   # In frontend directory
   npm run dev
   ```

---

### Issue 2: Script fails with "ECONNREFUSED" error

**Symptoms:**
```
❌ Error: querySrv ECONNREFUSED _mongodb._tcp.cluster0...
```

**Causes:**
- MongoDB Atlas is not accessible from your network
- Backend server is not running
- MongoDB credentials are incorrect

**Solutions:**

1. **Ensure backend server is running first:**
   ```bash
   cd backend
   npm run dev
   ```
   - Wait for: `✅ MongoDB connected`

2. **Check MongoDB Atlas IP whitelist:**
   - Go to MongoDB Atlas dashboard
   - Click "Network Access"
   - Add your IP address to the whitelist
   - Or add 0.0.0.0/0 to allow all IPs (not recommended for production)

3. **Verify MongoDB credentials:**
   - Check `backend/.env` file
   - Verify MONGO_URI is correct
   - Verify username and password are correct

4. **Try running the script again:**
   ```bash
   cd backend
   node scripts/completeDataSetup.js
   ```

---

### Issue 3: Reviews link not showing in navbar

**Symptoms:**
- Home page loads but "Reviews" link is missing from navbar
- Other links (About, Blogs) are visible

**Solutions:**

1. **Clear browser cache:**
   - Press Ctrl+Shift+Delete
   - Clear all cache
   - Refresh the page

2. **Restart frontend:**
   ```bash
   # In frontend directory
   npm run dev
   ```

3. **Check if Navbar.jsx was updated:**
   ```bash
   grep -n "Reviews" frontend/src/components/Navbar.jsx
   ```
   - Should show a line with `{ to: "/reviews", label: "Reviews" }`

4. **Check if App.jsx has the route:**
   ```bash
   grep -n "/reviews" frontend/src/App.jsx
   ```
   - Should show the Reviews route

---

### Issue 4: Reviews page shows error message

**Symptoms:**
- Reviews page shows error toast notification
- Console shows API error

**Solutions:**

1. **Check backend is running:**
   ```bash
   curl http://localhost:5000/api/v1/health
   ```

2. **Check API endpoint:**
   ```bash
   curl http://localhost:5000/api/v1/reviews/latest
   ```
   - Should return JSON with reviews array

3. **Check browser console:**
   - Press F12 to open developer tools
   - Go to Console tab
   - Look for error messages
   - Check Network tab to see API response

4. **Restart backend:**
   ```bash
   cd backend
   npm run dev
   ```

---

### Issue 5: Data setup script runs but no data appears

**Symptoms:**
- Script shows: `🎉 DATA SETUP COMPLETED SUCCESSFULLY!`
- But reviews page still shows "No reviews found"

**Solutions:**

1. **Wait a moment:**
   - MongoDB might need a few seconds to sync
   - Wait 5-10 seconds and refresh the page

2. **Check if data was actually created:**
   ```bash
   cd backend
   node scripts/checkData.js
   ```
   - Should show: `Users found: 5`, `Events found: 5`, `Reviews found: 5`

3. **Check MongoDB connection:**
   - Verify MongoDB Atlas is accessible
   - Check IP whitelist
   - Try connecting with MongoDB Compass

4. **Clear browser cache and restart:**
   ```bash
   # Clear cache (Ctrl+Shift+Delete)
   # Restart frontend
   cd frontend
   npm run dev
   ```

---

### Issue 6: Can't login with test credentials

**Symptoms:**
- Login fails with "Invalid credentials"
- Test users don't exist

**Solutions:**

1. **Run the data setup script:**
   ```bash
   cd backend
   node scripts/completeDataSetup.js
   ```
   - This creates the test users

2. **Verify test users were created:**
   ```bash
   cd backend
   node scripts/checkData.js
   ```
   - Should show users with emails like john@test.com

3. **Use correct credentials:**
   - Email: john@test.com
   - Password: User@123
   - (Not User@123 with capital U)

4. **Check backend logs:**
   - Look for any error messages in backend console
   - Check if MongoDB connection is working

---

### Issue 7: Frontend won't start

**Symptoms:**
```
Error: EADDRINUSE: address already in use :::5173
```

**Solutions:**

1. **Kill process using port 5173:**
   ```bash
   # On Windows PowerShell:
   Get-NetTCPConnection -LocalPort 5173 | Stop-Process -Force

   # Or just restart your terminal
   ```

2. **Use different port:**
   ```bash
   cd frontend
   npm run dev -- --port 5174
   ```

3. **Check if another instance is running:**
   ```bash
   # Look for running npm processes
   tasklist | findstr node
   ```

---

### Issue 8: Backend won't start

**Symptoms:**
```
Error: EADDRINUSE: address already in use :::5000
```

**Solutions:**

1. **Kill process using port 5000:**
   ```bash
   # On Windows PowerShell:
   Get-NetTCPConnection -LocalPort 5000 | Stop-Process -Force
   ```

2. **Use different port:**
   ```bash
   cd backend
   PORT=5001 npm run dev
   ```
   - Then update frontend API_BASE to use 5001

3. **Check if another instance is running:**
   ```bash
   tasklist | findstr node
   ```

---

### Issue 9: Reviews not appearing after submission

**Symptoms:**
- User submits a rating/review
- No error message
- But review doesn't appear on /reviews page

**Solutions:**

1. **Check booking status:**
   - Review can only be submitted for "completed" bookings
   - Check if booking status is "completed"

2. **Check event date:**
   - Event date must be in the past
   - Can't review future events

3. **Check if review was created:**
   - Login as the user
   - Go to `/dashboard/user/reviews`
   - Should see the review there

4. **Check backend logs:**
   - Look for any error messages
   - Check if Review record was created

5. **Refresh the page:**
   - Sometimes the page needs to be refreshed to show new reviews

---

### Issue 10: MongoDB connection keeps failing

**Symptoms:**
```
❌ All MongoDB connection attempts failed
```

**Solutions:**

1. **Check MongoDB Atlas status:**
   - Go to https://status.mongodb.com/
   - Check if there are any service issues

2. **Verify IP whitelist:**
   - Go to MongoDB Atlas dashboard
   - Click "Network Access"
   - Add your current IP address
   - Or add 0.0.0.0/0 (allow all)

3. **Check credentials:**
   - Verify username and password in `.env`
   - Make sure they're correct in MongoDB Atlas

4. **Test connection manually:**
   ```bash
   # Install MongoDB tools if needed
   # Then try connecting with mongosh
   mongosh "mongodb+srv://meghana123:meghana1234@cluster0.gfbrfcg.mongodb.net/eventhub"
   ```

5. **Check network:**
   - Make sure you have internet connection
   - Check if firewall is blocking MongoDB
   - Try using a VPN if connection is blocked

---

## Debug Commands

### Check Backend Health
```bash
curl http://localhost:5000/api/v1/health
```

### Check Reviews API
```bash
curl http://localhost:5000/api/v1/reviews/latest
```

### Check Database Data
```bash
cd backend
node scripts/checkData.js
```

### Check Logs
```bash
# Backend logs are printed to console when running:
cd backend
npm run dev
```

### Clear All Data and Restart
```bash
cd backend
# Stop the server (Ctrl+C)
# Then run setup again
node scripts/completeDataSetup.js
```

---

## Getting Help

If you're still having issues:

1. **Check the logs:**
   - Backend: Look at console output when running `npm run dev`
   - Frontend: Press F12 and check Console tab

2. **Check the documentation:**
   - QUICK_START.md - Quick reference
   - IMPLEMENTATION_SUMMARY.md - Detailed info
   - API_ENDPOINTS.md - API reference

3. **Verify all steps:**
   - Backend running? `npm run dev`
   - Data populated? `node scripts/completeDataSetup.js`
   - Frontend running? `npm run dev`
   - Reviews page accessible? `http://localhost:5173/reviews`

4. **Try a fresh start:**
   - Stop all servers (Ctrl+C)
   - Clear browser cache (Ctrl+Shift+Delete)
   - Restart backend: `npm run dev`
   - Run setup: `node scripts/completeDataSetup.js`
   - Restart frontend: `npm run dev`
   - Refresh browser

---

## Still Not Working?

If none of these solutions work:

1. Check that all files were created correctly
2. Verify MongoDB Atlas is accessible
3. Check that ports 5000 and 5173 are available
4. Try using a different browser
5. Check system firewall settings
6. Restart your computer

---

**Remember:** Most issues are resolved by:
1. Restarting the backend server
2. Running the data setup script
3. Restarting the frontend
4. Clearing browser cache
5. Refreshing the page
