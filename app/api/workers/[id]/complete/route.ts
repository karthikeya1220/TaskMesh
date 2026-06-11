import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { JobStatus, WorkerStatus } from '@prisma/client';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { job_id, result } = body;

    if (!job_id) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 });
    }

    const job = await prisma.job.findUnique({ where: { id: job_id } });
    
    if (!job || job.worker_id !== params.id) {
      return NextResponse.json({ error: 'Job not found or not assigned to this worker' }, { status: 400 });
    }

    const [updatedJob, worker] = await prisma.$transaction([
      prisma.job.update({
        where: { id: job_id },
        data: {
          status: JobStatus.COMPLETED,
          result: result || {},
          completed_at: new Date(),
          logs: {
            create: {
              event: 'COMPLETED',
              worker_id: params.id,
              message: 'Job completed successfully',
            },
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
    console.error('Failed to complete job', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
