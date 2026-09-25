import { syncNow } from '../sync/SyncEngine.js'
import { logger } from '../utils/logger.js'

// SyncController (Sprint 2, PLAN-3): retry automático + rate-limit cliente.
// - Evento `online` → flush() sozinho (volta da rede sem tocar em botão).
// - Token bucket: 10 ops de sync por janela de 60s; sem token agenda retry
//   em vez de disparar e tomar 429 do Supabase (rajada pós-offline).
// - Backoff exponencial 30s → 300s (teto) entre retries automáticos.
const WINDOW_MS = 60_000
const MAX_OPS = 10
const BASE_DELAY_MS = 30_000
const MAX_DELAY_MS = 300_000

export class SyncController {
  private ops: number[] = []
  private retryTimer = 0
  private backoffStep = 0
  private userId: string | null = null
  private simId = ''
  private onNet = () => {
    void this.flush()
  }

  attach(userId: string, simId: string) {
    this.userId = userId
    this.simId = simId
    window.addEventListener('online', this.onNet)
  }

  detach() {
    window.removeEventListener('online', this.onNet)
    window.clearTimeout(this.retryTimer)
    this.userId = null
    this.backoffStep = 0
  }

  /** Token bucket: true = pode disparar; false = agenda retry. */
  private take(): boolean {
    const now = Date.now()
    this.ops = this.ops.filter((t) => now - t < WINDOW_MS)
    if (this.ops.length >= MAX_OPS) return false
    this.ops.push(now)
    return true
  }

  /** Retry manual (botão) ou automático (evento `online`). Retorna falhas p/ banner. */
  async flush(): Promise<number> {
    if (!this.userId) return 0
    if (!this.take()) {
      logger.debug('sync', 'rate-limit cliente: retry agendado')
      this.schedule()
      return 0
    }
    try {
      const res = await syncNow(this.userId, this.simId)
      this.backoffStep = 0
      return res.enabled ? (res.pushFailed ?? 0) : 0
    } catch (err) {
      logger.warn(
        'sync',
        'flush falhou; retry agendado',
        err instanceof Error ? err.message : String(err),
      )
      this.schedule()
      return 0
    }
  }

  private schedule() {
    window.clearTimeout(this.retryTimer)
    const delay = Math.min(BASE_DELAY_MS * 2 ** this.backoffStep, MAX_DELAY_MS)
    this.backoffStep++
    this.retryTimer = window.setTimeout(() => {
      void this.flush()
    }, delay)
  }
}
