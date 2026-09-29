-- Aplicada em produção em 29/09/2026. SUBSTITUI liberar_beta/revogar_beta de 20260929_beta_invite_links.sql.
-- A cliente beta recebe os dias liberados no painel (antes: sempre 72h) e "Revogar" corta o acesso de verdade.

create or replace function public.meu_acesso_beta()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when a.id is null then null
              else jsonb_build_object('dias', a.dias, 'expira_em', a.expira_em) end
  from public.acessos_beta a
  where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email',''))
    and coalesce(a.ativo,false) = true and a.expira_em > now()
  limit 1;
$$;
revoke all on function public.meu_acesso_beta() from public, anon;
grant execute on function public.meu_acesso_beta() to authenticated;

create or replace function public.liberar_beta(p_email text, p_dias integer default 30, p_plano text default 'crescimento', p_obs text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.acessos_beta; v_token text := replace(gen_random_uuid()::text,'-','');
begin
  if not public.sou_admin_luxi() then raise exception 'Acesso administrativo negado'; end if;
  if nullif(trim(p_email),'') is null then raise exception 'E-mail obrigatório'; end if;
  if p_dias < 1 or p_dias > 365 then raise exception 'Dias deve estar entre 1 e 365'; end if;
  insert into public.acessos_beta(email,plano,dias,expira_em,obs,ativo,usado,convite_token)
  values(lower(trim(p_email)),'beta',p_dias,now() + (p_dias || ' days')::interval,p_obs,true,false,v_token)
  on conflict(email) do update set plano='beta',dias=excluded.dias,expira_em=excluded.expira_em,
    obs=coalesce(excluded.obs,public.acessos_beta.obs),ativo=true,usado=false,usado_em=null,
    convite_token=excluded.convite_token
  returning * into r;

  -- quem já tem loja (e ainda não paga) ganha os dias do beta também
  update public.assinaturas a
     set status = 'trial', trial_ate = r.expira_em
    from public.lojas l join auth.users u on u.id = l.dona_id
   where a.loja_id = l.id and lower(u.email) = r.email and a.status <> 'ativa';

  return to_jsonb(r);
end; $$;
revoke all on function public.liberar_beta(text,integer,text,text) from public, anon;
grant execute on function public.liberar_beta(text,integer,text,text) to authenticated;

create or replace function public.revogar_beta(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.sou_admin_luxi() then raise exception 'Acesso administrativo negado'; end if;
  update public.acessos_beta set ativo = false where lower(email) = lower(trim(p_email));
  update public.assinaturas a
     set trial_ate = least(coalesce(a.trial_ate, now()), now())
    from public.lojas l join auth.users u on u.id = l.dona_id
   where a.loja_id = l.id and lower(u.email) = lower(trim(p_email)) and a.status = 'trial';
end; $$;
revoke all on function public.revogar_beta(text) from public, anon;
grant execute on function public.revogar_beta(text) to authenticated;
