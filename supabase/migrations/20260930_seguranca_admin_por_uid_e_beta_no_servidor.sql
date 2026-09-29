-- Aplicada em produção em 29/09/2026. SUBSTITUI sou_admin_luxi() de 20260928_admin_hardening.sql.
-- Se algum dia reaplicar a 20260928, reaplique esta depois (a ordem dos nomes já garante isso).

-- 1) Admin por ID de usuário (não por e-mail): ninguém vira admin só se cadastrando com um e-mail da lista.
create table if not exists public.luxi_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.luxi_admins enable row level security;  -- sem policies: só funções security definer leem

insert into public.luxi_admins(user_id)
select id from auth.users where lower(email) = 'cleberamjr@gmail.com'
on conflict do nothing;

create or replace function public.sou_admin_luxi()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.luxi_admins where user_id = auth.uid());
$$;
revoke all on function public.sou_admin_luxi() from public, anon;
grant execute on function public.sou_admin_luxi() to authenticated;

-- 2) Beta fechado NO SERVIDOR: cadastro direto na API do Supabase também é barrado
--    se o e-mail não estiver liberado (a checagem só no app podia ser contornada).
create or replace function public.barrar_cadastro_fora_do_beta()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.email_liberado_beta(new.email) then
    raise exception 'Beta fechado: este e-mail ainda não foi liberado.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists trg_beta_fechado on auth.users;
create trigger trg_beta_fechado
  before insert on auth.users
  for each row execute function public.barrar_cadastro_fora_do_beta();

-- 3) Confirmação de e-mail automática (o beta não exige confirmar por link).
create or replace function public.auto_confirmar_email()
returns trigger language plpgsql security definer set search_path = auth as $$
begin
  if new.email_confirmed_at is null then new.email_confirmed_at := now(); end if;
  return new;
end $$;
drop trigger if exists trg_auto_confirmar on auth.users;
create trigger trg_auto_confirmar before insert on auth.users
  for each row execute function public.auto_confirmar_email();

-- 4) numeros_reais_luxi não checava admin e foi substituída por dados_admin_luxi.
drop function if exists public.numeros_reais_luxi();
