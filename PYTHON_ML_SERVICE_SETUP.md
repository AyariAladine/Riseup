# 🤖 AI Task Recommender - Python ML Service Setup

## 📁 Project Structure (Create in PyCharm)

Create a new folder: `C:\Users\alaay\Desktop\ai-task-recommender\`

```
ai-task-recommender/
├── app.py                    # Flask API server
├── models/
│   ├── __init__.py
│   ├── task_recommender.py   # ML recommendation engine
│   └── user_profile.py       # User profile analyzer
├── data/
│   ├── tasks_database.json   # Task pool
│   └── user_behavior.json    # User activity tracking
├── utils/
│   ├── __init__.py
│   └── helpers.py            # Helper functions
├── requirements.txt          # Python dependencies
├── config.py                 # Configuration
└── README.md                 # Documentation
```

---

## 🔧 Installation Steps

### 1. Create Project in PyCharm

1. Open PyCharm
2. **File** → **New Project**
3. Location: `C:\Users\alaay\Desktop\ai-task-recommender`
4. Python Interpreter: Create new virtual environment
5. Click **Create**

### 2. Install Dependencies

Open PyCharm Terminal and run:

```bash
pip install flask flask-cors numpy scikit-learn pandas python-dotenv
```

Or create `requirements.txt` (provided below) and run:

```bash
pip install -r requirements.txt
```

---

## 📦 Files to Create

Copy each file content from below into your PyCharm project.

---

## 🚀 How to Run

### Start Python ML Service:
```bash
python app.py
```

Server runs on: `http://localhost:5000`

### Test API:
```bash
curl http://localhost:5000/health
```

---

## 🔗 Integration with Next.js

The Next.js integration code is in your Next.js project:
- API Route: `src/app/api/ai/recommend-tasks/route.js`
- Model: `src/models/AITaskAssignment.js`

---

## 📊 API Endpoints

### 1. Health Check
```
GET /health
Response: {"status": "ok", "service": "AI Task Recommender"}
```

### 2. Get Task Recommendations
```
POST /api/recommend
Body: {
  "userId": "string",
  "experience": "new|intermediate|expert",
  "skillLevel": 1-10,
  "age": number,
  "timeSpentCoding": number (hours/week),
  "motivation": "high|medium|low",
  "activityLevel": "active|inactive",
  "completionRate": 0-1 (optional),
  "engagementScore": 0-100 (optional)
}

Response: {
  "tasks": [...],
  "tasksPerWeek": number,
  "difficulty": "easy|medium|hard",
  "adaptiveMessage": "string"
}
```

### 3. Update User Behavior
```
POST /api/update-behavior
Body: {
  "userId": "string",
  "taskCompleted": boolean,
  "timeSpent": number,
  "difficulty": "string"
}
```

---

## 🧠 ML Algorithm Details

### Features Used:
- Experience level (encoded)
- Skill level (1-10)
- Age group
- Time spent coding
- Motivation level
- Activity status
- Historical completion rate
- Engagement score

### Model:
- **Decision Tree Classifier** for task difficulty
- **Regression** for optimal task count
- **Adaptive Learning** based on user behavior

### Adaptation Strategy:
- Tracks last 10 task completions
- Adjusts difficulty if completion rate < 50% or > 90%
- Adjusts task count based on engagement
- Learns from user patterns over time

---

## 🔐 Security Notes

- Add API key authentication for production
- Use HTTPS in production
- Validate all input data
- Rate limit API calls

---

## 📈 Future Enhancements

- [ ] Use TensorFlow/PyTorch for deep learning
- [ ] Add collaborative filtering (user similarity)
- [ ] Implement A/B testing for task sequences
- [ ] Add natural language processing for task descriptions
- [ ] Track long-term learning progress
- [ ] Personalized learning paths

---

## 🐛 Troubleshooting

### Port Already in Use:
```bash
# Change port in app.py: app.run(port=5001)
```

### CORS Issues:
```bash
# Already configured with flask-cors
```

### Import Errors:
```bash
pip install --upgrade -r requirements.txt
```

---

## 📞 Support

Questions? Check the API documentation or test endpoints using Postman/Thunder Client.
