import { auth0 } from '@/lib/auth0';
import { redirect } from 'next/navigation';

export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  const authConfigured = !!(process.env.AUTH0_CLIENT_ID && process.env.AUTH0_SECRET);

  let email: string | null = null;

  if (authConfigured) {
    const session = await auth0.getSession();
    if (!session) {
      redirect('/auth/login?returnTo=/demo');
    }
    email = session?.user.email ?? session?.user.name ?? null;
  }

  return (
    <>
      {email && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.45rem 2rem',
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: '0.72rem',
          color: '#6b7280',
        }}>
          <span>Signed in as <strong style={{ color: '#374151' }}>{email}</strong></span>
          <a href="/auth/logout" style={{ color: '#dc2626', textDecoration: 'none', border: '1px solid #fca5a5', borderRadius: 4, padding: '0.2rem 0.55rem' }}>
            Sign out
          </a>
        </div>
      )}
      {children}
    </>
  );
}
