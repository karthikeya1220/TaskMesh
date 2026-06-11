import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { WorkerStatus } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Worker name is required' }, { status: 400 });
    }

    const worker = await prisma.worker.create({
      data: {
        name,
        status: WorkerStatus.IDLE,
        last_heartbeat: new Date(),
      },
    });

    return NextResponse.json(worker, { status: 201 });
  } catch (error) {
    console.error('Failed to register worker', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
