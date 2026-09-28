-- Luxi admin hardening
-- Apply in Supabase SQL Editor after reviewing the project schema.
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
  v_estoque integer;
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
    where status in ('ativa','ativo','trial')
      and (status <> 'trial' or trial_ate is null or trial_ate > now());

  select count(*) into v_clientes from public.clientes;
  select coalesce(sum(qtd),0) into v_estoque
    from public.pecas
    where coalesce(arquivada,false) = false;

  select coalesce(sum(valor_centavos),0) / 100.0 into v_vendas_mes
    from public.vendas
    where data >= date_trunc('month', now());

  select count(*) into v_inadimplentes
    from public.assinaturas
    where coalesce(inadimplente,false) = true;

  select count(*) into v_trial
    from public.assinaturas
    where status = 'trial'
      and trial_ate > now();

  select count(*) into v_beta
    from public.acessos_beta
    where coalesce(ativo,false) = true
      and expira_em > now();

  select count(*) into v_total
    from public.assinaturas
    where status in ('ativa','ativo');

  select coalesce(sum(
    case plano
      when 'inicio' then 39.90
      when 'controle' then 69.90
      when 'crescimento' then 106.90
      when 'joalheria' then 179.90
      when 'inteligencia' then 299.90
      else 0
    end
  ),0) into v_mrr
  from public.assinaturas
  where status in ('ativa','ativo')
    and (trial_ate is null or trial_ate <= now());

  select coalesce(jsonb_agg(x order by x.inicio desc), '[]'::jsonb)
    into v_assinaturas
  from (
    select
      a.id,
      l.nome as loja,
      a.plano,
      a.status,
      case
        when a.status = 'trial' and a.trial_ate > now() then 'beta'
        else 'pagante'
      end as tipo,
      coalesce(
        nullif(to_jsonb(a)->>'created_at','')::timestamptz,
        nullif(to_jsonb(a)->>'criada_em','')::timestamptz,
        nullif(to_jsonb(l)->>'created_at','')::timestamptz,
        nullif(to_jsonb(l)->>'criada_em','')::timestamptz,
        nullif(to_jsonb(a)->>'updated_at','')::timestamptz,
        nullif(to_jsonb(a)->>'atualizada_em','')::timestamptz
      ) as inicio,
      greatest(
        0,
        floor(extract(epoch from (
          now() - coalesce(
            nullif(to_jsonb(a)->>'created_at','')::timestamptz,
            nullif(to_jsonb(a)->>'criada_em','')::timestamptz,
            nullif(to_jsonb(l)->>'created_at','')::timestamptz,
            nullif(to_jsonb(l)->>'criada_em','')::timestamptz,
            nullif(to_jsonb(a)->>'updated_at','')::timestamptz,
            nullif(to_jsonb(a)->>'atualizada_em','')::timestamptz,
            now()
          )
        )) / 86400)
      )::integer as dias_ativos,
      (
        a.status in ('ativa','ativo','trial')
        and (a.status <> 'trial' or a.trial_ate is null or a.trial_ate > now())
      ) as ativa
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
    'inicio', (select count(*) from public.assinaturas where plano='inicio' and status in ('ativa','ativo')),
    'controle', (select count(*) from public.assinaturas where plano='controle' and status in ('ativa','ativo')),
    'crescimento', (select count(*) from public.assinaturas where plano='crescimento' and status in ('ativa','ativo')),
    'joalheria', (select count(*) from public.assinaturas where plano='joalheria' and status in ('ativa','ativo')),
    'inteligencia', (select count(*) from public.assinaturas where plano='inteligencia' and status in ('ativa','ativo')),
    'livre', (select count(*) from public.assinaturas where plano='livre')
  );
end;
$$;

revoke all on function public.dados_admin_luxi() from public;
grant execute on function public.dados_admin_luxi() to authenticated;
