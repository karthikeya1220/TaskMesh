# TASKS.md
# Build Checklist — Distributed Job Execution Platform

> Work top-to-bottom. Each phase must be functional before the next.
> Check off as you go. Update "Current Blockers" if stuck.

---

## Current Blockers

_None yet — add here when you get stuck_

---

## Phase 0 — Project Setup (Day 1, ~1 hour)

- [ ] `npx create-next-app@latest job-exec-platform --typescript --app --tailwind`
- [ ] `npm install prisma @prisma/client`
- [ ] `npx prisma init`
- [ ] Create `.env` with `DATABASE_URL`
- [ ] Install dev deps: `npm install -D ts-node tsx`
- [ ] Install UI deps: `npm install lucide-react clsx`
- [ ] Set up PostgreSQL (local Docker or Supabase free tier)
  - Docker command: `docker run --name jobdb -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=jobplatform -p 5432:5432 -d postgres:15`

---

## Phase 1 — Database (Day 1, ~1 hour)

- [ ] Write `prisma/schema.prisma` (see PROJECT_CONTEXT.md schema)
  - Enums: `JobStatus`, `WorkerStatus`
  - Models: `Job`, `Worker`, `JobLog`
  - Add `@@index([status, priority, created_at])` on Job for scheduler query
- [ ] Run `npx prisma migrate dev --name init`
- [ ] Run `npx prisma generate`
- [ ] Create `lib/db.ts` (Prisma singleton — prevent hot-reload creating multiple connections)

---

## Phase 2 — Core API Routes (Day 1, ~3 hours)

### Jobs API
- [ ] `POST /api/jobs` — create job, set status=QUEUED, log SUBMITTED event
- [ ] `GET /api/jobs` — list with optional `?status=` and `?priority=` filters, include worker name
- [ ] `GET /api/jobs/[id]` — job detail + all logs ordered by created_at
- [ ] `PATCH /api/jobs/[id]/cancel` — only if status is PENDING or QUEUED
- [ ] `POST /api/jobs/[id]/retry` — reset FAILED/DEAD job back to QUEUED, reset attempt to 0

### Workers API
- [ ] `POST /api/workers/register` — create worker, status=IDLE
- [ ] `GET /api/workers` — list all workers with current job name if BUSY
- [ ] `POST /api/workers/[id]/heartbeat` — update last_heartbeat to NOW()
- [ ] `GET /api/workers/[id]/poll` — return the job currently assigned to this worker (status=RUNNING, worker_id=this)
- [ ] `POST /api/workers/[id]/complete` — set job COMPLETED, worker IDLE, log COMPLETED
- [ ] `POST /api/workers/[id]/fail` — handle retry logic (see PROJECT_CONTEXT rules), log FAILED or DEAD
- [ ] `DELETE /api/workers/[id]` — mark worker OFFLINE, reassign any running job to QUEUED

### Dashboard API
- [ ] `GET /api/dashboard/stats` — counts: total/pending/queued/running/completed/failed/dead jobs, active/busy/offline workers

---

## Phase 3 — Scheduler + Monitor (Day 1–2, ~2 hours)

- [ ] Create `lib/scheduler.ts`
  - `assignJobs()` function: find IDLE workers + QUEUED jobs (priority order), assign
  - `startScheduler()`: runs `assignJobs()` on setInterval (5s default)
- [ ] Create `lib/heartbeat-monitor.ts`
  - `checkDeadWorkers()`: find workers with last_heartbeat > 30s ago, set OFFLINE, reassign their jobs to QUEUED
  - `startHeartbeatMonitor()`: runs every 15s
- [ ] Wire both into Next.js startup (use `instrumentation.ts` or a startup route)
  - Create `instrumentation.ts` at root: export `register()` that calls both start functions
  - Add `experimental: { instrumentationHook: true }` to `next.config.js`

---

## Phase 4 — Worker Simulator (Day 2, ~1.5 hours)

Build TWO simulators — browser-based (for demo) + CLI script (for video)

### CLI Simulator (`scripts/simulate-worker.ts`)
- [ ] Registers a worker via API
- [ ] Loops: polls `/api/workers/:id/poll` every 2s
- [ ] If job found: wait `job.payload.duration` ms, then call complete or fail (10% random fail chance)
- [ ] Sends heartbeat every 10s
- [ ] Handles SIGINT gracefully (deregisters worker)
- [ ] Run with: `npx tsx scripts/simulate-worker.ts --name "Worker-A"`

### Browser Simulator (component: `components/WorkerSimulator.tsx`)
- [ ] "Spawn Worker" button — calls register API, creates simulated worker in React state
- [ ] Each spawned worker runs its own polling loop (useEffect interval)
- [ ] Shows live status: IDLE / BUSY (job name) / OFFLINE
- [ ] "Kill Worker" button — stops heartbeats (simulates crash), triggers recovery

---

## Phase 5 — Frontend (Day 2, ~3 hours)

### Layout
- [ ] `app/layout.tsx` — sidebar nav: Dashboard, Jobs, Workers
- [ ] Sidebar links: `/` (Dashboard), `/jobs`, `/workers`
- [ ] Top bar with app title and real-time status indicator

### Dashboard Page (`app/page.tsx`)
- [ ] `StatsBar` component: 4 stat cards — Active Workers, Running Jobs, Failed Jobs, Total Jobs
- [ ] Recent jobs table (last 10, all statuses)
- [ ] Recent workers panel
- [ ] Auto-refresh every 3 seconds (useEffect polling)

### Jobs Page (`app/jobs/page.tsx`)
- [ ] Full job table with columns: Name, Priority, Status, Worker, Attempts, Created
- [ ] Status filter dropdown (All / Pending / Running / etc.)
- [ ] `JobSubmitForm` modal/panel — fields: Name, Payload (JSON textarea), Priority (1-10 slider), Max Attempts, Duration (ms)
- [ ] Priority color coding (1-3 = red/urgent, 4-6 = yellow/normal, 7-10 = green/low)
- [ ] `StatusBadge` component with color per status

### Job Detail Page (`app/jobs/[id]/page.tsx`)
- [ ] Job metadata card (all fields)
- [ ] `JobLogTimeline` — vertical timeline of all events with timestamps
- [ ] Cancel / Retry buttons (contextual — show only when applicable)

### Workers Page (`app/workers/page.tsx`)
- [ ] Worker cards grid: Name, Status badge, Last Heartbeat (relative time), Current Job
- [ ] "Register Worker" button (manual registration for demo)
- [ ] `WorkerSimulator` component (browser-based worker spawner)
- [ ] "Kill Worker" button on each worker card (stops heartbeat to demo crash recovery)

---

## Phase 6 — Polish + Edge Cases (Day 2, ~1 hour)

- [ ] Loading states on all data-fetching components
- [ ] Error boundaries / error messages for failed API calls
- [ ] Empty states (no jobs yet, no workers registered)
- [ ] Optimistic UI on job submit (add to table immediately)
- [ ] Toasts/notifications on: job submitted, worker registered, job completed
- [ ] Test retry flow end-to-end (submit → fail → auto-retry → complete)
- [ ] Test dead worker recovery (kill worker mid-job → verify job reassigned)
- [ ] Mobile-responsive layout

---

## Phase 7 — Required Docs (Day 2, ~1 hour)

- [ ] `README.md` — setup instructions, env config, run commands
- [ ] `Architecture.md` — system design, component interactions, tradeoffs
- [ ] `docs/AGENT.md` — AI usage log
- [ ] Push to GitHub with clean commit history
- [ ] Record demo video (10–15 min)

---

## Demo Video Script (for recording)

1. Open app, explain dashboard (30s)
2. Submit 5 jobs with different priorities — show queue ordering (1 min)
3. Register/spawn 2 workers — watch jobs get assigned and run (1 min)
4. Show Job Detail page — walk through the log timeline (1 min)
5. Submit a job with max_attempts=3, trigger failure — show auto-retry (2 min)
6. Kill a worker mid-job — show heartbeat timeout, job reassignment, recovery (2 min)
7. Walk through Architecture.md — explain key decisions (3 min)
8. Show code: scheduler loop, heartbeat monitor, priority query (2 min)

---

## Completed

_(move items here as done)_
