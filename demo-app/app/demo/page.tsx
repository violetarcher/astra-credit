'use client';

import { useState, useEffect, useCallback } from 'react';
import MermaidDiagram from '@/components/MermaidDiagram';

type Tuple = {
  user: string;
  relation: string;
  object: string;
  condition: { name: string; context?: Record<string, unknown> } | null;
};

type Status = { ok: boolean; message: string } | null;

const FGA_MODEL = `model
  schema 1.1

type user

type agent

type credit_profile
  relations
    define owner: [user]
    define consented_agent: [agent with time_bounded_consent]
    define can_view_summary: owner
    define can_view_full: owner or consented_agent
    define can_run_mortgage_model: owner or consented_agent

type mortgage_application
  relations
    define applicant: [user]
    define can_view: applicant

condition time_bounded_consent(current_time: timestamp, granted_at: timestamp) {
  current_time < granted_at + duration("720h")
}`;

export default function DemoPanel() {
  // Tuples
  const [tuples, setTuples] = useState<Tuple[]>([]);
  const [tuplesLoading, setTuplesLoading] = useState(false);
  const [tuplesError, setTuplesError] = useState<string | null>(null);

  // Create tuple form
  const [newUser, setNewUser] = useState('');
  const [newRelation, setNewRelation] = useState('');
  const [newObject, setNewObject] = useState('');
  const [showCondition, setShowCondition] = useState(false);
  const [conditionName, setConditionName] = useState('time_bounded_consent');
  const [conditionContext, setConditionContext] = useState(
    `{\n  "granted_at": "${new Date().toISOString()}"\n}`
  );
  const [createStatus, setCreateStatus] = useState<Status>(null);
  const [createLoading, setCreateLoading] = useState(false);

  // Quick actions
  const [userId, setUserId] = useState('');
  const [addStatus, setAddStatus] = useState<Status>(null);
  const [resetStatus, setResetStatus] = useState<Status>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const loadTuples = useCallback(async () => {
    setTuplesLoading(true);
    setTuplesError(null);
    try {
      const res = await fetch('/api/demo/tuples');
      const data = await res.json();
      if (res.ok) {
        setTuples(data.tuples ?? []);
      } else {
        setTuplesError(data.error ?? 'Failed to load tuples');
      }
    } catch {
      setTuplesError('Network error');
    } finally {
      setTuplesLoading(false);
    }
  }, []);

  useEffect(() => { loadTuples(); }, [loadTuples]);

  async function handleCreateTuple() {
    if (!newUser.trim() || !newRelation.trim() || !newObject.trim()) return;

    let conditionPayload: { name: string; context?: Record<string, unknown> } | undefined;
    if (showCondition && conditionName.trim()) {
      try {
        conditionPayload = {
          name: conditionName.trim(),
          context: JSON.parse(conditionContext),
        };
      } catch {
        setCreateStatus({ ok: false, message: 'Invalid JSON in condition context' });
        return;
      }
    }

    setCreateLoading(true);
    setCreateStatus(null);
    try {
      const res = await fetch('/api/demo/tuples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: newUser.trim(),
          relation: newRelation.trim(),
          object: newObject.trim(),
          condition: conditionPayload,
        }),
      });
      if (res.ok) {
        setCreateStatus({ ok: true, message: '✓ Tuple written' });
        setNewUser('');
        setNewRelation('');
        setNewObject('');
        setShowCondition(false);
        loadTuples();
      } else {
        const data = await res.json();
        setCreateStatus({ ok: false, message: data.error ?? 'Failed' });
      }
    } catch {
      setCreateStatus({ ok: false, message: 'Network error' });
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDeleteTuple(t: Tuple) {
    try {
      await fetch('/api/demo/tuples', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: t.user, relation: t.relation, object: t.object }),
      });
      loadTuples();
    } catch {
      // silent — table will show stale row until next refresh
    }
  }

  async function handleAddApplicant() {
    if (!userId.trim()) return;
    setAddLoading(true);
    setAddStatus(null);
    try {
      const res = await fetch('/api/demo/add-joint-applicant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fgaUserId: userId.trim() }),
      });
      const data = await res.json();
      setAddStatus(
        res.ok
          ? { ok: true, message: `✓ ${data.tuple}` }
          : { ok: false, message: data.error ?? 'Failed' }
      );
      if (res.ok) {
        setUserId('');
        loadTuples();
      }
    } catch {
      setAddStatus({ ok: false, message: 'Network error' });
    } finally {
      setAddLoading(false);
    }
  }

  async function handleReset() {
    setResetLoading(true);
    setResetStatus(null);
    setAddStatus(null);
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      const data = await res.json();
      setResetStatus(
        res.ok
          ? { ok: true, message: `✓ Cleared ${data.deleted} tuple${data.deleted !== 1 ? 's' : ''}` }
          : { ok: false, message: 'Reset failed' }
      );
      if (res.ok) loadTuples();
    } catch {
      setResetStatus({ ok: false, message: 'Network error' });
    } finally {
      setResetLoading(false);
    }
  }

  const canCreate = newUser.trim() && newRelation.trim() && newObject.trim() && !createLoading;

  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: 1280 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
          AstraCredit — FGA Dashboard
        </h1>
        <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
          store: {process.env.NEXT_PUBLIC_FGA_STORE_LABEL ?? 'archfaktor'}
        </span>
      </div>

      {/* Two-column: model | tuples */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* Left — FGA Model */}
        <div style={card}>
          <h2 style={sectionHead}>FGA Model</h2>
          <p style={hint}>
            Read-only view. Edits here are local only — use the FGA dashboard to deploy model changes.
          </p>
          <textarea
            style={{
              fontFamily: 'monospace',
              fontSize: '0.76rem',
              width: '100%',
              height: 400,
              padding: '0.7rem 0.8rem',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              resize: 'vertical',
              boxSizing: 'border-box',
              lineHeight: 1.65,
              color: '#1f2937',
              background: '#f9fafb',
              outline: 'none',
            }}
            defaultValue={FGA_MODEL}
            spellCheck={false}
          />
        </div>

        {/* Right — Tuples */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
            <h2 style={{ ...sectionHead, margin: 0 }}>
              Tuples{!tuplesLoading ? ` (${tuples.length})` : ''}
            </h2>
            <button
              style={{ ...btnOutline, opacity: tuplesLoading ? 0.5 : 1 }}
              disabled={tuplesLoading}
              onClick={loadTuples}
            >
              {tuplesLoading ? 'Loading…' : '↻ Refresh'}
            </button>
          </div>

          {tuplesError && (
            <p style={{ color: '#dc2626', fontSize: '0.75rem', marginBottom: '0.6rem' }}>
              {tuplesError}
            </p>
          )}

          {/* Table */}
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            overflow: 'hidden',
            marginBottom: '1.25rem',
            maxHeight: 300,
            overflowY: 'auto',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={th}>User</th>
                  <th style={th}>Relation</th>
                  <th style={th}>Object</th>
                  <th style={th}>Condition</th>
                  <th style={{ ...th, width: 36, paddingRight: '0.5rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {tuples.length === 0 && !tuplesLoading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '1.25rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.76rem' }}>
                      No tuples in store
                    </td>
                  </tr>
                ) : (
                  tuples.map((t, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        background: i % 2 === 0 ? '#fff' : '#fafafa',
                      }}
                    >
                      <td style={td}>{t.user}</td>
                      <td style={td}>{t.relation}</td>
                      <td style={td}>{t.object}</td>
                      <td style={{ ...td, color: '#6b7280' }}
                          title={t.condition ? JSON.stringify(t.condition.context, null, 2) : undefined}>
                        {t.condition ? t.condition.name : '—'}
                      </td>
                      <td style={{ ...td, textAlign: 'center', paddingRight: '0.5rem' }}>
                        <button
                          onClick={() => handleDeleteTuple(t)}
                          style={deleteBtn}
                          title={`Delete: ${t.user} ${t.relation} ${t.object}`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Create tuple form */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
            <h3 style={{ fontSize: '0.82rem', fontWeight: 600, margin: '0 0 0.75rem 0', color: '#374151' }}>
              Add Tuple
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
              <div>
                <label style={fieldLabel}>User</label>
                <input
                  style={inputSm}
                  placeholder="user:violet.archer"
                  value={newUser}
                  onChange={e => setNewUser(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canCreate && handleCreateTuple()}
                />
              </div>
              <div>
                <label style={fieldLabel}>Relation</label>
                <input
                  style={inputSm}
                  placeholder="owner"
                  value={newRelation}
                  onChange={e => setNewRelation(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canCreate && handleCreateTuple()}
                />
              </div>
              <div>
                <label style={fieldLabel}>Object</label>
                <input
                  style={inputSm}
                  placeholder="credit_profile:violet.archer"
                  value={newObject}
                  onChange={e => setNewObject(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canCreate && handleCreateTuple()}
                />
              </div>
            </div>

            {/* Condition toggle */}
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: '#6b7280', padding: 0, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setShowCondition(v => !v)}
            >
              <span style={{ fontFamily: 'monospace' }}>{showCondition ? '▾' : '▸'}</span>
              Condition {showCondition ? '' : '(optional)'}
            </button>

            {showCondition && (
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '0.75rem', marginBottom: '0.6rem', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.6rem' }}>
                <div>
                  <label style={fieldLabel}>Condition Name</label>
                  <input
                    style={inputSm}
                    value={conditionName}
                    onChange={e => setConditionName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={fieldLabel}>Context (JSON)</label>
                  <textarea
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.72rem',
                      width: '100%',
                      height: 72,
                      padding: '0.35rem 0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: 4,
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                    value={conditionContext}
                    onChange={e => setConditionContext(e.target.value)}
                    spellCheck={false}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                style={{ ...btnPrimary, opacity: canCreate ? 1 : 0.45 }}
                disabled={!canCreate}
                onClick={handleCreateTuple}
              >
                {createLoading ? 'Writing…' : 'Add Tuple'}
              </button>
              {createStatus && (
                <span style={{ fontSize: '0.72rem', color: createStatus.ok ? '#16a34a' : '#dc2626' }}>
                  {createStatus.message}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.25rem' }}>

        {/* Add to joint-2026 */}
        <section style={card}>
          <h2 style={sectionHead}>Scenario 5 — Add to joint-2026</h2>
          <p style={hint}>
            Writes <code>user:{'{fgaUserId}'} applicant mortgage_application:joint-2026</code>
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              style={{ ...inputFull, marginBottom: 0, flex: 1 }}
              type="text"
              placeholder="fga-user-id  (e.g. violet.archer)"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !addLoading && userId.trim() && handleAddApplicant()}
            />
            <button
              style={{ ...btnPrimary, opacity: !userId.trim() || addLoading ? 0.45 : 1, whiteSpace: 'nowrap' }}
              disabled={!userId.trim() || addLoading}
              onClick={handleAddApplicant}
            >
              {addLoading ? 'Writing…' : 'Add'}
            </button>
          </div>
          {addStatus && (
            <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: addStatus.ok ? '#16a34a' : '#dc2626' }}>
              {addStatus.message}
            </p>
          )}
        </section>

        {/* Reset */}
        <section style={card}>
          <h2 style={sectionHead}>Reset Demo</h2>
          <p style={hint}>
            Deletes all tuples. Owner tuples are recreated automatically on next login.
          </p>
          <button
            style={{ ...btnDanger, opacity: resetLoading ? 0.5 : 1 }}
            disabled={resetLoading}
            onClick={handleReset}
          >
            {resetLoading ? 'Resetting…' : 'Reset FGA store'}
          </button>
          {resetStatus && (
            <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: resetStatus.ok ? '#16a34a' : '#dc2626' }}>
              {resetStatus.message}
            </p>
          )}
        </section>
      </div>

      {/* Diagrams */}
      <DiagramsPanel />
    </main>
  );
}

// ─── Diagrams panel ───────────────────────────────────────────────────────────

const ARCH_DIAGRAM = `graph LR
  U("👤 User\\nBrowser + Phone")
  CL("🤖 Claude.ai\\nMCP Client")
  A0("Auth0\\nToken Issuance + CIBA")
  G("Guardian\\nPush Notification")
  FGA("Auth0 FGA\\nAuthorization Store")
  MCP("MCP Server\\nNext.js")

  CL -- "OAuth 2.0 PKCE\\n(tpc_ CIMD)" --> A0
  A0 -- "JWT access token" --> CL
  CL -- "Bearer + JSON-RPC" --> MCP
  MCP -- "Verify JWT" --> A0
  MCP -- "check permission" --> FGA
  FGA -- "allowed / denied" --> MCP
  MCP -- "bc-authorize" --> A0
  A0 -- "push notification" --> G
  G -- "delivered to phone" --> U
  U -- "approves" --> A0
  A0 -- "CIBA token" --> MCP
  MCP -- "write consent tuple" --> FGA`;

const MODEL_DIAGRAM = `graph TD
  U["👤 user"]
  AG["🤖 agent"]
  TC(["⏱ time_bounded_consent<br/>current_time &lt; granted_at + 720h"])
  CP["📋 credit_profile<br/>─────────────────────────────<br/>can_view_summary = owner<br/>can_view_full = owner or consented_agent<br/>can_run_mortgage_model = owner or consented_agent"]
  MA["📑 mortgage_application<br/>─────────────────<br/>can_view = applicant"]

  U -->|"owner"| CP
  AG -->|"consented_agent"| CP
  TC -. "condition on consented_agent" .-> AG
  U -->|"applicant"| MA`;

const FLOW_DIAGRAM = `sequenceDiagram
  actor U as User
  participant C as Claude
  participant M as MCP Server
  participant F as Auth0 FGA
  participant A as Auth0 / Guardian

  rect rgb(240,255,240)
    Note over C,F: Scenario 1 — Account Summary
    C->>M: get_account_summary
    M->>F: can_view_summary on credit_profile?
    F-->>M: ✅ owner
    M-->>C: account data
  end

  rect rgb(255,245,235)
    Note over C,A: Scenario 2 — Full Credit Report (CIBA)
    C->>M: get_credit_report
    M->>F: can_view_full on credit_profile?
    F-->>M: ❌ no consented_agent tuple
    M->>A: bc-authorize (CIBA login_hint)
    A->>U: Guardian push to phone
    U->>A: ✅ Approve
    M->>F: write consented_agent tuple (granted_at = now)
    M-->>C: full credit report
  end

  rect rgb(240,248,255)
    Note over C,F: Scenario 3 — Score Deep-Dive (consent cached)
    C->>M: get_credit_report
    M->>F: can_view_full?
    F-->>M: ✅ tuple exists, condition passes
    M-->>C: full report (no push needed)
  end

  rect rgb(248,240,255)
    Note over C,F: Scenario 4 — Mortgage Model (shared consent)
    C->>M: run_mortgage_model
    M->>F: can_run_mortgage_model?
    F-->>M: ✅ same consented_agent tuple
    M-->>C: DTI / LTV / approval verdict
  end

  rect rgb(255,252,220)
    Note over U,F: Scenario 5 — Joint Account
    C->>M: get_joint_application_data (joint-2026)
    M->>F: can_view on mortgage_application:joint-2026?
    F-->>M: ❌ not a member
    M-->>C: denied — ask to be added
    Note over U,F: SE writes applicant tuple via demo panel
    C->>M: get_joint_application_data (joint-2026)
    M->>F: can_view on mortgage_application:joint-2026?
    F-->>M: ✅ applicant tuple found
    M-->>C: joint account data
  end`;

const TABS = [
  { id: 'arch', label: 'System Architecture', chart: ARCH_DIAGRAM },
  { id: 'model', label: 'FGA Model', chart: MODEL_DIAGRAM },
  { id: 'flows', label: 'Demo Flows', chart: FLOW_DIAGRAM },
] as const;

function DiagramsPanel() {
  const [active, setActive] = useState<string>('arch');
  const current = TABS.find(t => t.id === active)!;

  return (
    <div style={{ ...card, marginTop: '1.25rem' }}>
      <h2 style={{ ...sectionHead, marginBottom: '1rem' }}>Diagrams</h2>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            style={{
              fontFamily: 'monospace',
              fontSize: '0.78rem',
              padding: '0.4rem 0.85rem',
              background: 'none',
              border: 'none',
              borderBottom: active === t.id ? '2px solid #111' : '2px solid transparent',
              color: active === t.id ? '#111' : '#6b7280',
              cursor: 'pointer',
              fontWeight: active === t.id ? 600 : 400,
              marginBottom: '-1px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <MermaidDiagram key={current.id} id={current.id} chart={current.chart} />
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '1.25rem 1.5rem',
};

const sectionHead: React.CSSProperties = {
  fontSize: '0.88rem',
  fontWeight: 600,
  marginTop: 0,
  marginBottom: '0.35rem',
};

const hint: React.CSSProperties = {
  fontSize: '0.73rem',
  color: '#6b7280',
  marginTop: 0,
  marginBottom: '0.85rem',
};

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.45rem 0.75rem',
  fontWeight: 600,
  fontSize: '0.68rem',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
  padding: '0.42rem 0.75rem',
  maxWidth: 200,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '0.67rem',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '0.2rem',
};

const inputSm: React.CSSProperties = {
  display: 'block',
  width: '100%',
  fontFamily: 'monospace',
  fontSize: '0.76rem',
  padding: '0.35rem 0.5rem',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  boxSizing: 'border-box',
  outline: 'none',
};

const inputFull: React.CSSProperties = {
  display: 'block',
  width: '100%',
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  padding: '0.45rem 0.65rem',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  marginBottom: '0.75rem',
  boxSizing: 'border-box',
  outline: 'none',
};

const btnPrimary: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '0.8rem',
  padding: '0.42rem 0.9rem',
  background: '#111',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

const btnOutline: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '0.72rem',
  padding: '0.28rem 0.65rem',
  background: '#f9fafb',
  color: '#374151',
  border: '1px solid #e5e7eb',
  borderRadius: 5,
  cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  padding: '0.5rem 1rem',
  background: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

const deleteBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#dc2626',
  cursor: 'pointer',
  fontSize: '1rem',
  padding: '0 2px',
  lineHeight: 1,
  opacity: 0.7,
};
