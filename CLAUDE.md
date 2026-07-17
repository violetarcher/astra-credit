# AstraCredit — CLAUDE.md

## What this project is

Sales engineering demo for the credit/financial industry. Shows how to authorize an AI agent (Claude) using Auth0 FGA + Auth0 CIBA (Guardian push). Claude.ai connects to a Next.js MCP server via OAuth; the server enforces FGA checks and triggers CIBA out-of-band consent when needed.

Design choices favor demo clarity and talk-track value over production hardening.

## Project structure

```
fga/
  model.fga          # FGA type model
demo-app/
  app/
    api/mcp/route.ts                              # MCP JSON-RPC handler (auth + dispatch)
    api/well-known/oauth-protected-resource/      # RFC 9728 metadata
    api/well-known/oauth-authorization-server/    # RFC 8414 AS metadata proxy
  lib/
    auth.ts          # JWT validation, deriveFgaUserId, getDisplayName
    fga.ts           # FGA client, checkPermission, writeConsentTuple, ensureOwnerTuple
    ciba.ts          # Guardian enrollment check, CIBA initiate + poll
    tools/           # One file per MCP tool + index.ts (registry + ToolContext)
  data/
    demo-data.ts     # getDemoData(displayName) — shared demo data with name substitution
  next.config.ts     # Rewrites for /.well-known/* paths
```

## Auth architecture

- **MCP client**: Claude.ai, registered in Auth0 as a `tpc_` (Third Party Client) using CIMD
  - `external_client_id`: `https://claude.ai/oauth/mcp-oauth-client-metadata`
  - Claude.ai enters this URL as the OAuth Client ID in the connector settings
- **Resource server**: our Next.js app. Auth0 API audience = `NEXT_PUBLIC_BASE_URL` (ngrok URL with trailing slash)
- **`resource` in protected resource metadata**: must match Auth0 API identifier exactly (including trailing slash)
- **No `registration_endpoint`** in AS metadata — we use CIMD, not DCR
- `tpc_` app needs both a machine grant AND a user client grant against the API

## FGA model summary

- `credit_profile` — `owner` (user), `consented_agent` (agent with `time_bounded_consent`)
  - `can_view_summary`: owner only
  - `can_view_full`: owner or consented_agent
  - `can_run_mortgage_model`: owner or consented_agent
- `mortgage_application` — `applicant` (user), `can_view`: applicant only
- `time_bounded_consent`: `current_time < granted_at + 720h`

## Dynamic users

- FGA user ID derived from email local part: `violet.archer@okta.com` → `violet.archer`
- Email surfaced on access token via Auth0 Action at claim `https://test.app.com/email`
- `ensureOwnerTuple(fgaUserId)` called on every authenticated request — idempotent, provisions owner tuple on first login
- `getDemoData(displayName)` returns demo data with "Sarah Johnson" replaced by the logged-in user's display name
- `getDisplayName('violet.archer')` → `'Violet Archer'`

## The five demo tools

| Tool | FGA check | CIBA? |
|---|---|---|
| `get_account_summary` | `can_view_summary` | No |
| `get_credit_report` | `can_view_full` | Yes (first time) |
| `poll_ciba_approval` | — | Polls + writes tuple on approval |
| `run_mortgage_model` | `can_run_mortgage_model` | No (shares tuple from get_credit_report) |
| `get_joint_application_data` | `can_view` on `mortgage_application:joint-2026` | No (demo denial) |
| `check_guardian_enrollment` | — | No |
| `get_guardian_enrollment_url` | — | No |

## CIBA implementation notes

- Guardian enrollment check uses `/api/v2/users/{id}/authentication-methods`
- Enrolled = `type === 'guardian'` AND nested `authentication_methods` contains `type === 'push'`
- `login_hint` for CIBA must be JSON: `{"format":"iss_sub","iss":"https://{domain}/","sub":"{userId}"}`
- On CIBA approval: `writeConsentTuple(fgaUserId)` writes `agent:claude consented_agent credit_profile:{user}`
- Scenarios 2 and 4 share one tuple — no second push needed for mortgage model

## Key gotchas learned during setup

- `resource` in `/.well-known/oauth-protected-resource` must exactly match the Auth0 API identifier including trailing slash — Claude.ai uses it as the token audience and will not attach a token if they differ
- Auth0 `tpc_` client IDs are internal — the OAuth client_id Claude.ai presents is `https://claude.ai/oauth/mcp-oauth-client-metadata`, not the `tpc_` string
- `tpc_` app needs both a client grant (M2M) and a user client grant — missing the user grant causes silent auth failure
- Guardian enrollment type in Management API is `"guardian"` not `"push-notification"`
- FGA `write` throws on duplicate tuples — catch and ignore `already exists` errors in `ensureOwnerTuple`

## Dev commands

```bash
cd demo-app
npm run dev      # port 4050
npm run build
npx tsc --noEmit # type check
```

## Running a demo session

1. Start: `npm run dev` in `demo-app/`
2. Start ngrok: `ngrok http --domain=<your-domain>.ngrok-free.dev 4050`
3. Connect Claude.ai to `https://<your-domain>.ngrok-free.dev/api/mcp`
4. Run scenarios in order: summary → credit report (triggers CIBA) → repeat report → mortgage model → joint application
