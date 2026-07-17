# AstraCredit — AI Agent Authorization Demo

A sales engineering demo showing how to authorize an AI agent using **Auth0 FGA** (fine-grained authorization) and **Auth0 CIBA** (Client-Initiated Backchannel Authentication) with Guardian push notifications.

The scenario: a credit union customer uses Claude.ai to query their financial data. The AI agent can only access sensitive data when the user explicitly approves it on their phone — and that approval is tracked as a time-bounded consent record in FGA.

---

## Architecture

```
Browser (Claude.ai)
    │  OAuth 2.0 PKCE via CIMD (tpc_ app)
    ▼
MCP Server (Next.js — /api/mcp)
    ├── Auth0 FGA  — Is the agent allowed to do this?
    └── Auth0 CIBA — Ask the user for consent via Guardian push
```

- **MCP client**: Claude.ai connects to the MCP server via OAuth 2.0 PKCE, registered as a Third Party Client (`tpc_`) in Auth0 using CIMD (`https://claude.ai/oauth/mcp-oauth-client-metadata`)
- **Auth server**: Auth0 (token issuance, CIBA, Guardian push)
- **Authorization**: Auth0 FGA (relationship-based checks with time-bounded consent conditions)
- **Human-in-the-Loop**: CIBA triggers a Guardian push to the user's phone; on approval, a time-bounded FGA tuple is written

---

## Demo Users

Any user authenticated through Auth0 can run the demo. Their name is derived from the email local part and injected into the demo data — `violet.archer@okta.com` sees **Violet Archer**, `john.doe@okta.com` sees **John Doe**. The underlying credit profile numbers are shared demo data.

FGA tuples are provisioned dynamically on first login — no seed data required.

---

## FGA Authorization Model

```
type credit_profile
  owner            → user (the logged-in user)
  consented_agent  → agent WITH time_bounded_consent condition
  can_view_summary      = owner
  can_view_full         = owner OR consented_agent
  can_run_mortgage_model = owner OR consented_agent

type mortgage_application
  applicant  → user
  can_view   = applicant

condition time_bounded_consent(current_time, granted_at):
  current_time < granted_at + 720h  // 30 days
```

The `consented_agent` relation is the core of the demo: it's only written after the user approves a CIBA push, and it expires automatically after 30 days.

---

## Demo Scenarios

### Scenario 1 — Account Summary (no consent required)

**Prompt:** *"What does my credit profile look like?"*

**What happens:**
1. Claude calls `get_account_summary`
2. FGA check: `can_view_summary` on `credit_profile:{user}` → ✅ user is the owner
3. Returns high-level summary (score, utilization, payment history) with the user's name

**Talk track:** Basic authorization — the owner can always see their own summary. No phone prompt, no friction. FGA makes this a single check.

---

### Scenario 2 — Full Credit Report (first time — CIBA triggered)

**Prompt:** *"Can you pull my full credit report?"*

**What happens:**
1. Claude calls `get_credit_report`
2. FGA check: `can_view_full` → ❌ no `consented_agent` tuple yet
3. Server verifies Guardian push enrollment, then initiates CIBA via `/bc-authorize`
4. Guardian push sent to user's phone with binding message
5. Claude tells the user to check their phone and polls `poll_ciba_approval`
6. User approves on phone
7. Server writes time-bounded FGA tuple: `agent:claude consented_agent credit_profile:{user}`
8. FGA check now passes → full credit report returned with user's name

**Talk track:** This is the Human-in-the-Loop moment. The AI literally cannot access the data until the user approves on their phone. The approval is recorded in FGA as an auditable, time-limited consent record.

---

### Scenario 3 — Full Credit Report (repeat — consent cached)

**Prompt:** *"Can you pull that report again?"*

**What happens:**
1. Claude calls `get_credit_report` again
2. FGA check: `can_view_full` — `consented_agent` tuple exists and condition passes
3. Report returned immediately — no Guardian push

**Talk track:** The user already approved. FGA remembers. No duplicate interruptions — this is how you build AI experiences that are secure *and* usable.

---

### Scenario 4 — Mortgage Eligibility Model (shared consent, no second push)

**Prompt:** *"Am I eligible for a $450k mortgage on a $525k property?"*

**What happens:**
1. Claude calls `run_mortgage_model`
2. FGA check: `can_run_mortgage_model` → ✅ the **same** `consented_agent` tuple from Scenario 2 covers this
3. Mortgage model returns DTI analysis, LTV, estimated rate, conditional approval verdict with user's name

**Talk track:** One approval, multiple tools. Consent consolidation — no push fatigue, no repeated interruptions for the same data context.

---

### Scenario 5 — Joint Application Data (access denied)

**Prompt:** *"Can you pull the data from my joint mortgage application?"*

**What happens:**
1. Claude calls `get_joint_application_data`
2. FGA check: `can_view` on `mortgage_application:joint-2024` → ❌ user is not an `applicant`
3. Tool returns a denial — no data exposed

**Talk track:** FGA enforces object-level access. Even with an active consent session, the AI cannot access resources the user isn't authorized for. This is the fine-grained part of fine-grained authorization.

---

## Scenario Flow Summary

| # | Tool | FGA Relation | CIBA? | Result |
|---|------|-------------|-------|--------|
| 1 | `get_account_summary` | `can_view_summary` | No | ✅ Allowed |
| 2 | `get_credit_report` (first) | `can_view_full` — no tuple | Yes — Guardian push | ✅ Allowed after approval |
| 3 | `get_credit_report` (repeat) | `can_view_full` — tuple exists | No | ✅ Allowed (consent cached) |
| 4 | `run_mortgage_model` | `can_run_mortgage_model` — same tuple | No | ✅ Allowed (shared consent) |
| 5 | `get_joint_application_data` | `can_view` — not an applicant | No | ❌ Denied |

---

## Prerequisites

- Auth0 tenant with CIBA enabled and Guardian push configured
- Auth0 FGA store with the model in `fga/model.fga` deployed
- Claude.ai account with MCP connector support
- Node.js 20+
- ngrok with a reserved domain

## Setup

```bash
cd demo-app
cp .env.example .env.local
# Fill in all values (see below)
npm install
npm run dev   # starts on http://localhost:4050
```

### Environment variables

| Variable | Description |
|---|---|
| `AUTH0_DOMAIN` | Your Auth0 tenant domain |
| `AUTH0_AUDIENCE` | Your ngrok URL with trailing slash e.g. `https://your-domain.ngrok-free.dev/` |
| `CIBA_CLIENT_ID` / `CIBA_CLIENT_SECRET` | Auth0 app used server-side to initiate CIBA |
| `AUTH0_MGMT_CLIENT_ID` / `AUTH0_MGMT_CLIENT_SECRET` | Management API client (needs `read:authentication_methods`) |
| `FGA_*` | Auth0 FGA store credentials |
| `NEXT_PUBLIC_BASE_URL` | Your ngrok URL with trailing slash (same as `AUTH0_AUDIENCE`) |

### Auth0 setup

**1. FGA model** — deploy `fga/model.fga` to your FGA store. No seed tuples needed; owner tuples are provisioned on first login.

**2. Auth0 API** — register an API with identifier = your ngrok URL (with trailing slash). This is the `AUTH0_AUDIENCE`.

**3. Claude.ai CIMD app** — create a Third Party Client (`tpc_`) in Auth0 with:
- `external_client_id`: `https://claude.ai/oauth/mcp-oauth-client-metadata`
- `external_metadata_type`: `cimd`
- Allowed callback: `https://claude.ai/api/mcp/auth_callback`
- Token endpoint auth method: `none` (PKCE)

Then create **two client grants** for the `tpc_` app against your API:
- A machine-to-machine grant
- A user client grant

**4. CIBA client** — create a separate Auth0 app for CIBA with `bc-authorize` enabled.

**5. Management API client** — create an M2M app authorized to access the Auth0 Management API with scope `read:authentication_methods`.

**6. Auth0 Action** — add to the Post-Login flow to surface email on the access token:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  api.accessToken.setCustomClaim('https://test.app.com/email', event.user.email);
};
```

### Start ngrok

```bash
ngrok http --domain=your-domain.ngrok-free.dev 4050
```

### Connect Claude.ai

1. In Claude.ai → **Settings → Integrations → Add integration**
2. Enter: `https://your-domain.ngrok-free.dev/api/mcp`
3. When prompted for OAuth Client ID, enter: `https://claude.ai/oauth/mcp-oauth-client-metadata`
4. Complete the Auth0 login flow
