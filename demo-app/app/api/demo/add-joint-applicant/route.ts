import { NextRequest, NextResponse } from 'next/server';
import { fgaClient } from '@/lib/fga';

export async function POST(req: NextRequest) {
  const { fgaUserId } = await req.json();
  if (!fgaUserId || typeof fgaUserId !== 'string') {
    return NextResponse.json({ error: 'fgaUserId required' }, { status: 400 });
  }

  await fgaClient.write({
    writes: [
      {
        user: `user:${fgaUserId}`,
        relation: 'applicant',
        object: 'mortgage_application:joint-2026',
      },
    ],
  });

  return NextResponse.json({
    ok: true,
    tuple: `user:${fgaUserId} → applicant → mortgage_application:joint-2026`,
  });
}
