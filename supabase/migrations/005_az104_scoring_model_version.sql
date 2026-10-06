-- 005_az104_scoring_model_version.sql
--
-- Gate 1.4 (PLAN-9): o modelo de pontuação mudou e o resultado é PERSISTIDO.
-- Até aqui `score` e `by_domain` gravados não carregavam de qual modelo
-- vieram, então uma média de prontidão podia somar notas de dois modelos
-- incompatíveis: crédito parcial (w×k/n) + peso por dificuldade antes; 1 ponto
-- por item + múltipla tudo-ou-nada agora.
--
-- Decisão R1(b): não fazemos backfill. Reetiquetar nota antiga com o modelo
-- novo seria inventar resultado. Registramos a versão para que a leitura possa
-- dizer "isto veio do modelo 1" em vez de mentir em silêncio.
--
-- 1 = crédito parcial + peso por dificuldade (legacy, até 2026-10-06)
-- 2 = 1 ponto por item + múltipla tudo-ou-nada (ATUAL, ScoringEngine.ts)

alter table public.az104_attempts
  add column if not exists scoring_model_version int not null default 1;

comment on column public.az104_attempts.scoring_model_version is
  'Modelo de pontuação: 1=credito parcial+peso por dificuldade (legacy), 2=1 ponto por item e multipla tudo-ou-nada. Nao faz backfill: registros antigos continuam 1 de proposito.';

-- Backfill apenas do DEFAULT para linhas novas: a coluna já nasce em 1, que é
-- o valor correto para todo histórico existente. Tentativas novas mandam 2
-- explicitamente via SyncEngine.
update public.az104_attempts
   set scoring_model_version = 1
 where scoring_model_version is null;