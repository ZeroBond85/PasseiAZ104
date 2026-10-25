# SECURITY.md — PasseiAZ-104

> Modelo real (v6.0+): Supabase free + RLS como fronteira; app continua $0 e offline-first.

- **Segredos:** nunca commitados (gitleaks no CI + pre-commit que bloqueia `.env` e padrões
  `sk-`/`AIza`/`ghp_`). `GEMINI_API_KEY` só em `.env` local, só em `scripts/` (nunca no bundle,
  nunca com prefixo `VITE_`). `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` via GitHub Secrets
  (deploy verifica que o env foi embutido; anon é pública por design).
- **Banco:** senha Postgres **nunca** em chat/repo/env (incidente LESSONS 11/set/2026 — rotacionada;
  app desenhado para nunca precisar dela; migrations via SQL Editor pelo dono).
- **Autorização:** RLS `auth.uid() = user_id` em tudo; admin via `az104_is_admin()` SECURITY DEFINER
  (leitura + escrita de role em `az104_profiles`, auditada por trigger `az104_profiles_role_audit`).
  Aba Admin é só UX.
- **Defesa em profundidade:** CSP via meta tag (`script-src 'self'`, `connect-src` host exato do
  Supabase `yktrozpeablbafdagxtg.supabase.co` + `base-uri 'none'; form-action 'none'`);
  SRI avaliado e descartado com motivo (zero sub-recursos third-party; quebraria precache — LESSONS).
- **Reporte:** abra uma issue privada no GitHub com `[security]` no título. Não publique exploit antes de correção.
- **Dependências:** `npm audit` mensal via `dependency-audit.yml` → `.agent/audits/`.
