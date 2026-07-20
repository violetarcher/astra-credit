'use client';

import React, { useRef, useState } from 'react';

// ── Token colors matching Auth0 FGA dashboard ─────────────────────────────────
const C_TYPE  = '#0f766e';  // type names (dark teal-green)
const C_REL   = '#1677ff';  // relation names, references
const C_STR   = '#d46b08';  // string literals
const C_DIM   = '#8492a6';  // keywords: or, and, with
const C_KEY   = '#6b7280';  // structural keywords: type, define, condition…
const C_COND  = '#9254de';  // condition name

const MONO = 'ui-monospace, "SF Mono", Menlo, "Cascadia Code", monospace';

// ── Tokenizer ─────────────────────────────────────────────────────────────────

type Token = { text: string; color?: string };

function tok(text: string, color?: string): Token {
  return { text, color };
}

// Parse right-hand side of a define: "owner or consented_agent" / "[agent with time_bounded_consent]"
function parseRhs(rhs: string): Token[] {
  const tokens: Token[] = [];
  let s = rhs;

  while (s.length > 0) {
    // Bracket group [...]
    const brk = s.match(/^(\[)([^\]]*?)(\])([\s\S]*)/);
    if (brk) {
      tokens.push(tok(brk[1]));
      // inside: tokenize identifiers, "with" as dim keyword
      let inner = brk[2];
      while (inner.length > 0) {
        const w = inner.match(/^(with)(\s)([\s\S]*)/);
        if (w) { tokens.push(tok(w[1], C_DIM), tok(w[2])); inner = w[3]; continue; }
        const id = inner.match(/^(\w+)([\s\S]*)/);
        if (id) { tokens.push(tok(id[1], C_REL)); inner = id[2]; continue; }
        tokens.push(tok(inner[0])); inner = inner.slice(1);
      }
      tokens.push(tok(brk[3]));
      s = brk[4];
      continue;
    }

    // "or" / "and" keywords
    const kw = s.match(/^(or|and)(\s|$)([\s\S]*)/);
    if (kw) { tokens.push(tok(kw[1], C_DIM), tok(kw[2])); s = kw[3]; continue; }

    // Identifier (relation reference)
    const id = s.match(/^(\w+)([\s\S]*)/);
    if (id) { tokens.push(tok(id[1], C_REL)); s = id[2]; continue; }

    tokens.push(tok(s[0])); s = s.slice(1);
  }
  return tokens;
}

// Parse generic text — only colorises string literals
function parseGeneric(text: string): Token[] {
  const tokens: Token[] = [];
  let s = text;
  while (s.length > 0) {
    const str = s.match(/^("(?:[^"\\]|\\.)*")([\s\S]*)/);
    if (str) { tokens.push(tok(str[1], C_STR)); s = str[2]; continue; }
    const run = s.match(/^([^"]+)([\s\S]*)/);
    if (run) { tokens.push(tok(run[1])); s = run[2]; continue; }
    tokens.push(tok(s[0])); s = s.slice(1);
  }
  return tokens;
}

function tokenizeLine(line: string): Token[] {
  const trimmed = line.trimStart();
  const indent = line.slice(0, line.length - trimmed.length);
  const lead: Token[] = indent ? [tok(indent)] : [];

  // type <name>
  const typeM = trimmed.match(/^(type\s+)(\w+)([\s\S]*)/);
  if (typeM) return [...lead, tok(typeM[1], C_KEY), tok(typeM[2], C_TYPE), ...parseGeneric(typeM[3])];

  // define <name>: <rhs>
  const defM = trimmed.match(/^(define\s+)(\w+)(\s*:\s*)([\s\S]*)/);
  if (defM) return [...lead, tok(defM[1], C_KEY), tok(defM[2], C_REL), tok(defM[3]), ...parseRhs(defM[4])];

  // condition <name>(...)
  const condM = trimmed.match(/^(condition\s+)(\w+)([\s\S]*)/);
  if (condM) return [...lead, tok(condM[1], C_KEY), tok(condM[2], C_COND), ...parseGeneric(condM[3])];

  // relations / model / schema / etc.
  const kwM = trimmed.match(/^(relations|model|schema)([\s\S]*)/);
  if (kwM) return [...lead, tok(kwM[1], C_KEY), ...parseGeneric(kwM[2])];

  return [...lead, ...parseGeneric(trimmed)];
}

// ── Component ─────────────────────────────────────────────────────────────────

function renderTokens(tokens: Token[], lineIdx: number): React.ReactNode {
  return tokens.map((t, i) =>
    t.color
      ? <span key={`${lineIdx}-${i}`} style={{ color: t.color }}>{t.text}</span>
      : t.text
  );
}

export default function FgaModelEditor({ defaultValue, height = 480 }: { defaultValue: string; height?: number }) {
  const [source, setSource] = useState(defaultValue);
  const preRef = useRef<HTMLPreElement>(null);
  const taRef  = useRef<HTMLTextAreaElement>(null);

  function syncScroll() {
    if (preRef.current && taRef.current) {
      preRef.current.scrollTop  = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  }

  const lines = source.split('\n');

  const sharedStyle: React.CSSProperties = {
    fontFamily: MONO,
    fontSize: '0.76rem',
    lineHeight: 1.7,
    tabSize: 2,
    padding: '0.75rem 0.9rem',
    whiteSpace: 'pre',
    overflowWrap: 'normal' as const,
    wordBreak: 'normal' as const,
  };

  return (
    <div style={{ position: 'relative', height, borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e6f0', background: '#f8fafd' }}>
      {/* Syntax-highlighted layer */}
      <pre
        ref={preRef}
        aria-hidden
        style={{
          ...sharedStyle,
          position: 'absolute',
          inset: 0,
          margin: 0,
          color: '#1f2937',
          background: 'transparent',
          pointerEvents: 'none',
          overflow: 'hidden',
          resize: 'none',
        }}
      >
        {lines.map((line, i) => (
          <React.Fragment key={i}>
            {renderTokens(tokenizeLine(line), i)}
            {i < lines.length - 1 && '\n'}
          </React.Fragment>
        ))}
      </pre>

      {/* Editable layer */}
      <textarea
        ref={taRef}
        value={source}
        onChange={e => setSource(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        style={{
          ...sharedStyle,
          position: 'absolute',
          inset: 0,
          margin: 0,
          width: '100%',
          height: '100%',
          background: 'transparent',
          color: 'transparent',
          caretColor: '#1f2937',
          border: 'none',
          outline: 'none',
          resize: 'none',
          overflow: 'auto',
        }}
      />
    </div>
  );
}
