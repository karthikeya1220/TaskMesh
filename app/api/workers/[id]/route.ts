import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { JobStatus, WorkerStatus } from '@prisma/client';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const worker = await prisma.worker.findUnique({
      where: { id: params.id },
      include: { jobs: { where: { status: JobStatus.RUNNING } } }
    });

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    const transactions: any[] = [];

    transactions.push(
      prisma.worker.update({
        where: { id: params.id },
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
                message: 'Worker deregistered, job returned to queue',
              }
            }
          }
        })
      );
    }

    await prisma.$transaction(transactions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to deregister worker', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
