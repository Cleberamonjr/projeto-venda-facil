// csp-report — recebe os relatórios da política de segurança do navegador (Content-Security-Policy).
// Serve só para a administradora VER o que a política bloquearia/bloqueia, antes de ligar o bloqueio de vez.
//
// Privacidade: a URL da página pode carregar o segredo do link de convite (?beta=...). Guardamos apenas
// endereço + caminho (sem query nem fragmento) e só os campos abaixo — nunca o corpo inteiro.
// Publicada com verify_jwt=false (o navegador do visitante não tem token).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const vazio = (status = 204) => new Response(null, { status, headers: CORS });

// tira query e fragmento; valores como "inline", "eval", "data" passam como estão
export function semSegredo(u: unknown): string {
  if (!u) return "";
  const s = String(u);
  try {
    const x = new URL(s);
    return (x.origin === "null" ? x.protocol : x.origin) + x.pathname;
  } catch {
    return s.replace(/[?#].*$/, "").slice(0, 80);
  }
}

export async function tratar(req: Request, log: (linha: string) => void = console.log): Promise<Response> {
  if (req.method === "OPTIONS") return vazio();
  if (req.method !== "POST") return vazio(405);

  const texto = (await req.text()).slice(0, 8192); // limite: relatório de verdade é pequeno
  let itens: any[] = [];
  try {
    const j = JSON.parse(texto);
    itens = Array.isArray(j) ? j.map((r) => r?.body ?? r) : [j?.["csp-report"] ?? j];
  } catch {
    return vazio(); // lixo: ignora sem erro
  }
  for (const r of itens.slice(0, 5)) {
    if (!r || typeof r !== "object") continue;
    log("CSP_REPORT " + JSON.stringify({
      diretiva: String(r["effective-directive"] ?? r.effectiveDirective ?? r["violated-directive"] ?? r.violatedDirective ?? "").slice(0, 60),
      bloqueado: semSegredo(r["blocked-uri"] ?? r.blockedURL),
      pagina: semSegredo(r["document-uri"] ?? r.documentURL),
      arquivo: semSegredo(r["source-file"] ?? r.sourceFile),
      linha: Number(r["line-number"] ?? r.lineNumber) || null,
      modo: String(r.disposition ?? "").slice(0, 10),
    }));
  }
  return vazio();
}

// @ts-ignore — Deno só existe no servidor do Supabase
if (typeof Deno !== "undefined" && (Deno as any).serve) (Deno as any).serve((req: Request) => tratar(req));
