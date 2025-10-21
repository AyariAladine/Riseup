# Calendar Setup Instructions

## Install Dependencies

Run the following command in your Next.js project root:

```bash
npm install react-big-calendar moment date-fns
```

## Environment Variables

Add to your `.env.local`:

```
AI_SERVICE_URL=http://localhost:5000
```

## Run AI Service

In PyCharm, run the Flask app (src/ai/app.py) which will start on port 5000.

## Run Next.js Dev Server

```bash
npm run dev
```

The calendar will be available at `/dashboard/calendar`
