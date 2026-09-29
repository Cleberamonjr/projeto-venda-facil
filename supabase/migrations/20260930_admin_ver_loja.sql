-- Modo observação: a administradora abre a loja de uma cliente (SOMENTE LEITURA). A cliente NÃO é avisada e não há
-- nada visível para ela. Cada abertura fica só no registro interno (auditoria_admin, que só o servidor lê).
-- APLICADA em produção em 29/09/2026 e testada com lojas reais. Função NOVA: nada existente muda.
create or replace function public.admin_ver_loja(p_loja uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v jsonb; v_loja public.lojas; v_email text; v_login timestamptz; v_criada timestamptz;
begin
  if not public.sou_admin_luxi() then raise exception 'Acesso administrativo negado'; end if;

  select * into v_loja from public.lojas where id = p_loja;
  if not found then raise exception 'Loja não encontrada' using errcode = 'LX404'; end if;

  select u.email, u.last_sign_in_at, u.created_at into v_email, v_login, v_criada
    from auth.users u where u.id = v_loja.dona_id;

  -- auditoria: toda abertura de loja de cliente fica registrada
  insert into public.auditoria_admin(admin_id, acao, alvo_email)
  values (auth.uid(), 'ver_loja', lower(coalesce(v_email, p_loja::text)));

  with ev as (
    select vendida_em as quando, 'venda'::text as tipo, nome::text as nome, codigo::text as codigo, qtd::int as qtd,
           valor_centavos::bigint as valor, cliente::text as extra
      from public.vendas where loja_id = p_loja
    union all
    select entrada_em, 'peca', nome::text, codigo::text, qtd::int, venda_centavos::bigint, fornecedor::text
      from public.pecas where loja_id = p_loja
    union all
    select criada_em, 'romaneio', null, null, qtd_itens::int, total_centavos::bigint, fornecedor::text
      from public.entradas where loja_id = p_loja
    union all
    select saiu_em, 'baixa', nome::text, codigo::text, qtd::int, custo_centavos::bigint, motivo::text
      from public.saidas where loja_id = p_loja
    union all
    select criada_em, 'despesa', nome::text, null, null, valor_centavos::bigint, tipo::text
      from public.despesas where loja_id = p_loja
    union all
    select criado_em, 'cliente', nome::text, null, null, null, null
      from public.clientes where loja_id = p_loja
  )
  select jsonb_build_object(
    'loja', to_jsonb(v_loja),
    'dona', jsonb_build_object('email', v_email, 'ultimo_login', v_login, 'conta_criada', v_criada),
    'assinatura', (select to_jsonb(a) from public.assinaturas a where a.loja_id = p_loja),
    'resumo', jsonb_build_object(
      'pecas',        (select count(*) from public.pecas where loja_id = p_loja and coalesce(arquivada,false) = false),
      'unidades',     (select coalesce(sum(qtd),0) from public.pecas where loja_id = p_loja and coalesce(arquivada,false) = false),
      'vendas_total', (select count(*) from public.vendas where loja_id = p_loja),
      'vendas_30d',   (select count(*) from public.vendas where loja_id = p_loja and vendida_em >= now() - interval '30 days'),
      'valor_30d',    (select coalesce(sum(valor_centavos),0) from public.vendas where loja_id = p_loja and vendida_em >= now() - interval '30 days'),
      'a_receber',    (select coalesce(sum(valor_centavos),0) from public.vendas where loja_id = p_loja and coalesce(pago,true) = false),
      'clientes',     (select count(*) from public.clientes where loja_id = p_loja),
      'consultoras',  (select count(*) from public.consultoras where loja_id = p_loja and coalesce(eh_dona,false) = false and coalesce(ativa,true)),
      'romaneios',    (select count(*) from public.entradas where loja_id = p_loja),
      'ultima_atividade', (select max(quando) from ev)
    ),
    'atividade', (select coalesce(jsonb_agg(to_jsonb(x) order by x.quando desc), '[]'::jsonb)
                    from (select * from ev where quando is not null order by quando desc limit 80) x),
    'dias', (select coalesce(jsonb_agg(jsonb_build_object('dia', g.d, 'n', coalesce(c.n,0)) order by g.d), '[]'::jsonb)
               from (select (current_date - s)::date as d from generate_series(0, 29) s) g
               left join (select (quando at time zone 'America/Sao_Paulo')::date as dia, count(*) as n from ev where quando is not null group by 1) c on c.dia = g.d),
    'pecas', (select coalesce(jsonb_agg(((to_jsonb(p) - 'fotos') || jsonb_build_object(
                'tem_foto', coalesce(array_length(p.fotos,1),0) > 0,
                'capa', case when coalesce(p.fotos[1],'') like 'http%' then p.fotos[1] end)) order by p.entrada_em desc), '[]'::jsonb)
                from (select * from public.pecas where loja_id = p_loja order by entrada_em desc limit 300) p),
    'vendas',   (select coalesce(jsonb_agg(to_jsonb(x) order by x.vendida_em desc), '[]'::jsonb)
                   from (select * from public.vendas where loja_id = p_loja order by vendida_em desc limit 200) x),
    'clientes', (select coalesce(jsonb_agg(to_jsonb(x) order by x.criado_em desc), '[]'::jsonb)
                   from (select * from public.clientes where loja_id = p_loja order by criado_em desc limit 200) x),
    'despesas', (select coalesce(jsonb_agg(to_jsonb(x) order by x.competencia desc), '[]'::jsonb)
                   from (select * from public.despesas where loja_id = p_loja order by competencia desc limit 100) x),
    'entradas', (select coalesce(jsonb_agg(to_jsonb(x) order by x.criada_em desc), '[]'::jsonb)
                   from (select * from public.entradas where loja_id = p_loja order by criada_em desc limit 50) x),
    -- o código de convite da consultora é um segredo de entrada: não vai para a tela
    'consultoras', (select coalesce(jsonb_agg((to_jsonb(x) - 'convite_codigo') order by x.nome), '[]'::jsonb)
                      from (select * from public.consultoras where loja_id = p_loja) x)
  ) into v;

  return v;
end $$;

revoke all on function public.admin_ver_loja(uuid) from public, anon;
grant execute on function public.admin_ver_loja(uuid) to authenticated;
