-- Aplicada em produção em 29/09/2026. Fotos de peças no armazenamento (não mais como texto dentro da peça).
-- Leitura pública (endereço com UUID impossível de adivinhar; rápido e cacheável no celular);
-- só a própria loja consegue ENVIAR, e só para a pasta dela ({loja_id}/arquivo.jpg).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-pecas', 'fotos-pecas', true, 1048576, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 1048576,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists fotos_pecas_enviar on storage.objects;
create policy fotos_pecas_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-pecas' and privado.pode_escrever(((storage.foldername(name))[1])::uuid));
