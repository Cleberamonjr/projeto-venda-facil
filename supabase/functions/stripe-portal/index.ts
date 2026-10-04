// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*  stripe-portal: abre a área da Stripe onde a dona troca o cartão, vê faturas e cancela. Só a dona, logada.
 *  Precisa do "Portal do cliente" ativado em Stripe > Configurações > Billing. Segredo: STRIPE_SECRET_KEY. */
const URL_SB = Deno.env.get("SUPABASE_URL");
const ANON = Deno.env.get("SUPABASE_ANON_KEY");
const SERV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const ORIGENS = ["https://comluxijewelry.pages.dev"].concat(String(Deno.env.get("LUXI_ORIGENS_EXTRAS") || "").split(",").map((s) => s.trim()).filter(Boolean));
const cors = (req) => ({
  "Access-Control-Allow-Origin": ORIGENS.includes(req.headers.get("origin")) ? req.headers.get("origin") : ORIGENS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const j = (status, corpo, h) => new Response(JSON.stringify(corpo), { status, headers: { ...h, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const h = cors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return j(405, { codigo: "metodo", mensagem: "Método não permitido." }, h);
  try {
    if (!STRIPE_KEY) return j(503, { codigo: "nao_configurado", mensagem: "O pagamento on-line ainda não está ativo." }, h);
    const auth = req.headers.get("Authorization") || "";
    const usuarioSb = createClient(URL_SB, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: { user } } = await usuarioSb.auth.getUser();
    if (!user) return j(401, { codigo: "sem_sessao", mensagem: "Entre novamente." }, h);
    const sb = createClient(URL_SB, SERV, { auth: { persistSession: false } });
    const { data: loja } = await sb.from("lojas").select("id").eq("dona_id", user.id).maybeSingle();
    if (!loja) return j(403, { codigo: "sem_loja", mensagem: "Só a dona da loja gerencia a assinatura." }, h);
    const { data: ass } = await sb.from("assinaturas").select("gateway,gateway_cliente").eq("loja_id", loja.id).maybeSingle();
    if (!ass || ass.gateway !== "stripe" || !ass.gateway_cliente) return j(404, { codigo: "sem_assinatura", mensagem: "Você ainda não tem uma assinatura por cartão." }, h);
    const origem = ORIGENS.includes(req.headers.get("origin")) ? req.headers.get("origin") : ORIGENS[0];
    const f = new URLSearchParams();
    f.set("customer", ass.gateway_cliente);
    f.set("return_url", `${origem}/`);
    const r = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${STRIPE_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: f,
    });
    const s = await r.json().catch(() => ({}));
    if (!r.ok || !s.url) {
      console.error("[portal] stripe", r.status, s && s.error && s.error.message);
      return j(502, { codigo: "stripe", mensagem: "Não consegui abrir agora. Verifique se o portal do cliente está ativado na Stripe." }, h);
    }
    return j(200, { url: s.url }, h);
  } catch (e) {
    console.error("[portal] erro", e && e.message);
    return j(500, { codigo: "erro", mensagem: "Algo deu errado. Tente de novo." }, h);
  }
});
