import { css, html, LitElement } from 'lit'
import { ensureSeeded, getQuestionPool } from '../data/QuestionLoader.js'
import type { Question } from '../engine/question-schema.js'
import { btnStyles, cardStyles } from '../styles/shared.js'
import { getUserId } from '../sync/auth.js'
import { isSyncEnabled, supabase } from '../sync/supabase.js'
import type { AttemptRecord, DoubtRecord } from '../sync/types.js'

interface RowUser {
  userId: string
  email: string
  role: string
  attempts: number
  lastActivity: string
  avgScore: number | null
}

interface QStat {
  questionId: string
  domain: string
  attempts: number
  correct: number
  pct: number
  distractor: { letter: string; count: number } | null
  errorTags: Record<string, number>
  needsReview: boolean
}

const DOMAIN_LABEL: Record<string, string> = {
  'identidade-governanca': 'Identidade e governança',
  storage: 'Storage',
  compute: 'Computação',
  'rede-virtual': 'Rede virtual',
  monitoramento: 'Monitoramento',
}

export class AdminPanel extends LitElement {
  static properties = {
    loaded: { type: Boolean },
  }

  declare loaded: boolean
  private users: RowUser[] = []
  private qStats: QStat[] = []
  private doubts: (DoubtRecord & { email: string })[] = []
  private error = ''

  constructor() {
    super()
    this.loaded = false
    void this.load()
  }

  private async load() {
    if (!isSyncEnabled() || !supabase) {
      this.error = 'Sync desativado — admin exige backend.'
      this.loaded = true
      this.requestUpdate()
      return
    }
    const userId = await getUserId()
    if (!userId) return
    try {
      const [attempts, doubts, profiles, questions] = await Promise.all([
        supabase.from('az104_attempts').select('*'),
        supabase.from('az104_doubts').select('*'),
        supabase.from('az104_profiles').select('*'),
        ensureSeeded().then(() => getQuestionPool()),
      ])
      const pool = (questions ?? []) as Question[]
      const attemptsRows = (attempts.data ?? []) as Record<string, unknown>[]
      const doubtsRows = (doubts.data ?? []) as Record<string, unknown>[]
      const profilesRows = (profiles.data ?? []) as Record<string, unknown>[]
      this.buildUsers(attemptsRows, profilesRows)
      this.buildQuestions(attemptsRows, pool)
      this.doubts = doubtsRows.map((d) => {
        const p = profilesRows.find((x) => x.user_id === d.user_id)
        return {
          questionId: String(d.question_id),
          note: String(d.note ?? ''),
          tag: (d.tag as DoubtRecord['tag']) ?? null,
          resolved: Boolean(d.resolved),
          createdAt: Number(d.created_at ?? 0),
          updatedAt: Number(d.updated_at ?? 0),
          email: String(p?.email ?? d.user_id),
        }
      })
    } catch (err) {
      this.error =
        err instanceof Error ? err.message : 'Falha ao carregar admin.'
    }
    this.loaded = true
    this.requestUpdate()
  }

  private buildUsers(
    attempts: Record<string, unknown>[],
    profiles: Record<string, unknown>[],
  ) {
    const byUser = new Map<string, RowUser>()
    for (const p of profiles) {
      const uid = String(p.user_id)
      byUser.set(uid, {
        userId: uid,
        email: String(p.email ?? ''),
        role: String(p.role ?? 'user'),
        attempts: 0,
        lastActivity: '',
        avgScore: null,
      })
    }
    for (const a of attempts) {
      const uid = String(a.user_id)
      const u = byUser.get(uid) ?? {
        userId: uid,
        email: '',
        role: 'user',
        attempts: 0,
        lastActivity: '',
        avgScore: null,
      }
      u.attempts++
      const score = Number(a.score ?? 0)
      u.avgScore =
        u.avgScore === null
          ? score
          : Math.round((u.avgScore * (u.attempts - 1) + score) / u.attempts)
      const at = new Date(
        Number(a.finished_at ?? 0) || Number(a.created_at ?? 0),
      )
      const iso = at.toISOString()
      if (iso > u.lastActivity) u.lastActivity = iso
      byUser.set(uid, u)
    }
    this.users = [...byUser.values()].sort((a, b) => b.attempts - a.attempts)
  }

  private buildQuestions(
    attempts: Record<string, unknown>[],
    pool: Question[],
  ) {
    const byQ = new Map<string, QStat>()
    for (const q of pool) {
      byQ.set(q.id, {
        questionId: q.id,
        domain: q.domain,
        attempts: 0,
        correct: 0,
        pct: 0,
        distractor: null,
        errorTags: {},
        needsReview: q.needsReview ?? false,
      })
    }
    for (const a of attempts) {
      const answers = (a.answers ?? []) as AttemptRecord['answers']
      const tags = (a.error_tags ?? {}) as AttemptRecord['errorTags']
      for (const an of answers) {
        const s = byQ.get(an.questionId)
        if (!s) continue
        s.attempts++
        if (an.correct) s.correct++
        else {
          const wrong = an.given.find((g) => !an.expected.includes(g))
          if (wrong) {
            const cur = s.distractor
            const count = (cur && cur.letter === wrong ? cur.count : 0) + 1
            if (!cur || count > cur.count)
              s.distractor = { letter: wrong, count }
          }
          const tag = tags[an.questionId]
          if (tag) s.errorTags[tag] = (s.errorTags[tag] ?? 0) + 1
        }
      }
    }
    for (const s of byQ.values()) {
      s.pct = s.attempts ? Math.round((s.correct / s.attempts) * 100) : 0
    }
    this.qStats = [...byQ.values()].sort(
      (a, b) =>
        (a.attempts ? a.pct : 101) - (b.attempts ? b.pct : 101) ||
        b.attempts - a.attempts,
    )
  }

  private csv() {
    const esc = (v: string | number | boolean) =>
      `"${String(v).replaceAll('"', '""')}"`
    const lines = [
      [
        'questionId',
        'domain',
        'attempts',
        'pct',
        'distractor',
        'errorTags',
        'needsReview',
      ]
        .map(esc)
        .join(','),
      ...this.qStats.map((s) =>
        [
          s.questionId,
          s.domain,
          s.attempts,
          s.pct,
          s.distractor?.letter ?? '',
          JSON.stringify(s.errorTags),
          s.needsReview,
        ]
          .map(esc)
          .join(','),
      ),
    ]
    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `az104-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  private label(d: string) {
    return DOMAIN_LABEL[d] ?? d
  }

  render() {
    if (!this.loaded) return html`<main><p>Carregando…</p></main>`
    if (this.error) return html`<main><p class="err">${this.error}</p></main>`
    const avgAll = this.qStats.filter((s) => s.attempts).length
      ? Math.round(
          this.qStats.filter((s) => s.attempts).reduce((x, s) => x + s.pct, 0) /
            this.qStats.filter((s) => s.attempts).length,
        )
      : 0
    return html`
      <main>
        <section class="card">
          <h2>Visão geral</h2>
          <div class="kpis">
            <div class="kpi"><strong>${this.users.length}</strong> usuários</div>
            <div class="kpi"><strong>${this.qStats.reduce((x, s) => x + s.attempts, 0)}</strong> tentativas</div>
            <div class="kpi"><strong>${avgAll}%</strong> acerto médio</div>
            <div class="kpi"><strong>${this.doubts.filter((d) => !d.resolved).length}</strong> dúvidas abertas</div>
          </div>
          <button type="button" class="btn" @click=${this.csv}>Exportar CSV</button>
        </section>

        <section class="card">
          <h2>Usuários e últimas atividades</h2>
          <table>
            <thead><tr><th>E-mail</th><th>Role</th><th>Simulados</th><th>Média</th><th>Última atividade</th></tr></thead>
            <tbody>
              ${this.users.map(
                (u) => html`
                  <tr>
                    <td>${u.email || u.userId.slice(0, 8)}</td>
                    <td>${u.role}</td>
                    <td>${u.attempts}</td>
                    <td>${u.avgScore ?? '—'}</td>
                    <td title=${u.lastActivity}>${u.lastActivity ? u.lastActivity.slice(0, 16) : '—'}</td>
                  </tr>
                `,
              )}
            </tbody>
          </table>
        </section>

        <section class="card">
          <h2>Analytics por questão</h2>
          <p class="dim">← casos com menor precisão primeiro; distractor = opção errada mais escolhida.</p>
          <table>
            <thead><tr><th>Questão</th><th>Domínio</th><th>Troca</th><th>Acerto</th><th>Distractor</th><th>Erros por motivo</th></tr></thead>
            <tbody>
              ${this.qStats.slice(0, 60).map(
                (s) => html`
                  <tr>
                    <td>${s.questionId}</td>
                    <td>${this.label(s.domain)}</td>
                    <td>${s.attempts}</td>
                    <td>${s.pct}%</td>
                    <td>${s.distractor ? `${s.distractor.letter} (${s.distractor.count})` : '—'}</td>
                    <td class="tags">
                      ${
                        Object.entries(s.errorTags)
                          .map(([k, v]) => html`<span>${k}: ${v}</span>`)
                          .join(' · ') || '—'
                      }
                      ${s.needsReview ? html`<span class="review">⚠ revisar</span>` : ''}
                    </td>
                  </tr>
                `,
              )}
            </tbody>
          </table>
        </section>

        <section class="card">
          <h2>Fila de dúvidas</h2>
          ${
            this.doubts.length === 0
              ? html`<p class="dim">Nenhuma dúvida registrada.</p>`
              : html`<ol class="queue">
                  ${this.doubts.map(
                    (d) => html`
                      <li class="${d.resolved ? 'done' : ''}">
                        <strong>${d.questionId}</strong> · ${d.email}<br />
                        ${d.note || 'sem nota'}
                      </li>
                    `,
                  )}
                </ol>`
          }
        </section>
      </main>
    `
  }

  static styles = css`
    ${cardStyles}
    ${btnStyles}
    .card {
      margin-bottom: 16px;
    }
    h2 {
      margin: 0 0 12px;
      font-size: 18px;
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
      margin-bottom: 12px;
    }
    .kpi {
      background: var(--surface-raised);
      border-radius: var(--radius-sm);
      padding: 12px;
      text-align: center;
      font-size: 13px;
      color: var(--text-dim);
    }
    .kpi strong {
      display: block;
      font-size: 22px;
      color: var(--text);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th,
    td {
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    th {
      color: var(--text-dim);
      font-weight: 600;
    }
    .dim {
      color: var(--text-dim);
      margin: 0 0 8px;
    }
    .tags span {
      background: var(--surface-raised);
      border-radius: 4px;
      padding: 1px 6px;
      margin-right: 4px;
      white-space: nowrap;
    }
    .review {
      color: var(--warning);
    }
    .queue {
      margin: 0;
      padding-left: 20px;
      line-height: 1.7;
    }
    .queue .done {
      opacity: 0.6;
    }
    .err {
      color: var(--danger);
    }
  `
}
customElements.define('admin-panel', AdminPanel)
