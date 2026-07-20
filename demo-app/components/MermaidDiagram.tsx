'use client';

import { useEffect, useState } from 'react';

let initialized = false;

interface Props {
  id: string;
  chart: string;
}

export default function MermaidDiagram({ id, chart }: Props) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        if (!initialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 13,
          });
          initialized = true;
        }
        const { svg: rendered } = await mermaid.render(`mermaid-${id}`, chart);
        if (!cancelled) setSvg(rendered);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }
    render();
    return () => { cancelled = true; };
  }, [id, chart]);

  if (error) {
    return (
      <pre style={{ color: '#dc2626', fontSize: '0.7rem', whiteSpace: 'pre-wrap', margin: 0 }}>
        {error}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div style={{ color: '#9ca3af', fontSize: '0.75rem', padding: '2rem', textAlign: 'center' }}>
        Rendering diagram…
      </div>
    );
  }

  return (
    <div
      style={{ overflowX: 'auto', padding: '0.5rem 0' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
