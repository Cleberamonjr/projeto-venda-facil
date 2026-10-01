-- APLICADA em produção em 29/09/2026 e testada com uma cliente fictícia completa (tudo desfeito no teste).
-- Exclusão de clientes/acessos pelo painel (somente administradora). Tudo novo; nada existente muda.

-- o registro interno passa a guardar DETALHES (o que foi apagado, motivo). Coluna opcional.
alter table public.auditoria_admin add column if not exists detalhe jsonb;

-- contagens do que pertence a um conjunto de lojas (uso interno das funções abaixo)
create or replace function public.admin_contagens_lojas(p_lojas uuid[], p_email text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'pecas',      (select count(*) from public.pecas      where loja_id = any(p_lojas)),
    'vendas',     (select count(*) from public.vendas     where loja_id = any(p_lojas)),
    'clientes',   (select count(*) from public.clientes   where loja_id = any(p_lojas)),
    'despesas',   (select count(*) from public.despesas   where loja_id = any(p_lojas)),
    'romaneios',  (select count(*) from public.entradas   where loja_id = any(p_lojas)),
    'baixas',     (select count(*) from public.saidas     where loja_id = any(p_lojas)),
    'colecoes',   (select count(*) from public.colecoes   where loja_id = any(p_lojas)),
    'maletas',    (select count(*) from public.maletas    where loja_id = any(p_lojas)),
    'consultoras',(select count(*) from public.consultoras where loja_id = any(p_lojas) and coalesce(eh_dona,false) = false),
    'consultoras_com_conta', (select count(*) from public.consultoras where loja_id = any(p_lojas) and coalesce(eh_dona,false) = false and usuario_id is not null),
    'arquivos',   (select count(*) from storage.objects where bucket_id in ('romaneios','pecas','logos','fotos-pecas')
                    and split_part(name,'/',1) in (select x::text from unnest(p_lojas) x)),
    'registros_financeiros', (select count(*) from public.pagamentos_yampi where lower(email) = lower(p_email))
                           + (select count(*) from public.eventos_pagamento where loja_id = any(p_lojas))
  );
$$;
revoke all on function public.admin_contagens_lojas(uuid[], text) from public, anon, authenticated;

-- PRÉVIA (somente leitura): o que seria apagado ao excluir esta conta
create or replace function public.admin_prever_exclusao(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_email text; v_lojas uuid[];
begin
  if not public.sou_admin_luxi() then raise exception 'Acesso administrativo negado'; end if;
  select email into v_email from auth.users where id = p_user;
  if v_email is null then raise exception 'Conta não encontrada' using errcode = 'LX404'; end if;
  select coalesce(array_agg(id), '{}') into v_lojas from public.lojas where dona_id = p_user;
  return jsonb_build_object(
    'user_id', p_user, 'email', v_email,
    'e_admin', exists(select 1 from public.luxi_admins where user_id = p_user),
    'sou_eu',  coalesce(p_user = auth.uid(), false),
    'lojas',   (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'nome', l.nome)), '[]'::jsonb) from public.lojas l where l.dona_id = p_user),
    'assinatura_status', (select a.status from public.assinaturas a where a.loja_id = any(v_lojas) order by (a.status = 'ativa') desc limit 1),
    'e_consultora_de', (select coalesce(jsonb_agg(l.nome), '[]'::jsonb) from public.consultoras c join public.lojas l on l.id = c.loja_id
                         where c.usuario_id = p_user and l.dona_id <> p_user),
    'tem_acesso_beta', exists(select 1 from public.acessos_beta where lower(email) = lower(v_email)),
    'contagens', public.admin_contagens_lojas(v_lojas, v_email)
  );
end $$;
revoke all on function public.admin_prever_exclusao(uuid) from public, anon;
grant execute on function public.admin_prever_exclusao(uuid) to authenticated;

-- EXECUÇÃO da parte do banco (só o servidor chama, depois de conferir quem pediu). Atômica: ou apaga tudo ou nada.
create or replace function public.admin_excluir_dados_usuario(p_admin uuid, p_user uuid, p_motivo text, p_forcar boolean default false)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_email text; v_lojas uuid[]; v_status text; v_cont jsonb; v_n int;
begin
  select email into v_email from auth.users where id = p_user;
  if v_email is null then raise exception 'Conta não encontrada' using errcode = 'LX404'; end if;
  if exists(select 1 from public.luxi_admins where user_id = p_user) then raise exception 'Conta de administração' using errcode = 'LX403'; end if;
  if p_user = p_admin then raise exception 'Não é possível excluir a própria conta' using errcode = 'LX403'; end if;

  select count(*) into v_n from public.auditoria_admin
   where admin_id = p_admin and acao = 'excluir_usuario' and criado_em > now() - interval '1 hour';
  if v_n >= 10 then raise exception 'Muitas exclusões seguidas' using errcode = 'LX429'; end if;

  select coalesce(array_agg(id), '{}') into v_lojas from public.lojas where dona_id = p_user;
  select a.status into v_status from public.assinaturas a where a.loja_id = any(v_lojas) order by (a.status = 'ativa') desc limit 1;
  if v_status = 'ativa' and not coalesce(p_forcar, false) then raise exception 'Assinatura ativa' using errcode = 'LX409'; end if;

  v_cont := public.admin_contagens_lojas(v_lojas, v_email);

  -- registro interno PRIMEIRO, na mesma transação (se algo falhar, nada fica gravado nem apagado)
  insert into public.auditoria_admin(admin_id, acao, alvo_email, detalhe)
  values (p_admin, 'excluir_usuario', lower(v_email),
          jsonb_build_object('motivo', left(coalesce(p_motivo, ''), 500), 'lojas', to_jsonb(v_lojas), 'contagens', v_cont, 'forcado', coalesce(p_forcar, false)));

  -- as maletas apontam para as consultoras com BLOQUEIO. No teste a exclusão em cascata funcionou mesmo sem este passo,
  -- mas isso depende da ordem interna do banco — por isso as maletas saem antes, de forma explícita.
  delete from public.maletas where loja_id = any(v_lojas);
  delete from public.lojas   where id = any(v_lojas);   -- peças, vendas, clientes, contas, romaneios... saem em cascata
  delete from public.acessos_beta where lower(email) = lower(v_email);

  return jsonb_build_object('email', v_email, 'lojas', to_jsonb(v_lojas), 'contagens', v_cont);
end $$;
revoke all on function public.admin_excluir_dados_usuario(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.admin_excluir_dados_usuario(uuid, uuid, text, boolean) to service_role;

-- contas que existem mas não têm loja (criaram a conta e pararam)
create or replace function public.admin_contas_sem_loja()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.sou_admin_luxi() then raise exception 'Acesso administrativo negado'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', u.id, 'email', u.email, 'criada_em', u.created_at, 'ultimo_login', u.last_sign_in_at,
             'beta', exists(select 1 from public.acessos_beta b where lower(b.email) = lower(u.email) and b.ativo and b.expira_em > now()),
             'consultora_de', (select l.nome from public.consultoras c join public.lojas l on l.id = c.loja_id where c.usuario_id = u.id limit 1))
           order by u.created_at desc)
      from auth.users u
     where not exists (select 1 from public.lojas l where l.dona_id = u.id)
       and not exists (select 1 from public.luxi_admins a where a.user_id = u.id)), '[]'::jsonb);
end $$;
revoke all on function public.admin_contas_sem_loja() from public, anon;
grant execute on function public.admin_contas_sem_loja() to authenticated;

-- CÓPIA COMPLETA da loja antes de excluir (sem limites de linhas). A abertura fica no registro interno.
create or replace function public.admin_exportar_loja(p_loja uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_loja public.lojas; v_email text;
begin
  if not public.sou_admin_luxi() then raise exception 'Acesso administrativo negado'; end if;
  select * into v_loja from public.lojas where id = p_loja;
  if not found then raise exception 'Loja não encontrada' using errcode = 'LX404'; end if;
  select email into v_email from auth.users where id = v_loja.dona_id;
  insert into public.auditoria_admin(admin_id, acao, alvo_email) values (auth.uid(), 'exportar_loja', lower(coalesce(v_email, p_loja::text)));
  return jsonb_build_object(
    'exportado_em', now(),
    'aviso', 'Este arquivo contém dados pessoais de clientes (telefone, CPF, endereço). Guarde com segurança e apague quando não for mais necessário.',
    'dona_email', v_email,
    'loja', to_jsonb(v_loja),
    'assinatura', (select to_jsonb(a) from public.assinaturas a where a.loja_id = p_loja),
    'pecas',      (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.pecas      x where x.loja_id = p_loja),
    'vendas',     (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.vendas     x where x.loja_id = p_loja),
    'clientes',   (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.clientes   x where x.loja_id = p_loja),
    'despesas',   (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.despesas   x where x.loja_id = p_loja),
    'romaneios',  (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.entradas   x where x.loja_id = p_loja),
    'baixas',     (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.saidas     x where x.loja_id = p_loja),
    'colecoes',   (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.colecoes   x where x.loja_id = p_loja),
    'maletas',    (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.maletas    x where x.loja_id = p_loja),
    'maleta_itens', (select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) from public.maleta_itens i where i.maleta_id in (select id from public.maletas where loja_id = p_loja)),
    'consultoras',(select coalesce(jsonb_agg(to_jsonb(x) - 'convite_codigo'), '[]'::jsonb) from public.consultoras x where x.loja_id = p_loja)
  );
end $$;
revoke all on function public.admin_exportar_loja(uuid) from public, anon;
grant execute on function public.admin_exportar_loja(uuid) to authenticated;

-- remover da lista um acesso beta de quem NÃO tem conta (quem tem conta: excluir a conta)
create or replace function public.admin_remover_acesso_beta(p_email text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_n int;
begin
  if not public.sou_admin_luxi() then raise exception 'Acesso administrativo negado'; end if;
  if exists(select 1 from auth.users where lower(email) = lower(trim(p_email))) then
    raise exception 'Esta pessoa já tem conta: exclua a conta' using errcode = 'LX409';
  end if;
  delete from public.acessos_beta where lower(email) = lower(trim(p_email));
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'Acesso não encontrado' using errcode = 'LX404'; end if;
  insert into public.auditoria_admin(admin_id, acao, alvo_email) values (auth.uid(), 'remover_acesso_beta', lower(trim(p_email)));
end $$;
revoke all on function public.admin_remover_acesso_beta(text) from public, anon;
grant execute on function public.admin_remover_acesso_beta(text) to authenticated;
