# 🔧 Troubleshooting: Sidebar & Survey Issues

## Issue 1: Achievements & Leaderboard Not Showing in Sidebar

### ✅ The Fix
The sidebar code is correct - all items should display. If they're not showing:

#### Step 1: Hard Refresh Your Browser
On Mac, use one of these:
- **Chrome/Edge**: `Cmd + Shift + R`
- **Firefox**: `Cmd + Shift + R`
- **Safari**: `Cmd + Option + R`

This clears the browser cache and reloads the app.

#### Step 2: Check if Items Are Now Visible
1. Log in with your new user account
2. Click the hamburger menu (☰) on the left
3. Scroll through the sidebar
4. You should see:
   - ⭐ Achievements
   - 🏆 Leaderboard

#### Step 3: If Still Not Showing
Open browser console (F12) and check for errors:
```javascript
// Check if Sidebar component loaded
console.log('Checking sidebar...');
```

---

## Issue 2: "Failed to save survey" Error

### ✅ Root Cause
The survey requires **authentication** - you must be logged in before filling it out.

### ✅ The Fix I Implemented

I've updated the onboarding system with:

1. **Better Error Messages** - Now shows WHY the save failed:
   - `"Authentication failed: NO_TOKEN"` → You're not logged in
   - `"Network error"` → Server connection issue
   
2. **Improved Error Logging** - Server logs now show:
   - Whether authentication succeeded
   - What data was received
   - Where the error occurred

3. **Credentials Included** - Survey now sends `credentials: 'include'` to pass cookies

### ✅ How to Fix It

#### Method 1: Make Sure You're Logged In
```
1. Close any open Riseup tabs
2. Go to http://localhost:3000
3. Click "Log in" or "Sign up"
4. Complete authentication
5. You should see the survey modal
6. Fill it out and submit
```

#### Method 2: Check Browser Console for Details
1. Press **F12** to open Developer Tools
2. Click **Console** tab
3. Try to save the survey
4. Look for error messages like:
   ```
   ❌ Authentication failed: NO_TOKEN
   Make sure you are logged in and try again.
   ```

#### Method 3: Debug with Network Tab
1. Press **F12** → **Network** tab
2. Fill out survey and click "Complete"
3. Look for request to `/api/onboarding`
4. Check the response:
   - **Status 200** = Success ✅
   - **Status 401** = Not authenticated ❌
   - **Status 500** = Server error

---

## 📋 Complete Checklist for New Users

After creating a new account, users should:

```
✅ Log in successfully
✅ See Achievements in sidebar (after hard refresh if needed)
✅ See Leaderboard in sidebar (after hard refresh if needed)
✅ Survey modal appears
✅ Fill out all 10 survey steps
✅ Click "Complete" button
✅ See success confirmation
✅ Survey data saved to database
```

---

## 🔍 Testing with New User

Here's how to test with a completely new user account:

### Step 1: Create New Account
```
1. Go to http://localhost:3000
2. Click "Sign up"
3. Enter email, password, name
4. Click "Sign up" button
```

### Step 2: Verify Authentication
```
1. You should be logged in automatically
2. Redirected to dashboard
3. Open browser console (F12)
4. You should see user data
```

### Step 3: Check Sidebar
```
1. Click hamburger menu (☰)
2. Check for Achievements and Leaderboard
3. If not visible: Hard refresh (Cmd+Shift+R)
```

### Step 4: Test Survey
```
1. Survey modal should appear
2. Fill out all 10 steps
3. Click "Complete"
4. Watch the console for success message
5. If error, note the exact message
```

### Step 5: Verify Sidebar Updates
```
1. Close survey
2. Click Achievements link from sidebar
3. Should show empty achievements (no badges yet)
4. Try Leaderboard - you should appear there
```

---

## 🐛 If Survey Still Fails

### Check These Things:

1. **Browser DevTools Console** (F12 → Console)
   - Look for authentication errors
   - Note any error messages

2. **Server Logs** (Terminal where you ran `npm run dev`)
   - Should show: `Onboarding POST - Raw data received: { ... }`
   - Should show: `Onboarding saved successfully for user: ...`
   - If not, there's a server issue

3. **Database Connection**
   - Make sure MongoDB is running
   - Check `.env.local` has `MONGODB_URI` set

4. **Cookies**
   - Press F12 → Application → Cookies
   - Look for `access` cookie
   - If missing: You're not authenticated

---

## 🚀 Next Steps

Once both issues are fixed:

1. ✅ Test creating achievements (use browser console)
2. ✅ Verify Achievements page shows badges
3. ✅ Check Leaderboard rankings
4. ✅ Invite another user to test
5. ✅ Verify both users appear in leaderboard

---

## 📞 Quick Reference

| Issue | Fix |
|-------|-----|
| Sidebar items not showing | Hard refresh: `Cmd+Shift+R` |
| Survey fails to save | Make sure you're logged in first |
| "NO_TOKEN" error | Log out and log back in |
| Still not working | Check browser console (F12) for details |

**Everything is now ready! Test it with a new user account. 🎉**
