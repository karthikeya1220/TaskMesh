import { prisma } from './db';
import { JobStatus, WorkerStatus } from '@prisma/client';

export async function assignJobs() {
  try {
    const idleWorkers = await prisma.worker.findMany({
      where: { status: WorkerStatus.IDLE },
    });

    if (idleWorkers.length === 0) return;

    const queuedJobs = await prisma.job.findMany({
      where: { status: JobStatus.QUEUED },
      orderBy: [
        { priority: 'asc' },
        { created_at: 'asc' },
      ],
      take: idleWorkers.length,
    });

    if (queuedJobs.length === 0) return;

    for (let i = 0; i < queuedJobs.length; i++) {
      const job = queuedJobs[i];
      const worker = idleWorkers[i];

      await prisma.$transaction([
        prisma.job.update({
          where: { id: job.id },
          data: {
            status: JobStatus.RUNNING,
            worker_id: worker.id,
            started_at: new Date(),
            logs: {
              create: {
                event: 'ASSIGNED',
                worker_id: worker.id,
                message: `Job assigned to worker ${worker.name}`,
              },
            },
          },
        }),
        prisma.worker.update({
          where: { id: worker.id },
          data: {
            status: WorkerStatus.BUSY,
            current_job_id: job.id,
          },
        }),
      ]);
    }
  } catch (error) {
    console.error('Error in assignJobs:', error);
  }
}

let isSchedulerRunning = false;
let schedulerInterval: NodeJS.Timeout;

export function startScheduler() {
  if (isSchedulerRunning) return;
  isSchedulerRunning = true;
  
  const intervalMs = process.env.SCHEDULER_INTERVAL_MS ? parseInt(process.env.SCHEDULER_INTERVAL_MS, 10) : 5000;
  
  console.log(`Starting Scheduler (interval: ${intervalMs}ms)`);
  schedulerInterval = setInterval(assignJobs, intervalMs);
}
