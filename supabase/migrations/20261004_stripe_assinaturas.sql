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
-- Aplica UM evento (já com assinatura conferida pela função de borda). Atômica: se der erro, o evento NÃO fica marcado e a Stripe tenta de novo.
create or replace function public.stripe_aplicar(p_evento text, p_tipo text, p jsonb) returns text
language plpgsql volatile security definer set search_path = public as $f$
declare
  v_loja uuid; v_plano plano_tipo; v_cliente text := nullif(p->>'cliente',''); v_assin text := nullif(p->>'assinatura','');
  v_prox date := null; v_ass assinaturas; v_n int; v_estado text;
begin
  if p_evento is null or p_evento !~ '^evt_[A-Za-z0-9_]{4,120}$' then raise exception 'evento inválido'; end if;
  if p_tipo is null or length(p_tipo) > 80 then raise exception 'tipo inválido'; end if;

  insert into stripe_eventos(id, tipo) values (p_evento, p_tipo) on conflict (id) do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then return 'repetido'; end if;

  if coalesce(p->>'proxima','') ~ '^\d{4}-\d{2}-\d{2}$' then v_prox := (p->>'proxima')::date; end if;

  if p_tipo = 'checkout.session.completed' then
    begin v_loja := (p->>'loja_id')::uuid; exception when others then v_loja := null; end;
    if v_loja is null or not exists (select 1 from lojas where id = v_loja) then return 'ignorado:sem_loja'; end if;
    if p->>'plano' is null or p->>'plano' not in ('inicio','crescimento') then raise exception 'plano inválido'; end if;
    if v_cliente is null or v_assin is null then raise exception 'cliente/assinatura ausentes'; end if;
    v_plano := (p->>'plano')::plano_tipo;
    update assinaturas
       set plano = v_plano, status = 'ativa', gateway = 'stripe', gateway_cliente = v_cliente, gateway_assinatura = v_assin,
           atraso_desde = null, cancelada_em = null, atualizada_em = now()
     where loja_id = v_loja;
    if not found then
      insert into assinaturas(loja_id, plano, status, gateway, gateway_cliente, gateway_assinatura)
      values (v_loja, v_plano, 'ativa', 'stripe', v_cliente, v_assin);
    end if;
    return 'ativada';
  end if;

  -- os demais eventos chegam só com o cliente/assinatura da Stripe: acha a loja por eles
  select * into v_ass from assinaturas
   where gateway = 'stripe'
     and ((v_assin is not null and gateway_assinatura = v_assin) or (v_assin is null and v_cliente is not null and gateway_cliente = v_cliente))
   limit 1;
  if not found then return 'ignorado:sem_assinatura'; end if;

  -- "cancelada" é terminal para eventos antigos ou fora de ordem; só uma nova compra (checkout) reativa
  if p_tipo = 'invoice.paid' then
    if v_ass.status = 'cancelada' then return 'ignorado:cancelada'; end if;
    update assinaturas set status = 'ativa', atraso_desde = null, proxima_cobranca = coalesce(v_prox, proxima_cobranca), atualizada_em = now() where id = v_ass.id;
    return 'paga';
  elsif p_tipo = 'invoice.payment_failed' then
    if v_ass.status in ('cancelada','livre') then return 'ignorado:' || v_ass.status; end if;
    update assinaturas set status = 'atrasada', atraso_desde = coalesce(atraso_desde, now()), atualizada_em = now() where id = v_ass.id;
    return 'atrasada';
  elsif p_tipo = 'customer.subscription.deleted' then
    update assinaturas set status = 'cancelada', cancelada_em = coalesce(cancelada_em, now()), atualizada_em = now() where id = v_ass.id;
    return 'cancelada';
  elsif p_tipo = 'customer.subscription.updated' then
    v_estado := p->>'status';
    if v_ass.status = 'cancelada' then return 'ignorado:cancelada'; end if;
    if v_estado in ('active','trialing') then
      update assinaturas set status = 'ativa', atraso_desde = null, proxima_cobranca = coalesce(v_prox, proxima_cobranca), atualizada_em = now() where id = v_ass.id;
      return 'ativa';
    elsif v_estado = 'past_due' then
      update assinaturas set status = 'atrasada', atraso_desde = coalesce(atraso_desde, now()), atualizada_em = now() where id = v_ass.id;
      return 'atrasada';
    elsif v_estado in ('canceled','unpaid','incomplete_expired') then
      update assinaturas set status = 'cancelada', cancelada_em = coalesce(cancelada_em, now()), atualizada_em = now() where id = v_ass.id;
      return 'cancelada';
    end if;
    return 'ignorado:estado';
  end if;
  return 'ignorado:tipo';
end $f$;
revoke all on function public.stripe_aplicar(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.stripe_aplicar(text, text, jsonb) to service_role;
