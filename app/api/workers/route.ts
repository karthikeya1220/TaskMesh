import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { WorkerStatus } from '@prisma/client';

export async function GET(req: Request) {
  try {
    const workers = await prisma.worker.findMany({
      include: {
        jobs: {
          where: { status: 'RUNNING' },
          select: { name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(workers);
  } catch (error) {
    console.error('Failed to fetch workers', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
