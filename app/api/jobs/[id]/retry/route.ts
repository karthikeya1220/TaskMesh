import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { JobStatus } from '@prisma/client';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: params.id },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status !== JobStatus.FAILED && job.status !== JobStatus.DEAD) {
      return NextResponse.json({ error: 'Only FAILED or DEAD jobs can be retried' }, { status: 400 });
    }

    const updatedJob = await prisma.job.update({
      where: { id: params.id },
      data: {
        status: JobStatus.QUEUED,
        attempt: 0,
        logs: {
          create: {
            event: 'RETRY',
            message: 'Job was manually retried',
          },
        },
      },
    });

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error('Failed to retry job', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
