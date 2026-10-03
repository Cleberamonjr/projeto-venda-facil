-- ============================================================================================
-- LONA — a vitrine pública de cada consultora (e da dona), com pedido da cliente sem login.
-- Tudo NOVO e ADITIVO. Nada do que existe muda, exceto uma coluna opcional em `lojas` (chave Pix).
--
-- Como respeita a matriz:
--   • estoque continua só em `pecas`. A reserva da lona vive em tabela própria (não mexe em pecas.qtd);
--   • o pedido só vira venda quando a dona ou a própria consultora CONFIRMA, e a confirmação chama o
--     `registrar_venda` que já existe (comissão, baixa de estoque e regras de sempre);
--   • custo e quantidade em estoque NUNCA saem na vitrine pública;
--   • quem não tem permissão não enxerga nem escreve nada: tabelas fechadas, só funções com checagem.
-- ============================================================================================

-- 1) chave Pix da loja (opcional; aparece na vitrine só se a dona preencher)
alter table public.lojas add column if not exists pix_chave text;
do $f$ begin
  alter table public.lojas add constraint lojas_pix_chave_tam check (pix_chave is null or length(pix_chave) <= 140);
exception when duplicate_object then null; end $f$;

-- 2) tabelas
create table if not exists public.lonas (
  id             uuid primary key default gen_random_uuid(),
  loja_id        uuid not null references public.lojas(id) on delete cascade,
  consultora_id  uuid not null unique references public.consultoras(id) on delete cascade,
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 40),
  rascunho       jsonb not null default '{}'::jsonb,
  publicado      jsonb,
  publicado_em   timestamptz,
  criada_em      timestamptz not null default now(),
  atualizada_em  timestamptz not null default now()
);
create index if not exists lonas_loja_idx on public.lonas(loja_id);

create table if not exists public.lona_pedidos (
  id                uuid primary key default gen_random_uuid(),
  lona_id           uuid not null references public.lonas(id) on delete cascade,
  loja_id           uuid not null references public.lojas(id) on delete cascade,
  consultora_id     uuid not null references public.consultoras(id) on delete cascade,
  cliente_nome      text not null check (length(cliente_nome) between 2 and 60),
  cliente_whatsapp  text not null check (cliente_whatsapp ~ '^[0-9]{10,11}$'),
  origem            text not null check (origem in ('pago_loja','entrega')),
  status            text not null default 'aberto' check (status in ('aberto','pago','confirmado','cancelado')),
  total_centavos    integer not null default 0 check (total_centavos >= 0),
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);
create index if not exists lona_pedidos_lona_idx  on public.lona_pedidos(lona_id, status, criado_em);
create index if not exists lona_pedidos_loja_idx  on public.lona_pedidos(loja_id, criado_em desc);

create table if not exists public.lona_pedido_itens (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references public.lona_pedidos(id) on delete cascade,
  peca_id         uuid references public.pecas(id) on delete set null,
  codigo          text not null,
  nome            text,
  preco_centavos  integer check (preco_centavos is null or preco_centavos >= 0),
  venda_id        uuid references public.vendas(id) on delete set null
);
create index if not exists lona_itens_pedido_idx on public.lona_pedido_itens(pedido_id);
create index if not exists lona_itens_peca_idx   on public.lona_pedido_itens(peca_id);

-- tabelas FECHADAS: só as funções abaixo (com checagem de quem chama) leem e escrevem
alter table public.lonas             enable row level security;
alter table public.lona_pedidos      enable row level security;
alter table public.lona_pedido_itens enable row level security;
revoke all on table public.lonas, public.lona_pedidos, public.lona_pedido_itens from public, anon, authenticated;

-- 3) auxiliares internas (ninguém chama de fora)
create or replace function public.lona_loja_ok(l uuid) returns boolean
language sql stable security definer set search_path = public as $f$
  select exists (select 1 from assinaturas a where a.loja_id = l and a.status in ('trial','ativa','atrasada','livre'));
$f$;

-- quem pode ESCREVER na lona de uma consultora: a dona da loja, ou a própria consultora (com o plano da loja em dia)
create or replace function public.lona_pode_gerir(p_loja uuid, p_consultora uuid) returns boolean
language sql stable security definer set search_path = public as $f$
  select coalesce(
    privado.pode_escrever(p_loja)
    or (p_consultora is not null and p_consultora = privado.minha_consultoria(p_loja) and public.lona_loja_ok(p_loja)),
    false);   -- coalesce: NULL (desconhecido) nunca pode virar "permitido" 
$f$;

-- unidades de uma peça seguradas por pedidos em aberto (a reserva vence sozinha em 7 dias)
create or replace function public.lona_reservado(p_peca uuid) returns integer
language sql stable security definer set search_path = public as $f$
  select count(*)::int from lona_pedido_itens i join lona_pedidos o on o.id = i.pedido_id
   where i.peca_id = p_peca and o.status in ('aberto','pago') and o.criado_em > now() - interval '7 days';
$f$;

-- a foto usável de uma peça (só https): uma regra só, usada pela vitrine E pelo pedido
create or replace function public.lona_foto(p_fotos text[], p_idx int) returns text
language sql immutable set search_path = public as $f$
  select coalesce(
    (select f from (select p_fotos[greatest(coalesce(p_idx,0),0) + 1] as f) s where f ~ '^https://' and length(f) <= 500),
    (select f from unnest(coalesce(p_fotos, '{}'::text[])) f where f ~ '^https://' and length(f) <= 500 limit 1));
$f$;

create or replace function public.lona_slug(p_nome text) returns text
language plpgsql volatile security definer set search_path = public as $f$
declare base text; cand text; i int := 1;
begin
  base := regexp_replace(translate(lower(coalesce(p_nome,'')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'), '[^a-z0-9]+', '-', 'g');
  base := btrim(left(btrim(base, '-'), 30), '-');
  if length(base) < 2 then base := 'loja'; end if;
  cand := base;
  while exists (select 1 from lonas where slug = cand) or cand in ('admin','api','app','login','lona','luxi','m') loop
    i := i + 1; cand := left(base, 30) || '-' || i;
  end loop;
  return cand;
end $f$;

-- Reconstrói o conteúdo da lona só com o que é válido (nunca confia no que vem de fora).
-- O preço de cada peça nunca fica abaixo do preço da loja.
create or replace function public.lona_sanear(p_loja uuid, p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $f$
declare
  v_nome   text := left(btrim(coalesce(p->>'nome','')), 60);
  v_frase  text := left(btrim(coalesce(p->>'frase','')), 80);
  v_fonte  text := coalesce(p->>'fonte','helvetica');
  v_cor    text := coalesce(p->>'cor','#1a1a1a');
  v_zap    text := regexp_replace(coalesce(p->>'whatsapp',''), '\D', '', 'g');
  v_modelo text := left(coalesce(p->>'modelo',''), 600);
  v_capa   text := nullif(p->>'capa','');
  v_links  jsonb := '[]'::jsonb;
  v_ordem  jsonb := '[]'::jsonb;
  v_itens  jsonb := '{}'::jsonb;
  v_l jsonb; v_id text; v_it jsonb; v_peca record; n int := 0; v_url text;
begin
  if v_fonte not in ('helvetica','instrument','fraunces','newsreader') then v_fonte := 'helvetica'; end if;
  if v_cor !~ '^#[0-9a-fA-F]{6}$' then v_cor := '#1a1a1a'; end if;
  if length(v_zap) > 11 then v_zap := right(v_zap, 11); end if;
  if v_zap !~ '^[0-9]{10,11}$' then v_zap := ''; end if;
  if v_capa is not null and (length(v_capa) > 300 or v_capa !~ '^https://[A-Za-z0-9.-]+\.supabase\.co/storage/v1/object/public/logos/[A-Za-z0-9._/~%-]+$') then v_capa := null; end if;

  if jsonb_typeof(p->'links') = 'array' then
    for v_l in select * from jsonb_array_elements(p->'links') loop
      exit when jsonb_array_length(v_links) >= 2;
      v_url := coalesce(v_l->>'url','');
      if length(v_url) between 11 and 300 and v_url ~ '^https://[^[:space:]<>"'']+$' then   -- (regex: máx. 255 repetições no Postgres)
        v_links := v_links || jsonb_build_array(jsonb_build_object('label', left(btrim(coalesce(v_l->>'label','')), 40), 'url', v_url));
      end if;
    end loop;
  end if;

  if jsonb_typeof(p->'ordem') = 'array' then
    for v_id in select jsonb_array_elements_text(p->'ordem') loop
      exit when n >= 200;
      continue when v_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
      continue when v_ordem @> jsonb_build_array(v_id);
      select id, venda_centavos into v_peca from pecas where id = v_id::uuid and loja_id = p_loja;
      continue when not found;
      v_it := case when jsonb_typeof(p->'itens'->v_id) = 'object' then p->'itens'->v_id else '{}'::jsonb end;
      v_ordem := v_ordem || jsonb_build_array(v_id);
      v_itens := v_itens || jsonb_build_object(v_id, jsonb_build_object(
        'preco',    case when v_it->>'preco' in ('preco','consulte','oculto') then v_it->>'preco' else 'preco' end,
        'centavos', greatest(case when v_it->>'centavos' ~ '^[0-9]{1,9}$' then (v_it->>'centavos')::int else v_peca.venda_centavos end, v_peca.venda_centavos),
        'tamanho',  coalesce(v_it->>'tamanho','true') <> 'false',
        'banho',    coalesce(v_it->>'banho','true') <> 'false',
        'nota',     left(btrim(coalesce(v_it->>'nota','')), 80),
        'foto',     case when v_it->>'foto' ~ '^[0-9]{1,2}$' then (v_it->>'foto')::int else 0 end));
      n := n + 1;
    end loop;
  end if;

  return jsonb_build_object('nome', v_nome, 'frase', v_frase, 'fonte', v_fonte, 'cor', v_cor, 'whatsapp', v_zap,
                            'modelo', v_modelo, 'capa', v_capa, 'links', v_links, 'ordem', v_ordem, 'itens', v_itens);
end $f$;

revoke all on function public.lona_loja_ok(uuid), public.lona_pode_gerir(uuid,uuid), public.lona_reservado(uuid),
                       public.lona_slug(text), public.lona_sanear(uuid,jsonb), public.lona_foto(text[],int) from public, anon, authenticated;

-- 4) GESTÃO (dona e consultora logadas)

-- resumo: as lonas que a pessoa pode ver (dona: todas as consultoras da loja; consultora: só a dela)
create or replace function public.lona_resumo() returns jsonb
language plpgsql stable security definer set search_path = public as $f$
begin
  if auth.uid() is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'consultora_id', c.id, 'nome', c.nome, 'eh_dona', c.eh_dona, 'slug', l.slug,
             'publicada', l.publicado is not null,
             'abertos', (select count(*) from lona_pedidos o where o.consultora_id = c.id and o.status in ('aberto','pago')))
           order by c.eh_dona desc, c.nome)
      from consultoras c left join lonas l on l.consultora_id = c.id
     where c.ativa and (privado.minha_loja(c.loja_id) or c.usuario_id = auth.uid())), '[]'::jsonb);
end $f$;

-- abre (e cria na primeira vez) a lona de uma consultora; sem argumento: a da própria pessoa
create or replace function public.lona_minha(p_consultora uuid default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $f$
declare
  v_uid uuid := auth.uid(); v_cons consultoras; v_loja lojas; v_lona lonas; v_padrao jsonb; v_tent int := 0;
begin
  if v_uid is null then raise exception 'Entre para continuar' using errcode = 'LX401'; end if;
  if p_consultora is null then
    select * into v_cons from consultoras where usuario_id = v_uid and ativa limit 1;
    if not found then
      select c.* into v_cons from consultoras c join lojas l on l.id = c.loja_id where l.dona_id = v_uid and c.eh_dona limit 1;
    end if;
  else
    select * into v_cons from consultoras where id = p_consultora;
  end if;
  if not found then raise exception 'Consultora não encontrada' using errcode = 'LX404'; end if;
  if not coalesce(privado.minha_loja(v_cons.loja_id) or v_cons.usuario_id = v_uid, false) then
    raise exception 'Sem permissão' using errcode = 'LX403';
  end if;
  select * into v_loja from lojas where id = v_cons.loja_id;

  select * into v_lona from lonas where consultora_id = v_cons.id;
  if not found then
    if not public.lona_pode_gerir(v_cons.loja_id, v_cons.id) then
      raise exception 'O plano da loja está em modo leitura' using errcode = 'LX402';
    end if;
    v_padrao := public.lona_sanear(v_cons.loja_id, jsonb_build_object(
      'nome', v_cons.nome, 'frase', 'O que está na minha maleta hoje.', 'fonte', 'helvetica', 'cor', '#1a1a1a',
      'whatsapp', case when v_cons.eh_dona then coalesce(v_loja.whatsapp,'') else '' end,
      'modelo', E'Oi! Quero essa da maleta de {nome}.\n\n{pecas}\n\nPode separar pra mim?'));
    loop
      begin
        insert into lonas (loja_id, consultora_id, slug, rascunho)
        values (v_cons.loja_id, v_cons.id, public.lona_slug(v_cons.nome), v_padrao) returning * into v_lona;
        exit;
      exception when unique_violation then
        v_tent := v_tent + 1;
        if v_tent > 4 then raise; end if;
        select * into v_lona from lonas where consultora_id = v_cons.id;   -- outra aba criou ao mesmo tempo
        exit when found;
      end;
    end loop;
  end if;

  return jsonb_build_object(
    'id', v_lona.id, 'slug', v_lona.slug, 'consultora_id', v_cons.id, 'consultora_nome', v_cons.nome, 'eh_dona', v_cons.eh_dona,
    'rascunho', v_lona.rascunho, 'publicado', v_lona.publicado, 'publicado_em', v_lona.publicado_em,
    'pix_chave', v_loja.pix_chave, 'loja_nome', v_loja.nome,
    'pode_editar', public.lona_pode_gerir(v_cons.loja_id, v_cons.id));
end $f$;

create or replace function public.lona_salvar(p_lona uuid, p_rascunho jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $f$
declare v_l lonas; v_novo jsonb;
begin
  select * into v_l from lonas where id = p_lona;
  if not found then raise exception 'Lona não encontrada' using errcode = 'LX404'; end if;
  if not public.lona_pode_gerir(v_l.loja_id, v_l.consultora_id) then raise exception 'Sem permissão' using errcode = 'LX403'; end if;
  v_novo := public.lona_sanear(v_l.loja_id, p_rascunho);
  update lonas set rascunho = v_novo, atualizada_em = now() where id = p_lona;
  return v_novo;
end $f$;

create or replace function public.lona_publicar(p_lona uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $f$
declare v_l lonas; v_pub jsonb;
begin
  select * into v_l from lonas where id = p_lona;
  if not found then raise exception 'Lona não encontrada' using errcode = 'LX404'; end if;
  if not public.lona_pode_gerir(v_l.loja_id, v_l.consultora_id) then raise exception 'Sem permissão' using errcode = 'LX403'; end if;
  v_pub := public.lona_sanear(v_l.loja_id, v_l.rascunho);
  if length(v_pub->>'nome') < 2 then raise exception 'Dê um nome à sua lona' using errcode = 'LX422'; end if;
  if (v_pub->>'whatsapp') = '' then raise exception 'Informe seu WhatsApp (com DDD) para publicar' using errcode = 'LX422'; end if;
  update lonas set publicado = v_pub, publicado_em = now(), rascunho = v_pub, atualizada_em = now() where id = p_lona;
  return jsonb_build_object('slug', v_l.slug, 'publicado_em', now(), 'pecas', jsonb_array_length(v_pub->'ordem'));
end $f$;

create or replace function public.lona_tirar_do_ar(p_lona uuid) returns void
language plpgsql volatile security definer set search_path = public as $f$
declare v_l lonas;
begin
  select * into v_l from lonas where id = p_lona;
  if not found then raise exception 'Lona não encontrada' using errcode = 'LX404'; end if;
  if not public.lona_pode_gerir(v_l.loja_id, v_l.consultora_id) then raise exception 'Sem permissão' using errcode = 'LX403'; end if;
  update lonas set publicado = null, publicado_em = null, atualizada_em = now() where id = p_lona;
end $f$;

-- chave Pix da loja: só a dona
create or replace function public.lona_salvar_pix(p_chave text) returns void
language plpgsql volatile security definer set search_path = public as $f$
declare v_loja uuid;
begin
  select id into v_loja from lojas where dona_id = auth.uid();
  if v_loja is null or not privado.pode_escrever(v_loja) then raise exception 'Só a dona da loja pode mudar a chave Pix' using errcode = 'LX403'; end if;
  update lojas set pix_chave = nullif(btrim(left(coalesce(p_chave,''), 140)), '') where id = v_loja;
end $f$;

-- pedidos que a pessoa pode ver (dona: da loja inteira; consultora: os dela)
create or replace function public.lona_pedidos_listar(p_consultora uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $f$
begin
  if auth.uid() is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(x order by (x->>'criado_em') desc) from (
      select jsonb_build_object(
        'id', o.id, 'consultora_id', o.consultora_id, 'consultora_nome', c.nome,
        'cliente_nome', o.cliente_nome, 'cliente_whatsapp', o.cliente_whatsapp,
        'origem', o.origem, 'status', o.status, 'total_centavos', o.total_centavos, 'criado_em', o.criado_em,
        'reserva_ativa', (o.status in ('aberto','pago') and o.criado_em > now() - interval '7 days'),
        'itens', (select coalesce(jsonb_agg(jsonb_build_object(
                    'id', i.id, 'peca_id', i.peca_id, 'codigo', i.codigo, 'nome', i.nome, 'preco_centavos', i.preco_centavos,
                    'preco_loja_centavos', (select p.venda_centavos from pecas p where p.id = i.peca_id),
                    'estoque_ok', coalesce((select p.qtd >= 1 from pecas p where p.id = i.peca_id), false)) order by i.codigo), '[]'::jsonb)
                    from lona_pedido_itens i where i.pedido_id = o.id)) as x
        from lona_pedidos o join consultoras c on c.id = o.consultora_id
       where (privado.minha_loja(o.loja_id) or c.usuario_id = auth.uid())
         and (p_consultora is null or o.consultora_id = p_consultora)
       order by o.criado_em desc limit 100) t), '[]'::jsonb);
end $f$;

-- A cliente fechou, a dona/consultora confirma: vira venda pelo registrar_venda de sempre (tudo ou nada).
create or replace function public.lona_confirmar_pedido(p_pedido uuid, p_valores jsonb default '{}'::jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $f$
declare
  v_o lona_pedidos; v_it record; v_valor int; v_mod modalidade; v_pago boolean; v_v uuid; v_vendas uuid[] := '{}'; v_total int := 0;
begin
  select * into v_o from lona_pedidos where id = p_pedido for update;
  if not found then raise exception 'Pedido não encontrado' using errcode = 'LX404'; end if;
  if not public.lona_pode_gerir(v_o.loja_id, v_o.consultora_id) then raise exception 'Sem permissão' using errcode = 'LX403'; end if;
  if v_o.status not in ('aberto','pago') then raise exception 'Este pedido já está %', v_o.status using errcode = 'LX409'; end if;

  v_mod  := (case v_o.origem when 'pago_loja' then 'dinheiro' else 'confianca' end)::modalidade;
  v_pago := (v_o.origem = 'pago_loja');

  for v_it in select * from lona_pedido_itens where pedido_id = p_pedido order by id loop
    if v_it.peca_id is null then raise exception 'A peça % não existe mais no estoque', v_it.codigo using errcode = 'LX410'; end if;
    v_valor := case
      when jsonb_typeof(p_valores) = 'object' and (p_valores->>(v_it.id::text)) ~ '^[0-9]{1,9}$' then (p_valores->>(v_it.id::text))::int
      else coalesce(v_it.preco_centavos, (select venda_centavos from pecas where id = v_it.peca_id)) end;
    v_v := public.registrar_venda(v_o.loja_id, v_it.peca_id, 1, v_valor, v_mod, v_o.consultora_id, null, v_o.cliente_nome, v_pago, null);
    update lona_pedido_itens set venda_id = v_v, preco_centavos = v_valor where id = v_it.id;
    v_vendas := v_vendas || v_v;
    v_total := v_total + v_valor;
  end loop;

  update lona_pedidos set status = 'confirmado', total_centavos = v_total, atualizado_em = now() where id = p_pedido;

  -- a cliente passa a existir em Clientes (se o telefone ainda não estiver lá)
  insert into clientes (loja_id, nome, telefone)
  select v_o.loja_id, v_o.cliente_nome, v_o.cliente_whatsapp
   where not exists (select 1 from clientes c where c.loja_id = v_o.loja_id
                      and regexp_replace(coalesce(c.telefone,''), '\D', '', 'g') in (v_o.cliente_whatsapp, '55' || v_o.cliente_whatsapp));

  return jsonb_build_object('ok', true, 'vendas', to_jsonb(v_vendas), 'total_centavos', v_total);
end $f$;

create or replace function public.lona_cancelar_pedido(p_pedido uuid) returns void
language plpgsql volatile security definer set search_path = public as $f$
declare v_o lona_pedidos;
begin
  select * into v_o from lona_pedidos where id = p_pedido for update;
  if not found then raise exception 'Pedido não encontrado' using errcode = 'LX404'; end if;
  if not public.lona_pode_gerir(v_o.loja_id, v_o.consultora_id) then raise exception 'Sem permissão' using errcode = 'LX403'; end if;
  if v_o.status not in ('aberto','pago') then raise exception 'Este pedido já está %', v_o.status using errcode = 'LX409'; end if;
  update lona_pedidos set status = 'cancelado', atualizado_em = now() where id = p_pedido;
end $f$;

-- 5) PÚBLICO (a cliente final, sem login)

-- a vitrine: só o que foi PUBLICADO. Nunca devolve custo nem quantidade em estoque.
create or replace function public.lona_publica(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $f$
declare
  v_lona lonas; v_loja lojas; v_pub jsonb; v_itens jsonb := '[]'::jsonb; v_id text; v_it jsonb; v_p pecas; v_foto text;
begin
  if p_slug is null or length(p_slug) > 40 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then return null; end if;
  select l.* into v_lona from lonas l join consultoras c on c.id = l.consultora_id
   where l.slug = p_slug and l.publicado is not null and c.ativa;
  if not found then return null; end if;
  if not public.lona_loja_ok(v_lona.loja_id) then return null; end if;
  select * into v_loja from lojas where id = v_lona.loja_id;
  v_pub := v_lona.publicado;

  for v_id in select jsonb_array_elements_text(v_pub->'ordem') loop
    select * into v_p from pecas where id = v_id::uuid and loja_id = v_lona.loja_id and not arquivada;
    continue when not found;
    continue when v_p.qtd - public.lona_reservado(v_p.id) < 1;
    v_it := v_pub->'itens'->v_id;
    v_foto := public.lona_foto(v_p.fotos, coalesce((v_it->>'foto')::int, 0));
    continue when v_foto is null;
    v_itens := v_itens || jsonb_build_array(jsonb_build_object(
      'id', v_p.id, 'codigo', v_p.codigo, 'nome', v_p.nome, 'foto', v_foto,
      'preco', v_it->>'preco',
      'centavos', case when v_it->>'preco' = 'preco' then greatest((v_it->>'centavos')::int, v_p.venda_centavos) end,
      'banho',   case when (v_it->>'banho')::boolean   then nullif(v_p.banho,'')   end,
      'tamanho', case when (v_it->>'tamanho')::boolean then nullif(v_p.tamanho,'') end,
      'nota', nullif(v_it->>'nota','')));
  end loop;

  return jsonb_build_object(
    'slug', v_lona.slug, 'loja', v_loja.nome, 'nome', v_pub->>'nome', 'frase', v_pub->>'frase', 'fonte', v_pub->>'fonte',
    'cor', v_pub->>'cor', 'whatsapp', v_pub->>'whatsapp', 'modelo', v_pub->>'modelo', 'capa', v_pub->>'capa',
    'links', v_pub->'links', 'pix', nullif(v_loja.pix_chave,''), 'itens', v_itens);
end $f$;

-- o pedido da cliente: reserva as peças (sem mexer no estoque) e avisa a vendedora. Com tetos contra abuso.
create or replace function public.lona_criar_pedido(p_slug text, p_nome text, p_whatsapp text, p_pecas uuid[], p_origem text) returns jsonb
language plpgsql volatile security definer set search_path = public as $f$
declare
  v_lona lonas; v_nome text; v_zap text; v_ids uuid[]; v_pid uuid; v_p pecas; v_it jsonb;
  v_abertos int; v_do_zap int; v_indis text[] := '{}'; v_ped uuid; v_preco int; v_total int := 0;
begin
  if p_slug is null or length(p_slug) > 40 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Esta lona não está disponível' using errcode = 'LX404';
  end if;
  select l.* into v_lona from lonas l join consultoras c on c.id = l.consultora_id
   where l.slug = p_slug and l.publicado is not null and c.ativa;
  if not found or not public.lona_loja_ok(v_lona.loja_id) then
    raise exception 'Esta lona não está disponível' using errcode = 'LX404';
  end if;
  if p_origem is null or p_origem not in ('pago_loja','entrega') then raise exception 'Forma inválida' using errcode = 'LX422'; end if;

  v_nome := btrim(regexp_replace(coalesce(p_nome,''), '[[:cntrl:]]', '', 'g'));
  if length(v_nome) < 2 or length(v_nome) > 60 then raise exception 'Informe seu nome' using errcode = 'LX422'; end if;
  v_zap := regexp_replace(coalesce(p_whatsapp,''), '\D', '', 'g');
  if length(v_zap) > 11 then v_zap := right(v_zap, 11); end if;
  if v_zap !~ '^[0-9]{10,11}$' then raise exception 'Informe seu WhatsApp com DDD' using errcode = 'LX422'; end if;
  if p_pecas is null or cardinality(p_pecas) < 1 or cardinality(p_pecas) > 50 then
    raise exception 'Escolha de 1 a 8 peças' using errcode = 'LX422';
  end if;
  select array_agg(distinct x order by x) into v_ids from unnest(p_pecas) x;
  if cardinality(v_ids) > 8 then raise exception 'Escolha de 1 a 8 peças' using errcode = 'LX422'; end if;

  -- tetos contra abuso (pedido sem login pode ser spam)
  select count(*) into v_abertos from lona_pedidos where lona_id = v_lona.id and status in ('aberto','pago') and criado_em > now() - interval '7 days';
  if v_abertos >= 30 then raise exception 'Há muitos pedidos em aberto nesta lona. Fale direto no WhatsApp.' using errcode = 'LX429'; end if;
  select count(*) into v_do_zap from lona_pedidos where lona_id = v_lona.id and cliente_whatsapp = v_zap and status in ('aberto','pago') and criado_em > now() - interval '24 hours';
  if v_do_zap >= 3 then raise exception 'Você já tem pedidos em aberto nesta lona. Fale direto no WhatsApp.' using errcode = 'LX429'; end if;

  -- só vale o que a vitrine MOSTRA (na lona publicada, não arquivada, com foto da web, com unidade livre)
  -- e trava as peças em ordem fixa: duas clientes não levam a mesma última unidade
  for v_pid in select x from unnest(v_ids) x order by x loop
    select * into v_p from pecas where id = v_pid and loja_id = v_lona.loja_id and not arquivada for update;
    if not found
       or not (v_lona.publicado->'ordem' @> jsonb_build_array(v_pid::text))
       or v_p.qtd - public.lona_reservado(v_pid) < 1
       or public.lona_foto(v_p.fotos, coalesce((v_lona.publicado->'itens'->(v_pid::text)->>'foto')::int, 0)) is null then
      v_indis := v_indis || coalesce(v_p.codigo, 'peça');
    end if;
  end loop;
  if cardinality(v_indis) > 0 then
    raise exception 'Algumas peças acabaram de sair: %', array_to_string(v_indis, ', ') using errcode = 'LX410';
  end if;

  insert into lona_pedidos (lona_id, loja_id, consultora_id, cliente_nome, cliente_whatsapp, origem, status)
  values (v_lona.id, v_lona.loja_id, v_lona.consultora_id, v_nome, v_zap, p_origem, case when p_origem = 'pago_loja' then 'pago' else 'aberto' end)
  returning id into v_ped;

  for v_pid in select x from unnest(v_ids) x order by x loop
    select * into v_p from pecas where id = v_pid;
    v_it := v_lona.publicado->'itens'->(v_pid::text);
    v_preco := case when v_it->>'preco' = 'preco' then greatest((v_it->>'centavos')::int, v_p.venda_centavos) end;
    insert into lona_pedido_itens (pedido_id, peca_id, codigo, nome, preco_centavos) values (v_ped, v_pid, v_p.codigo, v_p.nome, v_preco);
    v_total := v_total + coalesce(v_preco, 0);
  end loop;
  update lona_pedidos set total_centavos = v_total where id = v_ped;

  return jsonb_build_object('ok', true, 'total_centavos', v_total);
end $f$;

-- 6) permissões das funções
revoke all on function
  public.lona_resumo(), public.lona_minha(uuid), public.lona_salvar(uuid,jsonb), public.lona_publicar(uuid), public.lona_tirar_do_ar(uuid),
  public.lona_salvar_pix(text), public.lona_pedidos_listar(uuid), public.lona_confirmar_pedido(uuid,jsonb), public.lona_cancelar_pedido(uuid),
  public.lona_publica(text), public.lona_criar_pedido(text,text,text,uuid[],text) from public, anon, authenticated;
grant execute on function
  public.lona_resumo(), public.lona_minha(uuid), public.lona_salvar(uuid,jsonb), public.lona_publicar(uuid), public.lona_tirar_do_ar(uuid),
  public.lona_salvar_pix(text), public.lona_pedidos_listar(uuid), public.lona_confirmar_pedido(uuid,jsonb), public.lona_cancelar_pedido(uuid)
  to authenticated;
grant execute on function public.lona_publica(text), public.lona_criar_pedido(text,text,text,uuid[],text) to anon, authenticated;
