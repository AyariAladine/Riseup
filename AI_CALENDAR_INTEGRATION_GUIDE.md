# AI Task Calendar Integration Guide

## 📋 Overview
This integration connects your Flask AI Task Recommender with the Next.js calendar to automatically schedule intelligent task recommendations.

## 🚀 Setup Steps

### 1. Install Required Packages

```bash
cd c:\Users\alaay\Desktop\next_app
npm install react-big-calendar moment date-fns axios
```

### 2. Update Environment Variables

Create/update `.env.local`:
```env
AI_SERVICE_URL=http://localhost:5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

### 3. Run the AI Service (PyCharm)

1. Open PyCharm
2. Open the project: `c:\Users\alaay\Desktop\next_app\src\ai`
3. Right-click on `app.py`
4. Select "Run 'app'"
   
Or run from terminal:
```bash
cd c:\Users\alaay\Desktop\next_app\src\ai
python app.py
```

The Flask server will start on `http://localhost:5000`

### 4. Run Next.js Development Server

```bash
cd c:\Users\alaay\Desktop\next_app
npm run dev
```

## 📁 Files Created

### Backend API Routes:
- `/api/calendar` - GET/POST calendar events
- `/api/ai/recommend` - POST to get AI recommendations
- `/api/tasks/[id]` - PATCH to update tasks

### Frontend:
- `/dashboard/calendar/page.tsx` - Calendar view (enhanced)
- `/dashboard/calendar/calendar.css` - Calendar styling

### Models:
- Updated `Task.js` model with calendar fields

## 🎯 How to Use

### 1. Complete Onboarding
First-time users must complete the onboarding questionnaire to create their learning profile.

### 2. Get AI Recommendations
1. Go to `/dashboard/calendar`
2. Click "🤖 Get AI Recommendations" button
3. AI analyzes your profile and suggests personalized tasks

### 3. Schedule Tasks
1. Review AI-suggested tasks in the modal
2. Select a due date for each task
3. Click "📅 Add to Calendar"
4. Task appears on the calendar

### 4. View Task Details
1. Click any task on the calendar
2. View full details (description, difficulty, time estimate)
3. Mark as completed when done

### 5. Track Progress
- Color-coded tasks by difficulty:
  - 🟢 Easy (Green)
  - 🟠 Medium (Orange)
  - 🔴 Hard (Red)
- Completed tasks show with checkmark

## 🔄 API Flow

```
User Profile (MongoDB)
     ↓
[GET AI Recommendations]
     ↓
Flask AI Service (localhost:5000)
     ↓
Task Recommendations
     ↓
[Schedule to Calendar]
     ↓
MongoDB Tasks Collection
     ↓
Calendar View (React Big Calendar)
```

## 🧪 Testing the Integration

### Test 1: Check AI Service
```bash
curl -X POST http://localhost:5000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "experience": "intermediate",
    "skillLevel": 5,
    "age": 25,
    "timeSpentCoding": 10,
    "motivation": "high",
    "activityLevel": "active"
  }'
```

### Test 2: Get Calendar Events
```bash
curl http://localhost:3000/api/calendar?startDate=2025-10-01&endDate=2025-10-31 \
  -H "Cookie: your_auth_cookie"
```

### Test 3: Create Calendar Task
```bash
curl -X POST http://localhost:3000/api/calendar \
  -H "Content-Type: application/json" \
  -H "Cookie: your_auth_cookie" \
  -d '{
    "task": {
      "title": "Test Task",
      "description": "AI generated task",
      "difficulty": "medium",
      "estimatedTime": 30
    },
    "dueDate": "2025-10-25"
  }'
```

## 🐛 Troubleshooting

### Issue: AI Service Not Connecting
**Solution:**
1. Make sure Flask is running on port 5000
2. Check AI_SERVICE_URL in `.env.local`
3. Verify no firewall blocking

### Issue: Calendar Not Showing Tasks
**Solution:**
1. Check MongoDB connection
2. Verify user is authenticated
3. Check browser console for errors

### Issue: Tasks Not Saving
**Solution:**
1. Verify Task model has all required fields
2. Check MongoDB connection
3. Review API logs for errors

## 📊 Database Schema

### Task Collection:
```javascript
{
  _id: ObjectId,
  userId: String,
  title: String,
  description: String,
  difficulty: 'easy' | 'medium' | 'hard',
  category: String,
  status: 'pending' | 'in_progress' | 'completed',
  estimatedTime: Number, // minutes
  skills: [String],
  dueDate: Date,
  completed: Boolean,
  completedAt: Date,
  aiGenerated: Boolean,
  aiRecommendationData: Object,
  createdAt: Date,
  updatedAt: Date
}
```

### UserLearningProfile Collection:
```javascript
{
  userId: String,
  age: Number,
  codingExperience: String,
  skillLevel: Number,
  hoursPerWeek: Number,
  motivation: String,
  activityLevel: String,
  languagesToLearn: [String],
  // ... other fields
}
```

## 🎨 Customization

### Change Calendar Colors:
Edit `calendar.css`:
```css
.rbc-event {
  background-color: your-color !important;
}
```

### Modify AI Logic:
Edit `src/ai/models/task_recommender.py`:
```python
def _determine_difficulty(self, user_profile):
    # Your custom logic here
    pass
```

### Add More Task Categories:
Edit `src/ai/models/task_recommender.py` in `_load_task_database()`:
```python
'your_category': [
    {
        'id': 'custom_1',
        'title': 'Your Task',
        # ...
    }
]
```

## 📈 Next Steps

1. ✅ Complete onboarding questionnaire
2. ✅ Start AI service in PyCharm
3. ✅ Start Next.js dev server
4. ✅ Navigate to `/dashboard/calendar`
5. ✅ Get AI recommendations
6. ✅ Schedule tasks to calendar
7. ✅ Start learning!

## 🔗 Useful Commands

### Start Everything:
```bash
# Terminal 1: Next.js
cd c:\Users\alaay\Desktop\next_app
npm run dev

# Terminal 2 (or PyCharm): Flask AI Service
cd c:\Users\alaay\Desktop\next_app\src\ai
python app.py
```

### Stop Services:
```bash
# Stop Node processes
Get-Process -Name node | Stop-Process -Force

# Stop Python (if running in terminal)
Ctrl + C
```

## 📞 Support

If you encounter issues:
1. Check Flask terminal for AI service logs
2. Check Next.js terminal for frontend errors
3. Check browser console (F12) for client errors
4. Review MongoDB Atlas logs

Happy Learning! 🚀📚
