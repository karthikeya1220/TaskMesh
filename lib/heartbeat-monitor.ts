import { prisma } from './db';
import { JobStatus, WorkerStatus } from '@prisma/client';

export async function checkDeadWorkers() {
  try {
    const timeoutMs = process.env.HEARTBEAT_TIMEOUT_MS ? parseInt(process.env.HEARTBEAT_TIMEOUT_MS, 10) : 30000;
    const cutoffDate = new Date(Date.now() - timeoutMs);

    const deadWorkers = await prisma.worker.findMany({
      where: {
        status: { not: WorkerStatus.OFFLINE },
        last_heartbeat: { lt: cutoffDate },
      },
      include: {
        jobs: {
          where: { status: JobStatus.RUNNING },
        },
      },
    });

    if (deadWorkers.length === 0) return;

    console.log(`Found ${deadWorkers.length} dead worker(s). Recovering...`);

    for (const worker of deadWorkers) {
      const transactions: any[] = [];

      transactions.push(
        prisma.worker.update({
          where: { id: worker.id },
          data: {
            status: WorkerStatus.OFFLINE,
            current_job_id: null,
          },
        })
      );

      for (const job of worker.jobs) {
        transactions.push(
          prisma.job.update({
            where: { id: job.id },
            data: {
              status: JobStatus.QUEUED,
              worker_id: null,
              attempt: job.attempt + 1,
              logs: {
                create: {
                  event: 'RETRY',
                  message: `Worker ${worker.name} timed out. Job returned to queue.`,
                },
              },
            },
          })
        );
      }

      await prisma.$transaction(transactions);
    }
  } catch (error) {
    console.error('Error in checkDeadWorkers:', error);
  }
}

let isMonitorRunning = false;
let monitorInterval: NodeJS.Timeout;

export function startHeartbeatMonitor() {
  if (isMonitorRunning) return;
  isMonitorRunning = true;
  
  console.log('Starting Heartbeat Monitor (interval: 15000ms)');
  monitorInterval = setInterval(checkDeadWorkers, 15000);
}
