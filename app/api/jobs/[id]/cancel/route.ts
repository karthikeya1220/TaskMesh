import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { JobStatus } from '@prisma/client';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: params.id },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status !== JobStatus.PENDING && job.status !== JobStatus.QUEUED) {
      return NextResponse.json({ error: 'Only PENDING or QUEUED jobs can be cancelled' }, { status: 400 });
    }

    const updatedJob = await prisma.job.update({
      where: { id: params.id },
      data: {
        status: JobStatus.DEAD, // Assuming cancel puts it in DEAD or FAILED state, though requirements say only if PENDING or QUEUED
        logs: {
          create: {
            event: 'DEAD', // Or CANCELLED if we add it, but DEAD is in schema
            message: 'Job was manually cancelled',
          },
        },
      },
    });

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error('Failed to cancel job', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
