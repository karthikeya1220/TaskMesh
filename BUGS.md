# BUGS.md
# Bug Tracker & Known Gotchas

> Log bugs here as you hit them. This becomes your debugging database.
> Pre-filled with common issues for this stack.

---

## Known Gotchas (Pre-filled)

---

### Prisma Client Multiple Instances in Next.js Dev

**Symptom**: Warning: "There are already 10 instances of Prisma Client actively running."

**Cause**: Next.js hot-reload creates a new module instance on every file change. Prisma client is re-instantiated each time.

**Fix**: Use the singleton pattern in `lib/db.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

---

### Scheduler Runs Twice (Double Assignment)

**Symptom**: Jobs get assigned to workers, but the scheduler also tries to re-assign them moments later.

**Cause**: `instrumentation.ts` runs twice in Next.js dev mode (once for edge runtime, once for Node.js runtime).

**Fix**: Guard the `register()` function:
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only start in Node.js runtime, not edge
    const { startScheduler } = await import('./lib/scheduler')
    startScheduler()
  }
}
```

---

### Jobs Stuck in RUNNING After Server Restart

**Symptom**: After restarting the dev server, some jobs show status=RUNNING but no worker is processing them.

**Cause**: On restart, the workers are gone (they were in-process or their connections dropped) but the DB still shows RUNNING.

**Fix**: Add a startup cleanup in `instrumentation.ts`:
```typescript
// On startup, reset any RUNNING jobs with no active worker back to QUEUED
await prisma.job.updateMany({
  where: { status: 'RUNNING', worker: { status: 'OFFLINE' } },
  data: { status: 'QUEUED', workerId: null }
})
```

Or: just run the heartbeat monitor immediately on startup before the scheduler starts.

---

### Worker Poll Returns Old/Wrong Job

**Symptom**: Worker polls and gets a job that's already completed, or a job assigned to a different worker.

**Cause**: Poll query is not filtering correctly.

**Fix**: The poll query must be:
```typescript
await prisma.job.findFirst({
  where: {
    workerId: params.id,  // ← must match this specific worker
    status: 'RUNNING'     // ← must be in RUNNING state
  }
})
```
Not just `status: 'RUNNING'` without the workerId filter.

---

### React useEffect Interval Keeps Old State

**Symptom**: Browser worker simulator shows stale job/status data; UI doesn't update after state changes.

**Cause**: The interval callback captures the initial state via closure.

**Fix**: Use a ref or the functional updater pattern:
```typescript
const workerRef = useRef(workers)
workerRef.current = workers

useEffect(() => {
  const id = setInterval(() => {
    // Use workerRef.current instead of workers
    pollForJobs(workerRef.current)
  }, 2000)
  return () => clearInterval(id)
}, []) // empty deps — interval only created once
```

---

### Prisma DateTime Comparison for Heartbeat

**Symptom**: `checkDeadWorkers` is marking all workers as dead immediately.

**Cause**: Incorrect datetime comparison syntax in Prisma.

**Fix**: Use Prisma's `lt` operator with a JS Date object:
```typescript
const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS)

await prisma.worker.findMany({
  where: {
    lastHeartbeat: { lt: cutoff },
    status: { not: 'OFFLINE' }
  }
})
```
NOT: `lastHeartbeat < new Date(...)` — that's SQL syntax, not Prisma.

---

### Next.js API Route: Cannot Read Body Twice

**Symptom**: `req.json()` throws or returns empty after first call.

**Cause**: The Request body stream can only be consumed once.

**Fix**: Call `req.json()` once and store it:
```typescript
export async function POST(req: NextRequest) {
  const body = await req.json()  // ← call ONCE
  const { name, priority } = body  // destructure from stored body
}
```

---

## Active Bugs

_(Log current bugs here — move to Resolved when fixed)_

| # | Description | Status | Notes |
|---|-------------|--------|-------|
|   |             |        |       |

---

## Resolved Bugs

_(Move bugs here when fixed — keep the fix documented)_

| # | Description | Fix Applied |
|---|-------------|-------------|
|   |             |             |
