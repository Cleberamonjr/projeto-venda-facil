-- Usuários e acessos: mais dias, reativar, bloquear. Exclusão continua em admin_excluir_dados_usuario.
-- Só administradora (sou_admin_luxi). Não altera conta de administração.

alter table public.acessos_beta add column if not exists bloqueado boolean not null default false;

create or replace function public.meu_acesso_beta()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when a.id is null then null
              else jsonb_build_object('dias', a.dias, 'expira_em', a.expira_em, 'bloqueado', coalesce(a.bloqueado,false)) end
  from public.acessos_beta a
  where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email',''))
    and coalesce(a.ativo,false) = true
    and coalesce(a.bloqueado,false) = false
    and a.expira_em > now()
  limit 1;
$$;

create or replace function public.admin_conceder_dias(p_email text, p_dias integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.acessos_beta;
begin
  if not public.sou_admin_luxi() then raise exception 'Acesso administrativo negado'; end if;
  if p_dias < 1 or p_dias > 365 then raise exception 'Dias deve estar entre 1 e 365'; end if;
  update public.acessos_beta
     set dias = p_dias,
         expira_em = greatest(expira_em, now()) + (p_dias || ' days')::interval,
         ativo = true,
         bloqueado = false
   where lower(email) = lower(trim(p_email))
   returning * into r;
  if r.id is null then
    return public.liberar_beta(p_email, p_dias, 'beta', 'concedido no painel');
  end if;
  update public.assinaturas a
     set status = case when a.status = 'ativa' then a.status else 'trial' end,
         trial_ate = r.expira_em
    from public.lojas l join auth.users u on u.id = l.dona_id
   where a.loja_id = l.id and lower(u.email) = r.email and a.status <> 'ativa';
  return to_jsonb(r);
end; $$;
revoke all on function public.admin_conceder_dias(text, integer) from public, anon;
grant execute on function public.admin_conceder_dias(text, integer) to authenticated;

create or replace function public.admin_reativar_conta(p_email text, p_dias integer default 7)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.sou_admin_luxi() then raise exception 'Acesso administrativo negado'; end if;
  update public.acessos_beta
     set ativo = true, bloqueado = false
   where lower(email) = lower(trim(p_email));
  return public.admin_conceder_dias(p_email, p_dias);
end; $$;
revoke all on function public.admin_reativar_conta(text, integer) from public, anon;
grant execute on function public.admin_reativar_conta(text, integer) to authenticated;

create or replace function public.admin_bloquear_conta(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.sou_admin_luxi() then raise exception 'Acesso administrativo negado'; end if;
  if exists (select 1 from auth.users u where lower(u.email) = lower(trim(p_email)) and public.sou_admin_luxi()) then
    raise exception 'Não bloqueia conta de administração';
  end if;
  update public.acessos_beta
     set bloqueado = true, ativo = false
   where lower(email) = lower(trim(p_email));
  update public.assinaturas a
     set trial_ate = least(coalesce(a.trial_ate, now()), now())
    from public.lojas l join auth.users u on u.id = l.dona_id
   where a.loja_id = l.id and lower(u.email) = lower(trim(p_email)) and a.status = 'trial';
end; $$;
revoke all on function public.admin_bloquear_conta(text) from public, anon;
grant execute on function public.admin_bloquear_conta(text) to authenticated;
