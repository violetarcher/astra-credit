import { NextRequest, NextResponse } from 'next/server';
import { fgaClient } from '@/lib/fga';

export async function GET() {
  const tuples: Array<{
    user: string;
    relation: string;
    object: string;
    condition: { name: string; context?: Record<string, unknown> } | null;
  }> = [];
  let continuationToken: string | undefined;

  do {
    const res = await fgaClient.read({}, continuationToken ? { continuationToken } : {});
    for (const t of res.tuples ?? []) {
      tuples.push({
        user: t.key.user,
        relation: t.key.relation,
        object: t.key.object,
        condition: t.key.condition
          ? { name: t.key.condition.name, context: t.key.condition.context as Record<string, unknown> | undefined }
          : null,
      });
    }
    continuationToken = res.continuation_token;
  } while (continuationToken);

  tuples.sort((a, b) =>
    a.object.localeCompare(b.object) ||
    a.relation.localeCompare(b.relation) ||
    a.user.localeCompare(b.user)
  );

  return NextResponse.json({ tuples });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user, relation, object: obj, condition } = body as {
    user: string;
    relation: string;
    object: string;
    condition?: { name: string; context?: Record<string, unknown> };
  };

  if (!user?.trim() || !relation?.trim() || !obj?.trim()) {
    return NextResponse.json({ error: 'user, relation, and object are required' }, { status: 400 });
  }

  try {
    await fgaClient.write({
      writes: [
        {
          user: user.trim(),
          relation: relation.trim(),
          object: obj.trim(),
          ...(condition?.name
            ? { condition: { name: condition.name, context: condition.context ?? {} } }
            : {}),
        },
      ],
    });
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? String(e);
    if (msg.includes('already exists')) {
      return NextResponse.json({ error: 'Tuple already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { user, relation, object: obj } = body as {
    user: string;
    relation: string;
    object: string;
  };

  if (!user?.trim() || !relation?.trim() || !obj?.trim()) {
    return NextResponse.json({ error: 'user, relation, and object are required' }, { status: 400 });
  }

  try {
    await fgaClient.write({
      deletes: [{ user: user.trim(), relation: relation.trim(), object: obj.trim() }],
    });
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
