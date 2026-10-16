// Keeps the last few unexpected errors on the phone so testers can copy an
// error report from Settings. Nothing is sent anywhere.

const ERROR_KEY = 'stardust-empire-errors';
const MAX_ERRORS = 10;

export interface ErrorEntry {
  t: number;
  where: string;
  msg: string;
  stack: string;
}

let memory: ErrorEntry[] | null = null;

function load(): ErrorEntry[] {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(ERROR_KEY);
    const list = raw ? (JSON.parse(raw) as ErrorEntry[]) : [];
    memory = Array.isArray(list) ? list : [];
  } catch {
    memory = [];
  }
  return memory;
}

export function recordError(where: string, err: unknown): void {
  const e = err instanceof Error ? err : new Error(String(err));
  const list = load();
  const msg = e.message.slice(0, 300);
  // The same error every frame would flood the log; keep one copy per message.
  const same = list.find((x) => x.msg === msg && x.where === where);
  if (same) same.t = Date.now();
  else list.push({ t: Date.now(), where, msg, stack: (e.stack ?? '').split('\n').slice(0, 4).join('\n') });
  while (list.length > MAX_ERRORS) list.shift();
  try {
    localStorage.setItem(ERROR_KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: the in-memory copy still feeds the report.
  }
}

export function hasErrors(): boolean {
  return load().length > 0;
}

export function errorReport(version: string): string {
  const lines = [`Stardust Empire ${version}`, navigator.userAgent, new Date().toISOString(), ''];
  for (const e of load()) lines.push(`[${new Date(e.t).toISOString()}] ${e.where}: ${e.msg}`, e.stack, '');
  return lines.join('\n');
}

export function clearErrors(): void {
  memory = [];
  try {
    localStorage.removeItem(ERROR_KEY);
  } catch {
    // ignore
  }
}

export function installErrorHandlers(): void {
  window.addEventListener('error', (e) => recordError('window', e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => recordError('promise', e.reason));
}
