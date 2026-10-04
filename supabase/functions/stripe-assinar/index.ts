// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*  stripe-assinar: abre o pagamento (Stripe Checkout) da assinatura. Só a DONA da loja, logada.
 *  O PREÇO é decidido AQUI (o navegador só diz plano e período). Segredo: STRIPE_SECRET_KEY.
 *  Sem o segredo responde 503 "nao_configurado" e o app cai no atendimento por WhatsApp. */
const URL_SB = Deno.env.get("SUPABASE_URL");
const ANON = Deno.env.get("SUPABASE_ANON_KEY");
const SERV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const ORIGENS = ["https://comluxijewelry.pages.dev"].concat(String(Deno.env.get("LUXI_ORIGENS_EXTRAS") || "").split(",").map((s) => s.trim()).filter(Boolean));

// <<precos
const PRECOS = { inicio: { nome: "Solo", mensal: 6990 }, crescimento: { nome: "Equipe", mensal: 12990 } }; // centavos; Escala/Visão ainda "em breve"
const centavosAnual = (mensal) => Math.round(mensal * 12 * 0.95); // igual ao app: 12 meses com 5% de desconto
// precos>>

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
    if (!user) return j(401, { codigo: "sem_sessao", mensagem: "Entre novamente para assinar." }, h);

    const corpo = (await req.json().catch(() => null)) || {};
    const preco = PRECOS[corpo.plano];
    const periodo = corpo.periodo === "anual" ? "anual" : "mensal";
    if (!preco) return j(400, { codigo: "plano_invalido", mensagem: "Esse plano ainda não está aberto para assinatura." }, h);

    const sb = createClient(URL_SB, SERV, { auth: { persistSession: false } });
    const { data: loja } = await sb.from("lojas").select("id").eq("dona_id", user.id).maybeSingle();
    if (!loja) return j(403, { codigo: "sem_loja", mensagem: "Só a dona da loja pode assinar." }, h);
    const { data: ass } = await sb.from("assinaturas").select("status,gateway,gateway_cliente").eq("loja_id", loja.id).maybeSingle();
    if (ass && ass.status === "ativa" && ass.gateway === "stripe") return j(409, { codigo: "ja_assinante", mensagem: "Você já tem uma assinatura ativa. Use “Gerenciar assinatura”." }, h);

    const origem = ORIGENS.includes(req.headers.get("origin")) ? req.headers.get("origin") : ORIGENS[0];
    const unit = periodo === "anual" ? centavosAnual(preco.mensal) : preco.mensal;
    const f = new URLSearchParams();
    f.set("mode", "subscription");
    f.set("success_url", `${origem}/?pagamento=ok`);
    f.set("cancel_url", `${origem}/?pagamento=cancelado`);
    f.set("client_reference_id", loja.id);
    f.set("locale", "pt-BR");
    f.set("allow_promotion_codes", "true");
    f.set("line_items[0][quantity]", "1");
    f.set("line_items[0][price_data][currency]", "brl");
    f.set("line_items[0][price_data][unit_amount]", String(unit));
    f.set("line_items[0][price_data][recurring][interval]", periodo === "anual" ? "year" : "month");
    f.set("line_items[0][price_data][product_data][name]", `Luxi ${preco.nome} (${periodo})`);
    for (const alvo of ["metadata", "subscription_data[metadata]"]) {
      f.set(`${alvo}[loja_id]`, loja.id);
      f.set(`${alvo}[plano]`, corpo.plano);
      f.set(`${alvo}[periodo]`, periodo);
    }
    if (ass && ass.gateway === "stripe" && ass.gateway_cliente) f.set("customer", ass.gateway_cliente);
    else f.set("customer_email", user.email);

    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${STRIPE_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: f,
    });
    const s = await r.json().catch(() => ({}));
    if (!r.ok || !s.url) {
      console.error("[assinar] stripe", r.status, s && s.error && s.error.message);
      return j(502, { codigo: "stripe", mensagem: "Não consegui abrir o pagamento agora. Tente de novo em instantes." }, h);
    }
    return j(200, { url: s.url }, h);
  } catch (e) {
    console.error("[assinar] erro", e && e.message);
    return j(500, { codigo: "erro", mensagem: "Algo deu errado. Tente de novo." }, h);
  }
});
