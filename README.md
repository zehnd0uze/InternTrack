# 🎓 InternTrack — Internship Time Tracking System

A full-featured internship time-tracking web application built with **React + Vite** and **Supabase**. Designed for organizations that need to track intern attendance, daily logs, and weekly report approvals across three user roles.

---

## ✨ Features

### 👨‍🎓 Student
- Check in / Check out with live timer
- Write daily work logs (up to 500 characters)
- Submit weekly reports for supervisor approval
- View progress toward target hours (default: 240 hrs)

### 👨‍🏫 Supervisor
- Dashboard overview of all assigned interns
- Approve or reject weekly hour submissions with notes
- View per-student attendance & log details
- Generate progress reports

### 🛠️ Admin
- Full user management (create, edit, deactivate accounts)
- Assign supervisors to students
- View system-wide reports and analytics
- Data manager for direct record control

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Routing | React Router v6 |
| Styling | Tailwind CSS v3 |
| Charts | Recharts |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| Notifications | react-hot-toast |
| Icons | Lucide React |

---

## 🗄️ Database Schema

```
users              — Profiles for all roles (student / supervisor / admin)
attendance         — Daily check-in/check-out records
daily_logs         — Work log entries linked to attendance
weekly_approvals   — Weekly hour submission & approval workflow
notifications      — In-app notification system
```

Row Level Security (RLS) is enabled on all tables — users can only access their own data, supervisors see their students, and admins have full access.

---

## 🛠️ Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/zehnd0uze/InternTrack.git
cd InternTrack
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in your Supabase credentials in `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Set up the database

Go to your [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql) and run the migration file:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, RLS policies, indexes, and the auto-profile trigger.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/       # AppLayout, sidebar, navbar
│   └── ui/           # Reusable UI components
├── contexts/
│   ├── AuthContext.jsx        # Supabase auth state
│   └── NotificationContext.jsx
├── lib/
│   └── supabase.js   # Supabase client
├── pages/
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── student/      # Student dashboard & weekly submit
│   ├── supervisor/   # Supervisor dashboard, approvals, reports
│   └── admin/        # Admin dashboard, users, reports, data manager
└── router/
    └── AppRouter.jsx # Role-based protected routing
```

---

## 🔐 Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous public key |

> ⚠️ Never commit your `.env` file. It is listed in `.gitignore`.

---

## 📄 License

MIT — feel free to use and adapt this project.
