# Face Recognition API Integration Guide

## 🎯 Overview

This guide explains how to integrate the FastAPI Face Recognition service with your RiseUP Next.js application.

## 📋 Prerequisites

1. **FastAPI Service Running**: Your face recognition API must be deployed and accessible
2. **MongoDB Connection**: The Face API uses MongoDB to store face embeddings
3. **Premium Feature**: Face authentication is configured as a premium-only feature

## 🔧 Setup Instructions

### 1. Environment Variables

Add these variables to your `.env.local` file:

```env
# Face Recognition API URL
FACE_API_URL=http://localhost:8000
NEXT_PUBLIC_FACE_API_URL=http://localhost:8000

# For production, use your deployed API URL:
# FACE_API_URL=https://your-face-api.herokuapp.com
# NEXT_PUBLIC_FACE_API_URL=https://your-face-api.herokuapp.com
```

### 2. FastAPI Service Setup

Your FastAPI service needs the same MongoDB connection as your Next.js app:

```env
# In your FastAPI .env file
MONGO_URI=your_mongodb_connection_string
PORT=8000
```

**Important**: The FastAPI service uses a separate database (`face_attendance`) but can be configured to use your main database. To sync with Better Auth users, modify the FastAPI code:

```python
# In your FastAPI main.py, change:
db = mongo_client["face_attendance"]  # Old
users_collection = db["users"]         # Old

# To:
db = mongo_client["test"]              # Your Better Auth database name
users_collection = db["user"]          # Better Auth uses 'user' (singular)
```

### 3. Data Model Integration

The face API stores these fields in your user collection:

```typescript
{
  email: string;                    // Used as worker_id
  faceEmbedding: number[];          // 512-dimensional face vector
  faceRegistered: boolean;          // Registration status
  faceRegisteredAt: Date;           // Registration timestamp
  detectionConfidence: number;      // Face detection quality score
  age?: number;                     // Estimated age from face
  gender?: string;                  // Detected gender
}
```

## 🚀 Features Implemented

### 1. Profile Page Integration

Users can now:
- ✅ Register their face (upload photo or use camera)
- ✅ Verify their face matches registered data
- ✅ Delete their face registration
- ✅ See real-time confidence scores
- ✅ Premium-only access (non-premium users see upgrade prompt)

### 2. API Endpoints Created

#### `POST /api/face/register`
Register user's face with the AI service
- **Input**: FormData with image file
- **Output**: Registration status, confidence score, face quality metrics

#### `GET /api/face/register`
Check if user has face registered
- **Output**: Boolean status and registration date

#### `DELETE /api/face/register`
Remove user's face registration
- **Output**: Success confirmation

#### `POST /api/face/verify`
Verify if uploaded face matches registered user
- **Input**: FormData with image file, optional threshold
- **Output**: Match status, confidence score, detailed metrics

## 📱 User Experience

### Registration Flow:
1. User clicks "Register Your Face" button
2. Can either:
   - Take photo with device camera (mobile)
   - Upload existing image file
3. AI detects face and extracts embedding
4. System validates single face present
5. Embedding saved to MongoDB
6. User sees success message with quality metrics

### Verification Flow:
1. User clicks "Verify Your Face" button
2. Uploads or captures new image
3. AI compares against registered face
4. Shows match result with confidence percentage
5. Green checkmark if match ✅
6. Red X if no match ❌

## 🔒 Security Features

- **Session Required**: All endpoints require authenticated user session
- **User Isolation**: Each user can only register/verify their own face
- **Premium Gate**: Face auth restricted to premium subscribers
- **Threshold Control**: Configurable similarity threshold (default 0.6 = 60%)
- **Single Face Only**: Rejects images with multiple faces

## 🎨 UI Components

### FaceAuthSection Component
Location: `src/components/FaceAuthSection.tsx`

Features:
- Premium feature gate with upgrade prompt
- File upload with camera capture support
- Real-time loading states
- Confidence score display
- Success/error messaging
- Tips for best photo quality

## 📊 Usage Statistics

The Face API provides analytics endpoints:

```typescript
GET /stats/ - System-wide statistics
{
  total_users: number;
  registered_faces: number;
  registration_rate: string;
}
```

## 🔄 Database Synchronization

### Current Setup:
- FastAPI uses `face_attendance.users` collection
- Better Auth uses `test.user` collection
- Face registration status synced to Better Auth on registration

### Recommended Production Setup:
Use the same database and collection:
1. Update FastAPI to use your Better Auth database
2. Use `user` collection (singular) not `users`
3. Store face data alongside Better Auth user data
4. No synchronization needed

## 🧪 Testing

### Test Face Registration:
```bash
curl -X POST http://localhost:3001/api/face/register \
  -H "Cookie: your-session-cookie" \
  -F "image=@test-face.jpg"
```

### Test Face Verification:
```bash
curl -X POST http://localhost:3001/api/face/verify \
  -H "Cookie: your-session-cookie" \
  -F "image=@test-face-2.jpg" \
  -F "threshold=0.6"
```

### Check FastAPI Health:
```bash
curl http://localhost:8000/health
```

## 📝 Best Practices

### For Users:
- Use well-lit photos
- Face camera directly (no side angles)
- Remove sunglasses/masks
- Use clear, high-quality images
- Re-register if appearance changes significantly

### For Developers:
- Monitor confidence scores (aim for >0.7)
- Adjust threshold based on security needs
- Log failed verification attempts
- Implement rate limiting on face endpoints
- Consider fallback to password/2FA if face fails

## 🚨 Troubleshooting

### Face API Not Responding:
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

### No Face Detected:
- Ensure good lighting
- Face must be clearly visible
- Check image format (JPG, PNG supported)
- Verify only one face in image

### Low Confidence Scores:
- Re-register with better quality photo
- Ensure consistent lighting conditions
- Use recent photos
- Lower threshold if needed (min 0.4)

### Database Connection Issues:
```bash
# Verify MongoDB is accessible
mongosh "your_mongodb_connection_string"

# Check collections
show collections
db.user.findOne({ email: "test@example.com" })
```

## 🔮 Future Enhancements

Possible additions:
- **Liveness Detection**: Prevent spoofing with photos
- **Face Login**: Alternative to password authentication
- **Multi-Face Support**: Register multiple angles
- **Periodic Verification**: Require face check for sensitive actions
- **Attendance System**: Track user presence/activity
- **Age Verification**: Use detected age for content restrictions

## 📞 Support

If you encounter issues:
1. Check FastAPI logs for errors
2. Verify MongoDB connection
3. Test with the provided curl commands
4. Check browser console for client-side errors
5. Ensure premium status is active

## 🎉 Integration Complete!

Your RiseUP app now has biometric face authentication powered by InsightFace AI. Users with premium accounts can register and verify their faces for enhanced security.
