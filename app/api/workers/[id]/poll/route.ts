import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { JobStatus } from '@prisma/client';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const worker = await prisma.worker.findUnique({
      where: { id: params.id },
      include: {
        jobs: {
          where: { status: JobStatus.RUNNING },
        },
      },
    });

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    const job = worker.jobs.length > 0 ? worker.jobs[0] : null;

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Failed to poll worker job', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
