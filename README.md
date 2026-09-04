# eArrow TTMS — School Timetable & Teacher Allocation Management System

A full-stack demo timetable and teacher-allocation system: Master/Daily timetable engine, automatic conflict-free
generation, relief management, lesson plans, exams, room bookings, teacher swaps with dual approval, and more.

**Live demo (frontend only):** deployed to GitHub Pages via the workflow in `.github/workflows/deploy-pages.yml`.
GitHub Pages only serves static files, so the deployed link shows the UI but has no backend to call — see
[Running it for real](#running-it-for-real) below to use the full working app.

## Tech stack

- **Backend:** Nest.js (Express, ESM), in-memory data store (no database — state resets on restart)
- **Frontend:** React 19 + TypeScript + Vite, react-router-dom, axios, framer-motion, recharts

## Running it for real

Two servers, run in separate terminals from the repo root:

```bash
cd backend
npm install
npm run start
# → http://localhost:3000

cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Open `http://localhost:5173` — the frontend talks to the backend at `http://localhost:3000/api`. No login: use the
account switcher in the top-right to try different roles (Admin, Principal, teachers, a parent account, etc.).

Backend state is entirely in-memory and reseeds fresh every restart.
