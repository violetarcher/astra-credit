import { OpenFgaClient, CredentialsMethod } from '@openfga/sdk';
import { log } from './fga-logger';

export const fgaClient = new OpenFgaClient({
  apiUrl: process.env.FGA_API_URL!,
  storeId: process.env.FGA_STORE_ID!,
  credentials: {
    method: CredentialsMethod.ClientCredentials,
    config: {
      apiTokenIssuer: process.env.FGA_API_TOKEN_ISSUER!,
      apiAudience: process.env.FGA_API_AUDIENCE!,
      clientId: process.env.FGA_CLIENT_ID!,
      clientSecret: process.env.FGA_CLIENT_SECRET!,
    },
  },
});

export async function checkPermission(
  user: string,
  relation: string,
  object: string
): Promise<boolean> {
  const { allowed } = await fgaClient.check({
    user,
    relation,
    object,
    context: { current_time: new Date().toISOString() },
  });
  const result = allowed ?? false;
  log({ op: 'check', user, relation, object, result: result ? 'allowed' : 'denied' });
  return result;
}

export async function ensureOwnerTuple(fgaUserId: string): Promise<void> {
  const { tuples } = await fgaClient.read({
    user: `user:${fgaUserId}`,
    relation: 'owner',
    object: `credit_profile:${fgaUserId}`,
  });

  if (tuples.length === 0) {
    try {
      await fgaClient.write({
        writes: [{ user: `user:${fgaUserId}`, relation: 'owner', object: `credit_profile:${fgaUserId}` }],
      });
      log({ op: 'ensure', user: `user:${fgaUserId}`, relation: 'owner', object: `credit_profile:${fgaUserId}`, result: 'ok' });
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? '';
      if (!msg.includes('already exists')) throw e;
    }
  }
}

export async function writeConsentTuple(fgaUserId: string): Promise<void> {
  await fgaClient.write({
    writes: [
      {
        user: 'agent:claude',
        relation: 'consented_agent',
        object: `credit_profile:${fgaUserId}`,
        condition: {
          name: 'time_bounded_consent',
          context: { granted_at: new Date().toISOString() },
        },
      },
    ],
  });
  log({ op: 'write', user: 'agent:claude', relation: 'consented_agent', object: `credit_profile:${fgaUserId}`, result: 'ok' });
}
