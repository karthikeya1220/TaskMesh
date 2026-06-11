# DECISIONS.md
# Architectural Decision Log

> Add an entry every time you make a significant technical choice.
> This is gold for the demo video — you can reference WHY you built it this way.

---

## Decision 001 — PostgreSQL as the Queue (No Redis/RabbitMQ)

**Date**: Day 1
**Status**: Accepted

### Context
The system needs a job queue. Industry-standard choices are Redis (with BullMQ), RabbitMQ, or Amazon SQS. All require additional services.

### Decision
Use PostgreSQL as both the persistence store AND the queue mechanism. Workers poll a `/poll` endpoint; the scheduler reads from the DB.

### Reasoning
- Assessment scope doesn't require >100 jobs/second throughput
- Single service deployment is simpler to demo and explain
- PostgreSQL has `SELECT ... FOR UPDATE SKIP LOCKED` for safe multi-consumer polling if needed later
- Keeps the entire system explainable without knowledge of Redis/AMQP internals

### Trade-offs
- **Lost**: Sub-millisecond queue latency (Redis is ~0.1ms; DB poll is ~5s)
- **Lost**: Automatic dead-letter queue and visibility timeout semantics (BullMQ has this built in)
- **Gained**: No extra infrastructure, single connection string, ACID guarantees on all state changes

### Upgrade Path
If throughput requirements grow: replace the scheduler's DB query with a Redis Streams `XREADGROUP` call. The worker API and all business logic stays the same.

---

## Decision 002 — Pull-Based Workers (Polling) over Push (WebSocket/SSE)

**Date**: Day 1
**Status**: Accepted

### Context
When the scheduler assigns a job to a worker, how does the worker receive it?

**Option A (Push)**: Server holds a WebSocket/SSE connection to each worker, pushes job immediately on assignment.
**Option B (Pull)**: Worker periodically calls `GET /api/workers/:id/poll`, receives job if one is assigned.

### Decision
Pull-based polling by workers.

### Reasoning
- No persistent connection management (simpler server code)
- Workers are stateless — they can restart without the server noticing until heartbeat timeout
- Works across firewalls/NAT without special configuration
- Consistent with real-world systems (SQS, Celery with DB broker all use pull)
- Easier to demonstrate: the polling loop is visible and readable

### Trade-offs
- **Lost**: Instantaneous job start (up to `POLL_INTERVAL` = 2s delay)
- **Gained**: Stateless worker design, simpler server, no connection cleanup

---

## Decision 003 — Scheduler in Next.js Process via instrumentation.ts

**Date**: Day 1
**Status**: Accepted

### Context
The scheduler (assign jobs to workers) and heartbeat monitor (detect dead workers) are background loops. Where do they run?

**Option A**: Separate Node.js process (`node scheduler.js`)
**Option B**: Inside the Next.js server process using `instrumentation.ts`

### Decision
Use `instrumentation.ts` to start both loops inside the Next.js process.

### Reasoning
- Assessment is a monorepo — one process to start, one process to explain
- `instrumentation.ts` is the correct Next.js pattern for server-startup side effects
- Fewer deployment steps for the evaluator (just `npm run dev`)

### Trade-offs
- **Lost**: Ability to scale scheduler independently
- **Lost**: Scheduler restarts on Next.js hot-reload (fine for dev; prod build doesn't hot-reload)
- **Gained**: Single-command startup, simpler repo structure

### Upgrade Path
Extract `lib/scheduler.ts` and `lib/heartbeat-monitor.ts` into `apps/scheduler/index.ts`, run as a separate process.

---

## Decision 004 — Priority as Integer 1–10

**Date**: Day 1
**Status**: Accepted

### Context
How should job priority be represented?

**Options**: Integer scale, float, enum (LOW/MEDIUM/HIGH/CRITICAL), timestamp-based

### Decision
Integer 1–10 where 1 = highest priority.

### Reasoning
- Intuitive for a UI slider
- Simple ORDER BY clause: `ORDER BY priority ASC`
- Granular enough for the demo (10 distinct levels)
- Easy to explain verbally: "lower number = runs sooner"

### Trade-offs
- **Lost**: Easy insertion between priority levels (inserting between 1 and 2 requires re-numbering or switching to floats)
- **Gained**: Human-readable, no enum mapping, simple SQL

---

## Decision 005 — Fixed Retry Count (No Exponential Backoff)

**Date**: Day 1
**Status**: Accepted

### Context
When a job fails, how long before it's retried?

### Decision
Immediate re-queue. On failure, job goes back to QUEUED immediately (no delay).

### Reasoning
- Simpler to implement and explain
- For the demo, fast retries make the behavior more visible
- The assessment asks for retry mechanism, not specifically backoff

### Trade-offs
- **Lost**: Protection against thundering herd on transient failures
- **Gained**: Visible, immediate retry behavior in the demo

### Upgrade Path
Add `retry_after TIMESTAMPTZ` column. Scheduler filters: `WHERE status='QUEUED' AND retry_after <= NOW()`. Set `retry_after = NOW() + (attempt^2 * base_delay_seconds)`.

---

## Decision 006 — Simulated Workers (setTimeout, Not Real Compute)

**Date**: Day 1
**Status**: Accepted

### Context
Workers need to "execute" jobs. Should they do real computation?

### Decision
Simulate execution with `setTimeout(payload.duration)`. The job payload includes a `duration` field (milliseconds) that the worker reads.

### Reasoning
- Assessment is about the scheduling/orchestration system, not the compute
- Real compute would make the demo non-deterministic and hard to control
- `payload.duration` lets us control exactly how long jobs take in the demo

---

## Decision 007 — No Authentication

**Date**: Day 1
**Status**: Accepted (Assessment Scope)

### Context
Should workers and the dashboard require authentication?

### Decision
No authentication for assessment scope.

### Production Plan
- Workers: API key in Authorization header, validated server-side
- Dashboard: JWT / session auth
- Separate worker credentials per worker name/group
