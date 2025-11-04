# 🚀 Quick Start - Face Recognition Integration

## ⚡ 5-Minute Setup

### 1. Add Environment Variables

Create/update `.env.local`:

```env
# Add these lines
FACE_API_URL=http://localhost:8000
NEXT_PUBLIC_FACE_API_URL=http://localhost:8000
```

### 2. Configure Your FastAPI Service

**Option A: Keep Separate Database (Current Setup)**
- Your FastAPI is already configured
- Face data stored in `face_attendance.users`
- Syncs to Better Auth on registration ✅

**Option B: Use Same Database (Recommended)**

Edit your FastAPI `main.py`:

```python
# Find this section:
def get_mongo_connection():
    global mongo_client, db, users_collection
    if mongo_client is None:
        from pymongo import MongoClient
        MONGO_URI = os.getenv("MONGO_URI")
        mongo_client = MongoClient(MONGO_URI)
        
        # CHANGE THESE TWO LINES:
        db = mongo_client["test"]           # Your Better Auth database
        users_collection = db["user"]       # Better Auth uses 'user' (singular)
        
    return users_collection
```

### 3. Start Your Services

```bash
# Terminal 1 - FastAPI Service
cd path/to/your/fastapi
python main.py
# Should start on http://localhost:8000

# Terminal 2 - Next.js App (already running)
# Currently running on http://localhost:3001
```

### 4. Test the Integration

1. **Open your app**: http://localhost:3001
2. **Log in** with your account
3. **Go to Profile**: http://localhost:3001/dashboard/profile
4. **Scroll down** to "Face Authentication" section

### 5. Try It Out!

#### If you're a Premium user:
1. Click "Register Your Face"
2. Upload a clear photo or take one with camera
3. Wait for "Face registered successfully"
4. Click "Verify Your Face"
5. Upload another photo of yourself
6. See confidence score!

#### If you're NOT Premium:
1. You'll see upgrade prompt
2. Click "Upgrade to Premium"
3. Complete payment
4. Return to profile to use face auth

## 🧪 Quick Health Check

```bash
# Check if FastAPI is running
curl http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "memory_optimized": true
}
```

## 📸 Test Images

For best results, use images with:
- ✅ Clear, well-lit face
- ✅ Face looking directly at camera
- ✅ No sunglasses or masks
- ✅ Only ONE face in image
- ✅ Image size: 500KB - 5MB recommended

## 🔍 Troubleshooting

### "Face API not responding"
```bash
# Check if service is running
curl http://localhost:8000/

# If no response, start FastAPI:
cd your-fastapi-folder
python main.py
```

### "No face detected"
- Check image quality
- Ensure good lighting
- Only one face in image
- Try a different photo

### "Low confidence score"
- Re-register with better photo
- Ensure consistent lighting
- Use recent photo
- Confidence < 60% = no match

### "Premium feature not working"
```bash
# Check your premium status in MongoDB
mongosh "your_connection_string"
use test
db.user.findOne({ email: "your@email.com" })
# Check if isPremium: true
```

## 📊 What's Been Added to Your App

### New Files:
```
src/
├── lib/
│   └── face-recognition.ts              # Face API client
├── app/
│   └── api/
│       └── face/
│           ├── register/route.ts        # Register/delete face
│           └── verify/route.ts          # Verify face
└── components/
    ├── FaceAuthSection.tsx              # Profile integration
    └── FaceLogin.tsx                    # Optional login flow

Documentation:
├── FACE_INTEGRATION_SUMMARY.md          # Complete overview
├── FACE_AUTH_INTEGRATION.md             # Detailed guide
└── FACE_AUTH_ARCHITECTURE.md            # System architecture
```

### Updated Files:
```
src/app/dashboard/profile/page.tsx       # Added FaceAuthSection
```

## 🎯 Next Steps

### Immediate:
- [ ] Add environment variables
- [ ] Configure FastAPI database
- [ ] Test face registration
- [ ] Test face verification

### Optional Enhancements:
- [ ] Add face login to `/auth/login` page (use `FaceLogin` component)
- [ ] Email notifications on face registration changes
- [ ] Admin dashboard with face auth statistics
- [ ] Rate limiting on face endpoints
- [ ] Liveness detection (prevent photo spoofing)

## 💡 Usage Tips

### For Users:
- Register in good lighting
- Use recent photos
- Re-register if appearance changes
- Higher confidence = better match (aim for >70%)

### For Developers:
- Monitor confidence scores in logs
- Adjust threshold if needed (default 0.6)
- Consider GPU deployment for faster inference
- Add rate limiting to prevent abuse
- Log verification attempts for security

## 🎉 You're Done!

Your app now has professional-grade biometric face authentication! 

Visit http://localhost:3001/dashboard/profile and scroll to the Face Authentication section to try it out.

## 📞 Need Help?

Check the detailed guides:
- **Full guide**: `FACE_AUTH_INTEGRATION.md`
- **Architecture**: `FACE_AUTH_ARCHITECTURE.md`
- **Summary**: `FACE_INTEGRATION_SUMMARY.md`

Or review the code:
- **API routes**: `src/app/api/face/`
- **Component**: `src/components/FaceAuthSection.tsx`
- **Client**: `src/lib/face-recognition.ts`
