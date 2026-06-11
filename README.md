# JobFlow: Distributed Execution Dashboard

JobFlow is a lightweight, distributed job execution platform built with Next.js 14, Prisma, and PostgreSQL. It demonstrates core distributed systems concepts including job queueing, worker heartbeats, failure recovery, and real-time dashboard monitoring.

## Features
- **Job Queueing & Priority**: Submit jobs with configurable payload, priority, and max retry attempts.
- **Worker Simulation**: Connect multiple simulated workers (via browser or CLI) that poll for jobs and execute them.
- **Heartbeat Monitoring**: A background interval tracks worker health. Dead workers are marked offline and their active jobs are re-queued.
- **Failure Recovery**: Jobs that randomly fail or whose workers crash are automatically returned to the queue and retried up to their max attempts.
- **Real-Time Dashboard**: A modern UI designed with Stitch to monitor active workers, running jobs, and execution logs.

## Setup Instructions

### 1. Prerequisites
- Node.js 18+
- Docker (for PostgreSQL database)

### 2. Database Setup
Start a local PostgreSQL instance via Docker:
```bash
docker run --name jobdb -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=jobplatform -p 5432:5432 -d postgres:15
```

### 3. Environment Config
Create a `.env` file in the root directory and add the connection string:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jobplatform?schema=public"
```

### 4. Install Dependencies & Initialize Database
```bash
npm install
npx prisma migrate dev --name init
npx prisma generate
```

## Running the Application

### 1. Start the Next.js Server
This will start the UI on port 3000 (or 3001) and also boot up the background scheduler and heartbeat monitor via Next.js instrumentation hooks.
```bash
npm run dev
```
Navigate to `http://localhost:3000` to view the dashboard.

### 2. Run the CLI Worker Simulator
To see jobs getting processed, start a worker. You can do this directly from the "Workers" tab in the UI, or by running the CLI script:
```bash
npx tsx scripts/simulate-worker.ts --name CLIWorker-1
```

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Design System**: Custom design tokens from Stitch
