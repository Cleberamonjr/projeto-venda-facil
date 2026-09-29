-- Aplicada em produção em 29/09/2026. Função NOVA (dados_admin_luxi segue igual p/ versões antigas do app).
-- Painel admin fiel ao uso real: por loja (peças, vendas, última atividade, romaneios lidos) + resumo.
create or replace function public.uso_lojas_luxi()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.sou_admin_luxi() then raise exception 'Acesso administrativo negado'; end if;

  with base as (
    select l.id, l.nome, u.email as dona_email, l.criada_em, a.plano, a.status,
      case when a.status = 'ativa' then 'pagante'
           when a.status = 'trial' and a.trial_ate > now() then 'beta'
           when a.status = 'trial' then 'encerrado'
           else 'livre' end as situacao,
      case when a.status = 'trial' and a.trial_ate > now()
           then ceil(extract(epoch from (a.trial_ate - now())) / 86400)::int end as dias_restantes,
      (select count(*) from pecas p where p.loja_id = l.id and coalesce(p.arquivada,false) = false)::int as pecas,
      (select count(*) from vendas v where v.loja_id = l.id)::int as vendas_total,
      (select count(*) from vendas v where v.loja_id = l.id and v.vendida_em >= now() - interval '30 days')::int as vendas_30d,
      (select coalesce(sum(v.valor_centavos),0) / 100.0 from vendas v where v.loja_id = l.id and v.vendida_em >= now() - interval '30 days') as valor_30d,
      (select count(*) from entradas e where e.loja_id = l.id and e.arquivo_path is not null and e.criada_em >= now() - interval '30 days')::int as romaneios_30d,
      (select count(*) from consultoras c where c.loja_id = l.id and coalesce(c.eh_dona,false) = false and coalesce(c.ativa,true))::int as consultoras,
      greatest(
        (select max(vendida_em) from vendas   where loja_id = l.id),
        (select max(entrada_em) from pecas    where loja_id = l.id),
        (select max(criada_em)  from entradas where loja_id = l.id),
        (select max(saiu_em)    from saidas   where loja_id = l.id),
        (select max(criada_em)  from despesas where loja_id = l.id),
        (select max(criado_em)  from clientes where loja_id = l.id)
      ) as ultima_atividade
    from lojas l
    left join auth.users u on u.id = l.dona_id
    left join assinaturas a on a.loja_id = l.id
  )
  select jsonb_build_object(
    'resumo', jsonb_build_object(
      'lojas', (select count(*) from base),
      'usando_7d', (select count(*) from base where ultima_atividade >= now() - interval '7 days'),
      'usando_30d', (select count(*) from base where ultima_atividade >= now() - interval '30 days'),
      'pecas', (select coalesce(sum(pecas),0) from base),
      'vendas_30d', (select coalesce(sum(vendas_30d),0) from base),
      'valor_vendas_30d', (select coalesce(sum(valor_30d),0) from base),
      'romaneios_30d', (select coalesce(sum(romaneios_30d),0) from base),
      'beta', (select count(*) from base where situacao = 'beta'),
      'pagantes', (select count(*) from base where situacao = 'pagante')),
    'lojas', coalesce((select jsonb_agg(to_jsonb(b) order by b.ultima_atividade desc nulls last) from base b), '[]'::jsonb)
  ) into v;
  return v;
end; $$;
revoke all on function public.uso_lojas_luxi() from public, anon;
grant execute on function public.uso_lojas_luxi() to authenticated;
