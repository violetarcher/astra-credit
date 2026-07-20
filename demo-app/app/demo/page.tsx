'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import MermaidDiagram from '@/components/MermaidDiagram';
import FgaModelEditor from '@/components/FgaModelEditor';

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { document.documentElement.setAttribute('data-theme', 'dark'); setDark(true); }
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : '');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }
  return { dark, toggle };
}

type FgaLogEntry = {
  id: string;
  ts: number;
  op: 'check' | 'write' | 'delete' | 'read' | 'ensure';
  user: string;
  relation: string;
  object: string;
  result?: 'allowed' | 'denied' | 'ok' | 'error';
};

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
  const { dark, toggle: toggleDark } = useDarkMode();

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
      if (res.ok) setTuples(data.tuples ?? []);
      else setTuplesError(data.error ?? 'Failed to load tuples');
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
        conditionPayload = { name: conditionName.trim(), context: JSON.parse(conditionContext) };
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
        body: JSON.stringify({ user: newUser.trim(), relation: newRelation.trim(), object: newObject.trim(), condition: conditionPayload }),
      });
      if (res.ok) {
        setCreateStatus({ ok: true, message: '✓ Tuple written' });
        setNewUser(''); setNewRelation(''); setNewObject(''); setShowCondition(false);
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
    } catch { /* silent */ }
  }

  async function handleAddApplicant() {
    if (!userId.trim()) return;
    setAddLoading(true); setAddStatus(null);
    try {
      const res = await fetch('/api/demo/add-joint-applicant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fgaUserId: userId.trim() }),
      });
      const data = await res.json();
      setAddStatus(res.ok ? { ok: true, message: `✓ ${data.tuple}` } : { ok: false, message: data.error ?? 'Failed' });
      if (res.ok) { setUserId(''); loadTuples(); }
    } catch { setAddStatus({ ok: false, message: 'Network error' }); }
    finally { setAddLoading(false); }
  }

  async function handleReset() {
    setResetLoading(true); setResetStatus(null); setAddStatus(null);
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      const data = await res.json();
      setResetStatus(res.ok
        ? { ok: true, message: `✓ Cleared ${data.deleted} tuple${data.deleted !== 1 ? 's' : ''}` }
        : { ok: false, message: 'Reset failed' });
      if (res.ok) loadTuples();
    } catch { setResetStatus({ ok: false, message: 'Network error' }); }
    finally { setResetLoading(false); }
  }

  const canCreate = !!(newUser.trim() && newRelation.trim() && newObject.trim() && !createLoading);

  return (
    <main style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', padding: '1.75rem 2.5rem', maxWidth: 1600 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, background: '#0f172a',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
              <rect y="0" width="20" height="2.5" rx="1.25" fill="white" opacity="0.85"/>
              <rect y="5.5" width="20" height="2.5" rx="1.25" fill="#1677ff"/>
              <rect y="11" width="14" height="2.5" rx="1.25" fill="#0f766e"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>AstraCredit</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.2 }}>FGA Dashboard</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--store-badge-bg)', border: '1px solid var(--card-border)', padding: '0.25rem 0.65rem', borderRadius: 999 }}>
            store: {process.env.NEXT_PUBLIC_FGA_STORE_LABEL ?? 'archfaktor'}
          </span>
          <button className="theme-toggle" onClick={toggleDark} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* ── Two-column: model | tuples ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '660px 1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* Left — FGA Model */}
        <div className="card card-accent-blue">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1677ff', display: 'inline-block' }} />
            <h2 style={sectionHead}>FGA Model</h2>
          </div>
          <p style={hint}>Syntax-highlighted view · edits are local only</p>
          <FgaModelEditor defaultValue={FGA_MODEL} />
        </div>

        {/* Right — Tuples */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0f766e', display: 'inline-block' }} />
              <h2 style={{ ...sectionHead, margin: 0 }}>
                Tuples{!tuplesLoading ? ` (${tuples.length})` : ''}
              </h2>
            </div>
            <button className="btn-outline" style={btnOutline} disabled={tuplesLoading} onClick={loadTuples}>
              {tuplesLoading ? 'Loading…' : '↻ Refresh'}
            </button>
          </div>

          {tuplesError && <p style={{ color: '#dc2626', fontSize: '0.75rem', marginBottom: '0.6rem' }}>{tuplesError}</p>}

          {/* Table */}
          <div style={{ border: '1px solid var(--card-border)', borderRadius: 7, overflowX: 'auto', overflowY: 'auto', marginBottom: '1.25rem', maxHeight: 280 }}>
            <table style={{ width: '100%', minWidth: 580, borderCollapse: 'collapse', fontSize: '0.76rem' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ background: 'var(--table-head-bg)', borderBottom: '1px solid var(--card-border)' }}>
                  <th style={th}>User</th>
                  <th style={th}>Relation</th>
                  <th style={th}>Object</th>
                  <th style={th}>Condition</th>
                  <th style={{ ...th, width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {tuples.length === 0 && !tuplesLoading ? (
                  <tr><td colSpan={5} style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.76rem' }}>No tuples in store</td></tr>
                ) : tuples.map((t, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--table-row-border)', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...td, color: '#1677ff' }}>{t.user}</td>
                    <td style={{ ...td, color: '#6d28d9', fontWeight: 500 }}>{t.relation}</td>
                    <td style={{ ...td, color: '#0f766e' }}>{t.object}</td>
                    <td style={{ ...td, color: 'var(--text-secondary)' }} title={t.condition ? JSON.stringify(t.condition.context, null, 2) : undefined}>
                      {t.condition ? t.condition.name : '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <button className="btn-delete" onClick={() => handleDeleteTuple(t)} style={deleteBtn} title={`Delete ${t.user} ${t.relation} ${t.object}`}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add tuple form */}
          <div style={{ borderTop: '1px solid var(--divider)', paddingTop: '1rem' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, margin: '0 0 0.75rem', color: 'var(--text-primary)' }}>Add Tuple</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
              {[
                { label: 'User', val: newUser, set: setNewUser, ph: 'user:violet.archer' },
                { label: 'Relation', val: newRelation, set: setNewRelation, ph: 'owner' },
                { label: 'Object', val: newObject, set: setNewObject, ph: 'credit_profile:violet.archer' },
              ].map(({ label, val, set, ph }) => (
                <div key={label}>
                  <label style={fieldLabel}>{label}</label>
                  <input style={inputSm} placeholder={ph} value={val} onChange={e => set(e.target.value)} onKeyDown={e => e.key === 'Enter' && canCreate && handleCreateTuple()} />
                </div>
              ))}
            </div>

            <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--text-secondary)', padding: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setShowCondition(v => !v)}>
              <span style={{ fontFamily: 'monospace' }}>{showCondition ? '▾' : '▸'}</span>
              Condition {showCondition ? '' : '(optional)'}
            </button>

            {showCondition && (
              <div style={{ background: 'var(--preview-bg)', border: '1px solid #e0e6f0', borderRadius: 7, padding: '0.75rem', marginBottom: '0.6rem', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.6rem' }}>
                <div>
                  <label style={fieldLabel}>Condition Name</label>
                  <input style={inputSm} value={conditionName} onChange={e => setConditionName(e.target.value)} />
                </div>
                <div>
                  <label style={fieldLabel}>Context (JSON)</label>
                  <textarea style={{ fontFamily: 'monospace', fontSize: '0.72rem', width: '100%', height: 72, padding: '0.35rem 0.5rem', border: '1px solid #d1d5db', borderRadius: 4, resize: 'vertical', boxSizing: 'border-box' }}
                    value={conditionContext} onChange={e => setConditionContext(e.target.value)} spellCheck={false} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button className="btn-dark" style={{ ...btnPrimary, opacity: canCreate ? 1 : 0.4 }} disabled={!canCreate} onClick={handleCreateTuple}>
                {createLoading ? 'Writing…' : 'Add Tuple'}
              </button>
              {createStatus && <span style={{ fontSize: '0.72rem', color: createStatus.ok ? '#16a34a' : '#dc2626' }}>{createStatus.message}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.25rem' }}>

        <section className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.78rem' }}>🔗</span>
            <h2 style={sectionHead}>Scenario 5 — Add to joint-2026</h2>
          </div>
          <p style={hint}>Grant a user access to the joint mortgage account</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <div>
              <label style={fieldLabel}>User (FGA ID)</label>
              <input style={inputSm} type="text"
                placeholder="violet.archer"
                value={userId} onChange={e => setUserId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !addLoading && userId.trim() && handleAddApplicant()} />
            </div>
            <div>
              <label style={fieldLabel}>Relation</label>
              <input style={{ ...inputSm, background: 'var(--table-head-bg)', color: 'var(--text-primary)' }} readOnly value="applicant" />
            </div>
            <div>
              <label style={fieldLabel}>Object</label>
              <input style={{ ...inputSm, background: 'var(--table-head-bg)', color: 'var(--text-primary)' }} readOnly value="mortgage_application:joint-2026" />
            </div>
          </div>
          <button className="btn-dark" style={{ ...btnPrimary, opacity: !userId.trim() || addLoading ? 0.4 : 1 }}
            disabled={!userId.trim() || addLoading} onClick={handleAddApplicant}>
            {addLoading ? 'Writing…' : 'Write tuple'}
          </button>
          {addStatus && <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: addStatus.ok ? '#16a34a' : '#dc2626' }}>{addStatus.message}</p>}
        </section>

        <section className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.78rem' }}>🔄</span>
            <h2 style={sectionHead}>Reset Demo</h2>
          </div>
          <p style={hint}>Deletes all tuples. Owner tuples are recreated on next login.</p>
          <button className="btn-danger" style={{ ...btnDanger, opacity: resetLoading ? 0.5 : 1 }} disabled={resetLoading} onClick={handleReset}>
            {resetLoading ? 'Resetting…' : 'Reset FGA store'}
          </button>
          {resetStatus && <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: resetStatus.ok ? '#16a34a' : '#dc2626' }}>{resetStatus.message}</p>}
        </section>
      </div>

      {/* ── Diagrams + Prompts ─────────────────────────────────────────────── */}
      <DiagramsPanel />

      {/* ── FGA Activity Log ───────────────────────────────────────────────── */}
      <FgaLog />
    </main>
  );
}

// ─── Diagrams panel ───────────────────────────────────────────────────────────

const AUTH_FLOW_DIAGRAM = `graph LR
  U["👤 User"]
  CL["🤖 Claude.ai\\nMCP Client"]
  M["⚙ MCP Server\\n/api/mcp"]
  A0["Auth0\\n/authorize · /token · JWKS"]

  U -->|"① Add MCP integration URL"| CL
  CL -->|"② OAuth 2.0 PKCE\\n(tpc_ CIMD client ID)"| A0
  A0 -->|"③ Login page"| U
  U -->|"④ Authenticate"| A0
  A0 -->|"⑤ JWT access token\\n(sub + email claims)"| CL
  CL -->|"⑥ Bearer JWT\\n+ JSON-RPC tool call"| M
  M -->|"⑦ Verify JWT\\n(JWKS endpoint)"| A0
  A0 -->|"⑧ Valid ✅\\nensureOwnerTuple"| M`;

const TOOL_FLOW_DIAGRAM = `graph LR
  CL["🤖 Claude.ai"]
  M["⚙ MCP Server"]
  F["🗄 Auth0 FGA\\nAuthorization Store"]
  A0["Auth0\\nCIBA + Guardian"]
  P["📱 Phone\\nGuardian App"]

  CL -->|"tool call\\n(Bearer JWT)"| M
  M -->|"check permission"| F
  F -->|"✅ allowed"| M
  M -->|"tool result"| CL
  F -->|"❌ denied\\n(no consent tuple)"| M
  M -->|"bc-authorize\\n(CIBA)"| A0
  A0 -->|"Guardian push"| P
  P -->|"tap Approve"| A0
  A0 -->|"CIBA token"| M
  M -->|"write consented_agent tuple\\n(granted_at = now · 30d TTL)"| F`;

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

// ── Demo Prompts data ─────────────────────────────────────────────────────────

const SCENARIOS = [
  {
    num: 1,
    label: 'Account Summary',
    badge: 'badge-green',
    badgeText: 'No consent',
    prompts: ['"What does my credit profile look like?"'],
    fga: 'can_view_summary on credit_profile — ✅ owner always allowed',
    what: 'FGA check passes immediately. Returns credit score, utilization, and payment history with the logged-in user\'s name.',
    talk: 'Basic authorization — the owner can always see their own summary. No phone prompt, no friction. FGA makes this a single tuple check.',
  },
  {
    num: 2,
    label: 'Full Credit Report',
    badge: 'badge-amber',
    badgeText: 'CIBA triggered',
    prompts: ['"Can you pull my full credit report?"'],
    fga: 'can_view_full — ❌ no consented_agent tuple → triggers CIBA + Guardian push',
    what: 'FGA check fails. Server initiates CIBA via bc-authorize. Guardian push sent to phone. On approval, consent tuple written with granted_at timestamp.',
    talk: 'This is the Human-in-the-Loop moment. The AI literally cannot access the data until the user approves on their phone. The approval is recorded in FGA as an auditable, time-limited consent record.',
  },
  {
    num: 3,
    label: 'Credit Score Deep Dive',
    badge: 'badge-blue',
    badgeText: 'Consent cached',
    prompts: ['"What factors are affecting my credit score?"'],
    fga: 'can_view_full — ✅ consented_agent tuple from Scenario 2 still valid',
    what: 'Completely different question, same data context. FGA finds the existing tuple and condition passes — no Guardian push.',
    talk: 'The user asked something completely different, but FGA already knows the agent has consent. No second push, no friction — the 30-day window means the user stays in control without being interrupted on every question.',
  },
  {
    num: 4,
    label: 'Mortgage Eligibility Model',
    badge: 'badge-purple',
    badgeText: 'Shared consent',
    prompts: ['"Am I eligible for a $450k mortgage on a $525k property?"'],
    fga: 'can_run_mortgage_model — ✅ same consented_agent tuple covers this too',
    what: 'Different tool, same FGA tuple. Returns DTI analysis, LTV ratio, estimated rate, and conditional approval verdict.',
    talk: 'One approval, multiple tools. Consent consolidation — no push fatigue, no repeated interruptions for the same data context.',
  },
  {
    num: 5,
    label: 'Joint Account Access',
    badge: 'badge-red',
    badgeText: 'Denied → re-check',
    prompts: ['"Can you pull up the joint-2026 shared account?"', '"I just got added — can you check again?"'],
    fga: 'can_view on mortgage_application:joint-2026 — ❌ not a member → SE adds tuple → ✅',
    what: 'Claude denies and tells the user to get added. SE uses the demo panel to write the applicant tuple. User asks again — FGA passes instantly.',
    talk: 'The AI can only do what FGA allows — it doesn\'t grant its own access. Someone with authority (an admin, a loan officer) has to add the user. The moment that happens, FGA propagates instantly and Claude can proceed.',
  },
];

const TABS = [
  { id: 'auth',    label: 'Auth Flow',            chart: AUTH_FLOW_DIAGRAM  },
  { id: 'tool',    label: 'Tool / FGA Flow',      chart: TOOL_FLOW_DIAGRAM  },
  { id: 'model',   label: 'FGA Model',            chart: MODEL_DIAGRAM },
  { id: 'flows',   label: 'Demo Flows',            chart: FLOW_DIAGRAM  },
  { id: 'prompts', label: 'Demo Prompts',          chart: null          },
] as const;

function DiagramsPanel() {
  const [active, setActive] = useState<string>('auth');
  const current = TABS.find(t => t.id === active)!;

  return (
    <div className="card" style={{ marginTop: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.78rem' }}>📊</span>
        <h2 style={{ ...sectionHead, margin: 0 }}>Diagrams & Reference</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--card-border)', marginBottom: '1.25rem' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            className="tab-btn"
            data-active={active === t.id}
            onClick={() => setActive(t.id)}
            style={{
              fontFamily: 'inherit',
              fontSize: '0.78rem',
              padding: '0.45rem 0.9rem',
              background: 'none',
              border: 'none',
              borderBottom: active === t.id ? '2px solid #1677ff' : '2px solid transparent',
              color: active === t.id ? '#1677ff' : '#6b7280',
              cursor: 'pointer',
              fontWeight: active === t.id ? 600 : 400,
              marginBottom: '-1px',
              borderRadius: '4px 4px 0 0',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {current.chart ? (
        <MermaidDiagram key={current.id} id={current.id} chart={current.chart} />
      ) : (
        <PromptsPanel />
      )}
    </div>
  );
}

function PromptsPanel() {
  return (
    <div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 0, marginBottom: '1.25rem' }}>
        Run these scenarios in order. Reset the FGA store between demo runs.
      </p>
      {SCENARIOS.map(s => (
        <div key={s.num} className="scenario-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-primary)' }}>Scenario {s.num}</span>
            <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{s.label}</span>
            <span className={`badge ${s.badge}`}>{s.badgeText}</span>
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            {s.prompts.map((p, i) => (
              <span key={i} className="prompt-chip">{p}</span>
            ))}
          </div>

          <div style={{ fontSize: '0.73rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>FGA: </span>{s.fga}
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>What happens: </span>{s.what}
          </div>
          <div style={{ fontSize: '0.73rem', borderTop: '1px solid var(--card-border)', paddingTop: '0.35rem', marginTop: '0.35rem', fontStyle: 'italic', color: '#4b5563' }}>
            💬 {s.talk}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── FGA Activity Log ─────────────────────────────────────────────────────────

const OP_META: Record<string, { label: string; color: string; bg: string }> = {
  check:  { label: 'CHECK',  color: '#1d4ed8', bg: '#dbeafe' },
  write:  { label: 'WRITE',  color: '#166534', bg: '#dcfce7' },
  delete: { label: 'DELETE', color: '#92400e', bg: '#fef3c7' },
  read:   { label: 'READ',   color: 'var(--text-secondary)', bg: '#f3f4f6' },
  ensure: { label: 'ENSURE', color: '#6d28d9', bg: '#ede9fe' },
};

const RESULT_META: Record<string, { icon: string; color: string }> = {
  allowed: { icon: '✅', color: '#15803d' },
  denied:  { icon: '❌', color: '#b91c1c' },
  ok:      { icon: '✓',  color: '#15803d' },
  error:   { icon: '!',  color: '#b91c1c' },
};

function FgaLog() {
  const [entries, setEntries] = useState<FgaLogEntry[]>([]);
  const [live, setLive] = useState(true);
  const [open, setOpen] = useState(true);
  const sinceRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/demo/fga-events?since=${sinceRef.current}`);
      const data = await res.json();
      if (data.events?.length) {
        sinceRef.current = data.ts;
        setEntries(prev => {
          const combined = [...data.events, ...prev].slice(0, 120);
          return combined;
        });
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchEvents();
    if (!live) return;
    const id = setInterval(fetchEvents, 1500);
    return () => clearInterval(id);
  }, [fetchEvents, live]);

  async function handleClear() {
    await fetch('/api/demo/fga-events', { method: 'DELETE' });
    setEntries([]);
    sinceRef.current = 0;
  }

  function relTime(ts: number) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 5) return 'just now';
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  }

  return (
    <div className="card" style={{ marginTop: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: open ? '0.9rem' : 0 }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: 0, fontFamily: 'inherit' }}
        >
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{open ? '▾' : '▸'}</span>
          <span style={{ fontSize: '0.78rem' }}>🔍</span>
          <h2 style={{ ...sectionHead, margin: 0 }}>FGA Activity Log</h2>
          {entries.length > 0 && (
            <span style={{ fontSize: '0.68rem', background: 'var(--table-head-bg)', border: '1px solid var(--card-border)', borderRadius: 999, padding: '0.1rem 0.5rem', color: 'var(--text-primary)' }}>
              {entries.length}
            </span>
          )}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={() => setLive(v => !v)}
            style={{ fontFamily: 'inherit', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: 999, border: '1px solid', cursor: 'pointer', background: 'none',
              borderColor: live ? '#16a34a' : '#d1d5db', color: live ? '#16a34a' : '#9ca3af' }}
          >
            {live ? '● Live' : '○ Paused'}
          </button>
          <button className="btn-outline" style={btnOutline} onClick={handleClear}>Clear</button>
          <button className="btn-outline" style={btnOutline} onClick={fetchEvents}>↻</button>
        </div>
      </div>

      {open && (
        <div
          ref={scrollRef}
          style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--card-border)', borderRadius: 7, background: 'var(--table-alt-bg)' }}
        >
          {entries.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '1.5rem' }}>
              No activity yet — run a scenario in Claude.ai
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--table-head-bg)', zIndex: 1 }}>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <th style={{ ...th, width: 72 }}>Time</th>
                  <th style={{ ...th, width: 72 }}>Op</th>
                  <th style={th}>User</th>
                  <th style={th}>Relation</th>
                  <th style={th}>Object</th>
                  <th style={{ ...th, width: 80 }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const op = OP_META[e.op] ?? OP_META.read;
                  const res = e.result ? RESULT_META[e.result] : null;
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--table-row-border)', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ ...td, color: 'var(--text-muted)', fontSize: '0.68rem' }}>{relTime(e.ts)}</td>
                      <td style={{ ...td }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 4, background: op.bg, color: op.color, letterSpacing: '0.04em' }}>
                          {op.label}
                        </span>
                      </td>
                      <td style={{ ...td, color: '#1677ff' }}>{e.user}</td>
                      <td style={{ ...td, color: '#6d28d9' }}>{e.relation}</td>
                      <td style={{ ...td, color: '#0f766e' }}>{e.object}</td>
                      <td style={{ ...td }}>
                        {res && (
                          <span style={{ color: res.color, fontWeight: 600 }}>
                            {res.icon} {e.result}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const sectionHead: React.CSSProperties = {
  fontSize: '0.88rem',
  fontWeight: 600,
  marginTop: 0,
  marginBottom: '0.35rem',
};

const hint: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'var(--text-secondary)',
  marginTop: 0,
  marginBottom: '0.85rem',
};

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.45rem 0.75rem',
  fontWeight: 600,
  fontSize: '0.67rem',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
  padding: '0.42rem 0.75rem',
  whiteSpace: 'nowrap',
};

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '0.67rem',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '0.2rem',
};

const inputSm: React.CSSProperties = {
  display: 'block',
  width: '100%',
  fontFamily: 'inherit',
  fontSize: '0.76rem',
  padding: '0.35rem 0.5rem',
  border: '1px solid #d1d5db',
  borderRadius: 5,
  boxSizing: 'border-box',
  background: 'var(--card-bg)',
};


const btnPrimary: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: '0.8rem',
  padding: '0.42rem 0.9rem',
  background: '#111',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

const btnOutline: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: '0.72rem',
  padding: '0.28rem 0.65rem',
  background: 'var(--btn-outline-bg)',
  color: 'var(--text-primary)',
  border: '1px solid var(--card-border)',
  borderRadius: 5,
  cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  fontFamily: 'inherit',
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
  opacity: 0.65,
};

