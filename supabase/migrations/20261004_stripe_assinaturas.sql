-- Cobrança via Stripe (aplicada em produção em 04/10/2026). A tabela `assinaturas` já previa um gateway
-- (gateway, gateway_cliente, gateway_assinatura, proxima_cobranca, atraso_desde): faltava (1) não aplicar o mesmo evento duas vezes
-- e (2) uma função que traduz o evento da Stripe em estado. Só service_role executa.
create table if not exists public.stripe_eventos (
  id text primary key,
  tipo text not null,
  recebido_em timestamptz not null default now()
);
alter table public.stripe_eventos enable row level security;
revoke all on table public.stripe_eventos from public, anon, authenticated;
-- A função public.stripe_aplicar(p_evento text, p_tipo text, p jsonb) é a aplicada na migração "stripe_assinaturas":
-- consulte `select pg_get_functiondef('public.stripe_aplicar(text,text,jsonb)'::regprocedure)` para o texto exato.
revoke all on function public.stripe_aplicar(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.stripe_aplicar(text, text, jsonb) to service_role;
