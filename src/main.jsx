import React from "react";
import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { linkSuporte } from "./contato.js";
import LonaPublica, { ErroDaLona } from "./LonaPublica.jsx";
import { slugDaUrl } from "./lona/util.js";

/* Vitrine pública (/?m=apelido): a cliente da vendedora abre SEM login. Nesse caso mostramos só a vitrine:
   sem app, sem instalar, sem faixa de "versão nova" e sem registrar o aplicativo no aparelho dela. */

// ============================================================
// SENTRY (monitoramento de erros)
// Só liga quando existe uma chave REAL em VITE_SENTRY_DSN (Cloudflare Pages > Variáveis do build).
// Sem chave nada é enviado. Nunca enviamos dados pessoais (nome/telefone das clientes) por padrão.
// ============================================================
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN && /^https:\/\/[^@\s]+@[^/\s]+\/\d+$/.test(SENTRY_DSN)) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    release: "luxi-1.0.0",
    environment: "production",
    sendDefaultPii: false,
    ignoreErrors: ["top.GLOBALS", "NetworkError", "TimeoutError", "cancelled"],
  });
}

const slugLona = slugDaUrl(window.location.search);

class ErroBoundary extends React.Component {
  constructor(p){ super(p); this.state = { erro: null, info: null }; }
  static getDerivedStateFromError(e){ return { erro: e }; }
  componentDidCatch(e, info){
    this.setState({ info });
    try{ console.error("Tela quebrou:", e, info); }catch(_){}
  }
  render(){
    if (this.state.erro) {
      const msg = String(this.state.erro && this.state.erro.message || this.state.erro || "erro desconhecido");
      const stack = String((this.state.info && this.state.info.componentStack) || (this.state.erro && this.state.erro.stack) || "").slice(0, 600);
      return React.createElement("div", { style:{ padding:"48px 24px", fontFamily:"'Helvetica Neue', Arial, sans-serif", maxWidth:520, margin:"0 auto" }},
        React.createElement("div", { style:{ fontSize:40, marginBottom:12, textAlign:"center" }}, "🌸"),
        React.createElement("h1", { style:{ fontSize:20, color:"#8B505C", marginBottom:8, textAlign:"center" }}, "Ops, algo travou"),
        React.createElement("p", { style:{ color:"#746569", fontSize:14, lineHeight:1.6, marginBottom:18, textAlign:"center" }},
          "Seus dados estão salvos. É só recarregar — se acontecer de novo, fale com a gente."),
        React.createElement("details", { style:{ marginBottom:20, fontSize:12, color:"#746569" }},
          React.createElement("summary", { style:{ cursor:"pointer", textAlign:"center", padding:8 }}, "Detalhes técnicos (para o suporte)"),
          React.createElement("div", { style:{ background:"#FDF2F4", border:"1px solid #EDD", borderRadius:10, padding:"12px 14px", marginTop:8, color:"#A8562F", fontFamily:"monospace", wordBreak:"break-word", whiteSpace:"pre-wrap", lineHeight:1.5 }},
            msg + "\n\n" + stack)),
        React.createElement("button", {
          onClick: () => { try{ if('caches' in window){ caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))); } }catch(_){} window.location.reload(); },
          style:{ background:"#A0606D", color:"#fff", border:"none", borderRadius:12, padding:"14px 28px", fontSize:15, cursor:"pointer", fontFamily:"inherit", display:"block", margin:"0 auto" }
        }, "Recarregar"),
        React.createElement("a", {
          href: linkSuporte("Oi! O Luxi travou aqui. Pode me ajudar?"), target: "_blank", rel: "noopener",
          style:{ display:"block", textAlign:"center", marginTop:14, color:"#8B505C", fontSize:14 }
        }, "Falar com a gente no WhatsApp")
      );
    }
    return this.props.children;
  }
}

/* ---------- Atualização segura ----------
   A versão nova NÃO troca sozinha no meio do uso: ela baixa em silêncio e espera.
   A pessoa escolhe "Atualizar" (ou simplesmente fecha e abre o app). Assim uma
   publicação com defeito não derruba quem está usando, e ninguém perde o que
   estava digitando. A faixa é feita fora do React de propósito: aparece até
   se o app quebrar. */
let swEsperando = null;
let aceitouAtualizar = false;

function atualizarAgora() {
  aceitouAtualizar = true;
  if (swEsperando) swEsperando.postMessage({ type: "SKIP_WAITING" });
  else window.location.reload();
}

function avisarNovaVersao() {
  if (document.getElementById("luxi-nova-versao")) return;
  const barra = document.createElement("div");
  barra.id = "luxi-nova-versao";
  barra.setAttribute("role", "status");
  barra.style.cssText =
    "position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147483000;" +
    "background:#3A2F35;color:#fff;border-radius:14px;padding:10px 12px 10px 16px;display:flex;gap:8px;" +
    "align-items:center;font:14px 'Helvetica Neue',Arial,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.3);max-width:520px;margin:0 auto";
  const texto = document.createElement("span");
  texto.style.flex = "1";
  texto.textContent = "Tem uma versão nova do Luxi.";
  const depois = document.createElement("button");
  depois.textContent = "Depois";
  depois.style.cssText = "background:none;border:none;color:#ddd;font:inherit;padding:10px 8px;cursor:pointer;min-height:40px";
  depois.onclick = () => barra.remove();
  const atualizar = document.createElement("button");
  atualizar.id = "luxi-atualizar";
  atualizar.textContent = "Atualizar";
  atualizar.style.cssText = "background:#A0606D;border:none;color:#fff;font:inherit;font-weight:600;padding:10px 16px;border-radius:10px;cursor:pointer;min-height:40px";
  atualizar.onclick = atualizarAgora;
  barra.append(texto, depois, atualizar);
  document.body.appendChild(barra);
}
window.addEventListener("luxi:nova-versao", avisarNovaVersao);

if (!slugLona && "serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");
      const checar = () => reg.update().catch(() => {});
      setInterval(checar, 10 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checar();
      });
      const quandoEsperar = (w) => {
        swEsperando = w;
        window.dispatchEvent(new Event("luxi:nova-versao"));
      };
      if (reg.waiting && navigator.serviceWorker.controller) quandoEsperar(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const n = reg.installing;
        if (!n) return;
        n.addEventListener("statechange", () => {
          if (n.state === "installed" && navigator.serviceWorker.controller) quandoEsperar(n);
        });
      });
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (aceitouAtualizar) window.location.reload();
      });
    } catch (e) {
      /* sem service worker o app funciona normalmente, só não guarda offline */
    }
  });
}

/* Sinal de vida da política de segurança: 1x por dia por aparelho, o app tenta carregar uma imagem que a
   política NÃO permite, de propósito. O relatório que chega ao servidor prova que o canal de relatórios funciona
   (sem isso, "nenhum relatório" não diria se está tudo certo ou se o canal quebrou). */
try {
  if (slugLona) throw new Error("vitrine pública: sem sinal da política de segurança");
  const hoje = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem("luxi:csp-sinal") !== hoje) {
    localStorage.setItem("luxi:csp-sinal", hoje);
    new Image().src = "https://csp-sinal.invalid/sinal.gif";
  }
} catch (e) {
  /* sem armazenamento local: sem sinal, e mais nada muda */
}

createRoot(document.getElementById("root")).render(
  slugLona
    ? <ErroDaLona><LonaPublica slug={slugLona}/></ErroDaLona>
    : <ErroBoundary><App/></ErroBoundary>
);
