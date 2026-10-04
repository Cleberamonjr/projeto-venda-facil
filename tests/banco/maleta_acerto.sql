-- Maleta: fluxo completo no banco real (dados fictícios, desfeito no fim). Rode no SQL Editor do Supabase.
create or replace function pg_temp.como(p_uid uuid, p_papel text, p_sql text) returns text language plpgsql as $f$
declare r text;
begin
  begin
    perform set_config('request.jwt.claims', case when p_uid is null then '{}' else json_build_object('sub', p_uid, 'role', p_papel)::text end, true);
    execute format('set local role %I', p_papel); execute p_sql into r; execute 'reset role';
    return 'OK|' || coalesce(r, '');
  exception when others then return 'ERRO|' || sqlstate || '|' || sqlerrm; end;
end $f$;
create or replace function pg_temp.t() returns text language plpgsql as $f$
declare d uuid := gen_random_uuid(); c uuid := gen_random_uuid(); L uuid := gen_random_uuid(); cd uuid := gen_random_uuid(); cc uuid := gen_random_uuid();
  p1 uuid := gen_random_uuid(); m1 uuid := gen_random_uuid(); mi1 uuid := gen_random_uuid(); res text[] := '{}'; r text; its jsonb; venda uuid;
begin
  begin
    insert into acessos_beta(email,plano,dias,expira_em,ativo,usado) select e,'beta',30,now()+interval '30 days',true,false from unnest(array['ml.dona@teste.com','ml.cons@teste.com']) e;
    insert into auth.users(id,email,aud,role,instance_id) values (d,'ml.dona@teste.com','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),(c,'ml.cons@teste.com','authenticated','authenticated','00000000-0000-0000-0000-000000000000');
    insert into lojas(id,dona_id,nome,slug) values (L,d,'Loja ML','loja-ml');
    insert into assinaturas(loja_id,plano,status,trial_ate) values (L,'crescimento','trial',now()+interval '10 days');
    insert into consultoras(id,loja_id,nome,comissao,eh_dona,ativa,usuario_id) values (cd,L,'Dona ML',0,true,true,d),(cc,L,'Bia ML',20,false,true,c);
    insert into pecas(id,loja_id,codigo,nome,qtd,custo_centavos,venda_centavos) values (p1,L,'ML-1','Anel ML',0,2500,6900);
    insert into maletas(id,loja_id,consultora_id,prazo_dias,status,aberta_em) values (m1,L,cc,30,'aberta',now());
    insert into maleta_itens(id,maleta_id,peca_id,codigo,nome,qtd,custo_centavos,venda_centavos) values (mi1,m1,p1,'ML-1','Anel ML',2,2500,6900);
    r := pg_temp.como(c,'authenticated', format('select public.maleta_acerto_dados(%L)::text', m1));
    r := pg_temp.como(c,'authenticated', format($q$select public.maleta_registrar_venda(%L,%L,1,10000,'dinheiro','Cliente ML',true)::text$q$, m1, p1)); venda := substr(r,4)::uuid;
    select jsonb_agg(jsonb_build_object('id',id,'estado',case when estado='vendeu' then 'vendeu' else 'voltou' end,'venda_id',venda_id)) into its from maleta_acerto_itens where acerto_id=(select id from maleta_acertos where maleta_id=m1);
    r := pg_temp.como(c,'authenticated', format($q$select public.maleta_acerto_salvar(%L,%L::jsonb,false,true,false)::text$q$, m1, its));
    r := pg_temp.como(d,'authenticated', format($q$select public.maleta_acerto_salvar(%L,'[]'::jsonb,true,false,false)::text$q$, m1));
    r := pg_temp.como(d,'authenticated', format('select public.maleta_acerto_fechar(%L)::text', m1));
    res := res || format('%s dona fecha o acerto | maleta=%s, peça voltou (qtd=%s), conta R$ %s (esperado 80)', case when r like 'OK|%' and (select status from maletas where id=m1)='fechada' and (select qtd from pecas where id=p1)=1 and (select valor_centavos from contas_receber where loja_id=L)=8000 then '✅' else '❌' end, (select status from maletas where id=m1), (select qtd from pecas where id=p1), (select valor_centavos/100 from contas_receber where loja_id=L));
    r := pg_temp.como(c,'authenticated', format($q$select public.maleta_acerto_desfazer(%L,'tentativa')::text$q$, m1));
    res := res || format('%s consultora NÃO desfaz acerto fechado → %s', case when r like 'ERRO|LX403%' then '✅' else '❌' end, left(r,50));
    r := pg_temp.como(d,'authenticated', format($q$select public.maleta_acerto_desfazer(%L,'conferi errado')::text$q$, m1));
    res := res || format('%s dona desfaz | maleta=%s, venda estornada=%s, peça saiu (qtd=%s), conta=%s', case when r like 'OK|%' and (select status from maletas where id=m1)='aberta' and (select cancelada_em from vendas where id=venda) is not null and (select qtd from pecas where id=p1)=0 and (select status from contas_receber where loja_id=L)='cancelada' then '✅' else '❌' end, (select status from maletas where id=m1), (select cancelada_em is not null from vendas where id=venda), (select qtd from pecas where id=p1), (select status from contas_receber where loja_id=L));
    raise exception 'FIM|%', array_to_string(res, E'\n');
  exception when others then return case when sqlerrm like 'FIM|%' then substr(sqlerrm,5) else 'FALHA: '||sqlstate||' '||sqlerrm||E'\n'||array_to_string(res,E'\n') end; end;
end $f$;
select pg_temp.t() as resultado, (select count(*) from maleta_acertos) as acertos_restantes, (select count(*) from contas_receber) as contas_restantes, (select count(*) from auth.users where email like 'ml.%@teste.com') as usuarios_teste;
