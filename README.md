# Passei AZ-104 🎯

> Simulado + revisão espaçada para o exame **Microsoft AZ-104** — 50 questões / 100 min / corte 700.
> PWA offline-first, custo **$0**. Sem conta, sem backend: seu progresso fica no seu navegador.

![logo](public/icons/source.png)

[![ci](https://github.com/ZeroBond85/PasseiAZ104/actions/workflows/ci.yml/badge.svg)](https://github.com/ZeroBond85/PasseiAZ104/actions/workflows/ci.yml)
[![deploy](https://github.com/ZeroBond85/PasseiAZ104/actions/workflows/deploy.yml/badge.svg)](https://github.com/ZeroBond85/PasseiAZ104/actions/workflows/deploy.yml)

**👉 Use agora:** https://zerobond85.github.io/PasseiAZ104/

---

## O que é

Um app de estudos que simula a prova real (formato Pearson VUE) e usa **repetição espaçada (Leitner)** para fixar o conteúdo:

- **Simulado oficial** — 50 questões em 100 minutos, nota de 0–1000, aprovado com ≥700
- **Correção por domínio** — breakdown com % por área + pontos fracos (<70%)
- **Revisão espaçada** — caixas 1/2/4/8/16 dias; o app cobra primeiro o que você mais erra
- **Funciona offline** — baixa o banco uma vez, estuda sem internet (PWA instalável)
- **Teclado + toque** — `1–4` responde, `←/→` navega, `⚑` marca para revisão
- **Tema escuro/claro** — escuro por padrão, preferência salva

## Banco de questões

**950 questões validadas** (PT-BR, com explicação do porquê de cada erro), distribuídas como a prova:

| Domínio | Questões |
|---|---|
| Identidade e Governança (20–25%) | 230 |
| Storage (15–20%) | 170 |
| Compute (20–25%) | 230 |
| Rede Virtual (15–20%) | 175 |
| Monitoramento (10–15%) | 145 |

Tipos: escolha única (60%) · múltipla escolha (20%) · case study (15%, em blocos) · sim/não (5%).
Níveis: fácil 20% · médio 50% · difícil 30%.

Cada questão passa por validação automática (schema + regras por tipo + anti-duplicata) antes de entrar no banco.

## Como estudar (rotina sugerida)

1. **15 min de Revisão** (o app já prioriza a Caixa 1)
2. **Bloco de 30–40 questões** no Simulado
3. **Errou → lê a explicação** (ela diz por que cada alternativa errada está errada)

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
npm run validate   # valida as 950 questões (schema + unicidade + dedup)
npm run ci         # tudo acima, em sequência
npx playwright test  # e2e no navegador (quiz, offline, acessibilidade)
```

## Estrutura

```
├── PLAN.md / LOG.md / LESSONS.md   # plano, diário e lições (gates mandam, sem prazo)
├── AGENTS.md / REGRAS.md           # instruções operacionais
├── docs/                           # arquitetura, estudo, deploy, API, troubleshooting, roadmap
├── src/
│   ├── engine/   # Quiz, Timer, Scoring (determinístico), Leitner, Selector, schemas Zod
│   ├── sync/     # IndexedDB (sessões, progresso, questões)
│   ├── data/     # carregador fetch → precache → IDB (bundle nunca embute o banco)
│   └── components/  # Lit sem decorators: shell, questão, timer, navegador, revisão, stats, tema
├── data/         # banco particionado por subdomínio (≤200KB/arquivo) + 10 simulados + meta
├── scripts/      # validate, generate (IA), check-model, build-simulados, import-community
└── tests/        # unit, integração, e2e (Playwright + axe)
```

## Qualidade (números verificáveis)

- `npm run ci` verde: lint (Biome) + `tsc` + 31 testes + validate 950/0
- e2e: quiz fim-a-fim, offline (kill-server via IDB), tema/flags/timer, **axe 0 violações**
- Lighthouse ≥90/90/90 (perf/a11y/boas práticas)
- Hooks: pre-commit <10s (segredos, lint, tamanho) · pre-push roda o CI completo
- Segurança: `.env` nunca commitado (gitleaks), segredos só em `scripts/`, sem backend

## Contribuindo

Leia `CONTRIBUTING.md`, `REGRAS.md` e `docs/QUESTION-GUIDELINES.md`. Resumo: questão nova só entra cumprindo o checklist de qualidade + `validate` limpo; falha no CI vira teste de regressão + lição no `LESSONS.md`.

## Licença

MIT — ver `LICENSE`. Feito para estudar e passar. Boa prova! 🚀
