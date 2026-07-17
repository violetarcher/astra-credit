import { createRemoteJWKSet, jwtVerify } from 'jose';

const getJWKS = () =>
  createRemoteJWKSet(
    new URL(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`)
  );

const EMAIL_CLAIM = 'https://test.app.com/email';

export async function validateToken(token: string): Promise<{ sub: string; fgaUserId: string }> {
  const { payload } = await jwtVerify(token, getJWKS(), {
    audience: process.env.AUTH0_AUDIENCE,
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  });

  if (!payload.sub) throw new Error('Missing sub claim in token');

  const email = payload[EMAIL_CLAIM] as string | undefined;
  const fgaUserId = deriveFgaUserId(email ?? payload.sub);

  return { sub: payload.sub, fgaUserId };
}

// violet.archer@okta.com → violet.archer
// Falls back to sanitized sub (auth0|abc123 → auth0-abc123) if no email claim.
export function deriveFgaUserId(identity: string): string {
  const localPart = identity.includes('@') ? identity.split('@')[0] : identity;
  return localPart.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
}

// violet.archer → Violet Archer
export function getDisplayName(fgaUserId: string): string {
  return fgaUserId
    .split(/[._-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}
