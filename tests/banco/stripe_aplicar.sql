-- Cobrança: função public.stripe_aplicar no banco real (dados fictícios, desfeito no fim). Rode no SQL Editor do Supabase.
-- Esperado: 19 linhas com ✅ e as colunas *_restantes = 0.
create or replace function pg_temp.como(p_uid uuid, p_papel text, p_sql text) returns text language plpgsql as $f$
declare r text;
begin
  begin
    perform set_config('request.jwt.claims', case when p_uid is null then '{}' else json_build_object('sub', p_uid, 'role', p_papel)::text end, true);
    execute format('set local role %I', p_papel); execute p_sql into r; execute 'reset role';
    return 'OK|' || coalesce(r, '');
  exception when others then return 'ERRO|' || sqlstate || '|' || sqlerrm; end;
end $f$;
create or replace function pg_temp.ev(p_id text, p_tipo text, p jsonb) returns text language sql as $f$
  select pg_temp.como(null, 'service_role', format('select public.stripe_aplicar(%L,%L,%L::jsonb)', p_id, p_tipo, p::text));
$f$;
create or replace function pg_temp.t() returns text language plpgsql as $f$
declare d uuid := gen_random_uuid(); L uuid := gen_random_uuid(); res text[] := '{}'; r text; a assinaturas;
begin
  begin
    insert into acessos_beta(email,plano,dias,expira_em,ativo,usado) values ('st.dona@teste.com','beta',30,now()+interval '30 days',true,false);
    insert into auth.users(id,email,aud,role,instance_id) values (d,'st.dona@teste.com','authenticated','authenticated','00000000-0000-0000-0000-000000000000');
    insert into lojas(id,dona_id,nome,slug) values (L,d,'Loja ST','loja-st');
    insert into assinaturas(loja_id,plano,status,trial_ate) values (L,'crescimento','trial',now() - interval '1 day');   -- teste VENCIDO
    r := pg_temp.como(null,'anon', $q$select public.stripe_aplicar('evt_1Anon00000001','invoice.paid','{}'::jsonb)$q$);
    res := res || format('%s visitante NÃO chama a função de cobrança → %s', case when r like 'ERRO|42501%' then '✅' else '❌' end, left(r,40));
    r := pg_temp.como(d,'authenticated', $q$select public.stripe_aplicar('evt_1Dona00000001','invoice.paid','{}'::jsonb)$q$);
    res := res || format('%s nem a própria dona (logada) ativa a si mesma → %s', case when r like 'ERRO|42501%' then '✅' else '❌' end, left(r,40));
    r := pg_temp.como(d,'authenticated','select count(*)::text from public.stripe_eventos');
    res := res || format('%s tabela de eventos fechada para quem está logada → %s', case when r like 'ERRO|42501%' then '✅' else '❌' end, left(r,40));
    r := pg_temp.ev('evt_1Compra0000001','checkout.session.completed', jsonb_build_object('loja_id',L,'plano','inicio','cliente','cus_T1','assinatura','sub_T1'));
    select * into a from assinaturas where loja_id=L;
    res := res || format('%s COMPRA com teste vencido: %s | %s/%s/%s', case when r='OK|ativada' and a.status='ativa' and a.plano='inicio' and a.gateway='stripe' and a.gateway_cliente='cus_T1' and a.gateway_assinatura='sub_T1' then '✅' else '❌' end, r, a.status, a.plano, a.gateway);
    r := pg_temp.ev('evt_1Compra0000001','checkout.session.completed', jsonb_build_object('loja_id',L,'plano','crescimento','cliente','cus_T1','assinatura','sub_T1'));
    select * into a from assinaturas where loja_id=L;
    res := res || format('%s o MESMO evento reenviado não faz nada (plano segue %s) → %s', case when r='OK|repetido' and a.plano='inicio' then '✅' else '❌' end, a.plano, r);
    r := pg_temp.ev('evt_1Fantasma00001','checkout.session.completed', jsonb_build_object('loja_id',gen_random_uuid(),'plano','inicio','cliente','c','assinatura','s'));
    res := res || format('%s compra para loja que não existe é ignorada → %s', case when r = 'OK|ignorado:sem_loja' then '✅' else '❌' end, left(r,40));
    r := pg_temp.ev('evt_1EmBreve000001','checkout.session.completed', jsonb_build_object('loja_id',L,'plano','joalheria','cliente','cus_X','assinatura','sub_X'));
    res := res || format('%s plano "em breve" é RECUSADO e o evento não fica marcado → %s', case when r like 'ERRO%plano inválido%' and (select count(*) from stripe_eventos where id='evt_1EmBreve000001')=0 then '✅' else '❌' end, left(r,50));
    r := pg_temp.ev('evt_1Paga000000001','invoice.paid', jsonb_build_object('cliente','cus_T1','assinatura','sub_T1','proxima','2026-11-04'));
    select * into a from assinaturas where loja_id=L;
    res := res || format('%s renovação: %s | próxima cobrança=%s', case when r='OK|paga' and a.status='ativa' and a.proxima_cobranca='2026-11-04' then '✅' else '❌' end, r, a.proxima_cobranca);
    r := pg_temp.ev('evt_1Falha00000001','invoice.payment_failed', jsonb_build_object('cliente','cus_T1','assinatura','sub_T1'));
    select * into a from assinaturas where loja_id=L;
    res := res || format('%s cartão recusado: %s | status=%s', case when r='OK|atrasada' and a.status='atrasada' and a.atraso_desde is not null then '✅' else '❌' end, r, a.status);
    update assinaturas set atraso_desde = now() - interval '5 days' where loja_id=L;
    r := pg_temp.ev('evt_1Falha00000002','invoice.payment_failed', jsonb_build_object('cliente','cus_T1','assinatura','sub_T1'));
    res := res || format('%s 2ª falha NÃO reinicia a contagem dos dias de atraso', case when (select atraso_desde from assinaturas where loja_id=L) < now() - interval '4 days' then '✅' else '❌' end);
    r := pg_temp.ev('evt_1Paga000000002','invoice.paid', jsonb_build_object('cliente','cus_T1','assinatura','sub_T1','proxima','2026-12-04'));
    select * into a from assinaturas where loja_id=L;
    res := res || format('%s pagou depois: volta a ativa e zera o atraso', case when a.status='ativa' and a.atraso_desde is null then '✅' else '❌' end);
    r := pg_temp.ev('evt_1Cancela0000001','customer.subscription.deleted', jsonb_build_object('cliente','cus_T1','assinatura','sub_T1'));
    select * into a from assinaturas where loja_id=L;
    res := res || format('%s cancelamento: %s | status=%s', case when r='OK|cancelada' and a.status='cancelada' and a.cancelada_em is not null then '✅' else '❌' end, r, a.status);
    r := pg_temp.ev('evt_1Velho000000001','invoice.paid', jsonb_build_object('cliente','cus_T1','assinatura','sub_T1','proxima','2027-01-04'));
    select * into a from assinaturas where loja_id=L;
    res := res || format('%s evento ATRASADO/fora de ordem NÃO ressuscita assinatura cancelada → %s', case when r='OK|ignorado:cancelada' and a.status='cancelada' then '✅' else '❌' end, r);
    r := pg_temp.ev('evt_1Velho000000002','customer.subscription.updated', jsonb_build_object('cliente','cus_T1','assinatura','sub_T1','status','active'));
    res := res || format('%s "updated active" velho também não ressuscita → %s', case when r='OK|ignorado:cancelada' then '✅' else '❌' end, r);
    r := pg_temp.ev('evt_1Recompra00001','checkout.session.completed', jsonb_build_object('loja_id',L,'plano','crescimento','cliente','cus_T1','assinatura','sub_T2'));
    select * into a from assinaturas where loja_id=L;
    res := res || format('%s NOVA compra (nova assinatura) reativa: %s/%s', case when a.status='ativa' and a.plano='crescimento' and a.gateway_assinatura='sub_T2' and a.cancelada_em is null then '✅' else '❌' end, a.status, a.plano);
    r := pg_temp.ev('evt_1PastDue0000001','customer.subscription.updated', jsonb_build_object('cliente','cus_T1','assinatura','sub_T2','status','past_due'));
    res := res || format('%s Stripe avisa "past_due" → atrasada: %s', case when r='OK|atrasada' then '✅' else '❌' end, r);
    r := pg_temp.ev('evt_1Estranho000001','invoice.paid', jsonb_build_object('cliente','cus_NAOEXISTE','assinatura','sub_NAOEXISTE'));
    res := res || format('%s evento de cliente desconhecido é ignorado, sem erro → %s', case when r='OK|ignorado:sem_assinatura' then '✅' else '❌' end, r);
    r := pg_temp.ev('x; drop table lojas','invoice.paid','{}'::jsonb);
    res := res || format('%s id de evento malformado é recusado → %s', case when r like 'ERRO%evento inválido%' then '✅' else '❌' end, left(r,50));
    r := pg_temp.ev('evt_1TipoEstranho001','charge.refunded', jsonb_build_object('cliente','cus_T1','assinatura','sub_T2'));
    res := res || format('%s tipo de evento que não tratamos é ignorado → %s', case when r='OK|ignorado:tipo' then '✅' else '❌' end, r);
    raise exception 'FIM|%', array_to_string(res, E'\n');
  exception when others then return case when sqlerrm like 'FIM|%' then substr(sqlerrm,5) else 'FALHA: '||sqlstate||' '||sqlerrm||E'\n'||array_to_string(res,E'\n') end; end;
end $f$;
select pg_temp.t() as resultado, (select count(*) from stripe_eventos) as eventos_restantes, (select count(*) from auth.users where email like 'st.%@teste.com') as usuarios_teste, (select count(*) from lojas where nome='Loja ST') as lojas_teste;
