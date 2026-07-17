import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// OAuth 2.0 Authorization Server Metadata (RFC 8414)
// Proxied here for discovery convenience — the actual AS is Auth0.
// Claude.ai will use these endpoints to initiate the auth code + PKCE flow for Sarah.
export function GET() {
  const domain = process.env.AUTH0_DOMAIN;
  const metadata = {
    issuer: `https://${domain}/`,
    authorization_endpoint: `https://${domain}/authorize`,
    token_endpoint: `https://${domain}/oauth/token`,
    jwks_uri: `https://${domain}/.well-known/jwks.json`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],

  };

  return NextResponse.json(metadata, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}
