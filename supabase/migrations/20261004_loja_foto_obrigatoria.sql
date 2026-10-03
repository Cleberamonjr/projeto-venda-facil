-- Regra do produto: SEM FOTO, A PEÇA NÃO APARECE NA LOJA (vitrine e pedido seguem a mesma regra).
-- Desfaz 20261003_lona_foto_opcional e troca "lona" por "loja" nas mensagens que a cliente lê.
do $b$
declare d text; d0 text;
begin
  select pg_get_functiondef('public.lona_publica(text)'::regprocedure) into d; d0 := d;
  d := replace(d, $x$v_foto := public.lona_foto(v_p.fotos, coalesce((v_it->>'foto')::int, 0));$x$,
                  $x$v_foto := public.lona_foto(v_p.fotos, coalesce((v_it->>'foto')::int, 0));
    continue when v_foto is null;$x$);
  if d = d0 then raise exception 'lona_publica: trecho não encontrado'; end if;
  execute d;

  select pg_get_functiondef('public.lona_criar_pedido(text,text,text,uuid[],text)'::regprocedure) into d; d0 := d;
  d := replace(d, $x$public.lona_reservado(v_pid) < 1 then$x$,
                  $x$public.lona_reservado(v_pid) < 1
       or public.lona_foto(v_p.fotos, coalesce((v_lona.publicado->'itens'->(v_pid::text)->>'foto')::int, 0)) is null then$x$);
  if d = d0 then raise exception 'lona_criar_pedido (foto): trecho não encontrado'; end if;
  d0 := d;
  d := replace(replace(replace(d, 'Esta lona não está disponível', 'Esta loja não está disponível'),
                       'em aberto nesta lona', 'em aberto nesta loja'), 'pedidos em aberto nesta lona', 'pedidos em aberto nesta loja');
  if d = d0 then raise exception 'lona_criar_pedido (nome): trecho não encontrado'; end if;
  execute d;

  select pg_get_functiondef('public.lona_publicar(uuid)'::regprocedure) into d; d0 := d;
  d := replace(d, 'Dê um nome à sua lona', 'Dê um nome à sua loja');
  if d = d0 then raise exception 'lona_publicar: trecho não encontrado'; end if;
  execute d;
end $b$;
