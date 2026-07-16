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
