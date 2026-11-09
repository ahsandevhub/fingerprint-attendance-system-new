# UGV FAS - Next-Gen Fingerprint Attendance System

Rebuilt from scratch with **Next.js 15 (App Router)**, **shadcn/ui**, **Server Actions**, and **Local Supabase (Docker)**.

---

## 🚀 Features

- **Embedded Hardware Integration**: Drop-in REST compatibility with ESP32 and FPM10A optical fingerprint scanner.
- **Real-Time Attendance Board**: Supabase Realtime (PostgreSQL change feeds) automatically displays check-in/out timestamps without page refreshes.
- **Remote Biometric Enrollment**: Trigger enrollment from the web UI; visualizes multi-step sensor guidance in a live shadcn dialog.
- **Granular RBAC & Permissions**: Fine-grained access control (`add_user`, `see_users`, `see_all_presence`, `see_all_logs`).
- **Comprehensive Audit Footprints**: Every login, biometric punch, and user modification is recorded with IP and User-Agent.
- **Printable Reports**: Ready-to-print daily attendance sheets with university header.

---

## 🛠️ Project Structure

```text
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Supabase auth login portal
│   │   ├── (dashboard)/           # Protected dashboard layout
│   │   │   ├── page.tsx           # Overview metrics & cards
│   │   │   ├── attendees/         # Live attendance table & print view
│   │   │   ├── users/             # User manager & enrollment trigger
│   │   │   ├── devices/           # Connected ESP32 terminals
│   │   │   └── footprints/        # Security audit log explorer
│   │   └── api/                   # REST endpoints for ESP32
│   │       ├── log-id/route.ts    # POST: Verify & log finger punch
│   │       ├── new-id/route.ts    # GET: Poll pending enrollment job
│   │       └── updateOnNewFinger/ # POST: Hardware progress updates
│   ├── components/                # shadcn/ui components & live dialogs
│   ├── lib/
│   │   ├── actions/               # Server Actions (auth, users)
│   │   └── supabase/              # Supabase SSR client, server & admin
│   └── types/supabase.ts          # Auto-generated database types
├── supabase/                      # Local Supabase config & schema migrations
├── FPM10A_ESP32/                  # ESP32 firmware & libraries
└── public/app/                    # Android APK distribution
```

---

## ⚡ Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v20+
- [Docker Desktop](https://www.docker.com/) running locally

### 2. Start Local Supabase
```bash
# Start Docker containers (Postgres, Realtime, Auth, Studio)
npx supabase start
```
- **Supabase Studio**: `http://localhost:54323`
- **Database Port**: `54322`
- **API URL**: `http://127.0.0.1:54321`

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the portal.

---

## 📟 Hardware (ESP32) Configuration

In [`FPM10A_ESP32/FPM10A_ESP32.ino`](./FPM10A_ESP32/FPM10A_ESP32.ino):
1. Set `serverIp` to your local machine IP (e.g., `192.168.x.x`) or local domain.
2. Set `serverPort` to `3000` (Next.js default port).
3. Set `isServer = false` (or `true` if behind HTTPS reverse proxy).
