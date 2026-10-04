// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*  webhook-stripe  (v3, substitui a versão que gravava em tabelas que não existem e aceitava pedido sem assinatura)
 *  Recebe os avisos da Stripe e atualiza `assinaturas` pela função public.stripe_aplicar (atômica, idempotente).
 *  Regras: (1) SEM o segredo configurado, recusa tudo; (2) só aceita pedido com assinatura válida e recente;
 *  (3) nunca escreve a assinatura nem o segredo no registro.
 *  Segredos necessários (Supabase > Edge Functions > Secrets): STRIPE_WEBHOOK_SECRET. (URL e chave de serviço já vêm do Supabase.)
 */
const URL_SUPABASE = Deno.env.get("SUPABASE_URL");
const CHAVE_SERVICO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SEGREDO = Deno.env.get("STRIPE_WEBHOOK_SECRET");

// <<assinatura
const hex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
const iguais = (a, b) => {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
};
async function hmac(segredo, texto) {
  const enc = new TextEncoder();
  const chave = await crypto.subtle.importKey("raw", enc.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", chave, enc.encode(texto)));
}
async function assinaturaValida(corpo, cabecalho, segredo, agoraSeg, tolerancia = 300) {
  if (!cabecalho || !segredo) return false;
  let t = null;
  const v1 = [];
  for (const parte of String(cabecalho).split(",")) {
    const i = parte.indexOf("=");
    if (i < 0) continue;
    const k = parte.slice(0, i).trim();
    const v = parte.slice(i + 1).trim();
    if (k === "t") t = v;
    else if (k === "v1") v1.push(v);
  }
  if (!t || !/^\d{9,12}$/.test(t) || v1.length === 0) return false;
  if (Math.abs(agoraSeg - Number(t)) > tolerancia) return false;
  const esperado = await hmac(segredo, `${t}.${corpo}`);
  return v1.some((x) => iguais(x, esperado));
}
// assinatura>>

// <<mapa
const paraData = (seg) => (Number.isFinite(seg) && seg > 0 ? new Date(seg * 1000).toISOString().slice(0, 10) : null);
function mapearEvento(evento) {
  const o = evento && evento.data && evento.data.object;
  if (!o) return null;
  switch (evento.type) {
    case "checkout.session.completed":
      if (o.mode !== "subscription") return null;
      if (o.payment_status !== "paid" && o.payment_status !== "no_payment_required") return null;
      return {
        loja_id: o.client_reference_id || (o.metadata && o.metadata.loja_id) || null,
        plano: (o.metadata && o.metadata.plano) || null,
        cliente: o.customer || null,
        assinatura: o.subscription || null,
      };
    case "invoice.paid":
    case "invoice.payment_failed": {
      const l = o.lines && o.lines.data && o.lines.data[0];
      const assin = o.subscription || (o.parent && o.parent.subscription_details && o.parent.subscription_details.subscription) || null;
      return { cliente: o.customer || null, assinatura: assin, proxima: paraData(l && l.period && l.period.end) };
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return { cliente: o.customer || null, assinatura: o.id || null, status: o.status || null, proxima: paraData(o.current_period_end) };
    default:
      return null;
  }
}
// mapa>>

const resp = (status, corpo) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return resp(405, { erro: "método não permitido" });
  if (!SEGREDO) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET não configurado: recusando tudo");
    return resp(503, { erro: "webhook não configurado" });
  }
  try {
    const corpo = await req.text();
    if (corpo.length > 1_000_000) return resp(413, { erro: "grande demais" });
    const ok = await assinaturaValida(corpo, req.headers.get("stripe-signature"), SEGREDO, Math.floor(Date.now() / 1000));
    if (!ok) {
      console.warn("[stripe] assinatura inválida ou fora do prazo");
      return resp(400, { erro: "assinatura inválida" });
    }
    let evento;
    try { evento = JSON.parse(corpo); } catch { return resp(400, { erro: "corpo inválido" }); }
    if (!evento || typeof evento.id !== "string" || !/^evt_/.test(evento.id)) return resp(400, { erro: "evento inválido" });

    const p = mapearEvento(evento);
    if (!p) return resp(200, { ok: true, resultado: "ignorado" });

    const sb = createClient(URL_SUPABASE, CHAVE_SERVICO, { auth: { persistSession: false } });
    const { data, error } = await sb.rpc("stripe_aplicar", { p_evento: evento.id, p_tipo: evento.type, p });
    if (error) {
      console.error("[stripe] falha ao aplicar", evento.id, evento.type, error.message);
      return resp(500, { erro: "falha ao aplicar" }); // a Stripe tenta de novo
    }
    console.log("[stripe]", evento.type, evento.id, data);
    return resp(200, { ok: true, resultado: data });
  } catch (e) {
    console.error("[stripe] erro inesperado", e && e.message);
    return resp(500, { erro: "erro inesperado" });
  }
});
