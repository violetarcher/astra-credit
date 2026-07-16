// Management API token cache — refreshed automatically when near expiry
let cachedMgmtToken: string | null = null;
let mgmtTokenExpiresAt = 0;

async function getMgmtToken(): Promise<string> {
  if (cachedMgmtToken && Date.now() < mgmtTokenExpiresAt) {
    return cachedMgmtToken;
  }

  const res = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.AUTH0_MGMT_CLIENT_ID!,
      client_secret: process.env.AUTH0_MGMT_CLIENT_SECRET!,
      audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) throw new Error('Failed to fetch management token');
  const { access_token, expires_in } = await res.json();
  cachedMgmtToken = access_token;
  mgmtTokenExpiresAt = Date.now() + (expires_in - 60) * 1000;
  return cachedMgmtToken!;
}

// Returns true if the user has a confirmed Guardian push-notification method enrolled.
// Uses GET /api/v2/users/{id}/authentication-methods (requires read:authentication_methods scope).
export async function checkGuardianEnrollment(userId: string): Promise<boolean> {
  const token = await getMgmtToken();
  const res = await fetch(
    `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}/authentication-methods`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return false;

  const body = await res.json();
  // Response may be an array directly or { authenticators: [...] }
  const methods: Array<{ type?: string; confirmed?: boolean }> = Array.isArray(body)
    ? body
    : (body.authenticators ?? []);

  return methods.some(
    (m) => m.type === 'push-notification' && m.confirmed !== false
  );
}

// Returns a Guardian enrollment ticket URL for the user
export async function getGuardianEnrollmentUrl(userId: string): Promise<string> {
  const token = await getMgmtToken();
  const res = await fetch(
    `https://${process.env.AUTH0_DOMAIN}/api/v2/guardian/enrollments/ticket`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId }),
    }
  );
  if (!res.ok) throw new Error('Failed to create enrollment ticket');
  const { ticket_url } = await res.json();
  return ticket_url as string;
}

// Initiates a CIBA request. Returns the auth_req_id for polling.
export async function initiateCiba(userId: string, bindingMessage: string): Promise<string> {
  const res = await fetch(`https://${process.env.AUTH0_DOMAIN}/bc-authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.CIBA_CLIENT_ID!,
      client_secret: process.env.CIBA_CLIENT_SECRET!,
      scope: 'openid',
      login_hint: userId,
      binding_message: bindingMessage,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `CIBA initiation failed: ${(err as { error_description?: string }).error_description ?? res.statusText}`
    );
  }

  const { auth_req_id } = await res.json();
  return auth_req_id as string;
}

export type CibaStatus = 'pending' | 'approved' | 'denied' | 'expired';

// Polls Auth0 for the CIBA grant status. Call this from the poll_ciba_approval tool.
export async function pollCibaToken(authReqId: string): Promise<CibaStatus> {
  const res = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.CIBA_CLIENT_ID!,
      client_secret: process.env.CIBA_CLIENT_SECRET!,
      grant_type: 'urn:openid:params:grant-type:ciba',
      auth_req_id: authReqId,
    }),
  });

  if (res.ok) return 'approved';

  const err = await res.json().catch(() => ({}));
  const error = (err as { error?: string }).error;

  if (error === 'authorization_pending') return 'pending';
  if (error === 'access_denied') return 'denied';
  if (error === 'expired_token') return 'expired';

  return 'pending';
}
