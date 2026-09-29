import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

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
        }, "Recarregar")
      );
    }
    return this.props.children;
  }
}

if ("serviceWorker" in navigator) { window.addEventListener("load", async () => { try {
  const reg = await navigator.serviceWorker.register("./sw.js");
  const c=()=>reg.update().catch(()=>{}); c(); setInterval(c,30000);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")c();});
  reg.addEventListener("updatefound",()=>{const n=reg.installing;if(!n)return;n.addEventListener("statechange",()=>{if(n.state==="installed"&&navigator.serviceWorker.controller){n.postMessage({type:"SKIP_WAITING"});}});});
  let r=false; navigator.serviceWorker.addEventListener("controllerchange",()=>{if(r)return;r=true;window.location.reload();});
} catch(e){} }); }

createRoot(document.getElementById("root")).render(
  <ErroBoundary><App/></ErroBoundary>
);
