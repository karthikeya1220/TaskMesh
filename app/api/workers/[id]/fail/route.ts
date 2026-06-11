import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { JobStatus, WorkerStatus } from '@prisma/client';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { job_id, error_message } = body;

    if (!job_id) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 });
    }

    const job = await prisma.job.findUnique({ where: { id: job_id } });
    
    if (!job || job.worker_id !== params.id) {
      return NextResponse.json({ error: 'Job not found or not assigned to this worker' }, { status: 400 });
    }

    const nextAttempt = job.attempt + 1;
    const isDead = nextAttempt >= job.max_attempts;
    const nextStatus = isDead ? JobStatus.DEAD : JobStatus.QUEUED;
    const eventName = isDead ? 'DEAD' : 'RETRY';

    const [updatedJob, worker] = await prisma.$transaction([
      prisma.job.update({
        where: { id: job_id },
        data: {
          status: nextStatus,
          error: error_message || 'Job failed',
          attempt: nextAttempt,
          worker_id: null,
          logs: {
            create: [
              {
                event: 'FAILED',
                worker_id: params.id,
                message: error_message || 'Job failed',
              },
              {
                event: eventName,
                worker_id: params.id,
                message: isDead ? 'Max attempts reached, job is dead' : `Re-queued for attempt ${nextAttempt + 1}`,
              }
            ],
          },
        },
      }),
      prisma.worker.update({
        where: { id: params.id },
        data: {
          status: WorkerStatus.IDLE,
          current_job_id: null,
          last_heartbeat: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ success: true, job: updatedJob });
  } catch (error) {
    console.error('Failed to report job failure', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
