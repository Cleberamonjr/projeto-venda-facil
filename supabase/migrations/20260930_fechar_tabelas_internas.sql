-- APLICADA em produção em 29/09/2026.
-- Tabelas internas (registro de ações da administradora, senhas temporárias, quem é administradora):
-- só o servidor lê e escreve. Antes, apenas a proteção de linhas (RLS) impedia clientes de lerem;
-- agora nem a permissão básica existe (duas travas em vez de uma). O app nunca as acessa direto.
revoke all on table public.auditoria_admin    from anon, authenticated;
revoke all on table public.senhas_temporarias from anon, authenticated;
revoke all on table public.luxi_admins        from anon, authenticated;
