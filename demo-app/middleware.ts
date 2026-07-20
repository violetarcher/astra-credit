import type { NextRequest } from 'next/server';
import { auth0 } from './lib/auth0';

export async function middleware(request: NextRequest) {
  // Skip auth middleware when not configured (local dev without credentials).
  // In production (Vercel), AUTH0_CLIENT_ID and AUTH0_SECRET must be set.
  if (!process.env.AUTH0_CLIENT_ID || !process.env.AUTH0_SECRET) {
    return;
  }
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)',
  ],
};
