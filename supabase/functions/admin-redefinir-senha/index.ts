// admin-redefinir-senha — a ADMINISTRADORA redefine a senha de uma cliente que não consegue entrar.
//
// Segurança (é a ação mais sensível do painel — quem a controla controla qualquer conta):
//  • o chamador precisa estar logado E ser administradora (conferido no BANCO com o token dele, não pela tela);
//  • contas de administração não podem ser alvo; limite de 20 redefinições por hora; tudo vai para a auditoria;
//  • a senha temporária é gerada aqui com aleatoriedade criptográfica (ou digitada pela administradora, mín. 8);
//  • a cliente é obrigada a criar uma senha nova no primeiro acesso, e os logins antigos dela são encerrados;
//  • a resposta nunca é guardada em cache e erros nunca repetem a senha.
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

// sem 0/O, 1/l/I: a cliente vai ler e digitar essa senha do WhatsApp
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
export function gerarSenha(tam = 10): string {
  const limite = 256 - (256 % ALFABETO.length); // descarta o "resto" para não enviesar a sorte
  let saida = "";
  while (saida.length < tam) {
    const bytes = new Uint8Array(tam * 2);
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (b < limite && saida.length < tam) saida += ALFABETO[b % ALFABETO.length];
    }
  }
  return saida;
}

export interface Deps {
  clienteDoUsuario: (jwt: string) => any; // cliente com o token de quem chamou
  admin: any; // cliente com chave de serviço
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
  const email = String(corpo?.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return resp({ erro: "email_invalido" }, 400);
  const digitada = corpo?.senha == null || corpo.senha === "" ? null : String(corpo.senha);
  if (digitada !== null && (digitada.length < 8 || digitada.length > 72)) return resp({ erro: "senha_invalida" }, 400);

  // 4) o alvo pode ser redefinido?
  const { data: alvo, error: eAlvo } = await deps.admin.rpc("admin_alvo_redefinicao", { p_admin: quem.user.id, p_email: email });
  if (eAlvo) {
    if (eAlvo.code === "LX404") return resp({ erro: "cliente_nao_encontrada" }, 404);
    if (eAlvo.code === "LX403") return resp({ erro: "conta_de_administracao" }, 403);
    if (eAlvo.code === "LX429") return resp({ erro: "muitas_tentativas" }, 429);
    return resp({ erro: "falha" }, 500);
  }

  // 5) troca a senha
  const senha = digitada ?? gerarSenha(10);
  const { error: eTroca } = await deps.admin.auth.admin.updateUserById(alvo, { password: senha });
  if (eTroca) return resp({ erro: "nao_redefiniu" }, 500);

  // 6) marca como temporária, registra na auditoria e encerra os logins antigos.
  //    Se só isso falhar, a senha JÁ mudou: devolvemos a senha (senão a administradora perderia o acesso a ela) com aviso.
  const { error: eReg } = await deps.admin.rpc("admin_concluir_redefinicao", { p_admin: quem.user.id, p_user: alvo, p_email: email });
  return resp({ ok: true, email, senha, gerada: digitada === null, registrado: !eReg });
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
