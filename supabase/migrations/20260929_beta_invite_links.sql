-- One-time Beta invite links bound to the exact invited email.
alter table public.acessos_beta add column if not exists convite_token text;
create unique index if not exists acessos_beta_convite_token_uidx on public.acessos_beta (convite_token) where convite_token is not null;
update public.acessos_beta set convite_token = replace(gen_random_uuid()::text,'-','') where convite_token is null;

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
  return to_jsonb(r);
end; $$;
revoke all on function public.liberar_beta(text,integer,text,text) from public,anon;
grant execute on function public.liberar_beta(text,integer,text,text) to authenticated;

create or replace function public.validar_convite_beta(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
select case when a.id is null then null::jsonb else jsonb_build_object(
  'email',lower(a.email),'dias',a.dias,'expira_em',a.expira_em,'ativo',a.ativo,'usado',a.usado
) end from public.acessos_beta a where a.convite_token = trim(p_token)
  and coalesce(a.ativo,false) = true and coalesce(a.usado,false) = false and a.expira_em > now() limit 1;
$$;
revoke all on function public.validar_convite_beta(text) from public;
grant execute on function public.validar_convite_beta(text) to anon,authenticated;

create or replace function public.consumir_convite_beta(p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  v_email := lower(coalesce(auth.jwt() ->> 'email',''));
  if v_email = '' then return false; end if;
  update public.acessos_beta set usado=true, usado_em=now()
  where convite_token=trim(p_token) and lower(email)=v_email and coalesce(ativo,false)=true
    and coalesce(usado,false)=false and expira_em > now();
  return found;
end; $$;
revoke all on function public.consumir_convite_beta(text) from public;
grant execute on function public.consumir_convite_beta(text) to authenticated;
