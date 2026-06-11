import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { JobStatus, WorkerStatus } from '@prisma/client';

export async function GET() {
  try {
    const [
      totalJobs,
      pendingJobs,
      queuedJobs,
      runningJobs,
      completedJobs,
      failedJobs,
      deadJobs,
      activeWorkers,
      busyWorkers,
      offlineWorkers,
    ] = await Promise.all([
      prisma.job.count(),
      prisma.job.count({ where: { status: JobStatus.PENDING } }),
      prisma.job.count({ where: { status: JobStatus.QUEUED } }),
      prisma.job.count({ where: { status: JobStatus.RUNNING } }),
      prisma.job.count({ where: { status: JobStatus.COMPLETED } }),
      prisma.job.count({ where: { status: JobStatus.FAILED } }),
      prisma.job.count({ where: { status: JobStatus.DEAD } }),
      prisma.worker.count({ where: { status: { not: WorkerStatus.OFFLINE } } }),
      prisma.worker.count({ where: { status: WorkerStatus.BUSY } }),
      prisma.worker.count({ where: { status: WorkerStatus.OFFLINE } }),
    ]);

    return NextResponse.json({
      jobs: {
        total: totalJobs,
        pending: pendingJobs,
        queued: queuedJobs,
        running: runningJobs,
        completed: completedJobs,
        failed: failedJobs,
        dead: deadJobs,
      },
      workers: {
        active: activeWorkers,
        busy: busyWorkers,
        offline: offlineWorkers,
      }
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
