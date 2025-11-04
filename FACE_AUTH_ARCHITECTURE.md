# Face Recognition Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE (Browser)                        │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Profile Page (/dashboard/profile)                                │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │  FaceAuthSection Component                                   │  │ │
│  │  │  • Register Face (camera/upload)                             │  │ │
│  │  │  • Verify Face (camera/upload)                               │  │ │
│  │  │  • Delete Face Registration                                  │  │ │
│  │  │  • Premium Feature Gate                                      │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                    │                                    │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │
                          HTTP POST with image file
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS API LAYER (localhost:3001)                   │
│                                                                         │
│  ┌──────────────────────────┐  ┌──────────────────────────┐            │
│  │ /api/face/register       │  │ /api/face/verify         │            │
│  │ • POST - Register face   │  │ • POST - Verify face     │            │
│  │ • GET  - Check status    │  │ • Checks user match      │            │
│  │ • DELETE - Remove face   │  │ • Returns confidence     │            │
│  └──────────┬───────────────┘  └────────┬─────────────────┘            │
│             │                            │                              │
│             │    Forwards image          │                              │
│             └────────────────┬───────────┘                              │
│                              │                                          │
│                              ▼                                          │
│         ┌────────────────────────────────────────┐                     │
│         │  getUserFromRequest(req)                │                     │
│         │  • Validates session                    │                     │
│         │  • Extracts user email                  │                     │
│         └────────────────────────────────────────┘                     │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
           Forwards to FastAPI        Updates Better Auth DB
                    │                           │
                    ▼                           ▼
┌──────────────────────────────────┐  ┌────────────────────────────────┐
│   FASTAPI SERVICE (port 8000)    │  │   MONGODB DATABASE             │
│                                  │  │                                │
│  ┌────────────────────────────┐  │  │  ┌──────────────────────────┐  │
│  │ POST /register/            │  │  │  │ Database: test           │  │
│  │ • Detects face             │  │  │  │ Collection: user         │  │
│  │ • Extracts 512-dim vector  │◄─┼──┼──┤                          │  │
│  │ • Validates single face    │  │  │  │ User Document:           │  │
│  │ • Returns quality metrics  │  │  │  │ {                        │  │
│  └────────────────────────────┘  │  │  │   email: string,         │  │
│                                  │  │  │   faceEmbedding: float[], │  │
│  ┌────────────────────────────┐  │  │  │   faceRegistered: bool,  │  │
│  │ POST /recognize/           │  │  │  │   faceRegisteredAt: date,│  │
│  │ • Detects face in image    │  │  │  │   detectionConfidence: n,│  │
│  │ • Compares to all stored   │◄─┼──┼──┤   isPremium: bool,       │  │
│  │ • Returns best match       │  │  │  │   ...                    │  │
│  │ • Calculates confidence    │  │  │  │ }                        │  │
│  └────────────────────────────┘  │  │  └──────────────────────────┘  │
│                                  │  │                                │
│  ┌────────────────────────────┐  │  └────────────────────────────────┘
│  │ DELETE /workers/{email}    │  │
│  │ • Removes face embedding   │  │
│  │ • Keeps user record        │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ InsightFace AI Model       │  │
│  │ • Face detection           │  │
│  │ • Embedding extraction     │  │
│  │ • Cosine similarity calc   │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘


DATA FLOW - REGISTER FACE:
═══════════════════════════════════════════════════════════════════════

1. User uploads image → FaceAuthSection
2. FormData sent to /api/face/register (Next.js)
3. Next.js validates session, extracts user email
4. Image forwarded to FastAPI /register/ with email as worker_id
5. FastAPI detects face, extracts 512-dim embedding
6. FastAPI stores embedding in MongoDB
7. Next.js updates Better Auth user: faceRegistered = true
8. Success response → UI shows "Face registered successfully"


DATA FLOW - VERIFY FACE:
═══════════════════════════════════════════════════════════════════════

1. User uploads image → FaceAuthSection
2. FormData sent to /api/face/verify (Next.js)
3. Next.js validates session, gets logged-in user email
4. Image forwarded to FastAPI /recognize/
5. FastAPI detects face, extracts embedding
6. FastAPI compares to all stored embeddings (cosine similarity)
7. FastAPI returns best match and confidence score
8. Next.js verifies match email === session email
9. Response → UI shows confidence % and success/failure


SECURITY LAYERS:
═══════════════════════════════════════════════════════════════════════

Layer 1: Session Authentication (Better Auth)
         └─ Only authenticated users can access endpoints

Layer 2: Premium Feature Gate (Client & Server)
         └─ Free users blocked, premium users allowed

Layer 3: User Isolation (Next.js API)
         └─ Users can only register/verify their own face

Layer 4: Face Validation (FastAPI)
         └─ Single face required, quality checks

Layer 5: Confidence Threshold (FastAPI)
         └─ Match must exceed 60% similarity


PREMIUM FEATURE INTEGRATION:
═══════════════════════════════════════════════════════════════════════

┌─────────────────┐
│  Free User      │
│  isPremium=false│
└────────┬────────┘
         │
         ▼
    Shows upgrade
    prompt only
         
┌─────────────────┐
│ Premium User    │
│ isPremium=true  │
└────────┬────────┘
         │
         ▼
   Full face auth
   functionality
```

## Key Technologies

- **Frontend**: React, TypeScript, Next.js 15
- **Backend**: Next.js API Routes (Node.js)
- **AI Service**: FastAPI (Python), InsightFace
- **Database**: MongoDB (Better Auth collection)
- **Authentication**: Better Auth with session management
- **Face Detection**: InsightFace FaceAnalysis
- **Embedding**: 512-dimensional face vectors
- **Similarity**: Cosine similarity algorithm

## Performance Metrics

| Operation | Speed | Notes |
|-----------|-------|-------|
| Face Detection | ~500ms | CPU-based inference |
| Embedding Extraction | ~200ms | 512-dim vector |
| Database Query | ~50ms | MongoDB find operation |
| Similarity Comparison | ~10ms per user | In-memory vector math |
| **Total Verification** | **~1-2 seconds** | For 100 registered users |

## Scalability Considerations

- **< 1,000 users**: Current setup works perfectly
- **1,000 - 10,000 users**: Add Redis cache for embeddings
- **> 10,000 users**: Use vector database (Pinecone, Weaviate)
- **High traffic**: Deploy FastAPI on GPU instance (10x faster)
