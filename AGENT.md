# AGENT.md
# AI Usage During Assessment

---

## AI Tools Used

| Tool | Role |
|------|------|
| Claude (Anthropic) | Architecture planning, code generation, documentation |
| GitHub Copilot (if used) | Inline autocomplete during coding |

---

## Development Approach

### Phase 1 — Architecture First

Before writing any code, I used Claude to help design the overall system architecture and make key decisions:

- Database schema design (jobs, workers, job_logs tables)
- API contract definition (all routes, request/response shapes)
- Scheduler algorithm design (greedy assignment, pull vs push)
- Failure handling strategy (heartbeat timeout, retry logic)

I drove these decisions by giving Claude the problem requirements and asking it to evaluate trade-offs. I made the final calls on each decision (e.g., PostgreSQL over Redis, pull-based workers over push).

### Phase 2 — Scaffolding with AI

Used AI to generate:
- Prisma schema from my data model spec
- API route boilerplate (Next.js route handlers)
- Scheduler and heartbeat monitor logic
- Worker simulator script structure

I reviewed every generated file and modified it to fit the architecture before accepting it.

### Phase 3 — Frontend with AI

Used AI to generate:
- React component structure (tables, forms, badges)
- Polling logic with useEffect
- Tailwind styling

I directed the visual design and made decisions about layout, information hierarchy, and UX flows.

---

## Key Prompts Used

### System Design Prompt
```
I'm building a distributed job execution system for an assessment.
Requirements: job submission, worker registration, scheduling, retry 
policies, heartbeat monitoring, failure recovery, priority queuing.

Tech: Next.js + TypeScript + PostgreSQL.

Design me a minimal architecture that:
1. Has no external dependencies (no Redis, no RabbitMQ)
2. Can be explained in a 15-minute demo video
3. Demonstrates all the required concepts clearly

Focus on correctness and clarity over production scalability.
Give me the database schema, API routes, and a description of the 
scheduler loop.
```

### Prisma Schema Prompt
```
Generate a Prisma schema for this system:

[pasted the schema from PROJECT_CONTEXT.md]

Include:
- Proper enums for status fields
- Indexes for the scheduler query (status + priority + created_at)
- A JobLog table for the audit trail
- Cascade delete rules where appropriate
```

### Scheduler Implementation Prompt
```
Implement the scheduler for my job execution system.

Context:
- PostgreSQL database via Prisma
- Jobs table with status (QUEUED/RUNNING/COMPLETED/FAILED/DEAD), 
  priority (1-10, lower = higher), worker_id
- Workers table with status (IDLE/BUSY/OFFLINE), last_heartbeat

Write:
1. assignJobs() - assigns QUEUED jobs to IDLE workers, ordered by priority
2. checkDeadWorkers() - finds workers with last_heartbeat > 30s, 
   marks OFFLINE, reassigns their jobs to QUEUED with attempt++
3. startScheduler() and startHeartbeatMonitor() - setInterval wrappers

Handle the retry/dead logic: if attempt >= max_attempts, set DEAD not QUEUED.
```

### Worker Simulator Prompt
```
Write a CLI worker simulator in TypeScript that:
1. Accepts --name flag
2. Registers with POST /api/workers/register
3. Polls GET /api/workers/:id/poll every 2s
4. If job found: setTimeout(payload.duration), then POST complete or fail
5. Sends POST /api/workers/:id/heartbeat every 10s
6. Handles SIGINT gracefully (DELETE /api/workers/:id before exit)
7. Logs all actions with timestamps to console

Base URL: http://localhost:3000
```

---

## What I Understand About the Code I Generated

### Scheduler Logic
The scheduler runs every 5 seconds. It fetches IDLE workers and QUEUED jobs, then pairs them. The SQL ordering (`ORDER BY priority ASC, created_at ASC`) is what implements priority queuing. This is a greedy algorithm — it assigns greedily without look-ahead. The trade-off is it's simple and correct for this scale.

### Heartbeat Monitor
Uses a time comparison: `last_heartbeat < NOW() - interval`. Any worker that hasn't reported in 30+ seconds is considered dead. The monitor then "orphans" their running jobs back to QUEUED state. This is the core of crash recovery.

### Retry Logic
Every job has `attempt` (current count) and `maxAttempts` (ceiling). On each failure, `attempt` is incremented. If `attempt < maxAttempts`, the job goes back to QUEUED for the scheduler to pick up. When `attempt >= maxAttempts`, the job is permanently marked DEAD. This is a simple fixed-retry policy (no exponential backoff — adding that would just require `scheduled_at = NOW() + attempt^2 * base_delay`).

### Priority Queuing
Implemented at the database query level, not in application memory. This means priority is respected even across server restarts. The integer 1–10 model is simple and human-understandable. Production systems might use decimal priorities for insertion between existing priority levels.

### Pull-Based Workers
Workers call a poll endpoint instead of being pushed jobs via WebSocket/SSE. This is a conscious design decision: it's simpler, stateless, and works across network boundaries without persistent connections. The cost is poll latency (~2s), which is irrelevant for this use case.

---

## What AI Did Not Decide

These were my own design decisions:
- Using PostgreSQL instead of Redis (chose simplicity over performance for demo scale)
- No external message broker (keeps deployment to a single service)
- Pull-based workers over push (simpler, stateless, demostration-friendly)
- Instrumentation.ts for scheduler startup (leverages Next.js lifecycle correctly)
- Simulating workers in-browser (better UX for demo; evaluator doesn't need extra terminal)
- Priority as integer 1-10 (intuitive for the UI; easy to explain)
