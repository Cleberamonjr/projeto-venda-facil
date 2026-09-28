-- Luxi admin and beta hardening
-- Uses the current Lumi schema: vendas.vendida_em and lojas.criada_em.

create or replace function public.sou_admin_luxi()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email','')) in (
    'cleberamjr@gmail.com',
    'clebeamonjr@gmail.com',
    'clebernjr@outlook.com'
  );
$$;

revoke all on function public.sou_admin_luxi() from public;
grant execute on function public.sou_admin_luxi() to authenticated;

create or replace function public.email_liberado_beta(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.acessos_beta
    where lower(email) = lower(trim(p_email))
      and coalesce(ativo, false) = true
      and coalesce(expira_em, now()) > now()
  );
$$;

revoke all on function public.email_liberado_beta(text) from public;
grant execute on function public.email_liberado_beta(text) to anon, authenticated;

create or replace function public.liberar_beta(
  p_email text,
  p_dias integer default 30,
  p_plano text default 'crescimento',
  p_obs text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.acessos_beta;
begin
  if not public.sou_admin_luxi() then
    raise exception 'Acesso administrativo negado';
  end if;
  if nullif(trim(p_email), '') is null then
    raise exception 'E-mail obrigatório';
  end if;
  if p_dias < 1 or p_dias > 365 then
    raise exception 'Dias deve estar entre 1 e 365';
  end if;

  insert into public.acessos_beta (email, plano, dias, expira_em, obs, ativo, usado)
  values (lower(trim(p_email)), 'beta', p_dias,
          now() + (p_dias || ' days')::interval, p_obs, true, false)
  on conflict (email) do update
    set plano = 'beta',
        dias = excluded.dias,
        expira_em = excluded.expira_em,
        obs = coalesce(excluded.obs, public.acessos_beta.obs),
        ativo = true,
        usado = false,
        usado_em = null
  returning * into r;

  return to_jsonb(r);
end;
$$;

revoke all on function public.liberar_beta(text, integer, text, text) from public;
grant execute on function public.liberar_beta(text, integer, text, text) to authenticated;

create or replace function public.revogar_beta(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.sou_admin_luxi() then
    raise exception 'Acesso administrativo negado';
  end if;
  update public.acessos_beta
     set ativo = false
   where lower(email) = lower(trim(p_email));
end;
$$;

revoke all on function public.revogar_beta(text) from public;
grant execute on function public.revogar_beta(text) to authenticated;

revoke all on public.acessos_beta from anon, authenticated;
grant select on public.acessos_beta to authenticated;
drop policy if exists acessos_beta_admin_select on public.acessos_beta;
create policy acessos_beta_admin_select
  on public.acessos_beta for select to authenticated
  using (public.sou_admin_luxi());

create or replace function public.dados_admin_luxi()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lojas integer;
  v_lojas_ativas integer;
  v_clientes integer;
  v_estoque bigint;
  v_vendas_mes numeric;
  v_inadimplentes integer;
  v_trial integer;
  v_beta integer;
  v_mrr numeric;
  v_total integer;
  v_assinaturas jsonb;
begin
  if not public.sou_admin_luxi() then
    raise exception 'Acesso administrativo negado';
  end if;

  select count(*) into v_lojas from public.lojas;
  select count(*) into v_lojas_ativas
    from public.assinaturas
   where status in ('ativa', 'trial')
     and (status <> 'trial' or trial_ate is null or trial_ate > now());
  select count(*) into v_clientes from public.clientes;
  select coalesce(sum(qtd), 0) into v_estoque
    from public.pecas where coalesce(arquivada, false) = false;
  select coalesce(sum(valor_centavos), 0) / 100.0 into v_vendas_mes
    from public.vendas
   where vendida_em >= date_trunc('month', now());
  select count(*) into v_inadimplentes
    from public.assinaturas where coalesce(inadimplente, false) = true;
  select count(*) into v_trial
    from public.assinaturas
   where status = 'trial' and trial_ate > now();
  select count(*) into v_beta
    from public.acessos_beta
   where coalesce(ativo, false) = true and expira_em > now();
  select count(*) into v_total
    from public.assinaturas where status = 'ativa';
  select coalesce(sum(case plano
    when 'inicio' then 39.90
    when 'controle' then 69.90
    when 'crescimento' then 106.90
    when 'joalheria' then 179.90
    when 'inteligencia' then 299.90
    else 0 end), 0)
    into v_mrr
    from public.assinaturas
   where status = 'ativa' and (trial_ate is null or trial_ate <= now());

  select coalesce(jsonb_agg(x order by x.inicio desc), '[]'::jsonb)
    into v_assinaturas
    from (
      select a.id, l.nome as loja, a.plano, a.status,
        case when a.status = 'trial' and a.trial_ate > now() then 'beta' else 'pagante' end as tipo,
        coalesce(a.atualizada_em, l.criada_em, now()) as inicio,
        greatest(0, floor(extract(epoch from (now() - coalesce(a.atualizada_em, l.criada_em, now()))) / 86400))::integer as dias_ativos,
        (a.status in ('ativa', 'trial') and (a.status <> 'trial' or a.trial_ate is null or a.trial_ate > now())) as ativa
      from public.assinaturas a
      left join public.lojas l on l.id = a.loja_id
    ) x;

  return jsonb_build_object(
    'lojas', v_lojas,
    'lojas_ativas', v_lojas_ativas,
    'clientes', v_clientes,
    'estoque', v_estoque,
    'vendas_mes', v_vendas_mes,
    'inadimplentes', v_inadimplentes,
    'trial', v_trial,
    'beta_ativos', v_beta,
    'total', v_total,
    'mrr', v_mrr,
    'assinaturas_detalhes', v_assinaturas,
    'inicio', (select count(*) from public.assinaturas where plano = 'inicio' and status = 'ativa'),
    'controle', (select count(*) from public.assinaturas where plano = 'controle' and status = 'ativa'),
    'crescimento', (select count(*) from public.assinaturas where plano = 'crescimento' and status = 'ativa'),
    'joalheria', (select count(*) from public.assinaturas where plano = 'joalheria' and status = 'ativa'),
    'inteligencia', (select count(*) from public.assinaturas where plano = 'inteligencia' and status = 'ativa'),
    'livre', (select count(*) from public.assinaturas where plano = 'livre')
  );
end;
$$;

revoke all on function public.dados_admin_luxi() from public;
grant execute on function public.dados_admin_luxi() to authenticated;
