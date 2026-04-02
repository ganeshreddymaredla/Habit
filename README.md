# HabitStreak Tracker

Full-stack habit tracking app — React + Vite frontend, Django REST backend.

## Run the backend

```bash
python backend/manage.py runserver
```

Runs at http://localhost:8000

## Run the frontend

```bash
cd frontend
npm run dev
```

Runs at http://localhost:5173

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/auth/register/ | Register |
| POST | /api/auth/login/ | Login (returns JWT) |
| GET  | /api/auth/me/ | Current user |
| GET/POST | /api/habits/ | List / create habits |
| GET/PATCH/DELETE | /api/habits/:id/ | Habit detail |
| POST | /api/habits/:id/checkin/ | Daily check-in |
| GET  | /api/habits/:id/logs/ | Completion history |

## Team Name
Code Turtles  

Ganesh Reddy Maredla  
Abhishek Repala  
Hrithik Mohan Singh Thakur  
