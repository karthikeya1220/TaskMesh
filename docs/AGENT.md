# AI Usage Log (Agent Walkthrough)

This document serves as the required log of how Antigravity (the agentic AI coding assistant) was utilized to construct the JobFlow Distributed Execution Dashboard. 

## Project Execution Strategy
The project was divided into 7 distinct phases, guided by the user's requirement to build the system systematically from the ground up:

1. **Phase 0 & 1**: Setup and Database Schema.
   - Built a robust PostgreSQL schema using Prisma.
   - Designed models (`Job`, `Worker`, `ExecutionLog`) to track the complete state machine of a distributed job.
2. **Phase 2 & 3**: API Routes & Background Tasks.
   - Implemented standard REST endpoints for UI and Worker communication.
   - Leveraged Next.js 14 `instrumentation.ts` to spawn background intervals (`scheduler` and `heartbeat-monitor`) that handled queue assignment and dead-worker recovery.
3. **Phase 4**: Worker Simulation & API Integration.
   - Built an interactive, in-browser simulated worker component using React hooks.
   - Implemented a standalone Node CLI worker (`scripts/simulate-worker.ts`) to demonstrate real external client interaction.
4. **Phase 5**: Frontend Construction.
   - Used downloaded design tokens (Tailwind overrides, customized layouts).
   - Designed responsive dashboard components, ensuring the custom UI requirements were met.
5. **Phase 6**: Polish & Edge Cases.
   - Designed and implemented a lightweight, context-driven `ToastProvider` for real-time notifications.
   - Programmed optimistic UI updates to ensure instant feedback on job submissions.
   - Conducted rigorous end-to-end testing of the retry flow and heartbeat timeout system using both the browser simulator and the CLI script.
6. **Phase 7**: Documentation.
   - Synthesized the system architecture, design tradeoffs, and technical stack details into the `README.md` and `Architecture.md` files.

## Agent Workflow & Tooling
The AI extensively used the following tools and capabilities:
- `write_to_file` / `replace_file_content`: To construct components and iteratively patch backend logic.
- `run_command`: To execute database migrations (`npx prisma migrate`), run linting, and spin up background processes (`sleep`, curl API checks).
- `manage_task`: To monitor, observe, and manage the execution of background testing scripts (`simulate-worker.ts`) while testing fault tolerance.
- Artifacts System: To meticulously track the implementation plan (`implementation_plan.md`) and the task checklist (`task.md`), ensuring that every requirement was met sequentially and successfully.

## Notable Decisions Made by the Agent
1. **Next.js 14 App Router Resolution**: Migrated cleanly from an initial dual `src/app` vs `app` setup to a consolidated root `app` folder to prevent Next.js module resolution conflicts.
2. **Prisma Version Management**: Actively downgraded Prisma to v5 after detecting initialization bugs with Prisma v7 on the target execution environment.
3. **Transaction Safety**: Opted to wrap job-assignment logic in atomic Prisma transactions to ensure that even if multiple workers polled concurrently, a job would strictly be assigned to one worker.
4. **Testing Realism**: Refactored the `simulate-worker.ts` script to properly read the `job.payload.fail` flag to simulate deterministic errors, ensuring the retry loop and dead-letter logic could be actively verified by the AI.
