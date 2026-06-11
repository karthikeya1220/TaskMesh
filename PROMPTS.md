# PROMPTS.md
# Reusable AI Prompts for This Project

> Paste these into your AI IDE (Cline/Cursor/Copilot) with PROJECT_CONTEXT.md attached.
> Each prompt is designed to produce a complete, working file with minimal back-and-forth.

---

## SETUP PROMPTS

### Generate Prisma Schema
```
Read PROJECT_CONTEXT.md carefully, focusing on the Database Schema section.

Generate the complete `prisma/schema.prisma` file with:
- datasource db (postgresql, env("DATABASE_URL"))
- generator client (prisma-client-js)
- Enums: JobStatus (PENDING, QUEUED, RUNNING, COMPLETED, FAILED, DEAD), WorkerStatus (IDLE, BUSY, OFFLINE)
- Model Job: all fields from the schema section, with @@index on (status, priority, createdAt)
- Model Worker: all fields from the schema section
- Model JobLog: all fields from the schema section, with @@index on (jobId, createdAt)

Use camelCase for field names (Prisma convention).
```

### Generate Prisma DB Client Singleton
```
Generate `lib/db.ts` — a Prisma client singleton that prevents multiple 
instances during Next.js hot reload.

Use the standard Next.js pattern: store instance on global in development,
instantiate fresh in production.

Export as default `prisma`.
```

---

## BACKEND PROMPTS

### Generate Jobs API Routes
```
Read PROJECT_CONTEXT.md — focus on the API Contract section (Jobs) and 
Business Logic Rules.

Generate these Next.js App Router API route files:

1. `app/api/jobs/route.ts`
   - GET: fetch all jobs with optional ?status= and ?priority= query params
     Include worker name via join. Order by priority ASC, createdAt ASC.
   - POST: create job (name, payload, priority, maxAttempts from body)
     Set status=QUEUED, attempt=0. Also insert a job_log event=SUBMITTED.

2. `app/api/jobs/[id]/route.ts`
   - GET: fetch single job by id, include all job_logs ordered by createdAt ASC

3. `app/api/jobs/[id]/cancel/route.ts`
   - PATCH: set job status=FAILED only if current status is PENDING or QUEUED
     Return 400 if not cancellable. Log event=CANCELLED.

4. `app/api/jobs/[id]/retry/route.ts`
   - POST: reset job to status=QUEUED, attempt=0, worker_id=null, error=null
     Only if current status is FAILED or DEAD. Log event=RETRY.

All routes: return { error, code } on failure. Return the updated/created 
record on success. Use NextRequest and NextResponse.
```

### Generate Workers API Routes
```
Read PROJECT_CONTEXT.md — focus on API Contract (Workers) and Business Logic Rules.

Generate these Next.js App Router API route files:

1. `app/api/workers/route.ts`
   - GET: all workers, include their currentJob name if BUSY
   - POST /register: create worker (name from body), status=IDLE, lastHeartbeat=NOW()

2. `app/api/workers/[id]/heartbeat/route.ts`
   - POST: update lastHeartbeat=NOW() for worker. Return 404 if not found.

3. `app/api/workers/[id]/poll/route.ts`
   - GET: find the job currently assigned to this worker (status=RUNNING, workerId=this id)
     Return the job or null. Workers use this to get their work.

4. `app/api/workers/[id]/complete/route.ts`
   - POST: body has { result }
     Set job status=COMPLETED, result=body.result, completedAt=NOW()
     Set worker status=IDLE, currentJobId=null
     Insert job_log event=COMPLETED

5. `app/api/workers/[id]/fail/route.ts`
   - POST: body has { error }
     Increment job attempt++
     If attempt < maxAttempts: set job status=QUEUED, workerId=null. Log event=RETRY.
     If attempt >= maxAttempts: set job status=DEAD. Log event=DEAD.
     Either way: set worker status=IDLE, currentJobId=null.

6. `app/api/workers/[id]/route.ts`
   - DELETE: set worker status=OFFLINE. Find their running job (if any), 
     set it back to QUEUED, workerId=null, attempt++. Log event=RETRY.
```

### Generate Scheduler
```
Read PROJECT_CONTEXT.md — focus on Key Business Logic Rules.

Generate `lib/scheduler.ts` with:

function assignJobs():
  - Find all IDLE workers
  - Find top N QUEUED jobs (N = number of idle workers), ordered by priority ASC, createdAt ASC
  - For each pair (job, worker):
    - UPDATE job: status=RUNNING, workerId=worker.id, startedAt=NOW()
    - UPDATE worker: status=BUSY, currentJobId=job.id
    - INSERT job_log: event=ASSIGNED, workerId=worker.id, message=`Assigned to ${worker.name}`
  - Use a Prisma transaction for each assignment pair

function startScheduler():
  - setInterval(assignJobs, SCHEDULER_INTERVAL_MS from env or 5000ms default)
  - Log "Scheduler started" on init
  - Return the interval ID

Import prisma from lib/db.ts. Use async/await throughout.
Log errors but don't throw (scheduler must survive errors).
```

### Generate Heartbeat Monitor
```
Read PROJECT_CONTEXT.md — focus on Key Business Logic Rules (rule 4 and 5).

Generate `lib/heartbeat-monitor.ts` with:

function checkDeadWorkers():
  - Find workers where: status != OFFLINE AND lastHeartbeat < NOW() - HEARTBEAT_TIMEOUT_MS
  - For each dead worker:
    1. UPDATE worker: status=OFFLINE, currentJobId=null
    2. Find their running job (status=RUNNING, workerId=worker.id)
    3. If found:
       - Increment attempt++
       - If attempt < maxAttempts: set job status=QUEUED, workerId=null. Log event=RETRY, message='Worker crashed - job requeued'
       - If attempt >= maxAttempts: set job status=DEAD. Log event=DEAD, message='Worker crashed - max attempts exceeded'
    4. Log `Worker ${worker.name} marked OFFLINE` to console

function startHeartbeatMonitor():
  - setInterval(checkDeadWorkers, 15000)
  - Log "Heartbeat monitor started"
  - Return interval ID

HEARTBEAT_TIMEOUT_MS comes from process.env or defaults to 30000.
Log errors but don't throw.
```

### Generate instrumentation.ts
```
Generate `instrumentation.ts` at the project root (not inside app/).

This is a Next.js 14 instrumentation hook that runs on server startup.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('./lib/scheduler')
    const { startHeartbeatMonitor } = await import('./lib/heartbeat-monitor')
    startScheduler()
    startHeartbeatMonitor()
    console.log('Background services started')
  }
}

Also update next.config.js to add: experimental: { instrumentationHook: true }
```

### Generate Worker Simulator Script
```
Read PROJECT_CONTEXT.md — API Contract section, Worker routes.

Generate `scripts/simulate-worker.ts` — a standalone Node.js script using fetch.

The script should:
1. Parse CLI args: --name (string), --fail-rate (float 0-1, default 0.1), --poll-interval (ms, default 2000)
2. Register: POST http://localhost:3000/api/workers/register { name }
3. Store workerId from response
4. Start heartbeat loop: POST /api/workers/:id/heartbeat every 10 seconds
5. Start poll loop every poll-interval ms:
   a. GET /api/workers/:id/poll
   b. If job returned: 
      - Log "Executing job: {job.name} (duration: {payload.duration}ms)"
      - setTimeout(payload.duration || 3000)
      - If Math.random() < fail-rate: POST /fail with { error: "Simulated failure" }
      - Else: POST /complete with { result: { message: "Completed successfully" } }
6. Handle SIGINT: DELETE /api/workers/:id, log "Worker deregistered", process.exit(0)

Log every action with timestamp prefix: [HH:MM:SS] message
Use node-fetch or native fetch (Node 18+).
No external dependencies beyond Node.js built-ins.
```

---

## FRONTEND PROMPTS

### Generate Dashboard Page
```
Read PROJECT_CONTEXT.md — focus on the tech stack and API routes.

Generate `app/page.tsx` — the main Dashboard page for the Job Execution Platform.

Design: Dark theme, professional monitoring dashboard feel. Use Tailwind CSS.

The page should:
1. Auto-refresh every 3 seconds (useEffect with setInterval)
2. Show a StatsBar at top with 4 cards: Active Workers, Running Jobs, Pending Jobs, Failed Jobs
   Data from: GET /api/dashboard/stats
3. Show a "Recent Jobs" table (last 10 jobs, all statuses)
   Columns: Name, Priority, Status (colored badge), Worker, Created (relative time)
   Data from: GET /api/jobs?limit=10
4. Show an "Active Workers" panel (cards for each worker)
   Data from: GET /api/workers

Components to import (create stubs if they don't exist yet):
- StatusBadge (props: status string)
- Loading spinner

Add a "Submit Job" button that links to /jobs.
Make it look like a real ops dashboard, not a tutorial template.
```

### Generate Jobs Page with Submit Form
```
Read PROJECT_CONTEXT.md.

Generate `app/jobs/page.tsx` — Job queue management page.

Features:
1. Full jobs table with columns: Name, Priority (with color 1-3=red,4-6=yellow,7-10=green), 
   Status badge, Worker, Attempts (current/max), Started, Duration
2. Status filter dropdown (All, Pending, Queued, Running, Completed, Failed, Dead)
3. "Submit New Job" button opens a slide-over panel / modal with form fields:
   - Job Name (text input, required)
   - Priority (range slider 1-10 with label)
   - Max Attempts (number input, default 3)
   - Duration (number input in ms, default 3000, help text: "How long the job simulates work")
   - Payload (JSON textarea, optional, pre-filled with {"duration": 3000})
4. Form submission: POST /api/jobs, then refresh the table
5. Row click navigates to /jobs/:id

Auto-refresh every 3 seconds.
Use Tailwind. No external UI libraries except lucide-react for icons.
```

### Generate Job Detail Page
```
Generate `app/jobs/[id]/page.tsx` — Job detail and log timeline page.

Layout: two-column on desktop, single column on mobile.

Left column — Job metadata card:
- All job fields displayed (name, status badge, priority, worker, attempts, payload as JSON, result/error if present)
- Cancel button (visible only if status is QUEUED — calls PATCH /api/jobs/:id/cancel)
- Retry button (visible only if status is FAILED or DEAD — calls POST /api/jobs/:id/retry)

Right column — Event timeline:
- Vertical timeline of all job_logs ordered by createdAt ASC
- Each event shows: colored dot (color by event type), event name, timestamp (formatted), message
- Event colors: SUBMITTED=blue, ASSIGNED=purple, STARTED=yellow, COMPLETED=green, FAILED=red, RETRY=orange, DEAD=gray
- Auto-refresh every 3 seconds while job status is RUNNING

Data: GET /api/jobs/:id (returns job + logs array)
Use Tailwind. Back button to /jobs.
```

### Generate Workers Page
```
Generate `app/workers/page.tsx` — Worker management page.

Features:
1. Worker grid: cards for each worker showing:
   - Name (large)
   - Status badge (IDLE=green, BUSY=yellow, OFFLINE=gray)
   - Current Job name if BUSY
   - Last Heartbeat (relative time, e.g. "3 seconds ago")
   - "Kill Worker" button — stops heartbeats to simulate crash (sets internal flag)
   
2. "Register Worker" button — opens modal with Name field, calls POST /api/workers/register

3. WorkerSimulator component below the grid:
   - "Spawn Browser Worker" button
   - List of active browser-simulated workers with status
   - Each browser worker: registers via API, polls every 2s, sends heartbeat every 10s
   - Executes jobs (setTimeout with payload.duration)
   - Has "Kill" button (stops heartbeats, simulates crash for demo)

Auto-refresh the worker grid every 3 seconds.
Implement the browser worker simulation in React state with useEffect intervals.
```

### Generate StatusBadge Component
```
Generate `components/StatusBadge.tsx` — a reusable status badge component.

Props: { status: string, size?: 'sm' | 'md' }

Status → color mapping:
- PENDING: gray
- QUEUED: blue  
- RUNNING: yellow (with animated pulse dot)
- COMPLETED: green
- FAILED: red
- DEAD: dark gray / slate
- IDLE: green (for workers)
- BUSY: yellow (for workers)
- OFFLINE: gray (for workers)

Use Tailwind classes. Include a small colored dot before the text.
RUNNING and BUSY states should have a pulsing dot animation.
```

---

## DEBUGGING PROMPTS

### Debug Scheduler Not Assigning
```
My scheduler is running (I can see the log "Scheduler started") but jobs 
stay in QUEUED status and never get assigned to workers.

Here is my scheduler code: [paste lib/scheduler.ts]
Here is my Prisma schema: [paste prisma/schema.prisma]

The workers table has workers with status=IDLE.
The jobs table has jobs with status=QUEUED.

Debug this. Check:
1. Is the Prisma query fetching IDLE workers correctly?
2. Is the job assignment updating both tables?
3. Are there any transaction rollbacks?
4. Is the import of prisma correct?
```

### Debug Worker Not Receiving Jobs After Assignment
```
My scheduler assigns jobs (I can see status=RUNNING in the DB) but my 
worker's poll endpoint returns null.

Here is my poll route: [paste app/api/workers/[id]/poll/route.ts]

The worker is polling GET /api/workers/:workerId/poll.
The job has status=RUNNING and workerId set to this worker's ID.

Debug the poll query. It should return a job where status=RUNNING AND workerId=params.id.
```
