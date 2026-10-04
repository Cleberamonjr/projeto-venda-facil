# Testes do banco (rodam no SQL Editor do Supabase; criam dados fictícios e DESFAZEM tudo no fim)

Cada arquivo é uma função temporária que monta uma loja de teste, simula quem chama (visitante, intruso, consultora, dona) e
termina com um erro proposital que desfaz tudo. O resultado vem na coluna `resultado` (✅/❌) e as colunas `*_restantes` devem ser 0.

- `maleta_acerto.sql`: vender pela maleta, fechar, tentar desfazer como consultora (recusado) e como dona (aceito).
- Padrão aprendido (lona e maleta): permissão que devolve NULL passa em `if not ...` (use `coalesce(..., false)`);
  `on conflict` em índice parcial precisa repetir o `where` do índice; política de storage só pode chamar função que `authenticated` executa.
