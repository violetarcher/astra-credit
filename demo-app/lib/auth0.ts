import { Auth0Client } from '@auth0/nextjs-auth0/server';

// Used for /demo panel authentication.
// Requires a Regular Web Application in Auth0 (separate from the CIBA client).
// Env vars: AUTH0_DOMAIN (shared), AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET
export const auth0 = new Auth0Client();
