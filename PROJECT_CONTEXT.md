# PROJECT_CONTEXT.md
# Distributed Job Execution Platform — AI Context File

> **Update this file at the end of every coding session.**
> Paste this into your AI IDE context at the start of every session.

---

## Current Goal

Build a full-stack Distributed Job Execution System where users submit computational jobs that run asynchronously across registered workers — with scheduling, retries, heartbeat monitoring, and priority queuing.

---

## Tech Stack (LOCKED — Do Not Change)

| Layer     | Tech                           |
|-----------|--------------------------------|
| Backend   | Node.js + TypeScript           |
| Frontend  | Next.js 14 (App Router) + TypeScript + React |
| Database  | PostgreSQL (via Prisma ORM)    |
| Queue     | In-process priority queue (pg-backed for persistence) |
| Real-time | Server-Sent Events (SSE) or polling every 3s |
| Auth      | None (assessment scope — no auth required) |

---

## Architecture Summary (Always Keep in Mind)

```
Browser (Next.js)
    │
    ▼
API Routes (Next.js /api/*)
    │
    ▼
Job Service + Worker Service + Scheduler Service
    │
    ▼
PostgreSQL (jobs, workers, job_logs tables)
    │
    ▼  
Worker Processes (simulated as HTTP clients polling /api/worker/poll)
```

- Workers are **simulated** — they are Node.js processes (or in-browser simulation) that register via API, poll for jobs, execute, and send heartbeats.
- The **Scheduler** is a server-side loop (setInterval) that runs inside the Next.js server (or a separate `scheduler.ts` process).
- **No external message broker** (no Redis, no RabbitMQ) — everything goes through PostgreSQL to keep deployment simple.

---

## Database Schema (Source of Truth)

```sql
-- Jobs
Table: jobs
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
  name          VARCHAR(255) NOT NULL
  payload       JSONB NOT NULL DEFAULT '{}'
  status        ENUM('PENDING','QUEUED','RUNNING','COMPLETED','FAILED','DEAD') DEFAULT 'PENDING'
  priority      INT NOT NULL DEFAULT 5    -- 1 = highest, 10 = lowest
  worker_id     UUID REFERENCES workers(id) NULL
  attempt       INT NOT NULL DEFAULT 0
  max_attempts  INT NOT NULL DEFAULT 3
  result        JSONB NULL
  error         TEXT NULL
  scheduled_at  TIMESTAMPTZ DEFAULT NOW()
  started_at    TIMESTAMPTZ NULL
  completed_at  TIMESTAMPTZ NULL
  created_at    TIMESTAMPTZ DEFAULT NOW()
  updated_at    TIMESTAMPTZ DEFAULT NOW()

-- Workers
Table: workers
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  name            VARCHAR(255) NOT NULL
  status          ENUM('IDLE','BUSY','OFFLINE') DEFAULT 'IDLE'
  last_heartbeat  TIMESTAMPTZ DEFAULT NOW()
  current_job_id  UUID REFERENCES jobs(id) NULL
  created_at      TIMESTAMPTZ DEFAULT NOW()

-- Job Logs
Table: job_logs
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  job_id      UUID REFERENCES jobs(id) NOT NULL
  worker_id   UUID REFERENCES workers(id) NULL
  event       VARCHAR(100) NOT NULL   -- 'SUBMITTED','ASSIGNED','STARTED','PROGRESS','COMPLETED','FAILED','RETRY','DEAD'
  message     TEXT NULL
  metadata    JSONB NULL
  created_at  TIMESTAMPTZ DEFAULT NOW()
```

---

## API Contract (All Routes)

### Jobs
```
POST   /api/jobs              — Submit a new job
GET    /api/jobs              — List all jobs (with filters: status, priority)
GET    /api/jobs/:id          — Get single job + logs
PATCH  /api/jobs/:id/cancel   — Cancel a pending/queued job
POST   /api/jobs/:id/retry    — Manually retry a failed job
```

### Workers
```
POST   /api/workers/register         — Register a new worker
GET    /api/workers                  — List all workers + status
POST   /api/workers/:id/heartbeat    — Worker sends heartbeat
POST   /api/workers/:id/complete     — Worker reports job completion
POST   /api/workers/:id/fail         — Worker reports job failure
GET    /api/workers/:id/poll         — Worker polls for next assigned job
DELETE /api/workers/:id              — Deregister worker
```

### Scheduler (internal — called by setInterval, not from UI)
```
Internal function: scheduleNextBatch()
  — Queries QUEUED jobs ordered by (priority ASC, created_at ASC)
  — Finds IDLE workers
  — Assigns jobs to workers (UPDATE jobs SET status='RUNNING', worker_id=...)
  — Logs ASSIGNED event
```

### Dashboard (frontend SSE or polling)
```
GET /api/dashboard/stats  — { totalJobs, runningJobs, failedJobs, activeWorkers }
GET /api/events           — SSE stream of job/worker state changes (optional)
```

---

## Key Business Logic Rules

1. **Priority**: Lower number = higher priority. 1 runs before 10.
2. **Retry Logic**: On failure, if `attempt < max_attempts`, set status back to `QUEUED`, increment attempt, log RETRY event.
3. **Dead Letter**: If `attempt >= max_attempts`, set status to `DEAD`, log DEAD event.
4. **Heartbeat Timeout**: If a worker's `last_heartbeat` is > 30 seconds ago, the scheduler marks it OFFLINE and reassigns its RUNNING job back to QUEUED (attempt++).
5. **Worker Crash Recovery**: Same as heartbeat timeout — runs every 15 seconds via scheduler loop.
6. **Job Simulation**: Workers execute a "fake" job (setTimeout 2–8 seconds). There is no real compute — the job payload has a `duration` field the worker reads.
7. **Concurrency**: One job per worker at a time (simple model).

---

## Folder Structure (Target)

```
/
├── app/                          ← Next.js App Router
│   ├── page.tsx                  ← Dashboard (job list + worker list + stats)
│   ├── jobs/
│   │   ├── page.tsx              ← Job queue view
│   │   └── [id]/page.tsx         ← Job detail + logs timeline
│   ├── workers/
│   │   └── page.tsx              ← Worker management
│   └── layout.tsx
│
├── app/api/                      ← API Routes
│   ├── jobs/
│   │   ├── route.ts              ← GET list, POST create
│   │   └── [id]/
│   │       ├── route.ts          ← GET single job
│   │       ├── cancel/route.ts
│   │       └── retry/route.ts
│   ├── workers/
│   │   ├── route.ts              ← GET list, POST register
│   │   └── [id]/
│   │       ├── heartbeat/route.ts
│   │       ├── complete/route.ts
│   │       ├── fail/route.ts
│   │       ├── poll/route.ts
│   │       └── route.ts          ← DELETE deregister
│   └── dashboard/
│       └── stats/route.ts
│
├── lib/
│   ├── db.ts                     ← Prisma client singleton
│   ├── scheduler.ts              ← Scheduling loop (assign jobs to workers)
│   ├── heartbeat-monitor.ts      ← Detect dead workers, reassign jobs
│   └── job-service.ts            ← Business logic for jobs
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── scripts/
│   └── simulate-worker.ts        ← CLI worker simulator (run with ts-node)
│
├── components/
│   ├── JobTable.tsx
│   ├── WorkerList.tsx
│   ├── StatsBar.tsx
│   ├── JobSubmitForm.tsx
│   ├── JobLogTimeline.tsx
│   └── StatusBadge.tsx
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   ├── TASKS.md
│   ├── BUGS.md
│   ├── PROMPTS.md
│   └── AGENT.md
│
├── README.md
└── Architecture.md               ← (root level, as required by assignment)
```

---

## Current Progress

- [ ] Prisma schema written
- [ ] DB migrations run
- [ ] POST /api/jobs working
- [ ] GET /api/jobs working
- [ ] Worker registration working
- [ ] Heartbeat endpoint working
- [ ] Scheduler loop running
- [ ] Worker simulator script working
- [ ] Dashboard stats API working
- [ ] Frontend: Dashboard page
- [ ] Frontend: Job detail page
- [ ] Frontend: Worker list page
- [ ] Frontend: Job submit form
- [ ] Retry logic tested
- [ ] Dead worker recovery tested

---

## Environment Variables Needed

```env
DATABASE_URL="postgresql://user:password@localhost:5432/jobplatform"
SCHEDULER_INTERVAL_MS=5000          # How often scheduler assigns jobs
HEARTBEAT_TIMEOUT_MS=30000          # Worker considered dead after this
NEXT_PUBLIC_POLL_INTERVAL_MS=3000   # Frontend polling interval
```

---

## Constraints / Non-Goals

- No authentication (out of scope)
- No real compute (jobs simulate work with setTimeout)
- No horizontal scaling of the Next.js server (single instance is fine for demo)
- No Redis / Kafka / RabbitMQ (keep it simple, PostgreSQL is enough)
- Workers can be simulated via `scripts/simulate-worker.ts` OR via browser buttons — build browser simulation first
