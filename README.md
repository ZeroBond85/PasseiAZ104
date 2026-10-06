# Passei AZ-104 🎯

> Passe no AZ-104 treinando de verdade: simulados iguais à prova, revisão no ritmo certo e guia com links oficiais da Microsoft. Grátis, funciona offline.

![Passei AZ-104](public/icons/source-logo.webp)

[![ci](https://github.com/ZeroBond85/PasseiAZ104/actions/workflows/ci.yml/badge.svg)](https://github.com/ZeroBond85/PasseiAZ104/actions/workflows/ci.yml)
[![deploy](https://github.com/ZeroBond85/PasseiAZ104/actions/workflows/deploy.yml/badge.svg)](https://github.com/ZeroBond85/PasseiAZ104/actions/workflows/deploy.yml)
[![security](https://github.com/ZeroBond85/PasseiAZ104/actions/workflows/security.yml/badge.svg)](https://github.com/ZeroBond85/PasseiAZ104/actions/workflows/security.yml)
[![perf](https://github.com/ZeroBond85/PasseiAZ104/actions/workflows/perf.yml/badge.svg)](https://github.com/ZeroBond85/PasseiAZ104/actions/workflows/perf.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**👉 Use agora:** https://zerobond85.github.io/PasseiAZ104/

![demonstração: respondendo questões no simulado](docs/screenshots/quiz.gif)

---

## O que é

Um app de estudos em **português (Brasil)** que simula a prova real (formato Pearson VUE), mostra **o que estudar** com links oficiais e usa **repetição espaçada (Leitner)** para fixar o conteúdo:

- **Simulado oficial** — 50 questões em 100 minutos, nota de 0–1000, aprovado com ≥700
- **Simulado dinâmico** — sempre diferente, mesmas proporções da prova
- **Study Hub** — domínios fracos + links Microsoft Learn priorizados + 🎯 Treinar meus erros
- **Revisão espaçada** — caixas 1/2/4/8/16 dias; o app cobra primeiro o que você mais erra
- **Treino por domínio** — 20 questões focadas, com pausa
- **Funciona offline** — baixa o banco uma vez, estuda sem internet (PWA instalável)
- **Login + sync** — entra com link mágico no e-mail e continua de onde parou em outro dispositivo (Supabase free, offline-first mantido); ou use sem conta (modo local)
- **Teclado + toque** — `1–4` responde, `←/→` navega, `⚑` marca para revisão
- **Tema escuro/claro** — escuro por padrão, preferência salva

![home](docs/screenshots/home-desktop.png)
![quiz no celular](docs/screenshots/quiz-mobile.png)

## Banco de questões

**1000 questões autorais em PT-BR** (a prova oficial existe em Português (Brasil) — este portal foi feito para ela), com explicação do porquê de cada erro, distribuídas como a prova:

| Domínio | Questões |
|---|---|
| Identidade e Governança (20–25%) | 243 |
| Storage (15–20%) | 180 |
| Compute (20–25%) | 243 |
| Rede Virtual (15–20%) | 184 |
| Monitoramento (10–15%) | 150 |

Tipos: escolha única (60%) · múltipla escolha (20%) · case study (15%, em blocos) · sim/não (5%).
Níveis: fácil 20% · médio 50% · difícil 30%.

Cada questão passa por validação automática (schema + regras por tipo + anti-duplicata) antes de entrar no banco.

Procedência: questões **elaboradas em PT-BR** a partir de simulados, cursos especializados
e da documentação oficial da Microsoft, mapeadas 1:1 para o outline oficial vigente
(skills 17/04/2026 — `syllabus-gap` prova cobertura total, sem gaps).
Não são cópias de questões da prova.

**Estado do ancoramento (honesto):** hoje **472 das 1000** questões têm `sourceUrl`
individual apontando para uma página específica da documentação oficial em PT-BR
(todas vivas — `npm run grounding:probe` 135/135 URLs do mapa). As outras 528
estão mapeadas 1:1 para o outline oficial, mas ainda sem `sourceUrl` individual. As explicações e o Study Hub apontam para a documentação oficial; os links
"estudar depois" só ficam completos quando o ancoramento das 528 fechar.

Dessas 51, a revisão factual de 2026-10-02 leu **uma a uma na fonte**: **49 confirmadas** e
**2 corrigidas** (uma ensinava um recurso já aposentado — logs de fluxo do NSG — e outra estava
ancorada na página errada). Das 9 que ficaram com lacuna declarada, nenhuma foi aprovada com
Gibraltar nem trocada por um link qualquer: **6 ganharam âncora nova** depois de leitura da
fonte e **3 se revelaram certas na página que já tinham** — o veredito_lexical é só uma
aproximação, e ele reprovou âncoras boas e deixou passar outras.

O mapa de âncoras por skill (82/82) tem verificação de duas naturezas: `grounding:probe` confere
que a URL responde 200 em PT-BR, e `npm run grounding:audit` confere que a página **é mesmo sobre o
que o bullet diz** — o vocabulário do bullet precisa aparecer no título da página, não só no corpo.
As duas são o que impede "link válido, assunto errado", que é o erro mais caro aqui porque passa
invisível até alguém estudar pelo link errado.

## Como estudar (rotina sugerida)

1. **15 min de Revisão** (o app já prioriza a Caixa 1)
2. **Bloco de 30–40 questões** no Simulado
3. **Errou → lê a explicação** (ela diz por que cada alternativa errada está errada)
4. **Abra o Study Hub** (aba Estudo) e siga os links oficiais dos seus pontos fracos

**Quando marcar a prova:** média dos últimos 5 simulados ≥750 **e** nenhum domínio <70% **e** Caixa 1 com <10 cards. Detalhes em `docs/STUDY-PLAN.md` e `TUTOR.md`.

## Rodando localmente

Pré-requisitos: Node 24 (via `nvm`), Git. Todo o fluxo foi feito no **WSL Debian** (ver `docs/wsl-environment.md`).

```bash
git clone https://github.com/ZeroBond85/PasseiAZ104.git
cd PasseiAZ104
npm ci
npm run dev        # ambiente de desenvolvimento
```

```bash
npm run lint       # Biome (formato + regras)
npm run build      # tsc + build de produção
npm run test       # Vitest (unit + integração)
npm run validate   # valida as 1000 questões (schema + unicidade + dedup)
npm run ci         # tudo acima, em sequência
npx playwright test  # e2e no navegador (quiz, offline, acessibilidade)
```

## Estrutura

```
├── PLAN.md / PLAN-3.md / LOG.md / LESSONS.md  # planos, diário e lições
├── AGENTS.md / REGRAS.md           # instruções operacionais
├── docs/                           # arquitetura, componentes, testes, estudo, deploy, API, troubleshooting, roadmap
├── src/
│   ├── engine/   # Quiz, Timer, Scoring (determinístico), Leitner, Selector, IRT, schemas Zod
│   ├── controllers/  # Quiz, Treino, Sync, Drill (classes puras, sem DOM)
│   ├── analytics/  # heatmap + distratores
│   ├── study/    # topics, hub, profile + flags
│   ├── sync/     # IndexedDB (sessões, progresso, questões) + Supabase (auth, SyncEngine espelho)
│   ├── data/     # carregador fetch → SW cache → IDB (bundle nunca embute o banco)
│   └── components/  # Lit sem decorators: shell, login, questão, timer, navegador, revisão, stats, tema, usuário, hub
├── data/         # banco particionado por subdomínio (≤200KB/arquivo) + 10 simulados + meta + topics + syllabus
├── scripts/      # validate, generate (IA), new-question, check-model, build-simulados, import-community, curadoria
├── supabase/migrations/  # 001 tabelas+RLS · 002 plataforma+admin · 003 self-update · 004 study hub
└── tests/        # unit, integração, e2e (Playwright + axe)
```

## Qualidade (números verificáveis)

- `npm run ci` verde: lint (Biome) + `tsc` + 134 testes unit + validate 1000/0
- e2e (17 specs): quiz fim-a-fim, treino (sem `alert`), offline (IDB + SW cache), tema/flags/timer, **axe 0 violações**
- Lighthouse ≥90/90/90 (perf/a11y/boas práticas) · JS 125.8KB/teto 140KB gzip
- Hooks: pre-commit <10s (segredos, lint, tamanho) · pre-push roda o CI completo
- Segurança: `.env` nunca commitado (gitleaks), senha Postgres nunca em chat/repo, RLS como fronteira, CSP via meta tag
- Curadoria mensal automática: links MS Learn, banco, outline oficial + backup semanal

## Contribuindo

Leia `CONTRIBUTING.md`, `REGRAS.md` e `docs/QUESTION-GUIDELINES.md`. Resumo: questão nova via `npx tsx scripts/new-question.mts` + checklist de qualidade + `validate` limpo; falha no CI vira teste de regressão + lição no `LESSONS.md`.

## Onde reportar

- **Erro em questão ou regressão no app** → abra uma [Issue](https://github.com/ZeroBond85/PasseiAZ104/issues) (falha no CI vira teste de regressão + lição no `LESSONS.md`).
- **Dúvida de estudo ou estratégia de prova** → use as [Discussions](https://github.com/ZeroBond85/PasseiAZ104/discussions).
- **Problema de segurança** → reporte em privado (ver `SECURITY.md`); nunca publique segredo em Issue, PR ou chat.

## Para quem é

Para quem vai fazer a **prova oficial AZ-104 em português** (Microsoft Azure Administrator
Associate): simulado no formato real da prova, 1000 questões em PT-BR, revisão espaçada,
guia de estudo com links oficiais da Microsoft — e um painel que mostra quando você
está pronto para marcar a prova. Grátis e offline.

## Créditos

Questões autorais em PT-BR (não são cópias da prova), ancoradas na [documentação oficial da Microsoft](https://learn.microsoft.com/pt-br/azure/). Feito com componentes [Lit](https://lit.dev/) (MIT), build [Vite](https://vite.dev/) (MIT), auth/sync [Supabase](https://supabase.com/) (Apache-2.0), testes [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) (ambos MIT/Apache-2.0) e lint [Biome](https://biomejs.dev/) (MIT). Ver `LICENSE`.

## Licença

MIT — ver `LICENSE`. Feito para estudar e passar. Boa prova! 🚀

[![Star History](https://api.star-history.com/svg?repos=ZeroBond85/PasseiAZ104&type=date)](https://star-history.com/#ZeroBond85/PasseiAZ104&date)
