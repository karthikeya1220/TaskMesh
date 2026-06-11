# JobFlow Architecture

This document describes the high-level architecture and system design of JobFlow.

## System Components

### 1. Database (PostgreSQL & Prisma)
The PostgreSQL database serves as the single source of truth for the entire distributed system.
- **`Job` Model**: Tracks job definitions, payloads, statuses (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `DEAD`), attempts, and results.
- **`Worker` Model**: Tracks registered workers, their current status (`IDLE`, `BUSY`, `OFFLINE`), and their last heartbeat timestamp.
- **`ExecutionLog` Model**: Provides an append-only audit trail for every state transition a job goes through (e.g., `SUBMITTED`, `ASSIGNED`, `FAILED`, `RETRY`).

### 2. The Scheduler (Background Task)
The Scheduler runs as a background process within the Next.js server, initialized via `instrumentation.ts`. 
- **Frequency**: Runs every 5 seconds.
- **Responsibility**: It scans for jobs in the `QUEUED` state and workers in the `IDLE` state. It assigns the highest priority jobs to available workers by atomically updating the job to `RUNNING` and the worker to `BUSY` within a database transaction.

### 3. The Heartbeat Monitor (Background Task)
Also initialized via `instrumentation.ts`, the Heartbeat monitor ensures system resiliency.
- **Frequency**: Runs every 15 seconds.
- **Responsibility**: It scans for workers whose `last_heartbeat` was more than 30 seconds ago. These workers are deemed dead and marked `OFFLINE`. Any jobs they were currently executing are transitioned from `RUNNING` to `FAILED`, and subsequently evaluated for retry.

### 4. REST API Endpoints
The Next.js `/app/api` routes act as the communication layer for workers and the UI.
- `/api/jobs`: Create new jobs and list all jobs.
- `/api/workers/register`: Allows a worker to register itself and receive a UUID.
- `/api/workers/[id]/poll`: Workers call this to fetch their assigned jobs.
- `/api/workers/[id]/heartbeat`: Workers call this every 10s to prove they are alive.
- `/api/workers/[id]/complete` & `/fail`: Workers report the outcome of a job.

### 5. Worker Simulators
Workers can be simulated either directly in the browser via the UI's Worker Simulator component, or via the `scripts/simulate-worker.ts` CLI script. Both interact with the exact same REST API layer.

## Design Tradeoffs

1. **Database as a Queue**
   - *Decision*: We used PostgreSQL to handle queueing rather than Redis or RabbitMQ.
   - *Tradeoff*: While this simplifies the operational overhead (only one data store needed), it is not optimized for massive throughput. Long polling or Pub/Sub via Redis would be faster for real-world horizontal scaling, but polling Postgres is sufficient for this scope.

2. **Background Processes in Next.js**
   - *Decision*: Next.js `instrumentation.ts` was used to spawn `setInterval` workers on the main node process.
   - *Tradeoff*: In a multi-instance (serverless or horizontally scaled container) deployment, this would cause multiple schedulers to run simultaneously. Prisma transactions mitigate race conditions, but a dedicated orchestrator service (e.g. Temporal, Celery) would be superior for a highly distributed production environment.

3. **Optimistic UI Updates**
   - *Decision*: Job submissions artificially inject the job into the local state while waiting for the background refetch.
   - *Tradeoff*: Reduces perceived latency drastically, but if the API call truly fails (beyond network timeout), the UI might briefly show a job that never made it to the database before the error boundary or toast notification corrects it.
