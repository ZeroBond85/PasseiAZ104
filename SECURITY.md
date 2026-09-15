# SECURITY.md — PasseiAZ-104

> App 100% client-side, custo $0, sem backend até a Fase 4.

- **Segredos:** nunca commitados (gitleaks no CI + pre-commit). `GEMINI_API_KEY` só em `.env` local, só usada em `scripts/` (nunca no bundle, nunca com prefixo `VITE_`).
- **Dados do usuário:** ficam no IndexedDB do próprio navegador; nada sai do dispositivo.
- **Reporte:** abra uma issue privada no GitHub com `[security]` no título. Não publique exploit antes de correção.
- **Dependências:** `npm audit` mensal via `dependency-audit.yml` → `.agent/audits/`.
