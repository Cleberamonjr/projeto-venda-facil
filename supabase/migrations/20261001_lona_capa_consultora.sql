-- A consultora pode enviar SÓ a capa da própria lona: logos/<loja>/capa-<id dela>-<nome simples>, com o plano da loja em dia.
-- Segue o padrão da casa (privado.pode_escrever): a política chama UMA função pequena, que nunca dá erro e a que o papel authenticated tem acesso.
-- (Uma versão anterior chamava public.lona_loja_ok direto na política; o papel authenticated não tem acesso a ela e isso
--  derrubava TODO envio de arquivo. Foi revertida em minutos e refeita assim, testada antes numa transação desfeita.)
-- A dona continua usando a regra que já existia. Sem política de UPDATE/DELETE: cada envio é um arquivo novo.
create or replace function privado.pode_enviar_capa(p_nome text) returns boolean
language plpgsql stable security definer set search_path = public as $g$
declare v_loja uuid; v_cons uuid;
begin
  if p_nome is null or p_nome !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/capa-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[A-Za-z0-9._~-]{1,80}$' then
    return false;
  end if;
  v_loja := split_part(p_nome, '/', 1)::uuid;
  v_cons := privado.minha_consultoria(v_loja);
  return coalesce(v_cons is not null and public.lona_loja_ok(v_loja) and split_part(p_nome, '/', 2) like 'capa-' || v_cons::text || '-%', false);
end $g$;
revoke all on function privado.pode_enviar_capa(text) from public, anon;
grant execute on function privado.pode_enviar_capa(text) to authenticated;

drop policy if exists logos_capa_consultora on storage.objects;
create policy logos_capa_consultora on storage.objects for insert to authenticated
with check (bucket_id = 'logos' and privado.pode_enviar_capa(name));
