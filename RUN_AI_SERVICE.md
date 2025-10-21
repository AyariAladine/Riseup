# Run AI Service - Quick Start

## Method 1: Using PyCharm (Recommended)

1. Open PyCharm
2. File → Open → Select `c:\Users\alaay\Desktop\next_app\src\ai`
3. Right-click `app.py` in the project explorer
4. Click "Run 'app'"

## Method 2: Using Terminal

### PowerShell:
```powershell
cd c:\Users\alaay\Desktop\next_app\src\ai
python app.py
```

### Command Prompt:
```cmd
cd c:\Users\alaay\Desktop\next_app\src\ai
python app.py
```

## Verify It's Running

You should see output like:
```
🤖 AI Task Recommender Service Started
=====================================
Port: 5000
Debug: False
CORS Enabled for: localhost:3000, localhost:3001

API Endpoints:
- GET  /health
- POST /api/recommend
- POST /api/update-behavior
- GET  /api/user-stats/<user_id>
- GET  /api/tasks/database

Ready to recommend tasks! 🚀

 * Serving Flask app 'app'
 * Running on http://0.0.0.0:5000
```

## Test the Service

Open browser or use curl:
```
http://localhost:5000/health
```

Should return:
```json
{
  "status": "ok",
  "service": "AI Task Recommender",
  "timestamp": "2025-10-19T..."
}
```

## Next Steps

1. ✅ AI Service running on port 5000
2. ✅ Next.js running on port 3000
3. Navigate to: `http://localhost:3000/dashboard/calendar`
4. Click "🤖 Get AI Recommendations"
5. Start scheduling tasks!
