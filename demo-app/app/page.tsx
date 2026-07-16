export default function Home() {
  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem' }}>
      <h1>AstraCredit MCP Server</h1>
      <p>MCP endpoint: <code>/api/mcp</code></p>
      <p>OAuth metadata: <code>/.well-known/oauth-protected-resource</code></p>
    </main>
  );
}
