// criar-conta-beta — cria a conta de uma cliente do beta JÁ CONFIRMADA (sem e-mail de confirmação).
//
// Segurança: só age com um link de convite válido (token secreto de 128 bits gerado no painel admin).
// O e-mail vem do convite guardado no banco — nunca do que a pessoa digita. Sem token válido, nada é criado.
// Publicada com verify_jwt=false porque quem chama ainda não tem conta.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const resp = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// `admin` é o cliente com chave de serviço (injetado para poder testar a lógica sem o Supabase).
export async function tratar(req: Request, admin: any): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resp({ erro: "metodo" }, 405);

  let corpo: any;
  try { corpo = await req.json(); } catch { return resp({ erro: "corpo_invalido" }, 400); }
  const token = String(corpo?.token ?? "").trim();
  const senha = String(corpo?.senha ?? "");
  if (token.length < 16 || token.length > 200) return resp({ erro: "convite_invalido" }, 400);
  if (senha.length < 6 || senha.length > 72) return resp({ erro: "senha_invalida" }, 400);

  const { data: convite, error: eConsulta } = await admin
    .from("acessos_beta")
    .select("email, ativo, expira_em")
    .eq("convite_token", token)
    .maybeSingle();
  if (eConsulta) return resp({ erro: "falha_consulta" }, 500);
  if (!convite || !convite.ativo || new Date(convite.expira_em).getTime() <= Date.now()) {
    return resp({ erro: "convite_invalido" }, 400);
  }

  const { error } = await admin.auth.admin.createUser({
    email: convite.email,
    password: senha,
    email_confirm: true, // nasce confirmada: nenhum e-mail é enviado nem exigido
  });
  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (error.code === "email_exists" || msg.includes("already") || msg.includes("registered")) {
      return resp({ ok: true, existe: true, email: convite.email }); // já tem conta: o app pede a senha dela
    }
    return resp({ erro: "nao_criou" }, 500);
  }
  return resp({ ok: true, criada: true, email: convite.email });
}

// @ts-ignore — Deno só existe no servidor do Supabase
if (typeof Deno !== "undefined" && (Deno as any).serve) {
  // @ts-ignore
  const D = Deno as any;
  D.serve((req: Request) =>
    tratar(req, createClient(D.env.get("SUPABASE_URL")!, D.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })),
  );
}
