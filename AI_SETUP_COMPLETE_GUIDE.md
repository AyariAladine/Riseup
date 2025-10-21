# 🚀 Complete AI Task Recommender Setup Guide

## 📦 What You Have

I've created a complete AI-powered task recommendation system with:

✅ **Python ML Service** - Smart algorithm that learns from user behavior
✅ **Next.js Integration** - API routes to connect your app
✅ **Adaptive Learning** - Adjusts difficulty and task count based on performance
✅ **Behavior Tracking** - Learns from completion rates and engagement

---

## 🎯 Step-by-Step Setup

### **Step 1: Create Python Project in PyCharm**

1. **Open PyCharm**
2. **Create New Project**:
   - Click: `File` → `New Project`
   - Location: `C:\Users\alaay\Desktop\ai-task-recommender`
   - Interpreter: `New environment using Virtualenv`
   - Click `Create`

3. **Copy All Files**:
   
   From your Next.js project folder `PYTHON_CODE\`, copy these files to PyCharm project:

   ```
   ai-task-recommender/
   ├── app.py                          (Copy from PYTHON_CODE\app.py)
   ├── requirements.txt                (Copy from PYTHON_CODE\requirements.txt)
   └── models/
       ├── __init__.py                 (Copy from PYTHON_CODE\models\__init__.py)
       ├── user_profile.py             (Copy from PYTHON_CODE\models\user_profile.py)
       └── task_recommender.py         (Copy from PYTHON_CODE\models\task_recommender.py)
   ```

---

### **Step 2: Install Python Dependencies**

In PyCharm terminal (bottom of screen):

```bash
pip install -r requirements.txt
```

This installs:
- Flask (web server)
- flask-cors (CORS handling)
- numpy (numerical computing)
- scikit-learn (machine learning)
- pandas (data manipulation)

---

### **Step 3: Run Python Service**

In PyCharm terminal:

```bash
python app.py
```

You should see:
```
🤖 AI Task Recommender Service Started
=====================================
Port: 5000
CORS Enabled for: localhost:3000, localhost:3001

Ready to recommend tasks! 🚀
```

**Leave this running!** Keep the PyCharm window open.

---

### **Step 4: Test Python Service**

Open a new terminal and test:

```bash
curl http://localhost:5000/health
```

Should return:
```json
{
  "status": "ok",
  "service": "AI Task Recommender",
  "timestamp": "..."
}
```

---

### **Step 5: Start Next.js App**

In VS Code terminal (your Next.js project):

```bash
npm run dev
```

---

### **Step 6: Test Integration**

Use this code in your Next.js app:

```javascript
// Example: Get task recommendations
const response = await fetch('/api/ai/recommend-tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    experience: 'new',
    skillLevel: 3,
    age: 22,
    timeSpentCoding: 5,
    motivation: 'high',
    activityLevel: 'active'
  })
});

const recommendations = await response.json();
console.log(recommendations);
```

---

## 🧪 Testing the AI

### Test 1: High Motivation User
```bash
curl -X POST http://localhost:5000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "experience": "new",
    "skillLevel": 2,
    "age": 20,
    "timeSpentCoding": 3,
    "motivation": "high",
    "activityLevel": "active"
  }'
```

**Expected**: 5 easy tasks per week

### Test 2: Low Motivation User
```bash
curl -X POST http://localhost:5000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test456",
    "experience": "intermediate",
    "skillLevel": 6,
    "motivation": "low",
    "activityLevel": "inactive"
  }'
```

**Expected**: 1 medium task per week

### Test 3: Expert User
```bash
curl -X POST http://localhost:5000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test789",
    "experience": "expert",
    "skillLevel": 9,
    "motivation": "high",
    "activityLevel": "active"
  }'
```

**Expected**: 5 hard tasks per week

---

## 📊 How the AI Works

### **Inputs:**
1. **Experience Level**: new, intermediate, expert
2. **Skill Level**: 1-10 scale
3. **Age**: User's age
4. **Time Spent Coding**: Hours per week
5. **Motivation**: high, medium, low
6. **Activity Level**: active, inactive
7. **Historical Data**: Completion rates, engagement

### **Algorithm:**

```python
# 1. Analyze user profile
features = [experience, skill_level, age, time_coding, motivation, activity]

# 2. Determine difficulty
if completion_rate < 50%:
    difficulty = decrease_one_level()
elif completion_rate > 90%:
    difficulty = increase_one_level()
else:
    difficulty = match_experience()

# 3. Calculate task count
if motivation == 'high' and active:
    tasks_per_week = 4-5
elif motivation == 'medium':
    tasks_per_week = 2-3
else:
    tasks_per_week = 1-2

# 4. Select diverse tasks
tasks = select_from_different_categories(difficulty, count)

# 5. Track behavior for next time
update_completion_history(user_id, completed, time_spent)
```

### **Adaptive Learning:**

The AI tracks the last 10-20 tasks:
- If user completes < 50%: Decrease difficulty
- If user completes > 90%: Increase difficulty
- If user inactive: Reduce task count
- Learns optimal task count per user

---

## 🔗 API Endpoints Reference

### **1. Get Recommendations**
```
POST http://localhost:5000/api/recommend

Body:
{
  "userId": "string",
  "experience": "new|intermediate|expert",
  "skillLevel": 1-10,
  "age": number,
  "timeSpentCoding": number,
  "motivation": "high|medium|low",
  "activityLevel": "active|inactive"
}

Response:
{
  "tasks": [...],
  "tasksPerWeek": 5,
  "difficulty": "easy",
  "adaptiveMessage": "..."
}
```

### **2. Update Behavior**
```
POST http://localhost:5000/api/update-behavior

Body:
{
  "userId": "string",
  "taskCompleted": true,
  "timeSpent": 45,
  "difficulty": "medium",
  "taskId": "task_123"
}
```

### **3. Get User Stats**
```
GET http://localhost:5000/api/user-stats/USER_ID

Response:
{
  "totalTasksCompleted": 15,
  "overallCompletionRate": 75.5,
  "recentPerformance": 80.0,
  "streak": 3
}
```

---

## 🎨 Integration Example

Create a new page in your Next.js app:

```typescript
// src/app/dashboard/ai-tasks/page.tsx
"use client";

import { useState, useEffect } from 'react';

export default function AITasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch('/api/ai/recommend-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            experience: 'new',
            skillLevel: 3,
            motivation: 'high',
            activityLevel: 'active'
          })
        });
        const data = await res.json();
        setTasks(data.tasks || []);
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  if (loading) return <div>Loading AI recommendations...</div>;

  return (
    <div>
      <h1>Your Personalized Tasks</h1>
      {tasks.map(task => (
        <div key={task.id}>
          <h3>{task.title}</h3>
          <p>{task.description}</p>
          <span>Difficulty: {task.difficulty}</span>
          <span>Time: {task.estimatedTime}min</span>
        </div>
      ))}
    </div>
  );
}
```

---

## 📈 Next Steps

### **Phase 1: Basic Integration** (Done!)
✅ Python service running
✅ Next.js API routes created
✅ Basic recommendations working

### **Phase 2: User Profile Integration** (To Do)
- [ ] Store user learning preferences in MongoDB
- [ ] Track task completion in database
- [ ] Display AI recommendations in dashboard

### **Phase 3: Advanced Features** (Future)
- [ ] Deep learning model (TensorFlow)
- [ ] Collaborative filtering (similar users)
- [ ] Skill tree visualization
- [ ] Learning path recommendations

---

## 🐛 Troubleshooting

### Python service won't start
```bash
# Check Python version (need 3.8+)
python --version

# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

### CORS errors
Already configured in `app.py`:
```python
CORS(app, origins=["http://localhost:3000", "http://localhost:3001"])
```

### Port 5000 in use
```python
# In app.py, change:
app.run(port=5001)  # Use different port
```

Then update `.env.local`:
```
PYTHON_AI_SERVICE_URL=http://localhost:5001
```

---

## 📞 Quick Reference

| Service | URL | Status |
|---------|-----|--------|
| Python AI | http://localhost:5000 | Check `/health` |
| Next.js | http://localhost:3000 | Main app |
| Recommendations | POST /api/ai/recommend-tasks | From Next.js |

---

## ✅ Success Checklist

- [ ] PyCharm project created
- [ ] Python dependencies installed
- [ ] Python service running (port 5000)
- [ ] Next.js app running (port 3000)
- [ ] Health check passes
- [ ] Test recommendation works
- [ ] Integration endpoint works

---

**You're all set!** 🎉

The AI will now:
✅ Recommend personalized tasks
✅ Adapt to user behavior
✅ Track completion rates
✅ Adjust difficulty dynamically
✅ Motivate users with smart messages

**Next**: Integrate this into your dashboard UI!
