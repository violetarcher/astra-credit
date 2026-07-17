import { NextResponse } from 'next/server';
import { fgaClient } from '@/lib/fga';

export async function POST() {
  const toDelete: { user: string; relation: string; object: string }[] = [];
  let continuationToken: string | undefined;

  // Page through all tuples
  do {
    const res = await fgaClient.read(
      {},
      continuationToken ? { continuationToken } : {}
    );
    for (const t of res.tuples ?? []) {
      toDelete.push({ user: t.key.user, relation: t.key.relation, object: t.key.object });
    }
    continuationToken = res.continuation_token;
  } while (continuationToken);

  // Delete in batches of 10 (FGA write limit)
  for (let i = 0; i < toDelete.length; i += 10) {
    await fgaClient.write({ deletes: toDelete.slice(i, i + 10) });
  }

  return NextResponse.json({ ok: true, deleted: toDelete.length });
}
