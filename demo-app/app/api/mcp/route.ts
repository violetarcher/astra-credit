import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import { listTools, callTool } from '@/lib/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonRpc(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', result, id });
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', error: { code, message }, id });
}

function unauthorized() {
  return new NextResponse(null, {
    status: 401,
    headers: {
      'WWW-Authenticate': [
        'Bearer realm="AstraCredit"',
        `resource_metadata_url="${process.env.NEXT_PUBLIC_BASE_URL}/.well-known/oauth-protected-resource"`,
      ].join(', '),
    },
  });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return unauthorized();

  let userId: string;
  try {
    const claims = await validateToken(authHeader.slice(7));
    userId = claims.sub;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  let body: { jsonrpc?: string; method?: string; params?: unknown; id?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonRpcError(null, -32700, 'Parse error');
  }

  const { method, params, id } = body;

  switch (method) {
    case 'initialize':
      return jsonRpc(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'AstraCredit MCP', version: '1.0.0' },
      });

    case 'initialized':
      return new NextResponse(null, { status: 204 });

    case 'ping':
      return jsonRpc(id, {});

    case 'tools/list':
      return jsonRpc(id, { tools: listTools() });

    case 'tools/call': {
      const { name, arguments: args } = params as {
        name: string;
        arguments?: Record<string, unknown>;
      };

      try {
        const result = await callTool(name, args ?? {}, userId);
        return jsonRpc(id, result);
      } catch (e) {
        return jsonRpc(id, {
          content: [{ type: 'text', text: `Tool error: ${(e as Error).message}` }],
          isError: true,
        });
      }
    }

    default:
      return jsonRpcError(id, -32601, `Method not found: ${method}`);
  }
}

// GET is required by the MCP Streamable HTTP spec for SSE streams.
// Basic implementation returns 200 for health checks; full SSE not needed for this demo.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return unauthorized();

  try {
    await validateToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  return new NextResponse('data: {"type":"ping"}\n\n', {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
