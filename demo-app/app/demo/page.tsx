'use client';

import { useState } from 'react';

type Status = { ok: boolean; message: string } | null;

export default function DemoPanel() {
  const [userId, setUserId] = useState('');
  const [addStatus, setAddStatus] = useState<Status>(null);
  const [resetStatus, setResetStatus] = useState<Status>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

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
      setAddStatus(res.ok
        ? { ok: true, message: `✓ Written: ${data.tuple}` }
        : { ok: false, message: data.error ?? 'Failed' });
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
      setResetStatus(res.ok
        ? { ok: true, message: `✓ Cleared ${data.deleted} tuple${data.deleted !== 1 ? 's' : ''} (owner tuples preserved)` }
        : { ok: false, message: 'Reset failed' });
    } catch {
      setResetStatus({ ok: false, message: 'Network error' });
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <main style={{ fontFamily: 'monospace', padding: '2.5rem', maxWidth: 520 }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        AstraCredit — Demo Control Panel
      </h1>
      <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '2rem' }}>
        FGA store: {process.env.NEXT_PUBLIC_FGA_STORE_LABEL ?? 'archfaktor'}
      </p>

      {/* Add to joint-2026 */}
      <section style={card}>
        <h2 style={sectionHead}>Add applicant to joint-2026</h2>
        <p style={hint}>Enter the FGA user ID (e.g. <code>violet.archer</code>)</p>
        <input
          style={input}
          type="text"
          placeholder="fga-user-id"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddApplicant()}
        />
        <button
          style={{ ...btn, opacity: !userId.trim() || addLoading ? 0.5 : 1 }}
          disabled={!userId.trim() || addLoading}
          onClick={handleAddApplicant}
        >
          {addLoading ? 'Writing…' : 'Add to joint-2026'}
        </button>
        {addStatus && (
          <p style={{ ...statusMsg, color: addStatus.ok ? '#16a34a' : '#dc2626' }}>
            {addStatus.message}
          </p>
        )}
      </section>

      {/* Reset */}
      <section style={{ ...card, marginTop: '1.25rem' }}>
        <h2 style={sectionHead}>Reset demo</h2>
        <p style={hint}>Deletes all tuples. Owner tuples are recreated automatically on next login.</p>
        <button
          style={{ ...btn, background: '#dc2626', opacity: resetLoading ? 0.5 : 1 }}
          disabled={resetLoading}
          onClick={handleReset}
        >
          {resetLoading ? 'Resetting…' : 'Reset FGA store'}
        </button>
        {resetStatus && (
          <p style={{ ...statusMsg, color: resetStatus.ok ? '#16a34a' : '#dc2626' }}>
            {resetStatus.message}
          </p>
        )}
      </section>
    </main>
  );
}

const card: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '1.25rem 1.5rem',
};

const sectionHead: React.CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 600,
  marginBottom: '0.4rem',
};

const hint: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#6b7280',
  marginBottom: '0.75rem',
};

const input: React.CSSProperties = {
  display: 'block',
  width: '100%',
  fontFamily: 'monospace',
  fontSize: '0.9rem',
  padding: '0.45rem 0.65rem',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  marginBottom: '0.75rem',
  boxSizing: 'border-box',
};

const btn: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  padding: '0.5rem 1rem',
  background: '#111',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

const statusMsg: React.CSSProperties = {
  fontSize: '0.78rem',
  marginTop: '0.6rem',
};
