# RallyCam
Sports drill consistency tracker — point a webcam at your free throw or swing and see your release angle across reps.

## Stack
- Frontend: React + Vite + MediaPipe Tasks Vision (all tracking in-browser)
- Backend: Flask + OpenAI-compatible API for consistency coaching

## Quick start
1. cd backend && pip install -r requirements.txt && cp .env.example .env && python app.py
2. cd frontend && npm install && npm run dev
3. Set up your webcam at a good angle, select your drill, start moving
