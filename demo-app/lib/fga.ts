import { OpenFgaClient, CredentialsMethod } from '@openfga/sdk';

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
    context: {
      current_time: new Date().toISOString(),
    },
  });
  return allowed ?? false;
}

// Provisions the owner tuple for a user on first login.
// Safe to call on every request — no-ops if the tuple already exists.
export async function ensureOwnerTuple(fgaUserId: string): Promise<void> {
  const { tuples } = await fgaClient.read({
    user: `user:${fgaUserId}`,
    relation: 'owner',
    object: `credit_profile:${fgaUserId}`,
  });

  if (tuples.length === 0) {
    try {
      await fgaClient.write({
        writes: [
          {
            user: `user:${fgaUserId}`,
            relation: 'owner',
            object: `credit_profile:${fgaUserId}`,
          },
        ],
      });
    } catch (e: unknown) {
      // Ignore duplicate tuple errors — another request beat us to it
      const msg = (e as Error)?.message ?? '';
      if (!msg.includes('already exists')) throw e;
    }
  }
}

// Writes the time-bounded consent tuple on CIBA approval.
// agent:claude consented_agent credit_profile:{userId}
export async function writeConsentTuple(fgaUserId: string): Promise<void> {
  await fgaClient.write({
    writes: [
      {
        user: 'agent:claude',
        relation: 'consented_agent',
        object: `credit_profile:${fgaUserId}`,
        condition: {
          name: 'time_bounded_consent',
          context: {
            granted_at: new Date().toISOString(),
          },
        },
      },
    ],
  });
}
