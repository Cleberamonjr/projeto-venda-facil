-- Peça sem foto na internet passa a APARECER na vitrine (com espaço "foto em breve") e a poder ser pedida.
-- Motivo: nas lojas reais nenhuma peça tinha foto; a vitrine nasceria vazia.
-- Vitrine e pedido continuam seguindo a MESMA regra de "o que é visível" (não arquivada, na lona publicada, com unidade livre).
do $b$
declare d text; d0 text;
begin
  select pg_get_functiondef('public.lona_publica(text)'::regprocedure) into d; d0 := d;
  d := replace(d, $x$    continue when v_foto is null;
$x$, '');
  if d = d0 then raise exception 'lona_publica: trecho não encontrado'; end if;
  execute d;

  select pg_get_functiondef('public.lona_criar_pedido(text,text,text,uuid[],text)'::regprocedure) into d; d0 := d;
  d := replace(d, $x$
       or public.lona_foto(v_p.fotos, coalesce((v_lona.publicado->'itens'->(v_pid::text)->>'foto')::int, 0)) is null then$x$, ' then');
  if d = d0 then raise exception 'lona_criar_pedido: trecho não encontrado'; end if;
  execute d;
end $b$;
