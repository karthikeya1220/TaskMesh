# Architecture.md
# Distributed Job Execution Platform — System Architecture

---

## 1. High-Level Overview

The platform is a full-stack web application that allows users to submit computational jobs, schedule them across registered workers, monitor execution, and recover from failures — all without an external message broker.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Client                           │
│   Dashboard | Job Queue | Worker Manager | Job Detail           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (polling every 3s)
┌──────────────────────────▼──────────────────────────────────────┐
│                  Next.js Application Server                      │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  API Routes  │  │  Scheduler   │  │  Heartbeat Monitor     │  │
│  │  /api/jobs   │  │  (setInterval│  │  (setInterval 15s)     │  │
│  │  /api/workers│  │   5s)        │  │  Detects dead workers  │  │
│  │  /api/dash.. │  │  Assigns jobs│  │  Reassigns their jobs  │  │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬─────────────┘  │
│         └────────────────┴─────────────────────┘                │
│                          │                                       │
│                    ┌─────▼──────┐                                │
│                    │  Prisma ORM │                               │
│                    └─────┬──────┘                                │
└──────────────────────────┼──────────────────────────────────────┘
                           │
            ┌──────────────▼──────────────────┐
            │         PostgreSQL               │
            │  jobs | workers | job_logs        │
            └─────────────────────────────────┘
                           ▲
          ┌────────────────┴────────────────┐
          │   Worker Processes               │
          │   (Node.js CLI or Browser sim)   │
          │   - Poll /api/workers/:id/poll   │
          │   - Send heartbeat every 10s     │
          │   - Report complete/fail         │
          └──────────────────────────────────┘
```

---

## 2. Component Interactions

### 2.1 Job Lifecycle

```
User submits job
      │
      ▼
POST /api/jobs
  → Insert job (status=QUEUED, attempt=0)
  → Insert job_log (event=SUBMITTED)
      │
      ▼ (within ~5 seconds)
Scheduler: assignJobs()
  → SELECT jobs WHERE status=QUEUED ORDER BY priority ASC, created_at ASC LIMIT N
  → SELECT workers WHERE status=IDLE LIMIT N
  → For each pair: UPDATE job (status=RUNNING, worker_id=X), UPDATE worker (status=BUSY)
  → INSERT job_log (event=ASSIGNED)
      │
      ▼
Worker polls /api/workers/:id/poll
  → Returns the assigned job
  → Worker executes (simulated: setTimeout N ms)
      │
      ├── SUCCESS → POST /api/workers/:id/complete
      │     → UPDATE job (status=COMPLETED, result=..., completed_at=NOW())
      │     → UPDATE worker (status=IDLE, current_job_id=null)
      │     → INSERT job_log (event=COMPLETED)
      │
      └── FAILURE → POST /api/workers/:id/fail
            → If attempt < max_attempts:
            │     → UPDATE job (status=QUEUED, attempt++, worker_id=null)
            │     → UPDATE worker (status=IDLE)
            │     → INSERT job_log (event=RETRY)
            └── If attempt >= max_attempts:
                  → UPDATE job (status=DEAD)
                  → INSERT job_log (event=DEAD)
```

### 2.2 Heartbeat & Crash Recovery

```
Worker sends heartbeat every 10s:
  POST /api/workers/:id/heartbeat
  → UPDATE workers SET last_heartbeat=NOW()

Heartbeat Monitor runs every 15s:
  → SELECT workers WHERE last_heartbeat < NOW() - 30s AND status != OFFLINE
  → For each dead worker:
      UPDATE worker (status=OFFLINE)
      Find their running job (if any)
      UPDATE job (status=QUEUED, worker_id=null, attempt++)
      INSERT job_log (event=RETRY, message='Worker crashed')
  → If attempt >= max_attempts → job becomes DEAD instead
```

### 2.3 Priority Scheduling

The scheduler uses a single ordered query:

```sql
SELECT * FROM jobs
WHERE status = 'QUEUED'
ORDER BY priority ASC, created_at ASC
LIMIT :available_worker_count
```

Priority is an integer 1–10 where **1 = highest priority**. Jobs with the same priority are served FIFO (by `created_at`). This gives a predictable, fair queue without complex algorithms.

---

## 3. Database Design

### Why PostgreSQL (not Redis/Kafka)?

**Decision**: Use PostgreSQL as both the persistence layer and the coordination layer.

**Reasoning**:
- Assessment scope doesn't require true horizontal scaling
- PostgreSQL's `SELECT ... FOR UPDATE SKIP LOCKED` can prevent double-assignment in multi-scheduler scenarios
- Keeps the deployment to a single service (no Redis, no broker)
- Job history and logs are naturally relational
- Prisma provides type-safe queries with excellent Next.js integration

**Trade-off**: At high throughput (1000s jobs/sec), a dedicated queue like Redis Streams or RabbitMQ would outperform this. For this use case (demo-scale), PostgreSQL is sufficient and simpler.

### Why Prisma ORM?

- TypeScript-first: auto-generates typed client from schema
- Migration system: reproducible schema changes
- Readable query syntax vs raw SQL for CRUD operations
- Easy to swap underlying DB if needed

### Key Indexes

```sql
-- Scheduler query performance
CREATE INDEX idx_jobs_scheduler ON jobs (status, priority ASC, created_at ASC);

-- Worker lookup
CREATE INDEX idx_jobs_worker ON jobs (worker_id, status);

-- Log retrieval
CREATE INDEX idx_logs_job ON job_logs (job_id, created_at ASC);
```

---

## 4. Scheduling Algorithm

### Current: Greedy Assignment (Simple & Sufficient)

Every 5 seconds:
1. Count available (IDLE) workers: `N`
2. Fetch top `N` QUEUED jobs ordered by `(priority, created_at)`
3. Pair them 1:1, update atomically

**Limitation**: No batching, no concurrency safety across multiple scheduler instances. Acceptable for single-server deployment.

**Production upgrade path**: Wrap assignment in a transaction with `SELECT ... FOR UPDATE SKIP LOCKED` to safely run multiple scheduler instances.

### Priority Model

| Priority | Meaning      | Color in UI |
|----------|--------------|-------------|
| 1–3      | Critical     | Red         |
| 4–6      | Normal       | Yellow      |
| 7–10     | Low          | Green       |

---

## 5. Worker Model

Workers are **external processes** that interact with the system purely via HTTP API. This means:

- Workers can be in any language (as long as they speak HTTP)
- Workers can run on different machines (network-accessible API)
- The server has no direct connection to workers — it's pull-based

### Pull vs Push Architecture

**Choice**: Pull (workers poll for jobs)

Workers call `GET /api/workers/:id/poll` to receive their assigned job.

**Why not push (SSE/WebSocket to workers)?**
- Simpler to implement and reason about
- Works reliably across network boundaries
- Workers control their own concurrency (they decide when to poll)
- No persistent connection management needed

**Trade-off**: Up to `POLL_INTERVAL` (2s) latency between job assignment and execution start. Acceptable for this use case.

---

## 6. Failure Handling Strategies

### 6.1 Worker Crash (Heartbeat Timeout)

- Worker dies → stops sending heartbeats
- Monitor detects after 30s → marks OFFLINE
- Running job gets re-queued with `attempt++`
- Scheduler picks it up for another worker on next cycle

**Why 30s timeout?** Balance between fast recovery and false positives from network hiccups. Configurable via `HEARTBEAT_TIMEOUT_MS` env var.

### 6.2 Job Failure (Worker Reports Failure)

- Worker explicitly calls `/api/workers/:id/fail`
- System checks `attempt < max_attempts`
- If yes: re-queue (QUEUED), increment attempt
- If no: mark DEAD (permanent failure, no more retries)

### 6.3 Scheduler Failure

- Scheduler is a `setInterval` loop in the Next.js process
- If the server crashes, jobs remain in QUEUED/RUNNING state in the DB
- On server restart, `instrumentation.ts` restarts the scheduler
- RUNNING jobs with no active worker are caught by heartbeat monitor on startup

### 6.4 Database Unavailability

- All API routes will return 500
- Jobs in-flight are not corrupted (PostgreSQL ACID guarantees)
- On DB recovery, the scheduler resumes automatically

### 6.5 Stuck Jobs (No Workers Available)

- Jobs remain in QUEUED state indefinitely
- When a worker registers/becomes IDLE, they are picked up on the next scheduler tick
- No timeout on QUEUED status (jobs don't expire waiting for workers)

---

## 7. Scalability Considerations

### Current Limits (Single Server)

| Metric                  | Estimated Limit     |
|-------------------------|---------------------|
| Jobs per second         | ~50–100             |
| Concurrent workers      | ~100                |
| Job history             | Millions (PostgreSQL) |
| Scheduler latency       | ~5s max             |

### Scaling Path (Not Implemented — Out of Scope)

**Horizontal API scaling**: Add load balancer, but scheduler must run on only one instance (use distributed lock like `pg-leader` or move to separate process).

**Scheduler as separate service**: Extract `scheduler.ts` and `heartbeat-monitor.ts` into a standalone Node.js process. Deploy independently.

**Replace DB queue with Redis Streams**: For >1000 jobs/sec, move job queue to Redis Streams for O(1) enqueue/dequeue. Keep PostgreSQL for persistence and history.

**Worker pools**: Run multiple worker processes per machine. Each worker is independent and registered separately.

---

## 8. API Design Decisions

### RESTful over GraphQL

Simpler to implement, easier to test with curl, no schema overhead for an assessment.

### Polling over WebSockets for Frontend

Frontend polls `/api/dashboard/stats` and `/api/jobs` every 3 seconds. This is simpler than WebSocket management and sufficient for demo purposes. Latency is acceptable (3s max staleness).

### No Authentication

Out of scope for assessment. In production: add API key per worker, JWT for dashboard users.

### Error Response Format

All API errors return:
```json
{ "error": "Human-readable message", "code": "MACHINE_READABLE_CODE" }
```

---

## 9. Technology Alternatives Considered

| Decision            | Chosen          | Alternatives Considered         | Why Chosen                                      |
|---------------------|-----------------|----------------------------------|-------------------------------------------------|
| Database            | PostgreSQL      | SQLite, MongoDB, Redis            | ACID, relational, production-ready, free         |
| ORM                 | Prisma          | Drizzle, raw pg, TypeORM          | Best TypeScript DX, great migration tooling      |
| Queue mechanism     | DB polling      | Redis, BullMQ, RabbitMQ, SQS     | No extra services, simpler deployment            |
| Scheduler runtime   | Next.js process | Separate Node.js process, cron   | Fewer moving parts for demo                      |
| Worker sim          | HTTP poll loop  | WebSocket, SSE push to workers   | Pull is simpler, workers stay stateless          |
| Frontend data sync  | Polling (3s)    | SSE, WebSocket, SWR              | Simplest, no persistent connection management    |
