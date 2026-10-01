// admin-excluir-usuario — a ADMINISTRADORA exclui uma conta e os dados relacionados (ação IRREVERSÍVEL).
//
// Segurança (é a ação mais destrutiva do painel):
//  • o chamador precisa estar logado E ser administradora (conferido no BANCO com o token dele, não pela tela);
//  • o e-mail digitado para confirmar é comparado AQUI com o e-mail real da conta (a tela sozinha não vale);
//  • contas de administração e a própria conta de quem pede NÃO podem ser alvo; assinatura ativa exige confirmação extra;
//  • limite de 10 exclusões por hora; cada exclusão grava no registro interno (o quê, quando, motivo, contagens);
//  • ordem pensada para nunca deixar a cliente "pela metade": 1) banco numa transação só (ou apaga tudo ou nada),
//    2) arquivos (fotos, romaneios), 3) a conta. Se 2 ou 3 falharem, os dados já saíram e a conta passa a aparecer em
//    "Contas sem loja" para tentar de novo — a operação é repetível.
//  • registros financeiros NÃO são apagados (obrigação fiscal); a resposta nunca é guardada em cache.
// Publicada com verify_jwt=false: o token é validado aqui dentro (auth.getUser + sou_admin_luxi).
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const resp = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const BUCKETS = ["romaneios", "pecas", "logos", "fotos-pecas"]; // pasta de cada loja = id da loja
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Deps {
  clienteDoUsuario: (jwt: string) => any; // cliente com o token de quem chamou
  admin: any; // cliente com chave de serviço
}

export async function limparArquivos(admin: any, lojas: string[]): Promise<{ removidos: number; pendentes: string[] }> {
  let removidos = 0;
  const pendentes: string[] = [];
  for (const loja of lojas) {
    for (const bucket of BUCKETS) {
      try {
        for (let rodada = 0; rodada < 20; rodada++) {
          const { data, error } = await admin.storage.from(bucket).list(loja, { limit: 1000, offset: 0 });
          if (error) throw error;
          const caminhos = (data ?? []).filter((x: any) => x?.name && x.id !== null).map((x: any) => `${loja}/${x.name}`);
          if (!caminhos.length) break;
          const { error: eRem } = await admin.storage.from(bucket).remove(caminhos);
          if (eRem) throw eRem;
          removidos += caminhos.length;
        }
      } catch {
        pendentes.push(`${bucket}/${loja}`);
      }
    }
  }
  return { removidos, pendentes };
}

export async function tratar(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resp({ erro: "metodo" }, 405);

  // 1) quem chama está logado?
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return resp({ erro: "nao_autenticado" }, 401);
  const doUsuario = deps.clienteDoUsuario(jwt);
  const { data: quem, error: eQuem } = await doUsuario.auth.getUser(jwt);
  if (eQuem || !quem?.user?.id) return resp({ erro: "nao_autenticado" }, 401);

  // 2) é administradora? (conferido no banco)
  const { data: ehAdmin } = await doUsuario.rpc("sou_admin_luxi");
  if (ehAdmin !== true) return resp({ erro: "acesso_negado" }, 403);

  // 3) pedido válido?
  let corpo: any;
  try { corpo = await req.json(); } catch { return resp({ erro: "corpo_invalido" }, 400); }
  const userId = String(corpo?.user_id ?? "");
  if (!UUID.test(userId)) return resp({ erro: "usuario_invalido" }, 400);
  const confirmar = String(corpo?.confirmar_email ?? "").trim().toLowerCase();
  const motivo = String(corpo?.motivo ?? "").slice(0, 500);
  const forcar = corpo?.forcar === true;

  // 4) a conta existe e pode ser excluída? (prévia feita com o token da administradora, que confere o banco de novo)
  const { data: previa, error: ePrevia } = await doUsuario.rpc("admin_prever_exclusao", { p_user: userId });
  if (ePrevia) return ePrevia.code === "LX404" ? resp({ erro: "conta_nao_encontrada" }, 404) : resp({ erro: "falha" }, 500);
  if (previa?.e_admin || previa?.sou_eu) return resp({ erro: "conta_de_administracao" }, 403);

  // 5) confirmação digitada confere com o e-mail REAL da conta?
  if (!confirmar || confirmar !== String(previa?.email ?? "").toLowerCase()) return resp({ erro: "confirmacao_incorreta" }, 400);

  // 6) banco, numa transação só (ou apaga tudo ou nada)
  const { data: feito, error: eDb } = await deps.admin.rpc("admin_excluir_dados_usuario", {
    p_admin: quem.user.id, p_user: userId, p_motivo: motivo, p_forcar: forcar,
  });
  if (eDb) {
    if (eDb.code === "LX404") return resp({ erro: "conta_nao_encontrada" }, 404);
    if (eDb.code === "LX403") return resp({ erro: "conta_de_administracao" }, 403);
    if (eDb.code === "LX409") return resp({ erro: "assinatura_ativa" }, 409);
    if (eDb.code === "LX429") return resp({ erro: "muitas_exclusoes" }, 429);
    return resp({ erro: "falha_no_banco" }, 500); // nada foi apagado
  }

  // 7) arquivos (fotos, romaneios) e 8) a conta — repetíveis se falharem
  const arquivos = await limparArquivos(deps.admin, Array.isArray(feito?.lojas) ? feito.lojas : []);
  let contaRemovida = true;
  const { error: eConta } = await deps.admin.auth.admin.deleteUser(userId);
  if (eConta && !/not.?found|n[ãa]o encontrad/i.test(String(eConta.message ?? ""))) contaRemovida = false;

  const pendencias = [...(arquivos.pendentes.length ? ["arquivos"] : []), ...(contaRemovida ? [] : ["conta"])];
  return resp({
    ok: true, email: previa.email, apagado: feito?.contagens ?? {},
    arquivos_removidos: arquivos.removidos, conta_removida: contaRemovida, pendencias,
  });
}

// @ts-ignore — Deno só existe no servidor do Supabase
if (typeof Deno !== "undefined" && (Deno as any).serve) {
  // @ts-ignore
  const D = Deno as any;
  const URL = D.env.get("SUPABASE_URL")!;
  const ANON = D.env.get("SUPABASE_ANON_KEY")!;
  const SERVICO = D.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  D.serve((req: Request) =>
    tratar(req, {
      clienteDoUsuario: (jwt) => createClient(URL, ANON, { ...opts, global: { headers: { Authorization: `Bearer ${jwt}` } } }),
      admin: createClient(URL, SERVICO, opts),
    }),
  );
}
