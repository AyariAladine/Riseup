# 🧪 Testing Checklist - AI Recommendations & LightFM Integration

## ✅ Pre-Testing Setup

### Environment Variables Required

**Next.js (.env.local):**
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=riseup

# AI Services
GROQ_API_KEY=your_groq_api_key
AI_SERVICE_URL=http://localhost:5000

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Python Service (.env in lightfm_service/):**
```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=riseup
PYTHON_PORT=5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Services to Start

1. **MongoDB** - Must be running
2. **Python LightFM Service** - `cd "LightFM AI Model/lightfm_service" && python app.py`
3. **Next.js Dev Server** - `pnpm dev`

---

## 🧪 Test Scenarios

### 1. **Language Selection in Profile** ✅
- [ ] Go to `/dashboard/profile`
- [ ] Click "Edit" on Learning Profile
- [ ] Click language buttons to select/deselect
- [ ] Verify selected count updates
- [ ] Save and verify languages persist
- [ ] Verify can deselect all languages (empty selection)

### 2. **AI Task Recommendations**
- [ ] Go to `/dashboard/tasks` or `/dashboard/recommend`
- [ ] Click "🤖 Get AI Recommendations"
- [ ] Verify 5 tasks are shown
- [ ] Verify tasks have titles, difficulty, estimated time
- [ ] Select a task and schedule it
- [ ] **NEW**: Verify task is created with AI-generated description + exercises
- [ ] **NEW**: Verify interaction is tracked (check MongoDB `usertaskinteractions` collection)

### 3. **Task Creation with AI Content**
- [ ] Get AI recommendations
- [ ] Select a task and add to calendar/kanban
- [ ] **NEW**: Check task detail page - should have:
  - Detailed description (2-3 paragraphs)
  - Learning objectives (bullet points)
  - Exercises (3-5 with instructions)
- [ ] Verify content is personalized to your learning profile

### 4. **Task Status Tracking**
- [ ] Create a task from recommendation
- [ ] Move task to "In Progress" (kanban drag or status update)
- [ ] **NEW**: Verify interaction tracked with `started: true`
- [ ] Complete the task (move to Done or grade it)
- [ ] **NEW**: Verify interaction tracked with `completed: true`
- [ ] Check MongoDB - should see interaction with weight > 0

### 5. **Task Grading & Interaction Tracking**
- [ ] Complete a task via Challenge Bot or manual grading
- [ ] Submit solution and get graded (score 0-100)
- [ ] **NEW**: Verify interaction tracked with:
  - `completed: true`
  - `score: [your score]`
  - `interactionWeight: [calculated weight]`
- [ ] Check MongoDB `usertaskinteractions` collection

### 6. **Dynamic Quiz Generation**
- [ ] Go to a task detail page
- [ ] Click "Take Quiz"
- [ ] **NEW**: Verify quiz is generated based on:
  - Your learning profile (experience, skill level)
  - The specific task context
- [ ] **NEW**: Verify quiz has 5-8 questions (not static 2)
- [ ] **NEW**: Verify questions are relevant to the task
- [ ] Complete quiz and verify explanations are shown

### 7. **LightFM Learning Over Time**
- [ ] Complete 3-5 tasks with different difficulties
- [ ] Get new AI recommendations
- [ ] **NEW**: Verify recommendations adapt to your performance:
  - If you completed easy tasks → more easy/medium
  - If you scored high on hard tasks → more hard tasks
  - If you abandoned tasks → fewer of that type
- [ ] Check Python service logs - should show:
  - `[LightFM] Found X interactions from Y users`
  - `[LightFM] Model trained successfully`

### 8. **Recommend Page Integration**
- [ ] Go to `/dashboard/recommend`
- [ ] Get recommendations
- [ ] Click "Add to Tasks" on a recommendation
- [ ] **NEW**: Verify task created with AI-generated content
- [ ] **NEW**: Verify interaction tracked (viewed: true)

### 9. **Error Handling**
- [ ] Test with Groq API key missing (should use fallback)
- [ ] Test with Python service down (should use rule-based recommendations)
- [ ] Test with no MongoDB connection (should use bootstrap)
- [ ] Test with insufficient interactions (< 10) - should use bootstrap

---

## 🔍 Verification Points

### MongoDB Collections to Check

1. **`usertaskinteractions`** - Should have entries when:
   - Tasks are created from recommendations
   - Tasks are moved to in_progress
   - Tasks are completed
   - Tasks are graded

2. **`tasks`** - Should have:
   - `description` field with AI-generated content (for AI-recommended tasks)
   - `aiGenerated: true` flag
   - `difficulty`, `category`, `skills` fields

3. **`userlearningprofiles`** - Should have:
   - `languagesToLearn` array (not `preferredLanguages`)

### Python Service Logs to Watch

- `[LightFM] Connected to MongoDB: riseup`
- `[LightFM] Loaded X tasks from database`
- `[LightFM] Found X interactions from Y users`
- `[LightFM] Model trained successfully with X interactions`
- `[LightFM] Model trained: X users, Y items`

### API Endpoints to Test

- `POST /api/ai/recommend` - Should return 5 tasks
- `POST /api/ai/generate-task-content` - Should return description + exercises
- `POST /api/ai/quiz` - Should return dynamic quiz (5-8 questions)
- `POST /api/ai/update-behavior` - Should save interaction
- `POST /api/tasks` - Should create task
- `PATCH /api/tasks/[id]` - Should track status changes
- `POST /api/tasks/[id]/grade` - Should track completion with score

---

## 🐛 Common Issues to Watch For

1. **MongoDB Connection**: Python service can't connect
   - Check `MONGODB_URI` and `MONGODB_DB` in Python `.env`
   - Verify MongoDB is running

2. **No Interactions**: LightFM uses bootstrap
   - Need at least 10 interactions to train
   - Complete some tasks first

3. **AI Content Not Generated**: 
   - Check `GROQ_API_KEY` is set
   - Check API logs for errors
   - Should fallback to basic description

4. **Quiz Not Dynamic**:
   - Verify `taskContext` is passed to quiz API
   - Check Groq API key
   - Should fallback to Python service quiz

5. **Interactions Not Tracked**:
   - Check MongoDB connection
   - Verify `UserTaskInteraction` model is imported
   - Check server logs for errors

---

## ✅ Success Criteria

- [ ] Language selection works intuitively (click to toggle)
- [ ] AI recommendations show 5 tasks
- [ ] Selected tasks get AI-generated descriptions + exercises
- [ ] Quizzes are dynamic (5-8 questions) and task-specific
- [ ] All task interactions are tracked in MongoDB
- [ ] LightFM learns from user behavior over time
- [ ] Recommendations improve based on performance
- [ ] No errors in console or server logs

---

## 📝 Notes

- First-time users: Will use bootstrap model until enough interactions
- Model retraining: Happens automatically on next recommendation request
- Interaction weights: Higher for completed tasks with high scores
- Fallbacks: System gracefully degrades if services unavailable

