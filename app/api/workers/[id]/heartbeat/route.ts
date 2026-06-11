import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const worker = await prisma.worker.findUnique({
      where: { id: params.id },
    });

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    const updatedWorker = await prisma.worker.update({
      where: { id: params.id },
      data: {
        last_heartbeat: new Date(),
      },
    });

    return NextResponse.json({ success: true, last_heartbeat: updatedWorker.last_heartbeat });
  } catch (error) {
    console.error('Failed to update heartbeat', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
