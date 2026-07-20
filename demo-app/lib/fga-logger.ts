export type FgaOpType = 'check' | 'write' | 'delete' | 'read' | 'ensure';

export type FgaLogEntry = {
  id: string;
  ts: number;
  op: FgaOpType;
  user: string;
  relation: string;
  object: string;
  result?: 'allowed' | 'denied' | 'ok' | 'error';
  error?: string;
};

const MAX = 120;

// Module-level buffer — persists within a warm Lambda instance.
// For local dev this is always in-process. On Vercel, works as long as
// the MCP server and events endpoint hit the same warm instance.
const buffer: FgaLogEntry[] = [];

export function log(entry: Omit<FgaLogEntry, 'id' | 'ts'>): void {
  buffer.push({ id: (++counter).toString(), ts: Date.now(), ...entry });
  if (buffer.length > MAX) buffer.shift();
}

export function getLog(since?: number): FgaLogEntry[] {
  const sorted = [...buffer].reverse();
  return since ? sorted.filter(e => e.ts > since) : sorted;
}

export function clearLog(): void {
  buffer.length = 0;
}

let counter = 0;
