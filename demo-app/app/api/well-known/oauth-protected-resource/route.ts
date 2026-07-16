import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// RFC 9728 — OAuth 2.0 Protected Resource Metadata
// Tells MCP clients (Claude.ai) which authorization server to use and what scopes are available.
export function GET() {
  const metadata = {
    resource: process.env.NEXT_PUBLIC_BASE_URL,
    authorization_servers: [`https://${process.env.AUTH0_DOMAIN}/`],
    bearer_methods_supported: ['header'],
    scopes_supported: [
      'read:credit_summary',
      'read:credit_report',
      'run:mortgage_model',
    ],
  };

  return NextResponse.json(metadata, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}
