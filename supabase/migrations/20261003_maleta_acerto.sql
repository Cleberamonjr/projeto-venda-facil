-- ============================================================================================
-- MALETA — acerto completo, auditável e reversível
-- Equipe: cada unidade recebe um estado (voltou, vendeu ou sumiu).
-- Nada cria ERP: usa estoque, vendas e contas que já existem.
-- ============================================================================================

create table if not exists public.maleta_acertos (
  id uuid primary key default gen_random_uuid(),
  maleta_id uuid not null unique references public.maletas(id) on delete restrict,
  loja_id uuid not null references public.lojas(id) on delete cascade,
  consultora_id uuid not null references public.consultoras(id) on delete restrict,
  status text not null default 'aberto' check (status in ('aberto','fechado','desfeito')),
  dona_confirmou_em timestamptz,
  dona_confirmou_por uuid,
  consultora_confirmou_em timestamptz,
  consultora_confirmou_por uuid,
  acerto_junto boolean not null default false,
  fechado_em timestamptz,
  desfeito_em timestamptz,
  desfeito_por uuid,
  desfeito_motivo text,
  voltaram_centavos integer not null default 0,
  venderam_centavos integer not null default 0,
  comissao_centavos integer not null default 0,
  repasse_centavos integer not null default 0,
  sumiram_custo_centavos integer not null default 0,
  lucro_centavos integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.maleta_acerto_itens (
  id uuid primary key default gen_random_uuid(),
  acerto_id uuid not null references public.maleta_acertos(id) on delete cascade,
  maleta_item_id uuid not null references public.maleta_itens(id) on delete restrict,
  unidade integer not null check (unidade > 0),
  estado text not null default 'pendente' check (estado in ('pendente','voltou','vendeu','sumiu')),
  venda_id uuid references public.vendas(id) on delete set null,
  codigo text not null,
  nome text,
  custo_centavos integer not null default 0,
  venda_centavos integer not null default 0,
  comissao_centavos integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique(acerto_id, maleta_item_id, unidade)
);

create index if not exists maleta_acertos_loja_idx on public.maleta_acertos(loja_id, status, criado_em desc);
create index if not exists maleta_acerto_itens_acerto_idx on public.maleta_acerto_itens(acerto_id, estado);
create index if not exists maleta_acerto_itens_venda_idx on public.maleta_acerto_itens(venda_id);

alter table public.maleta_acertos enable row level security;
alter table public.vendas add column if not exists cancelada_em timestamptz;
alter table public.vendas add column if not exists cancelada_por uuid;
alter table public.vendas add column if not exists cancelada_motivo text;

create table if not exists public.contas_receber (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  consultora_id uuid references public.consultoras(id) on delete set null,
  origem text not null default 'maleta_acerto',
  referencia_id uuid references public.maleta_acertos(id) on delete set null,
  nome text not null,
  valor_centavos integer not null check (valor_centavos >= 0),
  vencimento date not null,
  status text not null default 'aberta' check (status in ('aberta','recebida','cancelada')),
  recebido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index if not exists contas_receber_ref_idx on public.contas_receber(referencia_id) where referencia_id is not null;
create index if not exists contas_receber_loja_idx on public.contas_receber(loja_id,status,vencimento);
alter table public.contas_receber enable row level security;
revoke all on table public.contas_receber from public,anon,authenticated;
create policy contas_receber_select on public.contas_receber for select to authenticated
using (privado.minha_loja(loja_id));
create policy contas_receber_update on public.contas_receber for update to authenticated
using (privado.pode_escrever(loja_id))
with check (privado.pode_escrever(loja_id));
grant select, update on public.contas_receber to authenticated;
alter table public.maleta_acerto_itens enable row level security;
revoke all on table public.maleta_acertos, public.maleta_acerto_itens from public, anon, authenticated;

create or replace function public.maleta_equipe_ok(p_loja uuid)
returns boolean
language sql stable security definer set search_path = public
as $f$
  select exists (
    select 1
      from public.assinaturas a
     where a.loja_id = p_loja
       and a.status in ('trial','ativa')
       and a.plano in ('crescimento','joalheria','inteligencia')
  );
$f$;

create or replace function public.maleta_pode_gerir(p_maleta uuid)
returns boolean
language sql stable security definer set search_path = public
as $f$
  select coalesce(
    exists (
      select 1
        from public.maletas m
       where m.id = p_maleta
         and public.maleta_equipe_ok(m.loja_id)
         and (
           public.minha_loja(m.loja_id)
           or public.minha_consultoria(m.loja_id) = m.consultora_id
         )
    ), false);
$f$;

create or replace function public.maleta_acerto_dados(p_maleta uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $f$
declare
  v_m public.maletas;
  v_a public.maleta_acertos;
  v_i record;
  v_v record;
  v_sold integer;
  v_total integer;
  v_unit integer;
begin
  if not public.maleta_pode_gerir(p_maleta) then
    raise exception 'Sem permissão' using errcode = 'LX403';
  end if;

  select * into v_m from public.maletas where id = p_maleta;
  if not found then raise exception 'Maleta não encontrada' using errcode = 'LX404'; end if;

  select * into v_a from public.maleta_acertos where maleta_id = p_maleta;
  if not found then
    insert into public.maleta_acertos(maleta_id,loja_id,consultora_id)
    values(v_m.id,v_m.loja_id,v_m.consultora_id)
    returning * into v_a;

    for v_i in select * from public.maleta_itens where maleta_id=p_maleta order by codigo,id loop
      select coalesce(sum(v.qtd),0) into v_sold
        from public.vendas v
       where v.loja_id=v_m.loja_id and v.consultora_id=v_m.consultora_id
         and v.peca_id=v_i.peca_id and v.maleta_id=p_maleta
         and v.cancelada_em is null;

      v_total := greatest(0,coalesce(v_i.qtd,0)) + coalesce(v_sold,0);

      for v_unit in 1..v_total loop
        insert into public.maleta_acerto_itens(
          acerto_id,maleta_item_id,unidade,estado,codigo,nome,custo_centavos,venda_centavos
        ) values(
          v_a.id,v_i.id,v_unit,'pendente',v_i.codigo,v_i.nome,
          v_i.custo_centavos,v_i.venda_centavos
        );
      end loop;

      -- Reaproveita as vendas que já existem, respeitando a comissão
      -- registrada no dia da venda. Uma venda de 2 unidades ocupa 2 linhas.
      for v_v in
        select * from public.vendas v
         where v.loja_id=v_m.loja_id and v.consultora_id=v_m.consultora_id
           and v.peca_id=v_i.peca_id and v.maleta_id=p_maleta
           and v.cancelada_em is null
         order by v.vendida_em,v.id
      loop
        for v_unit in 1..greatest(0,v_v.qtd) loop
          update public.maleta_acerto_itens x
             set estado='vendeu',venda_id=v_v.id,
                 venda_centavos=round(v_v.valor_centavos::numeric/greatest(v_v.qtd,1))::int,
                 custo_centavos=round(v_v.custo_centavos::numeric/greatest(v_v.qtd,1))::int,
                 comissao_centavos=round(coalesce(v_v.comissao_centavos,0)::numeric/greatest(v_v.qtd,1))::int,
                 atualizado_em=now()
           where x.id=(
             select y.id from public.maleta_acerto_itens y
              where y.acerto_id=v_a.id and y.maleta_item_id=v_i.id and y.estado='pendente'
              order by y.unidade limit 1);
        end loop;
      end loop;
    end loop;
  end if;

  return jsonb_build_object(
    'id',v_a.id,'maleta_id',v_a.maleta_id,'status',v_a.status,
    'dona_confirmou_em',v_a.dona_confirmou_em,
    'consultora_confirmou_em',v_a.consultora_confirmou_em,
    'acerto_junto',v_a.acerto_junto,'fechado_em',v_a.fechado_em,
    'desfeito_em',v_a.desfeito_em,
    'resumo',jsonb_build_object(
      'voltou',v_a.voltaram_centavos,'vendeu',v_a.venderam_centavos,
      'comissao',v_a.comissao_centavos,'repasse',v_a.repasse_centavos,
      'sumiu',v_a.sumiram_custo_centavos,'lucro',v_a.lucro_centavos),
    'itens',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',i.id,'maleta_item_id',i.maleta_item_id,'unidade',i.unidade,
        'estado',i.estado,'venda_id',i.venda_id,'codigo',i.codigo,'nome',i.nome,
        'custo_centavos',i.custo_centavos,'venda_centavos',i.venda_centavos,
        'comissao_centavos',i.comissao_centavos
      ) order by i.codigo,i.unidade)
      from public.maleta_acerto_itens i where i.acerto_id=v_a.id
    ),'[]'::jsonb)
  );
end $f$;

create or replace function public.maleta_acerto_salvar(
  p_maleta uuid, p_itens jsonb, p_dona_confirmou boolean default false,
  p_consultora_confirmou boolean default false, p_acerto_junto boolean default false
)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $f$
declare
  v_m public.maletas;
  v_a public.maleta_acertos;
  v_uid uuid := auth.uid();
  v_cons_id uuid;
  v_owner boolean;
  v_cons boolean;
  v_rec record;
  v_pend integer;
begin
  if not public.maleta_pode_gerir(p_maleta) then raise exception 'Sem permissão' using errcode='LX403'; end if;
  select * into v_m from public.maletas where id=p_maleta for update;
  if not found then raise exception 'Maleta não encontrada' using errcode='LX404'; end if;
  if v_m.status <> 'aberta' then raise exception 'Esta maleta já foi acertada' using errcode='LX409'; end if;
  select * into v_a from public.maleta_acertos where maleta_id=p_maleta for update;
  if not found then
    perform public.maleta_acerto_dados(p_maleta);
    select * into v_a from public.maleta_acertos where maleta_id=p_maleta for update;
  end if;

  -- Só aceita os ids do acerto desta maleta e os estados permitidos.
  for v_rec in
    select * from jsonb_to_recordset(coalesce(p_itens,'[]'::jsonb))
      as x(id uuid, estado text, venda_id uuid)
  loop
    if v_rec.id is null or v_rec.estado not in ('pendente','voltou','vendeu','sumiu') then
      raise exception 'Acerto inválido' using errcode='LX422';
    end if;
    update public.maleta_acerto_itens
       set estado=v_rec.estado,
           venda_id=case when v_rec.estado='vendeu' then v_rec.venda_id else null end,
           atualizado_em=now()
     where id=v_rec.id and acerto_id=v_a.id;
    if not found then raise exception 'Peça do acerto não encontrada' using errcode='LX404'; end if;
  end loop;

  v_owner := privado.minha_loja(v_m.loja_id);
  v_cons := privado.minha_consultoria(v_m.loja_id) = v_m.consultora_id;

  if p_acerto_junto and not v_owner then raise exception 'Só a dona pode marcar acerto feito junto' using errcode='LX403'; end if;
  if p_dona_confirmou and not v_owner then raise exception 'Só a dona pode confirmar' using errcode='LX403'; end if;
  if p_consultora_confirmou and not v_cons then raise exception 'Só a consultora pode confirmar' using errcode='LX403'; end if;

  if v_owner and (p_dona_confirmou or p_acerto_junto) then
    update public.maleta_acertos set dona_confirmou_em=coalesce(dona_confirmou_em,now()), dona_confirmou_por=v_uid,
      acerto_junto=p_acerto_junto or acerto_junto, atualizado_em=now() where id=v_a.id;
  end if;
  if v_cons and p_consultora_confirmou then
    update public.maleta_acertos set consultora_confirmou_em=coalesce(consultora_confirmou_em,now()), consultora_confirmou_por=v_uid, atualizado_em=now() where id=v_a.id;
  end if;

  select count(*) into v_pend from public.maleta_acerto_itens where acerto_id=v_a.id and estado='pendente';
  update public.maleta_acertos set voltaram_centavos=coalesce((select sum(venda_centavos) from public.maleta_acerto_itens where acerto_id=v_a.id and estado='voltou'),0),
    venderam_centavos=coalesce((select sum(venda_centavos) from public.maleta_acerto_itens where acerto_id=v_a.id and estado='vendeu'),0),
    comissao_centavos=coalesce((select sum(comissao_centavos) from public.maleta_acerto_itens where acerto_id=v_a.id and estado='vendeu'),0),
    repasse_centavos=coalesce((select sum(venda_centavos-comissao_centavos) from public.maleta_acerto_itens where acerto_id=v_a.id and estado='vendeu'),0),
    sumiram_custo_centavos=coalesce((select sum(custo_centavos) from public.maleta_acerto_itens where acerto_id=v_a.id and estado='sumiu'),0),
    lucro_centavos=coalesce((select sum(venda_centavos-custo_centavos-comissao_centavos) from public.maleta_acerto_itens where acerto_id=v_a.id and estado='vendeu'),0)
      - coalesce((select sum(custo_centavos) from public.maleta_acerto_itens where acerto_id=v_a.id and estado='sumiu'),0),
    atualizado_em=now() where id=v_a.id;

  select * into v_a from public.maleta_acertos where id=v_a.id;
  return jsonb_build_object('ok',true,'fechou',false,'pendentes',v_pend,'resumo',jsonb_build_object(
    'voltou',v_a.voltaram_centavos,'vendeu',v_a.venderam_centavos,'comissao',v_a.comissao_centavos,
    'repasse',v_a.repasse_centavos,'sumiu',v_a.sumiram_custo_centavos,'lucro',v_a.lucro_centavos));
end $f$;

create or replace function public.maleta_acerto_fechar(p_maleta uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $f$
declare
  v_m public.maletas; v_a public.maleta_acertos; v_i record; v_v record; v_used integer; v_pending integer;
  v_venda_id uuid; v_rate integer;
begin
  if not public.maleta_pode_gerir(p_maleta) then raise exception 'Sem permissão' using errcode='LX403'; end if;
  select * into v_m from public.maletas where id=p_maleta for update;
  if not found then raise exception 'Maleta não encontrada' using errcode='LX404'; end if;
  if v_m.status <> 'aberta' then raise exception 'Esta maleta já foi acertada' using errcode='LX409'; end if;
  select * into v_a from public.maleta_acertos where maleta_id=p_maleta for update;
  if not found then raise exception 'Comece o acerto antes de fechar' using errcode='LX422'; end if;

  if v_a.dona_confirmou_em is null then raise exception 'A dona ainda não confirmou' using errcode='LX422'; end if;
  if v_a.consultora_confirmou_em is null and not v_a.acerto_junto then raise exception 'Falta a confirmação da consultora' using errcode='LX422'; end if;
  select count(*) into v_pending from public.maleta_acerto_itens where acerto_id=v_a.id and estado='pendente';
  if v_pending > 0 then raise exception 'Ainda faltam peças para conferir' using errcode='LX422'; end if;

  -- Vende: se não houver venda ligada, a peça precisa ter sido registrada
  -- pelo fluxo de venda da maleta antes do fechamento.
  for v_i in select * from public.maleta_acerto_itens where acerto_id=v_a.id and estado='vendeu' order by id loop
    if v_i.venda_id is null then
      raise exception 'A venda de % ainda não foi registrada', v_i.codigo using errcode='LX422';
    end if;
    if not exists(select 1 from public.vendas v where v.id=v_i.venda_id and v.loja_id=v_m.loja_id and v.consultora_id=v_m.consultora_id) then
      raise exception 'A venda de % não confere com esta consultora', v_i.codigo using errcode='LX422';
    end if;
  end loop;

  -- A unidade voltou: sai da maleta e entra no estoque vendável.
  for v_i in select * from public.maleta_acerto_itens where acerto_id=v_a.id and estado='voltou' loop
    update public.pecas p
       set qtd=qtd+1
     where p.id=(select mi.peca_id from public.maleta_itens mi where mi.id=v_i.maleta_item_id);
    update public.maleta_itens set qtd=greatest(0,qtd-1) where id=v_i.maleta_item_id;
  end loop;

  -- A unidade sumiu: não volta ao estoque, mas deixa de estar na maleta.
  for v_i in select * from public.maleta_acerto_itens where acerto_id=v_a.id and estado='sumiu' loop
    update public.maleta_itens set qtd=greatest(0,qtd-1) where id=v_i.maleta_item_id;
  end loop;

  -- Garante que cada venda usada no acerto está vinculada à maleta.
  for v_i in select * from public.maleta_acerto_itens where acerto_id=v_a.id and estado='vendeu' loop
    update public.vendas set maleta_id=p_maleta where id=v_i.venda_id and maleta_id is null;
  end loop;

  -- O repasse da consultora vira uma conta a receber com vencimento no dia do acerto.
  if v_a.repasse_centavos > 0 then
    insert into public.contas_receber(loja_id,consultora_id,referencia_id,nome,valor_centavos,vencimento)
    values(v_m.loja_id,v_m.consultora_id,v_a.id,
           'Repasse de ' || coalesce((select nome from public.consultoras where id=v_m.consultora_id),'consultora'),
           v_a.repasse_centavos,current_date)
    on conflict (referencia_id) do nothing;
  end if;

  update public.maletas set status='fechada', fechada_em=now() where id=p_maleta;
  update public.maleta_acertos set status='fechado', fechado_em=now(), atualizado_em=now() where id=v_a.id;

  return jsonb_build_object('ok',true,'fechou',true,'acerto_id',v_a.id);
end $f$;

create or replace function public.maleta_registrar_venda(
  p_maleta uuid,p_peca uuid,p_qtd integer,p_valor_cent integer,
  p_modalidade text,p_cliente text default null,p_pago boolean default true,p_cobrar_em date default null
)
returns uuid
language plpgsql volatile security definer set search_path = public
as $f$
declare
  v_m public.maletas; v_c public.consultoras; v_mi public.maleta_itens; v_v uuid; v_comissao integer;
begin
  if not public.maleta_pode_gerir(p_maleta) then raise exception 'Sem permissão' using errcode='LX403'; end if;
  select * into v_m from public.maletas where id=p_maleta for update;
  if not found then raise exception 'Maleta não encontrada' using errcode='LX404'; end if;
  select * into v_c from public.consultoras where id=v_m.consultora_id;
  if v_m.status <> 'aberta' then raise exception 'Maleta já acertada' using errcode='LX409'; end if;
  if p_qtd <> 1 then raise exception 'Registre uma unidade por vez' using errcode='LX422'; end if;

  select * into v_mi from public.maleta_itens
   where maleta_id=p_maleta and peca_id=p_peca and qtd>0
   order by id limit 1 for update;
  if not found then raise exception 'Não há mais unidades desta peça na maleta' using errcode='LX422'; end if;

  v_comissao := round(coalesce(p_valor_cent,0)::numeric * coalesce(v_c.comissao,0) / 100)::int;

  insert into public.vendas(
    loja_id,peca_id,consultora_id,maleta_id,codigo,nome,qtd,valor_centavos,
    custo_centavos,comissao_centavos,modalidade,cliente,pago,cobrar_em
  )
  select v_m.loja_id,p.id,v_m.consultora_id,p_maleta,p.codigo,p.nome,1,p_valor_cent,
         p.custo_centavos,v_comissao,p_modalidade::modalidade,p_cliente,p_pago,p_cobrar_em
    from public.pecas p
   where p.id=p_peca and p.loja_id=v_m.loja_id and not p.arquivada
  returning id into v_v;

  if v_v is null then raise exception 'Peça não encontrada' using errcode='LX404'; end if;

  -- A unidade continua fora do estoque da loja e agora sai da quantidade física da maleta.
  update public.maleta_itens set qtd=qtd-1 where id=v_mi.id;

  -- Se o acerto já estava aberto, marca uma unidade como vendida imediatamente.
  update public.maleta_acerto_itens
     set estado='vendeu',venda_id=v_v,
         venda_centavos=p_valor_cent,custo_centavos=v_mi.custo_centavos,
         comissao_centavos=v_comissao,atualizado_em=now()
   where id=(
     select id from public.maleta_acerto_itens
      where acerto_id=(select id from public.maleta_acertos where maleta_id=p_maleta)
        and maleta_item_id=v_mi.id and estado='pendente'
      order by unidade limit 1);

  return v_v;
end $f$;

create or replace function public.maleta_acerto_desfazer(p_maleta uuid,p_motivo text default null)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $f$
declare
  v_m public.maletas; v_a public.maleta_acertos; v_i record; v_c record;
begin
  if not public.maleta_pode_gerir(p_maleta) then raise exception 'Sem permissão' using errcode='LX403'; end if;
  select * into v_m from public.maletas where id=p_maleta for update;
  if not found then raise exception 'Maleta não encontrada' using errcode='LX404'; end if;
  select * into v_a from public.maleta_acertos where maleta_id=p_maleta for update;
  if not found or v_a.status <> 'fechado' then raise exception 'Só é possível desfazer um acerto fechado' using errcode='LX422'; end if;
  -- Retira do estoque somente o que entrou por este acerto.
  for v_i in select * from public.maleta_acerto_itens where acerto_id=v_a.id and estado='voltou' loop
    update public.pecas p
       set qtd=greatest(0,qtd-1)
     where p.id=(select mi.peca_id from public.maleta_itens mi where mi.id=v_i.maleta_item_id);
  end loop;
  -- Vendas registradas durante este acerto são estornadas explicitamente:
  -- deixam de aparecer na operação e a unidade volta para a maleta.
  for v_i in select * from public.maleta_acerto_itens where acerto_id=v_a.id and estado='vendeu' and venda_id is not null loop
    update public.vendas
       set cancelada_em=now(), cancelada_por=auth.uid(),
           cancelada_motivo=left(btrim(coalesce(p_motivo,'Desfazer acerto')),500)
     where id=v_i.venda_id
       and maleta_id=p_maleta
       and cancelada_em is null;
    update public.maleta_itens mi
       set qtd=qtd+1
     where mi.id=v_i.maleta_item_id;
  end loop;
  update public.contas_receber
     set status='cancelada',atualizado_em=now()
   where referencia_id=v_a.id and status='aberta';
  update public.maleta_acertos set status='desfeito',desfeito_em=now(),desfeito_por=auth.uid(),desfeito_motivo=left(btrim(coalesce(p_motivo,'')),500),atualizado_em=now() where id=v_a.id;
  update public.maletas set status='aberta',fechada_em=null where id=p_maleta;
  return jsonb_build_object('ok',true,'reaberta',true);
end $f$;

revoke all on function public.maleta_equipe_ok(uuid), public.maleta_pode_gerir(uuid), public.maleta_acerto_dados(uuid),
  public.maleta_acerto_salvar(uuid,jsonb,boolean,boolean,boolean), public.maleta_acerto_fechar(uuid),
  public.maleta_registrar_venda(uuid,uuid,integer,integer,text,text,boolean,date),
  public.maleta_acerto_desfazer(uuid,text) from public,anon,authenticated;
grant execute on function public.maleta_acerto_dados(uuid), public.maleta_acerto_salvar(uuid,jsonb,boolean,boolean,boolean),
  public.maleta_acerto_fechar(uuid), public.maleta_registrar_venda(uuid,uuid,integer,integer,text,text,boolean,date),
  public.maleta_acerto_desfazer(uuid,text) to authenticated;
