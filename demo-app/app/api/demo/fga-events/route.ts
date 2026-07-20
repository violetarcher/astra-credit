import { NextRequest, NextResponse } from 'next/server';
import { getLog, clearLog } from '@/lib/fga-logger';

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get('since');
  const events = getLog(since ? Number(since) : undefined);
  return NextResponse.json({ events, ts: Date.now() });
}

export async function DELETE() {
  clearLog();
  return NextResponse.json({ ok: true });
}
