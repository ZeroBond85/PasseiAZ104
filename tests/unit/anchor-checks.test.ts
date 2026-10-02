import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import {
  classifyPage,
  isSoft404,
  keyTerms,
  mapUrls,
  termCoverage,
} from '../../scripts/lib/anchor-probe.mjs'

/**
 * Estes testes existem porque "o script rodou e não reclamou" não é prova de
 * nada. Cada caso abaixo é um erro que **realmente aconteceu** neste projeto,
 * ou o modo como ele escaparia. O gate só vale se reprovar o erro conhecido.
 */

const page = (over: Record<string, unknown> = {}) => ({
  url: 'https://learn.microsoft.com/pt-br/azure/storage/blobs/object-replication-overview',
  finalUrl:
    'https://learn.microsoft.com/pt-br/azure/storage/blobs/object-replication-overview',
  status: 200,
  title: 'Visão geral da replicação de objeto - Azure Storage',
  h1: 'Visão geral da replicação de objeto',
  desc: 'A replicação de objeto sincroniza dados entre contêineres.',
  text: 'a replicacao de objeto sincroniza blobs entre contas de armazenamento',
  ...over,
})

/** Tipo do mapa, sem `any` (o lint barra `any` explícito). */
type BulletEntry = { url?: string; extraUrls?: string[] }
const bulletsOf = (map: unknown): Record<string, BulletEntry> =>
  (map as { bullets?: Record<string, BulletEntry> }).bullets ?? {}

describe('classifyPage — vivacidade', () => {
  it('aceita uma página viva em PT-BR', () => {
    expect(classifyPage(page()).ok).toBe(true)
  })

  it('reprova status não-200', () => {
    const r = classifyPage(page({ status: 404 }))
    expect(r.ok).toBe(false)
    expect(r.reasons.join()).toMatch(/status 404/)
  })

  it('reprova redirect que caiu para EN-US', () => {
    const r = classifyPage(
      page({
        finalUrl: 'https://learn.microsoft.com/en-us/azure/storage/blobs/x',
      }),
    )
    expect(r.ok).toBe(false)
    expect(r.reasons.join()).toMatch(/EN-US/)
  })

  it('reprova URL fora do Learn PT-BR, mesmo respondendo 200', () => {
    const r = classifyPage(
      page({
        url: 'https://example.com/pt-br/azure/x',
        finalUrl: 'https://example.com/pt-br/azure/x',
      }),
    )
    expect(r.ok).toBe(false)
    expect(r.reasons.join()).toMatch(/fora do Learn PT-BR/)
  })
})

describe('soft-404 — o caso perigoso: 200 com página de "não encontrei"', () => {
  it('detecta o título "404 - Page not found" em resposta 200', () => {
    expect(isSoft404({ title: '404 - Page not found - Microsoft Learn' })).toBe(
      true,
    )
    expect(
      classifyPage(page({ title: '404 - Page not found - Microsoft Learn' }))
        .ok,
    ).toBe(false)
  })

  it('detecta a variante PT-BR', () => {
    expect(
      isSoft404({ title: 'Página não encontrada - Microsoft Learn' }),
    ).toBe(true)
  })

  it('detecta pelo corpo quando o título é genérico', () => {
    expect(
      isSoft404({
        title: 'Microsoft Learn',
        text: "We couldn't find that page.",
      }),
    ).toBe(true)
  })

  it('NÃO acusa página cuja matéria é o número 404 (App Gateway)', () => {
    // Existe documentação real sobre "páginas de erro 404 personalizadas".
    // Casar "404" em qualquer lugar reprovaria âncora boa.
    const r = classifyPage(
      page({
        title:
          'Configurar páginas de erro 404 personalizadas - Microsoft Azure App Gateway',
        h1: 'Configurar páginas de erro 404 personalizadas',
      }),
    )
    expect(r.ok).toBe(true)
  })
})

describe('termCoverage — a página é sobre o que o bullet diz?', () => {
  it('reprova o erro real: replicação de objeto em redundância, mesmo com a descrição citando "replicados"', () => {
    // Situação real do st-accounts#3 antes da correção: a página era
    // storage-redundancy, que é LRS/GRS e não fala de replicação de objeto.
    const c = termCoverage('Configurar a replicação de objeto', {
      title: 'Visão geral da redundância do Armazenamento do Azure',
      h1: 'Visão geral da redundância',
      desc: 'A redundância garante que os dados sejam replicados com LRS ou GRS.',
      text: 'redancia lrs grs zrs replicacao geografica',
    })
    // A descrição da redundância CITA "replicados" — se a checagem olhasse a
    // descrição, o bug real passaria. Por isso só o título reprova.
    expect(c.inDesc).toContain('replic')
    expect(c.inTitle).not.toContain('replic')
  })

  it('aceita a página certa para o mesmo bullet', () => {
    const c = termCoverage('Configurar a replicação de objeto', page())
    expect(c.inTitle).toContain('replic')
  })

  it('casa singular/plural e flexão PT-BR por radical', () => {
    // Falso positivo da v1: "usuários externos" x "ID Externa" dava 0/2.
    const c = termCoverage('Gerenciar usuários externos', {
      title: 'Introdução à ID Externa do Microsoft Entra',
      h1: 'Introdução à ID Externa do Microsoft Entra',
      desc: '',
      text: 'identidade externa b2b',
    })
    expect(c.inTitle).toContain('extern')
  })

  it('descarta verbo de ação genérico do vocabulário do bullet', () => {
    expect(
      keyTerms('Criar e configurar redes virtuais e sub-redes'),
    ).not.toContain('criar')
    expect(keyTerms('Interpretar atribuições de acesso')).not.toContain(
      'interpret',
    )
  })

  it('mede cobertura do corpo separadamente da do título', () => {
    // Página certa com cobertura de título baixa é só paráfrase: não é suspeito.
    const c = termCoverage(
      'Configurar o soft delete para blobs e contêineres',
      {
        title: 'Exclusão reversível para blobs',
        h1: 'Exclusão reversível para blobs',
        desc: '',
        text: 'soft delete blob contenedor recuperacao',
      },
    )
    expect(c.titleCov).toBeLessThan(1)
    expect(c.bodyCov).toBeGreaterThan(0)
  })
})

describe('invariantes do grounding-map', () => {
  const { urls } = mapUrls()

  it('toda URL do mapa é do Learn PT-BR', () => {
    const fora = urls.filter(
      (u) => !u.url.startsWith('https://learn.microsoft.com/pt-br/'),
    )
    expect(fora.map((u) => `${u.bullet}: ${u.url}`)).toEqual([])
  })

  it('todo bullet tem URL primária', () => {
    const semPrimaria = urls.filter((u) => u.role === 'primary')
    expect(semPrimaria.length).toBeGreaterThan(0)
    expect(new Set(semPrimaria.map((u) => u.bullet)).size).toBe(
      semPrimaria.length,
    )
  })

  it('nenhum extraUrl repete a própria URL primária do bullet', () => {
    // Invariante que o fill impõe na escrita; se ninguém reescrever o mapa à mão,
    // segue valendo fora do fill também.
    const { map } = mapUrls()
    const sujos: string[] = []
    for (const [bullet, e] of Object.entries(bulletsOf(map))) {
      for (const u of e.extraUrls ?? [])
        if (u === e.url) sujos.push(`${bullet}: ${u}`)
    }
    expect(sujos).toEqual([])
  })

  it('nenhum extraUrl se repete dentro do mesmo bullet', () => {
    const { map } = mapUrls()
    const sujos: string[] = []
    for (const [bullet, e] of Object.entries(bulletsOf(map))) {
      const lista = e.extraUrls ?? []
      if (new Set(lista).size !== lista.length) sujos.push(bullet)
    }
    expect(sujos).toEqual([])
  })
})

describe('exceções da auditoria de âncoras', () => {
  const arquivo = new URL(
    '../../scripts/audit-anchor-semantics.mjs',
    import.meta.url,
  )

  /** Cada chave de KNOWN_EXCEPTIONS com o texto da sua justificativa. */
  async function pares() {
    const src = await readFile(arquivo, 'utf8')
    const bloco = src.slice(
      src.indexOf('const KNOWN_EXCEPTIONS'),
      src.indexOf('const noCache'),
    )
    return [
      ...bloco.matchAll(
        /'([a-z0-9-]+#\d+)':\s*([\s\S]*?)(?=\n\s*'[a-z0-9-]+#\d+'?:|\n\})/g,
      ),
    ].map((m) => [m[1], m[2]])
  }

  it('toda exceção tem justificativa que cita a evidência', async () => {
    // Sem isto, KNOWN_EXCEPTIONS é só o lugar de silenciar o gate: alguém
    // adiciona o bullet errado e a auditoria fica verde sem ninguém decidir.
    const lista = await pares()
    expect(lista.length).toBeGreaterThan(0)
    for (const [chave, texto] of lista) {
      // justificativa de verdade: precisa citar o slug, o status ou o título
      // que sustenta a exceção — não só dizer que "está correto". O padrão é
      // propositalmente genérico (um slug real, um 404, um 301, um título), e
      // não uma lista das exceções já conhecidas: enumerar os textos Makes o
      // gate passar automático na exceção nova, que é o que ele existe pra
      // impedir.
      expect(texto.length, `${chave} sem justificativa`).toBeGreaterThan(80)
      // O texto é lido como está: um slug partido em duas linhas pela quebra do
      // prettier (`virtual-networks-\nudr-overview`) continua sendo evidência,
      // então o padrão casa com um fragmento de path com OU sem barra.
      expect(texto, `${chave} sem evidência`).toMatch(
        /[a-z0-9]+[/-][a-z0-9-]+[/-]?[a-z0-9-]+|30[13]|\b404\b|Roteamento de tráfego|operador render/,
      )
    }
  })

  it('toda exceção aponta para um bullet que existe no mapa', async () => {
    const { map } = mapUrls()
    const existentes = Object.keys(map.bullets)
    for (const [chave] of await pares()) {
      expect(existentes).toContain(chave)
    }
  })
})
