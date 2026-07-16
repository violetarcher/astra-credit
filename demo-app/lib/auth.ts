import { createRemoteJWKSet, jwtVerify } from 'jose';

const getJWKS = () =>
  createRemoteJWKSet(
    new URL(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`)
  );

export async function validateToken(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, getJWKS(), {
    audience: process.env.AUTH0_AUDIENCE,
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  });

  if (!payload.sub) throw new Error('Missing sub claim in token');
  return { sub: payload.sub };
}

// Maps an Auth0 user sub to a stable FGA user ID.
// Demo only: Sarah is the sole user. Production would use a DB lookup.
export function getFgaUserId(authSub: string): string {
  if (authSub === process.env.SARAH_USER_ID) return 'sarah';
  throw new Error(`No FGA mapping for user: ${authSub}`);
}
