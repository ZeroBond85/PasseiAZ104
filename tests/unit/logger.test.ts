import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearLogs,
  debugEnabled,
  getRecentLogs,
  logger,
  sanitize,
} from '../../src/utils/logger.js'

describe('logger', () => {
  beforeEach(() => clearLogs())

  it('sanitize mascara e-mail, JWT e segredos', () => {
    expect(sanitize('contato zerobond@gmail.com aqui')).toBe(
      'contato [email] aqui',
    )
    expect(sanitize('bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig')).toBe(
      'bearer [token]',
    )
    expect(sanitize('api_key=xsmtpsib-abc123')).toBe('api_key=[redacted]')
    expect(sanitize({ email: 'a@b.com', n: 3 })).toEqual({
      email: '[email]',
      n: 3,
    })
    const err = sanitize(new Error('falha zerobond@gmail.com'))
    expect(err).toEqual({ name: 'Error', message: 'falha [email]' })
  })

  it('buffer guarda últimos 200 e retorna cópia', () => {
    for (let i = 0; i < 210; i++) logger.info('ui', `m${i}`)
    const logs = getRecentLogs()
    expect(logs).toHaveLength(200)
    expect(logs[0].msg).toBe('m10')
    expect(logs[199].msg).toBe('m209')
    logs.push({ t: 0, level: 'info', scope: 'ui', msg: 'x' })
    expect(getRecentLogs()).toHaveLength(200)
  })

  it('debugEnabled é booleano sem DOM', () => {
    expect(typeof debugEnabled()).toBe('boolean')
  })

  it('níveis gravam scope+msg no buffer', () => {
    logger.warn('sync', 'quase lá', { role: 'user' })
    logger.error('auth', 'quebrou')
    const logs = getRecentLogs()
    expect(logs.map((l) => [l.level, l.scope, l.msg])).toEqual([
      ['warn', 'sync', 'quase lá'],
      ['error', 'auth', 'quebrou'],
    ])
    expect(logs[0].data).toEqual({ role: 'user' })
  })
})
