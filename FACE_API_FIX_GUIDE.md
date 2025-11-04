# 🔧 Face API Fix - Better Auth Integration

## Problem
Your FastAPI was using:
- ❌ `worker_id` instead of `user_id`
- ❌ Separate database `face_attendance`
- ❌ Collection `users` instead of Better Auth's `user`
- ❌ Field `workerCode` instead of `email`

## Solution
Updated FastAPI to:
- ✅ Use `user_id` (email as identifier)
- ✅ Connect to YOUR app's database (same as Better Auth)
- ✅ Use `user` collection (singular, matching Better Auth)
- ✅ Store face data in same user document
- ✅ Use `email` field for matching users

---

## 🚀 Setup Instructions

### 1. Update Your FastAPI Code

Replace your entire `main.py` (or whatever your FastAPI file is called) with the code from `FIXED_FACE_API.py`

### 2. Update Environment Variables

Make sure your FastAPI `.env` file has:

```env
MONGO_URI=mongodb://localhost:27017/
MONGO_DB_NAME=test  # ⚠️ CHANGE THIS to your actual database name!
PORT=8000
```

**IMPORTANT:** Find your actual database name by checking:
- Your Next.js `.env.local` file's `MONGODB_URI`
- Or run this in your MongoDB:
  ```javascript
  show dbs
  use <your_db_name>
  db.user.findOne()  // Should show a Better Auth user
  ```

### 3. Restart FastAPI

```bash
# Stop your current FastAPI server (Ctrl+C)
# Then restart:
python main.py
# or
uvicorn main:api --reload --port 8000
```

### 4. Test the Integration

Visit: http://localhost:8000/

You should see:
```json
{
  "message": "Face Recognition API is running",
  "registered_users": 0,
  "status": "healthy"
}
```

---

## 🗄️ Database Schema

After registration, users in your `user` collection will have:

```javascript
{
  "_id": ObjectId("..."),
  "email": "user@example.com",
  "name": "John Doe",
  // ... other Better Auth fields ...
  
  // New face recognition fields:
  "faceRegistered": true,
  "faceEmbedding": [0.123, 0.456, ...],  // 512-dimensional array
  "faceRegisteredAt": ISODate("2025-11-01T..."),
  "faceDetectionConfidence": 0.98,
  "faceAge": 25,
  "faceGender": "M",
  "updatedAt": ISODate("2025-11-01T...")
}
```

---

## 📋 API Changes Summary

### Registration Endpoint
**Before:** `POST /register/` with `worker_id`  
**After:** `POST /register/` with `user_id` (email)

**Request:**
```
POST http://localhost:8000/register/
Content-Type: multipart/form-data

user_id: user@example.com
file: [image file]
```

### Recognition Endpoint
**Before:** Returns `worker_id`  
**After:** Returns `user_email` and `user_id`

**Response:**
```json
{
  "recognized": true,
  "user_id": "user@example.com",
  "user_email": "user@example.com",
  "confidence_score": 0.87,
  "user_details": {
    "name": "John Doe",
    "email": "user@example.com"
  }
}
```

---

## ✅ What's Fixed in Next.js

Updated files:
1. ✅ `/api/face/register/route.ts` - Changed `worker_id` → `user_id`
2. ✅ `/api/face/verify/route.ts` - Changed `worker_id` → `user_email`

---

## 🧪 Testing Steps

1. **Start FastAPI:**
   ```bash
   python main.py
   ```

2. **Start Next.js:**
   ```bash
   pnpm run dev
   ```

3. **Test Registration:**
   - Go to http://localhost:3001/dashboard/profile
   - Click "Register with Camera"
   - Grant camera permission
   - Take photo
   - Check if it registers successfully

4. **Verify Database:**
   ```javascript
   // In MongoDB
   use your_database_name
   db.user.findOne(
     { email: "your@email.com" },
     { faceRegistered: 1, faceEmbedding: 1 }
   )
   ```

---

## ⚠️ Common Issues

### Issue: "User not found"
**Fix:** Make sure the email exists in your `user` collection (Better Auth users)

### Issue: "Database connection error"
**Fix:** Check `MONGO_DB_NAME` in FastAPI `.env` matches your actual database

### Issue: Still getting 500 error
**Check FastAPI logs:** Look at the terminal running FastAPI for detailed error messages

---

## 🔍 Debugging

Enable detailed logging in FastAPI:
```python
# Add to main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

Check Next.js API logs:
```bash
# In Next.js terminal, look for:
POST /api/face/register 200 in XXXms
```

---

## 📝 Key Differences

| Old (Worker-based) | New (Better Auth) |
|-------------------|-------------------|
| `worker_id` | `user_id` (email) |
| `workerCode` field | `email` field |
| `face_attendance` DB | Your app's DB |
| `users` collection | `user` collection |
| Separate DB | Integrated DB |

---

Now your face recognition AI is fully integrated with your Better Auth system! 🎉
