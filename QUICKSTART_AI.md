# 🎯 QUICK START - AI Task Recommender

## ⚡ 5-Minute Setup

### 1️⃣ Open PyCharm
- Create New Project: `C:\Users\alaay\Desktop\ai-task-recommender`

### 2️⃣ Copy Files
Navigate to your Next.js project and copy the `PYTHON_CODE` folder contents to PyCharm project.

### 3️⃣ Install & Run (in PyCharm terminal)
```bash
pip install -r requirements.txt
python app.py
```

### 4️⃣ Test
```bash
curl http://localhost:5000/health
```

### 5️⃣ Use in Next.js
```javascript
const res = await fetch('/api/ai/recommend-tasks', {
  method: 'POST',
  body: JSON.stringify({
    experience: 'new',
    skillLevel: 3,
    motivation: 'high',
    activityLevel: 'active'
  })
});
```

---

## 📂 Files Created

### Python Service (Copy to PyCharm):
```
✅ PYTHON_CODE/app.py
✅ PYTHON_CODE/requirements.txt
✅ PYTHON_CODE/models/user_profile.py
✅ PYTHON_CODE/models/task_recommender.py
✅ PYTHON_CODE/models/__init__.py
```

### Next.js Integration (Already in your project):
```
✅ src/app/api/ai/recommend-tasks/route.js
✅ src/app/api/ai/update-behavior/route.js
✅ .env.local (updated with PYTHON_AI_SERVICE_URL)
```

### Documentation:
```
✅ AI_SETUP_COMPLETE_GUIDE.md (detailed guide)
✅ PYTHON_ML_SERVICE_SETUP.md (architecture)
✅ THIS FILE (quick start)
```

---

## 🚀 What It Does

**Input:** User profile (experience, skills, motivation, activity)
**Output:** Personalized task list with adaptive difficulty

**Features:**
- ✅ Assigns 1-5 tasks per week based on motivation
- ✅ Matches difficulty to skill level (easy/medium/hard)
- ✅ Tracks completion rates
- ✅ Adapts to user behavior over time
- ✅ Provides motivational messages
- ✅ Selects diverse tasks from different categories

---

## 🎓 Example Response

```json
{
  "tasks": [
    {
      "id": "easy_1",
      "title": "Hello World",
      "description": "Create a program that prints 'Hello, World!'",
      "difficulty": "easy",
      "category": "basics",
      "estimatedTime": 15,
      "skills": ["syntax", "output"]
    }
  ],
  "tasksPerWeek": 5,
  "difficulty": "easy",
  "adaptiveMessage": "Great enthusiasm! I've selected 5 beginner-friendly tasks to build your foundation."
}
```

---

## ❓ Need Help?

Read the full guides:
1. `AI_SETUP_COMPLETE_GUIDE.md` - Complete setup & testing
2. `PYTHON_ML_SERVICE_SETUP.md` - Architecture & API docs

---

**That's it!** Your AI task recommender is ready to use! 🎉
