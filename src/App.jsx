import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import * as dados from "./dados.js";
import Lona from "./Lona.jsx";
import { AjudaLuxi, MensagemDoDia } from "./ajuda/Ajuda.jsx";
import LojaOnline from "./LojaOnline.jsx";
import RetrospectivaMes from "./RetrospectivaMes.jsx";
import { analisarLoja } from "./conselheiraEngine.js";
import { WHATSAPP_SUPORTE, linkSuporte } from "./contato.js";
import { Cadastro as CadastroNovo, OnboardingOperacional, ProximoPasso } from "./OnboardingLuxi.jsx";

/* ============================================================
   ORGANIZE JEWELRY — v1
   Paleta: rose (ação) · dourado (valor) · bege (superfície)
   Persistência: window.storage (chave única, retenção longa)
   ============================================================ */

const CSS = `
/* fontes do sistema: Helvetica Neue (macOS/iOS), Arial (Windows/Android) */

:root{
  /* fundo leve, quase branco com toque rosado — como o fundo do logo */
  --bege:#FBF8F9;
  --bege-2:#F5EEF0;
  --linha:#EDE0E4;
  /* rosé metálico do logo Luxi */
  --rose:#C48A94;
  --rose-esc:#A56B77;
  --rose-cl:#F7EBEE;
  --rose-metal:#CE9AA0;
  --rose-brand:#C48A94;
  /* valores em azul-marinho, para contraste de leitura */
  --dourado:#1E3358;
  --marinho:#1E3358;
  --marinho-cl:#E7ECF5;
  --tinta:#3A2F35;
  --tinta-cl:#746569;
  /* botão principal: rosé mais fundo para o texto branco ser legível (≥ 4.5:1) */
  --rose-btn:#A0606D;
  --rose-btn-h:#8B505C;
  --verde:#4E7C5B;
  --alerta:#A8562F;
  --roxo:#8A6E80;
  --roxo-cl:#F2EBEF;
  --chart-1:#1E3358; --chart-2:#7E5A93; --chart-3:#2E7D5B;
  --chart-4:#C2601F; --chart-5:#2F6FA8; --chart-6:#B4879C;
}
.oj[data-theme="escuro"]{
  --bg-0:#170B0C; --bg-1:#221012; --bg-2:#301619; --bg-3:#3F1E22;
  --border:#5A2C30; --card-bg:#3A1B1F; --card-border:#70383D;
  --tx-hi:#F3E7E6; --tx-mid:#D9B9B8; --tx-lo:#B08D8C; --tx-dis:#7A5A59;
  --rose:#BD535B; --rose-fill:#5A2226; --gold:#C7CDD1; --green:#6FAE85;
  --rose-brand:#C48A94;
  --bege:var(--bg-0); --bege-2:var(--bg-2); --linha:var(--border);
  --tinta:var(--tx-hi); --tinta-cl:var(--tx-mid); --rose-cl:var(--rose-fill);
  --rose-esc:var(--rose); --rose-metal:var(--rose-brand); --rose-btn:var(--rose); --rose-btn-h:#C8666E;
  --dourado:var(--gold); --marinho:var(--gold); --marinho-cl:var(--bg-3);
  --verde:var(--green); --alerta:var(--rose); --roxo:var(--tx-mid); --roxo-cl:var(--bg-3);
  --chart-1:var(--rose); --chart-2:var(--gold); --chart-3:var(--green);
  --chart-4:var(--rose-brand); --chart-5:var(--border); --chart-6:var(--tx-mid);
  background:var(--bg-0);
}
.oj[data-theme="escuro"] .oj-top{background:var(--bg-0)}
.oj[data-theme="escuro"] .oj-lateral{background:var(--bg-1)}
.oj[data-theme="escuro"] .oj-card,
.oj[data-theme="escuro"] .oj-metrica,
.oj[data-theme="escuro"] .oj-modal,
.oj[data-theme="escuro"] .oj-tour-card,
.oj[data-theme="escuro"] .oj-plano{background:var(--card-bg);border:1.5px solid var(--card-border);box-shadow:0 2px 6px rgba(0,0,0,.35);color:var(--tx-hi)}
.oj[data-theme="escuro"] .oj-card.flat{background:var(--bg-2);border-color:var(--border)}
.oj[data-theme="escuro"] .oj-metrica.destaque{background:var(--card-bg);border-color:var(--card-border)}
.oj[data-theme="escuro"] .oj-in,
.oj[data-theme="escuro"] .oj-chip{background:var(--bg-2);color:var(--tx-hi);border-color:var(--border)}
.oj[data-theme="escuro"] .oj-chip[data-on="1"]{background:var(--rose-fill);border-color:var(--rose);color:var(--tx-hi)}
.oj[data-theme="escuro"] .oj-nav{background:rgba(34,16,18,.97)}
.oj[data-theme="escuro"] .oj-fonte-ctrl{background:var(--bg-1);border-color:var(--border)}
.oj[data-theme="escuro"] .oj-fonte-ctrl button{color:var(--tx-mid)}
.oj[data-theme="escuro"] .oj-metrica-lbl,
.oj[data-theme="escuro"] .oj-lbl,
.oj[data-theme="escuro"] .oj-grupo{color:var(--tx-mid);font-weight:700;font-size:11px}
.oj[data-theme="escuro"] .oj-meta,
.oj[data-theme="escuro"] .oj-metrica-sub{color:var(--tx-lo)}
.oj[data-theme="escuro"] .oj-nome-marca{color:var(--rose-brand)!important}
.oj[data-theme="escuro"] .oj-nome,
.oj[data-theme="escuro"] .oj-h1,
.oj[data-theme="escuro"] .oj-sub{color:var(--tx-hi)}
.oj[data-theme="escuro"] .oj-sub{color:var(--tx-mid)}
.oj[data-theme="escuro"] .oj-atalho{background:transparent;border-color:var(--border);color:var(--tx-mid)}
.oj[data-theme="escuro"] .oj-atalho[data-on="1"]{background:var(--rose);border-color:var(--rose);color:var(--tx-hi)}
.oj[data-theme="escuro"] .oj-menu button[data-ativo="1"]{background:var(--rose-fill);color:var(--tx-hi)}
.oj[data-theme="escuro"] .oj-menu button:hover,
.oj[data-theme="escuro"] .oj-menu button:focus-visible{background:var(--bg-3);color:var(--tx-hi)}
.oj[data-theme="escuro"] .oj-menu small{color:var(--tx-lo)}
.oj[data-theme="escuro"] .oj-btn,
.oj[data-theme="escuro"] .oj-vender-btn{background:var(--rose);color:var(--tx-hi)}
.oj[data-theme="escuro"] .oj-btn:hover,
.oj[data-theme="escuro"] .oj-vender-btn:hover{background:var(--rose-btn-h)}
.oj[data-theme="escuro"] .oj-btn.sec{background:transparent;color:var(--rose);border-color:var(--rose)}
.oj[data-theme="escuro"] .oj-btn.sec:hover{background:var(--rose-fill)}
.oj[data-theme="escuro"] .oj-valor.ouro,
.oj[data-theme="escuro"] .oj-plano .preco,
.oj[data-theme="escuro"] .oj-plano .capacidade b,
.oj[data-theme="escuro"] .oj-barra i{color:var(--gold)}
.oj[data-theme="escuro"] .oj-valor.ouro{color:var(--gold)}
.oj[data-theme="escuro"] .oj-metrica-val.pos,
.oj[data-theme="escuro"] .oj-tag.ok{color:var(--green)}
.oj[data-theme="escuro"] .oj-aviso{background:var(--bg-2);border-left-color:var(--gold);color:var(--tx-hi)}
.oj[data-theme="escuro"] .oj-erro{background:var(--bg-3);border-left-color:var(--rose);color:var(--tx-hi)}
.oj[data-theme="escuro"] .oj-cod,
.oj[data-theme="escuro"] .oj-var,
.oj[data-theme="escuro"] .oj-plano .herda{background:var(--bg-2);color:var(--tx-mid)}
.oj[data-theme="escuro"] .oj-tag.parada{background:var(--bg-3);color:var(--rose)}
.oj[data-theme="escuro"] .oj-tag.estoque,
.oj[data-theme="escuro"] .oj-tag.rev{background:var(--bg-3);color:var(--tx-mid)}
.oj[data-theme="escuro"] .oj-vazio{color:var(--tx-lo)}
.oj[data-theme="escuro"] .oj-vazio .oj-serif{color:var(--tx-hi)}
.oj[data-theme="escuro"] .oj-theme-track{background:var(--bg-3);border-color:var(--border)}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.oj{
  font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;
  color:var(--tinta);
  min-height:100vh; max-width:520px; margin:0 auto;
  padding-bottom:32px; font-weight:400;
  position:relative;
  background:linear-gradient(to bottom, #FBF8F9, #F5EEF0);
}
.oj-fonte-ctrl{position:fixed;right:14px;bottom:20px;z-index:50;display:flex;flex-direction:column;gap:2px;background:#fff;border:1px solid var(--linha);border-radius:100px;padding:4px;box-shadow:0 4px 16px rgba(59,43,46,.18)}
.oj-fonte-ctrl.aberto{border-radius:16px}
.oj-fonte-ctrl button{
  width:34px; height:34px; border:none; background:none; cursor:pointer;
  font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; color:var(--rose-esc); border-radius:8px;
  display:flex; align-items:center; justify-content:center; line-height:1;
}
.oj-fonte-ctrl button:active{background:var(--rose-cl)}
.oj-fonte-ctrl .a-toggle{font-size:19px;font-weight:600}
.oj-fonte-ctrl .a-fechar{font-size:18px;color:var(--tinta-cl);font-family:'Helvetica Neue', Helvetica, Arial, sans-serif}
.oj-fonte-ctrl .a-menor{font-size:15px}
.oj-fonte-ctrl .a-maior{font-size:20px}
.oj-fonte-ctrl .sep-f{height:1px;background:var(--linha);margin:1px 4px}
.oj-serif{font-family:'Helvetica Neue', Helvetica, Arial, sans-serif}

/* tela de login com a arte de joias em tela cheia */
.oj-login-bg{
  position:fixed; inset:0; z-index:0;
  background-size:cover; background-position:center; background-repeat:no-repeat;
}
.oj-login-bg::after{ content:""; position:absolute; inset:0; background:linear-gradient(105deg, rgba(250,246,244,.62) 0%, rgba(250,246,244,.35) 42%, rgba(245,238,240,.12) 70%, rgba(245,238,240,.05) 100%); }
.oj-versao{
  position:fixed; right:10px; bottom:6px; z-index:100;
  font-size:9.5px; letter-spacing:.06em; color:var(--tinta-cl);
  opacity:.5; pointer-events:none; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;
}
.oj-login-card{
  position:relative; z-index:1; width:100%; max-width:340px; margin:0 auto;
  background:rgba(255,252,253,.85);
  backdrop-filter:blur(24px) saturate(1.2);
  -webkit-backdrop-filter:blur(24px) saturate(1.2);
  border:1px solid rgba(255,255,255,.9);
  border-radius:24px; padding:28px 24px 22px;
  box-shadow:0 24px 60px -22px rgba(120,90,100,.5), inset 0 1px 0 rgba(255,255,255,.9);
}
.oj-login-card .oj-in{background:rgba(255,255,255,.85);border-color:var(--linha)}

/* layout: empilhado no celular, lado a lado no desktop */
.oj-login-wrap{
  position:relative; z-index:1; min-height:100vh;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:24px; padding:36px 24px;
}
.oj-login-hero{ display:none; }
.oj-hero-titulo{
  font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight:600; line-height:1.05;
  font-size:44px; margin:0; color:var(--tinta);
  text-shadow:0 1px 12px rgba(255,252,253,.7);
}
.oj-hero-titulo span{ color:var(--rose-esc); }
.oj-hero-apoio{
  font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; font-size:20px;
  color:var(--tinta); opacity:.85; line-height:1.5; margin:18px 0 0;
  text-shadow:0 1px 10px rgba(255,252,253,.7);
}
.oj-hero-icones{
  display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-top:26px;
}
.oj-hero-icones div{ text-align:center; }
.oj-hero-icones span{ font-size:22px; color:var(--rose-esc); display:block; }
.oj-hero-icones b{ display:block; font-size:12.5px; color:var(--tinta); font-weight:600; margin-top:6px; }
.oj-hero-icones small{ display:block; font-size:11px; color:var(--tinta-cl); }

/* marca do card */
.oj-login-nome{
  font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; font-size:40px; font-weight:600;
  letter-spacing:.06em; line-height:1; text-align:center; margin-top:4px;
  background:linear-gradient(135deg, #A56B77 0%, #CE9AA0 50%, #C48A94 100%);
  -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
}
.oj-login-tag{
  display:flex; align-items:center; justify-content:center; gap:10px;
  margin:10px 0 2px; color:var(--tinta-cl); font-size:11px; letter-spacing:.14em; text-transform:uppercase;
}
.oj-login-tag::before,.oj-login-tag::after{ content:""; height:1px; width:24px; background:linear-gradient(to right, transparent, var(--rose), transparent); }
.oj-login-sub{
  text-align:center; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; font-size:17px; color:var(--rose-esc); line-height:1.35; margin-top:8px;
}

@media (min-width:860px){
  .oj-login-wrap{ flex-direction:row; align-items:center; justify-content:center; gap:64px; max-width:1000px; margin:0 auto; }
  .oj-login-hero{ display:block; text-align:left; max-width:440px; }
  .oj-hero-titulo{ font-size:62px; }
  .oj-hero-icones{ margin-top:32px; }
  .oj-login-card{ margin:0; flex:0 0 370px; max-width:370px; }
}
.oj-link-sutil{
  display:block; width:100%; margin-top:14px; padding:8px;
  background:none; border:none; cursor:pointer;
  font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; font-size:13px; color:var(--rose-btn-h);
  text-align:center; letter-spacing:.01em;
}
.oj-link-sutil:hover{text-decoration:underline}
.oj-senha-wrap{position:relative}
.oj-senha-wrap .oj-in{padding-right:46px;width:100%}
.oj-senha-olho{
  position:absolute; right:6px; top:50%; transform:translateY(-50%);
  width:40px; height:40px; display:flex; align-items:center; justify-content:center;
  background:none; border:none; cursor:pointer; color:var(--tinta-cl);
  border-radius:8px; transition:color .15s;
}
.oj-senha-olho:hover{color:var(--rose-esc)}
.oj-senha-olho:active{background:var(--rose-cl)}
.oj-tour-fundo{position:fixed;inset:0;z-index:200;background:rgba(58,47,53,.5);backdrop-filter:blur(3px);display:flex;align-items:flex-end;justify-content:center;padding:20px;animation:sobe .3s ease}
.oj-tour-card{background:#fff;border-radius:22px;padding:26px 24px 22px;max-width:400px;width:100%;box-shadow:0 24px 60px -18px rgba(58,47,53,.5)}
.oj-tour-passo{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--rose);font-weight:600;margin-bottom:8px}
.oj-tour-card h3{font-size:24px;font-weight:600;margin-bottom:8px;color:var(--tinta)}
.oj-tour-card p{font-size:14.5px;line-height:1.6;color:var(--tinta-cl);margin-bottom:18px}
.oj-tour-pontos{display:flex;gap:6px;justify-content:center;margin-bottom:18px}
.oj-tour-pontos span{width:7px;height:7px;border-radius:50%;background:var(--linha)}
.oj-tour-pontos span[data-on="1"]{background:var(--rose);width:20px;border-radius:4px}
.oj-tour-acoes{display:flex;align-items:center;justify-content:space-between;gap:12px}
.oj-tour-acoes .oj-link-sutil{width:auto;margin:0}
.oj-tour-acoes .oj-btn{width:auto;margin:0;padding:11px 24px}

/* header */
.oj-top{
  position:sticky; top:0; z-index:20; background:var(--bege);
  padding:22px 20px 14px; border-bottom:1px solid var(--linha);
}
.oj-marca{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--rose-esc);font-weight:500}
.oj-cabeca{display:flex;align-items:center;gap:12px}
/* botão Vender — ação principal, sempre à mão */
.oj-vender-btn{
  margin-left:auto;display:inline-flex;align-items:center;gap:6px;
  background:var(--rose-btn);color:#fff;border:none;border-radius:100px;
  padding:9px 18px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;
  box-shadow:0 4px 14px -4px rgba(196,138,148,.6);transition:all .18s;flex-shrink:0;
}
.oj-vender-btn:hover{background:var(--rose-esc);transform:translateY(-1px)}
.oj-vender-btn:active{transform:scale(.97)}
.oj-vender-btn svg{width:16px;height:16px;stroke:#fff;stroke-width:2.4;fill:none;stroke-linecap:round}
.oj-nome-marca{font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:34px;font-weight:500;line-height:1;letter-spacing:.03em;color:var(--rose-esc)}
.oj-loja{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--tinta-cl);margin-top:3px}
.oj-marca b{color:var(--dourado);font-weight:600}
.oj-h1{font-size:29px;line-height:1.08;margin:12px 0 0;font-weight:600}
.oj-sub{font-size:13px;color:var(--tinta-cl);margin-top:3px}

/* cartões */
.oj-card{background:#fff;border:1px solid var(--linha);border-radius:16px;padding:16px;margin:12px 20px}
.oj-card.flat{background:var(--bege-2);border-color:transparent}
.oj-lbl{font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--tinta-cl);font-weight:500}
.oj-valor{font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:34px;font-weight:600;line-height:1;margin-top:6px}
.oj-valor.ouro{color:var(--dourado)}
.oj-valor.rose{color:var(--rose-esc)}
.oj-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 20px}
/* metricas — grid limpo, cards brancos, icones de traço fino */
.oj-mx{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 20px}
.oj-metrica{
  background:#fff;border:1px solid var(--linha);border-radius:14px;padding:14px 13px;
  transition:border-color .2s,box-shadow .2s;
}
.oj-metrica:hover{border-color:var(--rose);box-shadow:0 4px 16px -6px rgba(196,138,148,.3)}
.oj-metrica.destaque{background:linear-gradient(160deg,#fff,#FCF6F7);border-color:var(--rose-cl)}
.oj-metrica-top{display:flex;align-items:center;gap:7px;margin-bottom:9px}
.oj-mi{width:16px;height:16px;flex-shrink:0;stroke:var(--rose);stroke-width:1.6;fill:none;stroke-linecap:round;stroke-linejoin:round}
.oj-metrica-lbl{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--tinta-cl);font-weight:600}
.oj-metrica-val{font-size:21px;font-weight:700;line-height:1.05;color:var(--tinta);letter-spacing:-.01em}
.oj-metrica-val.pos{color:#2D6A4A}
.oj-metrica-val.neg{color:var(--rose-esc)}
.oj-metrica-val.alerta{color:#B4703A}
.oj-metrica-sub{font-size:11px;color:var(--tinta-cl);margin-top:4px}
@media (min-width:640px){.oj-mx{grid-template-columns:repeat(6,1fr)}}
.oj-grid2 .oj-card{margin:0}

/* controles */
.oj-btn{
  width:100%;border:none;border-radius:12px;padding:14px;font-family:inherit;
  font-size:15px;font-weight:500;background:var(--rose-btn);color:#fff;cursor:pointer;
  transition:background .15s;
}
.oj-btn:hover{background:var(--rose-btn-h)}
.oj-btn:disabled{background:var(--linha);color:var(--tinta-cl);cursor:not-allowed}
.oj-btn.sec{background:transparent;color:var(--rose-esc);border:1px solid var(--rose)}
.oj-btn.sec:hover{background:var(--rose-cl)}
.oj-btn.mini{width:auto;padding:10px 16px;font-size:13px;border-radius:9px}
.oj-btn.perigo{background:transparent;color:var(--alerta);border:1px solid var(--alerta)}
.oj-btn.perigo:hover{background:#F7E9E2}
.oj-estoque-acoes{display:flex;gap:8px;flex-wrap:wrap;padding:12px 20px 0}
.oj-estoque-acoes .oj-btn{flex:1 1 150px;min-height:42px}

.oj-in{
  width:100%;border:1px solid var(--linha);border-radius:10px;padding:12px;
  font-family:inherit;font-size:16px;background:#fff;color:var(--tinta);margin-top:6px;
}
.oj-in:focus{outline:2px solid var(--rose);outline-offset:1px;border-color:transparent}
.oj-campo{margin-bottom:14px}
.oj-campo>label{font-size:12.5px;color:var(--tinta-cl);font-weight:500}

.oj-chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
.oj-chip{
  border:1px solid var(--linha);background:#fff;border-radius:999px;padding:9px 14px;
  font-family:inherit;font-size:13px;color:var(--tinta-cl);cursor:pointer;
}
.oj-chip[data-on="1"]{background:var(--rose-cl);border-color:var(--rose);color:var(--rose-btn-h);font-weight:500}

/* listas */
.oj-item{display:flex;gap:12px;align-items:center;padding:13px 0;border-bottom:1px solid var(--linha)}
.oj-item:last-child{border-bottom:none}
.oj-cod{
  font-family:'Helvetica Neue', Helvetica, Arial, sans-serif,monospace;font-size:11px;letter-spacing:.05em;font-weight:600;
  background:var(--bege-2);border-radius:6px;padding:5px 8px;color:var(--rose-esc);white-space:nowrap;
}
.oj-nome{font-size:14.5px;line-height:1.25}
.oj-meta{font-size:11.5px;color:var(--tinta-cl);margin-top:2px}
.oj-dir{margin-left:auto;text-align:right;white-space:nowrap}
.oj-preco{font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:19px;font-weight:600}
.oj-tag{display:inline-block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;padding:3px 7px;border-radius:5px;font-weight:600}
.oj-tag.parada{background:#F7E9E2;color:var(--alerta)}
.oj-tag.estoque{background:var(--roxo-cl);color:var(--roxo)}
.oj-pg{display:inline-flex;align-items:center;gap:6px;font-size:12px}
.oj-pg i{width:9px;height:9px;border-radius:50%;flex:0 0 auto}
.oj-var{display:inline-block;font-size:10.5px;background:var(--bege-2);color:var(--tinta-cl);border-radius:5px;padding:3px 7px;margin:3px 4px 0 0}
.oj-tag.ok{background:#E6EFE8;color:var(--verde)}
.oj-tag.rev{background:var(--marinho-cl);color:var(--marinho)}

.oj-vazio{text-align:center;padding:44px 24px;color:var(--tinta-cl);font-size:14px;line-height:1.55}
.oj-vazio .oj-serif{font-size:22px;color:var(--tinta);display:block;margin-bottom:8px}

/* nav */
.oj-nav{
  position:fixed;bottom:0;left:0;right:0;max-width:520px;margin:0 auto;z-index:30;
  background:rgba(248,244,252,.97);backdrop-filter:blur(10px);
  border-top:1px solid var(--linha);display:flex;
}
.oj-nav button{
  flex:1;border:none;background:none;padding:11px 4px 15px;cursor:pointer;
  font-family:inherit;font-size:10.5px;color:var(--tinta-cl);display:flex;
  flex-direction:column;align-items:center;gap:4px;
}
.oj-nav button[data-on="1"]{color:var(--rose-esc);font-weight:600}
.oj-nav .pt{width:5px;height:5px;border-radius:50%;background:transparent}
.oj-nav button[data-on="1"] .pt{background:var(--rose)}

/* modal */
.oj-fundo{position:fixed;inset:0;background:rgba(59,43,46,.6);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto}
.oj-modal{
  background:#FBF8F9;width:100%;max-width:560px;border-radius:20px;
  padding:22px 22px 28px;max-height:90vh;overflow-y:auto;-webkit-overflow-scrolling:touch;
  position:relative;z-index:501;
  box-shadow:0 24px 70px rgba(59,43,46,.4);
  animation:modalSobe .28s cubic-bezier(.3,.9,.3,1);
}
@keyframes modalSobe{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
@media (max-width:560px){
  .oj-fundo{padding:0;align-items:flex-end}
  .oj-modal{max-width:100%;max-height:94vh;border-radius:22px 22px 0 0;padding:20px 18px calc(24px + env(safe-area-inset-bottom))}
  .oj-fundo-editor{padding:0;align-items:stretch}
  .oj-editor-modal{width:100%;max-height:100vh;border-radius:0;padding:22px 18px calc(28px + env(safe-area-inset-bottom))}
}
.oj-modal h3{font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:25px;margin:0 0 4px;font-weight:600}
.oj-fundo-editor{align-items:stretch;padding:0}
.oj-editor-modal{width:100vw;max-width:none;height:100vh;max-height:none;border-radius:0;padding:0;overflow:hidden;display:flex;flex-direction:column;background:var(--bege)}
.oj-editor-cabecalho{flex:0 0 auto;padding:28px clamp(20px, 6vw, 72px) 12px;border-bottom:1px solid var(--linha);background:var(--bege)}
.oj-editor-cabecalho h3{font-size:29px;margin:0}
.oj-editor-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:20px clamp(20px, 6vw, 72px) 28px}
.oj-editor-scroll>.oj-campo{margin-bottom:16px}
.oj-editor-acoes{flex:0 0 auto;display:flex;gap:10px;padding:14px clamp(20px, 6vw, 72px) calc(14px + env(safe-area-inset-bottom));border-top:1px solid var(--linha);background:var(--bege);box-shadow:0 -4px 14px rgba(59,43,46,.12)}
.oj-editor-acoes .oj-btn{margin:0;flex:1}
/* Editor de produto — cabe SEMPRE na janela. Duas classes = vence os blocos repetidos mais abaixo
   (antes, em notebook, o topo saía ~19px para fora da tela e o título aparecia cortado). */
.oj-fundo.oj-fundo-editor{align-items:center;justify-content:center;padding:16px;overflow:hidden}
.oj-modal.oj-editor-modal{width:min(640px,100%);max-width:640px;height:calc(100vh - 32px);height:calc(100dvh - 32px);max-height:none;margin:0;border-radius:18px}
@media (max-width:560px),(max-height:520px){
  .oj-fundo.oj-fundo-editor{padding:0;align-items:stretch}
  .oj-modal.oj-editor-modal{width:100%;max-width:none;height:100vh;height:100dvh;border-radius:0}
}
/* barra de rolagem sempre visível no formulário (no Mac ela some sozinha e a pessoa não percebe que há mais campos) */
.oj-editor-scroll{scrollbar-width:auto;scrollbar-color:var(--rose) var(--bege-2)}
.oj-editor-scroll::-webkit-scrollbar{width:12px}
.oj-editor-scroll::-webkit-scrollbar-track{background:var(--bege-2)}
.oj-editor-scroll::-webkit-scrollbar-thumb{background:var(--rose);border-radius:8px;border:3px solid var(--bege-2)}
/* botão discreto para sair do modo observação: pequeno, quase transparente, fixo no canto */
.oj-sair-espiao{position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:120;width:40px;height:40px;border-radius:50%;
  border:1px solid var(--linha);background:var(--bege);color:var(--tinta-cl);display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:.35;transition:opacity .2s}
.oj-sair-espiao:hover,.oj-sair-espiao:focus-visible{opacity:1}
.oj-sair-espiao svg{width:18px;height:18px;stroke:currentColor;stroke-width:1.8;fill:none;stroke-linecap:round;stroke-linejoin:round}
/* casca leve para o que é desenhado direto no corpo da página (só carrega o tema; não ocupa espaço) */
.oj.oj-portal-leve{min-height:0;height:0;padding:0;margin:0;max-width:none;background:none;overflow:visible}

/* ===== painel da administradora (mobile primeiro) ===== */
/* cores de perigo próprias de cada tema: o vermelho do tema escuro (--alerta) tem só ~3,4:1 de contraste sobre o cartão */
.oj{--perigo-tx:#9A2F1F;--perigo-bg:#B3402F;--perigo-bg-h:#962F20;--perigo-fundo:#FBEDE9}
.oj[data-theme="escuro"]{--perigo-tx:#FF9C9C;--perigo-bg:#B23A3A;--perigo-bg-h:#C24848;--perigo-fundo:#3F1B1D}
/* seções do painel (controle segmentado) */
.oj-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:12px 20px;padding:4px;background:var(--bege-2);border:1px solid var(--linha);border-radius:14px}
.oj-seg button{min-height:44px;border:0;border-radius:10px;background:transparent;color:var(--tinta-cl);font:600 14px/1.1 'Helvetica Neue',Helvetica,Arial,sans-serif;cursor:pointer;padding:0 6px}
.oj-seg button[aria-selected="true"]{background:var(--rose-btn);color:#fff}
.oj-seg button:focus-visible{outline:2px solid var(--rose-esc);outline-offset:2px}
/* linha de lista em COLUNA: nada é espremido ao lado de um botão */
.oj-linha{padding:14px 0;border-bottom:1px solid var(--linha)}
.oj-linha:last-child{border-bottom:0;padding-bottom:4px}
.oj-linha:first-child{padding-top:2px}
.oj-linha-topo{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:flex-start;justify-content:space-between}
.oj-linha-topo>.oj-quebra{flex:1 1 150px}
.oj-quebra{min-width:0;overflow-wrap:anywhere}
.oj-acoes{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.oj-acoes>.oj-bt{flex:1 1 140px}
/* botões do painel: alvo mínimo de 44 px, rótulo claro, foco visível */
.oj-bt{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:10px 14px;border-radius:12px;border:1px solid var(--rose);background:transparent;color:var(--tinta);font:600 13.5px/1.2 'Helvetica Neue',Helvetica,Arial,sans-serif;cursor:pointer;text-align:center;-webkit-tap-highlight-color:transparent}
.oj-bt:hover:not(:disabled){background:var(--rose-cl)}
.oj-bt:focus-visible{outline:2px solid var(--rose-esc);outline-offset:2px}
.oj-bt:disabled{opacity:.45;cursor:not-allowed}
.oj-bt{text-wrap:balance}
.oj-bt.forte{background:var(--rose-btn);border-color:var(--rose-btn);color:#fff}
.oj-bt.forte:hover:not(:disabled){background:var(--rose-btn-h);border-color:var(--rose-btn-h)}
.oj-bt.perigo{border-color:var(--perigo-bg);color:var(--perigo-tx)}
.oj-bt.perigo:hover:not(:disabled){background:var(--perigo-fundo)}
.oj-bt.perigo-cheio{background:var(--perigo-bg);border-color:var(--perigo-bg);color:#fff}
.oj-bt.perigo-cheio:hover:not(:disabled){background:var(--perigo-bg-h);border-color:var(--perigo-bg-h)}
/* etiqueta de estado com contraste nos dois temas */
.oj-estado{display:inline-block;flex:none;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;padding:4px 8px;border-radius:6px;white-space:nowrap}
.oj-estado.ativo{background:#E6EFE8;color:#2F5A3D}
.oj-estado.vencido{background:#F0E4E4;color:#6B4A4A}
.oj[data-theme="escuro"] .oj-estado.ativo{background:#1F3A2A;color:#A9E0BC}
.oj[data-theme="escuro"] .oj-estado.vencido{background:#4A2428;color:#F0CFCD}
.oj-estado.beta{background:#F2EBEF;color:#5E4757}
.oj-estado.neutro{background:#EFE9EA;color:#5A4C50}
.oj[data-theme="escuro"] .oj-estado.beta{background:#4A2A38;color:#EBD3E0}
.oj[data-theme="escuro"] .oj-estado.neutro{background:#301619;color:#D9B9B8}
/* link do convite: campo + botão na mesma linha */
.oj-link-bloco{margin-top:10px}
.oj-link-linha{display:flex;gap:8px;align-items:stretch;margin-top:5px}
.oj-link-linha .oj-in{flex:1;min-width:0;margin:0}
.oj-link-linha .oj-bt{flex:none}
/* zona de risco no fim da loja observada */
.oj-zona-risco{margin:26px 20px 96px;padding:16px;border:1px dashed var(--perigo-bg);border-radius:14px}
/* janela de exclusão: cabeçalho fixo, miolo rolável, rodapé fixo com os botões sempre à vista */
.oj-modal.oj-excl{padding:0;display:flex;flex-direction:column;max-height:92vh;max-height:92dvh;overflow:hidden}
.oj-excl-topo{display:flex;gap:12px;align-items:flex-start;padding:18px 18px 12px;border-bottom:1px solid var(--linha)}
.oj-excl-topo h3{margin:0;font-size:18px;line-height:1.25;color:var(--perigo-tx)}
.oj-excl-icone{flex:none;width:36px;height:36px;border-radius:50%;background:var(--perigo-fundo);color:var(--perigo-tx);display:grid;place-items:center;font-weight:800;font-size:18px}
.oj-excl-x{flex:none;width:44px;height:44px;margin:-6px -8px 0 0;border:0;background:transparent;color:var(--tinta-cl);font-size:26px;line-height:1;cursor:pointer;border-radius:12px}
.oj-excl-x:focus-visible{outline:2px solid var(--rose-esc)}
.oj-excl-corpo{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:14px 18px 8px}
.oj-excl-rodape{display:flex;gap:10px;padding:12px 18px calc(14px + env(safe-area-inset-bottom));border-top:1px solid var(--linha);background:inherit}
.oj-excl-rodape>.oj-bt{flex:1;min-height:48px}
.oj-excl-bloco{margin:0 0 18px}
.oj-excl-tit{font-size:13px;font-weight:700;letter-spacing:.02em;color:var(--tinta);margin-bottom:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.oj-excl-tit small{font-weight:500;color:var(--tinta-cl);font-size:12px}
.oj-passo{width:22px;height:22px;border-radius:50%;background:var(--rose-btn);color:#fff;font-size:12px;display:inline-grid;place-items:center;flex:none}
.oj-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:8px}
.oj-stat{background:var(--bege-2);border:1px solid var(--linha);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;min-width:0}
.oj-stat b{font-size:20px;line-height:1.1;color:var(--tinta)}
.oj-stat span{font-size:12px;color:var(--tinta-cl)}
.oj-excl-lista{margin:10px 0 0;padding-left:18px;font-size:13.5px;line-height:1.5;color:var(--tinta)}
.oj-nota{background:var(--bege-2);border:1px solid var(--linha);border-radius:12px;padding:10px 12px;font-size:12.5px;line-height:1.5;color:var(--tinta-cl);margin:0 0 14px}
.oj-nota.perigo{background:var(--perigo-fundo);border-color:var(--perigo-bg);color:var(--perigo-tx)}
.oj-check{display:flex;gap:10px;align-items:flex-start;margin:0 0 14px;font-size:14px;line-height:1.45;color:var(--tinta)}
.oj-check input{flex:none;width:22px;height:22px;margin:0;accent-color:var(--rose-btn)}
.oj-email-alvo{font-size:13px;font-weight:600;background:var(--bege-2);border:1px dashed var(--linha);border-radius:10px;padding:8px 10px;margin:6px 0 8px;color:var(--tinta)}
.oj-confere{font-size:12.5px;margin-top:6px;font-weight:600}
.oj-confere.sim{color:var(--verde)}
.oj-confere.nao{color:var(--tinta-cl)}
.oj-excl .oj-in{font-size:16px}
.oj-grid-adm>*{min-width:0}
.oj-grid-adm .oj-valor{font-size:clamp(19px,6.4vw,28px);overflow-wrap:anywhere}
/* botão secundário e link discreto DENTRO DO PAINEL: o tom global não chega a 4,5:1 (4,2 no claro, 3,4 no escuro) */
.oj-adm .oj-btn.sec{color:#8B505C}
.oj-adm .oj-link-sutil{color:#7A4450}
.oj[data-theme="escuro"] .oj-adm .oj-btn.sec,
.oj[data-theme="escuro"] .oj-adm .oj-link-sutil{color:#E8A6AA} /* 16 px evita o zoom automático do iPhone ao tocar no campo */
/* ações destrutivas */
.oj-btn.oj-btn-perigo{background:#B3402F}
.oj-btn.oj-btn-perigo:hover:not(:disabled){background:#962F20}
.oj-btn.oj-btn-perigo:disabled{background:#B3402F;opacity:.4;cursor:not-allowed}
@media (max-width:560px){
  .oj-fundo-editor{padding:0;align-items:stretch}
  .oj-editor-cabecalho{padding:22px 18px 12px}
  .oj-editor-scroll{padding:18px 18px 24px}
  .oj-editor-acoes{padding-left:18px;padding-right:18px}
}

.oj-barra{height:6px;background:var(--bege-2);border-radius:3px;overflow:hidden;margin-top:8px}
.oj-barra i{display:block;height:100%;background:var(--dourado)}

.oj-aviso{background:var(--marinho-cl);border-left:3px solid var(--marinho);border-radius:0 10px 10px 0;padding:11px 13px;font-size:12.5px;line-height:1.5;margin:12px 20px;color:#1B2C4A}
.oj-aviso .oj-btn,.oj-erro .oj-btn{display:block;width:auto}
.oj-erro{background:#F7E9E2;border-left:3px solid var(--alerta);border-radius:0 10px 10px 0;padding:11px 13px;font-size:12.5px;line-height:1.5;margin:12px 20px;color:#7A3418}

.oj-sec{font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:21px;font-weight:600;margin:22px 20px 2px}

/* planos */
.oj-plano{
  background:#fff;border:1.5px solid var(--linha);border-radius:16px;padding:16px;
  margin-bottom:10px;cursor:pointer;transition:border-color .15s,background .15s;position:relative;
}
.oj-plano[data-on="1"]{border-color:var(--rose);background:var(--rose-cl)}
.oj-plano .topo{display:flex;align-items:baseline;gap:8px}
.oj-plano .nome{font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:22px;font-weight:600}
.oj-plano .preco{margin-left:auto;font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:24px;font-weight:600;color:var(--dourado)}
.oj-plano .preco small{font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:11px;color:var(--tinta-cl);font-weight:400}
.oj-plano ul{margin:8px 0 0;padding:0;list-style:none}
.oj-plano li{font-size:13.5px;line-height:1.62;color:var(--tinta);padding-left:19px;position:relative;margin-bottom:3px}
.oj-plano li:before{
  content:"";position:absolute;left:0;top:7px;width:11px;height:6px;
  border-left:2px solid var(--rose-esc);border-bottom:2px solid var(--rose-esc);
  transform:rotate(-45deg);border-radius:1px;
}
.oj-plano .persona{font-size:15px;letter-spacing:0;color:var(--tinta);font-weight:700;line-height:1.3}
.oj-plano .maturidade{
  font-size:14px;line-height:1.45;color:var(--tinta);font-weight:500;
  margin:8px 0 12px;padding-left:11px;border-left:2px solid var(--rose);
}
.oj-plano .herda{
  display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--tinta-cl);
  background:var(--bege-2);border-radius:8px;padding:8px 10px;margin-bottom:10px;
}
.oj-plano .capacidade{display:flex;gap:16px;margin:12px 0 2px;padding-top:11px;border-top:1px solid var(--linha)}
.oj-plano .capacidade div{flex:1}
.oj-plano .capacidade b{display:block;font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:22px;color:var(--marinho);line-height:1.1}
.oj-plano .capacidade small{font-size:10.5px;color:var(--tinta-cl);letter-spacing:.04em}
.oj-plano .novo{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--tinta-cl);font-weight:600;margin-top:12px;display:block}
.oj-plano .extra{font-size:12px;color:var(--tinta-cl);margin-top:10px;padding-top:9px;border-top:1px dashed var(--linha);line-height:1.5}
.oj-selo{
  position:absolute;top:-9px;right:14px;background:var(--rose);color:#fff;
  font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;
  padding:4px 9px;border-radius:5px;
}
.oj-uso{display:flex;font-size:12.5px;margin-top:2px}

/* menu do usuário */
.oj-userbtn{background:none;border:none;padding:0;cursor:pointer;position:absolute;right:20px;top:22px}
.oj-lateral{
  position:fixed;left:0;top:0;bottom:0;z-index:60;background:#fff;
  width:min(320px,92vw);border-right:1px solid var(--linha);padding:18px 14px 24px;
  box-shadow:0 0 40px rgba(61,46,69,.18);overflow-y:auto;
  transform:translateX(-100%);transition:transform .26s cubic-bezier(.3,.8,.3,1);
}
.oj-lateral.aberto{transform:translateX(0)}
.oj-lateral .topo{display:flex;align-items:center;gap:12px;padding:2px 10px 20px;border-bottom:1px solid var(--linha);margin-bottom:8px;min-height:70px}
.oj-lateral .topo .oj-nome-marca{font-size:26px!important}
.oj-veu{position:fixed;inset:0;z-index:55;background:rgba(61,46,69,.32);opacity:0;transition:opacity .26s}
.oj-veu.aberto{opacity:1}
.oj-menu{padding:0}
.oj-menu button{
  display:flex;width:100%;align-items:center;gap:10px;background:none;border:none;
  font-family:inherit;font-size:14px;color:var(--tinta);padding:10px 12px;min-height:46px;border-radius:9px;
  cursor:pointer;text-align:left;
}
.oj-menu button[data-ativo="1"]{background:var(--rose-cl);color:var(--rose-esc);font-weight:600}
.oj-menu .oj-grupo-btn{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:44px;padding:11px 12px;margin:2px 0 0;border:0;border-radius:10px;background:transparent;color:var(--tinta);font:inherit;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;cursor:pointer;text-align:left}
.oj-menu .oj-grupo-btn:hover,.oj-menu .oj-grupo-btn:focus-visible{background:var(--rose-cl);color:var(--rose-esc)}
.oj-menu .oj-grupo-btn[aria-expanded="true"]{color:var(--rose-esc)}
.oj-menu .oj-grupo-chevron{font-size:15px;letter-spacing:0;line-height:1;transition:transform .18s ease;color:var(--tinta-cl)}
.oj-menu .oj-grupo-btn[aria-expanded="true"] .oj-grupo-chevron{transform:rotate(180deg)}
.oj-menu .oj-grupo-itens{overflow:hidden;padding-bottom:2px}
.oj-menu .oj-grupo-itens .oj-menu-item{min-height:44px;padding-top:8px;padding-bottom:8px}
.oj-menu .oj-grupo-itens .oj-menu-item small{font-size:10.5px}
.oj-menu .oj-menu-ajuda{border-top:1px solid var(--linha);margin:7px 8px 0;padding-top:7px}
.oj-menu .oj-tour-menu{color:var(--rose-esc)}
.oj-hamb{background:none;border:none;padding:6px;cursor:pointer;display:flex;flex-direction:column;gap:4px;margin-right:2px}
.oj-hamb span{display:block;width:19px;height:2px;border-radius:2px;background:var(--tinta)}
/* atalhos rápidos do cabeçalho — agilidade no dia a dia */
.oj-atalhos{display:flex;gap:7px;margin-top:14px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.oj-atalhos::-webkit-scrollbar{display:none}
.oj-atalho{
  display:inline-flex;align-items:center;gap:6px;flex-shrink:0;
  padding:8px 14px;border-radius:100px;border:1px solid var(--linha);
  background:#fff;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;
  color:var(--tinta);transition:all .18s;white-space:nowrap;
}
.oj-atalho-ico{width:15px;height:15px;stroke:currentColor;stroke-width:1.7;fill:none;stroke-linecap:round;stroke-linejoin:round}
.oj-atalho:hover{border-color:var(--rose);color:var(--rose-esc)}
.oj-atalho[data-on="1"]{background:var(--rose-btn);border-color:var(--rose-btn);color:#fff}
/* responsividade — telas pequenas */
@media (max-width:400px){
  .oj-h1{font-size:24px}
  .oj-card{margin:10px 14px;padding:14px}
  .oj-grid2{margin:10px 14px;gap:10px}
  .oj-mx{margin:12px 14px;gap:8px}
  .oj-metrica{padding:12px 10px}
  .oj-metrica-val{font-size:18px}
  .oj-top{padding:18px 16px 12px}
  .oj-sec{margin:18px 16px 2px}
  .oj-aviso,.oj-erro{margin:12px 14px}
}
/* garante que campos e inputs nunca estouram a largura */
.oj-in,.oj-btn,select,textarea{max-width:100%}
img{max-width:100%;height:auto}
.oj-grupo{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--tinta-cl);padding:14px 12px 6px;font-weight:600}
.oj-menu button:hover,.oj-menu button:focus-visible{background:var(--rose-cl);color:var(--rose-esc)}
.oj-menu .sep{height:1px;background:var(--linha);margin:5px 8px}
.oj-menu small{display:block;font-size:11px;color:var(--tinta-cl);margin-top:2px;line-height:1.2}
.oj-menu .oj-menu-tema{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px 12px;margin:0 0 3px;border-bottom:1px solid var(--linha)}
.oj-menu .oj-menu-tema .oj-lbl{font-size:10px}
.oj-theme-switch{display:inline-flex;align-items:center;gap:8px;border:0;background:none;padding:2px;cursor:pointer;color:var(--tinta);font-family:inherit}
.oj-theme-switch:focus-visible{outline:2px solid var(--rose);outline-offset:3px;border-radius:9px}
.oj-theme-track{position:relative;display:inline-flex;align-items:center;justify-content:space-between;width:58px;height:32px;padding:0 7px;border:1px solid var(--linha);border-radius:999px;background:var(--bege-2);color:var(--tinta-cl)}
.oj-theme-track svg{width:13px;height:13px;stroke:currentColor;stroke-width:1.8;fill:none;stroke-linecap:round;stroke-linejoin:round;position:relative;z-index:0}
.oj-theme-thumb{position:absolute;left:3px;top:3px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#fff;color:var(--rose-esc);box-shadow:0 2px 6px rgba(61,46,69,.18);transition:transform .2s ease}
.oj-theme-thumb svg{width:14px;height:14px}
.oj-theme-track[data-on="1"] .oj-theme-thumb{transform:translateX(26px);background:var(--rose-esc);color:#fff}
.oj-theme-label{font-size:11.5px;color:var(--tinta-cl);white-space:nowrap}
.oj-top{position:sticky;top:0;z-index:20}
.oja{animation:sobe .28s ease both}
@keyframes sobe{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* ---- marca animada ---- */
.oj-splash{
  position:fixed;inset:0;z-index:90;background:var(--bege);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;
}
.oj-splash.saindo{animation:apaga .5s ease forwards}
@keyframes apaga{to{opacity:0;visibility:hidden}}
.oj-wm{text-align:center;opacity:0;animation:sobeWm 1.1s 2.1s ease forwards}
@keyframes sobeWm{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.oj-wm .n{font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:64px;font-weight:500;line-height:1;letter-spacing:.06em;color:var(--rose-esc)}
.oj-wm .j{font-size:12px;letter-spacing:.42em;text-transform:uppercase;color:var(--rose-esc);margin-top:6px;font-weight:500}
.oj-wm .assinatura{font-size:12px;letter-spacing:.32em;text-transform:uppercase;color:var(--rose);margin-top:14px;font-weight:400}

.mk-circ{stroke-dasharray:214;stroke-dashoffset:214;animation:mkDraw 1.7s .25s cubic-bezier(.55,0,.2,1) forwards}
.mk-arr{stroke-dasharray:80;stroke-dashoffset:80;animation:mkDraw 1.1s 1.6s ease forwards}
@keyframes mkDraw{to{stroke-dashoffset:0}}
.mk-dia{opacity:0;transform-origin:84px 36px;animation:mkPop .9s 1.35s cubic-bezier(.3,1.5,.5,1) forwards}
.mk-hand{opacity:0;animation:mkPop .8s 1.5s ease forwards}
.mk-dot{opacity:0;animation:mkPop .3s ease forwards}
@keyframes mkPop{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:scale(1)}}
.mk-bar{transform-origin:center bottom;transform:scaleY(0);animation:mkGrow .5s cubic-bezier(.3,1.3,.5,1) forwards}
@keyframes mkGrow{to{transform:scaleY(1)}}
.mk-brilho{opacity:0;animation:mkBrilho 2.6s 2.2s ease-in-out infinite}
@keyframes mkBrilho{0%,100%{opacity:0}40%{opacity:1}}

/* carregamento entre telas */
.oj-carga{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:12px;padding:70px 0;
}
.oj-pulsa{animation:mkPulsa 1.1s ease-in-out infinite}
@keyframes mkPulsa{0%,100%{opacity:.35;transform:scale(.96)}50%{opacity:1;transform:scale(1)}}

/* ---- desktop: deixa de parecer celular esticado ---- */
@media (min-width:900px){
  .oj{max-width:1120px;padding-bottom:40px}
  .oj-top{padding:26px 32px 16px}
  .oj-h1{font-size:34px}
  .oj-card{margin:14px 32px}
  .oj-grid2{grid-template-columns:repeat(4,1fr);margin:14px 32px}
  .oj-sec{margin:26px 32px 2px}
  .oj-aviso,.oj-erro{margin:14px 32px}
  .oj-colunas{display:grid;grid-template-columns:1fr 1fr;gap:0 18px;align-items:start}
  .oj-colunas>.oj-card{margin:14px 0}
  .oj-nav{
    position:sticky;top:0;bottom:auto;max-width:1120px;
    border-top:none;border-bottom:1px solid var(--linha);
  }
  .oj-nav button{flex:0 0 auto;padding:14px 22px;flex-direction:row;gap:8px;font-size:13px}
  .oj-modal{border-radius:18px;max-width:620px;margin-bottom:5vh}
  .oj-fundo{align-items:center}
}

@media (min-width:900px){
  .oj-fundo-editor{align-items:stretch;padding:0}
  .oj-editor-modal{max-width:none;margin-bottom:0}
}

@media (prefers-reduced-motion:reduce){
  .oja,.oj-wm,.mk-circ,.mk-arr,.mk-dia,.mk-hand,.mk-bar,.mk-dot,.mk-brilho,.oj-pulsa,.oj-splash.saindo{
    animation:none!important;opacity:1!important;transform:none!important;stroke-dashoffset:0!important;
  }
}
/* ---- desktop: deixa de parecer celular esticado ---- */
@media (min-width:900px){
  .oj{max-width:1120px;padding-bottom:40px}
  .oj-top{padding:26px 32px 16px}
  .oj-h1{font-size:34px}
  .oj-card{margin:14px 32px}
  .oj-grid2{grid-template-columns:repeat(4,1fr);margin:14px 32px}
  .oj-sec{margin:26px 32px 2px}
  .oj-aviso,.oj-erro{margin:14px 32px}
  .oj-colunas{display:grid;grid-template-columns:1fr 1fr;gap:0 18px;align-items:start}
  .oj-colunas>.oj-card{margin:14px 0}
  .oj-nav{
    position:sticky;top:0;bottom:auto;max-width:1120px;
    border-top:none;border-bottom:1px solid var(--linha);
  }
  .oj-nav button{flex:0 0 auto;padding:14px 22px;flex-direction:row;gap:8px;font-size:13px}
  .oj-modal{border-radius:18px;max-width:620px;margin-bottom:5vh}
  .oj-fundo{align-items:center}
}

@media (prefers-reduced-motion:reduce){.oja{animation:none}}
/* Retrospectiva mensal da Conselheira Luxi */
.luxi-retro-wrap{max-width:860px;margin:0 auto;padding:4px 0 30px}.luxi-retro-hero{padding:20px 4px 18px}.luxi-retro-kicker{font-size:10px;letter-spacing:.13em;color:var(--rose-esc);font-weight:700}.luxi-retro-hero h2{font-size:29px;line-height:1.12;margin:7px 0;color:var(--tinta)}.luxi-retro-hero p{margin:0;color:var(--tinta-cl);line-height:1.55}.luxi-retro-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.luxi-retro-metric{background:var(--bege-2);border:1px solid var(--linha);border-radius:16px;padding:15px}.luxi-retro-metric span{display:block;font-size:11px;color:var(--tinta-cl);margin-bottom:6px}.luxi-retro-metric strong{display:block;font-size:23px;color:var(--marinho)}.luxi-retro-metric small{display:block;margin-top:6px;color:var(--tinta-cl);line-height:1.35}.luxi-retro-card{margin-top:12px;padding:18px;border:1px solid var(--linha);border-radius:18px;background:var(--bege);box-shadow:0 2px 8px rgba(80,50,60,.04)}.luxi-retro-card h3{font-size:21px;line-height:1.25;margin:7px 0;color:var(--tinta)}.luxi-retro-card p{color:var(--tinta-cl);line-height:1.6;margin:7px 0}.luxi-retro-label{font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--rose-esc);text-transform:uppercase}.luxi-retro-note{padding-top:10px;border-top:1px solid var(--linha);font-size:13px}.luxi-retro-item{padding:12px 0;border-top:1px solid var(--linha)}.luxi-retro-item:first-of-type{border-top:0}.luxi-retro-item div{display:flex;align-items:center;gap:9px}.luxi-retro-item b{font-size:16px;color:var(--tinta)}.luxi-retro-item span{font-size:10px;color:var(--rose-esc);border:1px solid var(--linha);border-radius:20px;padding:3px 7px}.luxi-retro-item p{font-size:13px;margin-left:0}.luxi-retro-item.atencao b{color:var(--alerta)}.luxi-retro-next{background:var(--rose-cl);border-color:var(--rose-metal)}.luxi-retro-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 4px;color:var(--tinta-cl);font-size:12px}.luxi-retro-footer button{border:0;border-radius:999px;padding:11px 15px;background:var(--rose-btn);color:#fff;font-weight:600;cursor:pointer}.luxi-retro-overlay{position:fixed;inset:0;z-index:9999;background:rgba(35,20,25,.52);display:flex;align-items:center;justify-content:center;padding:18px}.luxi-retro-modal{position:relative;width:min(900px,100%);max-height:92vh;overflow:auto;background:var(--bege);border-radius:24px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.25)}.luxi-retro-close{position:absolute;right:15px;top:13px;width:34px;height:34px;border:0;border-radius:50%;background:var(--bege-2);color:var(--tinta);font-size:24px;cursor:pointer}.luxi-retro-modal .luxi-retro-wrap{padding-top:12px}@media(max-width:650px){.luxi-retro-grid{grid-template-columns:repeat(2,1fr)}.luxi-retro-hero h2{font-size:25px}.luxi-retro-footer{align-items:stretch;flex-direction:column}.luxi-retro-footer button{width:100%}.luxi-retro-overlay{padding:8px}.luxi-retro-modal{max-height:96vh;border-radius:18px;padding:12px}.luxi-retro-card{padding:15px}}
`;

/* ---------------- utilidades ---------------- */
const KEY = "oj:dados:v1";

/* Versão do app. VITE_APP_VERSION é injetada no build com a data/hora,
   e aparece no rodapé para você saber sempre o que está no ar. */
const VERSAO = import.meta.env.VITE_APP_VERSION || "dev";
/* Versão de exibição: começa em 2.0, incrementa a cada deploy.
   Quando chegar em 2.20, passa para 3.0 automaticamente.
   BUILD_COUNT é injetado no build via vite.config.js */
const BUILD_COUNT = Number(import.meta.env.VITE_BUILD_COUNT || 0);
const VERSAO_MAJOR = BUILD_COUNT >= 20 ? (BUILD_COUNT >= 40 ? 4 : 3) : 2;
const VERSAO_MINOR = BUILD_COUNT % 20;
const VERSAO_DISPLAY = `${VERSAO_MAJOR}.${VERSAO_MINOR}`;
const brl = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hoje = () => new Date().toISOString();
const dias = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
const id = () => Math.random().toString(36).slice(2, 10);

/* Comprime imagem antes de guardar: redimensiona para no máximo 900px e
   recodifica em JPEG 72%. Uma foto de celular de 4 MB vira ~70 KB.
   Mesmo indo para o armazenamento da loja, a compressão é o que mantém o app
   rápido no celular e as fotos abaixo do limite de 1 MB por arquivo. */
function comprimirImagem(file, max = 900, q = 0.72) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > max || height > max) {
          if (width > height) {
            height = Math.round((height * max) / width);
            width = max;
          } else {
            width = Math.round((width * max) / height);
            height = max;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", q));
      };
      img.onerror = () => reject(new Error("Imagem inválida"));
      img.src = fr.result;
    };
    fr.onerror = () => reject(new Error("Não consegui abrir a imagem"));
    fr.readAsDataURL(file);
  });
}

const VAZIO = {
  lojaId: null,
  perfil: null,
  entradas: [], // romaneios
  estoque: [],
  vendas: [],
  saidas: [], // devolução / defeito
  despesas: [],
  consultoras: [],
  maletas: [],
  colecoes: [],
  contasReceber: [],
};

/* Cópia local de segurança: não é a fonte oficial dos dados.
   Serve apenas para impedir que uma falha transitória de leitura após uma
   atualização deixe a usuária vendo uma loja vazia. A fonte de verdade
   continua sendo o Supabase. */
const BACKUP_PREFIX = "luxi:backup:estoque:v1:";
const salvarBackupSeguro = async (est, usuarioId) => {
  if (!est?.lojaId || !usuarioId) return;
  try {
    const backup = {
      lojaId: est.lojaId,
      perfil: est.perfil,
      entradas: est.entradas || [],
      estoque: (est.estoque || []).map((p) => ({ ...p, fotos: [] })),
      salvoEm: new Date().toISOString(),
    };
    localStorage.setItem(BACKUP_PREFIX + usuarioId, JSON.stringify(backup));
    if (navigator.storage?.persist) {
      try { await navigator.storage.persist(); } catch (_) {}
    }
  } catch (_) {
    /* backup local nunca pode impedir o uso do banco */
  }
};
const lerBackupSeguro = (usuarioId) => {
  if (!usuarioId) return null;
  try {
    const bruto = localStorage.getItem(BACKUP_PREFIX + usuarioId);
    if (!bruto) return null;
    const backup = JSON.parse(bruto);
    if (!backup?.lojaId || !Array.isArray(backup.estoque)) return null;
    return backup;
  } catch (_) {
    return null;
  }
};

/* Converte o objeto que vem de dados.carregarTudo() (tabelas relacionais)
   para o mesmo formato que as telas já esperam. */
const deTabelas = (est) => ({ ...VAZIO, ...est });

const MODALIDADES = ["Dinheiro", "Débito", "Crédito", "Na confiança"];
const CONFIANCA = "Na confiança";

/* Cada forma de pagamento tem cor própria — a leitura fica imediata,
   sem precisar ler o rótulo. */
const CORES_PAGAMENTO = {
  "Dinheiro": "#2E7D5B",      // verde: entrou no caixa agora
  "Débito": "#2F6FA8",        // azul: entrou, mas cai na conta
  "Crédito": "#7E5A93",       // roxo: entra parcelado
  "Na confiança": "#C2601F",  // laranja: ainda não entrou
};
const corPagamento = (m) => CORES_PAGAMENTO[m] || "var(--tinta-cl)";

/* Despesas: fixa e variável também se distinguem */
const CORES_DESPESA = { Fixa: "#3D5A80", "Variável": "#B4879C", fixa: "#3D5A80", variavel: "#B4879C" };

/* Variáveis da peça — o vocabulário real do mercado de semijoia */
const BANHOS = [
  "Ouro 24k", "Ouro 18k", "Ouro 10k", "Ouro rosé",
  "Ródio branco", "Ródio negro", "Prata 925",
];
const PEDRAS = ["Sem pedra", "Zircônia", "Vidro", "Moissanite"];
const ACABAMENTOS = [
  "Lisa", "Cravejada", "Pérolas", "Acetinada",
  "Esmaltada", "Orgânica", "Minimalista", "Maximalista",
];
const TAMANHOS = ["—", "35cm", "40cm", "45cm", "50cm", "60cm", "70cm", "16cm", "18cm", "20cm", "25cm"];
/* o que o robô do romaneio devolve só vale se casar com as opções do app (sem diferença de acento/maiúscula) */
const _chaveOpc = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "");
const casarOpcao = (v, lista) => { const k = _chaveOpc(v); return k ? (lista.find((o) => _chaveOpc(o) === k) || "") : ""; };
const precoComMargem = (custo, margem) => Math.round(Number(custo || 0) * (1 + Number(margem || 0) / 100) * 100) / 100;

/* Motivos de saída de peça que não é venda */
const MOTIVOS_SAIDA = ["Devolução", "Troca", "Defeito", "Garantia", "Cortesia"];

/* Plano de saída: quando o teste de 72h acaba e ela não assina, cai aqui. */
const LIVRE = {
  id: "livre",
  nome: "Começo",
  preco: "0,00",
  valor: 0,
  limite: 10,
  linha: "Comece no seu ritmo, com o essencial para organizar a loja.",
  itens: ["Até 10 códigos diferentes", "Estoque, vendas e lucro do mês"],
};

/* Planos por diversidade de códigos — não por foto.
   O que define o plano é o tamanho do estoque que ela controla. */
const PLANOS = [
  {
    id: "inicio",
    nome: "Solo",
    persona: "Eu cuido de tudo de perto",
    maturidade: "Você registra uma vez e enxerga o negócio com clareza.",
    preco: "69,90",
    valor: 69.9,
    limite: 1000,
    leituras: 0,
    consultoras: 0,
    selo: "",
    linha: "A tranquilidade de saber onde está cada peça e cada venda.",
    herda: null,
    itens: [
      "Até 1.000 códigos de peças",
      "Estoque, vendas, despesas e lucro real",
      "Lembretes para acompanhar quem ainda vai pagar",
      "Catálogo pronto para compartilhar",
    ],
    extra: "Leitura de romaneio por foto: R$ 0,90 cada, avulso",
  },
  {
    id: "controle",
    legado: true,
    nome: "Solo (legado)",
    persona: "Plano anterior preservado para contas existentes",
    maturidade: "Mantido apenas para compatibilidade histórica.",
    preco: "69,90",
    valor: 69.9,
    limite: 700,
    leituras: 30,
    consultoras: 1,
    selo: "",
    linha: "Pare de cadastrar peça a peça.",
    herda: "Solo",
    itens: [
      "30 romaneios lidos por foto, todo mês",
      "Alerta de peça parada há mais de 60 dias",
      "Devoluções, trocas, garantia e cortesia",
      "Catálogo pronto para o WhatsApp",
    ],
  },
  {
    id: "crescimento",
    nome: "Equipe",
    persona: "Meu negócio já tem pessoas vendendo comigo",
    maturidade: "Você cuida do todo sem perder de vista cada pessoa.",
    preco: "129,90",
    valor: 129.9,
    limite: 3000,
    leituras: 100,
    consultoras: 5,
    selo: "Para crescer com clareza",
    linha: "Quando o negócio cresce, a clareza devolve seu tempo.",
    herda: "Solo",
    itens: [
      "Tudo do Solo, para até 3.000 códigos",
      "Equipe: o que está com cada pessoa e até quando",
      "Até 5 vendedoras com comissão e vendas separadas",
      "Conselheiro de negócio com ações práticas",
      "Assistente de recompra",
      "100 romaneios lidos por foto, todo mês",
    ],
  },
  {
    id: "joalheria",
    emBreve: true,
    nome: "Escala",
    persona: "Tenho rede de consultoras e mais de um ponto",
    maturidade: "Decide por dado. Compara pessoas, banhos e períodos.",
    preco: "179,90",
    valor: 179.9,
    limite: 6000,
    leituras: 300,
    consultoras: 10,
    selo: "",
    linha: "Da intuição para o painel.",
    herda: "Equipe",
    itens: [
      "10 consultoras e mais de uma loja",
      "Gráficos de giro por banho, modelo e período",
      "KPIs por consultora: ticket, margem e inadimplência",
      "Integração e importação de outro sistema",
      "Cotação de ouro e prata",
      "Relatório para o contador",
      "300 romaneios lidos por foto, todo mês",
    ],
  },
  {
    id: "inteligencia",
    emBreve: true,
    nome: "Visão",
    persona: "Quero comprar pelo dado e integrar tudo",
    maturidade: "Antecipa. O sistema sugere antes de você perguntar.",
    preco: "397,00",
    valor: 397,
    limite: Infinity,
    leituras: 1000,
    consultoras: 25,
    selo: "",
    linha: "Saiba o que comprar antes da concorrência.",
    herda: "Operação",
    itens: [
      "Emissão de nota fiscal integrada",
      "Sugestão de recompra por probabilidade de venda",
      "Tendência do que mais se procura nas buscas",
      "Migração assistida dos seus dados",
      "Suporte prioritário",
      "1.000 romaneios lidos por foto, todo mês",
    ],
  },
];

const PRECO_LEITURA_AVULSA = 0.9;

/* Links de pagamento da Yampi, um por plano.
   No beta a cobrança é por link manual (CPF não permite recorrência automática).
   Cole aqui o link de cada plano gerado no painel da Yampi:
   Vendas > Link de Pagamento > +Novo Link.
   Deixe "" enquanto não tiver o link — o app mostra instrução de contato. */
/* Abre o pagamento seguro (Stripe). Só se o pagamento on-line ainda não foi ativado (ou a internet caiu) usa a forma antiga:
   link manual ou atendimento por WhatsApp, para ninguém ficar sem caminho de pagar. Devolve { ok } ou { erro }. */
async function irParaPagamento(plano, periodo) {
  try {
    window.location.assign(await dados.stripeAssinar({ plano: plano.id, periodo }));
    return { ok: true };
  } catch (e) {
    if (e.code === "nao_configurado" || e.code === "rede") {
      const alt = LINKS_PAGAMENTO[plano.id] || (WHATSAPP_SUPORTE ? linkSuporte("Oi! Quero assinar o plano " + plano.nome + " da Luxi.") : "");
      if (alt) { window.location.assign(alt); return { ok: true, alternativo: true }; }
    }
    return { erro: e.message || "Não consegui abrir o pagamento agora." };
  }
}

const LINKS_PAGAMENTO = {
  inicio: "",       // Solo R$ 69,90
  controle: "",     // legado: redirecionado para Solo
  crescimento: "",  // Equipe R$ 129,90
  joalheria: "",    // Operação R$ 179,90
  inteligencia: "", // Inteligência R$ 397
};

/* Cupons de desconto. Você cria e distribui (vendedoras, Instagram).
   pct = desconto em %, origem = de onde veio (para você saber o que converte).
   Edite aqui para criar/alterar cupons. */
const CUPONS = {
  FUNDADORA: { pct: 30, origem: "Oferta fundadora", meses: 0 }, // vitalício
  INSTA20:   { pct: 20, origem: "Instagram", meses: 3 },
  INDICA15:  { pct: 15, origem: "Indicação de vendedora", meses: 0 },
};

function validarCupom(codigo) {
  const c = String(codigo || "").trim().toUpperCase();
  return CUPONS[c] ? { codigo: c, ...CUPONS[c] } : null;
}

const PLANO_ALIASES = { controle: "inicio" };
const PLANO_PUBLICOS = () => PLANOS.filter((x) => !x.legado && !x.emBreve);
const acharPlano = (pid) => PLANOS.find((x) => x.id === (PLANO_ALIASES[pid] || pid)) || LIVRE;

/* Teste grátis de 72 horas com tudo liberado */
const TRIAL_MS = 72 * 3600 * 1000;
const trialMs = (perfil) => {
  const t = perfil?.trialAte ? new Date(perfil.trialAte).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
};
const horasRestantes = (perfil) =>
  Math.max(0, Math.ceil((trialMs(perfil) - Date.now()) / 3600000));
const emTeste = (perfil) =>
  !perfil?.assinado && trialMs(perfil) > Date.now();
const planoAtivo = (perfil) => {
  if (perfil.mestre) return acharPlano("joalheria");
  if (perfil.assinado || emTeste(perfil)) return acharPlano(perfil.plano);
  return LIVRE;
};

/* Régua de inadimplência: D+7 entra em modo leitura, D+15 cai no Livre. */
const diasAtraso = (perfil) =>
  perfil.atrasoDesde ? dias(perfil.atrasoDesde) : 0;
const somenteLeitura = (perfil) => {
  if (perfil.mestre) return false;
  const a = diasAtraso(perfil);
  return a >= 7 && a < 15;
};

/* ---- dados de demonstração para o acesso mestre ---- */
function dadosDemo() {
  const atras = (d) => new Date(Date.now() - d * 864e5).toISOString();
  const cat = [
    ["AN-1042", "Anel solitário zircônia", 18.9, 49.9, "Ouro 18k", "Zircônia", "Cravejada", "—"],
    ["BR-2210", "Brinco argola 3cm", 12.5, 34.9, "Ouro 18k", "Sem pedra", "Lisa", "—"],
    ["CO-3305", "Colar ponto de luz", 24.0, 64.9, "Ouro 18k", "Zircônia", "Minimalista", "45cm"],
    ["PU-4180", "Pulseira veneziana", 15.8, 42.9, "Prata 925", "Sem pedra", "Lisa", "18cm"],
    ["AN-1077", "Anel aparador trio", 21.4, 57.9, "Ouro rosé", "Zircônia", "Cravejada", "—"],
    ["BR-2255", "Brinco gota cravejado", 19.9, 52.9, "Ródio branco", "Moissanite", "Cravejada", "—"],
    ["CO-3390", "Choker malha grumet", 33.2, 89.9, "Ouro 18k", "Sem pedra", "Maximalista", "40cm"],
    ["PU-4222", "Pulseira berloque", 28.6, 74.9, "Prata 925", "Vidro", "Orgânica", "20cm"],
    ["AN-1099", "Anel falange liso", 8.9, 24.9, "Ouro 10k", "Sem pedra", "Minimalista", "—"],
    ["BR-2301", "Brinco ear cuff", 14.2, 39.9, "Ródio negro", "Zircônia", "Acetinada", "—"],
  ];
  const e1 = id(), e2 = id();
  const estoque = cat.map(([codigo, nome, custo, venda, banho, pedra, acabamento, tamanho], i) => ({
    id: id(),
    entradaId: i < 6 ? e1 : e2,
    codigo,
    nome,
    qtd: [2, 4, 1, 3, 5, 2, 1, 4, 6, 3][i],
    custo,
    venda,
    banho,
    pedra,
    acabamento,
    tamanho,
    fornecedor: i < 6 ? "Prata Fina Distribuidora" : "Ourivesaria Del Rey",
    entradaEm: i < 6 ? atras(74) : atras(21),
  }));
  const cons = [
    { id: id(), nome: "Você (dona)", comissao: 0, dona: true },
    { id: id(), nome: "Patrícia Nunes", comissao: 15 },
    { id: id(), nome: "Elaine Souza", comissao: 20 },
  ];
  const venda = (idx, q, mod, cliente, d, pago = true, ci = 0) => {
    const p = estoque[idx];
    return {
      id: id(),
      pecaId: p.id,
      codigo: p.codigo,
      nome: p.nome,
      qtd: q,
      valor: p.venda * q,
      custo: p.custo * q,
      modalidade: mod,
      cliente,
      pago,
      consultoraId: cons[ci].id,
      data: atras(d),
    };
  };
  return {
    assinantes: {
      inicio: 164,
      controle: 71,
      crescimento: 138,
      joalheria: 24,
      livre: 302,
      trial: 41,
      inadimplentes: 12,
    },
    perfil: {
      nome: "Acesso mestre",
      loja: "Loja Demonstração",
      fornecedores: [
        { nome: "Prata Fina Distribuidora", margem: "120" },
        { nome: "Ourivesaria Del Rey", margem: "150" },
      ],
      margem: "120",
      fiado: true,
      papel: "dona",
      plano: "joalheria",
      assinado: true,
      mestre: true,
      trialAte: new Date(Date.now() + 3650 * 864e5).toISOString(),
      criadoEm: atras(90),
    },
    entradas: [
      {
        id: e1,
        fornecedor: "Prata Fina Distribuidora",
        arquivo: "romaneio-marco.pdf",
        data: atras(74),
        qtdItens: 6,
        total: 486.3,
      },
      {
        id: e2,
        fornecedor: "Ourivesaria Del Rey",
        arquivo: "romaneio-junho.jpg",
        data: atras(21),
        qtdItens: 4,
        total: 512.7,
      },
    ],
    estoque,
    consultoras: cons,
    vendas: [
      venda(1, 2, "Dinheiro", "Márcia Lopes", 3, true, 1),
      venda(4, 1, "Crédito", "Bianca Reis", 5, true, 0),
      venda(8, 3, "Débito", "", 6, true, 2),
      venda(3, 1, CONFIANCA, "Cleusa Martins", 9, false, 1),
      venda(6, 1, "Crédito", "Sandra Vieira", 12, true, 2),
      venda(9, 2, "Dinheiro", "", 15, true, 0),
      venda(2, 1, CONFIANCA, "Rita Andrade", 26, false, 1),
      venda(5, 1, "Débito", "Juliana Paz", 34, true, 2),
    ],
    saidas: [
      {
        id: id(),
        codigo: "BR-2210",
        nome: "Brinco argola 3cm",
        qtd: 1,
        custo: 12.5,
        valor: 12.5,
        motivo: "Defeito",
        data: atras(11),
      },
      {
        id: id(),
        codigo: "PU-4180",
        nome: "Pulseira veneziana",
        qtd: 2,
        custo: 15.8,
        valor: 15.8,
        motivo: "Devolução",
        data: atras(4),
      },
    ],
    despesas: [
      { id: id(), nome: "Embalagens e sacolas", valor: 145, tipo: "Variável", data: atras(8) },
      { id: id(), nome: "Anúncio no Instagram", valor: 200, tipo: "Variável", data: atras(13) },
      { id: id(), nome: "Mensalidade do app", valor: 149.9, tipo: "Fixa", data: atras(2) },
    ],
  };
}

/* Demo da CLIENTE: a mesma loja de exemplo, mas vista como uma revendedora
   comum (papel dona, sem acesso de administrador). Marca o tour guiado.
   É o que a pessoa experimenta para conhecer o produto — diferente do
   acesso mestre, que é o painel do dono da Luxi e exige senha. */
function dadosDemoCliente() {
  const base = dadosDemo();
  return {
    ...base,
    perfil: {
      ...base.perfil,
      nome: "Você (demonstração)",
      loja: "Sua loja (demo)",
      mestre: false, // NÃO é admin
      assinado: false,
      plano: "crescimento",
      demo: true,
      tour: true, // dispara o tour guiado
    },
  };
}

function ChaveTema({ tema, setTema }) {
  const escuro = tema === "escuro";
  return (
    <button
      type="button"
      className="oj-theme-switch"
      aria-label={escuro ? "Mudar para o modo claro" : "Mudar para o modo escuro"}
      aria-pressed={escuro}
      onClick={() => setTema(escuro ? "claro" : "escuro")}
    >
      <span className="oj-theme-track" data-on={escuro ? "1" : "0"} aria-hidden="true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        <svg viewBox="0 0 24 24"><path d="M20.5 15.4A8.5 8.5 0 0 1 8.6 3.5 8.5 8.5 0 1 0 20.5 15.4Z" /></svg>
        <span className="oj-theme-thumb">
          {escuro ? (
            <svg viewBox="0 0 24 24"><path d="M20.5 15.4A8.5 8.5 0 0 1 8.6 3.5 8.5 8.5 0 1 0 20.5 15.4Z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          )}
        </span>
      </span>
      <span className="oj-theme-label">{escuro ? "Escuro" : "Claro"}</span>
    </button>
  );
}

/* ---------------- app ---------------- */
export default function OrganizeJewelry() {
  const [d, setD] = useState(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [abertura, setAbertura] = useState(true);
  const [saindo, setSaindo] = useState(false);
  const [trocando, setTrocando] = useState(false);
  const [menu, setMenu] = useState(false);
  // Accordion do menu: grupos visíveis, conteúdo sob demanda.
  const [menuGrupo, setMenuGrupo] = useState("Dia a dia");
  // PWA: captura o evento de instalação para oferecer "baixar app"
  const [instalavel, setInstalavel] = useState(null);
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setInstalavel(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  const instalarApp = async () => {
    if (!instalavel) return;
    instalavel.prompt();
    await instalavel.userChoice;
    setInstalavel(null);
  };

  // Comportamentos de usabilidade globais (valem para todas as telas e modais):
  //  • Esc fecha o modal aberto
  //  • a página de trás não rola enquanto há um modal aberto
  //  • campos numéricos abrem já selecionados (some o "0" pré-preenchido)
  //  • cada rótulo fica ligado ao seu campo (tocar no rótulo foca o campo; leitor de tela lê)
  useEffect(() => {
    let n = 0;
    let agendado = false;
    const ajustar = () => {
      agendado = false;
      document.body.style.overflow = document.querySelector(".oj-fundo") ? "hidden" : "";
      document.querySelectorAll(".oj-campo").forEach((c) => {
        const l = c.querySelector(":scope > label");
        const el = c.querySelector("input,select,textarea");
        if (!l || !el || el.getAttribute("aria-label")) return;
        if (!el.id) el.id = "campo-" + ++n;
        if (!l.htmlFor) l.htmlFor = el.id;
      });
    };
    const obs = new MutationObserver(() => {
      if (!agendado) {
        agendado = true;
        requestAnimationFrame(ajustar);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    ajustar();
    const teclas = (e) => {
      if (e.key !== "Escape") return;
      const fundos = document.querySelectorAll(".oj-fundo");
      if (fundos.length) fundos[fundos.length - 1].click();
    };
    const foco = (e) => {
      const t = e.target;
      if (t && t.tagName === "INPUT" && t.type === "number")
        setTimeout(() => {
          try { t.select(); } catch (_) { /* ignora */ }
        }, 0);
    };
    document.addEventListener("keydown", teclas);
    document.addEventListener("focusin", foco);
    return () => {
      obs.disconnect();
      document.removeEventListener("keydown", teclas);
      document.removeEventListener("focusin", foco);
      document.body.style.overflow = "";
    };
  }, []);
  const [tela, setTela] = useState("login"); // login | app | vendas | cadastro
  const [minimoAbertura, setMinimoAbertura] = useState(false);
  const [precisaNovaSenha, setPrecisaNovaSenha] = useState(false);
  const [aba, setAba] = useState("painel");
  const [fescala, setFescala] = useState(() => {
    const s = Number(localStorage.getItem("luxi:fescala"));
    return s >= 0.9 && s <= 1.6 ? s : 1;
  });
  const [tema, setTema] = useState(() => localStorage.getItem("luxi:tema") || "claro");
  const [zoomAberto, setZoomAberto] = useState(false);
  // Aplica o zoom no documento inteiro — assim funciona em toda tela
  // (login, cadastro, app), não só na que declarar a variável.
  useEffect(() => {
    document.documentElement.style.zoom = String(fescala);
  }, [fescala]);
  useEffect(() => {
    localStorage.setItem("luxi:tema", tema);
  }, [tema]);
  const mudarFonte = (delta) => {
    setFescala((f) => {
      const novo = Math.min(1.6, Math.max(0.9, Math.round((f + delta) * 100) / 100));
      localStorage.setItem("luxi:fescala", String(novo));
      return novo;
    });
  };
  const [modal, setModal] = useState(null);
  const [periodo, setPeriodo] = useState("mes");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  // true = existe sessão Supabase válida (mesmo que ainda sem loja criada)
  const [contaLogada, setContaLogada] = useState(false);
  const [onboardingOperacional, setOnboardingOperacional] = useState(false);
  // Volta do pagamento (?pagamento=ok): a Stripe avisa o servidor por conta própria e isso leva segundos. Conferimos de 3 em 3 s por até 1 minuto.
  const [voltaPagamento, setVoltaPagamento] = useState(() => { try { return new URLSearchParams(window.location.search).get("pagamento"); } catch (_) { return null; } });
  const [pagamentoDemora, setPagamentoDemora] = useState(false);
  useEffect(() => {
    if (!voltaPagamento) return undefined;
    const limpar = () => { try { window.history.replaceState({}, "", window.location.pathname); } catch (_) { /* ok */ } };
    if (voltaPagamento !== "ok" || d.perfil?.assinado) { limpar(); setVoltaPagamento(null); return undefined; }
    if (!d.lojaId) return undefined; // ainda carregando a conta
    let n = 0;
    const id = setInterval(async () => {
      n += 1;
      try { await recarregar(); } catch (_) { /* tenta de novo */ }
      if (n >= 20) { clearInterval(id); setPagamentoDemora(true); }
    }, 3000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voltaPagamento, d.perfil?.assinado, d.lojaId]);

  /* Convite de consultora: chega como ?convite=CODIGO num link de
     WhatsApp. Fica guardado até ser aceito (ou cancelado) — depois de
     usado, tira da URL para não tentar de novo num F5. */
  const [convite, setConvite] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("convite") || null;
    } catch (e) {
      return null;
    }
  });
  const [conviteErro, setConviteErro] = useState("");
  const [betaToken, setBetaToken] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("beta") || null;
    } catch (e) {
      return null;
    }
  });
  const [betaEmail, setBetaEmail] = useState("");
  const [betaErro, setBetaErro] = useState("");
  const limparConvite = () => {
    setConvite(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("convite");
      window.history.replaceState({}, "", url);
    } catch (e) {
      /* ambiente sem history/URL (ex.: alguns webviews) — sem problema,
         o pior caso é tentar aceitar de novo, e aceitar_convite já é
         seguro para isso (só falha, não duplica). */
    }
  };

  const limparBeta = () => {
    setBetaToken(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("beta");
      window.history.replaceState({}, "", url);
    } catch (e) {
      /* ambiente sem history/URL */
    }
  };

  /* Busca o estado real das tabelas relacionais e atualiza a tela.
     Usado no boot, depois de criar a loja, depois de entrar e depois
     do romaneio confirmado. */
  const recarregar = async () => {
    let usuario = null;
    try { usuario = await dados.auth.usuario(); } catch (_) {}

    try {
      const est = await dados.carregarTudo();
      if (!est || est.semLoja) {
        setD({ ...VAZIO, perfil: null });
        return null;
      }
      setD(deTabelas(est));
      await salvarBackupSeguro(est, usuario?.id || usuario?.email || null);
      return est;
    } catch (e) {
      /* Nunca transforma uma falha de leitura em uma loja vazia.
         Primeiro tenta o último retrato local da MESMA conta. */
      const backup = lerBackupSeguro(usuario?.id || usuario?.email || null);
      if (backup?.lojaId) {
        setD(deTabelas(backup));
        console.warn("Luxi: banco indisponível; usando cópia local de segurança.", e);
        return backup;
      }
      throw e;
    }
  };

  useEffect(() => {
    // Rede de segurança: com internet lenta ou instável, o app NUNCA fica preso
    // em "Abrindo sua loja…". Passados 10s, libera a tela (login) em vez de travar.
    const travaSeguranca = setTimeout(() => setCarregando(false), 10000);
    (async () => {
      try {
        const u = await Promise.race([
          dados.auth.usuario(),
          new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
        ]);
        if (u) {
          setContaLogada(true);
          const est = await recarregar();
          if (est) {
            setTela("app");
          } else if (betaToken) {
            try {
              await dados.auth.consumirConviteBeta(betaToken);
            } catch (e) {
              /* convite já usado por esta mesma conta: segue para abrir a loja do mesmo jeito */
            }
            limparBeta();
            setTela("cadastro");
          } else if (convite) {
            // Já tem sessão mas ainda não tem loja, e chegou com um
            // convite pendente na URL — tenta vincular automaticamente
            // antes de decidir a tela.
            try {
              await dados.aceitarConvite(convite);
              limparConvite();
              const est2 = await recarregar();
              setTela(est2 ? "app" : "convite");
            } catch (e) {
              setConviteErro(e.message || "Convite inválido ou já utilizado.");
              setTela("convite");
            }
          } else {
            // Está logada mas ainda não abriu a loja (criou a conta e não terminou):
            // leva direto para abrir a loja, em vez de mostrar o login de novo.
            setTela("cadastro");
          }
        } else if (betaToken) {
          try {
            const conviteBeta = await dados.auth.validarConviteBeta(betaToken);
            setBetaEmail(conviteBeta.email);
            setTela("beta");
          } catch (e) {
            setBetaErro(e.message || "Convite Beta inválido ou expirado.");
            setTela("beta");
          }
        } else if (convite) {
          setTela("convite");
        }
      } catch (e) {
        console.error("Falha ao carregar loja", e);
      }
      clearTimeout(travaSeguranca);
      setCarregando(false);
    })();
    // A animação da marca aparece por pouco tempo e sai assim que o app está pronto.
    // (Antes ela rodava 4,7 s fixos, mesmo com tudo carregado.) O teto de 12 s garante que nunca prende.
    const tMinimo = setTimeout(() => setMinimoAbertura(true), 1000);
    const tTeto = setTimeout(() => setAbertura(false), 12000);
    return () => {
      clearTimeout(tMinimo);
      clearTimeout(tTeto);
      clearTimeout(travaSeguranca);
    };
  }, []);

  // Depois que a administradora redefine uma senha, a cliente é obrigada a criar a dela no primeiro acesso.
  useEffect(() => {
    if (!contaLogada) {
      setPrecisaNovaSenha(false);
      return;
    }
    let vivo = true;
    dados.auth.precisaTrocarSenha().then((v) => {
      if (vivo) setPrecisaNovaSenha(!!v);
    });
    return () => {
      vivo = false;
    };
  }, [contaLogada]);

  useEffect(() => {
    if (!minimoAbertura || carregando) return;
    setSaindo(true);
    const t = setTimeout(() => setAbertura(false), 500);
    return () => clearTimeout(t);
  }, [minimoAbertura, carregando]);

  const irPara = (k) => {
    if (k === aba) return;
    setTrocando(true);
    setAba(k);
    setTimeout(() => setTrocando(false), 420);
  };

  /* ---- persistência ainda não migrada para as tabelas relacionais ----
     Estoque (editar/excluir), vendas, saídas, despesas, equipe e maleta
     chegam no Bloco 2/3. Até lá, essas telas continuam funcionando de
     forma otimista e local (não some da tela), mas não sincroniza entre
     aparelhos nem sobrevive a um recarregar() — isso é esperado nesta
     etapa e será substituído bloco a bloco. */
  const salvar = async (novo) => {
    setD(novo);
    try {
      await window.storage.set(KEY, JSON.stringify(novo));
    } catch (e) {
      console.error("Falha ao gravar localmente", e);
    }
  };

  /* ---- Bloco 2: operação do dia a dia, gravando de verdade no banco ----
     Sem loja real (demo/mestre, d.lojaId vazio) tudo cai no `salvar`
     local de sempre — mesma regra já usada em clientes. */
  const registrarVendaPeca = async (v) => {
    if (!d.lojaId) {
      await salvar({
        ...d,
        vendas: [...d.vendas, { id: id(), ...v }],
        estoque: d.estoque.map((p) =>
          p.id === v.pecaId ? { ...p, qtd: p.qtd - v.qtd } : p
        ),
      });
      return;
    }
    await dados.registrarVenda(d.lojaId, v);
    await recarregar();
  };

  const quitarVendaConfianca = async (venda) => {
    if (!d.lojaId) {
      await salvar({
        ...d,
        vendas: d.vendas.map((x) => (x.id === venda.id ? { ...x, pago: true } : x)),
      });
      return;
    }
    await dados.quitarVenda(venda.id);
    await recarregar();
  };

  const registrarSaidaPeca = async (peca, motivo) => {
    if (!d.lojaId) {
      await salvar({
        ...d,
        estoque: d.estoque.map((p) =>
          p.id === peca.id ? { ...p, qtd: p.qtd - 1 } : p
        ),
        saidas: [
          ...d.saidas,
          { id: id(), codigo: peca.codigo, nome: peca.nome, qtd: 1, custo: peca.custo, valor: peca.custo, motivo, data: hoje() },
        ],
      });
      return;
    }
    await dados.registrarSaida(d.lojaId, peca.id, motivo);
    await recarregar();
  };

  const salvarPeca = async (dadosPeca) => {
    if (!d.lojaId) {
      if (dadosPeca.id) {
        await salvar({
          ...d,
          estoque: d.estoque.map((p) => (p.id === dadosPeca.id ? { ...p, ...dadosPeca } : p)),
        });
      } else {
        await salvar({
          ...d,
          estoque: [
            ...d.estoque,
            { ...dadosPeca, id: id(), entradaId: null, entradaEm: hoje(), fornecedor: dadosPeca.fornecedor || "Cadastro manual" },
          ],
        });
      }
      return;
    }
    if (dadosPeca.id) {
      await dados.pecas.atualizar(dadosPeca.id, dadosPeca, d.lojaId);
    } else {
      await dados.pecas.criar(d.lojaId, {
        ...dadosPeca,
        entradaId: null,
        fornecedor: dadosPeca.fornecedor || "Cadastro manual",
      });
    }
    await recarregar();
  };

  // Regra de integridade: peça já movimentada (venda/saída) não pode
  // sumir de vez — arquiva. Nunca movimentada pode apagar. O check aqui
  // é a mesma condição usada na tela para decidir o texto do aviso; a
  // garantia de verdade é a constraint do banco (se falhar, pedimos pra
  // arquivar em vez de insistir em apagar).
  const arquivarOuExcluirPeca = async (peca, jaMovimentou) => {
    if (!d.lojaId) {
      if (jaMovimentou) {
        await salvar({
          ...d,
          estoque: d.estoque.map((p) => (p.id === peca.id ? { ...p, arquivada: true, qtd: 0 } : p)),
        });
      } else {
        await salvar({ ...d, estoque: d.estoque.filter((p) => p.id !== peca.id) });
      }
      return;
    }
    if (jaMovimentou) {
      await dados.pecas.arquivar(peca.id);
    } else {
      try {
        await dados.pecas.excluir(peca.id);
      } catch (e) {
        // FK de maleta/venda/saída impediu o apagamento de vez: arquiva
        // em vez de travar a pessoa numa exclusão que não pode acontecer.
        await dados.pecas.arquivar(peca.id);
      }
    }
    await recarregar();
  };

  const criarDespesa = async (despesa) => {
    if (!d.lojaId) {
      await salvar({ ...d, despesas: [...d.despesas, { id: id(), ...despesa, data: hoje() }] });
      return;
    }
    await dados.despesas.criar(d.lojaId, despesa);
    await recarregar();
  };

  const removerDespesa = async (despesa) => {
    if (!d.lojaId) {
      await salvar({ ...d, despesas: d.despesas.filter((x) => x.id !== despesa.id) });
      return;
    }
    await dados.despesas.remover(despesa.id);
    await recarregar();
  };

  /* Coleções: agrupamentos nomeados de peças, para facilitar estratégias
     de venda. Criadas no Estoque ou direto ao subir um romaneio — nos
     dois lugares a pessoa escolhe uma já existente ou digita um nome
     novo. Retorna a coleção criada (com id) para quem chamou já poder
     usar na mesma ação (associar a uma peça, aplicar num romaneio). */
  const criarColecao = async (nome) => {
    const n = (nome || "").trim();
    if (!n) throw new Error("Dê um nome para a coleção.");
    const jaExiste = (d.colecoes || []).find(
      (col) => col.nome.trim().toLowerCase() === n.toLowerCase()
    );
    if (jaExiste) return jaExiste;
    if (!d.lojaId) {
      const nova = { id: id(), nome: n, criadaEm: hoje() };
      await salvar({ ...d, colecoes: [...(d.colecoes || []), nova] });
      return nova;
    }
    const nova = await dados.colecoes.criar(d.lojaId, n);
    await recarregar();
    return nova;
  };

  /* Bloco 3 — equipe: convidar consultora (gera um código de convite de
     verdade, salvo no banco), ajustar comissão, remover. A consultora
     só entra em vigor de fato quando ela aceita o convite (ver
     `aceitarConvite`, chamado a partir da tela de login/cadastro). */
  const criarConsultora = async (dadosConsultora) => {
    if (!d.lojaId) {
      const convite =
        "luxi-" + Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
      const nova = { id: id(), ...dadosConsultora, convite, ativa: true };
      await salvar({ ...d, consultoras: [...(d.consultoras || []), nova] });
      return nova;
    }
    const nova = await dados.consultoras.criar(d.lojaId, dadosConsultora);
    await recarregar();
    return nova;
  };

  const atualizarConsultora = async (consultoraId, campos) => {
    if (!d.lojaId) {
      await salvar({
        ...d,
        consultoras: (d.consultoras || []).map((c) =>
          c.id === consultoraId ? { ...c, ...campos } : c
        ),
      });
      return;
    }
    await dados.consultoras.atualizar(consultoraId, campos);
    await recarregar();
  };

  const removerConsultora = async (consultora) => {
    if (!d.lojaId) {
      await salvar({
        ...d,
        consultoras: (d.consultoras || []).filter((c) => c.id !== consultora.id),
      });
      return;
    }
    await dados.consultoras.remover(consultora.id);
    await recarregar();
  };

  /* filtro de período */
  const dentro = useMemo(() => {
    const agora = new Date();
    if (periodo === "7") {
      const lim = Date.now() - 7 * 864e5;
      return (iso) => new Date(iso).getTime() >= lim;
    }
    if (periodo === "mes") {
      const m = agora.getMonth(), y = agora.getFullYear();
      return (iso) => {
        const x = new Date(iso);
        return x.getMonth() === m && x.getFullYear() === y;
      };
    }
    if (periodo === "custom" && de && ate) {
      const a = new Date(de).getTime(), b = new Date(ate).getTime() + 864e5;
      return (iso) => {
        const t = new Date(iso).getTime();
        return t >= a && t < b;
      };
    }
    return () => true;
  }, [periodo, de, ate]);

  if (abertura)
    return (
      <div className="oj">
        <style>{CSS}</style>
        <Abertura saindo={saindo} />
      </div>
    );

  if (carregando)
    return (
      <div className="oj">
        <style>{CSS}</style>
        <div style={{ paddingTop: 90 }}>
          <Carregando texto="Abrindo sua loja…" />
        </div>
      </div>
    );

  if (precisaNovaSenha)
    return (
      <div className="oj">
        <style>{CSS}</style>
        <NovaSenhaObrigatoria
          aoConcluir={() => setPrecisaNovaSenha(false)}
          sair={async () => {
            try {
              await dados.auth.sair();
            } catch (e) {
              console.error("Falha ao sair", e);
            }
            setContaLogada(false);
            setD(VAZIO);
            setTela("login");
            setPrecisaNovaSenha(false);
          }}
        />
      </div>
    );

  /* A tela é escolhida por navegação explícita (tela), não só pela
     existência de perfil — senão cadastro/vendas nunca seriam
     alcançáveis para quem ainda não tem loja. */
  if (tela === "vendas")
    return (
      <div className="oj">
        <style>{CSS}</style>
        <Vitrine voltar={() => setTela("login")} assinar={() => setTela("cadastro")} />
      </div>
    );

  if (tela === "beta")
    return (
      <div className="oj">
        <style>{CSS}</style>
        <AceitarConvite
          beta
          betaEmail={betaEmail}
          erroInicial={betaErro}
          criarConta={async (email, senha) => {
            const resultado = await dados.auth.cadastrarBeta(betaToken, email, senha);
            setContaLogada(true);
            return resultado.confirmado;
          }}
          entrarConta={async (email, senha) => {
            await dados.auth.entrar(email, senha);
            await dados.auth.consumirConviteBeta(betaToken);
            setContaLogada(true);
          }}
          aceitar={async () => {
            limparBeta();
            const est = await recarregar();
            setTela(est ? "app" : "cadastro");
          }}
          cancelar={() => {
            limparBeta();
            setBetaErro("");
            setTela("login");
          }}
        />
      </div>
    );
  if (tela === "convite")
    return (
      <div className="oj">
        <style>{CSS}</style>
        <AceitarConvite
          erroInicial={conviteErro}
          criarConta={async (email, senha) => {
            await dados.auth.cadastrar(email, senha);
            setContaLogada(true);
            return !!(await dados.auth.usuario());
          }}
          entrarConta={async (email, senha) => {
            await dados.auth.entrar(email, senha);
            setContaLogada(true);
          }}
          aceitar={async () => {
            if (!convite) {
              throw new Error(
                "Link de convite ausente. Peça um novo link para quem te convidou."
              );
            }
            await dados.aceitarConvite(convite);
            limparConvite();
            const est = await recarregar();
            setTela(est ? "app" : "login");
          }}
          cancelar={() => {
            limparConvite();
            setConviteErro("");
            setTela("login");
          }}
        />
      </div>
    );

  if (tela === "cadastro")
    return (
      <div className="oj">
        <style>{CSS}</style>
        <CadastroNovo
          contaLogada={contaLogada}
          criarConta={async (email, senha) => {
            await dados.auth.cadastrar(email, senha);
            setContaLogada(true);
            return !!(await dados.auth.usuario());
          }}
          tentarEntrar={async (email, senha) => {
            await dados.auth.entrar(email, senha);
            setContaLogada(true);
          }}
          aoEntrar={async () => {
            setContaLogada(true);
            const est = await recarregar();
            // Conta existe mas ainda não tem loja: continua no cadastro
            // (que já pula direto para os dados da loja, pois contaLogada).
            setTela(est ? "app" : "cadastro");
          }}
          onPronto={async (perfil) => {
            await dados.criarLoja({
              nome: perfil.loja,
              fornecedores: perfil.fornecedores,
              formas: perfil.formas,
              margem: perfil.margem,
              plano: perfil.plano,
              dona: perfil.nome,
              whatsapp: perfil.whatsapp,
            });
            const estCriada = await recarregar();
            setTela("app");
            if (estCriada?.lojaId) {
              try {
                const concluido = localStorage.getItem("luxi:onboarding:v1:" + estCriada.lojaId) === "1";
                setOnboardingOperacional(!concluido);
              } catch (_) {
                setOnboardingOperacional(true);
              }
            }
          }}
          onMestre={async () => {
            const est = await recarregar();
            setTela(est ? "app" : "login");
          }}
          voltar={() => setTela("login")}
        />
      </div>
    );

  /* Sem perfil OU sessão encerrada: abre no LOGIN. */
  if (!d.perfil || tela === "login")
    return (
      <div className="oj">
        <style>{CSS}</style>
        <Login
          onEntrar={async () => {
            setContaLogada(true);
            const est = await recarregar();
            setTela(est ? "app" : "cadastro");
          }}
          onMestre={async () => {
            const est = await recarregar();
            setTela(est ? "app" : "login");
          }}
          onDemo={async () => {
            await salvar(dadosDemoCliente());
            setTela("app");
          }}
          verPlanos={() => setTela("vendas")}
          irCadastro={() => setTela("cadastro")}
          loja={d.perfil?.loja}
          logo={d.perfil?.logo}
        />
      </div>
    );

  const ehConsultora = d.perfil.papel === "consultora" && !d.perfil.mestre;

  const telas = {
    painel: ehConsultora ? (
      <div className="oj-vazio">
        <span className="oj-serif">Área da administradora</span>
        O resultado da loja é visível apenas para quem administra. Você acompanha suas
        próprias vendas e sua maleta.
      </div>
    ) : (
      <Painel d={d} dentro={dentro} irPara={irPara} />
    ),
    estoque: (
      <Estoque
        d={d}
        salvar={salvar}
        salvarPeca={salvarPeca}
        arquivarOuExcluirPeca={arquivarOuExcluirPeca}
        registrarSaidaPeca={registrarSaidaPeca}
        criarColecao={criarColecao}
        dentro={dentro}
        abrir={setModal}
        tema={tema}
      />
    ),
    vendas: <Vendas d={d} dentro={dentro} quitarVenda={quitarVendaConfianca} />,
    conselho: <Conselheiro d={d} dentro={dentro} irPara={irPara} />,
    catalogo: <LojaOnline d={d} irPara={irPara} recarregar={recarregar} Avulso={<Catalogo d={d} />} />,
    lona: <Lona d={d} recarregar={recarregar} />,
    clientes: (
      <Clientes
        d={d}
        salvar={salvar}
        quitarVenda={quitarVendaConfianca}
        cadastrarCliente={async (cli) => {
          if (d.lojaId) {
            await dados.salvarCliente(d.lojaId, cli);
            await recarregar();
          } else {
            await salvar({
              ...d,
              clientes: [...(d.clientes || []), { id: id(), ...cli, criadoEm: hoje() }],
            });
          }
        }}
      />
    ),
    maleta: <Maleta d={d} salvar={salvar} recarregar={recarregar} />,
    graficos: ehConsultora ? (
      <div className="oj-vazio">
        <span className="oj-serif">Área da administradora</span>
        Esta tela mostra o resultado da loja inteira e fica disponível apenas para quem
        administra. Você acompanha sua maleta, suas vendas e suas clientes.
      </div>
    ) : <Dashboards d={d} dentro={dentro} />,
    perfil: <Perfil d={d} salvar={salvar} irPara={irPara} tema={tema} setTema={setTema} />,
    integracoes: ehConsultora ? (
      <div className="oj-vazio">
        <span className="oj-serif">Área da administradora</span>
        Esta tela mostra o resultado da loja inteira e fica disponível apenas para quem
        administra. Você acompanha sua maleta, suas vendas e suas clientes.
      </div>
    ) : <Integracoes d={d} salvar={salvar} />,
    equipe: ehConsultora ? (
      <div className="oj-vazio">
        <span className="oj-serif">Área da administradora</span>
        Esta tela mostra o resultado da loja inteira e fica disponível apenas para quem
        administra. Você acompanha sua maleta, suas vendas e suas clientes.
      </div>
    ) : (
      <Equipe
        irPara={irPara}
        d={d}
        salvar={salvar}
        dentro={dentro}
        criarConsultora={criarConsultora}
        atualizarConsultora={atualizarConsultora}
        removerConsultora={removerConsultora}
      />
    ),
    contas: ehConsultora ? (
      <div className="oj-vazio">
        <span className="oj-serif">Área da administradora</span>
        Esta tela mostra o resultado da loja inteira e fica disponível apenas para quem
        administra. Você acompanha sua maleta, suas vendas e suas clientes.
      </div>
    ) : (
      <Contas
        irPara={irPara}
        d={d}
        salvar={salvar}
        dentro={dentro}
        criarDespesa={criarDespesa}
        removerDespesa={removerDespesa}
        quitarVenda={quitarVendaConfianca}
        recarregar={recarregar}
      />
    ),
    admin: <Admin d={d} />,
  };

  const titulos = {
    painel: ["Sua loja hoje", "Um resumo de como as coisas estão"],
    estoque: ["Suas peças", "Tudo que você tem e o que tá parado na gaveta"],
    vendas: ["Suas vendas", "O que já vendeu e o que ainda vão te pagar"],
    conselho: ["Dicas pra você", "O que seus números estão pedindo agora"],
    catalogo: ["Sua loja on-line", "O link para suas clientes verem as peças e pedirem"],
    lona: ["Editar loja e pedidos", "Capa, preços, Pix e os pedidos das clientes"],
    clientes: ["Suas clientes", "Quem compra sempre, quem sumiu e quem deve"],
    maleta: ["Quem tá com o quê", "Suas peças que estão na rua pra vender"],
    graficos: ["Seus números", "Um raio-x do que tá bombando (ou não)"],
    perfil: ["Minha conta", "Seu plano, sua loja, do seu jeito"],
    integracoes: ["Integrações", "Em breve"],
    equipe: ["Seu time", "Quem vendeu, quanto ganhou e o que levou"],
    contas: ["Suas contas", "O que sai do bolso e o que ainda vai sair"],
    admin: ["Uso do Luxi", "O que as lojas realmente estão usando — dados reais"],
  };

  const abas = ehConsultora
    ? [
        ["maleta", "Maleta"],
        ["estoque", "Catálogo"],
        ["vendas", "Vendas"],
        ["clientes", "Clientes"],
      ]
    : [
        ["painel", "Painel"],
        ["estoque", "Estoque"],
        ["vendas", "Vendas"],
        ["conselho", "Conselho"],
      ];
  const temEquipe = !ehConsultora && ["crescimento", "joalheria", "inteligencia"].includes(planoAtivo(d.perfil).id);

  const acessoLiberado = d.perfil?.mestre || (d.perfil?.assinado && !(d.perfil?.status === "atrasada" && diasAtraso(d.perfil) >= 15)) || emTeste(d.perfil);
  if (!acessoLiberado) {
    return (
      <AcessoEncerrado
        perfil={d.perfil}
        confirmando={voltaPagamento === "ok"}
        demorou={pagamentoDemora}
        sair={async () => {
          try { await dados.auth.sair(); } catch (e) { console.error("Falha ao sair", e); }
          setContaLogada(false);
          setD(VAZIO);
          setTela("login");
        }}
      />
    );
  }

  return (
    <div className="oj" data-theme={tema}>
      <style>{CSS}</style>

      {!menu && (
        <div className={"oj-fonte-ctrl" + (zoomAberto ? " aberto" : "")}>
          {zoomAberto ? (
            <>
              <button className="a-maior" aria-label="Aumentar" onClick={() => mudarFonte(0.1)}>A</button>
              <div className="sep-f" />
              <button className="a-menor" aria-label="Diminuir" onClick={() => mudarFonte(-0.1)}>A</button>
              <div className="sep-f" />
              <button className="a-fechar" aria-label="Fechar" onClick={() => setZoomAberto(false)}>×</button>
            </>
          ) : (
            <button className="a-toggle" aria-label="Tamanho da letra" onClick={() => setZoomAberto(true)}>A</button>
          )}
        </div>
      )}

      {!menu && <AjudaLuxi aba={aba} irPara={irPara} />}
      <MensagemDoDia pausar={menu || !!modal || onboardingOperacional || !!d.perfil.tour || !!d.perfil.mestre || !d.perfil} />

      {d.perfil.tour && (
        <TourDemo
          onSair={() => salvar({ ...d, perfil: { ...d.perfil, tour: false } })}
          irPara={(k) => setAba(k)}
        />
      )}

      <div className="oj-top" style={{ position: "sticky" }}>
        <div
          className={"oj-veu" + (menu ? " aberto" : "")}
          style={{ pointerEvents: menu ? "auto" : "none" }}
          onClick={() => setMenu(false)}
        />
        <nav className={"oj-lateral oj-menu" + (menu ? " aberto" : "")} aria-hidden={!menu}>
          <div className="topo">
            <Marca size={34} animar={false} />
            <div>
              <div className="oj-nome-marca oj-serif" style={{ fontSize: 24 }}>
                Luxi
              </div>
              <div className="oj-loja">parceira de {d.perfil.loja}</div>
            </div>
          </div>
          <div className="oj-menu-tema">
            <div>
              <div className="oj-lbl">Aparência</div>
              <small>Conforto para usar à noite</small>
            </div>
            <ChaveTema tema={tema} setTema={setTema} />
          </div>

          {(ehConsultora
            ? [
                ["Meu trabalho", [
                  ["maleta", "Minha maleta", "As peças que estão comigo"],
                  ["estoque", "Catálogo", "O que existe na loja"],
                  ["vendas", "Minhas vendas", "O que eu vendi"],
                  ["clientes", "Minhas clientes", "Quem compra comigo"],
                  ["catalogo", "Loja on-line", "Link para suas clientes"],
                  ["lona", "Editar loja e pedidos", "Capa, preços e pedidos"],
                ]],
                ["Conta", [["perfil", "Minha conta", "Dados e acesso"]]],
              ]
            : [
            ["Dia a dia", [
              ["painel", "Painel", "O mês em um olhar"],
              ["estoque", "Estoque", "Peças e reposição"],
              ["vendas", "Vendas", "Histórico e recebimentos"],
              ["clientes", "Clientes", "Quem compra e quanto gasta"],
              ["catalogo", "Loja on-line", "Link para suas clientes"],
              ["lona", "Editar loja e pedidos", "Capa, preços e pedidos"],
            ]],
            ["Equipe", [
              ["maleta", "Maleta", "O que está com quem"],
              ["equipe", "Equipe", "Consultoras e comissões"],
            ]],
            ["Análise", [
              ["conselho", "Conselheiro", "O que fazer agora"],
              ["graficos", "Análises", "Giro, despesas e KPIs"],
            ]],
            ["Conta", [
              ["contas", "Contas", "Despesas e a receber"],
              ["perfil", "Minha conta", "Plano, logo e WhatsApp"],
            ]],
          ]).filter(([grupo]) => grupo !== "Equipe" || temEquipe).map(([grupo, itens]) => {
            // "Dia a dia" só existe para a dona: para a consultora, o grupo dela ("Meu trabalho") é o que nasce aberto
            const aberto = menuGrupo === grupo || (ehConsultora && menuGrupo === "Dia a dia" && grupo === "Meu trabalho");
            return (
              <div key={grupo} className="oj-menu-grupo">
                <button type="button" className="oj-grupo-btn" aria-expanded={aberto}
                  onClick={() => setMenuGrupo(aberto ? null : grupo)}>
                  <span>{grupo}</span>
                  <span className="oj-grupo-chevron" aria-hidden="true">⌄</span>
                </button>
                {aberto && (
                  <div className="oj-grupo-itens">
                    {itens.map(([k, t, sub]) => (
                      <button key={k} className="oj-menu-item" data-ativo={aba === k ? "1" : "0"}
                        onClick={() => { setMenu(false); irPara(k); }}>
                        <span>{t}<small>{sub}</small></span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="oj-menu-ajuda">
            <button type="button" className="oj-tour-menu"
              onClick={() => { setMenu(false); setOnboardingOperacional(true); }}>
              <span>
                Aprender a usar
                <small>Aulas curtas, passo a passo</small>
              </span>
            </button>
          </div>

          {d.perfil.mestre && (
            <div>
              <div className="oj-grupo">Luxi</div>
              <button
                data-ativo={aba === "admin" ? "1" : "0"}
                onClick={() => {
                  setMenu(false);
                  irPara("admin");
                }}
              >
                <span>
                  Uso do Luxi
                  <small>Lojas e atividade reais</small>
                </span>
              </button>
            </div>
          )}

          <div className="sep" />
          <button
            onClick={async () => {
              setMenu(false);
              // Encerra a sessão na nuvem — senão a próxima pessoa no aparelho
              // entraria na conta anterior. Os dados ficam salvos na nuvem.
              try {
                await dados.auth.sair();
              } catch (e) {
                console.error("Falha ao sair", e);
              }
              setContaLogada(false);
              setD(VAZIO);
              setTela("login");
            }}
          >
            <span style={{ color: "var(--rose-esc)" }}>
              Sair
              <small>Seus dados continuam salvos</small>
            </span>
          </button>

          {instalavel && (
            <button
              onClick={() => { setMenu(false); instalarApp(); }}
              style={{ marginTop: 4 }}
            >
              <span style={{ color: "var(--marinho)", display: "flex", alignItems: "center", gap: 8 }}>
                <svg viewBox="0 0 24 24" style={{ width: 17, height: 17, stroke: "var(--marinho)", strokeWidth: 1.7, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" }}>
                  <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
                </svg>
                <span>
                  Baixar o app no celular
                  <small>Acesso rápido, direto da tela inicial</small>
                </span>
              </span>
            </button>
          )}
        </nav>

        <div className="oj-cabeca">
          <button
            className="oj-hamb"
            aria-label="Abrir menu"
            onClick={() => setMenu(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <Marca size={46} animar={false} />
          <div>
            <div className="oj-nome-marca oj-serif">Luxi</div>
            <div className="oj-loja">parceira de {d.perfil.loja}</div>
          </div>
          {/* Ação principal: vender — sempre à mão no cabeçalho */}
          {!somenteLeitura(d.perfil) && (
            <button
              className="oj-vender-btn"
              onClick={() => setModal({ tipo: "escolher-venda" })}
              aria-label="Registrar uma venda"
            >
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
              <span>Vender</span>
            </button>
          )}
        </div>

        {/* Atalhos rápidos — os acessos do dia a dia, sem abrir o menu */}
        {!ehConsultora && (
          <div className="oj-atalhos" role="tablist">
            {[
              ["painel", "Início", <path d="M3 11l9-8 9 8M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />],
              ["estoque", "Peças", <><path d="M6 3h12l4 6-10 12L2 9z" /><path d="M2 9h20" /></>],
              ["vendas", "Vendas", <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />],
              ["clientes", "Clientes", <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0113 0M16 5.5a3.5 3.5 0 010 6.5M22 20a6.5 6.5 0 00-4-6" /></>],
            ].map(([k, rot, icone]) => (
              <button
                key={k}
                className="oj-atalho"
                data-tour-role={k === "painel" ? "inicio" : k === "estoque" ? "pecas" : k === "vendas" ? "vendas" : k === "clientes" ? "clientes" : undefined}
                data-on={aba === k ? "1" : "0"}
                onClick={() => irPara(k)}
              >
                <svg viewBox="0 0 24 24" className="oj-atalho-ico">{icone}</svg>
                <span>{rot}</span>
              </button>
            ))}
          </div>
        )}

        <h1 className="oj-h1 oj-serif" data-tour-role={aba === "lona" ? "lona-screen" : aba === "conselho" ? "conselheira-screen" : undefined}>{titulos[aba][0]}</h1>
        <div className="oj-sub">{titulos[aba][1]}</div>
        {aba !== "admin" && aba !== "lona" && aba !== "catalogo" && (
          <Filtro
            periodo={periodo}
            setPeriodo={setPeriodo}
            de={de}
            ate={ate}
            setDe={setDe}
            setAte={setAte}
          />
        )}
      </div>

      <Aviso d={d} irPara={irPara} />
      {!somenteLeitura(d.perfil) && !d.perfil?.mestre && <RetrospectivaMes d={d} autoAbrir />}

      {onboardingOperacional && (
        <OnboardingOperacional
          d={d}
          onImportar={() => setModal({ tipo: "romaneio" })}
          irPara={irPara}
          onConcluir={() => {
            try {
              if (d.lojaId) localStorage.setItem("luxi:onboarding:v1:" + d.lojaId, "1");
            } catch (_) {}
            setOnboardingOperacional(false);
          }}
        />
      )}

      {!onboardingOperacional && !somenteLeitura(d.perfil) && !d.perfil?.mestre && (
        <ProximoPasso d={d} irPara={irPara} />
      )}

      <div className="oja" key={aba}>
        {["catalogo", "lona", "clientes", "maleta", "graficos", "equipe", "contas", "admin", "perfil", "integracoes"].includes(aba) && (
          <div style={{ padding: "12px 20px 0" }}>
            <button className="oj-btn sec mini" onClick={() => irPara("painel")}>
              ‹ Voltar ao painel
            </button>
          </div>
        )}
        {trocando ? <Carregando texto={titulos[aba][0]} /> : telas[aba]}
      </div>

      {modal?.tipo === "romaneio" && (
        <Romaneio
          d={d}
          recarregar={recarregar}
          criarColecao={criarColecao}
          fechar={() => setModal(null)}
        />
      )}
      {modal?.tipo === "escolher-venda" && (
        <EscolherVenda
          d={d}
          aoEscolher={(peca) => setModal({ tipo: "baixa", peca })}
          fechar={() => setModal(null)}
        />
      )}
      {modal?.tipo === "baixa" && (
        <BaixaVenda
          peca={modal.peca}
          d={d}
          registrarVenda={registrarVendaPeca}
          fechar={() => setModal(null)}
        />
      )}
      {modal?.tipo === "historico" && (
        <HistoricoEntradas d={d} recarregar={recarregar} fechar={() => setModal(null)} />
      )}
    </div>
  );
}

/* ---------------- marca ---------------- */
function Marca({ size = 132, animar = true }) {
  const a = (c) => (animar ? c : "");
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-label="Luxi">
      <defs>
        <linearGradient id="rose" x1="0.1" y1="0.95" x2="0.9" y2="0.05">
          <stop offset="0%" stopColor="#A56B77" />
          <stop offset="45%" stopColor="#CE9AA0" />
          <stop offset="100%" stopColor="#E7B8AE" />
        </linearGradient>
      </defs>

      {/* anel fino com abertura no topo direito, como o logo */}
      <circle
        className={a("mk-circ")}
        cx="60"
        cy="60"
        r="42"
        fill="none"
        stroke="var(--rose-brand)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="225 40"
        transform="rotate(-58 60 60)"
      />

      {/* folha à direita, na abertura do anel */}
      <g className={a("mk-dia")} fill="var(--rose-brand)">
        <path d="M92 74 Q101 70 106 76 Q99 82 92 80 Q89 77 92 74 Z" opacity="0.92" />
        <path d="M95 82 Q104 80 108 87 Q100 91 94 88 Q92 85 95 82 Z" opacity="0.82" />
        <path d="M90 72 Q94 80 96 89" stroke="var(--rose-brand)" strokeWidth="1.2" fill="none" />
      </g>

      {/* brilhos de quatro pontas */}
      <path
        className={a("mk-brilho")}
        d="M84 40 Q85.4 46 91 47.5 Q85.4 49 84 55 Q82.6 49 77 47.5 Q82.6 46 84 40 Z"
        fill="url(#rose)"
      />
      <path
        d="M99 60 Q99.8 63.4 103 64.2 Q99.8 65 99 68.4 Q98.2 65 95 64.2 Q98.2 63.4 99 60 Z"
        fill="#D9A9AC"
      />
    </svg>
  );
}

function Abertura({ saindo }) {
  return (
    <div className={"oj-splash" + (saindo ? " saindo" : "")}>
      <Marca size={250} />
      <div className="oj-wm">
        <div className="n">Luxi</div>
        <div className="assinatura">✦ Gestão Leve ✦</div>
      </div>
    </div>
  );
}

function Carregando({ texto }) {
  return (
    <div className="oj-carga">
      <div className="oj-pulsa">
        <Marca size={54} animar={false} />
      </div>
      <div className="oj-meta">{texto}</div>
    </div>
  );
}

/* Campo de senha com botão de mostrar/ocultar discreto (SVG, não emoji).
   Usado no login e no cadastro para evitar erro de digitação. */
function CampoSenha({ label, valor, onChange, onEnter, placeholder, autoComplete, disabled }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="oj-campo">
      {label && <label>{label}</label>}
      <div className="oj-senha-wrap">
        <input
          className="oj-in"
          type={ver ? "text" : "password"}
          value={valor}
          placeholder={placeholder}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete={autoComplete || "current-password"}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter && onEnter()}
        />
        <button
          type="button"
          className="oj-senha-olho"
          aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
          onClick={() => setVer(!ver)}
        >
          {ver ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7c2 0 3.7.6 5.2 1.5M22 12s-3.5 7-10 7c-2 0-3.7-.6-5.2-1.5" />
              <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />
              <line x1="3" y1="3" x2="21" y2="21" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

/* ---------------- cartão de plano ---------------- */
function precoAnual(p) {
  const mensal = Number(p.valor) || 0;
  const total = mensal * 12 * 0.95;
  return { mensalEquiv: total / 12, total };
}
function dinheiroPlano(v) {
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function SeletorCobranca({ valor, onChange }) {
  return (
    <div style={{ display:"flex", gap:8, padding:"0 20px", margin:"0 0 14px" }} role="group" aria-label="Periodicidade da assinatura">
      <button type="button" className="oj-chip" data-on={valor === "mensal" ? "1" : "0"} onClick={() => onChange("mensal")} style={{ flex:1 }}>Mensal</button>
      <button type="button" className="oj-chip" data-on={valor === "anual" ? "1" : "0"} onClick={() => onChange("anual")} style={{ flex:1 }}>Anual · 5% off</button>
    </div>
  );
}
function CartaoPlano({ p, escolhido, aoEscolher, atual, botao, periodo = "mensal" }) {
  const [tudo, setTudo] = useState(false);
  const anual = periodo === "anual";
  const preco = anual ? precoAnual(p) : null;
  if (p.emBreve) return (
    <div className="oj-plano" style={{ opacity:.65, position:"relative" }}>
      <div style={{ position:"absolute", top:12, right:12, background:"var(--rose)", color:"#fff",
        fontSize:10, fontWeight:700, letterSpacing:".1em", padding:"3px 10px", borderRadius:100 }}>
        EM BREVE
      </div>
      <div className="oj-lbl">{p.nome}</div>
      <div className="oj-valor">{anual ? <>R$ {dinheiroPlano(preco.total)}<span style={{fontSize:13}}>/ano</span></> : <>R$ {p.preco}<span style={{fontSize:13}}>/mês</span></>}</div>
      <div className="oj-meta" style={{marginTop:6}}>{p.descricao}</div>
      <button className="oj-btn" disabled style={{marginTop:12,opacity:.5,cursor:"not-allowed"}}>
        Disponível em breve
      </button>
    </div>
  );
  const cap = (n) => (n === Infinity ? "sem limite" : n.toLocaleString("pt-BR"));
  return (
    <div
      className="oj-plano"
      data-on={escolhido ? "1" : "0"}
      role={aoEscolher ? "button" : undefined}
      tabIndex={aoEscolher ? 0 : undefined}
      onClick={aoEscolher}
      onKeyDown={(e) => aoEscolher && e.key === "Enter" && aoEscolher()}
      style={{ cursor: aoEscolher ? "pointer" : "default" }}
    >
      {p.selo && <span className="oj-selo">{p.selo}</span>}

      <div className="persona">{p.persona}</div>
      <div className="topo" style={{ marginTop: 4 }}>
        <span className="nome">{p.nome}</span>
        <span className="preco">
          {anual ? <>R$ {dinheiroPlano(preco.total)}<small> /ano</small></> : <>R$ {p.preco}<small> /mês</small></>}
        </span>
      </div>

      <div className="maturidade">{p.maturidade}</div>
      {anual && <div className="oj-meta" style={{ marginTop: 5 }}>Equivale a R$ {dinheiroPlano(preco.mensalEquiv)}/mês · 5% de desconto no ano</div>}

      <div className="capacidade">
        <div>
          <b>{cap(p.limite)}</b>
          <small>códigos</small>
        </div>
        <div>
          <b>{p.leituras === 0 ? "avulso" : p.leituras}</b>
          <small>romaneios por foto</small>
        </div>
        <div>
          <b>{p.consultoras === 25 ? "livre" : p.consultoras}</b>
          <small>{p.consultoras === 1 ? "usuária" : "consultoras"}</small>
        </div>
      </div>

      {p.herda && (
        <div className="herda">
          <span style={{ color: "var(--rose-esc)", fontWeight: 700 }}>✓</span>
          Tudo do {p.herda}, mais:
        </div>
      )}

      {!p.herda && <span className="novo">O que você tem</span>}

      <ul>
        {(tudo ? p.itens : p.itens.slice(0, 3)).map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      {p.itens.length > 3 && (
        <button
          type="button"
          className="oj-link-sutil"
          style={{ textAlign: "left", margin: "0 0 4px", padding: "6px 0" }}
          onClick={(e) => {
            e.stopPropagation();
            setTudo(!tudo);
          }}
        >
          {tudo ? "Mostrar menos ▴" : `Ver tudo o que inclui (+${p.itens.length - 3}) ▾`}
        </button>
      )}

      {p.extra && <div className="extra">{p.extra}</div>}

      {atual ? (
        <div className="oj-meta" style={{ marginTop: 12, fontWeight: 600 }}>
          Seu plano atual
        </div>
      ) : (
        botao || null
      )}
    </div>
  );
}

/* Tour guiado da demonstração: apresenta as áreas do app em passos,
   para a cliente entender o valor sem se perder. Só aparece na demo. */
function TourDemo({ onSair, irPara }) {
  const passos = [
    {
      aba: "estoque",
      titulo: "Bem-vinda à demonstração ✨",
      texto:
        "Esta é uma loja de exemplo, já preenchida, para você experimentar sem compromisso. Vamos dar uma volta rápida pelas áreas principais.",
    },
    {
      aba: "estoque",
      titulo: "O coração: seu estoque",
      texto:
        "Aqui ficam suas peças. Na Luxi de verdade, você fotografa o romaneio do fornecedor e o estoque se cadastra sozinho — sem digitar peça por peça.",
    },
    {
      aba: "painel",
      titulo: "Seu lucro, sem planilha",
      texto:
        "O painel mostra quanto entrou, quanto é lucro de verdade e como te pagaram. Tudo se atualiza a cada venda que você registra.",
    },
    {
      aba: "maleta",
      titulo: "A maleta das consultoras",
      texto:
        "Se você tem quem venda por você, a maleta mostra o que está com cada uma, por quanto tempo, e quanto é seu lucro quando vender.",
    },
    {
      aba: "conselho",
      titulo: "Uma sócia que lê seus números",
      texto:
        "O Conselheiro olha seus dados e te diz o que fazer: qual peça está parada, quem te deve, onde está seu dinheiro. Não é relatório — é conselho.",
    },
    {
      aba: "painel",
      titulo: "Pronta para começar de verdade?",
      texto:
        "Esta foi a demonstração. Quando quiser, crie a sua loja e comece a organizar o seu negócio — com seus dados, seu jeito.",
      fim: true,
    },
  ];
  const [i, setI] = useState(0);
  const [fechado, setFechado] = useState(false);
  const p = passos[i];

  useEffect(() => {
    if (p.aba && irPara) irPara(p.aba);
  }, [i]);

  const sair = () => {
    // Fecha visualmente na hora; a persistência continua sendo feita pelo pai.
    setFechado(true);
    if (onSair) onSair();
  };

  if (fechado) return null;

  return (
    <div className="oj-tour-fundo">
      <div className="oj-tour-card">
        <div className="oj-tour-passo">
          {i + 1} de {passos.length}
        </div>
        <h3 className="oj-serif">{p.titulo}</h3>
        <p>{p.texto}</p>
        <div className="oj-tour-pontos">
          {passos.map((_, k) => (
            <span key={k} data-on={k === i ? "1" : "0"} />
          ))}
        </div>
        <div className="oj-tour-acoes">
          <button className="oj-link-sutil" onClick={sair}>
            {p.fim ? "Fechar" : "Pular tour"}
          </button>
          <button
            className="oj-btn mini"
            onClick={() => (p.fim ? sair() : setI(i + 1))}
          >
            {p.fim ? "Explorar sozinha" : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- login ---------------- */
/* Acesso do dono da Luxi. A senha real vem de variável de ambiente em produção;
   o fallback só existe para o ambiente de desenvolvimento. O acesso não é mais
   exposto por botão — abre por combinação de toques no rodapé (ver Login). */
const ADMIN_EMAILS = [
  "cleberamjr@gmail.com",
  "clebeamonjr@gmail.com",
  "clebernjr@outlook.com",
];

function Login({ onMestre, voltar, onEntrar, verPlanos, irCadastro, onDemo, loja, logo }) {
  const [u, setU] = useState("");
  const [se, setSe] = useState("");
  const [erro, setErro] = useState("");
  const [mestreVisivel, setMestreVisivel] = useState(false);
  const [entrando, setEntrando] = useState(false);

  // Rate limiting no cliente: bloqueia após 5 tentativas por 60s.
  // Não substitui o rate limiting no Cloudflare — é uma camada extra de UX.
  const [tentativas, setTentativas] = useState(0);
  const [bloqueadoAte, setBloqueadoAte] = useState(null);

  const entrar = async () => {
    setErro("");

    // verificar bloqueio temporário
    if (bloqueadoAte && Date.now() < bloqueadoAte) {
      const seg = Math.ceil((bloqueadoAte - Date.now()) / 1000);
      setErro(`Muitas tentativas. Aguarde ${seg} segundos e tente de novo.`);
      return;
    }

    if (!u.trim() || !se.trim()) {
      setErro("Preencha e-mail e senha.");
      return;
    }
    setEntrando(true);
    try {
      await dados.auth.entrar(u.trim(), se);
      setTentativas(0); // limpa contador em sucesso
      if (onEntrar) await onEntrar();
    } catch {
      // Mensagem genérica — não revela se o e-mail existe ou não
      const novasTentativas = tentativas + 1;
      setTentativas(novasTentativas);
      if (novasTentativas >= 5) {
        setBloqueadoAte(Date.now() + 60_000); // 60s de bloqueio
        setTentativas(0);
        setErro("Muitas tentativas. Aguarde 60 segundos e tente de novo.");
      } else {
        setErro(`E-mail ou senha incorretos. (${novasTentativas}/5)`);
      }
    } finally {
      setEntrando(false);
    }
  };

  return (
    <>
      <div
        className="oj-login-bg"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}fundo-login.jpg)`,
        }}
      />
      <div className="oj-login-wrap">
        <div className="oj-versao" style={{position:"fixed",right:10,bottom:6}}>v{VERSAO_DISPLAY}</div>
        <div className="oj-login-hero">
          <h1 className="oj-hero-titulo">
            Sua marca.<br />
            Sua história.<br />
            <span>Nossa gestão leve.</span>
          </h1>
          <p className="oj-hero-apoio">
            Organize, encante e venda mais<br />com leveza e estratégia. ✦
          </p>
          <div className="oj-hero-icones">
            <div><span>◈</span><b>Organização</b><small>que simplifica</small></div>
            <div><span>♡</span><b>Clientes</b><small>que voltam</small></div>
            <div><span>▲</span><b>Resultados</b><small>que crescem</small></div>
            <div><span>✦</span><b>Negócios</b><small>que brilham</small></div>
          </div>
        </div>

        <div className="oj-login-card">
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            {logo ? (
              <>
                <Avatar nome={loja} foto={logo} tamanho={84} />
                <div className="oj-login-nome" style={{ fontSize: 40, marginTop: 10 }}>
                  {loja}
                </div>
              </>
            ) : (
              <>
                <Marca size={88} animar={false} />
                <div className="oj-login-nome">Luxi</div>
                <div className="oj-login-tag">Gestão Leve</div>
              </>
            )}
            <div className="oj-login-sub">
              {loja ? (
                `Que bom te ver de novo`
              ) : (
                <>
                  A leveza na gestão
                  <br />
                  que faz o seu negócio brilhar.
                </>
              )}
            </div>
          </div>

          {erro && (
            <div
              className="oj-erro"
              role="alert"
              aria-live="polite"
              style={{ margin: "0 0 14px" }}
            >
              {erro}
            </div>
          )}

          <div className="oj-campo">
            <label htmlFor="login-email">E-mail ou usuário</label>
            <input
              id="login-email"
              className="oj-in"
              value={u}
              autoCapitalize="none"
              autoComplete="username email"
              inputMode="email"
              aria-label="E-mail ou usuário"
              disabled={entrando}
              onChange={(e) => setU(e.target.value)}
            />
          </div>
          <CampoSenha
            label="Senha"
            valor={se}
            onChange={setSe}
            onEnter={entrar}
            autoComplete="current-password"
            disabled={entrando}
          />

          <button className="oj-btn" onClick={entrar} disabled={entrando}>
            {entrando ? "Entrando…" : "Entrar"}
          </button>

          {irCadastro && (
            <button
              className="oj-link-sutil"
              onClick={irCadastro}
              style={{ fontWeight: 600 }}
            >
              Ainda não tenho conta · criar a minha loja
            </button>
          )}

          {onDemo && (
            <button className="oj-link-sutil" onClick={onDemo}>
              Só quero conhecer · ver uma demonstração
            </button>
          )}

          {voltar && !irCadastro && (
            <button className="oj-link-sutil" onClick={voltar}>
              Voltar
            </button>
          )}

          {/* Atalho discreto: cinco toques apenas preenchem o e-mail administrativo.
              A autenticação continua sendo feita pelo Supabase Auth. */}
          <div
            style={{ marginTop: 18, textAlign: "center" }}
            onClick={() => {
              const n = (window.__mk || 0) + 1;
              window.__mk = n;
              if (n >= 5) {
                window.__mk = 0;
                setU(ADMIN_EMAILS[0]);
                setErro("E-mail administrativo preenchido. Entre com sua senha normal.");
              }
            }}
          >
            <span style={{ color: "var(--linha)", fontSize: 18, cursor: "default" }}>·</span>
          </div>
        </div>
      </div>
    </>
  );
}

/* Tela de quem chegou por um convite de consultora (link do WhatsApp
   enviado pela Equipe). Propositalmente mais enxuta que o Cadastro
   normal — não pergunta plano nem dados da loja, porque ela está
   entrando numa loja que já existe, não criando uma. Depois de logada
   (conta nova ou já existente), `aceitar()` vincula a esta loja. */
function AceitarConvite({ criarConta, entrarConta, aceitar, cancelar, erroInicial, betaEmail = "", beta = false }) {
  const [modo, setModo] = useState("criar"); // criar | entrar
  const [email, setEmail] = useState(betaEmail);
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState(erroInicial || "");

  const concluir = async () => {
    setErro("");
    setProcessando(true);
    try {
      await aceitar();
    } catch (e) {
      setErro(
        e.message || "Não consegui vincular ao convite. Confira o link com quem te convidou."
      );
    } finally {
      setProcessando(false);
    }
  };

  const enviarCriar = async () => {
    setErro("");
    if (!email.trim() || senha.length < 6) {
      setErro("Preencha e-mail e uma senha de ao menos 6 caracteres.");
      return;
    }
    if (senha !== senha2) {
      setErro("As senhas não são iguais.");
      return;
    }
    setProcessando(true);
    try {
      const entrou = await criarConta(email.trim(), senha);
      setProcessando(false);
      if (entrou) {
        await concluir();
      } else {
        setErro("Não consegui entrar com a conta nova. Tente de novo em instantes.");
      }
    } catch (e) {
      setProcessando(false);
      const msg = e.message || "Não consegui criar sua conta. Tente de novo.";
      setErro(msg);
      if (msg.includes("já tem uma conta")) {
        setModo("entrar"); // já existe conta com esse e-mail: leva direto para o login
        setSenha("");
        setSenha2("");
      }
    }
  };

  const enviarEntrar = async () => {
    setErro("");
    if (!email.trim() || !senha) {
      setErro("Preencha e-mail e senha.");
      return;
    }
    setProcessando(true);
    try {
      await entrarConta(email.trim(), senha);
      setProcessando(false);
      await concluir();
    } catch (e) {
      setProcessando(false);
      setErro(e.message || "E-mail ou senha não conferem.");
    }
  };

  // Link de convite beta inválido, vencido ou já usado: NÃO mostra formulário de cadastro.
  // Quem não foi indicada só pode ver a demonstração (beta fechado).
  if (beta && !betaEmail)
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" }} className="oja">
        <Marca size={62} animar={false} />
        <h1 className="oj-h1 oj-serif" style={{ fontSize: 30, marginTop: 18 }}>
          Este convite não está mais válido
        </h1>
        <p className="oj-sub" style={{ margin: "12px 0 26px", lineHeight: 1.6 }}>
          O link pode ter expirado ou já ter sido usado. Peça um novo link para quem
          te indicou — enquanto isso, você pode conhecer o Luxi pela demonstração.
        </p>
        <button className="oj-btn" onClick={cancelar}>
          Ver a demonstração
        </button>
        <button
          className="oj-btn sec"
          style={{ marginTop: 8 }}
          onClick={() => window.open(linkSuporte("Oi! Meu link de convite do Luxi não funcionou. Pode me mandar um novo?"), "_blank", "noopener")}
        >
          Pedir um novo link no WhatsApp
        </button>
      </div>
    );

  return (
    <div style={{ padding: "60px 24px" }} className="oja">
      <Marca size={62} animar={false} />
      <div className="oj-marca" style={{ marginTop: 16 }}>
        <b>Luxi</b>
      </div>
      <h1 className="oj-h1 oj-serif" style={{ fontSize: 36, marginTop: 14 }}>
        {beta ? "Seu acesso ao beta está liberado" : "Você foi convidada"}
      </h1>
      <p className="oj-sub" style={{ marginBottom: 24, lineHeight: 1.6 }}>
        {beta
          ? modo === "criar"
            ? "Você foi escolhida para testar o Luxi antes de todo mundo. Crie sua senha para entrar — leva menos de um minuto."
            : "Entre com a sua senha para ativar o seu acesso ao beta."
          : modo === "criar"
          ? "Crie sua conta para acessar sua maleta e suas vendas nesta loja."
          : "Entre com sua conta para acessar sua maleta e suas vendas nesta loja."}
      </p>

      {erro && <div className="oj-erro" style={{ margin: "0 0 14px" }}>{erro}</div>}

      <div className="oj-campo">
        <label>{betaEmail ? "E-mail convidado" : "E-mail"}</label>
        <input
          className="oj-in"
          value={email}
          autoCapitalize="none"
          inputMode="email"
          onChange={(e) => setEmail(e.target.value)}
          readOnly={!!betaEmail}
        />
        {betaEmail && (
          <div className="oj-meta" style={{ marginTop: 6 }}>
            Este convite só pode ser usado com este e-mail.
          </div>
        )}
      </div>

      <CampoSenha
        label={modo === "criar" ? "Senha — mínimo 6 caracteres" : "Senha"}
        valor={senha}
        onChange={setSenha}
        onEnter={modo === "criar" ? enviarCriar : enviarEntrar}
      />

      {modo === "criar" && (
        <>
          <CampoSenha
            label="Repita a senha"
            valor={senha2}
            onChange={setSenha2}
            onEnter={enviarCriar}
          />
          {senha2 && senha !== senha2 && (
            <div className="oj-meta" style={{ color: "var(--alerta)", marginTop: -6, marginBottom: 8 }}>
              As senhas não são iguais.
            </div>
          )}
        </>
      )}

      <button
        className="oj-btn"
        disabled={processando}
        onClick={modo === "criar" ? enviarCriar : enviarEntrar}
      >
        {processando ? "Um instante…" : modo === "criar" ? "Criar conta e entrar" : "Entrar"}
      </button>

      <button
        className="oj-link-sutil"
        style={{ fontWeight: 600 }}
        onClick={() => {
          setErro("");
          setModo(modo === "criar" ? "entrar" : "criar");
        }}
      >
        {modo === "criar" ? "Já tenho conta · entrar" : "Ainda não tenho conta · criar a minha"}
      </button>

      {cancelar && (
        <button className="oj-link-sutil" onClick={cancelar}>
          Não é você? Voltar ao login normal
        </button>
      )}
    </div>
  );
}

/* Página de vendas isolada, chamada a partir do login */
function Vitrine({ voltar }) {
  const [plano, setPlano] = useState("crescimento");
  const [periodoPlano, setPeriodoPlano] = useState("mensal");
  const p = PLANOS.find((x) => x.id === plano);
  return (
    <div style={{ padding: "40px 24px" }} className="oja">
      <Marca size={70} animar={false} />
      <h1 className="oj-h1 oj-serif" style={{ fontSize: 38, marginTop: 14 }}>
        Organize
        <br />
        e venda ainda mais.
      </h1>
      <p className="oj-sub" style={{ marginTop: 12, fontSize: 15, lineHeight: 1.6 }}>
        Fotografe o romaneio e o estoque se cadastra sozinho. Veja seu lucro real, saiba
        o que está com cada consultora e envie o catálogo pelo WhatsApp.
      </p>

      <div className="oj-sec" style={{ margin: "28px 0 12px" }}>
        Escolha seu plano
      </div>
      <SeletorCobranca valor={periodoPlano} onChange={setPeriodoPlano} />

      {PLANO_PUBLICOS().map((x) => (
        <CartaoPlano
          key={x.id}
          p={x}
          escolhido={plano === x.id}
          aoEscolher={() => setPlano(x.id)}
          periodo={periodoPlano}
        />
      ))}

      <button className="oj-btn" style={{ marginTop: 12 }} onClick={voltar}>
        Assinar o {p.nome} · {periodoPlano === "anual" ? `R$ ${dinheiroPlano(precoAnual(p).total)}/ano` : `R$ ${p.preco}/mês`}
      </button>
      <button className="oj-btn sec" style={{ marginTop: 8 }} onClick={voltar}>
        Voltar para o login
      </button>
    </div>
  );
}

/* ---------------- painel do administrador ---------------- */
/* ---------------- suporte: a administradora vê a loja de uma cliente (somente leitura) ---------------- */
/* Desenha direto no corpo da página. O contêiner animado das telas (.oja) mantém uma "transformação" ativa e o navegador
   passa a tratar tudo que é position:fixed lá dentro como preso a esse contêiner (e não à janela): janelas e botões
   flutuantes ficavam centrados na página inteira, muito acima do que se vê. O editor de produto já faz o mesmo. */
function NoCorpo({ children }) {
  const tema = document.querySelector(".oj[data-theme]")?.getAttribute("data-theme") || "claro";
  return createPortal(<div className="oj oj-portal-leve" data-theme={tema}>{children}</div>, document.body);
}

/* ---------------- excluir uma conta e os dados dela (somente administradora, IRREVERSÍVEL) ---------------- */
function ExcluirConta({ alvo, aoFechar, aoConcluir }) {
  const [previa, setPrevia] = useState(null);
  const [erro, setErro] = useState("");
  const [email, setEmail] = useState("");
  const [motivo, setMotivo] = useState("");
  const [ciente, setCiente] = useState(false);
  const [forcar, setForcar] = useState(false);
  const [fase, setFase] = useState("conferir"); // conferir | apagando | pronto
  const [resultado, setResultado] = useState(null);
  const [baixando, setBaixando] = useState(false);
  const [copia, setCopia] = useState(false);

  useEffect(() => {
    let vivo = true;
    dados.preverExclusao(alvo.id)
      .then((x) => { if (vivo) setPrevia(x); })
      .catch((e) => { if (vivo) setErro(e.message); });
    return () => { vivo = false; };
  }, [alvo.id]);

  const c = previa?.contagens || {};
  const loja = previa?.lojas?.[0];
  const ativa = previa?.assinatura_status === "ativa";
  const bloqueada = !!(previa?.e_admin || previa?.sou_eu);
  const digitou = email.trim().length > 0;
  const emailCerto = !!previa && email.trim().toLowerCase() === String(previa.email || "").toLowerCase();
  const pode = fase === "conferir" && !!previa && !bloqueada && emailCerto && ciente && (!ativa || forcar);

  const baixarCopia = async () => {
    setBaixando(true); setErro("");
    try {
      const arquivo = await dados.exportarLoja(loja.id);
      const blob = new Blob([JSON.stringify(arquivo, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `luxi-copia-${String(loja.nome || "loja").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setCopia(true);
    } catch (e) { setErro(e.message); }
    finally { setBaixando(false); }
  };

  const excluir = async () => {
    setErro(""); setFase("apagando");
    try {
      const r = await dados.excluirUsuario({ userId: alvo.id, confirmarEmail: email, motivo, forcar });
      setResultado(r); setFase("pronto");
    } catch (e) { setErro(e.message); setFase("conferir"); }
  };

  const blocos = [["Peças", c.pecas], ["Vendas", c.vendas], ["Clientes", c.clientes], ["Despesas", c.despesas], ["Romaneios", c.romaneios], ["Arquivos", c.arquivos]].filter(([, n]) => n > 0);
  const outros = [[c.baixas, "baixa(s)"], [c.colecoes, "coleção(ões)"], [c.maletas, "maleta(s)"]].filter(([n]) => n > 0).map(([n, t]) => `${n} ${t}`);
  const passoConfirmar = loja ? 2 : 1;
  const apagado = Object.entries(resultado?.apagado || {}).filter(([k, v]) => v > 0 && k !== "registros_financeiros");

  return (
    <NoCorpo>
      <div className="oj-fundo" onClick={fase === "apagando" ? undefined : aoFechar}>
        <div className="oj-modal oj-excl" role="dialog" aria-modal="true" aria-label="Excluir conta" onClick={(e) => e.stopPropagation()}>
          <div className="oj-excl-topo">
            <span className="oj-excl-icone" aria-hidden="true">{fase === "pronto" ? "✓" : "!"}</span>
            <div className="oj-quebra" style={{ flex: 1 }}>
              <h3>{fase === "pronto" ? "Exclusão concluída" : loja ? "Excluir cliente e todos os dados" : "Excluir conta"}</h3>
              <div className="oj-meta oj-quebra" style={{ marginTop: 2 }}>{fase === "pronto" ? resultado?.email : alvo.email}</div>
            </div>
            {fase !== "pronto" && (
              <button className="oj-excl-x" aria-label="Fechar" onClick={aoFechar} disabled={fase === "apagando"}>×</button>
            )}
          </div>

          <div className="oj-excl-corpo">
            {fase === "pronto" ? (
              <>
                <div className="oj-nota">
                  Apagado: {apagado.map(([k, v]) => `${v} ${k.replace("_", " ")}`).join(" · ") || "a conta"}.
                  {resultado?.arquivos_removidos ? ` ${resultado.arquivos_removidos} arquivo(s) removido(s).` : ""}
                </div>
                {(resultado?.pendencias || []).length > 0 && (
                  <div className="oj-nota perigo">
                    Os dados da loja já foram apagados, mas falta remover: {resultado.pendencias.map((p) => (p === "arquivos" ? "alguns arquivos" : "a conta de acesso")).join(" e ")}.
                    A pessoa aparece em “Contas sem loja”: exclua de novo para terminar.
                  </div>
                )}
                {(resultado?.apagado?.registros_financeiros || 0) > 0 && (
                  <div className="oj-nota">{resultado.apagado.registros_financeiros} registro(s) financeiro(s) foram mantidos (obrigação fiscal).</div>
                )}
              </>
            ) : (
              <>
                {erro && <div className="oj-nota perigo" role="alert">{erro}</div>}
                {!previa && !erro && <div className="oj-meta">Conferindo o que seria apagado…</div>}
                {bloqueada && <div className="oj-nota perigo">Contas de administração não podem ser excluídas por aqui.</div>}

                {previa && !bloqueada && (
                  <>
                    <section className="oj-excl-bloco">
                      <div className="oj-excl-tit">Será apagado de forma permanente</div>
                      {loja && <div className="oj-meta oj-quebra" style={{ marginBottom: 8 }}>Loja “{loja.nome || "sem nome"}”</div>}
                      {blocos.length > 0 ? (
                        <div className="oj-stats">
                          {blocos.map(([t, n]) => (
                            <div className="oj-stat" key={t}><b>{n}</b><span>{t}</span></div>
                          ))}
                        </div>
                      ) : loja ? (
                        <div className="oj-meta">A loja ainda está vazia.</div>
                      ) : null}
                      {outros.length > 0 && <div className="oj-meta" style={{ marginTop: 8 }}>Também: {outros.join(", ")}.</div>}
                      <ul className="oj-excl-lista">
                        {c.consultoras > 0 && (
                          <li>
                            {c.consultoras} consultora(s) da loja
                            {c.consultoras_com_conta ? ` — ${c.consultoras_com_conta} com conta própria: a conta continua, mas perde o acesso a esta loja` : ""}
                          </li>
                        )}
                        <li>A conta de acesso (login) e o acesso beta</li>
                      </ul>
                    </section>

                    {(previa.e_consultora_de || []).length > 0 && (
                      <div className="oj-nota">
                        Esta pessoa também é consultora de: {previa.e_consultora_de.join(", ")}. O histórico de vendas dessas lojas continua.
                      </div>
                    )}
                    {(c.registros_financeiros || 0) > 0 && (
                      <div className="oj-nota">{c.registros_financeiros} registro(s) financeiro(s) serão mantidos (obrigação fiscal).</div>
                    )}

                    {loja && (
                      <section className="oj-excl-bloco">
                        <div className="oj-excl-tit"><span className="oj-passo">1</span> Guarde uma cópia <small>recomendado</small></div>
                        <button className="oj-bt" style={{ width: "100%" }} onClick={baixarCopia} disabled={baixando || fase !== "conferir"}>
                          {baixando ? "Gerando cópia…" : copia ? "✓ Cópia baixada — baixar de novo" : "Baixar cópia dos dados antes (recomendado)"}
                        </button>
                        <div className="oj-meta" style={{ marginTop: 8, lineHeight: 1.5 }}>
                          Depois de excluir, não há como recuperar. A cópia contém dados pessoais: guarde com cuidado.
                        </div>
                      </section>
                    )}

                    <section className="oj-excl-bloco">
                      <div className="oj-excl-tit"><span className="oj-passo">{passoConfirmar}</span> Confirme</div>
                      {ativa && (
                        <label className="oj-check">
                          <input type="checkbox" checked={forcar} onChange={(e) => setForcar(e.target.checked)} />
                          <span><b>Esta cliente tem assinatura ATIVA.</b> Confirmo que a cobrança já foi cancelada ou tratada.</span>
                        </label>
                      )}
                      <div className="oj-campo">
                        <label>Para confirmar, digite o e-mail desta conta</label>
                        <div className="oj-email-alvo oj-quebra">{previa.email}</div>
                        <input
                          className="oj-in" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
                          placeholder={previa.email} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                          disabled={fase !== "conferir"}
                        />
                        {digitou && (
                          <div className={"oj-confere " + (emailCerto ? "sim" : "nao")} role="status">
                            {emailCerto ? "✓ O e-mail confere" : "Ainda não confere"}
                          </div>
                        )}
                      </div>
                      <div className="oj-campo">
                        <label>Motivo (opcional — fica só no seu registro interno)</label>
                        <input className="oj-in" value={motivo} maxLength={500} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: pedido da cliente por e-mail" disabled={fase !== "conferir"} />
                      </div>
                      <label className="oj-check">
                        <input type="checkbox" checked={ciente} onChange={(e) => setCiente(e.target.checked)} disabled={fase !== "conferir"} />
                        <span>Entendo que isto é <b>permanente</b> e não pode ser desfeito.</span>
                      </label>
                    </section>
                  </>
                )}
              </>
            )}
          </div>

          <div className="oj-excl-rodape">
            {fase === "pronto" ? (
              <button className="oj-bt forte" onClick={() => aoConcluir(resultado)}>Concluir</button>
            ) : (
              <>
                <button className="oj-bt" onClick={aoFechar} disabled={fase === "apagando"}>Cancelar</button>
                <button className="oj-bt perigo-cheio" onClick={excluir} disabled={!pode}>
                  {fase === "apagando" ? "Apagando… não feche" : "Excluir definitivamente"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </NoCorpo>
  );
}

function LojaSuporte({ loja, voltar, pedirSenha, aoExcluida }) {
  const [dado, setDado] = useState(null);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState("atividade");
  const [excluindo, setExcluindo] = useState(false);
  // Esc sai do modo observação (a menos que haja uma janela aberta — aí o Esc fecha a janela)
  useEffect(() => {
    const tecla = (e) => { if (e.key === "Escape" && !document.querySelector(".oj-fundo")) voltar(); };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [voltar]);
  useEffect(() => {
    let vivo = true;
    dados.verLojaSuporte(loja.id)
      .then((x) => { if (vivo) setDado(x); })
      .catch((e) => { if (vivo) setErro(e.message || "Não consegui abrir essa loja."); });
    return () => { vivo = false; };
  }, [loja.id]);

  const cent = (v) => brl((Number(v) || 0) / 100);
  const data = (iso) => (iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
  const dia = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");
  const ha = (iso) => {
    if (!iso) return "nunca";
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
    return d <= 0 ? "hoje" : d === 1 ? "ontem" : `há ${d} dias`;
  };

  const topo = (
    <>
      <button className="oj-link-sutil" style={{ textAlign: "left", padding: "8px 0" }} onClick={voltar}>‹ Voltar às lojas</button>
      {/* saída discreta: pequena, quase transparente, sempre no canto da tela (Esc também sai) */}
      <NoCorpo>
        <button type="button" className="oj-sair-espiao" onClick={voltar} aria-label="Sair do modo observação" title="Sair (Esc)">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </button>
      </NoCorpo>
      <div className="oj-aviso" role="note">
        <b>Modo observação · somente leitura.</b> A cliente não vê nem é avisada de que você abriu a loja dela.
        O acesso fica só no seu registro interno.
      </div>
    </>
  );
  if (erro) return (<>{topo}<div className="oj-erro">{erro}</div></>);
  if (!dado) return (<>{topo}<div className="oj-card"><div className="oj-meta">Abrindo a loja de {loja.nome || "cliente"}…</div></div></>);

  const l = dado.loja || {}, dona = dado.dona || {}, a = dado.assinatura || {}, r = dado.resumo || {};
  const ate = a.trial_ate ? new Date(a.trial_ate) : null;
  const restam = ate ? Math.ceil((ate.getTime() - Date.now()) / 864e5) : null;
  const situacao =
    a.status === "ativa" ? ["assinatura paga", "oj-estado ativo"]
    : a.status === "trial" && restam > 0 ? [`teste/beta · restam ${restam} dia(s)`, "oj-estado beta"]
    : a.status ? ["teste encerrado", "oj-estado vencido"] : ["sem assinatura", "oj-estado neutro"];
  const zap = String(l.whatsapp || "").replace(/\D/g, "");
  const dias = dado.dias || [];
  const maxDia = Math.max(1, ...dias.map((x) => x.n || 0));
  const frase = (e) => {
    const nome = e.nome || e.codigo || "peça";
    if (e.tipo === "venda") return `Vendeu ${nome} (${e.qtd || 1} un) por ${cent(e.valor)}${e.extra ? " para " + e.extra : ""}`;
    if (e.tipo === "peca") return `Cadastrou a peça ${e.codigo || ""} — ${e.nome || ""} (${e.qtd ?? 0} un)${e.extra ? " · fornecedor " + e.extra : ""}`;
    if (e.tipo === "romaneio") return `Importou um romaneio${e.extra ? " de " + e.extra : ""} · ${e.qtd || 0} itens · ${cent(e.valor)}`;
    if (e.tipo === "baixa") return `Deu baixa em ${nome} (${e.qtd || 1} un)${e.extra ? " — " + e.extra : ""}`;
    if (e.tipo === "despesa") return `Lançou a despesa ${e.nome || ""} — ${cent(e.valor)}`;
    if (e.tipo === "cliente") return `Cadastrou a cliente ${e.nome || ""}`;
    return e.tipo;
  };
  const abas = [["atividade", "Atividade"], ["pecas", "Peças"], ["vendas", "Vendas"], ["clientes", "Clientes"], ["contas", "Contas"], ["equipe", "Equipe"], ["romaneios", "Romaneios"]];
  const vazio = (t) => <div className="oj-meta" style={{ padding: "8px 0" }}>{t}</div>;

  return (
    <>
      {topo}
      <div className="oj-card">
        <div className="oj-lbl">Loja</div>
        <div className="oj-nome" style={{ fontSize: 20 }}>{l.nome || "Loja sem nome"}</div>
        <div className="oj-meta" style={{ wordBreak: "break-all" }}>{dona.email || "—"}</div>
        <div style={{ margin: "8px 0" }}><span className={situacao[1]}>{situacao[0]}</span></div>
        <div className="oj-meta" style={{ lineHeight: 1.6 }}>
          Conta criada em {dia(dona.conta_criada)} · último login {ha(dona.ultimo_login)}
        </div>
        <div className="oj-acoes">
          {zap && (
            <button className="oj-bt forte" onClick={() => window.open(`https://wa.me/${zap}`, "_blank", "noopener")}>
              Chamar no WhatsApp
            </button>
          )}
          {dona.email && (
            <button className="oj-bt" onClick={() => pedirSenha(dona.email)}>Redefinir a senha dela</button>
          )}
        </div>
      </div>

      <div className="oj-grid2 oj-grid-adm">
        <div className="oj-card flat"><div className="oj-lbl">Peças</div><div className="oj-valor">{r.pecas || 0}</div><div className="oj-meta">{r.unidades || 0} unidades</div></div>
        <div className="oj-card flat"><div className="oj-lbl">Vendas em 30 dias</div><div className="oj-valor">{r.vendas_30d || 0}</div><div className="oj-meta">{cent(r.valor_30d)}</div></div>
        <div className="oj-card flat"><div className="oj-lbl">A receber</div><div className="oj-valor">{cent(r.a_receber)}</div><div className="oj-meta">vendas ainda não pagas</div></div>
        <div className="oj-card flat"><div className="oj-lbl">Última atividade</div><div className="oj-valor" style={{ fontSize: 20 }}>{r.ultima_atividade ? ha(r.ultima_atividade) : "nunca"}</div><div className="oj-meta">{r.clientes || 0} clientes · {r.romaneios || 0} romaneios</div></div>
      </div>

      <div className="oj-card">
        <div className="oj-lbl">Atividade nos últimos 30 dias</div>
        <svg viewBox="0 0 300 52" width="100%" height="52" role="img"
             aria-label={`Ações por dia nos últimos 30 dias; ${dias.filter((x) => x.n > 0).length} dias com atividade`}>
          {dias.map((x, i) => {
            const h = x.n ? Math.max(4, (x.n / maxDia) * 44) : 2;
            return <rect key={x.dia || i} x={i * 10 + 1} y={50 - h} width="7" height={h} rx="2" fill={x.n ? "var(--rose)" : "var(--linha)"} />;
          })}
        </svg>
        <div className="oj-meta" style={{ display: "flex", justifyContent: "space-between" }}><span>30 dias atrás</span><span>hoje</span></div>
      </div>

      <div className="oj-chips" role="tablist" aria-label="Seções da loja" style={{ margin: "8px 20px" }}>
        {abas.map(([k, t]) => (
          <button key={k} className="oj-chip" role="tab" aria-selected={aba === k} data-on={aba === k ? "1" : "0"} onClick={() => setAba(k)}>{t}</button>
        ))}
      </div>

      <div className="oj-card">
        {aba === "atividade" && ((dado.atividade || []).length === 0 ? vazio("Ainda não fez nada no app.") :
          dado.atividade.map((e, i) => (
            <div className="oj-item" key={i} style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="oj-nome" style={{ fontWeight: 500 }}>{frase(e)}</div>
                <div className="oj-meta">{data(e.quando)}</div>
              </div>
            </div>
          )))}

        {aba === "pecas" && ((dado.pecas || []).length === 0 ? vazio("Nenhuma peça cadastrada.") :
          <>
            {dado.pecas.map((p) => (
              <div className="oj-item" key={p.id} style={{ alignItems: "flex-start" }}>
                {typeof p.capa === "string" && p.capa.startsWith("https://")
                  ? <img src={p.capa} alt="" width="44" height="44" style={{ borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                  : <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 10, background: "var(--bege-2)", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="oj-nome">{p.codigo} · {p.nome}</div>
                  <div className="oj-meta">
                    {p.qtd} un · custo {cent(p.custo_centavos)} · venda {cent(p.venda_centavos)}
                    {p.banho ? ` · ${p.banho}` : ""}{p.fornecedor && p.fornecedor !== "Cadastro manual" ? ` · ${p.fornecedor}` : ""}
                    {p.tem_foto ? " · com foto" : ""}
                  </div>
                </div>
                {p.arquivada && <span className="oj-tag parada">arquivada</span>}
              </div>
            ))}
            {(r.pecas || 0) > dado.pecas.length && vazio(`Mostrando as ${dado.pecas.length} mais recentes.`)}
          </>)}

        {aba === "vendas" && ((dado.vendas || []).length === 0 ? vazio("Nenhuma venda registrada.") :
          dado.vendas.map((v) => (
            <div className="oj-item" key={v.id} style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="oj-nome">{v.nome || v.codigo} · {v.qtd} un · {cent(v.valor_centavos)}</div>
                <div className="oj-meta">{data(v.vendida_em)} · {v.modalidade}{v.cliente ? ` · ${v.cliente}` : ""}</div>
              </div>
              <span className={v.pago === false ? "oj-tag parada" : "oj-tag ok"}>{v.pago === false ? "a receber" : "pago"}</span>
            </div>
          )))}

        {aba === "clientes" && ((dado.clientes || []).length === 0 ? vazio("Nenhuma cliente cadastrada.") :
          dado.clientes.map((c) => (
            <div className="oj-item" key={c.id} style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="oj-nome">{c.nome}</div>
                <div className="oj-meta">{[c.telefone, c.cpf, c.endereco].filter(Boolean).join(" · ") || "sem contato"}</div>
              </div>
            </div>
          )))}

        {aba === "contas" && ((dado.despesas || []).length === 0 ? vazio("Nenhuma despesa lançada.") :
          dado.despesas.map((x) => (
            <div className="oj-item" key={x.id}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="oj-nome">{x.nome}</div>
                <div className="oj-meta">{x.tipo} · {dia(x.competencia)}</div>
              </div>
              <b>{cent(x.valor_centavos)}</b>
            </div>
          )))}

        {aba === "equipe" && ((dado.consultoras || []).length === 0 ? vazio("Sem equipe cadastrada.") :
          dado.consultoras.map((c) => (
            <div className="oj-item" key={c.id}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="oj-nome">{c.nome}{c.eh_dona ? " (dona)" : ""}</div>
                <div className="oj-meta">{c.eh_dona ? "administra a loja" : `comissão ${c.comissao}% · ${c.usuario_id ? "já entrou no app" : "convite pendente"}`}</div>
              </div>
              {c.ativa === false && <span className="oj-tag parada">inativa</span>}
            </div>
          )))}

        {aba === "romaneios" && ((dado.entradas || []).length === 0 ? vazio("Nenhum romaneio importado.") :
          dado.entradas.map((x) => (
            <div className="oj-item" key={x.id}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="oj-nome">{x.fornecedor || "Sem fornecedor"}</div>
                <div className="oj-meta">{data(x.criada_em)} · {x.qtd_itens || 0} itens</div>
              </div>
              <b>{cent(x.total_centavos)}</b>
            </div>
          )))}
      </div>

      <div className="oj-zona-risco">
        <div className="oj-excl-tit" style={{ color: "var(--perigo-tx)", marginBottom: 6 }}>Zona de risco</div>
        <div className="oj-meta" style={{ lineHeight: 1.5, marginBottom: 12 }}>
          Apaga a loja, os dados e o acesso desta cliente. Antes de confirmar você poderá baixar uma cópia. Não dá para desfazer.
        </div>
        <button className="oj-bt perigo" style={{ width: "100%" }} onClick={() => setExcluindo(true)}>
          Excluir esta cliente e os dados dela…
        </button>
      </div>
      {excluindo && (
        <ExcluirConta
          alvo={{ id: l.dona_id, email: dona.email || "" }}
          aoFechar={() => setExcluindo(false)}
          aoConcluir={() => { setExcluindo(false); if (aoExcluida) aoExcluida(); }}
        />
      )}
    </>
  );
}

function Admin({ d }) {
  // Painel fiel ao USO REAL: o que cada loja de fato cadastrou, vendeu e quando usou por último.
  const [uso, setUso] = useState(null);
  const [erroAdmin, setErroAdmin] = useState("");
  const [alvoSenha, setAlvoSenha] = useState("");
  const [aberta, setAberta] = useState(null); // loja aberta em modo suporte
  const [contas, setContas] = useState([]); // contas que existem mas não têm loja
  const [excluirConta, setExcluirConta] = useState(null);
  const [versao, setVersao] = useState(0); // sobe depois de uma exclusão, para recarregar as listas
  const [secao, setSecao] = useState("lojas"); // lojas | acessos | suporte
  useEffect(() => {
    let vivo = true;
    dados.carregarUsoLojas()
      .then((x) => { if (vivo) setUso(x); })
      .catch((err) => { if (vivo) setErroAdmin(err.message || "Não consegui carregar o painel."); });
    dados.contasSemLoja().then((x) => { if (vivo) setContas(x); });
    return () => { vivo = false; };
  }, [versao]);

  if (erroAdmin) return <div className="oj-erro">{erroAdmin}</div>;
  if (!uso) return <div className="oj-card"><div className="oj-meta">Carregando dados reais…</div></div>;
  if (aberta)
    return (
      <LojaSuporte
        loja={aberta}
        voltar={() => setAberta(null)}
        aoExcluida={() => { setAberta(null); setVersao((v) => v + 1); }}
        pedirSenha={(email) => {
          setAberta(null);
          setAlvoSenha(email);
          setSecao("suporte");
          setTimeout(() => document.getElementById("redefinir-senha")?.scrollIntoView({ behavior: "smooth" }), 250);
        }}
      />
    );

  const r = uso.resumo || {};
  const lojas = uso.lojas || [];
  const planosAtivos = PLANO_PUBLICOS();
  const pagantes = lojas.filter((l) => l.situacao === "pagante");
  const mrr = pagantes.reduce((t, l) => t + (acharPlano(l.plano)?.valor || 0), 0);

  const quando = (iso) => {
    if (!iso) return "ainda não usou";
    const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
    return dias <= 0 ? "usou hoje" : dias === 1 ? "usou ontem" : `usou há ${dias} dias`;
  };
  const etiqueta = {
    beta: ["beta", "oj-estado beta"],
    pagante: ["paga", "oj-estado ativo"],
    encerrado: ["teste encerrado", "oj-estado vencido"],
    livre: ["plano livre", "oj-estado neutro"],
  };

  // quem tem loja / quem tem só a conta, para mostrar a ação certa em cada acesso beta
  const indexar = (lista, chave) => Object.fromEntries(lista.filter((x) => chave(x)).map((x) => [String(chave(x)).toLowerCase(), x]));
  const lojasPorEmail = indexar(lojas, (l) => l.dona_email);
  const contasPorEmail = indexar(contas, (c) => c.email);

  return (
    <div className="oj-adm">
      <div className="oj-seg" role="tablist" aria-label="Seções do painel">
        {[["lojas", "Lojas"], ["acessos", "Acessos"], ["suporte", "Suporte"]].map(([k, t]) => (
          <button key={k} role="tab" aria-selected={secao === k} onClick={() => setSecao(k)}>{t}</button>
        ))}
      </div>

      {secao === "lojas" && (
      <>
      <div className="oj-grid2 oj-grid-adm">
        <div className="oj-card flat">
          <div className="oj-lbl">Lojas</div>
          <div className="oj-valor">{r.lojas || 0}</div>
          <div className="oj-meta">{r.usando_7d || 0} usando nesta semana</div>
        </div>
        <div className="oj-card flat">
          <div className="oj-lbl">Peças cadastradas</div>
          <div className="oj-valor">{r.pecas || 0}</div>
          <div className="oj-meta">somando todas as lojas</div>
        </div>
        <div className="oj-card flat">
          <div className="oj-lbl">Vendas em 30 dias</div>
          <div className="oj-valor">{r.vendas_30d || 0}</div>
          <div className="oj-meta">{brl(r.valor_vendas_30d || 0)} registrados pelas lojas</div>
        </div>
        <div className="oj-card flat">
          <div className="oj-lbl">Romaneios lidos (30 dias)</div>
          <div className="oj-valor">{r.romaneios_30d || 0}</div>
          <div className="oj-meta">leituras por IA — é o seu custo variável</div>
        </div>
      </div>

      <div className="oj-card">
        <div className="oj-lbl">Receita do Luxi por mês</div>
        <div className="oj-valor ouro">{brl(mrr)}</div>
        <div className="oj-meta" style={{ marginTop: 6, lineHeight: 1.55 }}>
          {pagantes.length === 0
            ? `Ninguém paga ainda. ${r.beta || 0} loja(s) em beta — o beta não entra na receita.`
            : `${pagantes.length} assinatura(s) paga(s) · ${r.beta || 0} em beta (fora da receita).`}
        </div>
      </div>

      <div className="oj-sec">Lojas e uso</div>
      <div className="oj-card">
        {lojas.length === 0 ? (
          <div className="oj-meta">Nenhuma loja cadastrada ainda.</div>
        ) : (
          lojas.map((l) => {
            const [rotulo, classe] = etiqueta[l.situacao] || etiqueta.livre;
            return (
              <div className="oj-linha" key={l.id}>
                <div className="oj-linha-topo">
                  <div className="oj-quebra">
                    <div className="oj-nome">{l.nome || "Loja sem nome"}</div>
                    <div className="oj-meta oj-quebra">{l.dona_email || "—"}</div>
                  </div>
                  <span className={classe}>{rotulo}</span>
                </div>
                <div className="oj-meta" style={{ marginTop: 6, lineHeight: 1.55 }}>
                  {l.pecas} peça(s) · {l.vendas_total} venda(s) · {l.romaneios_30d} romaneio(s) lido(s)
                  {l.consultoras > 0 ? ` · ${l.consultoras} consultora(s)` : ""}
                </div>
                <div className="oj-meta">
                  {quando(l.ultima_atividade)}
                  {l.situacao === "beta" && l.dias_restantes != null ? ` · restam ${l.dias_restantes} dia(s) de beta` : ""}
                </div>
                {l.situacao === "encerrado" && (
                  <div className="oj-meta" style={{ color: "var(--perigo-tx)", marginTop: 4 }}>
                    O teste acabou. Para ela voltar, libere o e-mail dela na seção Acessos.
                  </div>
                )}
                <div className="oj-acoes">
                  <button className="oj-bt forte" onClick={() => setAberta(l)} aria-label={`Ver a loja ${l.nome || ""} e a atividade`}>
                    Ver loja e atividade&nbsp;›
                  </button>
                  {l.dona_email && (
                    <button
                      className="oj-bt"
                      onClick={() => {
                        setAlvoSenha(l.dona_email);
                        setSecao("suporte");
                        setTimeout(() => document.getElementById("redefinir-senha")?.scrollIntoView({ behavior: "smooth" }), 250);
                      }}
                    >
                      Redefinir senha dela
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {contas.length > 0 && (
        <>
          <div className="oj-sec">Contas sem loja ({contas.length})</div>
          <div className="oj-card">
            <div className="oj-meta" style={{ marginBottom: 4, lineHeight: 1.5 }}>
              Criaram o acesso mas ainda não abriram a loja (ou ficaram sem loja).
            </div>
            {contas.map((c) => (
              <div className="oj-linha" key={c.id}>
                <div className="oj-linha-topo">
                  <div className="oj-quebra">
                    <div className="oj-nome">{c.email}</div>
                    <div className="oj-meta" style={{ lineHeight: 1.55 }}>
                      criada em {new Date(c.criada_em).toLocaleDateString("pt-BR")}
                      {c.ultimo_login ? ` · último login ${new Date(c.ultimo_login).toLocaleDateString("pt-BR")}` : " · nunca entrou"}
                      {c.consultora_de ? ` · consultora de ${c.consultora_de}` : ""}
                    </div>
                  </div>
                  {c.beta && <span className="oj-estado ativo">beta ativo</span>}
                </div>
                <div className="oj-acoes">
                  <button className="oj-bt perigo" onClick={() => setExcluirConta(c)} aria-label={`Excluir a conta de ${c.email}`}>
                    Excluir conta…
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="oj-sec">Assinaturas pagas por plano</div>
      <div className="oj-card">
        {planosAtivos.map((pl) => {
          const n = pagantes.filter((l) => (PLANO_ALIASES[l.plano] || l.plano) === pl.id).length;
          return (
            <div className="oj-uso" key={pl.id} style={{ marginBottom: 8 }}>
              <span>{pl.nome} · R$ {pl.preco}</span>
              <b style={{ marginLeft: "auto" }}>{n}</b>
            </div>
          );
        })}
      </div>

      </>
      )}

      {secao === "acessos" && (
        <GestaoBeta
          lojasPorEmail={lojasPorEmail}
          contasPorEmail={contasPorEmail}
          abrirLoja={(l) => { setSecao("lojas"); setAberta(l); }}
          excluirConta={(c) => setExcluirConta(c)}
        />
      )}

      {secao === "suporte" && (
        <>
          <RedefinirSenha emailInicial={alvoSenha} />
          <TrocarSenha />
        </>
      )}

      {excluirConta && (
        <ExcluirConta
          alvo={{ id: excluirConta.id, email: excluirConta.email }}
          aoFechar={() => setExcluirConta(null)}
          aoConcluir={() => { setExcluirConta(null); setVersao((v) => v + 1); }}
        />
      )}
    </div>
  );
}
/* ---------------- gestão de acessos beta (beta fechado) ---------------- */
function GestaoBeta({ lojasPorEmail = {}, contasPorEmail = {}, abrirLoja = () => {}, excluirConta = () => {} }) {
  const [email, setEmail] = useState("");
  const [dias, setDias] = useState("30");
  const [criando, setCriando] = useState(false);
  const [msg, setMsg] = useState("");
  const [linkBeta, setLinkBeta] = useState("");
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = async () => {
    try {
      const l = await dados.listarAcessosBeta();
      setLista(l);
    } catch (e) {
      /* silencioso */
    } finally {
      setCarregando(false);
    }
  };
  useEffect(() => {
    recarregar();
  }, []);

  const liberar = async () => {
    if (!email.trim()) return;
    setCriando(true);
    setMsg("");
    try {
      const acesso = await dados.criarAcessoBeta({ email: email.trim(), dias: Number(dias) || 30 });
      if (!acesso?.convite_token) throw new Error("O convite foi salvo, mas não recebi o link.");
      setLinkBeta(`${window.location.origin}${window.location.pathname}?beta=${encodeURIComponent(acesso.convite_token)}`);
      setMsg(`✓ ${email.trim()} liberada por ${dias} dias`);
      setEmail("");
      await recarregar();
    } catch (e) {
      setMsg("Erro: " + (e.message || "tente de novo"));
    } finally {
      setCriando(false);
    }
  };

  const removerDaLista = async (em) => {
    if (!window.confirm(`Remover ${em} da lista de acessos?\n\nIsso apaga o registro do acesso beta (não mexe em conta nenhuma).`)) return;
    try {
      await dados.removerAcessoBeta(em);
      await recarregar();
    } catch (e) {
      setMsg("Erro: " + (e.message || "não consegui remover"));
    }
  };
  const revogar = async (em) => {
    if (!window.confirm(`Revogar o acesso de ${em}?\n\nEla deixa de conseguir entrar no beta.`)) return;
    if (!window.confirm(`Revogar o acesso de ${em}?\n\nA loja dela volta para o plano Livre — os dados ficam guardados.`)) return;
    try {
      await dados.revogarBeta(em);
      await recarregar();
    } catch (e) {
      setMsg("Erro ao revogar: " + (e.message || ""));
    }
  };

  const linkDoAcesso = (acesso) => acesso?.convite_token
    ? `${window.location.origin}${window.location.pathname}?beta=${encodeURIComponent(acesso.convite_token)}`
    : "";
  const copiarLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      setMsg("✓ Link copiado");
    } catch (e) {
      setMsg("Selecione o link e copie manualmente.");
    }
  };

  const ativos = lista.filter((a) => a.ativo && new Date(a.expira_em) > new Date());

  return (
    <>
      <div className="oj-sec">Acessos Beta ({ativos.length} ativos)</div>
      <div className="oj-card">
        <div className="oj-lbl" style={{ marginBottom: 12 }}>Liberar uma cliente para o beta</div>
        <div className="oj-campo">
          <label>E-mail da cliente</label>
          <input
            className="oj-in"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@email.com"
          />
        </div>
        <div className="oj-campo">
            <label>Dias de acesso</label>
            <input
              className="oj-in"
              type="number"
              min="1"
              max="365"
              value={dias}
              onChange={(e) => setDias(e.target.value)}
            />
        </div>
        {msg && (
          <div className={msg.startsWith("✓") ? "oj-aviso" : "oj-erro"} style={{ margin: "6px 0" }}>
            {msg}
          </div>
        )}
        {linkBeta && (
          <div className="oj-aviso" style={{ margin: "6px 0 12px" }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Link do convite (copie e envie manualmente)</div>
            <input className="oj-in" value={linkBeta} readOnly onFocus={(e) => e.target.select()} />
            <button
              className="oj-btn sec mini"
              style={{ marginTop: 8 }}
              onClick={async () => { await navigator.clipboard.writeText(linkBeta); setMsg("✓ Link copiado"); }}
            >
              Copiar link
            </button>
            <div className="oj-meta" style={{ marginTop: 8 }}>
              Uso único e exclusivo para o e-mail liberado. Quem receber o link ainda precisará criar uma senha.
            </div>
          </div>
        )}
        <button className="oj-btn" onClick={liberar} disabled={criando || !email.trim()}>
          {criando ? "Liberando…" : "Liberar acesso beta"}
        </button>
      </div>

      <div className="oj-card">
        <div className="oj-lbl" style={{ marginBottom: 10 }}>Clientes liberadas</div>
        {carregando ? (
          <div className="oj-meta">Carregando…</div>
        ) : lista.length === 0 ? (
          <div className="oj-meta">Nenhuma cliente liberada ainda. Libere a primeira acima.</div>
        ) : (
          lista.map((a) => {
            const ativa = a.ativo && new Date(a.expira_em) > new Date();
            return (
              <div key={a.id || a.email} className="oj-linha">
                <div className="oj-linha-topo">
                  <div className="oj-quebra">
                    <div className="oj-nome">{a.email}</div>
                    <div className="oj-meta">
                      {a.obs ? a.obs + " · " : ""}
                      expira {new Date(a.expira_em).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <span className={"oj-estado " + (ativa ? "ativo" : "vencido")}>{ativa ? "ativa" : "expirada"}</span>
                </div>
                {linkDoAcesso(a) ? (
                  <div className="oj-link-bloco">
                    <div className="oj-meta" style={{ fontWeight: 600 }}>Link individual do Beta</div>
                    <div className="oj-link-linha">
                      <input
                        className="oj-in"
                        value={linkDoAcesso(a)}
                        readOnly
                        onFocus={(e) => e.target.select()}
                        aria-label={`Link Beta de ${a.email}`}
                      />
                      <button className="oj-bt" onClick={() => copiarLink(linkDoAcesso(a))} aria-label={`Copiar o link de ${a.email}`}>
                        Copiar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="oj-meta" style={{ marginTop: 8 }}>
                    Link ainda não disponível. Libere novamente para gerar um.
                  </div>
                )}
                {(
                  <div className="oj-acoes">
                    {ativa && (
                      <button className="oj-bt perigo" onClick={() => revogar(a.email)} aria-label="Revogar acesso">
                        Revogar acesso
                      </button>
                    )}
                    {lojasPorEmail[String(a.email).toLowerCase()] ? (
                      <button className="oj-bt" onClick={() => abrirLoja(lojasPorEmail[String(a.email).toLowerCase()])}>
                        Abrir a loja ›
                      </button>
                    ) : contasPorEmail[String(a.email).toLowerCase()] ? (
                      <button className="oj-bt perigo" onClick={() => excluirConta(contasPorEmail[String(a.email).toLowerCase()])} aria-label={`Excluir a conta de ${a.email}`}>
                        Excluir conta…
                      </button>
                    ) : !ativa ? (
                      <button className="oj-bt perigo" onClick={() => removerDaLista(a.email)} aria-label={`Remover ${a.email} da lista`}>
                        Remover da lista
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

/* ---------------- painel do administrador (fim) ---------------- */

/* ---------------- aviso de teste / limite ---------------- */
function Aviso({ d, irPara }) {
  const p = d.perfil;
  const plano = planoAtivo(p);
  const codigos = new Set(d.estoque.filter((x) => x.qtd > 0).map((x) => x.codigo)).size;

  // Assinar NÃO marca a conta como paga: leva à tela de plano, onde o pagamento
  // de verdade acontece. E o botão só aparece quando existe um link de pagamento.
  const pagamentoAberto = Object.values(LINKS_PAGAMENTO).some(Boolean);
  const assinar = () => irPara && irPara("perfil");
  const tempoRestante = (h) => (h > 72 ? `${Math.ceil(h / 24)} dias` : `${h}h`);

  // A administradora de verdade (painel com dados reais) não recebe o aviso de "loja de demonstração".
  if (p.admin) return null;

  if (p.mestre)
    return (
      <div className="oj-aviso">
        <b>Acesso mestre.</b> Loja de demonstração com todos os recursos liberados e
        dados de exemplo. Use a aba Contas para limpar tudo e recomeçar.
      </div>
    );

  if (somenteLeitura(p))
    return (
      <div className="oj-erro">
        <b>Modo leitura — pagamento em atraso há {diasAtraso(p)} dias.</b> Seus dados
        estão todos aqui e nada foi apagado, mas novos romaneios e baixas de venda ficam
        bloqueados até a regularização.
        {pagamentoAberto && (
          <button className="oj-btn mini" style={{ marginTop: 10 }} onClick={assinar}>
            Regularizar agora
          </button>
        )}
      </div>
    );

  if (emTeste(p))
    return (
      <div className="oj-aviso">
        <b>Faltam {tempoRestante(horasRestantes(p))}</b> do seu teste. Você está com o{" "}
        {plano.nome} completo: {plano.itens[1].toLowerCase()} e{" "}
        {plano.itens[2].toLowerCase()}. Quando o teste acabar, isso sai do ar — o
        cadastro fica.
        {pagamentoAberto && (
          <button className="oj-btn mini" style={{ marginTop: 10 }} onClick={assinar}>
            Assinar o {plano.nome} · R$ {plano.preco}
          </button>
        )}
      </div>
    );

  if (!p.assinado)
    return (
      <div className="oj-erro">
        <b>Você está no plano Livre</b> — até {LIVRE.limite} códigos ({codigos} em uso).
        Alerta de peça parada, cotação de metais e giro por peça estão desligados.
        {pagamentoAberto && (
          <button className="oj-btn mini" style={{ marginTop: 10 }} onClick={assinar}>
            Reativar o {acharPlano(p.plano).nome} · R$ {acharPlano(p.plano).preco}
          </button>
        )}
      </div>
    );

  if (plano.limite !== Infinity && codigos > plano.limite * 0.85)
    return (
      <div className="oj-aviso">
        <b>
          {codigos} de {plano.limite} códigos
        </b>{" "}
        em uso. Sua loja está crescendo — vale subir de plano antes de travar o próximo
        romaneio.
      </div>
    );

  return null;
}

/* ---------------- filtro ---------------- */
function Filtro({ periodo, setPeriodo, de, ate, setDe, setAte }) {
  return (
    <>
      <div className="oj-chips">
        {[
          ["7", "7 dias"],
          ["mes", "Este mês"],
          ["custom", "Escolher datas"],
          ["tudo", "Tudo"],
        ].map(([k, r]) => (
          <button
            key={k}
            className="oj-chip"
            data-on={periodo === k ? "1" : "0"}
            onClick={() => setPeriodo(k)}
          >
            {r}
          </button>
        ))}
      </div>
      {periodo === "custom" && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            className="oj-in"
            type="date"
            value={de}
            onChange={(e) => setDe(e.target.value)}
          />
          <input
            className="oj-in"
            type="date"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
          />
        </div>
      )}
    </>
  );
}

/* ---------------- cadastro ---------------- */
function CadastroLegado({ onPronto, onMestre, contaLogada, criarConta, tentarEntrar, aoEntrar }) {
  const [p, setP] = useState(0);
  const [f, setF] = useState({
    plano: "crescimento",
    nome: "",
    email: "",
    senha: "",
    senha2: "",
    loja: "",
    fornecedores: [{ nome: "", margem: "100" }],
    formas: ["Dinheiro", "Débito", "Crédito", "Na confiança"],
    margem: "100",
    fiado: true,
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  const [criando, setCriando] = useState(false);
  const [criandoLoja, setCriandoLoja] = useState(false);
  const [erroCad, setErroCad] = useState("");
  const [cupomTxt, setCupomTxt] = useState("");
  const [cupom, setCupom] = useState(null);
  const [cupomErro, setCupomErro] = useState("");
  const [periodoPlano, setPeriodoPlano] = useState("mensal");
  // Cliente beta: mostra os dias reais liberados (em vez do "72h" padrão).
  const [beta, setBeta] = useState(null);
  useEffect(() => {
    if (contaLogada) dados.meuAcessoBeta().then(setBeta);
  }, [contaLogada]);
  const diasBeta = beta?.expira_em
    ? Math.max(1, Math.ceil((new Date(beta.expira_em).getTime() - Date.now()) / 864e5))
    : 0;

  const aplicarCupom = () => {
    const c = validarCupom(cupomTxt);
    if (c) {
      setCupom(c);
      setCupomErro("");
    } else {
      setCupom(null);
      setCupomErro("Cupom não encontrado. Confira o código.");
    }
  };

  const podeAvancar =
    p === 1
      ? f.email && f.senha.length >= 6 && f.senha === f.senha2
      : f.loja.trim() && (!contaLogada || f.nome.trim());
  const plano = acharPlano(f.plano);

  if (p === 0)
    return (
      <div style={{ padding: "44px 24px 40px" }} className="oja">
        <Marca size={62} animar={false} />
        <div className="oj-marca" style={{ marginTop: 16 }}>
          <b>Luxi</b>
        </div>
        <h1 className="oj-h1 oj-serif" style={{ fontSize: 40, marginTop: 14 }}>
          Organize
          <br />
          e venda ainda mais.
        </h1>
        <p className="oj-sub" style={{ marginTop: 12, fontSize: 15, lineHeight: 1.62 }}>
          Fotografe o romaneio e o estoque se cadastra sozinho. Dê baixa nas vendas em
          dois toques. E veja, pela primeira vez, o número que o caderno nunca te deu: o
          seu lucro de verdade.
        </p>

        <div className="oj-card flat" style={{ margin: "22px 0 0" }}>
          <div className="oj-lbl">O que muda no primeiro mês</div>
          <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none" }}>
            {[
              "Nunca mais comprar peça que já está encalhada na gaveta",
              "Saber, pelo nome, quem está devendo e há quantos dias",
              "Descobrir qual peça paga suas contas e qual só ocupa espaço",
            ].map((t) => (
              <li
                key={t}
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  paddingLeft: 16,
                  position: "relative",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 9,
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "var(--dourado)",
                  }}
                />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {beta ? (
          <div className="oj-card" style={{ margin: "26px 0 16px" }}>
            <div className="oj-lbl">Seu acesso beta</div>
            <div className="oj-valor ouro" style={{ fontSize: 30 }}>{diasBeta} dias</div>
            <div className="oj-meta" style={{ marginTop: 8, lineHeight: 1.6 }}>
              Você usa o Luxi completo por {diasBeta} dias, sem cartão e sem cobrança.
              Passado o beta, tudo o que você cadastrou continua aqui.
            </div>
          </div>
        ) : (
          <>
        <div className="oj-sec" style={{ margin: "30px 0 4px" }}>
          Escolha seu plano
        </div>
        <SeletorCobranca valor={periodoPlano} onChange={setPeriodoPlano} />
        <div className="oj-meta" style={{ marginBottom: 12 }}>
          72 horas com tudo liberado, sem cartão. Depois, seus dados continuam guardados, mas o uso da loja fica pausado até você assinar um dos planos.
        </div>

        {PLANO_PUBLICOS().map((x) => (          <div
            key={x.id}
            className="oj-plano"
            data-on={f.plano === x.id ? "1" : "0"}
            role="button"
            tabIndex={0}
            onClick={() => set("plano", x.id)}
            onKeyDown={(e) => e.key === "Enter" && set("plano", x.id)}
          >
            {x.selo && <span className="oj-selo">{x.selo}</span>}
            <div className="topo">
              <span className="nome">{x.nome}</span>
              <span className="preco">
                {periodoPlano === "anual" ? <>R$ {dinheiroPlano(precoAnual(x).total)}<small> /ano</small></> : <>R$ {x.preco}<small> /mês</small></>}
              </span>
            </div>
            {x.persona && (
              <div
                className="oj-meta"
                style={{ marginTop: 2, color: "var(--roxo)", fontWeight: 500 }}
              >
                {x.persona}
              </div>
            )}
            <div className="oj-meta" style={{ marginTop: 2 }}>
              {x.linha}
            </div>
            <ul>
              {x.itens.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        ))}

        <div className="oj-meta" style={{ margin: "10px 2px 18px", lineHeight: 1.6 }}>
          O plano acompanha o tamanho do seu estoque, não quantas fotos você tira.
          Fotografe à vontade — e mude de plano quando a loja crescer.
        </div>

        {/* cupom de desconto */}
        <div className="oj-card flat" style={{ marginBottom: 16 }}>
          {cupom ? (
            <div>
              <div className="oj-uso" style={{ alignItems: "center" }}>
                <span style={{ color: "var(--verde)", fontWeight: 600 }}>
                  ✓ Cupom {cupom.codigo} aplicado
                </span>
                <button
                  className="oj-link-sutil"
                  style={{ width: "auto", margin: 0, marginLeft: "auto" }}
                  onClick={() => { setCupom(null); setCupomTxt(""); }}
                >
                  remover
                </button>
              </div>
              <div className="oj-meta" style={{ marginTop: 4 }}>
                {cupom.pct}% de desconto
                {cupom.meses ? ` nos primeiros ${cupom.meses} meses` : " (vitalício)"} —
                de R$ {plano.preco} por{" "}
                <b style={{ color: "var(--marinho)" }}>
                  R$ {(plano.valor * (1 - cupom.pct / 100)).toFixed(2).replace(".", ",")}
                </b>
                /mês
              </div>
            </div>
          ) : (
            <div>
              <label className="oj-lbl">Tem um cupom de desconto?</label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input
                  className="oj-in"
                  placeholder="Digite o código"
                  value={cupomTxt}
                  autoCapitalize="characters"
                  style={{ flex: 1, textTransform: "uppercase" }}
                  onChange={(e) => setCupomTxt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && aplicarCupom()}
                />
                <button className="oj-btn mini" style={{ width: "auto" }} onClick={aplicarCupom}>
                  Aplicar
                </button>
              </div>
              {cupomErro && (
                <div className="oj-meta" style={{ color: "var(--alerta)", marginTop: 6 }}>
                  {cupomErro}
                </div>
              )}
            </div>
          )}
        </div>

          </>
        )}

        <button className="oj-btn" onClick={() => setP(contaLogada ? 2 : 1)}>
          {beta ? "Começar meu beta" : `Testar 72h grátis com o ${plano.nome}`}
        </button>
        {!contaLogada && (
          <button
            className="oj-btn sec"
            style={{ marginTop: 8 }}
            onClick={() => setP("login")}
          >
            Já tenho conta — entrar
          </button>
        )}
      </div>
    );

  if (p === "login")
    return <Login onMestre={onMestre} voltar={() => setP(0)} onEntrar={aoEntrar} />;

  return (
    <div style={{ padding: "60px 24px" }}>
      <div className="oj-marca">
        <b>Luxi</b>
      </div>
      <h1 className="oj-h1 oj-serif" style={{ fontSize: 38, marginTop: 12 }}>
        {p === 1 ? "Sua conta" : "Sua loja"}
      </h1>
      <p className="oj-sub" style={{ marginBottom: 26 }}>
        {p === 1
          ? "Leva menos de um minuto. Depois é só fotografar o romaneio."
          : "Quatro respostas e você já vê seu lucro."}
      </p>

      {p === 1 ? (
        <>
          <div className="oj-campo">
            <label>Seu nome</label>
            <input
              className="oj-in"
              value={f.nome}
              onChange={(e) => set("nome", e.target.value)}
              placeholder="Como você quer ser chamada"
            />
          </div>
          <div className="oj-campo">
            <label>E-mail ou celular</label>
            <input
              className="oj-in"
              value={f.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="voce@email.com"
            />
          </div>
          <CampoSenha
            label="Senha — mínimo 6 caracteres"
            valor={f.senha}
            onChange={(v) => set("senha", v)}
          />
          <CampoSenha
            label="Repita a senha"
            valor={f.senha2}
            onChange={(v) => set("senha2", v)}
          />
          {f.senha2 && f.senha !== f.senha2 && (
            <div className="oj-meta" style={{ color: "var(--alerta)", marginTop: -6, marginBottom: 8 }}>
              As senhas não são iguais.
            </div>
          )}
        </>
      ) : (
        <>
          {contaLogada && (
            <div className="oj-campo">
              <label>Seu nome</label>
              <input
                className="oj-in"
                value={f.nome}
                onChange={(e) => set("nome", e.target.value)}
                placeholder="Como você quer ser chamada"
              />
            </div>
          )}
          <div className="oj-campo">
            <label>Nome da loja</label>
            <input
              className="oj-in"
              value={f.loja}
              onChange={(e) => set("loja", e.target.value)}
              placeholder="Ex: Ateliê Rosa"
            />
          </div>
          <div className="oj-campo">
            <label>Seus fornecedores e a margem de cada um</label>
            <div className="oj-meta" style={{ marginBottom: 8 }}>
              A margem define o preço de venda a partir do custo. Você ajusta peça a
              peça depois, se precisar. (40% a 300%)
            </div>
            {f.fornecedores.map((forn, i) => (
              <div
                key={i}
                style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}
              >
                <input
                  className="oj-in"
                  style={{ flex: 1 }}
                  value={forn.nome}
                  placeholder="Nome do fornecedor"
                  onChange={(e) => {
                    const arr = [...f.fornecedores];
                    arr[i] = { ...arr[i], nome: e.target.value };
                    set("fornecedores", arr);
                  }}
                />
                <div style={{ position: "relative", width: 92 }}>
                  <input
                    className="oj-in"
                    type="number"
                    inputMode="numeric"
                    min="40"
                    max="300"
                    value={forn.margem}
                    style={{ paddingRight: 24, textAlign: "right" }}
                    onChange={(e) => {
                      const arr = [...f.fornecedores];
                      arr[i] = { ...arr[i], margem: e.target.value };
                      set("fornecedores", arr);
                    }}
                    onBlur={(e) => {
                      const v = Math.min(300, Math.max(40, Number(e.target.value) || 100));
                      const arr = [...f.fornecedores];
                      arr[i] = { ...arr[i], margem: String(v) };
                      set("fornecedores", arr);
                    }}
                  />
                  <span
                    style={{
                      position: "absolute", right: 9, top: "50%",
                      transform: "translateY(-50%)", color: "var(--tinta-cl)", fontSize: 13,
                    }}
                  >
                    %
                  </span>
                </div>
                {f.fornecedores.length > 1 && (
                  <button
                    type="button"
                    className="oj-senha-olho"
                    style={{ position: "static", color: "var(--alerta)" }}
                    aria-label="Remover fornecedor"
                    onClick={() =>
                      set("fornecedores", f.fornecedores.filter((_, k) => k !== i))
                    }
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="oj-link-sutil"
              style={{ textAlign: "left", width: "auto", margin: "2px 0 0" }}
              onClick={() =>
                set("fornecedores", [...f.fornecedores, { nome: "", margem: "100" }])
              }
            >
              + Adicionar outro fornecedor
            </button>
          </div>

          <div className="oj-campo">
            <label>Como você recebe das suas clientes?</label>
            <div className="oj-meta" style={{ marginBottom: 8 }}>
              Marque tudo que você aceita. Na hora da venda, você escolhe qual foi.
            </div>
            <div className="oj-chips">
              {MODALIDADES.map((m) => {
                const on = f.formas.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    className="oj-chip"
                    data-on={on ? "1" : "0"}
                    onClick={() =>
                      set(
                        "formas",
                        on
                          ? f.formas.filter((x) => x !== m)
                          : [...f.formas, m]
                      )
                    }
                    style={
                      on
                        ? { borderColor: corPagamento(m), color: corPagamento(m) }
                        : undefined
                    }
                  >
                    <span
                      style={{
                        display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                        background: corPagamento(m), marginRight: 6,
                      }}
                    />
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {erroCad && <div className="oj-erro" style={{ margin: "12px 0 0" }}>{erroCad}</div>}

      <button
        className="oj-btn"
        style={{ marginTop: 10 }}
        disabled={!podeAvancar || criando || criandoLoja}
        onClick={async () => {
          if (p === 1) {
            setErroCad("");
            setCriando(true);
            try {
              const temSessao = await criarConta(f.email.trim(), f.senha);
              if (temSessao) {
                setP(2);
              } else {
                setErroCad("Não consegui entrar com a conta nova. Tente de novo em instantes.");
              }
            } catch (e) {
              setErroCad(e.message);
            } finally {
              setCriando(false);
            }
            return;
          }
          setErroCad("");
          const perfil = {
            ...f,
            senha: undefined,
            senha2: undefined,
            assinado: false,
            mestre: false,
            papel: "dona",
            cupom: cupom || null,
            trialAte: new Date(Date.now() + TRIAL_MS).toISOString(),
            fornecedores: f.fornecedores.filter((x) => x.nome.trim()),
            formas: f.formas.length ? f.formas : ["Dinheiro"],
            fiado: f.formas.includes("Na confiança"),
            margem: f.fornecedores[0]?.margem || "100",
            criadoEm: hoje(),
          };
          setCriandoLoja(true);
          try {
            await onPronto(perfil);
          } catch (e) {
            setErroCad(e.message || "Não consegui abrir sua loja. Tente de novo.");
          } finally {
            setCriandoLoja(false);
          }
        }}
      >
        {criando
          ? "Criando sua conta…"
          : criandoLoja
          ? "Abrindo sua loja…"
          : p === 1
          ? "Continuar"
          : "Abrir minha loja"}
      </button>
      <button
        className="oj-btn sec"
        style={{ marginTop: 8 }}
        onClick={() => setP(p === 2 && contaLogada ? 0 : p - 1)}
      >
        Voltar
      </button>
      {p === 1 && (
        <div className="oj-meta" style={{ textAlign: "center", marginTop: 14 }}>
          {beta
            ? `Beta liberado por ${diasBeta} dias · sem cartão`
            : `${plano.nome} liberado por 72 horas · depois, escolha um dos planos para continuar`}
        </div>
      )}
    </div>
  );
}

function AcessoEncerrado({ perfil, sair, confirmando = false, demorou = false }) {
  const [periodo, setPeriodo] = useState("mensal");
  const [abrindo, setAbrindo] = useState(null);
  const [erroPag, setErroPag] = useState("");
  return (
    <div className="oj">
      <style>{CSS}</style>
      <div style={{ padding: "44px 20px 36px" }}>
        <Marca size={62} animar={false} />
        <div className="oj-marca" style={{ marginTop: 16 }}><b>Luxi</b></div>
        <h1 className="oj-h1 oj-serif" style={{ fontSize: 34, marginTop: 14 }}>Seu período de teste terminou</h1>
        <p className="oj-sub" style={{ marginTop: 10, fontSize: 15, lineHeight: 1.6 }}>
          Seus dados continuam guardados. Para voltar a usar a loja, escolha um dos planos abaixo e faça a assinatura.
        </p>
        {confirmando && (
          <div className="oj-aviso" role="status" style={{ margin: "16px 0 0" }}>
            {demorou
              ? "Seu pagamento ainda não apareceu por aqui. Às vezes leva alguns minutos. Se a loja não abrir sozinha, fale com a gente pelo WhatsApp que resolvemos."
              : "Recebemos a volta do pagamento. Estamos confirmando e liberando a sua loja… leva alguns segundos."}
          </div>
        )}
        {erroPag && <div className="oj-erro" role="alert" style={{ margin: "16px 0 0" }}>{erroPag}</div>}
        <div className="oj-card flat" style={{ margin: "20px 0 16px" }}>
          <div className="oj-lbl">Sua loja está preservada</div>
          <div className="oj-meta" style={{ marginTop: 8, lineHeight: 1.6 }}>
            Nenhum produto, venda, cliente ou pedido é apagado pelo fim do teste ou por uma atualização do Luxi.
          </div>
        </div>
        <SeletorCobranca valor={periodo} onChange={setPeriodo} />
        {PLANO_PUBLICOS().map((p) => (
          <CartaoPlano key={p.id} p={p} escolhido={false} periodo={periodo}
            botao={
              <button className="oj-btn" style={{ marginTop: 12 }} disabled={!!abrindo || confirmando} onClick={async () => {
                setErroPag(""); setAbrindo(p.id);
                const r = await irParaPagamento(p, periodo);
                if (r.erro) setErroPag(r.erro);
                setAbrindo(null);
              }}>
                {abrindo === p.id
                  ? "Abrindo o pagamento seguro…"
                  : periodo === "anual"
                    ? "Assinar " + p.nome + " · R$ " + dinheiroPlano(precoAnual(p).total) + "/ano"
                    : "Assinar " + p.nome + " · R$ " + p.preco + "/mês"}
              </button>
            }
          />
        ))}
        <button className="oj-btn sec" style={{ marginTop: 8 }} onClick={sair}>Sair</button>
      </div>
    </div>
  );
}

/* ---------------- painel ---------------- */
function Painel({ d, dentro, irPara }) {
  const vendas = d.vendas.filter((v) => dentro(v.data));
  const saidas = d.saidas.filter((s) => dentro(s.data));
  const desp = d.despesas.filter((x) => dentro(x.data));

  const receita = vendas.reduce((s, v) => s + v.valor, 0);
  const custo = vendas.reduce((s, v) => s + v.custo, 0);
  const despesa = desp.reduce((s, x) => s + x.valor, 0);
  const comissao = vendas.reduce((s, v) => s + (Number(v.comissao) || 0), 0);
  const lucro = receita - custo - despesa - comissao;

  const porModal = MODALIDADES.map((m) => ({
    m,
    total: vendas.filter((v) => v.modalidade === m).reduce((s, v) => s + v.valor, 0),
  })).filter((x) => x.total > 0);

  const emEstoque = d.estoque.filter((p) => p.qtd > 0);
  const parado = emEstoque.reduce((s, p) => s + p.qtd * p.custo, 0);

  const contagem = {};
  vendas.forEach((v) => (contagem[v.codigo] = (contagem[v.codigo] || 0) + v.qtd));
  const top = Object.entries(contagem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const paradas = emEstoque.filter((p) => dias(p.entradaEm) > 60);
  const receber = d.vendas.filter((v) => v.modalidade === CONFIANCA && !v.pago);

  const totalPecas  = emEstoque.reduce((s, p) => s + p.qtd, 0);
  const qtdVendas   = vendas.length;
  const aReceberVal = receber.reduce((s, v) => s + v.valor, 0);
  const ticketMedio = qtdVendas > 0 ? receita / qtdVendas : 0;
  const margemPct   = receita > 0 ? Math.round((lucro / receita) * 100) : 0;
  const semNada     = !d.estoque.length && !d.vendas.length;

  return (
    <>
      {/* Métricas — cards limpos com ícones de traço fino */}
      <div className="oj-mx">
        <div className="oj-metrica">
          <div className="oj-metrica-top">
            <svg viewBox="0 0 24 24" className="oj-mi"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            <span className="oj-metrica-lbl">Vendas</span>
          </div>
          <div className="oj-metrica-val">{qtdVendas}</div>
          <div className="oj-metrica-sub">no período</div>
        </div>
        <div className="oj-metrica">
          <div className="oj-metrica-top">
            <svg viewBox="0 0 24 24" className="oj-mi"><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20"/><path d="M12 3L8 9l4 12 4-12z"/></svg>
            <span className="oj-metrica-lbl">Peças</span>
          </div>
          <div className="oj-metrica-val">{totalPecas}</div>
          <div className="oj-metrica-sub">em estoque</div>
        </div>
        <div className="oj-metrica destaque">
          <div className="oj-metrica-top">
            <svg viewBox="0 0 24 24" className="oj-mi"><path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg>
            <span className="oj-metrica-lbl">Lucro</span>
          </div>
          <div className={"oj-metrica-val " + (lucro >= 0 ? "pos" : "neg")}>{brl(lucro)}</div>
          <div className="oj-metrica-sub">{margemPct !== 0 ? `margem ${margemPct}%` : "líquido"}</div>
        </div>
        <div className="oj-metrica">
          <div className="oj-metrica-top">
            <svg viewBox="0 0 24 24" className="oj-mi"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            <span className="oj-metrica-lbl">Faturamento</span>
          </div>
          <div className="oj-metrica-val">{brl(receita)}</div>
          <div className="oj-metrica-sub">bruto</div>
        </div>
        <div className="oj-metrica">
          <div className="oj-metrica-top">
            <svg viewBox="0 0 24 24" className="oj-mi"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.5" fill="currentColor"/></svg>
            <span className="oj-metrica-lbl">Ticket médio</span>
          </div>
          <div className="oj-metrica-val">{brl(ticketMedio)}</div>
          <div className="oj-metrica-sub">por venda</div>
        </div>
        <div className="oj-metrica">
          <div className="oj-metrica-top">
            <svg viewBox="0 0 24 24" className="oj-mi"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            <span className="oj-metrica-lbl">A receber</span>
          </div>
          <div className={"oj-metrica-val " + (aReceberVal > 0 ? "alerta" : "")}>{brl(aReceberVal)}</div>
          <div className="oj-metrica-sub">{receber.length > 0 ? `${receber.length} no fiado` : "tudo em dia"}</div>
        </div>
      </div>

      {/* Convite quando a loja está zerada */}
      {semNada && (
        <div className="oj-card" style={{ textAlign: "center", padding: "22px 18px" }}>
          <div style={{ fontSize: 26, marginBottom: 8, color: "var(--rose)" }}>◈</div>
          <div style={{ fontWeight: 700, fontSize: 17, color: "var(--tinta)", marginBottom: 4 }}>
            Vamos colocar sua loja para trabalhar?
          </div>
          <div style={{ color: "var(--tinta-cl)", fontSize: 13.5, lineHeight: 1.55 }}>
            Comece pelo estoque: cadastre a primeira peça ou fotografe o romaneio do fornecedor.
            Em segundos seus números começam a aparecer aqui.
          </div>
          <button className="oj-btn" style={{ marginTop: 14 }} onClick={() => irPara("estoque")}>
            Cadastrar primeira peça
          </button>
        </div>
      )}

      {!semNada && d.estoque.length > 0 && !d.vendas.length && (
        <div className="oj-card" style={{ textAlign: "center", padding: "18px" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--tinta)", marginBottom: 4 }}>
            Sua primeira novidade já chegou.
          </div>
          <div style={{ color: "var(--tinta-cl)", fontSize: 13.5, lineHeight: 1.55 }}>
            Agora registre uma venda e veja a Luxi transformar movimento em clareza.
          </div>
          <button className="oj-btn sec" style={{ marginTop: 12 }} onClick={() => irPara("vendas")}>
            Registrar primeira venda
          </button>
        </div>
      )}

      <div className="oj-card">
        <div className="oj-lbl">Como foi o período</div>
        <div className={"oj-valor " + (lucro >= 0 ? "ouro" : "rose")}>{brl(lucro)}</div>
        <div className="oj-meta" style={{ marginTop: 8 }}>
          {brl(receita)} vendido · {brl(custo)} de custo · {brl(despesa)} em gastos · {brl(comissao)} de comissão
          {margemPct !== 0 ? ` · margem de ${margemPct}%` : ""}
        </div>
      </div>

      <div className="oj-grid2">
        <div className="oj-card flat">
          <div className="oj-lbl">Parado na gaveta</div>
          <div className="oj-valor" style={{ fontSize: 26 }}>{brl(parado)}</div>
          <div className="oj-meta">
            {totalPecas} peças{paradas.length > 0 ? ` · ${paradas.length} há +60 dias` : ""}
          </div>
        </div>
        <div className="oj-card flat">
          <div className="oj-lbl">Ainda vão te pagar</div>
          <div className="oj-valor rose" style={{ fontSize: 26 }}>
            {brl(aReceberVal)}
          </div>
          <div className="oj-meta">{receber.length} venda(s) no fiado</div>
        </div>
      </div>

      {porModal.length > 0 && (
        <>
          <div className="oj-sec">Como te pagaram</div>
          <div className="oj-card">
            {porModal.map((x) => (
              <div key={x.m} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", fontSize: 13.5, alignItems: "center" }}>
                  <span className="oj-pg">
                    <i style={{ background: corPagamento(x.m) }} />
                    {x.m}
                  </span>
                  <b style={{ marginLeft: "auto", color: corPagamento(x.m) }}>
                    {brl(x.total)}
                  </b>
                </div>
                <div className="oj-barra">
                  <i
                    style={{
                      width: (receita ? (x.total / receita) * 100 : 0) + "%",
                      background: corPagamento(x.m),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {top.length > 0 && (
        <>
          <div className="oj-sec">O que mais sai</div>
          <div className="oj-card">
            {top.map(([cod, q], i) => (
              <div className="oj-item" key={cod}>
                <span className="oj-cod">{i + 1}º</span>
                <div>
                  <div className="oj-nome">{cod}</div>
                  <div className="oj-meta">
                    {d.estoque.find((p) => p.codigo === cod)?.nome || "—"}
                  </div>
                </div>
                <div className="oj-dir">
                  <div className="oj-preco">{q}</div>
                  <div className="oj-meta">vendidas</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {paradas.length > 0 && (
        <>
          <div className="oj-sec">Precisam de uma ação</div>
          <div className="oj-aviso" style={{ margin: "6px 20px 0" }}>
            {paradas.length} peça(s) há mais de 60 dias sem vender. Vale promoção, brinde
            ou troca com o fornecedor.
          </div>
          <div className="oj-card">
            {paradas.slice(0, 6).map((p) => (
              <div className="oj-item" key={p.id}>
                <span className="oj-cod">{p.codigo}</span>
                <div>
                  <div className="oj-nome">{p.nome}</div>
                  <div className="oj-meta">{dias(p.entradaEm)} dias parada</div>
                </div>
                <div className="oj-dir">
                  <span className="oj-tag estoque">{p.qtd} em estoque</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {saidas.length > 0 && (
        <>
          <div className="oj-sec">Devoluções e defeitos</div>
          <div className="oj-card">
            <div className="oj-uso" style={{ marginBottom: 10 }}>
              <span className="oj-lbl">
                {saidas.reduce((s, x) => s + x.qtd, 0)} peça(s) fora do estoque
              </span>
              <b style={{ marginLeft: "auto", color: "var(--alerta)" }}>
                {brl(saidas.reduce((s, x) => s + (x.valor || x.custo || 0) * x.qtd, 0))}
              </b>
            </div>
            {saidas.map((s) => (
              <div className="oj-item" key={s.id}>
                <span className="oj-cod">{s.codigo}</span>
                <div>
                  <div className="oj-nome">{s.nome || s.motivo}</div>
                  <div className="oj-meta">
                    {s.motivo} · {new Date(s.data).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div className="oj-dir">
                  <div className="oj-preco">{brl((s.valor || s.custo || 0) * s.qtd)}</div>
                  <div className="oj-meta">{s.qtd} peça(s)</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ---------------- assistente de recompra ---------------- */
function Recompra({ d }) {
  const [aberto, setAberto] = useState(false);

  /* Probabilidade simples e honesta: velocidade de venda dos últimos 90 dias
     cruzada com o que ainda existe em estoque. */
  const janela = 90;
  const recentes = d.vendas.filter((v) => dias(v.data) <= janela);

  const porCodigo = {};
  recentes.forEach((v) => {
    if (!porCodigo[v.codigo]) porCodigo[v.codigo] = { qtd: 0, receita: 0, nome: v.nome };
    porCodigo[v.codigo].qtd += v.qtd;
    porCodigo[v.codigo].receita += v.valor;
  });

  const sugestoes = Object.entries(porCodigo)
    .map(([codigo, x]) => {
      const emEstoque = d.estoque
        .filter((p) => p.codigo === codigo)
        .reduce((s, p) => s + p.qtd, 0);
      const porMes = x.qtd / (janela / 30);
      const meses = porMes > 0 ? emEstoque / porMes : 99;
      const peca = d.estoque.find((p) => p.codigo === codigo) || {};
      return { codigo, ...x, emEstoque, porMes, meses, peca };
    })
    .filter((x) => x.meses < 1.5)
    .sort((a, b) => a.meses - b.meses);

  const fornecedores = {};
  (d.entradas || []).forEach((e) => {
    const k = e.fornecedor || "Sem fornecedor";
    if (!fornecedores[k]) fornecedores[k] = { total: 0, entradas: 0, itens: 0 };
    fornecedores[k].total += e.total || 0;
    fornecedores[k].entradas += 1;
    fornecedores[k].itens += e.qtdItens || 0;
  });
  const rankFornecedor = Object.entries(fornecedores)
    .map(([nome, x]) => ({ nome, ...x }))
    .sort((a, b) => b.total - a.total);

  if (!sugestoes.length && !rankFornecedor.length) return null;

  return (
    <div className="oj-card" style={{ borderColor: "var(--roxo)" }}>
      <div
        className="oj-uso"
        role="button"
        tabIndex={0}
        style={{ cursor: "pointer", alignItems: "center" }}
        onClick={() => setAberto(!aberto)}
        onKeyDown={(e) => e.key === "Enter" && setAberto(!aberto)}
      >
        <div>
          <div className="oj-lbl" style={{ color: "var(--roxo)" }}>
            Assistente de estoque
          </div>
          <div className="oj-nome" style={{ marginTop: 4 }}>
            {sugestoes.length
              ? `${sugestoes.length} peça(s) para repor antes de acabar`
              : "Nada urgente para repor"}
          </div>
        </div>
        <div className="oj-dir" style={{ color: "var(--tinta-cl)" }}>
          {aberto ? "−" : "+"}
        </div>
      </div>

      {aberto && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--linha)" }}>
          {sugestoes.map((x) => (
            <div className="oj-item" key={x.codigo}>
              <span className="oj-cod">{x.codigo}</span>
              <div style={{ minWidth: 0 }}>
                <div className="oj-nome">{x.nome}</div>
                <div className="oj-meta">
                  Sai {x.porMes.toFixed(1)}/mês · restam {x.emEstoque} ·{" "}
                  {x.meses < 0.5 ? (
                    <span style={{ color: "var(--alerta)" }}>acaba em dias</span>
                  ) : (
                    `dura ~${(x.meses * 30).toFixed(0)} dias`
                  )}
                </div>
                {x.peca.banho && <span className="oj-var">{x.peca.banho}</span>}
              </div>
              <div className="oj-dir">
                <div className="oj-preco" style={{ color: "var(--roxo)" }}>
                  {Math.max(1, Math.ceil(x.porMes * 2 - x.emEstoque))}
                </div>
                <div className="oj-meta">comprar</div>
              </div>
            </div>
          ))}

          {rankFornecedor.length > 0 && (
            <>
              <div className="oj-lbl" style={{ marginTop: 16 }}>
                Seus fornecedores
              </div>
              {rankFornecedor.map((f) => (
                <div className="oj-item" key={f.nome}>
                  <div>
                    <div className="oj-nome">{f.nome}</div>
                    <div className="oj-meta">
                      {f.entradas} romaneio(s) · {f.itens} código(s)
                    </div>
                  </div>
                  <div className="oj-dir">
                    <div className="oj-preco">{brl(f.total)}</div>
                    <div className="oj-meta">comprado</div>
                  </div>
                </div>
              ))}
            </>
          )}

          <div className="oj-meta" style={{ marginTop: 12, lineHeight: 1.55 }}>
            A sugestão vem da sua própria velocidade de venda nos últimos 90 dias, com
            estoque para dois meses. É estimativa, não garantia — use como ponto de
            partida do próximo pedido.
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- estoque ---------------- */
/* Editor de peça: serve tanto para editar uma existente quanto para incluir
   uma nova manualmente. Permite trocar até 4 fotos. */
function EditorPeca({ peca, onSalvar, onFechar, colecoes, criarColecao, tema = "claro", fornecedores = [] }) {
  const novo = !peca.id;
  // "Cadastro manual" é só o rótulo padrão de quem não escolheu ninguém — no formulário fica em branco.
  const nomesForn = fornecedores.map((x) => (typeof x === "string" ? x : x?.nome)).filter(Boolean);
  const fornInicial = peca.fornecedor && peca.fornecedor !== "Cadastro manual" ? peca.fornecedor : "";
  const [outroForn, setOutroForn] = useState(!!fornInicial && !nomesForn.includes(fornInicial));
  const [textoOutro, setTextoOutro] = useState(!!fornInicial && !nomesForn.includes(fornInicial) ? fornInicial : "");
  const [f, setF] = useState({
    nome: peca.nome || "",
    codigo: peca.codigo || "",
    qtd: peca.qtd ?? 1,
    custo: peca.custo ?? 0,
    venda: peca.venda ?? 0,
    banho: peca.banho || "",
    pedra: peca.pedra || "",
    acabamento: peca.acabamento || "",
    tamanho: peca.tamanho || "",
    fotos: peca.fotos || [],
    colecaoId: peca.colecaoId || "",
    fornecedor: fornInicial,
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [novaColecaoInput, setNovaColecaoInput] = useState(false);
  const [nomeNovaColecao, setNomeNovaColecao] = useState("");
  const [criandoColecao, setCriandoColecao] = useState(false);
  const [erroColecao, setErroColecao] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const criarColecaoInline = async () => {
    if (!nomeNovaColecao.trim()) return;
    setCriandoColecao(true);
    setErroColecao("");
    try {
      const nova = await criarColecao(nomeNovaColecao.trim());
      set("colecaoId", nova.id);
      setNovaColecaoInput(false);
      setNomeNovaColecao("");
    } catch (e) {
      setErroColecao(e.message || "Não consegui criar a coleção. Tente de novo.");
    } finally {
      setCriandoColecao(false);
    }
  };

  const addFoto = async (e) => {
    const arqs = [...(e.target.files || [])].slice(0, 4 - f.fotos.length);
    for (const arq of arqs) {
      try {
        const comprimida = await comprimirImagem(arq);
        setF((x) => ({ ...x, fotos: [...x.fotos, comprimida].slice(0, 4) }));
      } catch {}
    }
  };
  const removeFoto = (i) => setF((x) => ({ ...x, fotos: x.fotos.filter((_, k) => k !== i) }));

  const salvar = async () => {
    if (!f.nome.trim() && !f.codigo.trim()) {
      setErro("Dê ao menos um nome ou um código para a peça.");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      await onSalvar({
        ...(peca.id ? { id: peca.id } : {}),
        ...f,
        nome: f.nome.trim() || f.codigo.trim(),
        codigo: f.codigo.trim() || f.nome.trim(),
        qtd: Math.max(0, parseInt(f.qtd) || 0),
        custo: Number(f.custo) || 0,
        venda: Number(f.venda) || 0,
      });
    } catch (e) {
      setErro(e.message || "Não consegui salvar. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  };

  const BANHOS = ["Ouro 24k", "Ouro 18k", "Ouro 10k", "Ouro rosé", "Ródio branco", "Ródio negro", "Prata 925"];

  return createPortal(
    <div className="oj oj-portal-editor" data-theme={tema}>
      <div className="oj-fundo oj-fundo-editor" onClick={onFechar}>
      <div className="oj-modal oj-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="oj-editor-cabecalho">
          <h3>{novo ? "Incluir produto" : "Editar produto"}</h3>
        </div>
        <div className="oj-editor-scroll">

        {erro && <div className="oj-erro" style={{ margin: "8px 0" }}>{erro}</div>}

        {/* fotos */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 16px" }}>
          {f.fotos.map((src, i) => (
            <div key={i} style={{ position: "relative" }}>
              <span style={{ display: "block", width: 60, height: 60, borderRadius: 10, background: `url(${src}) center/cover` }} />
              <button
                onClick={() => removeFoto(i)}
                style={{
                  position: "absolute", top: -6, right: -6, width: 22, height: 22,
                  borderRadius: "50%", border: "none", background: "var(--alerta)",
                  color: "#fff", fontSize: 13, cursor: "pointer", lineHeight: 1,
                }}
                aria-label="Remover foto"
              >
                ×
              </button>
            </div>
          ))}
          {f.fotos.length < 4 && (
            <label
              style={{
                width: 60, height: 60, borderRadius: 10, border: "1px dashed var(--linha)",
                display: "grid", placeItems: "center", cursor: "pointer", color: "var(--tinta-cl)",
                fontSize: 22,
              }}
            >
              +
              <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={addFoto} />
            </label>
          )}
        </div>

        <div className="oj-campo">
          <label>Nome</label>
          <input className="oj-in" value={f.nome} onChange={(e) => set("nome", e.target.value)} />
        </div>
        <div className="oj-campo">
          <label>Código</label>
          <input className="oj-in" value={f.codigo} onChange={(e) => set("codigo", e.target.value)} />
        </div>

        <div className="oj-campo">
          <label>Fornecedor</label>
          <div className="oj-chips">
            {nomesForn.map((n) => (
              <button
                key={n}
                type="button"
                className="oj-chip"
                aria-pressed={f.fornecedor === n && !outroForn}
                data-on={f.fornecedor === n && !outroForn ? "1" : "0"}
                onClick={() => {
                  setOutroForn(false);
                  setTextoOutro("");
                  set("fornecedor", f.fornecedor === n ? "" : n);
                }}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className="oj-chip"
              aria-pressed={outroForn}
              data-on={outroForn ? "1" : "0"}
              onClick={() => {
                if (outroForn) {
                  setOutroForn(false);
                  setTextoOutro("");
                  set("fornecedor", "");
                } else {
                  setOutroForn(true);
                  set("fornecedor", textoOutro);
                }
              }}
            >
              + Outro
            </button>
          </div>
          {outroForn && (
            <input
              className="oj-in"
              autoFocus
              aria-label="Nome do fornecedor"
              placeholder="Nome do fornecedor"
              value={textoOutro}
              onChange={(e) => {
                setTextoOutro(e.target.value);
                set("fornecedor", e.target.value);
              }}
            />
          )}
          <div className="oj-meta" style={{ marginTop: 6 }}>
            Quem te vendeu esta peça — aparece na lista do estoque.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div className="oj-campo" style={{ flex: 1 }}>
            <label>Quantidade</label>
            <input className="oj-in" type="number" inputMode="numeric" value={f.qtd} onChange={(e) => set("qtd", e.target.value)} />
          </div>
          <div className="oj-campo" style={{ flex: 1 }}>
            <label>Custo (R$)</label>
            <input className="oj-in" type="number" inputMode="decimal" value={f.custo} onChange={(e) => set("custo", e.target.value)} />
          </div>
          <div className="oj-campo" style={{ flex: 1 }}>
            <label>Venda (R$)</label>
            <input className="oj-in" type="number" inputMode="decimal" value={f.venda} onChange={(e) => set("venda", e.target.value)} />
          </div>
        </div>

        <div className="oj-campo">
          <label>Banho</label>
          <div className="oj-chips">
            {BANHOS.map((b) => (
              <button
                key={b}
                type="button"
                className="oj-chip"
                data-on={f.banho === b ? "1" : "0"}
                onClick={() => set("banho", f.banho === b ? "" : b)}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div className="oj-campo" style={{ flex: 1 }}>
            <label>Pedra</label>
            <input className="oj-in" value={f.pedra} onChange={(e) => set("pedra", e.target.value)} />
          </div>
          <div className="oj-campo" style={{ flex: 1 }}>
            <label>Tamanho</label>
            <input className="oj-in" value={f.tamanho} onChange={(e) => set("tamanho", e.target.value)} />
          </div>
        </div>
        <div className="oj-campo">
          <label>Acabamento</label>
          <input className="oj-in" value={f.acabamento} onChange={(e) => set("acabamento", e.target.value)} />
        </div>

        <div className="oj-campo">
          <label>Coleção (opcional)</label>
          <div className="oj-meta" style={{ margin: "0 0 8px" }}>
            Agrupe peças para facilitar uma estratégia de venda — ex: "Dia das
            Mães", "Coleção Verão".
          </div>
          {!novaColecaoInput ? (
            <select
              className="oj-in"
              value={f.colecaoId || ""}
              onChange={(e) => {
                if (e.target.value === "__nova__") {
                  setNovaColecaoInput(true);
                  return;
                }
                set("colecaoId", e.target.value);
              }}
            >
              <option value="">Sem coleção</option>
              {(colecoes || []).map((col) => (
                <option key={col.id} value={col.id}>
                  {col.nome}
                </option>
              ))}
              <option value="__nova__">+ Nova coleção…</option>
            </select>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="oj-in"
                style={{ flex: 1, margin: 0 }}
                placeholder="Nome da coleção"
                value={nomeNovaColecao}
                onChange={(e) => setNomeNovaColecao(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="oj-btn mini"
                onClick={criarColecaoInline}
                disabled={criandoColecao || !nomeNovaColecao.trim()}
              >
                {criandoColecao ? "Criando…" : "Criar"}
              </button>
              <button
                type="button"
                className="oj-btn sec mini"
                onClick={() => {
                  setNovaColecaoInput(false);
                  setNomeNovaColecao("");
                }}
                disabled={criandoColecao}
              >
                Cancelar
              </button>
            </div>
          )}
          {erroColecao && <div className="oj-erro" style={{ margin: "8px 0 0" }}>{erroColecao}</div>}
        </div>

        </div>
        <div className="oj-editor-acoes">
          <button className="oj-btn" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando…" : novo ? "Incluir no estoque" : "Salvar alterações"}
          </button>
          <button className="oj-btn sec" onClick={onFechar} disabled={salvando}>Cancelar</button>
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
}

function Estoque({ d, salvarPeca, arquivarOuExcluirPeca, registrarSaidaPeca, criarColecao, dentro, abrir, tema }) {
  // Consultora só pode VER o estoque e Vender — incluir, editar, excluir
  // e registrar saída são ações da dona (é assim que o banco protege
  // isso: essas escritas em `pecas` exigem pode_escrever, que só a dona
  // atende). Sem esconder os botões, ela veria um erro confuso ao tocar.
  const ehConsultora = d.perfil?.papel === "consultora" && !d.perfil?.mestre;
  const [busca, setBusca] = useState("");
  const [saindo, setSaindo] = useState(null);
  const [banho, setBanho] = useState("");
  const [colecaoFiltro, setColecaoFiltro] = useState("");
  const [novaColecaoAberta, setNovaColecaoAberta] = useState(false);
  const [nomeNovaColecaoEstoque, setNomeNovaColecaoEstoque] = useState("");
  const [criandoColecaoEstoque, setCriandoColecaoEstoque] = useState(false);
  const [editando, setEditando] = useState(null); // peça em edição, ou {novo:true}
  const [excluindo, setExcluindo] = useState(null); // peça a confirmar exclusão
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");

  const criarColecaoNoEstoque = async () => {
    if (!nomeNovaColecaoEstoque.trim()) return;
    setCriandoColecaoEstoque(true);
    setErro("");
    try {
      const nova = await criarColecao(nomeNovaColecaoEstoque.trim());
      setColecaoFiltro(nova.id);
      setNomeNovaColecaoEstoque("");
      setNovaColecaoAberta(false);
    } catch (e) {
      setErro(e.message || "Não consegui criar a coleção. Tente de novo.");
    } finally {
      setCriandoColecaoEstoque(false);
    }
  };

  /* Excluir com regra de integridade: se a peça já tem venda ou saída no
     histórico, ela é ARQUIVADA (some da lista, mas o histórico não quebra).
     Se nunca foi movimentada, é apagada de verdade. A garantia de verdade
     é a constraint do banco — isto aqui só decide o texto do aviso. */
  const jaMovimentou = (peca) =>
    (d.vendas || []).some((v) => v.pecaId === peca.id) ||
    (d.saidas || []).some((s) => s.codigo === peca.codigo || s.pecaId === peca.id);

  const nomeColecao = (colecaoId) =>
    (d.colecoes || []).find((col) => col.id === colecaoId)?.nome;

  const confirmarExclusao = async (peca) => {
    setProcessando(true);
    setErro("");
    try {
      await arquivarOuExcluirPeca(peca, jaMovimentou(peca));
      setExcluindo(null);
    } catch (e) {
      setErro(e.message || "Não consegui concluir agora. Tente de novo.");
    } finally {
      setProcessando(false);
    }
  };

  const salvarEdicao = async (dadosPeca) => {
    setErro("");
    try {
      await salvarPeca(dadosPeca);
      setEditando(null);
    } catch (e) {
      // Deixa o próprio modal (EditorPeca) mostrar o erro — ele também
      // captura esta rejeição — em vez do aviso daqui, que ficaria
      // escondido atrás do modal ainda aberto.
      throw e;
    }
  };
  const lista = d.estoque
    .filter((p) => !p.arquivada && p.qtd > 0)
    .filter((p) =>
      (p.codigo + " " + p.nome + " " + (p.banho || "") + " " + (p.acabamento || "") + " " + (p.fornecedor || ""))
        .toLowerCase()
        .includes(busca.toLowerCase())
    )
    .filter((p) => !banho || p.banho === banho)
    .filter((p) => !colecaoFiltro || p.colecaoId === colecaoFiltro)
    .filter((p) => dentro(p.entradaEm));

  const banhosUsados = [...new Set(d.estoque.filter((p) => p.qtd > 0).map((p) => p.banho).filter(Boolean))];

  const saida = async (peca, motivo) => {
    setProcessando(true);
    setErro("");
    try {
      await registrarSaidaPeca(peca, motivo);
      setSaindo(null);
    } catch (e) {
      setErro(e.message || "Não consegui registrar a saída. Tente de novo.");
    } finally {
      setProcessando(false);
    }
  };

  const explica = {
    "Devolução": "A cliente desistiu e devolveu a peça.",
    "Troca": "Ela trocou por outro modelo.",
    "Defeito": "A peça veio com problema do fornecedor.",
    "Garantia": "Peça substituída dentro da garantia.",
    "Cortesia": "Você presenteou ou usou como brinde.",
  };

  return (
    <>
      <Recompra d={d} />

      <div className="oj-estoque-acoes">
        {!ehConsultora && (
          <button
            className="oj-btn mini"
            disabled={somenteLeitura(d.perfil)}
            onClick={() =>
              setEditando({
                nome: "",
                codigo: "",
                qtd: 1,
                custo: 0,
                venda: 0,
                banho: "",
                pedra: "",
                acabamento: "",
                tamanho: "",
                fotos: [],
                colecaoId: "",
              })
            }
          >
            + Cadastrar produto
          </button>
        )}
        <button
          className="oj-btn sec mini"
          disabled={somenteLeitura(d.perfil)}
          onClick={() => abrir({ tipo: "romaneio" })}
        >
          Importar romaneio
        </button>
        <button className="oj-btn sec mini" onClick={() => abrir({ tipo: "historico" })}>
          Histórico de entradas
        </button>
      </div>

      {erro && (
        <div className="oj-erro" style={{ margin: "12px 20px 0" }}>
          {erro}
        </div>
      )}

      <div style={{ padding: "12px 20px 0" }}>
        <input
          className="oj-in"
          placeholder="Buscar por código, banho, modelo ou fornecedor"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {banhosUsados.length > 0 && (
        <div className="oj-chips" style={{ padding: "12px 20px 0" }}>
          <button
            className="oj-chip"
            data-on={banho === "" ? "1" : "0"}
            onClick={() => setBanho("")}
          >
            Todos os banhos
          </button>
          {banhosUsados.map((b) => (
            <button
              key={b}
              className="oj-chip"
              data-on={banho === b ? "1" : "0"}
              onClick={() => setBanho(b)}
            >
              {b}
            </button>
          ))}
        </div>
      )}

      <div className="oj-chips" style={{ padding: "12px 20px 0", alignItems: "center" }}>
        <button
          className="oj-chip"
          data-on={colecaoFiltro === "" ? "1" : "0"}
          onClick={() => setColecaoFiltro("")}
        >
          Todas as coleções
        </button>
        {(d.colecoes || []).map((col) => (
          <button
            key={col.id}
            className="oj-chip"
            data-on={colecaoFiltro === col.id ? "1" : "0"}
            onClick={() => setColecaoFiltro(col.id)}
          >
            {col.nome}
          </button>
        ))}
        {!ehConsultora && (
          <button
            className="oj-chip"
            data-on={novaColecaoAberta ? "1" : "0"}
            onClick={() => setNovaColecaoAberta(true)}
            style={{ borderStyle: "dashed" }}
          >
            + Nova coleção
          </button>
        )}
      </div>

      {!ehConsultora && novaColecaoAberta && (
        <div style={{ display: "flex", gap: 8, padding: "10px 20px 0" }}>
          <input
            className="oj-in"
            style={{ flex: 1, margin: 0 }}
            placeholder="Nome da coleção — ex: Dia das Mães"
            value={nomeNovaColecaoEstoque}
            onChange={(e) => setNomeNovaColecaoEstoque(e.target.value)}
            autoFocus
          />
          <button
            className="oj-btn mini"
            onClick={criarColecaoNoEstoque}
            disabled={criandoColecaoEstoque || !nomeNovaColecaoEstoque.trim()}
          >
            {criandoColecaoEstoque ? "Criando…" : "Criar"}
          </button>
          <button
            className="oj-btn sec mini"
            onClick={() => {
              setNovaColecaoAberta(false);
              setNomeNovaColecaoEstoque("");
            }}
            disabled={criandoColecaoEstoque}
          >
            Cancelar
          </button>
        </div>
      )}

      {lista.length > 0 && (
        <div className="oj-card">
          <div className="oj-uso">
            <span className="oj-lbl">
              {lista.reduce((s, p) => s + p.qtd, 0)} peça(s) · {lista.length} código(s)
            </span>
          </div>
          <div className="oj-uso" style={{ marginTop: 10 }}>
            <span>Valor em custo</span>
            <b style={{ marginLeft: "auto" }}>
              {brl(lista.reduce((s, p) => s + p.qtd * p.custo, 0))}
            </b>
          </div>
          <div className="oj-uso" style={{ marginTop: 4 }}>
            <span>Se vender tudo</span>
            <b style={{ marginLeft: "auto", color: "var(--dourado)" }}>
              {brl(lista.reduce((s, p) => s + p.qtd * p.venda, 0))}
            </b>
          </div>
        </div>
      )}

      {!lista.length ? (
        <div className="oj-vazio">
          <span className="oj-serif">Nada aqui ainda</span>
          Registre um romaneio ou troque o filtro de período.
        </div>
      ) : (
        <div className="oj-card">
          {lista.map((p) => (
            <div className="oj-item" key={p.id}>
              {(p.fotos || [])[0] ? (
                <span
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 9,
                    background: `url(${p.fotos[0]}) center/cover`,
                    flex: "0 0 auto",
                  }}
                />
              ) : (
                <span className="oj-cod">{p.codigo}</span>
              )}
              <div style={{ minWidth: 0 }}>
                <div className="oj-nome">{p.nome}</div>
                <div className="oj-meta">
                  {p.qtd} un · custo {brl(p.custo)} ·{" "}
                  {dias(p.entradaEm) > 60 ? (
                    <span style={{ color: "var(--alerta)" }}>
                      {dias(p.entradaEm)} dias parada
                    </span>
                  ) : (
                    `há ${dias(p.entradaEm)} dias`
                  )}
                </div>
                <div>
                  {p.fornecedor && p.fornecedor !== "Cadastro manual" && (
                    <span className="oj-var" style={{ fontWeight: 600 }}>
                      Fornecedor: {p.fornecedor}
                    </span>
                  )}
                  {[p.banho, p.pedra, p.acabamento, p.tamanho]
                    .filter((x) => x && x !== "—")
                    .map((x) => (
                      <span className="oj-var" key={x}>
                        {x}
                      </span>
                    ))}
                  {nomeColecao(p.colecaoId) && (
                    <span className="oj-var" style={{ color: "var(--rose-esc)", fontWeight: 600 }}>
                      ✦ {nomeColecao(p.colecaoId)}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                  <button
                    className="oj-btn mini"
                    disabled={somenteLeitura(d.perfil)}
                    onClick={() => abrir({ tipo: "baixa", peca: p })}
                  >
                    Vender
                  </button>
                  {!ehConsultora && (
                    <>
                      <button
                        className="oj-btn sec mini"
                        onClick={() => setSaindo(p)}
                      >
                        Registrar saída
                      </button>
                      <button
                        className="oj-btn sec mini"
                        disabled={somenteLeitura(d.perfil)}
                        onClick={() => setEditando(p)}
                        aria-label="Editar"
                      >
                        Editar
                      </button>
                      <button
                        className="oj-btn sec mini"
                        disabled={somenteLeitura(d.perfil)}
                        onClick={() => setExcluindo(p)}
                        style={{ color: "var(--alerta)" }}
                        aria-label="Excluir"
                      >
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="oj-dir">
                <div className="oj-preco">{brl(p.qtd * p.venda)}</div>
                <div className="oj-meta">
                  {p.qtd} × {brl(p.venda)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <EditorPeca
          peca={editando}
          onSalvar={salvarEdicao}
          onFechar={() => setEditando(null)}
          colecoes={d.colecoes}
          criarColecao={criarColecao}
          tema={tema}
          fornecedores={d.perfil?.fornecedores || []}
        />
      )}

      {excluindo && (
        <div className="oj-fundo" onClick={() => setExcluindo(null)}>
          <div className="oj-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Excluir esta peça?</h3>
            <div className="oj-meta" style={{ marginBottom: 16 }}>
              {excluindo.nome} · {excluindo.codigo}
            </div>
            {jaMovimentou(excluindo) ? (
              <div
                className="oj-aviso"
                style={{ margin: "0 0 16px" }}
              >
                Esta peça já tem venda ou saída registrada. Para não quebrar seu
                histórico, ela será <b>arquivada</b> — some da lista de estoque, mas
                seus números do passado continuam certos.
              </div>
            ) : (
              <div className="oj-meta" style={{ marginBottom: 16 }}>
                Esta peça nunca foi movimentada, então será apagada de vez.
              </div>
            )}
            <button
              className="oj-btn"
              style={{ background: "var(--alerta)" }}
              onClick={() => confirmarExclusao(excluindo)}
              disabled={processando}
            >
              {processando
                ? "Um instante…"
                : jaMovimentou(excluindo)
                ? "Arquivar peça"
                : "Apagar peça"}
            </button>
            <button className="oj-btn sec" onClick={() => setExcluindo(null)} disabled={processando}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {saindo && (
        <div className="oj-fundo" onClick={() => setSaindo(null)}>
          <div className="oj-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Por que a peça saiu?</h3>
            <div className="oj-meta" style={{ marginBottom: 16 }}>
              {saindo.nome} · {saindo.codigo}
            </div>
            {MOTIVOS_SAIDA.map((m) => (
              <button
                key={m}
                className="oj-btn sec"
                style={{ marginBottom: 8, textAlign: "left", padding: "13px 14px" }}
                onClick={() => saida(saindo, m)}
                disabled={processando}
              >
                <b>{m}</b>
                <br />
                <span style={{ fontSize: 12, opacity: 0.75 }}>{explica[m]}</span>
              </button>
            ))}
            <button className="oj-btn" onClick={() => setSaindo(null)} disabled={processando}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- baixa de venda ---------------- */
function EscolherVenda({ d, aoEscolher, fechar }) {
  const [busca, setBusca] = useState("");
  const emEstoque = (d.estoque || []).filter((p) => p.qtd > 0 && !p.arquivada);
  const termo = busca.trim().toLowerCase();
  const filtradas = termo
    ? emEstoque.filter(
        (p) =>
          (p.codigo || "").toLowerCase().includes(termo) ||
          (p.nome || "").toLowerCase().includes(termo)
      )
    : emEstoque;

  return (
    <div className="oj-fundo" onClick={fechar}>
      <div className="oj-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>Qual peça você vendeu?</h3>
          <button className="oj-senha-olho" onClick={fechar} aria-label="Fechar" style={{ position: "static" }}>×</button>
        </div>
        <div className="oj-sub" style={{ marginBottom: 14 }}>Busca pelo código ou nome e toca pra vender.</div>

        <input
          className="oj-in"
          value={busca}
          autoFocus
          placeholder="Ex: AN-1042 ou anel solitário"
          onChange={(e) => setBusca(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        {emEstoque.length === 0 ? (
          <div className="oj-vazio" style={{ padding: "24px 8px" }}>
            Você ainda não tem peças em estoque. Cadastra as peças que chegaram primeiro.
          </div>
        ) : filtradas.length === 0 ? (
          <div className="oj-meta" style={{ textAlign: "center", padding: "20px 0" }}>
            Nenhuma peça encontrada com “{busca}”.
          </div>
        ) : (
          <div style={{ maxHeight: "50vh", overflowY: "auto", margin: "0 -4px" }}>
            {filtradas.slice(0, 40).map((p) => (
              <button
                key={p.id}
                onClick={() => aoEscolher(p)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  background: "none", border: "none", borderBottom: "1px solid var(--linha)",
                  padding: "12px 4px", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: p.fotos?.[0] ? `url(${p.fotos[0]}) center/cover` : "var(--bege-2)",
                  }}
                />
                <span className="oj-cod">{p.codigo}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="oj-nome" style={{ display: "block" }}>{p.nome}</span>
                  <span className="oj-meta">{p.qtd} em estoque</span>
                </span>
                <span className="oj-preco" style={{ color: "var(--dourado)" }}>{brl(p.venda)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BaixaVenda({ peca, d, registrarVenda, fechar }) {
  const [valor, setValor] = useState(String(peca.venda));
  const [qtd, setQtd] = useState(1);
  const formasAceitas =
    d.perfil.formas && d.perfil.formas.length ? d.perfil.formas : MODALIDADES;
  const [modalidade, setModalidade] = useState(formasAceitas[0] || "Dinheiro");
  const [cliente, setCliente] = useState("");
  const cons = d.consultoras || [];
  // Quando quem está vendendo é a própria consultora (não a dona), a
  // venda só pode ser registrada em nome dela mesma — é assim que o
  // banco autoriza (registrar_venda só aceita a consultora vendendo
  // para si). Por isso trava a escolha, em vez de deixar ela escolher
  // (e levar um erro de permissão sem entender o motivo).
  const ehConsultora = d.perfil?.papel === "consultora" && !d.perfil?.mestre;
  const [consultoraId, setConsultoraId] = useState(
    ehConsultora ? d.perfil?.consultoraId || "" : cons[0]?.id || ""
  );
  const [prazoDias, setPrazoDias] = useState(30);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const confirmar = async () => {
    /* Checagem no cliente é só pra UX rápida — quem garante mesmo é o
       banco (a função registrar_venda trava a linha da peça). */
    const atual = d.estoque.find((x) => x.id === peca.id);
    if (!atual || atual.qtd < qtd) {
      setErro("Estoque insuficiente. Feche e atualize a tela.");
      return;
    }
    setErro("");
    setEnviando(true);
    try {
      await registrarVenda({
        pecaId: peca.id,
        codigo: peca.codigo,
        nome: peca.nome,
        qtd,
        valor: Number(valor) * qtd,
        custo: peca.custo * qtd,
        modalidade,
        cliente: cliente.trim(),
        consultoraId: consultoraId || null,
        pago: modalidade !== CONFIANCA,
        cobrarEm:
          modalidade === CONFIANCA
            ? new Date(Date.now() + prazoDias * 864e5).toISOString()
            : null,
        data: hoje(),
      });
      fechar();
    } catch (e) {
      setErro(e.message || "Não consegui registrar a venda. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="oj-fundo" onClick={fechar}>
      <div className="oj-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{peca.nome}</h3>
        <div className="oj-meta" style={{ marginBottom: 16 }}>
          {peca.codigo} · {peca.qtd} em estoque · custo {brl(peca.custo)}
        </div>

        {erro && <div className="oj-erro" style={{ margin: "0 0 14px" }}>{erro}</div>}

        <div className="oj-campo">
          <label>Preço de venda, por peça</label>
          <input
            className="oj-in"
            type="number"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>

        <div className="oj-campo">
          <label>Quantidade</label>
          <div className="oj-chips">
            {Array.from({ length: Math.min(peca.qtd, 6) }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className="oj-chip"
                data-on={qtd === n ? "1" : "0"}
                onClick={() => setQtd(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="oj-campo">
          <label>Como ela pagou</label>
          <div className="oj-chips">
            {(d.perfil.formas && d.perfil.formas.length
              ? MODALIDADES.filter((m) => d.perfil.formas.includes(m))
              : MODALIDADES
            ).map((m) => (
              <button
                key={m}
                className="oj-chip"
                data-on={modalidade === m ? "1" : "0"}
                onClick={() => setModalidade(m)}
                style={
                  modalidade === m
                    ? {
                        borderColor: corPagamento(m),
                        color: corPagamento(m),
                        background: "#fff",
                      }
                    : undefined
                }
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: corPagamento(m),
                    marginRight: 6,
                  }}
                />
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="oj-campo">
          <label>
            Cliente {modalidade === CONFIANCA ? "(necessário para cobrar depois)" : "(opcional)"}
          </label>
          <input
            className="oj-in"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Nome de quem levou"
          />
        </div>

        {!ehConsultora && cons.length > 1 && (
          <div className="oj-campo">
            <label>Quem vendeu</label>
            <div className="oj-chips">
              {cons.map((c) => (
                <button
                  key={c.id}
                  className="oj-chip"
                  data-on={consultoraId === c.id ? "1" : "0"}
                  onClick={() => setConsultoraId(c.id)}
                >
                  {c.nome}
                  {c.comissao ? ` · ${c.comissao}%` : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        {modalidade === CONFIANCA && (
          <div className="oj-campo">
            <label>Quando você pode cobrar</label>
            <div className="oj-chips">
              {[
                [15, "Em 15 dias"],
                [30, "Em 30 dias"],
                [45, "Em 45 dias"],
              ].map(([n, r]) => (
                <button
                  key={n}
                  className="oj-chip"
                  data-on={prazoDias === n ? "1" : "0"}
                  onClick={() => setPrazoDias(n)}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="oj-meta" style={{ marginTop: 8 }}>
              O app te lembra na data. Combinar prazo evita constrangimento depois.
            </div>
          </div>
        )}

        <button
          className="oj-btn"
          disabled={(modalidade === CONFIANCA && !cliente.trim()) || enviando}
          onClick={confirmar}
        >
          {enviando ? "Registrando…" : `Registrar venda de ${brl(Number(valor) * qtd)}`}
        </button>
        <button className="oj-btn sec" style={{ marginTop: 8 }} onClick={fechar} disabled={enviando}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ---------------- romaneio (leitura por IA) ---------------- */
function Romaneio({ d, recarregar, criarColecao, fechar }) {
  const [etapa, setEtapa] = useState("envio"); // envio | lendo | conferencia
  const [itens, setItens] = useState([]);
  // Normaliza fornecedores: aceita tanto strings (formato antigo) quanto
  // objetos {nome, margem} (formato novo).
  const listaForn = (d.perfil.fornecedores || []).map((x) =>
    typeof x === "string" ? { nome: x, margem: d.perfil.margem || "100" } : x
  );
  const [fornIdx, setFornIdx] = useState(0);
  const [novoForn, setNovoForn] = useState(false);
  const [nfNome, setNfNome] = useState("");
  const [nfMargem, setNfMargem] = useState("100");
  const fornAtual = listaForn[fornIdx] || { nome: "", margem: d.perfil.margem || "100" };
  const [fornecedor, setFornecedor] = useState(fornAtual.nome);
  const [margem, setMargem] = useState(fornAtual.margem);
  const [colecaoId, setColecaoId] = useState("");
  const [novaColecaoInput, setNovaColecaoInput] = useState(false);
  const [nomeNovaColecao, setNomeNovaColecao] = useState("");
  const [criandoColecao, setCriandoColecao] = useState(false);
  const [erro, setErro] = useState("");
  const [arquivo, setArquivo] = useState(null);
  const [arquivoFile, setArquivoFile] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const inputRef = useRef();

  const criarColecaoNoRomaneio = async () => {
    if (!nomeNovaColecao.trim()) return;
    setCriandoColecao(true);
    setErro("");
    try {
      const nova = await criarColecao(nomeNovaColecao.trim());
      setColecaoId(nova.id);
      setNomeNovaColecao("");
      setNovaColecaoInput(false);
    } catch (e) {
      setErro(e.message || "Não consegui criar a coleção. Tente de novo.");
    } finally {
      setCriandoColecao(false);
    }
  };

  const ler = async (file) => {
    setArquivo(file.name);
    setArquivoFile(file);
    setEtapa("lendo");
    setErro("");
    try {
      // Leitura pela Edge Function (usa a chave da OpenAI, protegida no servidor).
      // Nada de chave no navegador; nada entra no estoque sem conferência.
      const resposta = await dados.lerRomaneio(d.lojaId, file);
      const lidos = resposta?.itens || [];
      if (!Array.isArray(lidos) || !lidos.length)
        throw new Error("Nenhum item encontrado");

      setItens(
        lidos.map((x) => ({
          ...x,
          id: id(),
          qtd: Number(x.qtd) || 0,
          custo: Number(x.custo) || 0,
          banho: casarOpcao(x.banho, BANHOS),
          pedra: casarOpcao(x.pedra, PEDRAS),
          acabamento: casarOpcao(x.acabamento, ACABAMENTOS),
          tamanho: casarOpcao(x.tamanho, TAMANHOS),
          // o preço de venda já nasce calculado com a margem do fornecedor (ajusta-se à mão, peça a peça)
          venda: precoComMargem(Number(x.custo) || 0, margem),
          vendaAuto: true,
          revisar:
            x.revisar ?? (!x.codigo || !Number(x.qtd) || !Number(x.custo)),
        }))
      );
      if (resposta?.aviso) setErro(resposta.aviso);
      setEtapa("conferencia");
    } catch (e) {
      setErro(
        e?.message ||
          "Não consegui ler este romaneio. Tente uma foto mais reta e bem iluminada, ou cadastre os itens manualmente."
      );
      setEtapa("envio");
    }
  };

  const aplicarMargem = () =>
    setItens(
      itens.map((i) => ({
        ...i,
        venda: precoComMargem(i.custo, margem),
        vendaAuto: true,
      }))
    );

  // mexer no custo recalcula a venda enquanto ela ainda é a calculada; editar a venda à mão trava o valor
  const edit = (iid, campo, v) =>
    setItens(
      itens.map((i) => {
        if (i.id !== iid) return i;
        const novo = { ...i, [campo]: v };
        if (campo === "custo" && i.vendaAuto) novo.venda = precoComMargem(v, margem);
        if (campo === "venda") novo.vendaAuto = false;
        return novo;
      })
    );

  const manual = () => {
    setItens([{ id: id(), codigo: "", nome: "", qtd: 1, custo: 0, venda: 0, vendaAuto: true, revisar: true }]);
    setEtapa("conferencia");
  };

  const confirmar = async () => {
    const validos = itens.filter((i) => i.codigo && i.qtd > 0);
    if (!validos.length) {
      setErro("Adicione ao menos um item válido antes de confirmar.");
      return;
    }
    setSalvando(true);
    setErro("");
    let caminhoArquivo = null;
    try {
      if (arquivoFile) {
        try {
          caminhoArquivo = await dados.enviarArquivo(
            "romaneios",
            d.lojaId,
            arquivoFile,
            `${Date.now()}-${arquivoFile.name}`
          );
        } catch (e) {
          console.error("Falha ao enviar o arquivo do romaneio", e);
          // segue sem o arquivo anexado — não perde o registro por causa do upload
        }
      }
      await dados.salvarRomaneio(d.lojaId, {
        fornecedor,
        arquivo: caminhoArquivo,
        colecaoId: colecaoId || null,
        itens: validos.map((i) => ({
          codigo: i.codigo,
          nome: i.nome || i.codigo,
          qtd: Number(i.qtd),
          custo: Number(i.custo),
          venda: Number(i.venda) || 0,
          fotos: i.fotos || [],
          banho: i.banho || "",
          pedra: i.pedra || "",
          acabamento: i.acabamento || "",
          tamanho: i.tamanho || "",
        })),
      });
      await recarregar();
      fechar();
    } catch (e) {
      setErro(e.message || "Não consegui salvar este romaneio. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="oj-fundo" onClick={etapa === "lendo" ? undefined : fechar}>
      <div className="oj-modal" onClick={(e) => e.stopPropagation()}>
        {etapa === "envio" && (
          <>
            <h3>Cadastrar peças que chegaram</h3>
            <div className="oj-meta" style={{ marginBottom: 18 }}>
              Fotografe o papel ou envie o PDF. A leitura só preenche os campos — nada
              entra no estoque antes de você confirmar.
            </div>
            {erro && <div className="oj-erro" style={{ margin: "0 0 14px" }}>{erro}</div>}

            <div className="oj-campo">
              <label>De qual fornecedor é este romaneio?</label>
              {listaForn.length > 0 ? (
                <>
                  <div className="oj-chips">
                    {listaForn.map((forn, i) => (
                      <button
                        key={i}
                        type="button"
                        className="oj-chip"
                        data-on={fornIdx === i && !novoForn ? "1" : "0"}
                        onClick={() => {
                          setNovoForn(false);
                          setFornIdx(i);
                          setFornecedor(forn.nome);
                          setMargem(forn.margem);
                        }}
                      >
                        {forn.nome || `Fornecedor ${i + 1}`}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="oj-chip"
                      data-on={novoForn ? "1" : "0"}
                      onClick={() => setNovoForn(true)}
                      style={{ borderStyle: "dashed" }}
                    >
                      + Novo fornecedor
                    </button>
                  </div>

                  {novoForn ? (
                    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                      <input
                        className="oj-in"
                        style={{ flex: 1 }}
                        value={nfNome}
                        placeholder="Nome do novo fornecedor"
                        onChange={(e) => {
                          setNfNome(e.target.value);
                          setFornecedor(e.target.value);
                        }}
                      />
                      <div style={{ position: "relative", width: 84 }}>
                        <input
                          className="oj-in"
                          type="number"
                          min="40"
                          max="300"
                          value={nfMargem}
                          style={{ paddingRight: 22, textAlign: "right" }}
                          onChange={(e) => {
                            setNfMargem(e.target.value);
                            setMargem(e.target.value);
                          }}
                          onBlur={(e) => {
                            const v = Math.min(300, Math.max(40, Number(e.target.value) || 100));
                            setNfMargem(String(v));
                            setMargem(String(v));
                          }}
                        />
                        <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--tinta-cl)", fontSize: 13 }}>%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="oj-meta" style={{ marginTop: 8 }}>
                      Margem deste fornecedor: <b>{margem}%</b> — você ajusta cada peça na
                      próxima tela, se precisar.
                    </div>
                  )}
                </>
              ) : (
                <input
                  className="oj-in"
                  value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                  placeholder="De quem veio este pedido"
                />
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              style={{ display: "none" }}
              onChange={(e) => e.target.files[0] && ler(e.target.files[0])}
            />
            <button className="oj-btn" onClick={() => inputRef.current.click()}>
              Fotografar ou enviar PDF
            </button>
            <button className="oj-btn sec" style={{ marginTop: 8 }} onClick={manual}>
              Digitar manualmente
            </button>
            <button className="oj-btn sec" style={{ marginTop: 8 }} onClick={fechar}>
              Cancelar
            </button>
          </>
        )}

        {etapa === "lendo" && (
          <>
            <h3>Lendo seu romaneio</h3>
            <Carregando texto="Alguns segundos. Você confere tudo na próxima tela." />
          </>
        )}

        {etapa === "conferencia" && (
          <>
            <h3>Confira antes de confirmar</h3>
            <div className="oj-meta" style={{ marginBottom: 14 }}>
              {itens.length} item(ns). Corrija o que estiver errado — o estoque só muda
              quando você confirmar.
            </div>
            {erro && <div className="oj-erro" style={{ margin: "0 0 14px" }}>{erro}</div>}

            <div className="oj-card" style={{ margin: "0 0 14px" }}>
              <label className="oj-lbl">Preço de venda de todos de uma vez</label>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  className="oj-in"
                  style={{ margin: 0 }}
                  type="number"
                  value={margem}
                  onChange={(e) => setMargem(e.target.value)}
                />
                <button className="oj-btn mini" onClick={aplicarMargem}>
                  Aplicar {margem}%
                </button>
              </div>
              <div className="oj-meta" style={{ marginTop: 8 }}>
                Você ainda pode ajustar peça por peça abaixo.
              </div>

              <label className="oj-lbl" style={{ display: "block", marginTop: 14 }}>
                Banho de todas as peças deste romaneio
              </label>
              <select
                className="oj-in"
                value=""
                onChange={(e) =>
                  e.target.value &&
                  setItens(itens.map((i) => ({ ...i, banho: e.target.value })))
                }
              >
                <option value="">Escolher para aplicar em todas</option>
                {BANHOS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <label className="oj-lbl" style={{ display: "block", marginTop: 14 }}>
                Coleção destas peças (opcional)
              </label>
              {!novaColecaoInput ? (
                <select
                  className="oj-in"
                  value={colecaoId}
                  onChange={(e) => {
                    if (e.target.value === "__nova__") {
                      setNovaColecaoInput(true);
                      return;
                    }
                    setColecaoId(e.target.value);
                  }}
                >
                  <option value="">Sem coleção</option>
                  {(d.colecoes || []).map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.nome}
                    </option>
                  ))}
                  <option value="__nova__">+ Nova coleção…</option>
                </select>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="oj-in"
                    style={{ flex: 1, margin: 0 }}
                    placeholder="Nome da coleção — ex: Dia das Mães"
                    value={nomeNovaColecao}
                    onChange={(e) => setNomeNovaColecao(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="oj-btn mini"
                    onClick={criarColecaoNoRomaneio}
                    disabled={criandoColecao || !nomeNovaColecao.trim()}
                  >
                    {criandoColecao ? "Criando…" : "Criar"}
                  </button>
                  <button
                    type="button"
                    className="oj-btn sec mini"
                    onClick={() => {
                      setNovaColecaoInput(false);
                      setNomeNovaColecao("");
                    }}
                    disabled={criandoColecao}
                  >
                    Cancelar
                  </button>
                </div>
              )}
              <div className="oj-meta" style={{ marginTop: 8 }}>
                Agrupa todas as peças deste romaneio numa coleção, para facilitar uma
                estratégia de venda depois.
              </div>
            </div>

            <div className="oj-meta" style={{ margin: "0 0 10px" }}>
              O preço de venda já vem calculado com a margem de {margem}% do fornecedor. Mude a margem acima e aplique de novo, ou ajuste peça a peça.
              Banho, pedra, modelo e tamanho só vêm preenchidos quando o romaneio diz com clareza; confira antes de confirmar.
            </div>
            {itens.map((i) => (
              <div className="oj-card" key={i.id} style={{ margin: "0 0 10px" }}>
                {i.revisar && (
                  <span className="oj-tag rev" style={{ marginBottom: 8, display: "inline-block" }}>
                    Revisar
                  </span>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="oj-in"
                    style={{ margin: 0, flex: "0 0 34%" }}
                    value={i.codigo}
                    placeholder="Código"
                    onChange={(e) => edit(i.id, "codigo", e.target.value)}
                  />
                  <input
                    className="oj-in"
                    style={{ margin: 0 }}
                    value={i.nome}
                    placeholder="Descrição"
                    onChange={(e) => edit(i.id, "nome", e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label className="oj-lbl">Qtd</label>
                    <input
                      className="oj-in"
                      type="number"
                      value={i.qtd}
                      onChange={(e) => edit(i.id, "qtd", Number(e.target.value))}
                    />
                  </div>
                  <div style={{ flex: 1.3 }}>
                    <label className="oj-lbl">Custo</label>
                    <input
                      className="oj-in"
                      type="number"
                      value={i.custo}
                      onChange={(e) => edit(i.id, "custo", Number(e.target.value))}
                    />
                  </div>
                  <div style={{ flex: 1.3 }}>
                    <label className="oj-lbl">Venda</label>
                    <input
                      className="oj-in"
                      type="number"
                      value={i.venda}
                      onChange={(e) => edit(i.id, "venda", Number(e.target.value))}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <label className="oj-lbl">Fotos da peça — até 4</label>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    {[0, 1, 2, 3].map((n) => (
                      <label
                        key={n}
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius: 10,
                          border: "1.5px dashed var(--linha)",
                          background: (i.fotos || [])[n]
                            ? `url(${i.fotos[n]}) center/cover`
                            : "var(--bege-2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--tinta-cl)",
                          fontSize: 20,
                          cursor: "pointer",
                          flex: "0 0 auto",
                        }}
                      >
                        {!(i.fotos || [])[n] && "+"}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const f = e.target.files[0];
                            if (!f) return;
                            const fr = new FileReader();
                            fr.onload = () => {
                              const img = new Image();
                              img.onload = () => {
                                const L = 420;
                                const c = document.createElement("canvas");
                                c.width = L;
                                c.height = L;
                                const ctx = c.getContext("2d");
                                const lado = Math.min(img.width, img.height);
                                ctx.drawImage(
                                  img,
                                  (img.width - lado) / 2,
                                  (img.height - lado) / 2,
                                  lado,
                                  lado,
                                  0,
                                  0,
                                  L,
                                  L
                                );
                                const fotos = [...(i.fotos || [])];
                                fotos[n] = c.toDataURL("image/jpeg", 0.7);
                                edit(i.id, "fotos", fotos);
                              };
                              img.src = fr.result;
                            };
                            fr.readAsDataURL(f);
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="oj-meta" style={{ margin: "6px 0 12px" }}>
                    {(i.fotos || []).length
                      ? "A primeira foto é a que aparece na loja on-line."
                      : "Sem foto, esta peça não aparece na loja on-line. Você pode fotografar depois, em Editar loja."}
                  </div>
                  {[
                    ["banho", "Banho", BANHOS],
                    ["pedra", "Pedra", PEDRAS],
                    ["acabamento", "Modelo", ACABAMENTOS],
                    ["tamanho", "Tamanho", TAMANHOS],
                  ].map(([campo, rot, opcoes]) => (
                    <div key={campo} style={{ marginBottom: 8 }}>
                      <label className="oj-lbl">{rot}</label>
                      <select
                        className="oj-in"
                        value={i[campo] || ""}
                        onChange={(e) => edit(i.id, campo, e.target.value)}
                      >
                        <option value="">Não informar</option>
                        {opcoes.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <button
                  className="oj-btn sec mini"
                  style={{ marginTop: 8 }}
                  onClick={() => setItens(itens.filter((x) => x.id !== i.id))}
                >
                  Remover item
                </button>
              </div>
            ))}

            <button
              className="oj-btn sec"
              style={{ marginBottom: 8 }}
              onClick={() =>
                setItens([
                  ...itens,
                  { id: id(), codigo: "", nome: "", qtd: 1, custo: 0, venda: 0 },
                ])
              }
            >
              Adicionar item
            </button>
            <button className="oj-btn" onClick={confirmar} disabled={salvando}>
              {salvando ? "Salvando…" : "Confirmar entrada no estoque"}
            </button>
            <button
              className="oj-btn sec"
              style={{ marginTop: 8 }}
              onClick={fechar}
              disabled={salvando}
            >
              Cancelar — nada será salvo
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- histórico de entradas ---------------- */
function HistoricoEntradas({ d, recarregar, fechar }) {
  const [conf, setConf] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState("");

  const excluir = async (entrada) => {
    const pecas = d.estoque.filter((p) => p.entradaId === entrada.id);
    const vendidas = pecas.some((p) =>
      d.vendas.some((v) => v.pecaId === p.id)
    );
    if (vendidas) {
      setConf({ ...entrada, bloqueada: true });
      return;
    }
    setExcluindo(true);
    setErro("");
    try {
      await dados.excluirEntrada(entrada.id);
      await recarregar();
      setConf(null);
    } catch (e) {
      setErro(
        "Não consegui excluir — alguma peça desta entrada já teve saída ou passou por uma maleta. Ajuste peça por peça no estoque."
      );
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div className="oj-fundo" onClick={fechar}>
      <div className="oj-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Histórico de entradas</h3>
        <div className="oj-meta" style={{ marginBottom: 16 }}>
          Toda entrada fica gravada. Se você registrou errado, exclua aqui — as peças
          saem do estoque junto.
        </div>

        {!d.entradas.length && (
          <div className="oj-vazio">Nenhum romaneio registrado ainda.</div>
        )}

        {[...d.entradas].reverse().map((e) => (
          <div className="oj-card" key={e.id} style={{ margin: "0 0 10px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div>
                <div className="oj-nome">{e.fornecedor || "Sem fornecedor"}</div>
                <div className="oj-meta">
                  {new Date(e.data).toLocaleDateString("pt-BR")} · {e.qtdItens} itens ·{" "}
                  {e.arquivo || "digitado"}
                </div>
              </div>
              <div className="oj-dir">
                <div className="oj-preco">{brl(e.total)}</div>
              </div>
            </div>
            {conf?.id === e.id ? (
              conf.bloqueada ? (
                <div className="oj-erro" style={{ margin: "10px 0 0" }}>
                  Esta entrada já tem peças vendidas. Excluir apagaria vendas registradas
                  — ajuste as peças uma a uma no estoque.
                </div>
              ) : (
                <>
                  {erro && (
                    <div className="oj-erro" style={{ margin: "10px 0 0" }}>
                      {erro}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      className="oj-btn perigo mini"
                      onClick={() => excluir(e)}
                      disabled={excluindo}
                    >
                      {excluindo ? "Excluindo…" : "Sim, excluir tudo"}
                    </button>
                    <button
                      className="oj-btn sec mini"
                      onClick={() => setConf(null)}
                      disabled={excluindo}
                    >
                      Manter
                    </button>
                  </div>
                </>
              )
            ) : (
              <button
                className="oj-btn sec mini"
                style={{ marginTop: 10 }}
                onClick={() => setConf(e)}
              >
                Excluir esta entrada
              </button>
            )}
          </div>
        ))}

        <button className="oj-btn" style={{ marginTop: 6 }} onClick={fechar}>
          Fechar
        </button>
      </div>
    </div>
  );
}

/* Campo numérico sem zero à esquerda, com sufixo opcional (%, un, R$) */
function NumInput({ valor, aoMudar, sufixo, disabled, ...resto }) {
  const [txt, setTxt] = useState(String(valor ?? ""));
  useEffect(() => {
    if (Number(txt) !== Number(valor)) setTxt(String(valor ?? ""));
    // eslint-disable-next-line
  }, [valor]);

  const limpar = (v) => {
    let s = v.replace(/[^\d.,]/g, "").replace(",", ".");
    s = s.replace(/^0+(?=\d)/, ""); // 015 -> 15
    return s;
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        {...resto}
        className="oj-in"
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={txt}
        style={{ paddingRight: sufixo ? 40 : undefined, ...(resto.style || {}) }}
        onChange={(e) => {
          const s = limpar(e.target.value);
          setTxt(s);
          aoMudar(s === "" ? 0 : Number(s));
        }}
        onFocus={(e) => e.target.select()}
        onBlur={() => setTxt(String(Number(txt) || 0))}
      />
      {sufixo && (
        <span
          style={{
            position: "absolute",
            right: 13,
            top: "50%",
            transform: "translateY(-25%)",
            fontSize: 14,
            color: "var(--tinta-cl)",
            pointerEvents: "none",
          }}
        >
          {sufixo}
        </span>
      )}
    </div>
  );
}

/* ---------------- equipe ---------------- */
function Equipe({ d, salvar, dentro, criarConsultora, atualizarConsultora, removerConsultora, irPara }) {
  const [nome, setNome] = useState("");
  const [comissao, setComissao] = useState(15);
  const [foto, setFoto] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [removendoId, setRemovendoId] = useState(null);
  const plano = planoAtivo(d.perfil);
  const liberado = ["crescimento", "joalheria", "inteligencia"].includes(plano.id);
  const cons = d.consultoras || [];
  const vendas = d.vendas.filter((v) => dentro(v.data));

  const add = async () => {
    if (!nome.trim() || cons.length >= plano.consultoras) return;
    setErro("");
    setSalvando(true);
    try {
      await criarConsultora({ nome: nome.trim(), comissao: Number(comissao) || 0, foto });
      setNome("");
      setFoto(null);
    } catch (e) {
      setErro(e.message || "Não consegui cadastrar. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  };

  const linkConvite = (c) => {
    const base = window.location.origin + window.location.pathname;
    return `${base}?convite=${c.convite}`;
  };

  const compartilharConvite = (c) => {
    const link = linkConvite(c);
    const msg =
      `Oi ${c.nome}! Você foi adicionada como consultora da ${d.perfil.loja} no Luxi. ` +
      `Acesse por aqui para ver sua maleta e registrar suas vendas: ${link}`;
    const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(wa, "_blank", "noopener");
  };

  /* foto reduzida para não pesar o armazenamento */
  const lerFoto = (file, aplicar) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const L = 220;
        const c = document.createElement("canvas");
        c.width = L;
        c.height = L;
        const ctx = c.getContext("2d");
        const lado = Math.min(img.width, img.height);
        ctx.drawImage(
          img,
          (img.width - lado) / 2,
          (img.height - lado) / 2,
          lado,
          lado,
          0,
          0,
          L,
          L
        );
        aplicar(c.toDataURL("image/jpeg", 0.72));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  };

  const mudarComissao = async (cid, v) => {
    setErro("");
    try {
      await atualizarConsultora(cid, { comissao: Number(v) || 0 });
    } catch (e) {
      setErro(e.message || "Não consegui ajustar a comissão. Tente de novo.");
    }
  };

  const remover = async (c) => {
    const temVenda = d.vendas.some((v) => v.consultoraId === c.id);
    if (temVenda) return;
    setErro("");
    setRemovendoId(c.id);
    try {
      await removerConsultora(c);
    } catch (e) {
      setErro(e.message || "Não consegui remover. Tente de novo.");
    } finally {
      setRemovendoId(null);
    }
  };

  if (!liberado)
    return (
      <>
        <div className="oj-card">
          <div className="oj-lbl">Disponível no plano Equipe</div>
          <div className="oj-valor" style={{ fontSize: 26, marginTop: 8 }}>
            Sua equipe, organizada
          </div>
          <div className="oj-meta" style={{ marginTop: 10, lineHeight: 1.6 }}>
            Cadastre suas consultoras, defina a comissão de cada uma e saiba, em cada
            venda, quem vendeu e quanto ela tem a receber. Envie o convite pelo WhatsApp
            e ela acessa a própria maleta. Sem planilha e sem discussão no fim do mês.
          </div>
          {Object.values(LINKS_PAGAMENTO).some(Boolean) ? (
            <button
              className="oj-btn"
              style={{ marginTop: 14 }}
              onClick={() => irPara && irPara("perfil")}
            >
              Conhecer o Equipe · R$ 129,90
            </button>
          ) : (
            <div className="oj-meta" style={{ marginTop: 14 }}>
              A assinatura abre em breve — assim que abrir, você é avisada por aqui.
            </div>
          )}        </div>
      </>
    );

  const resumo = cons.map((c) => {
    const minhas = vendas.filter((v) => v.consultoraId === c.id);
    const total = minhas.reduce((s, v) => s + v.valor, 0);
    return {
      ...c,
      qtd: minhas.length,
      pecas: minhas.reduce((s, v) => s + v.qtd, 0),
      total,
      comissaoValor: (total * (c.comissao || 0)) / 100,
    };
  });
  const totalGeral = resumo.reduce((s, c) => s + c.total, 0);
  const totalComissao = resumo.reduce((s, c) => s + c.comissaoValor, 0);
  const semVendaAlgumaVez = (c) => !d.vendas.some((v) => v.consultoraId === c.id);

  return (
    <>
      <div className="oj-card">
        <div className="oj-lbl">Comissão a pagar no período</div>
        <div className="oj-valor ouro">{brl(totalComissao)}</div>
        <div className="oj-meta" style={{ marginTop: 6 }}>
          Sobre {brl(totalGeral)} vendidos por {cons.length} pessoa(s)
        </div>
      </div>

      {erro && <div className="oj-erro">{erro}</div>}

      {resumo
        .sort((a, b) => b.total - a.total)
        .map((c) => (
          <div className="oj-card" key={c.id}>
            <div className="oj-uso" style={{ alignItems: "center", gap: 10 }}>
              <Avatar nome={c.nome} foto={c.foto} />
              <span className="oj-nome">{c.nome}</span>
              <b style={{ marginLeft: "auto" }}>{brl(c.total)}</b>
            </div>
            <div className="oj-meta" style={{ marginTop: 2 }}>
              {c.qtd} venda(s) · {c.pecas} peça(s)
            </div>
            {totalGeral > 0 && (
              <div className="oj-barra">
                <i style={{ width: (c.total / totalGeral) * 100 + "%" }} />
              </div>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="oj-lbl">Comissão</label>
                <NumInput
                  valor={c.comissao}
                  sufixo="%"
                  disabled={c.dona}
                  aoMudar={(v) => mudarComissao(c.id, v)}
                />
              </div>
              <div style={{ flex: 1.2, textAlign: "right" }}>
                <div className="oj-lbl">A receber</div>
                <div className="oj-preco" style={{ color: "var(--dourado)" }}>
                  {brl(c.comissaoValor)}
                </div>
              </div>
            </div>
            {!c.dona && (
              <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                {c.vinculada ? (
                  <span className="oj-tag ok">Já acessa pelo celular dela</span>
                ) : (
                  c.convite && (
                    <button
                      className="oj-btn mini"
                      style={{ flex: 1 }}
                      onClick={() => compartilharConvite(c)}
                    >
                      Enviar convite
                    </button>
                  )
                )}
                {semVendaAlgumaVez(c) && (
                  <button
                    className="oj-btn sec mini"
                    onClick={() => remover(c)}
                    disabled={removendoId === c.id}
                  >
                    {removendoId === c.id ? "Removendo…" : "Remover"}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

      {cons.length < plano.consultoras && (
        <div className="oj-card">
          <div className="oj-lbl">Cadastrar consultora</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
            <label style={{ cursor: "pointer", flex: "0 0 auto" }}>
              <Avatar nome={nome || "?"} foto={foto} tamanho={56} />
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) =>
                  e.target.files[0] && lerFoto(e.target.files[0], setFoto)
                }
              />
            </label>
            <div style={{ flex: 1 }}>
              <input
                className="oj-in"
                style={{ marginTop: 0 }}
                placeholder="Nome de quem vende com você"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
              <div className="oj-meta" style={{ marginTop: 6 }}>
                Toque no círculo para colocar a foto dela.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label className="oj-lbl">Comissão</label>
              <NumInput valor={comissao} sufixo="%" aoMudar={(v) => setComissao(v)} />
            </div>
            <button
              className="oj-btn"
              style={{ flex: 1, marginBottom: 1 }}
              onClick={add}
              disabled={salvando || !nome.trim()}
            >
              {salvando ? "Cadastrando…" : "Cadastrar"}
            </button>
          </div>
          <div className="oj-meta" style={{ marginTop: 10 }}>
            A comissão entra automaticamente em cada venda registrada no nome dela. Dá
            para mudar a qualquer momento — o histórico já lançado não muda.
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- avatar ---------------- */
function Avatar({ nome, foto, tamanho = 42 }) {
  const iniciais = (nome || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
  return (
    <span
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: "50%",
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: foto ? `url(${foto}) center/cover` : "var(--bege-2)",
        border: "1.5px solid var(--linha)",
        color: "var(--tinta-cl)",
        fontSize: tamanho * 0.34,
        fontWeight: 600,
        overflow: "hidden",
      }}
    >
      {!foto && iniciais}
    </span>
  );
}

/* ---------------- clientes (CRM) ---------------- */
function Clientes({ d, salvar, quitarVenda, cadastrarCliente }) {
  const [aberto, setAberto] = useState(null);
  const [form, setForm] = useState(false);
  const [nc, setNc] = useState({ nome: "", telefone: "", cpf: "", endereco: "" });
  const [quitando, setQuitando] = useState(null);
  const [erro, setErro] = useState("");

  const cadastrar = async () => {
    if (!nc.nome.trim()) return;
    await cadastrarCliente({ ...nc, nome: nc.nome.trim() });
    setNc({ nome: "", telefone: "", cpf: "", endereco: "" });
    setForm(false);
  };

  // Junta clientes cadastrados + clientes que vieram das vendas.
  const mapa = {};
  (d.clientes || []).forEach((c) => {
    mapa[c.nome.trim()] = {
      nome: c.nome,
      telefone: c.telefone,
      cpf: c.cpf,
      endereco: c.endereco,
      gasto: 0,
      compras: 0,
      pecas: 0,
      devendo: 0,
      ultima: c.criadoEm,
      vendas: [],
      cadastrada: true,
    };
  });
  d.vendas
    .filter((v) => v.cliente)
    .forEach((v) => {
      const k = v.cliente.trim();
      if (!mapa[k])
        mapa[k] = { nome: k, gasto: 0, compras: 0, pecas: 0, devendo: 0, ultima: v.data, vendas: [] };
      mapa[k].gasto += v.valor;
      mapa[k].compras += 1;
      mapa[k].pecas += v.qtd;
      if (!v.pago) mapa[k].devendo += v.valor;
      if (new Date(v.data) > new Date(mapa[k].ultima || 0)) mapa[k].ultima = v.data;
      mapa[k].vendas.push(v);
    });

  const lista = Object.values(mapa).sort((a, b) => b.gasto - a.gasto);

  const quitar = async (v) => {
    setErro("");
    setQuitando(v.id);
    try {
      await quitarVenda(v);
    } catch (e) {
      setErro(e?.message || "Não deu para quitar essa venda. Tenta de novo.");
    } finally {
      setQuitando(null);
    }
  };

  const total = lista.reduce((s, c) => s + c.gasto, 0);

  const formulario = form && (
    <div className="oj-card" style={{ marginBottom: 12 }}>
      <div className="oj-lbl" style={{ marginBottom: 10 }}>Nova cliente</div>
      <div className="oj-campo">
        <label>Nome</label>
        <input className="oj-in" value={nc.nome} onChange={(e) => setNc({ ...nc, nome: e.target.value })} />
      </div>
      <div className="oj-campo">
        <label>Telefone / WhatsApp</label>
        <input className="oj-in" type="tel" inputMode="tel" value={nc.telefone} onChange={(e) => setNc({ ...nc, telefone: e.target.value })} placeholder="(00) 00000-0000" />
      </div>
      <div className="oj-campo">
        <label>CPF (opcional)</label>
        <input className="oj-in" inputMode="numeric" value={nc.cpf} onChange={(e) => setNc({ ...nc, cpf: e.target.value })} placeholder="000.000.000-00" />
      </div>
      <div className="oj-campo">
        <label>Endereço (opcional)</label>
        <input className="oj-in" value={nc.endereco} onChange={(e) => setNc({ ...nc, endereco: e.target.value })} placeholder="Para entrega" />
      </div>
      <button className="oj-btn" onClick={cadastrar} disabled={!nc.nome.trim()}>
        Salvar cliente
      </button>
      <button className="oj-btn sec" onClick={() => setForm(false)}>Cancelar</button>
    </div>
  );

  if (!lista.length)
    return (
      <>
        <div style={{ padding: "0 20px 12px" }}>
          <button className="oj-btn mini" onClick={() => setForm(true)}>
            + Cadastrar cliente
          </button>
        </div>
        {formulario}
        {!form && (
          <div className="oj-vazio">
            <span className="oj-serif">Nenhuma cliente ainda</span>
            Cadastre uma cliente aqui, ou coloque o nome dela ao registrar a venda — o
            app monta o histórico sozinho.
          </div>
        )}
      </>
    );

  return (
    <>
      <div style={{ padding: "0 20px 12px" }}>
        <button className="oj-btn mini" onClick={() => setForm(true)}>
          + Cadastrar cliente
        </button>
      </div>
      {formulario}

      {erro && <div className="oj-erro" style={{ margin: "0 20px 12px" }}>{erro}</div>}

      <div className="oj-card">
        <div className="oj-lbl">Suas clientes</div>
        <div className="oj-valor ouro">{lista.length}</div>
        <div className="oj-meta" style={{ marginTop: 6 }}>
          {brl(total)} no total · ticket médio {brl(lista.length ? total / lista.length : 0)}
        </div>
      </div>

      {lista.map((c) => (
        <div className="oj-card" key={c.nome}>
          <div
            className="oj-uso"
            style={{ alignItems: "center", gap: 10, cursor: "pointer" }}
            role="button"
            tabIndex={0}
            onClick={() => setAberto(aberto === c.nome ? null : c.nome)}
            onKeyDown={(e) => e.key === "Enter" && setAberto(c.nome)}
          >
            <Avatar nome={c.nome} />
            <div>
              <div className="oj-nome">{c.nome}</div>
              <div className="oj-meta">
                {c.compras} compra(s) · última há {dias(c.ultima)} dias
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div className="oj-preco">{brl(c.gasto)}</div>
              {c.devendo > 0 && (
                <span className="oj-tag parada">deve {brl(c.devendo)}</span>
              )}
            </div>
          </div>

          {dias(c.ultima) > 60 && (
            <div className="oj-meta" style={{ marginTop: 10, color: "var(--alerta)" }}>
              Sumiu há {dias(c.ultima)} dias. Já gastou {brl(c.gasto)} com você — vale
              uma mensagem.
            </div>
          )}

          {aberto === c.nome && (
            <div style={{ marginTop: 12, borderTop: "1px solid var(--linha)" }}>
              {c.vendas
                .slice()
                .reverse()
                .map((v) => (
                  <div className="oj-item" key={v.id}>
                    <span className="oj-cod">{v.codigo}</span>
                    <div>
                      <div className="oj-nome">{v.nome}</div>
                      <div className="oj-meta">
                        {new Date(v.data).toLocaleDateString("pt-BR")} · {v.modalidade}
                      </div>
                    </div>
                    <div className="oj-dir">
                      <div className="oj-preco">{brl(v.valor)}</div>
                      {!v.pago && (
                        <button
                          className="oj-btn sec mini"
                          style={{ marginTop: 6 }}
                          onClick={() => quitar(v)}
                          disabled={quitando === v.id}
                        >
                          {quitando === v.id ? "Quitando…" : "Recebi"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

/* ---------------- integrações ---------------- */
function Integracoes({ d, salvar }) {
  const plano = planoAtivo(d.perfil);
  const liberado = ["joalheria", "inteligencia"].includes(plano.id) || d.perfil.mestre;
  const [aba2, setAba2] = useState("planilha");

  if (!liberado)
    return (
      <div className="oj-card">
        <div className="oj-lbl">Disponível a partir do plano Escala</div>
        <div className="oj-valor" style={{ fontSize: 25, marginTop: 8 }}>
          Traga seus dados de onde eles estão
        </div>
        <div className="oj-meta" style={{ marginTop: 10, lineHeight: 1.6 }}>
          Importe estoque, clientes e histórico do seu ERP, da sua loja online ou de uma
          planilha. Em vez de cadastrar centenas de peças à mão, você começa com tudo já
          dentro — normalmente o que leva semanas passa a levar uma tarde.
        </div>
        <div className="oj-meta" style={{ marginTop: 14 }}>
          Este recurso chega junto com o plano Escala, que ainda está em preparação.
        </div>      </div>
    );

  const fontes = [
    ["planilha", "Planilha", "Excel ou CSV com suas peças", "Disponível"],
    ["erp", "ERP e sistemas de gestão", "Bling, Tiny, Omie, Gestão Joias", "Sob demanda"],
    ["loja", "Loja online", "Shopify, Nuvemshop, WooCommerce", "Sob demanda"],
    ["nf", "Nota fiscal", "XML de NF-e de entrada dos fornecedores", "Sob demanda"],
  ];

  return (
    <>
      <div className="oj-aviso">
        Toda importação passa por uma tela de conferência antes de entrar no seu estoque.
        Nada é gravado sem você aprovar — mesmo vindo de outro sistema.
      </div>

      {fontes.map(([k, t, sub, estado]) => (
        <div
          className="oj-card"
          key={k}
          data-on={aba2 === k ? "1" : "0"}
          role="button"
          tabIndex={0}
          onClick={() => setAba2(k)}
          onKeyDown={(e) => e.key === "Enter" && setAba2(k)}
          style={{ cursor: "pointer", borderColor: aba2 === k ? "var(--rose)" : undefined }}
        >
          <div className="oj-uso" style={{ alignItems: "center" }}>
            <div>
              <div className="oj-nome">{t}</div>
              <div className="oj-meta">{sub}</div>
            </div>
            <span
              className={"oj-tag " + (estado === "Disponível" ? "ok" : "rev")}
              style={{ marginLeft: "auto" }}
            >
              {estado}
            </span>
          </div>

          {aba2 === k && k === "planilha" && (
            <div style={{ marginTop: 14, borderTop: "1px solid var(--linha)", paddingTop: 14 }}>
              <div className="oj-meta" style={{ lineHeight: 1.6, marginBottom: 10 }}>
                Sua planilha precisa de quatro colunas: <b>código</b>, <b>descrição</b>,{" "}
                <b>quantidade</b> e <b>custo</b>. Banho, pedra e preço de venda são
                opcionais. Se os nomes das colunas forem diferentes, a gente identifica
                na conferência.
              </div>
              <label className="oj-btn" style={{ display: "block", textAlign: "center" }}>
                Escolher arquivo
                <input type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} />
              </label>
            </div>
          )}

          {aba2 === k && k !== "planilha" && (
            <div style={{ marginTop: 14, borderTop: "1px solid var(--linha)", paddingTop: 14 }}>
              <div className="oj-meta" style={{ lineHeight: 1.6, marginBottom: 10 }}>
                A migração é feita junto com a nossa equipe: você envia o acesso ou a
                exportação, a gente converte, confere com você e sobe. Leva de 1 a 3 dias
                úteis.
              </div>
              <button className="oj-btn sec">Pedir migração assistida</button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

/* ---------------- perfil e plano ---------------- */
/* ---------------- ajudar uma cliente que não consegue entrar (só a administradora) ---------------- */
function RedefinirSenha({ emailInicial = "" }) {
  const [email, setEmail] = useState(emailInicial);
  const [senha, setSenha] = useState("");
  const [ocupada, setOcupada] = useState(false);
  const [erro, setErro] = useState("");
  const [res, setRes] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [hist, setHist] = useState([]);

  useEffect(() => {
    if (emailInicial) {
      setEmail(emailInicial);
      setRes(null);
      setErro("");
    }
  }, [emailInicial]);
  const carregarHist = () => dados.auditoriaAdmin().then(setHist);
  useEffect(() => {
    carregarHist();
  }, []);

  const redefinir = async () => {
    setErro("");
    setRes(null);
    setCopiado(false);
    const em = email.trim().toLowerCase();
    if (!em.includes("@")) return setErro("Digite o e-mail da cliente.");
    if (senha && senha.length < 8) return setErro("A senha temporária precisa ter ao menos 8 caracteres.");
    if (!window.confirm(`Redefinir a senha de ${em}?\n\nOs acessos atuais dela serão encerrados e, ao entrar com a senha temporária, o app vai pedir que ela crie uma senha nova.`)) return;
    setOcupada(true);
    try {
      const r = await dados.redefinirSenhaCliente(em, senha.trim() || undefined);
      setRes(r);
      setSenha("");
      carregarHist();
    } catch (e) {
      setErro(e.message || "Não consegui redefinir agora. Tente de novo.");
    } finally {
      setOcupada(false);
    }
  };

  const mensagem = res
    ? `Oi! Sua senha temporária do Luxi é: ${res.senha}\n\nEntre em ${window.location.origin} com o seu e-mail e essa senha. O app vai pedir para você criar uma senha nova só sua.`
    : "";
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
    } catch (e) {
      setCopiado(false);
    }
  };

  return (
    <>
      <div className="oj-sec" id="redefinir-senha">Ajudar uma cliente a entrar</div>
      <div className="oj-card">
        <div className="oj-meta" style={{ marginBottom: 12, lineHeight: 1.55 }}>
          Se uma cliente não consegue entrar, gere uma senha temporária e envie por WhatsApp. Ao entrar, o app pede
          que ela crie uma senha só dela. Os acessos antigos dela são encerrados.
        </div>
        {erro && <div className="oj-erro" role="alert" style={{ margin: "0 0 12px" }}>{erro}</div>}
        <div className="oj-campo">
          <label>E-mail da cliente</label>
          <input
            className="oj-in"
            type="email"
            aria-label="E-mail da cliente"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setRes(null);
            }}
            placeholder="cliente@email.com"
          />
        </div>
        <div className="oj-campo">
          <label>Senha temporária (deixe em branco para o Luxi gerar uma)</label>
          <input
            className="oj-in"
            aria-label="Senha temporária"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Opcional — mínimo 8 caracteres"
            autoComplete="off"
          />
        </div>
        <button className="oj-btn" onClick={redefinir} disabled={ocupada || !email.trim()}>
          {ocupada ? "Redefinindo…" : "Gerar senha temporária"}
        </button>

        {res && (
          <div style={{ marginTop: 16 }} role="status">
            <div className="oj-lbl">Senha temporária — aparece só agora</div>
            <div
              style={{
                fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                fontSize: 24,
                letterSpacing: ".06em",
                margin: "6px 0 10px",
                wordBreak: "break-all",
                userSelect: "all",
              }}
            >
              {res.senha}
            </div>
            <div className="oj-meta" style={{ marginBottom: 12, lineHeight: 1.55 }}>
              Para {res.email}. Ela entra com essa senha e o app pede a nova.
              {res.registrado === false &&
                " Atenção: a senha foi trocada, mas não consegui marcá-la como temporária — peça que ela troque em Minha conta depois de entrar."}
            </div>
            <button className="oj-btn sec" onClick={copiar}>
              {copiado ? "Mensagem copiada ✓" : "Copiar mensagem"}
            </button>
            <button
              className="oj-btn sec"
              style={{ marginTop: 8 }}
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, "_blank", "noopener")}
            >
              Enviar pelo WhatsApp
            </button>
          </div>
        )}

        {hist.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div className="oj-lbl" style={{ marginBottom: 6 }}>Últimas redefinições</div>
            {hist.slice(0, 5).map((h, i) => (
              <div className="oj-meta" key={i} style={{ lineHeight: 1.6 }}>
                {new Date(h.quando).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                {" · "}
                {h.alvo}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- primeira entrada depois de uma redefinição: criar a senha nova ---------------- */
function NovaSenhaObrigatoria({ aoConcluir, sair }) {
  const [nova, setNova] = useState("");
  const [nova2, setNova2] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const salvar = async () => {
    setErro("");
    if (nova.length < 8) return setErro("Use ao menos 8 caracteres.");
    if (nova !== nova2) return setErro("As duas senhas não são iguais.");
    setSalvando(true);
    try {
      await dados.auth.definirNovaSenha(nova);
      aoConcluir();
    } catch (e) {
      setErro(e.message || "Não consegui salvar. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{ padding: "60px 24px", maxWidth: 520, margin: "0 auto" }} className="oja">
      <Marca size={62} animar={false} />
      <h1 className="oj-h1 oj-serif" style={{ fontSize: 30, marginTop: 18 }}>Crie a sua nova senha</h1>
      <p className="oj-sub" style={{ margin: "10px 0 22px", lineHeight: 1.6 }}>
        A sua senha foi redefinida pela equipe do Luxi. Antes de continuar, crie uma senha só sua — assim mais
        ninguém a conhece.
      </p>
      {erro && <div className="oj-erro" role="alert" style={{ margin: "0 0 14px" }}>{erro}</div>}
      <CampoSenha label="Nova senha — mínimo 8 caracteres" valor={nova} onChange={setNova} autoComplete="new-password" disabled={salvando} />
      <CampoSenha label="Repita a nova senha" valor={nova2} onChange={setNova2} onEnter={salvar} autoComplete="new-password" disabled={salvando} />
      <button className="oj-btn" onClick={salvar} disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar e continuar"}
      </button>
      <button className="oj-btn sec" style={{ marginTop: 8 }} onClick={sair} disabled={salvando}>
        Sair
      </button>
    </div>
  );
}

/* ---------------- trocar senha (cliente e administradora: é a mesma conta) ---------------- */
function TrocarSenha() {
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [nova2, setNova2] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState({ tipo: "", texto: "" });

  const fechar = () => {
    setAberto(false);
    setAtual("");
    setNova("");
    setNova2("");
  };

  const trocar = async () => {
    setMsg({ tipo: "", texto: "" });
    if (!atual) return setMsg({ tipo: "erro", texto: "Digite a sua senha atual." });
    if (nova.length < 6) return setMsg({ tipo: "erro", texto: "A nova senha precisa de ao menos 6 caracteres." });
    if (nova !== nova2) return setMsg({ tipo: "erro", texto: "As duas senhas novas não são iguais." });
    if (nova === atual) return setMsg({ tipo: "erro", texto: "A nova senha precisa ser diferente da atual." });
    setSalvando(true);
    try {
      await dados.auth.trocarSenha(atual, nova);
      fechar();
      setMsg({ tipo: "ok", texto: "Senha trocada! Use a nova senha no próximo acesso." });
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message || "Não consegui trocar a senha. Tente de novo." });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="oj-sec">Segurança</div>
      <div className="oj-card">
        {!aberto ? (
          <>
            <div className="oj-nome">Senha de acesso</div>
            <div className="oj-meta" style={{ margin: "4px 0 12px", lineHeight: 1.5 }}>
              Troque quando quiser — leva menos de um minuto.
            </div>
            {msg.tipo === "ok" && (
              <div className="oj-aviso" style={{ margin: "0 0 12px" }} role="status">{msg.texto}</div>
            )}
            <button
              className="oj-btn sec"
              onClick={() => {
                setMsg({ tipo: "", texto: "" });
                setAberto(true);
              }}
            >
              Trocar minha senha
            </button>
          </>
        ) : (
          <>
            {msg.tipo === "erro" && (
              <div className="oj-erro" style={{ margin: "0 0 12px" }} role="alert">{msg.texto}</div>
            )}
            <CampoSenha label="Senha atual" valor={atual} onChange={setAtual} autoComplete="current-password" disabled={salvando} />
            <CampoSenha label="Nova senha — mínimo 6 caracteres" valor={nova} onChange={setNova} autoComplete="new-password" disabled={salvando} />
            <CampoSenha label="Repita a nova senha" valor={nova2} onChange={setNova2} onEnter={trocar} autoComplete="new-password" disabled={salvando} />
            <button className="oj-btn" onClick={trocar} disabled={salvando}>
              {salvando ? "Trocando…" : "Salvar nova senha"}
            </button>
            <button className="oj-btn sec" style={{ marginTop: 8 }} onClick={fechar} disabled={salvando}>
              Cancelar
            </button>
          </>
        )}
      </div>
    </>
  );
}

function Perfil({ d, salvar, irPara, tema, setTema }) {
  const p = d.perfil;
  const plano = planoAtivo(p);
  const codigos = new Set(d.estoque.filter((x) => x.qtd > 0).map((x) => x.codigo)).size;

  const set = (campo, v) => salvar({ ...d, perfil: { ...p, [campo]: v } });

  const [pagando, setPagando] = useState(null); // plano em processo de pagamento
  const [abrindoPag, setAbrindoPag] = useState(false);
  const [erroPag, setErroPag] = useState("");
  const [abrindoPortal, setAbrindoPortal] = useState(false);
  const [periodoPlano, setPeriodoPlano] = useState("mensal");
  const [novaSenha, setNovaSenha] = useState("");
  const [repetirSenha, setRepetirSenha] = useState("");
  const [senhaMsg, setSenhaMsg] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  const alterarSenha = async () => {
    setSenhaMsg("");
    if (novaSenha.length < 6) return setSenhaMsg("A senha precisa ter ao menos 6 caracteres.");
    if (novaSenha !== repetirSenha) return setSenhaMsg("As senhas não são iguais.");
    setSalvandoSenha(true);
    try {
      await dados.auth.alterarSenha(novaSenha);
      setNovaSenha("");
      setRepetirSenha("");
      setSenhaMsg("Senha atualizada com segurança.");
    } catch (e) {
      setSenhaMsg(e.message || "Não consegui atualizar sua senha.");
    } finally {
      setSalvandoSenha(false);
    }
  };

  const trocar = async (pid) => {
    const link = LINKS_PAGAMENTO[pid];
    if (link) {
      // Abre o checkout da Yampi numa nova aba e mostra o aviso de confirmação.
      window.open(link, "_blank", "noopener");
      setPagando(pid);
    } else {
      // Sem link configurado ainda: registra intenção para você ativar manual.
      setPagando(pid);
    }
  };

  const [verificando, setVerificando] = useState(false);

  // Após pagar, o webhook da Yampi libera a loja sozinho. Aqui o app
  // fica verificando a nuvem até perceber a liberação — sem depender
  // de ninguém confirmar manualmente (o dono está em outro fuso).
  const verificarPagamento = async () => {
    // A liberação real acontece pelo webhook da Yampi, que ativa a
    // assinatura direto no banco (Bloco 4). Aqui só ficamos checando
    // as tabelas até perceber a liberação, sem depender de ninguém
    // confirmar manualmente.
    setVerificando(true);
    let tentativas = 0;
    const checar = async () => {
      tentativas++;
      let perfilNovo = null;
      try {
        const est = await dados.carregarTudo();
        if (est && !est.semLoja) perfilNovo = est.perfil;
      } catch (e) {
        console.error("Falha ao verificar pagamento", e);
      }
      if (perfilNovo?.assinado) {
        await salvar({ ...d, perfil: { ...p, ...perfilNovo } });
        setVerificando(false);
        setPagando(null);
        return;
      }
      if (tentativas < 20) {
        setTimeout(checar, 3000); // checa por até 1 minuto
      } else {
        setVerificando(false);
        // não liberou ainda: deixa em aguardando, o webhook libera quando cair
        await salvar({
          ...d,
          perfil: { ...p, aguardandoPagamento: pagando },
        });
        setPagando(null);
      }
    };
    checar();
  };

  const lerLogo = (file) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const L = 300;
        const c = document.createElement("canvas");
        c.width = L;
        c.height = L;
        const ctx = c.getContext("2d");
        const lado = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, L, L);
        set("logo", c.toDataURL("image/jpeg", 0.75));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  };

  return (
    <>
      <div className="oj-card">
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <label style={{ cursor: "pointer" }}>
            <Avatar nome={p.loja} foto={p.logo} tamanho={64} />
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => e.target.files[0] && lerLogo(e.target.files[0])}
            />
          </label>
          <div style={{ flex: 1 }}>
            <div className="oj-nome" style={{ fontSize: 17 }}>{p.loja}</div>
            <div className="oj-meta">{p.nome}</div>
            <div className="oj-meta" style={{ marginTop: 4 }}>
              Toque para colocar o logo da sua loja
            </div>
          </div>
        </div>
      </div>

      <div className="oj-card">
        <div className="oj-lbl">Conforto e segurança</div>
        <div className="oj-uso" style={{ marginTop: 10 }}>
          <div>
            <div className="oj-nome">Modo de uso</div>
            <div className="oj-meta">Escolha a aparência mais confortável para o seu horário.</div>
          </div>
          <ChaveTema tema={tema} setTema={setTema} />
        </div>
        <div className="oj-lbl" style={{ marginTop: 18 }}>Trocar senha</div>
        <input className="oj-in" type="password" placeholder="Nova senha" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} autoComplete="new-password" />
        <input className="oj-in" type="password" placeholder="Repita a nova senha" value={repetirSenha} onChange={(e) => setRepetirSenha(e.target.value)} autoComplete="new-password" />
        {senhaMsg && <div className={senhaMsg.includes("atualizada") ? "oj-aviso" : "oj-erro"} style={{ marginTop: 8 }}>{senhaMsg}</div>}
        <button className="oj-btn" style={{ marginTop: 10 }} onClick={alterarSenha} disabled={salvandoSenha}>
          {salvandoSenha ? "Atualizando…" : "Atualizar senha"}
        </button>
      </div>

      <div className="oj-card">
        <div className="oj-lbl">WhatsApp da loja</div>
        <div className="oj-meta" style={{ margin: "8px 0 2px", lineHeight: 1.55 }}>
          É por este número que o catálogo é enviado e que a cliente responde.
        </div>
        <input
          className="oj-in"
          inputMode="tel"
          placeholder="55 11 91234-5678"
          value={p.whatsapp || ""}
          onChange={(e) => set("whatsapp", e.target.value)}
        />
        <div className="oj-lbl" style={{ marginTop: 14 }}>Apelido da loja</div>
        <input
          className="oj-in"
          placeholder="minhaloja"
          value={p.slug || ""}
          onChange={(e) =>
            set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
          }
        />
        <div className="oj-meta" style={{ marginTop: 6 }}>
          O link para suas clientes pedirem fica em{" "}
          <button type="button" className="oj-link-sutil" style={{ display: "inline", width: "auto", minHeight: 0 }} onClick={() => irPara("catalogo")}>Loja on-line</button>.
        </div>
      </div>

      <div className="oj-card">
        <div className="oj-lbl">Seu plano</div>
        <div className="oj-uso" style={{ marginTop: 8 }}>
          <span>
            {plano.nome}
            {emTeste(p) && !p.assinado ? ` · teste, ${horasRestantes(p)}h` : ""}
          </span>
          <b style={{ marginLeft: "auto" }}>{plano.emBreve ? "Plano em breve" : <>R$ {plano.preco}/mês</>}</b>
        </div>
        {plano.limite !== Infinity && (
          <>
            <div className="oj-barra">
              <i style={{ width: Math.min(100, (codigos / plano.limite) * 100) + "%" }} />
            </div>
            <div className="oj-meta" style={{ marginTop: 6 }}>
              {codigos} de {plano.limite} códigos em uso
            </div>
          </>
        )}
      </div>

      {d.perfil?.gateway === "stripe" && d.perfil?.assinado && (
        <div className="oj-card" style={{ margin: "0 20px 14px" }}>
          <div className="oj-lbl">Sua assinatura</div>
          <div className="oj-meta" style={{ margin: "8px 0 10px", lineHeight: 1.55 }}>
            Troque o cartão, veja as faturas ou cancele quando quiser, na área segura da Stripe.
          </div>
          <button
            className="oj-btn sec"
            disabled={abrindoPortal}
            onClick={async () => {
              setErroPag(""); setAbrindoPortal(true);
              try { window.location.assign(await dados.stripePortal()); }
              catch (e) { setErroPag(e.message); setAbrindoPortal(false); }
            }}
          >
            {abrindoPortal ? "Abrindo…" : "Gerenciar assinatura"}
          </button>
          {erroPag && !pagando && <div className="oj-erro" role="alert" style={{ marginTop: 8 }}>{erroPag}</div>}
        </div>
      )}

      <div className="oj-sec">Mudar de plano</div>
      <SeletorCobranca valor={periodoPlano} onChange={setPeriodoPlano} />
      <div style={{ padding: "0 20px" }}>
        {PLANO_PUBLICOS().map((x) => (
          <CartaoPlano
            key={x.id}
            p={x}
            atual={plano.id === x.id}
            periodo={periodoPlano}
            botao={
              <button
                className="oj-btn"
                style={{ marginTop: 12 }}
                onClick={() => trocar(x.id)}
              >
                {x.valor > plano.valor ? `Assinar o ${x.nome}` : `Mudar para o ${x.nome}`}
              </button>
            }
          />
        ))}
      </div>

      <div className="oj-sec">Precisa de ajuda?</div>
      <div className="oj-card">
        <div className="oj-meta" style={{ marginBottom: 12, lineHeight: 1.55 }}>
          Dúvida, sugestão ou algo que não funcionou? Fale direto com a gente — no beta, cada
          conversa ajuda a melhorar o Luxi.
        </div>
        <button
          className="oj-btn sec"
          onClick={() =>
            window.open(linkSuporte(`Oi! Sou da loja ${d.perfil?.loja || ""} e preciso de ajuda com o Luxi.`), "_blank", "noopener")
          }
        >
          Falar no WhatsApp
        </button>
      </div>

      <TrocarSenha />

      {pagando && (
        <div className="oj-fundo" onClick={() => setPagando(null)}>
          <div className="oj-modal" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const pl = acharPlano(pagando);
              const temLink = !!LINKS_PAGAMENTO[pagando];
              return (
                <>
                  <h3 className="oj-serif">Assinar o {pl.nome}</h3>
                  <div className="oj-meta" style={{ marginBottom: 16, lineHeight: 1.6 }}>
                    {verificando ? (
                      <>Confirmando seu pagamento… isso leva alguns segundos. Pode deixar aberto.</>
                    ) : !temLink && !WHATSAPP_SUPORTE ? (
                      <>
                        Pagamento seguro por cartão de crédito, pela Stripe. A assinatura do {pl.nome} renova sozinha
                        {periodoPlano === "anual" ? " todo ano" : " todo mês"} e você cancela quando quiser em “Gerenciar assinatura”.
                      </>
                    ) : temLink ? (
                      <>
                        Abrimos o pagamento seguro numa nova aba. Pague com Pix ou cartão
                        usando <b>o mesmo e-mail do seu cadastro</b> — assim sua loja é
                        liberada automaticamente, na hora.
                      </>
                    ) : WHATSAPP_SUPORTE ? (
                      <>
                        Para ativar o {pl.nome} (R$ {pl.preco}/mês), fale com a gente pelo
                        WhatsApp que enviamos o link de pagamento.
                      </>
                    ) : (
                      <>
                        A assinatura do {pl.nome} (R$ {pl.preco}/mês) ainda não está aberta.
                        Assim que abrir, avisamos você por aqui.
                      </>
                    )}
                  </div>

                  {verificando ? (
                    <div style={{ textAlign: "center", padding: "10px 0" }}>
                      <Carregando texto="Aguardando confirmação da Yampi…" />
                    </div>
                  ) : (
                    <>
                      <button
                        className="oj-btn"
                        disabled={abrindoPag}
                        onClick={async () => {
                          setErroPag(""); setAbrindoPag(true);
                          const r = await irParaPagamento(pl, periodoPlano);
                          if (r.erro) setErroPag(r.erro);
                          setAbrindoPag(false);
                        }}
                      >
                        {abrindoPag
                          ? "Abrindo o pagamento seguro…"
                          : `Pagar com cartão · ${periodoPlano === "anual" ? `R$ ${dinheiroPlano(precoAnual(pl).total)}/ano` : `R$ ${pl.preco}/mês`}`}
                      </button>
                      {erroPag && <div className="oj-erro" role="alert" style={{ marginTop: 8 }}>{erroPag}</div>}
                      {temLink && (
                        <button
                          className="oj-btn sec"
                          style={{ marginTop: 8 }}
                          onClick={() => window.open(LINKS_PAGAMENTO[pagando], "_blank", "noopener")}
                        >
                          Outra forma de pagar (link)
                        </button>
                      )}
                      {!temLink && WHATSAPP_SUPORTE && (
                        <button
                          className="oj-btn sec"
                          style={{ marginTop: 8 }}
                          onClick={() =>
                            window.open(
                              `https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent(
                                `Oi! Quero ativar o plano ${pl.nome} do Luxi.`
                              )}`,
                              "_blank",
                              "noopener"
                            )
                          }
                        >
                          Chamar no WhatsApp
                        </button>
                      )}
                      {temLink && (
                        <button
                          className="oj-btn"
                          style={{ marginTop: 8 }}
                          onClick={verificarPagamento}
                        >
                          Já paguei
                        </button>
                      )}
                      <button className="oj-btn sec" onClick={() => setPagando(null)}>
                        Voltar
                      </button>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- gráficos ---------------- */
function Barras({ dados, titulo, sufixo = "", cor = "var(--dourado)" }) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  if (!dados.length) return null;
  return (
    <div className="oj-card">
      <div className="oj-lbl">{titulo}</div>
      <div style={{ marginTop: 12 }}>
        {dados.map((d) => (
          <div key={d.rotulo} style={{ marginBottom: 11 }}>
            <div style={{ display: "flex", fontSize: 13 }}>
              <span>{d.rotulo}</span>
              <b style={{ marginLeft: "auto" }}>
                {sufixo === "R$" ? brl(d.valor) : d.valor + sufixo}
              </b>
            </div>
            <div className="oj-barra">
              <i style={{ width: (d.valor / max) * 100 + "%", background: cor }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Rosca({ dados, titulo, mapaCores }) {
  const total = dados.reduce((s, d) => s + d.valor, 0) || 1;
  const padrao = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];
  const cor = (rotulo, i) => (mapaCores && mapaCores[rotulo]) || padrao[i % padrao.length];
  let acc = 0;
  const raio = 54, circ = 2 * Math.PI * raio;
  if (!dados.length) return null;
  return (
    <div className="oj-card">
      <div className="oj-lbl">{titulo}</div>
      <div style={{ display: "flex", gap: 18, alignItems: "center", marginTop: 12 }}>
        <svg width="140" height="140" viewBox="0 0 140 140" style={{ flex: "0 0 auto" }}>
          <circle cx="70" cy="70" r={raio} fill="none" stroke="var(--bege-2)" strokeWidth="20" />
          {dados.map((d, i) => {
            const frac = total ? d.valor / total : 0;
            const el = (
              <circle
                key={d.rotulo}
                cx="70"
                cy="70"
                r={raio}
                fill="none"
                stroke={cor(d.rotulo, i)}
                strokeWidth="20"
                strokeDasharray={`${frac * circ} ${circ}`}
                strokeDashoffset={-acc * circ}
                transform="rotate(-90 70 70)"
              />
            );
            acc += frac;
            return el;
          })}
        </svg>
        <div style={{ flex: 1 }}>
          {dados.map((d, i) => (
            <div key={d.rotulo} style={{ display: "flex", fontSize: 12.5, marginBottom: 7 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 2,
                  background: cor(d.rotulo, i),
                  marginRight: 8,
                  marginTop: 4,
                  flex: "0 0 auto",
                }}
              />
              <span>{d.rotulo}</span>
              <b style={{ marginLeft: "auto" }}>
                {(total ? (d.valor / total) * 100 : 0).toFixed(0)}%
              </b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Dashboards({ d, dentro }) {
  const vendas = d.vendas.filter((v) => dentro(v.data));
  const desp = d.despesas.filter((x) => dentro(x.data));
  const cons = d.consultoras || [];

  const agrupa = (arr, chave, valor) => {
    const m = {};
    arr.forEach((x) => {
      const k = chave(x) || "Não informado";
      m[k] = (m[k] || 0) + valor(x);
    });
    return Object.entries(m)
      .map(([rotulo, valor]) => ({ rotulo, valor }))
      .sort((a, b) => b.valor - a.valor);
  };

  const peca = (cod) => d.estoque.find((p) => p.codigo === cod) || {};

  const despCat = agrupa(desp, (x) => x.tipo, (x) => x.valor);
  const porBanho = agrupa(vendas, (v) => peca(v.codigo).banho, (v) => v.valor);
  const porModelo = agrupa(vendas, (v) => peca(v.codigo).acabamento, (v) => v.valor);
  const porModalidade = agrupa(vendas, (v) => v.modalidade, (v) => v.valor);

  /* KPIs por consultora */
  const kpis = cons
    .map((c) => {
      const suas = vendas.filter((v) => v.consultoraId === c.id);
      const receita = suas.reduce((s, v) => s + v.valor, 0);
      const custo = suas.reduce((s, v) => s + v.custo, 0);
      const comissao = suas.reduce((s, v) => s + (Number(v.comissao) || 0), 0);
      const inad = suas.filter((v) => !v.pago).reduce((s, v) => s + v.valor, 0);
      return {
        ...c,
        receita,
        vendas: suas.length,
        pecas: suas.reduce((s, v) => s + v.qtd, 0),
        ticket: suas.length ? receita / suas.length : 0,
        margem: receita ? ((receita - custo - comissao) / receita) * 100 : 0,
        inad: receita ? (inad / receita) * 100 : 0,
      };
    })
    .sort((a, b) => b.receita - a.receita);

  if (!vendas.length && !desp.length)
    return (
      <div className="oj-vazio">
        <span className="oj-serif">Sem dados no período</span>
        Registre vendas ou troque o filtro acima para ver os gráficos.
      </div>
    );

  return (
    <div className="oj-colunas">
      <Barras
        titulo="Vendas por banho"
        dados={porBanho.slice(0, 7)}
        sufixo="R$"
      />
      <Barras
        titulo="Vendas por modelo de peça"
        dados={porModelo.slice(0, 8)}
        sufixo="R$"
        cor="var(--roxo)"
      />
      <Rosca titulo="Como te pagaram" dados={porModalidade} mapaCores={CORES_PAGAMENTO} />
      <Rosca titulo="Despesas por categoria" dados={despCat} mapaCores={CORES_DESPESA} />

      {kpis.length > 0 && (
        <div className="oj-card">
          <div className="oj-lbl">Desempenho da equipe</div>
          {kpis.map((k, i) => (
            <div className="oj-item" key={k.id}>
              <span className="oj-cod">{i + 1}º</span>
              <Avatar nome={k.nome} foto={k.foto} tamanho={34} />
              <div style={{ minWidth: 0 }}>
                <div className="oj-nome">{k.nome}</div>
                <div className="oj-meta">
                  {k.vendas} venda(s) · ticket {brl(k.ticket)} · margem{" "}
                  {k.margem.toFixed(0)}%
                  {k.inad > 0 && (
                    <span style={{ color: "var(--alerta)" }}>
                      {" "}· {k.inad.toFixed(0)}% a receber
                    </span>
                  )}
                </div>
              </div>
              <div className="oj-dir">
                <div className="oj-preco">{brl(k.receita)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- maleta ---------------- */
function Maleta({ d, salvar, recarregar }) {
  const [nova, setNova] = useState(false);
  const [consultoraId, setConsultoraId] = useState("");
  const [prazo, setPrazo] = useState(30);
  const [sel, setSel] = useState({});
  const [aberta, setAberta] = useState(null);
  const [acerto, setAcerto] = useState(null);
  const [carregandoAcerto, setCarregandoAcerto] = useState(false);
  const [salvandoAcerto, setSalvandoAcerto] = useState(false);
  const [erro, setErro] = useState("");
  const [vendaAberta, setVendaAberta] = useState(null);
  const [vendaCliente, setVendaCliente] = useState("");
  const [vendaModalidade, setVendaModalidade] = useState("Dinheiro");
  const [vendaPago, setVendaPago] = useState(true);
  const [desfazerAberto, setDesfazerAberto] = useState(false);
  const [desfazerMotivo, setDesfazerMotivo] = useState("");

  const maletas = d.maletas || [];
  const cons = (d.consultoras || []).filter((c) => !c.dona);
  const disponivel = d.estoque.filter((p) => p.qtd > 0);
  const quem = (cid) => (d.consultoras || []).find((c) => c.id === cid);
  const plano = planoAtivo(d.perfil);
  const liberado = !d.perfil.mestre && ["crescimento", "joalheria", "inteligencia"].includes(plano.id);

  const abrir = async () => {
    const itens = Object.entries(sel).filter(([, q]) => q > 0).map(([pid, q]) => {
      const p = d.estoque.find((x) => x.id === pid);
      return { pecaId:p.id,codigo:p.codigo,nome:p.nome,banho:p.banho,qtd:q,custo:p.custo,venda:p.venda };
    });
    if (!consultoraId || !itens.length) return;
    try {
      if (d.lojaId) { await dados.abrirMaleta(d.lojaId, { consultoraId, prazo, itens }); await recarregar(); }
      else await salvar({...d,estoque:d.estoque.map((p)=>sel[p.id]?{...p,qtd:p.qtd-sel[p.id]}:p),maletas:[...maletas,{id:id(),consultoraId,prazo,itens,status:"aberta",abertaEm:hoje()}]});
      setNova(false); setSel({}); setConsultoraId("");
    } catch(e) { setErro(e.message || "Não consegui abrir a maleta."); }
  };

  const carregarAcerto = async (m) => {
    setErro(""); setAberta(m.id); setCarregandoAcerto(true);
    try {
      if (d.lojaId) {
        const x = await dados.maletaAcertoDados(m.id);
        setAcerto({ ...x, maleta:m });
      } else {
        const itens=[];
        m.itens.forEach((i) => { for(let u=1;u<=i.qtd;u++) itens.push({id:"local-"+i.pecaId+"-"+u,maleta_item_id:i.pecaId,unidade:u,estado:"pendente",codigo:i.codigo,nome:i.nome,custo_centavos:Math.round(i.custo*100),venda_centavos:Math.round(i.venda*100),comissao_centavos:0}); });
        setAcerto({id:"local-"+m.id,maleta_id:m.id,status:"aberto",dona_confirmou_em:null,consultora_confirmou_em:null,acerto_junto:false,itens,maleta:m});
      }
    } catch(e) { setErro(e.message || "Não consegui abrir o acerto."); }
    finally { setCarregandoAcerto(false); }
  };

  const salvarEstados = async (itens, confirma={}) => {
    setSalvandoAcerto(true); setErro("");
    try {
      if (d.lojaId) {
        await dados.salvarMaletaAcerto(acerto.maleta_id,itens.map(x=>({id:x.id,estado:x.estado,venda_id:x.venda_id||null})),!!confirma.dona,!!confirma.consultora,!!confirma.junto);
        const novo=await dados.maletaAcertoDados(acerto.maleta_id);
        setAcerto({...novo,maleta:acerto.maleta});
      } else {
        const novo={...acerto,itens,acerto_junto:confirma.junto||acerto.acerto_junto};
        if(confirma.dona) novo.dona_confirmou_em=new Date().toISOString();
        if(confirma.consultora) novo.consultora_confirmou_em=new Date().toISOString();
        setAcerto(novo);
      }
    } catch(e) { setErro(e.message || "Não consegui salvar o acerto."); }
    finally { setSalvandoAcerto(false); }
  };

  const mudarEstado = async (item, estado) => {
    if (item.venda_id && item.estado === "vendeu" && estado !== "vendeu") {
      setErro("Essa venda já foi lançada. Para mudar o acerto, use Desfazer acerto.");
      return;
    }
    const itens=acerto.itens.map(x=>x.id===item.id?{...x,estado,venda_id:estado==="vendeu"?x.venda_id:null}:x);
    await salvarEstados(itens);
  };

  const registrarVenda = async () => {
    if(!vendaAberta) return;
    setErro(""); setSalvandoAcerto(true);
    try {
      if(d.lojaId) {
        const vendaId=await dados.registrarVendaMaleta(vendaAberta.maleta_id,{pecaId:vendaAberta.pecaId,valor:vendaAberta.venda_centavos/100,modalidade:vendaModalidade,cliente:vendaCliente.trim(),pago:vendaPago});
        const itens=acerto.itens.map(x=>x.id===vendaAberta.id?{...x,estado:"vendeu",venda_id:vendaId}:x);
        await dados.salvarMaletaAcerto(acerto.maleta_id,itens.map(x=>({id:x.id,estado:x.estado,venda_id:x.venda_id||null})));
        const novo=await dados.maletaAcertoDados(acerto.maleta_id);
        setAcerto({...novo,maleta:acerto.maleta});
        if(recarregar) await recarregar();
      } else {
        const p=quem(acerto.maleta.consultoraId);
        const venda={id:id(),pecaId:vendaAberta.pecaId,codigo:vendaAberta.codigo,nome:vendaAberta.nome,qtd:1,valor:vendaAberta.venda_centavos/100,custo:vendaAberta.custo_centavos/100,modalidade:vendaModalidade,cliente:vendaCliente,pago:vendaPago,consultoraId:acerto.maleta.consultoraId,maletaId:acerto.maleta.id,data:hoje(),comissao:(vendaAberta.venda_centavos/100*(p?.comissao||0))/100};
        const itens=acerto.itens.map(x=>x.id===vendaAberta.id?{...x,estado:"vendeu",venda_id:venda.id,comissao_centavos:Math.round(venda.comissao*100)}:x);
        await salvar({...d,vendas:[...d.vendas,venda]}); setAcerto({...acerto,itens});
      }
      setVendaAberta(null); setVendaCliente("");
    } catch(e) { setErro(e.message || "Não consegui registrar a venda."); }
    finally { setSalvandoAcerto(false); }
  };

  const confirmar = async (tipo) => {
    if(tipo==="junto") await salvarEstados(acerto.itens,{dona:true,junto:true});
    else if(tipo==="dona") await salvarEstados(acerto.itens,{dona:true});
    else await salvarEstados(acerto.itens,{consultora:true});
  };

  const fecharAcerto = async () => {
    setErro(""); setSalvandoAcerto(true);
    try {
      if(d.lojaId) { await dados.fecharMaletaAcerto(acerto.maleta_id); await recarregar(); }
      else {
        if(acerto.itens.some(x=>x.estado==="pendente")) throw new Error("Ainda faltam peças para conferir.");
        await salvar({...d,maletas:maletas.map(m=>m.id===acerto.maleta_id?{...m,status:"fechada",fechadaEm:hoje()}:m)});
      }
      setAcerto(null); setAberta(null);
    } catch(e) { setErro(e.message || "Não consegui fechar o acerto."); }
    finally { setSalvandoAcerto(false); }
  };

  const desfazer = async () => {
    setSalvandoAcerto(true); setErro("");
    try {
      if(d.lojaId) { await dados.desfazerMaletaAcerto(acerto.maleta_id,desfazerMotivo); await recarregar(); }
      else await salvar({...d,maletas:maletas.map(m=>m.id===acerto.maleta_id?{...m,status:"aberta",fechadaEm:null}:m)});
      setAcerto(null); setAberta(null); setDesfazerAberto(false);
    } catch(e) { setErro(e.message || "Não consegui desfazer o acerto."); }
    finally { setSalvandoAcerto(false); }
  };

  const resumoAcerto=acerto?{
    voltou:acerto.itens.filter(x=>x.estado==="voltou").reduce((s,x)=>s+x.venda_centavos,0)/100,
    vendeu:acerto.itens.filter(x=>x.estado==="vendeu").reduce((s,x)=>s+x.venda_centavos,0)/100,
    comissao:acerto.itens.filter(x=>x.estado==="vendeu").reduce((s,x)=>s+x.comissao_centavos,0)/100,
    sumiu:acerto.itens.filter(x=>x.estado==="sumiu").reduce((s,x)=>s+x.custo_centavos,0)/100
  }:null;
  if(resumoAcerto) { resumoAcerto.repasse=resumoAcerto.vendeu-resumoAcerto.comissao; resumoAcerto.lucro=resumoAcerto.vendeu-resumoAcerto.comissao-resumoAcerto.sumiu; }

  const imprimirPDF=()=>{
    if(!acerto) return;
    const c=quem(acerto.maleta?.consultoraId);
    const money=(n)=>"R$ "+Number(n||0).toFixed(2).replace(".",",");
    const rows=acerto.itens.map(x=>"<tr><td>"+x.codigo+"</td><td>"+(x.nome||"")+"</td><td>"+x.unidade+"</td><td>"+x.estado+"</td><td>"+money(x.venda_centavos/100)+"</td></tr>").join("");
    const win=window.open("","_blank");
    if(!win) return;
    const donaTxt=acerto.dona_confirmou_em?"confirmado em "+new Date(acerto.dona_confirmou_em).toLocaleString("pt-BR"):"pendente";
    const consTxt=acerto.consultora_confirmou_em?"confirmado em "+new Date(acerto.consultora_confirmou_em).toLocaleString("pt-BR"):(acerto.acerto_junto?"acerto feito junto":"pendente");
    win.document.write("<!doctype html><html lang='pt-BR'><head><meta charset='utf-8'><title>Acerto da maleta · Luxi</title><style>@page{size:A4;margin:16mm}body{font-family:Arial,sans-serif;color:#33272b}h1{font-size:25px;margin:0 0 4px}h2{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9b6671;margin:20px 0 8px}.top{border-bottom:2px solid #c48a94;padding-bottom:12px}.meta{color:#75666b;font-size:12px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}.box{border:1px solid #eadcdf;border-radius:10px;padding:10px}.v{font-size:17px;font-weight:700;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{padding:7px 5px;border-bottom:1px solid #eee;text-align:left}.sig{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:35px}.line{border-top:1px solid #444;padding-top:7px;font-size:11px}.small{font-size:9px;color:#75666b;margin-top:3px}</style></head><body><div class='top'><h1>Luxi · Acerto da maleta</h1><div class='meta'>"+(c?.nome||"")+" · emitido em "+new Date().toLocaleString("pt-BR")+"</div></div><h2>O que voltou, o que vendeu, o que sumiu</h2><div class='grid'><div class='box'>Voltou<div class='v'>"+money(resumoAcerto.voltou)+"</div></div><div class='box'>Vendeu<div class='v'>"+money(resumoAcerto.vendeu)+"</div></div><div class='box'>Ela te repassa<div class='v'>"+money(resumoAcerto.repasse)+"</div></div><div class='box'>Custo do que sumiu<div class='v'>"+money(resumoAcerto.sumiu)+"</div></div></div><table><thead><tr><th>Código</th><th>Peça</th><th>Un.</th><th>Estado</th><th>Venda</th></tr></thead><tbody>"+rows+"</tbody></table><h2>Assinaturas eletrônicas</h2><div class='sig'><div class='line'>Dona: "+donaTxt+"<div class='small'>Confirmação registrada no Luxi</div></div><div class='line'>Consultora: "+consTxt+"<div class='small'>Confirmação registrada no Luxi</div></div></div></body></html>");
    win.document.close(); setTimeout(()=>win.print(),250);
  };

  if(!liberado) return <div className="oj-vazio"><span className="oj-serif">Disponível no plano Equipe</span>A Maleta organiza o que cada vendedora levou, o que voltou e o que vendeu.</div>;
  if(!cons.length) return <div className="oj-vazio"><span className="oj-serif">Cadastre uma consultora</span>A maleta é o estoque que fica com ela. Vá em Mais → Equipe e cadastre quem vende com você.</div>;

  const ativas=maletas.filter(m=>m.status==="aberta");
  const historico=maletas.filter(m=>m.status!=="aberta");
  const time=ativas.reduce((acc,m)=>{
    const custo=m.itens.reduce((t,i)=>t+i.qtd*i.custo,0);
    const bruto=m.itens.reduce((t,i)=>t+i.qtd*i.venda,0);
    const pct=Number(quem(m.consultoraId)?.comissao||0);
    return {...acc,custo:acc.custo+custo,bruto:acc.bruto+bruto,comissao:acc.comissao+(bruto*pct/100),lucro:acc.lucro+bruto-custo-(bruto*pct/100)};
  },{custo:0,bruto:0,comissao:0,lucro:0});

  return <>
    <div className="oj-card" data-tour-role="maleta"><div className="oj-lbl">Capital na rua</div><div className="oj-valor" style={{color:"var(--roxo)"}}>{brl(time.custo)}</div><div className="oj-meta" style={{marginTop:6}}>{ativas.length} maleta(s) aberta(s) · {ativas.reduce((s,m)=>s+m.itens.reduce((t,i)=>t+i.qtd,0),0)} peça(s) fora da sua mão)</div><div style={{marginTop:14,borderTop:"1px solid var(--linha)",paddingTop:12}}>{[["Se vender tudo",time.bruto],["Custo das peças",-time.custo],["Comissão do time",-time.comissao]].map(([r,v])=><div className="oj-uso" key={r} style={{marginBottom:6}}><span>{r}</span><b style={{marginLeft:"auto"}}>{v<0?"− ":""}{brl(Math.abs(v))}</b></div>)}<div className="oj-uso" style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--linha)"}}><b>Seu lucro</b><b style={{marginLeft:"auto"}}>{brl(time.lucro)}</b></div></div></div>
    {!nova && <div style={{padding:"0 20px"}}><button className="oj-btn" onClick={()=>setNova(true)}>Abrir nova maleta</button></div>}
    {nova && <div className="oj-card"><div className="oj-lbl">Para quem</div><div className="oj-chips">{cons.map(c=><button key={c.id} className="oj-chip" data-on={consultoraId===c.id?"1":"0"} onClick={()=>setConsultoraId(c.id)}>{c.nome}</button>)}</div><div className="oj-lbl" style={{marginTop:16}}>Prazo para devolver ou acertar</div><div className="oj-chips">{[30,60,90].map(n=><button key={n} className="oj-chip" data-on={prazo===n?"1":"0"} onClick={()=>setPrazo(n)}>{n} dias</button>)}</div><div className="oj-lbl" style={{marginTop:16}}>Peças que vão na maleta</div>{disponivel.map(p=><div className="oj-item" key={p.id}><span className="oj-cod">{p.codigo}</span><div><div className="oj-nome">{p.nome}</div><div className="oj-meta">{p.qtd} no estoque · {brl(p.venda)}</div></div><div className="oj-dir" style={{display:"flex",gap:6}}><button className="oj-btn sec mini" onClick={()=>setSel({...sel,[p.id]:Math.max(0,(sel[p.id]||0)-1)})}>−</button><span style={{minWidth:22,textAlign:"center",lineHeight:"32px"}}>{sel[p.id]||0}</span><button className="oj-btn sec mini" onClick={()=>setSel({...sel,[p.id]:Math.min(p.qtd,(sel[p.id]||0)+1)})}>+</button></div></div>)}<button className="oj-btn" style={{marginTop:14}} disabled={!consultoraId||!Object.values(sel).some(q=>q>0)} onClick={abrir}>Entregar maleta</button><button className="oj-btn sec" style={{marginTop:8}} onClick={()=>{setNova(false);setSel({})}}>Cancelar</button></div>}
    {ativas.map(m=>{const c=quem(m.consultoraId);const passados=dias(m.abertaEm);const restam=m.prazo-passados;const total=m.itens.reduce((s,i)=>s+i.qtd*i.custo,0);const abertaAqui=aberta===m.id;return <div className="oj-card" key={m.id}><div className="oj-uso" style={{alignItems:"center",gap:10,cursor:"pointer"}} role="button" tabIndex={0} onClick={()=>abertaAqui?setAberta(null):carregarAcerto(m)} onKeyDown={e=>e.key==="Enter"&&(abertaAqui?setAberta(null):carregarAcerto(m))}><Avatar nome={c?.nome} foto={c?.foto}/><div><div className="oj-nome">{c?.nome}</div><div className="oj-meta">{m.itens.reduce((s,i)=>s+i.qtd,0)} peça(s) · aberta há {passados} dias</div></div><div style={{marginLeft:"auto",textAlign:"right"}}><div className="oj-preco">{brl(total)}</div><span className={"oj-tag "+(restam<0?"parada":"estoque")}>{restam<0?"Prazo de acertar venceu":"faltam "+restam+" dias"}</span></div></div>{abertaAqui&&<div style={{marginTop:12,borderTop:"1px solid var(--linha)",paddingTop:12}}>{carregandoAcerto?<Carregando texto="Abrindo o acerto…" />:acerto&&acerto.maleta_id===m.id?<><div className="oj-sec" style={{margin:"14px 0 6px"}}>{acerto.status==="fechado"?"Acerto fechado":"Acertar e zerar"}</div>{erro&&<div className="oj-erro">{erro}</div>}{acerto.status==="fechado"?<><div className="oj-aviso">Acerto feito em {new Date(acerto.fechado_em).toLocaleString("pt-BR")}. Esta maleta fica só para leitura.</div><div className="oj-grid2">{[["Voltou",acerto.resumo?.voltou||0],["Vendeu",acerto.resumo?.vendeu||0],["Ela te repassa",acerto.resumo?.repasse||0],["Custo do que sumiu",acerto.resumo?.sumiu||0]].map(([t,v])=><div className="oj-card flat" key={t}><div className="oj-lbl">{t}</div><div className="oj-preco">{brl(v)}</div></div>)}</div><button className="oj-btn sec" onClick={imprimirPDF}>PDF do acerto</button>{d.perfil.papel==="dona"&&<button className="oj-btn perigo" style={{marginTop:8}} onClick={()=>setDesfazerAberto(true)}>Desfazer acerto</button>}</>:<><div className="oj-meta" style={{marginBottom:10}}>Cada unidade fica em um lugar: voltou, vendeu ou sumiu.</div>{Object.entries(acerto.itens.reduce((g,x)=>{(g[x.codigo]??=[]).push(x);return g;},{})).map(([codigo,unidades])=><div className="oj-card flat" key={codigo} style={{margin:"8px 0"}}><div className="oj-nome">{codigo} · {unidades[0]?.nome}</div>{unidades.map((u,k)=><div className="oj-item" key={u.id}><div style={{minWidth:70}}><b>Unidade {k+1}</b><div className="oj-meta">{brl(u.venda_centavos/100)}</div></div><div className="oj-dir" style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"flex-end"}}>{["voltou","vendeu","sumiu"].map(st=><button key={st} className={"oj-btn mini "+(u.estado===st?"":"sec")} onClick={()=>mudarEstado(u,st)} disabled={salvandoAcerto}>{st==="voltou"?"Voltou":st==="vendeu"?"Vendeu":"Sumiu"}</button>)}{u.estado==="vendeu"&&!u.venda_id&&<button className="oj-link-sutil" style={{margin:0,width:"auto"}} onClick={()=>{setVendaAberta({...u,maleta_id:m.id});setVendaModalidade("Dinheiro");setVendaPago(true)}}>Registrar venda</button>}</div></div>)}</div>)}<div className="oj-card" style={{margin:"12px 0"}}><div className="oj-lbl">Resumo</div>{[["Voltou",resumoAcerto.voltou],["Vendeu",resumoAcerto.vendeu],["Ela te repassa",resumoAcerto.repasse],["Você paga de comissão",resumoAcerto.comissao],["Custo do que sumiu",resumoAcerto.sumiu],["Seu lucro neste acerto",resumoAcerto.lucro]].map(([t,v])=><div className="oj-uso" key={t} style={{marginTop:7}}><span>{t}</span><b style={{marginLeft:"auto"}}>{brl(v)}</b></div>)}</div><div className="oj-card flat" style={{margin:"12px 0"}}><div className="oj-lbl">Confirmações</div><div className="oj-meta" style={{marginTop:7}}>Dona: {acerto.dona_confirmou_em?"✓ confirmada":"pendente"} · Consultora: {acerto.consultora_confirmou_em?"✓ confirmada":(acerto.acerto_junto?"✓ feito junto":"pendente")}</div>{d.perfil.papel==="dona"&&<><button className="oj-btn sec" style={{marginTop:10}} onClick={()=>confirmar("dona")} disabled={salvandoAcerto}>Confirmar meu acerto</button><button className="oj-btn sec" style={{marginTop:8}} onClick={()=>confirmar("junto")} disabled={salvandoAcerto}>Acerto feito junto</button></>}{d.perfil.papel==="consultora"&&<button className="oj-btn sec" style={{marginTop:10}} onClick={()=>confirmar("consultora")} disabled={salvandoAcerto}>Confirmar meu acerto</button>}</div><div style={{display:"flex",gap:8,marginTop:10}}><button className="oj-btn sec mini" onClick={imprimirPDF}>PDF do acerto</button><button className="oj-btn mini" disabled={salvandoAcerto||acerto.itens.some(x=>x.estado==="pendente")||!acerto.dona_confirmou_em||(!acerto.consultora_confirmou_em&&!acerto.acerto_junto)} onClick={fecharAcerto}>{salvandoAcerto?"Fechando…":"Acertar e zerar"}</button></div></>}</>:null}</div>}</div>})}
    {historico.length>0&&<div className="oj-sec">Histórico de acertos</div>}
    {historico.map(m=>{
      const abertaHistorico=aberta===m.id;
      return <div className="oj-card" key={m.id}>
        <div className="oj-uso" style={{alignItems:"center"}}>
          <Avatar nome={quem(m.consultoraId)?.nome} foto={quem(m.consultoraId)?.foto}/>
          <div><div className="oj-nome">{quem(m.consultoraId)?.nome}</div><div className="oj-meta">Maleta acertada · {m.fechadaEm?new Date(m.fechadaEm).toLocaleDateString("pt-BR"):""}</div></div>
          <button className="oj-btn sec mini" style={{marginLeft:"auto"}} onClick={()=>abertaHistorico?setAberta(null):carregarAcerto(m)}>{abertaHistorico?"Fechar":"Abrir"}</button>
        </div>
        {abertaHistorico && acerto?.maleta_id===m.id && acerto.status==="fechado" && (
          <div style={{marginTop:12,borderTop:"1px solid var(--linha)",paddingTop:12}}>
            <div className="oj-aviso">Acerto feito em {new Date(acerto.fechado_em).toLocaleString("pt-BR")}. Esta maleta fica só para leitura.</div>
            <div className="oj-meta" style={{marginTop:8}}>Dona: {acerto.dona_confirmou_em?"✓ confirmada":"pendente"} · Consultora: {acerto.consultora_confirmou_em?"✓ confirmada":(acerto.acerto_junto?"✓ feito junto":"pendente")}</div>
            <div className="oj-grid2" style={{marginTop:10}}>
              {[["Voltou",acerto.resumo?.voltou||0],["Vendeu",acerto.resumo?.vendeu||0],["Ela te repassa",acerto.resumo?.repasse||0],["Custo do que sumiu",acerto.resumo?.sumiu||0]].map(([t,v])=><div className="oj-card flat" key={t}><div className="oj-lbl">{t}</div><div className="oj-preco">{brl(v)}</div></div>)}
            </div>
            <div className="oj-sec" style={{margin:"12px 0 6px"}}>Peça a peça</div>
            {acerto.itens.map((u)=><div className="oj-item" key={u.id}><span className="oj-cod">{u.codigo}</span><div><div className="oj-nome">{u.nome}</div><div className="oj-meta">Unidade {u.unidade} · {u.estado}</div></div><div className="oj-dir">{brl(u.venda_centavos/100)}</div></div>)}
            <button className="oj-btn sec" style={{marginTop:10}} onClick={imprimirPDF}>PDF do acerto</button>
            {d.perfil.papel==="dona" && <button className="oj-btn perigo" style={{marginTop:8}} onClick={()=>setDesfazerAberto(true)}>Desfazer acerto</button>}
          </div>
        )}
      </div>;
    })}
    {vendaAberta&&<div className="oj-fundo" onClick={()=>setVendaAberta(null)}><div className="oj-modal" onClick={e=>e.stopPropagation()}><h3 className="oj-serif">Registrar venda</h3><div className="oj-meta" style={{marginBottom:12}}>Já fica no nome de {quem(acerto?.maleta?.consultoraId)?.nome||"da consultora"} e ligada à maleta.</div><input className="oj-in" placeholder="Cliente (opcional)" value={vendaCliente} onChange={e=>setVendaCliente(e.target.value)}/><div className="oj-lbl">Como te pagou?</div><div className="oj-chips">{(d.perfil.formas||["Dinheiro"]).map(m=><button key={m} className="oj-chip" data-on={vendaModalidade===m?"1":"0"} onClick={()=>setVendaModalidade(m)}>{m}</button>)}</div><button className="oj-btn sec" style={{marginTop:10}} onClick={()=>setVendaPago(!vendaPago)}>{vendaPago?"Pago":"Ficou para receber"}</button><button className="oj-btn" style={{marginTop:10}} disabled={salvandoAcerto} onClick={registrarVenda}>Registrar venda · {brl(vendaAberta.venda_centavos/100)}</button></div></div>}
    {desfazerAberto&&<div className="oj-fundo" onClick={()=>setDesfazerAberto(false)}><div className="oj-modal" onClick={e=>e.stopPropagation()}><h3 className="oj-serif">Desfazer acerto</h3><p className="oj-meta">Isso reabre a maleta e estorna o que entrou no estoque, a comissão e o que ficou a receber. A ação fica registrada.</p><input className="oj-in" placeholder="Motivo (opcional)" value={desfazerMotivo} onChange={e=>setDesfazerMotivo(e.target.value)}/><button className="oj-btn perigo" style={{marginTop:10}} disabled={salvandoAcerto} onClick={desfazer}>Sim, desfazer acerto</button><button className="oj-btn sec" style={{marginTop:8}} onClick={()=>setDesfazerAberto(false)}>Cancelar</button></div></div>}
  </>;
}

/* ---------------- conselheiro de negócio ---------------- */
function Conselheiro({ d, dentro, irPara }) {
  const leituraConselheira = useMemo(() => analisarLoja(d), [d]);
  const executarConselheira = (r) => {
    const destino = r?.destino;
    if (destino && irPara) irPara(destino);
  };
  if (d.perfil.papel === "consultora" && !d.perfil.mestre)
    return (
      <div className="oj-vazio">
        <span className="oj-serif">Área da administradora</span>
        O Conselheiro mostra a saúde financeira da loja inteira — margem, capital parado
        e inadimplência. Ele fica disponível para quem administra a loja.
      </div>
    );

  const cardConselheira =
  const executarConselheira = (r) => {
    const destino = r?.destino;
    if (destino && irPara) irPara(destino);
  };
  const cardConselheira = d.perfil.papel === "consultora" && !d.perfil.mestre ? null : (
    <div className="oj-card" style={{
      border: "1.5px solid var(--rose-metal)",
      background: "linear-gradient(135deg, var(--bege), var(--rose-cl))",
      boxShadow: "0 6px 20px rgba(165,107,119,.10)"
    }}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:38,height:38,borderRadius:"50%",background:"var(--rose)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>✦</div>
        <div>
          <div className="oj-lbl" style={{color:"var(--rose-esc)"}}>A CONSELHEIRA</div>
          <div style={{fontSize:19,fontWeight:600,marginTop:2}}>O que eu faria agora</div>
        </div>
      </div>
      <div className="oj-meta" style={{marginTop:10,lineHeight:1.55}}>
        {leituraConselheira.mensagem.texto}
      </div>
      <div style={{marginTop:14,display:"grid",gap:10}}>
        {leituraConselheira.recomendacoes.map((r) => (
          <div key={r.id} style={{background:"rgba(255,255,255,.72)",border:"1px solid var(--linha)",borderRadius:14,padding:13}}>
            <div style={{fontSize:15,fontWeight:600,lineHeight:1.35}}>{r.titulo}</div>
            <div className="oj-meta" style={{marginTop:5,lineHeight:1.5}}>{r.resumo}</div>
            <div style={{fontSize:13.5,lineHeight:1.55,marginTop:7}}>{r.leitura}</div>
            {r.destino && (
              <button className="oj-btn sec mini" style={{marginTop:10}} onClick={() => executarConselheira(r)}>
                {r.acao} ›
              </button>
            )}
          </div>
        ))}
      </div>
      {!leituraConselheira.recomendacoes.length && (
        <div className="oj-meta" style={{marginTop:12}}>Eu continuo observando. Quando aparecer uma oportunidade realmente importante, eu te aviso.</div>
      )}
      <div style={{marginTop:12,fontSize:11.5,color:"var(--tinta-cl)"}}>
        Estou usando os dados reais da sua loja e priorizando o que merece sua atenção primeiro.
      </div>
    </div>
  );
  const vendas = d.vendas.filter((v) => dentro(v.data));
  const desp = d.despesas.filter((x) => dentro(x.data));
  const estoque = d.estoque.filter((p) => p.qtd > 0);

  const receita = vendas.reduce((s, v) => s + v.valor, 0);
  const custo = vendas.reduce((s, v) => s + v.custo, 0);
  const despesa = desp.reduce((s, x) => s + x.valor, 0);
  const lucro = receita - custo - despesa;
  const vendidos = new Set(d.vendas.map((v) => v.codigo));

  const dores = [];

  // 1. dinheiro parado
  const paradas = estoque.filter((p) => dias(p.entradaEm) > 60);
  const valorParado = paradas.reduce((s, p) => s + p.qtd * p.custo, 0);
  if (paradas.length)
    dores.push({
      nivel: "alto",
      dor: `${brl(valorParado)} do seu dinheiro está parado`,
      texto: `${paradas.length} código(s) estão há mais de 60 dias sem sair. Esse dinheiro já foi gasto e não voltou.`,
      pecas: paradas.slice(0, 4),
      acao:
        "Monte um combo com essas peças a preço de custo mais 30%. Recuperar o capital vale mais do que segurar margem em peça que não gira.",
    });

  // 2. nunca vendeu
  const nunca = estoque.filter((p) => !vendidos.has(p.codigo) && dias(p.entradaEm) > 30);
  if (nunca.length)
    dores.push({
      nivel: "alto",
      dor: `${nunca.length} código(s) nunca venderam nenhuma vez`,
      pecas: nunca.slice(0, 4),
      texto:
        "Não é falta de giro, é falta de exposição ou erro de compra. Peça que ninguém viu não vende.",
      acao:
        "Poste 3 delas esta semana no story com preço. Se ainda assim não saírem, não recompre esse modelo.",
    });

  // 3. fiado envelhecendo
  const receber = d.vendas.filter((v) => v.modalidade === CONFIANCA && !v.pago);
  const velhos = receber.filter((v) => dias(v.data) > 30);
  if (velhos.length)
    dores.push({
      nivel: "alto",
      dor: `${brl(velhos.reduce((s, v) => s + v.valor, 0))} a receber há mais de 30 dias`,
      texto: `${velhos.length} venda(s) a prazo passaram de um mês. Fiado antigo vira prejuízo, não recebimento.`,
      acao: `Mande hoje uma mensagem para ${velhos
        .map((v) => v.cliente)
        .filter(Boolean)
        .slice(0, 3)
        .join(", ") || "essas clientes"}. Ofereça parcelar — receber metade é melhor que perder tudo.`,
    });

  // 3b. combinado de cobrança vencendo
  const aCobrar = d.vendas.filter(
    (v) => v.modalidade === CONFIANCA && !v.pago && v.cobrarEm && new Date(v.cobrarEm) <= new Date()
  );
  if (aCobrar.length)
    dores.push({
      nivel: "alto",
      dor: `${aCobrar.length} combinado(s) de pagamento venceram`,
      texto:
        "Você combinou uma data com essas clientes e ela chegou. Cobrar no prazo combinado não é cobrança, é acordo.",
      acao: `Fale hoje com ${aCobrar
        .map((v) => v.cliente)
        .filter(Boolean)
        .slice(0, 3)
        .join(", ")}. Lembre do combinado com naturalidade — quanto mais cedo, menos constrangedor.`,
    });

  // 3c. maleta vencida — capital na rua
  const maletasAtrasadas = (d.maletas || []).filter(
    (m) => m.status === "aberta" && dias(m.abertaEm) > m.prazo
  );
  if (maletasAtrasadas.length) {
    const exposto = maletasAtrasadas.reduce(
      (s2, m) => s2 + m.itens.reduce((t, i) => t + i.qtd * i.custo, 0),
      0
    );
    dores.push({
      nivel: "alto",
      dor: `${brl(exposto)} em maleta fora do prazo`,
      texto: `${maletasAtrasadas.length} maleta(s) passaram do prazo combinado. Peça parada na mão de outra pessoa é capital seu que não gira nem volta.`,
      acao:
        "Marque o acerto desta semana. Recolha o que não vendeu e devolva ao estoque — outra consultora pode vender o que essa não vendeu.",
    });
  }

  // 3d. inadimplência acima do tolerado pela dona
  const limiteInad = Number(d.perfil.limiteInadimplencia ?? 0);
  const totalVendido = d.vendas.reduce((s2, v) => s2 + v.valor, 0);
  const naoPago = d.vendas.filter((v) => !v.pago).reduce((s2, v) => s2 + v.valor, 0);
  const pctInad = totalVendido ? (naoPago / totalVendido) * 100 : 0;
  if (naoPago > 0 && pctInad > limiteInad)
    dores.push({
      nivel: "alto",
      dor: `Inadimplência em ${pctInad.toFixed(1)}%`,
      texto: `${brl(naoPago)} vendidos e não recebidos. Seu limite está definido em ${limiteInad}% — o padrão do Luxi é zero, porque todo real não recebido saiu do seu bolso primeiro.`,
      acao:
        "Suspenda venda na confiança para quem já está devendo e priorize a cobrança dos mais antigos.",
    });

  // 4. margem apertada
  const margemMedia = receita ? ((receita - custo) / receita) * 100 : 0;
  if (receita > 0 && margemMedia < 45)
    dores.push({
      nivel: "alto",
      dor: `Sua margem média está em ${margemMedia.toFixed(0)}%`,
      texto:
        "Abaixo de 45% sobra pouco depois das despesas. Você está trabalhando muito para ganhar pouco.",
      acao:
        "Suba 10% no preço das 5 peças que mais saem. Quem compra recorrente raramente desiste por isso.",
    });

  // 5. despesa comendo o lucro
  if (receita > 0 && despesa / receita > 0.3)
    dores.push({
      nivel: "medio",
      dor: `Despesas consomem ${((despesa / receita) * 100).toFixed(0)}% do que você vende`,
      texto: `${brl(despesa)} de despesa para ${brl(receita)} de venda. O dinheiro entra e escorre.`,
      acao:
        "Liste as 3 maiores despesas e pergunte de cada uma: isso me faz vender mais? O que não faz, corta.",
    });

  // 6. dependência de uma peça
  const porCodigo = {};
  vendas.forEach((v) => (porCodigo[v.codigo] = (porCodigo[v.codigo] || 0) + v.valor));
  const top = Object.entries(porCodigo).sort((a, b) => b[1] - a[1])[0];
  if (top && receita > 0 && top[1] / receita > 0.4)
    dores.push({
      nivel: "medio",
      dor: `${((top[1] / receita) * 100).toFixed(0)}% do seu faturamento vem de um código só`,
      texto: `O ${top[0]} carrega sua loja. Se ele sair de moda ou o fornecedor faltar, sua receita cai junto.`,
      acao: "Garanta estoque dele e teste 2 modelos parecidos para não depender de um só.",
    });

  // 7. fiado demais
  const prazo = vendas.filter((v) => v.modalidade === CONFIANCA);
  if (vendas.length > 4 && prazo.length / vendas.length > 0.4)
    dores.push({
      nivel: "medio",
      dor: `${((prazo.length / vendas.length) * 100).toFixed(0)}% das suas vendas são a prazo`,
      texto: "Você vende bem, mas o dinheiro não entra no caixa. Vender não é receber.",
      acao: "Dê 5% de desconto no pagamento à vista. Sai mais barato que financiar sua cliente.",
    });

  // 8. devoluções e defeitos
  const saidas = d.saidas.filter((s) => dentro(s.data));
  if (saidas.length > 2)
    dores.push({
      nivel: "medio",
      dor: `${saidas.reduce((s, x) => s + x.qtd, 0)} peça(s) saíram por devolução ou defeito`,
      texto: `Prejuízo de ${brl(
        saidas.reduce((s, x) => s + (x.valor || x.custo || 0) * x.qtd, 0)
      )} no período. Se vem sempre do mesmo fornecedor, o problema não é sorte.`,
      acao: "Junte os defeitos por fornecedor e cobre troca. Isso é direito seu, não favor.",
    });

  // 9. tudo certo
  if (!dores.length)
    dores.push({
      nivel: "ok",
      dor: "Sua loja está no caminho certo ✦",
      texto:
        "Cada venda registrada é um passo. Você está construindo algo real — continue assim, com consistência e com leveza.",
      acao: "Aumente o pedido do que mais sai e teste um modelo novo com pouca quantidade.",
    });

  const cor = { alto: "var(--alerta)", medio: "var(--dourado)", ok: "var(--verde)" };
  const rotulo = { alto: "Resolva agora", medio: "Fique de olho", ok: "Tudo certo" };

  return (
    <>
      {cardConselheira}
      <div className="oj-card">
        <div className="oj-lbl">Resultado do período</div>
        <div className={"oj-valor " + (lucro >= 0 ? "ouro" : "rose")}>{brl(lucro)}</div>
        <div className="oj-meta" style={{ marginTop: 8, lineHeight: 1.6 }}>
          {dores.filter((x) => x.nivel === "alto").length} ponto(s) urgente(s) ·{" "}
          {dores.filter((x) => x.nivel === "medio").length} para acompanhar. Cada aviso
          abaixo nasce dos seus próprios números.
        </div>
      </div>

      {dores.map((x, i) => (
        <div className="oj-card" key={i}>
          <span
            className="oj-tag"
            style={{ background: "transparent", color: cor[x.nivel], paddingLeft: 0 }}
          >
            {rotulo[x.nivel]}
          </span>
          <div
            className="oj-valor"
            style={{ fontSize: 21, marginTop: 4, lineHeight: 1.25 }}
          >
            {x.dor}
          </div>
          <div className="oj-meta" style={{ marginTop: 8, lineHeight: 1.6 }}>
            {x.texto}
          </div>
          {x.pecas && (
            <div style={{ marginTop: 10 }}>
              {x.pecas.map((p) => (
                <div className="oj-item" key={p.id} style={{ padding: "9px 0" }}>
                  <span className="oj-cod">{p.codigo}</span>
                  <div>
                    <div className="oj-nome">{p.nome}</div>
                    <div>
                      {[p.banho, p.pedra, p.acabamento]
                        .filter((v) => v && v !== "—")
                        .map((v) => (
                          <span className="oj-var" key={v}>
                            {v}
                          </span>
                        ))}
                    </div>
                  </div>
                  <div className="oj-dir">
                    <span className="oj-tag estoque">{p.qtd} un</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--linha)",
              fontSize: 13.5,
              lineHeight: 1.6,
            }}
          >
            <b>O que fazer: </b>
            {x.acao}
          </div>
        </div>
      ))}
    </>
  );
}

/* ---------------- catálogo ---------------- */
function Catalogo({ d }) {
  const [sel, setSel] = useState([]);
  const [copiado, setCopiado] = useState(false);
  const lista = d.estoque.filter((p) => p.qtd > 0);

  const alternar = (id) =>
    setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);

  const escolhidas = lista.filter((p) => sel.includes(p.id));

  const slug = d.perfil.slug || "minhaloja";
  /* Se a pessoa já publicou a lona, o catálogo manda o link REAL da vitrine.
     Sem lona publicada nada muda: segue o texto de sempre. */
  const [linkLona, setLinkLona] = useState(null);
  useEffect(() => {
    if (!d.lojaId) return undefined;
    let vivo = true;
    dados.lonaResumo().then((lista) => {
      const ehCons = d.perfil.papel === "consultora" && !d.perfil.mestre;
      const minha = (lista || []).find((c) => (ehCons ? true : c.eh_dona));
      if (vivo && minha && minha.publicada && minha.slug) setLinkLona(`${window.location.origin}${window.location.pathname}?m=${encodeURIComponent(minha.slug)}`);
    }).catch(() => {});
    return () => { vivo = false; };
  }, [d.lojaId]);

  const texto = linkLona
    ? `${d.perfil.loja}\n\nConfira as peças na nossa vitrine online e peça por lá:\n${linkLona}`
    : `${d.perfil.loja}\n\n` +
    escolhidas
      .map(
        (p) =>
          `${p.nome}${p.banho ? ` · ${p.banho}` : ""}\nCód. ${p.codigo} — ${brl(p.venda)}`
      )
      .join("\n\n") +
    `\n\nMe chame para garantir a sua.`;

  const numero = (d.perfil.whatsapp || "").replace(/\D/g, "");
  const abrirWhats = () => {
    const url = numero
      ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (e) {
      setCopiado(false);
    }
  };

  if (!lista.length)
    return (
      <div className="oj-vazio">
        <span className="oj-serif">Sem peças em estoque</span>
        Registre um romaneio para montar seu catálogo.
      </div>
    );

  return (
    <>
      <div className="oj-card flat">
        <div className="oj-meta" style={{ lineHeight: 1.6 }}>
          Escolha as peças e envie direto pelo WhatsApp, com nome, código e preço de cada uma.
          Para a cliente ver tudo e pedir sozinha, mande o link da sua loja on-line.
        </div>
        {!d.perfil.whatsapp && (
          <div className="oj-meta" style={{ marginTop: 8, color: "var(--alerta)" }}>
            Cadastre seu WhatsApp em Minha conta para o envio sair no seu número.
          </div>
        )}
      </div>

      <div className="oj-card">
        {lista.map((p) => (
          <div
            className="oj-item"
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => alternar(p.id)}
            onKeyDown={(e) => e.key === "Enter" && alternar(p.id)}
            style={{ cursor: "pointer" }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                border: "1.5px solid " + (sel.includes(p.id) ? "var(--rose)" : "var(--linha)"),
                background: sel.includes(p.id) ? "var(--rose)" : "#fff",
                color: "#fff",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 auto",
              }}
            >
              {sel.includes(p.id) ? "✓" : ""}
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="oj-nome">{p.nome}</div>
              <div className="oj-meta">
                {p.codigo} · {p.qtd} disponível(is)
              </div>
            </div>
            <div className="oj-dir">
              <div className="oj-preco">{brl(p.venda)}</div>
            </div>
          </div>
        ))}
      </div>

      {escolhidas.length > 0 && (
        <div className="oj-card">
          <div className="oj-lbl">Texto pronto — {escolhidas.length} peça(s)</div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              fontSize: 13.5,
              lineHeight: 1.6,
              background: "var(--bege-2)",
              padding: 14,
              borderRadius: 10,
              marginTop: 10,
            }}
          >
            {texto}
          </pre>
          <button className="oj-btn" style={{ marginTop: 12 }} onClick={abrirWhats}>
            Enviar pelo WhatsApp
          </button>
          <button className="oj-btn sec" style={{ marginTop: 8 }} onClick={copiar}>
            {copiado ? "Copiado — agora é só colar" : "Copiar texto"}
          </button>
          <button
            className="oj-btn sec"
            style={{ marginTop: 8 }}
            onClick={() => setSel([])}
          >
            Limpar seleção
          </button>
        </div>
      )}
    </>
  );
}

/* ---------------- mais ---------------- */
function Mais({ irPara, mestre }) {
  const itens = [
    ["graficos", "Análises", "Vendas por banho, despesas e equipe"],
    ["maleta", "Maleta", "O que está com cada consultora"],
    ["clientes", "Clientes", "Histórico e quanto cada uma já gastou"],
    ["catalogo", "Loja on-line", "Link para suas clientes pedirem"],
    ["lona", "Editar loja e pedidos", "Capa, preços, Pix e pedidos"],
    ["equipe", "Equipe", "Consultoras e comissões"],
    ["contas", "Contas", "Despesas, plano e a receber"],
  ];
  if (mestre) itens.push(["admin", "Uso do Luxi", "Lojas e atividade reais"]);

  return (
    <div className="oj-card">
      {itens.map(([k, t, s]) => (
        <div
          className="oj-item"
          key={k}
          role="button"
          tabIndex={0}
          onClick={() => irPara(k)}
          onKeyDown={(e) => e.key === "Enter" && irPara(k)}
          style={{ cursor: "pointer" }}
        >
          <div>
            <div className="oj-nome">{t}</div>
            <div className="oj-meta">{s}</div>
          </div>
          <div className="oj-dir" style={{ color: "var(--tinta-cl)" }}>
            ›
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- contas ---------------- */
function Contas({ d, salvar, dentro, criarDespesa, removerDespesa, quitarVenda, irPara, recarregar }) {
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("Fixa");
  const [salvando, setSalvando] = useState(false);
  const [removendoId, setRemovendoId] = useState(null);
  const [quitandoId, setQuitandoId] = useState(null);
  const [erro, setErro] = useState("");

  const lista = d.despesas.filter((x) => dentro(x.data));
  const fixas = lista.filter((x) => x.tipo === "Fixa");
  const vars = lista.filter((x) => x.tipo === "Variável");

  const add = async () => {
    if (!nome.trim() || !Number(valor)) return;
    setErro("");
    setSalvando(true);
    try {
      await criarDespesa({ nome: nome.trim(), valor: Number(valor), tipo, data: hoje() });
      setNome("");
      setValor("");
    } catch (e) {
      setErro(e?.message || "Não deu para lançar essa despesa. Tenta de novo.");
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (x) => {
    setErro("");
    setRemovendoId(x.id);
    try {
      await removerDespesa(x);
    } catch (e) {
      setErro(e?.message || "Não deu para remover essa despesa. Tenta de novo.");
    } finally {
      setRemovendoId(null);
    }
  };

  const receber = d.vendas.filter((v) => v.modalidade === CONFIANCA && !v.pago);
  const repasses = (d.contasReceber || []).filter((x) => x.status === "aberta" && dentro(x.vencimento));
  const quitarRepasse = async (x) => {
    setErro("");
    setQuitandoId(x.id);
    try {
      if (d.lojaId) { await dados.quitarContaReceber(x.id); await recarregar(); }
      else await salvar({ ...d, contasReceber:(d.contasReceber||[]).map(y=>y.id===x.id?{...y,status:"recebida"}:y) });
    } catch(e) { setErro(e?.message || "Não deu para registrar esse recebimento."); }
    finally { setQuitandoId(null); }
  };
  const quitar = async (v) => {
    setErro("");
    setQuitandoId(v.id);
    try {
      await quitarVenda(v);
    } catch (e) {
      setErro(e?.message || "Não deu para quitar essa venda. Tenta de novo.");
    } finally {
      setQuitandoId(null);
    }
  };

  const plano = planoAtivo(d.perfil);
  const codigos = new Set(d.estoque.filter((p) => p.qtd > 0).map((p) => p.codigo)).size;
  const pct = plano.limite === Infinity ? 0 : Math.min(100, (codigos / plano.limite) * 100);


  const reiniciar = async () => await salvar(VAZIO);

  return (
    <>
      <div className="oj-card">
        <div className="oj-lbl">Seu plano</div>
        <div className="oj-uso" style={{ marginTop: 8 }}>
          <span>
            {plano.nome}
            {emTeste(d.perfil) && !d.perfil.assinado
              ? ` · teste, ${horasRestantes(d.perfil)}h`
              : ""}
          </span>
          <b style={{ marginLeft: "auto" }}>R$ {plano.preco}/mês</b>
        </div>
        {plano.limite !== Infinity && (
          <>
            <div className="oj-barra">
              <i style={{ width: pct + "%" }} />
            </div>
            <div className="oj-meta" style={{ marginTop: 6 }}>
              {codigos} de {plano.limite} códigos diferentes em uso
            </div>
          </>
        )}
        <button
          className="oj-link-sutil"
          style={{ textAlign: "left", marginTop: 8 }}
          onClick={() => irPara && irPara("perfil")}
        >
          Ver planos e detalhes da assinatura ›
        </button>      </div>

      <div className="oj-card">
        <div className="oj-lbl">Limite de inadimplência</div>
        <div className="oj-meta" style={{ margin: "8px 0 4px", lineHeight: 1.55 }}>
          O Luxi considera zero como referência de negócio saudável. Se você
          convive com um percentual, defina aqui — o Conselheiro só avisa quando passar.
        </div>
        <NumInput
          valor={d.perfil.limiteInadimplencia ?? 0}
          sufixo="%"
          aoMudar={(v) =>
            salvar({ ...d, perfil: { ...d.perfil, limiteInadimplencia: v } })
          }
        />
      </div>

      {d.perfil.mestre && (
        <div className="oj-card">
          <div className="oj-lbl">Acesso mestre</div>
          <div className="oj-meta" style={{ margin: "8px 0 12px" }}>
            Apaga a loja de demonstração e volta para a tela inicial, como uma usuária
            nova veria.
          </div>
          <button className="oj-btn perigo" onClick={reiniciar}>
            Limpar tudo e recomeçar
          </button>
        </div>
      )}

      <div className="oj-card">
        <div className="oj-lbl">Despesas no período</div>
        <div className="oj-valor rose">
          {brl(lista.reduce((s, x) => s + x.valor, 0))}
        </div>
        <div className="oj-meta" style={{ marginTop: 6 }}>
          {brl(fixas.reduce((s, x) => s + x.valor, 0))} fixas ·{" "}
          {brl(vars.reduce((s, x) => s + x.valor, 0))} variáveis
        </div>
      </div>

      <div className="oj-card">
        <div className="oj-lbl">Lançar despesa</div>
        <input
          className="oj-in"
          placeholder="Ex: embalagem, anúncio, aluguel"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          className="oj-in"
          type="number"
          placeholder="Valor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        <div className="oj-chips">
          {["Fixa", "Variável"].map((t) => (
            <button
              key={t}
              className="oj-chip"
              data-on={tipo === t ? "1" : "0"}
              onClick={() => setTipo(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          className="oj-btn"
          style={{ marginTop: 12 }}
          onClick={add}
          disabled={salvando}
        >
          {salvando ? "Lançando…" : "Lançar"}
        </button>
      </div>

      {erro && <div className="oj-erro">{erro}</div>}

      {lista.length > 0 && (
        <div className="oj-card">
          {lista.map((x) => (
            <div className="oj-item" key={x.id}>
              <div>
                <div className="oj-nome">{x.nome}</div>
                <span className="oj-pg" style={{ color: CORES_DESPESA[x.tipo] }}>
                  <i style={{ background: CORES_DESPESA[x.tipo] }} />
                  {x.tipo} · {new Date(x.data).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="oj-dir">
                <div className="oj-preco">{brl(x.valor)}</div>
                <button
                  className="oj-btn sec mini"
                  style={{ marginTop: 6 }}
                  onClick={() => remover(x)}
                  disabled={removendoId === x.id}
                >
                  {removendoId === x.id ? "Removendo…" : "Remover"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="oj-sec">Quem me deve?</div>
      {repasses.length > 0 && (
        <div className="oj-card">
          <div className="oj-lbl">Repasses das maletas</div>
          {repasses.map((x) => (
            <div className="oj-item" key={x.id}>
              <div>
                <div className="oj-nome">{x.nome}</div>
                <div className="oj-meta">Venceu no dia do acerto · {new Date(x.vencimento).toLocaleDateString("pt-BR")}</div>
              </div>
              <div className="oj-dir">
                <div className="oj-preco">{brl(x.valor)}</div>
                <button className="oj-btn sec mini" style={{marginTop:6}} onClick={()=>quitarRepasse(x)} disabled={quitandoId===x.id}>
                  {quitandoId===x.id ? "Registrando…" : "Recebi"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!receber.length && !repasses.length ? (
        <div className="oj-vazio" style={{ padding: "26px 24px" }}>
          Ninguém devendo. Bom sinal.
        </div>
      ) : (
        <div className="oj-card">
          {receber.map((v) => (
            <div className="oj-item" key={v.id}>
              <div>
                <div className="oj-nome">{v.cliente}</div>
                <div className="oj-meta">
                  {v.nome} · há {dias(v.data)} dias
                </div>
              </div>
              <div className="oj-dir">
                <div className="oj-preco">{brl(v.valor)}</div>
                <button
                  className="oj-btn sec mini"
                  style={{ marginTop: 6 }}
                  onClick={() => quitar(v)}
                  disabled={quitandoId === v.id}
                >
                  {quitandoId === v.id ? "Quitando…" : "Recebi"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------- vendas ---------------- */
function Vendas({ d, dentro, quitarVenda }) {
  const lista = d.vendas.filter((v) => dentro(v.data)).reverse();
  const quem = (cid) => (d.consultoras || []).find((c) => c.id === cid)?.nome;
  const [quitandoId, setQuitandoId] = useState(null);
  const [erro, setErro] = useState("");

  const quitar = async (v) => {
    setErro("");
    setQuitandoId(v.id);
    try {
      await quitarVenda(v);
    } catch (e) {
      setErro(e?.message || "Não deu para quitar essa venda. Tenta de novo.");
    } finally {
      setQuitandoId(null);
    }
  };

  if (!lista.length)
    return (
      <div className="oj-vazio">
        <span className="oj-serif">Sem vendas no período</span>
        Troque o filtro acima ou dê baixa em uma peça pelo estoque.
      </div>
    );
  return (
    <>
      {erro && <div className="oj-erro">{erro}</div>}
      <div className="oj-card">
        {lista.map((v) => (
          <div className="oj-item" key={v.id}>
            <span className="oj-cod">{v.codigo}</span>
            <div>
              <div className="oj-nome">{v.nome}</div>
              <div className="oj-meta">
                {new Date(v.data).toLocaleDateString("pt-BR")}
                {v.cliente ? ` · ${v.cliente}` : ""}
                {quem(v.consultoraId) ? ` · vendeu ${quem(v.consultoraId)}` : ""}
              </div>
              <span className="oj-pg" style={{ color: corPagamento(v.modalidade), marginTop: 3 }}>
                <i style={{ background: corPagamento(v.modalidade) }} />
                {v.modalidade}
              </span>
            </div>
            <div className="oj-dir">
              <div className="oj-preco">{brl(v.valor)}</div>
              {v.pago ? (
                <span className="oj-tag ok">Pago</span>
              ) : (
                <button
                  className="oj-btn sec mini"
                  style={{ marginTop: 6 }}
                  onClick={() => quitar(v)}
                  disabled={quitandoId === v.id}
                >
                  {quitandoId === v.id ? "Quitando…" : "A receber · Recebi"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
