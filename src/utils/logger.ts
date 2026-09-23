// Logger da aplicação (§diagnóstico).
// Níveis + subsistema + buffer circular dos últimos 200 eventos.
// Sem PII por construção: e-mails viram [email], JWTs viram [token].
// `debug` só aparece no console com `?debug=1`, `localStorage az104-debug=1`
// ou build dev — mas SEMPRE entra no buffer (getRecentLogs p/ suporte).
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogScope = 'auth' | 'sync' | 'quiz' | 'data' | 'ui'

export interface LogEntry {
  t: number
  level: LogLevel
  scope: LogScope
  msg: string
  data?: unknown
}

const BUFFER_MAX = 200
const buffer: LogEntry[] = []

const ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

export function debugEnabled(): boolean {
  try {
    if (
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('az104-debug') === '1'
    )
      return true
    if (
      typeof location !== 'undefined' &&
      new URLSearchParams(location.search).has('debug')
    )
      return true
  } catch {
    // storage/URL indisponível (SSR/privado): debug desligado
  }
  try {
    return import.meta.env.DEV === true
  } catch {
    return false
  }
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const TOKEN_RE = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(\.[A-Za-z0-9_-]+)?/g
const SECRET_RE = /(api[_-]?key|password|secret|token)\s*[:=]\s*\S+/gi

export function sanitize(value: unknown, depth = 0): unknown {
  if (typeof value === 'string')
    return value
      .replace(EMAIL_RE, '[email]')
      .replace(TOKEN_RE, '[token]')
      .replace(SECRET_RE, '$1=[redacted]')
  if (value instanceof Error)
    return { name: value.name, message: sanitize(value.message) }
  if (Array.isArray(value) && depth < 3)
    return value.map((v) => sanitize(v, depth + 1))
  if (value !== null && typeof value === 'object' && depth < 3) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = sanitize(v, depth + 1)
    return out
  }
  return value
}

function emit(level: LogLevel, scope: LogScope, msg: string, data?: unknown) {
  const entry: LogEntry = { t: Date.now(), level, scope, msg }
  if (data !== undefined) entry.data = sanitize(data)
  buffer.push(entry)
  if (buffer.length > BUFFER_MAX) buffer.splice(0, buffer.length - BUFFER_MAX)
  if (ORDER[level] === 0 && !debugEnabled()) return
  const line = `[${scope}] ${msg}`
  if (level === 'error') console.error(line, entry.data ?? '')
  else if (level === 'warn') console.warn(line, entry.data ?? '')
  else if (level === 'info') console.info(line, entry.data ?? '')
  else console.debug(line, entry.data ?? '')
}

export const logger = {
  debug: (scope: LogScope, msg: string, data?: unknown) =>
    emit('debug', scope, msg, data),
  info: (scope: LogScope, msg: string, data?: unknown) =>
    emit('info', scope, msg, data),
  warn: (scope: LogScope, msg: string, data?: unknown) =>
    emit('warn', scope, msg, data),
  error: (scope: LogScope, msg: string, data?: unknown) =>
    emit('error', scope, msg, data),
}

export function getRecentLogs(): LogEntry[] {
  return [...buffer]
}

export function clearLogs(): void {
  buffer.length = 0
}
