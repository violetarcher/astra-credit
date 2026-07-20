import { auth0 } from '@/lib/auth0';
import { redirect } from 'next/navigation';

export default async function Home() {
  // If already authenticated, send straight to the demo panel
  const session = await auth0.getSession();
  if (session) {
    redirect('/demo');
  }

  return (
    <main style={{
      fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f2f5',
    }}>
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        padding: '2.5rem 3rem',
        width: 380,
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{
          width: 44, height: 44, borderRadius: 10, background: '#0f172a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          <svg width="26" height="18" viewBox="0 0 26 18" fill="none">
            <rect y="0"    width="26" height="3.2" rx="1.6" fill="white" opacity="0.85"/>
            <rect y="7.4"  width="26" height="3.2" rx="1.6" fill="#1677ff"/>
            <rect y="14.8" width="18" height="3.2" rx="1.6" fill="#0f766e"/>
          </svg>
        </div>

        <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.3rem' }}>
          AstraCredit
        </h1>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 2rem' }}>
          FGA Demo Control Panel
        </p>

        <a
          href="/auth/login?returnTo=/demo"
          style={{
            display: 'block',
            width: '100%',
            padding: '0.65rem 0',
            background: '#0f172a',
            color: '#fff',
            borderRadius: 7,
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.01em',
            boxSizing: 'border-box',
            transition: 'background 0.12s',
          }}
        >
          Sign in with Auth0
        </a>

        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #f0f2f5' }}>
          <p style={{ fontSize: '0.68rem', color: '#9ca3af', margin: '0 0 0.4rem' }}>MCP endpoint</p>
          <code style={{
            fontSize: '0.72rem', color: '#374151',
            background: '#f3f4f6', border: '1px solid #e5e7eb',
            borderRadius: 4, padding: '0.2rem 0.5rem',
          }}>/api/mcp</code>
        </div>
      </div>
    </main>
  );
}
