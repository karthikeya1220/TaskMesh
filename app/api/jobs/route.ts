import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { JobStatus } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, payload = {}, priority = 5, max_attempts = 3 } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const job = await prisma.job.create({
      data: {
        name,
        payload,
        priority,
        max_attempts,
        status: JobStatus.QUEUED,
        logs: {
          create: {
            event: 'SUBMITTED',
            message: 'Job submitted to queue',
          },
        },
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error('Failed to create job', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as JobStatus | null;
    const priority = searchParams.get('priority');

    const where: any = {};
    if (status && Object.values(JobStatus).includes(status)) {
      where.status = status;
    }
    if (priority && !isNaN(Number(priority))) {
      where.priority = Number(priority);
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        worker: {
          select: { name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Failed to fetch jobs', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
