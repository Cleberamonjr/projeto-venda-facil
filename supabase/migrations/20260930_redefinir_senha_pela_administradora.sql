-- Redefinição de senha de cliente pela administradora (sem depender de e-mail).
-- A troca em si acontece na função de servidor "admin-redefinir-senha"; aqui ficam as regras e o registro.

-- 1) Quem está com senha temporária (precisa criar uma nova ao entrar).
create table if not exists public.senhas_temporarias (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criada_em timestamptz not null default now(),
  criada_por uuid references auth.users(id) on delete set null
);
alter table public.senhas_temporarias enable row level security;  -- sem policies: só via funções abaixo

-- 2) Registro de tudo que a administradora fez em contas de clientes.
create table if not exists public.auditoria_admin (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users(id) on delete set null,
  acao text not null,
  alvo_email text,
  criado_em timestamptz not null default now()
);
alter table public.auditoria_admin enable row level security;     -- sem policies
create index if not exists auditoria_admin_criado_idx on public.auditoria_admin (criado_em desc);

-- 3) Verificações ANTES de trocar (só a função de servidor, com chave de serviço, executa).
--    Códigos próprios (LX404 não achou / LX403 conta de admin / LX429 limite): os P000x são reservados do PostgreSQL.
create or replace function public.admin_alvo_redefinicao(p_admin uuid, p_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_alvo uuid; v_recentes int;
begin
  if not exists (select 1 from public.luxi_admins where user_id = p_admin) then
    raise exception 'Acesso administrativo negado';
  end if;
  select id into v_alvo from auth.users where lower(email) = lower(trim(p_email));
  if v_alvo is null then raise exception 'Cliente não encontrada' using errcode = 'LX404'; end if;
  if exists (select 1 from public.luxi_admins where user_id = v_alvo) then
    raise exception 'Contas de administração não podem ser redefinidas por aqui' using errcode = 'LX403';
  end if;
  select count(*) into v_recentes from public.auditoria_admin
   where admin_id = p_admin and acao = 'redefinir_senha' and criado_em > now() - interval '1 hour';
  if v_recentes >= 20 then raise exception 'Muitas redefinições na última hora' using errcode = 'LX429'; end if;
  return v_alvo;
end $$;

-- 4) Depois de trocar: marca "senha temporária", registra na auditoria e encerra os logins antigos.
create or replace function public.admin_concluir_redefinicao(p_admin uuid, p_user uuid, p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.luxi_admins where user_id = p_admin) then
    raise exception 'Acesso administrativo negado';
  end if;
  insert into public.senhas_temporarias(user_id, criada_por) values (p_user, p_admin)
    on conflict (user_id) do update set criada_em = now(), criada_por = p_admin;
  insert into public.auditoria_admin(admin_id, acao, alvo_email) values (p_admin, 'redefinir_senha', lower(trim(p_email)));
  delete from auth.sessions where user_id = p_user;   -- encerra logins antigos (os tokens de renovação caem junto)
end $$;

revoke all on function public.admin_alvo_redefinicao(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_concluir_redefinicao(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_alvo_redefinicao(uuid, text) to service_role;
grant execute on function public.admin_concluir_redefinicao(uuid, uuid, text) to service_role;

-- 5) O app da própria cliente: "preciso criar uma senha nova?" e "já criei".
create or replace function public.preciso_trocar_senha()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.senhas_temporarias where user_id = auth.uid());
$$;
create or replace function public.concluir_troca_senha()
returns void language sql security definer set search_path = public as $$
  delete from public.senhas_temporarias where user_id = auth.uid();
$$;
revoke all on function public.preciso_trocar_senha() from public, anon;
revoke all on function public.concluir_troca_senha() from public, anon;
grant execute on function public.preciso_trocar_senha() to authenticated;
grant execute on function public.concluir_troca_senha() to authenticated;

-- 6) Painel admin: últimas redefinições (só a administradora vê).
create or replace function public.auditoria_admin_recente()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.sou_admin_luxi() then raise exception 'Acesso administrativo negado'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('quando', criado_em, 'acao', acao, 'alvo', alvo_email) order by criado_em desc)
                     from (select * from public.auditoria_admin order by criado_em desc limit 10) x), '[]'::jsonb);
end $$;
revoke all on function public.auditoria_admin_recente() from public, anon;
grant execute on function public.auditoria_admin_recente() to authenticated;
