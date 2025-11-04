# 🔄 Quick Fix Summary

## What You Need to Change in Your FastAPI

### 1. Database Connection (Line ~40)
```python
# ❌ OLD:
db = mongo_client["face_attendance"]  # Separate database
users_collection = db["users"]         # Plural

# ✅ NEW:
db_name = os.getenv("MONGO_DB_NAME", "test")  # Your app's database
db = mongo_client[db_name]
users_collection = db["user"]  # Singular - matches Better Auth
```

### 2. Add CORS Middleware (After line ~12)
```python
# ✅ NEW: Add this after api = FastAPI(...)
from fastapi.middleware.cors import CORSMiddleware

api.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3. Register Endpoint (Line ~100)
```python
# ❌ OLD:
async def register_face(worker_id: str = Form(...), file: UploadFile = File(...)):
    existing_worker = users_collection.find_one({"workerCode": worker_id})

# ✅ NEW:
async def register_face(user_id: str = Form(...), file: UploadFile = File(...)):
    existing_user = users_collection.find_one({"email": user_id})
    
    if not existing_user:
        raise HTTPException(status_code=404, detail=f"User with email {user_id} not found")
```

### 4. Save Face Data (Line ~140)
```python
# ❌ OLD:
result = users_collection.update_one(
    {"workerCode": worker_id},
    {"$set": {
        "faceEmbedding": emb.tolist(),
        "faceRegistered": True,
        "lastUpdated": {"$currentDate": True},
        # ...
    }},
    upsert=True  # Don't upsert!
)

# ✅ NEW:
from datetime import datetime

result = users_collection.update_one(
    {"email": user_id},  # Match by email
    {"$set": {
        "faceEmbedding": emb.tolist(),
        "faceRegistered": True,
        "faceRegisteredAt": datetime.utcnow(),
        "faceDetectionConfidence": float(face.det_score),
        "faceAge": int(face.age) if hasattr(face, 'age') else None,
        "faceGender": face.sex if hasattr(face, 'sex') else None,
        "updatedAt": datetime.utcnow()
    }}
    # No upsert - user must exist!
)
```

### 5. Recognition Response (Line ~200)
```python
# ❌ OLD:
result = {
    "recognized": is_recognized,
    "worker_id": best_worker if is_recognized else None,
    "confidence_score": float(best_score),
    # ...
}

# ✅ NEW:
result = {
    "recognized": is_recognized,
    "user_id": best_user_email if is_recognized else None,
    "user_email": best_user_email if is_recognized else None,  # Add this!
    "confidence_score": float(best_score),
    # ...
}

# Add user details:
if is_recognized and best_user_data:
    result["user_details"] = {
        "name": best_user_data.get("name"),
        "email": best_user_data.get("email"),
        # ...
    }
```

### 6. Delete Endpoint (Line ~260)
```python
# ❌ OLD:
@api.delete("/workers/{worker_id}")
async def delete_worker(worker_id: str):
    result = users_collection.update_one(
        {"workerCode": worker_id},
        {"$unset": {"faceEmbedding": "", "faceRegistered": ""}}
    )

# ✅ NEW:
@api.delete("/users/{user_email}")
async def delete_user_face(user_email: str):
    result = users_collection.update_one(
        {"email": user_email},
        {
            "$unset": {
                "faceEmbedding": "",
                "faceRegistered": "",
                "faceRegisteredAt": "",
                "faceDetectionConfidence": "",
                "faceAge": "",
                "faceGender": ""
            },
            "$set": {"updatedAt": datetime.utcnow()}
        }
    )
```

---

## Environment Variables Needed

Create or update your FastAPI `.env`:

```env
# Your MongoDB connection (same as Next.js)
MONGO_URI=mongodb://localhost:27017/

# Your actual database name (check your Next.js MONGODB_URI)
MONGO_DB_NAME=test  # ⚠️ CHANGE THIS!

# Port
PORT=8000
```

---

## How to Apply

**Option 1: Replace entire file (Easiest)**
```bash
# Backup your old file
cp main.py main.py.backup

# Copy the fixed version
cp FIXED_FACE_API.py main.py

# Update MONGO_DB_NAME in .env
# Restart: python main.py
```

**Option 2: Manual changes**
Apply each change above to your existing `main.py` file

---

## Restart Everything

```bash
# 1. Stop FastAPI (Ctrl+C)
# 2. Restart with new code:
python main.py

# 3. In another terminal, restart Next.js:
pnpm run dev

# 4. Test at http://localhost:3001/dashboard/profile
```

---

## Expected Behavior After Fix

1. ✅ Camera opens on profile page
2. ✅ Take photo → No 500 error
3. ✅ Success message: "Face registered successfully"
4. ✅ Check MongoDB: `db.user.findOne({email: "your@email.com"})` shows `faceRegistered: true`
5. ✅ Can verify face with camera
6. ✅ Can delete face registration

---

## Still Getting 500 Error?

Check FastAPI terminal for the actual error:
```
INFO:     127.0.0.1:64255 - "POST /register/ HTTP/1.1" 500 Internal Server Error
```

Look above that line for the Python traceback - it will show the exact error!

Common errors:
- "User not found" → Email doesn't exist in Better Auth
- "KeyError: 'workerCode'" → Still using old field names
- "Database not found" → Wrong MONGO_DB_NAME in .env
