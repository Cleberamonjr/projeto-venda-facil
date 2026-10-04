/* ============================================================
   Ajuda da Luxi — pensada para quem nunca usou o sistema (inclusive pessoas de 50+).
   • TrilhaLuxi: lições práticas, um passo por vez. A pessoa toca no botão REAL do app; a lição
     só destaca o lugar (anel) e fala o que fazer. Dá para ouvir em voz alta, voltar e rever.
   • AjudaLuxi: botão fixo no canto inferior direito com busca de dúvidas e atalho para as lições.
   • MensagemDoDia: uma mensagem curta na primeira abertura de cada dia.
   Nada aqui envia dados: o progresso fica só neste aparelho.
   ============================================================ */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./ajuda.css";
import { LICOES, PERGUNTAS, buscarPerguntas, hojeChave, mensagemDeHoje, saudacao, semAcento } from "./conteudo.js";
import { linkSuporte } from "../contato.js";

const CHAVE_TRILHA = "luxi:trilha:v1";
let travas = 0;
/* trava a rolagem da página de trás enquanto uma janela está aberta. Usa uma marca no <html>:
   o app reescreve body.style.overflow a cada atualização e apagaria uma trava feita ali. */
function useTrava(ativa) {
  useEffect(() => {
    if (!ativa) return undefined;
    travas += 1; document.documentElement.classList.add("aj-trava");
    return () => { travas = Math.max(0, travas - 1); if (!travas) document.documentElement.classList.remove("aj-trava"); };
  }, [ativa]);
}
const CHAVE_DIA = "luxi:msgdia";

export function lerProgresso() {
  try { return JSON.parse(localStorage.getItem(CHAVE_TRILHA) || "{}") || {}; } catch (e) { return {}; }
}
function marcarFeita(id) {
  try { const p = lerProgresso(); p[id] = true; localStorage.setItem(CHAVE_TRILHA, JSON.stringify(p)); } catch (e) { /* sem armazenamento: segue sem salvar */ }
}

/* lê o texto em voz alta, se o aparelho souber */
export const sabeFalar = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";
function ouvir(texto) {
  if (!sabeFalar()) return;
  try {
    window.speechSynthesis.cancel();
    const u = new window.SpeechSynthesisUtterance(texto);
    u.lang = "pt-BR"; u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch (e) { /* sem voz: ignora */ }
}
function calar() { try { if (sabeFalar()) window.speechSynthesis.cancel(); } catch (e) { /* ok */ } }

/* acha na tela o botão cujo texto bate (sem ligar para acento/maiúscula); prefere o mais específico */
export function acharAlvo(textos, dentro) {
  if (!textos || !textos.length) return null;
  const raiz = dentro ? document.querySelectorAll(dentro) : [document];
  const alvos = textos.map(semAcento);
  let melhor = null;
  raiz.forEach((r) => {
    r.querySelectorAll("button, a, label, summary, [role=tab], [role=button]").forEach((el) => {
      if (el.closest(".aj-raiz")) return;
      const b = el.getBoundingClientRect();
      if (b.width < 4 || b.height < 4) return;
      const st = getComputedStyle(el);
      if (st.visibility === "hidden" || st.display === "none") return;
      const t = semAcento(el.textContent || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
      if (!t) return;
      if (alvos.some((a) => t === a || t.includes(a))) {
        if (!melhor || t.length < melhor.n) melhor = { el, n: t.length };
      }
    });
  });
  return melhor ? melhor.el : null;
}

/* ---------------- uma lição em andamento ---------------- */
function LicaoAtiva({ licao, irPara, onSair, onFeita }) {
  const [i, setI] = useState(0);
  const [anel, setAnel] = useState(null);
  const visto = useRef(null);
  const passo = licao.passos[i];
  const ultimo = i === licao.passos.length - 1;

  useEffect(() => { calar(); if (passo.aba && irPara) irPara(passo.aba); visto.current = null; }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!passo.alvo) { setAnel(null); return undefined; }
    let vivo = true;
    const procurar = () => {
      const el = acharAlvo(passo.alvo, passo.dentro);
      if (!vivo) return;
      if (!el) { setAnel(null); return; }
      if (visto.current !== el) {
        visto.current = el;
        try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { /* ok */ }
      }
      const b = el.getBoundingClientRect();
      setAnel((a) => (a && Math.abs(a.top - b.top) < 1 && Math.abs(a.left - b.left) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1 ? a : { top: b.top, left: b.left, width: b.width, height: b.height }));
    };
    const t0 = setTimeout(procurar, 260);
    const t = setInterval(procurar, 350);
    return () => { vivo = false; clearTimeout(t0); clearInterval(t); };
  }, [i, passo]);

  useEffect(() => {
    const tecla = (e) => { if (e.key === "Escape") onSair(); };
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("keydown", tecla); calar(); };
  }, [onSair]);

  const noTopo = anel && anel.top > window.innerHeight * 0.55; // o cartão foge do botão destacado

  return (
    <div className="aj-raiz aj-licao" data-aj="licao">
      {anel ? <div className="aj-anel" style={{ top: anel.top - 6, left: anel.left - 6, width: anel.width + 12, height: anel.height + 12 }} aria-hidden="true" /> : null}
      <section className={`aj-cartao ${noTopo ? "aj-cartao--topo" : ""}`} role="region" aria-label={`Lição: ${licao.titulo}`} aria-live="polite">
        <div className="aj-cartao-topo">
          <span className="aj-passo">Passo {i + 1} de {licao.passos.length}</span>
          <button type="button" className="aj-link" onClick={onSair}>Sair da lição</button>
        </div>
        <div className="aj-barra" aria-hidden="true"><span style={{ width: `${((i + 1) / licao.passos.length) * 100}%` }} /></div>
        <h2 className="aj-fala">{passo.fala}</h2>
        <p className="aj-detalhe">{passo.detalhe}</p>
        {passo.alvo && !anel ? <p className="aj-nota">Se não encontrar o botão, toque em “Mostrar onde” depois de ir para a tela certa.</p> : null}
        <div className="aj-acoes">
          {sabeFalar() ? <button type="button" className="aj-bt aj-bt--leve" onClick={() => ouvir(`${passo.fala} ${passo.detalhe}`)}>🔊 Ouvir</button> : null}
          {passo.alvo ? (
            <button type="button" className="aj-bt aj-bt--leve" onClick={() => { visto.current = null; }}>Mostrar onde</button>
          ) : null}
        </div>
        <div className="aj-acoes aj-acoes--fim">
          <button type="button" className="aj-bt aj-bt--leve" disabled={i === 0} onClick={() => setI(i - 1)}>‹ Voltar</button>
          {ultimo ? (
            <button type="button" className="aj-bt aj-bt--forte" onClick={() => onFeita(licao.id)}>Terminei a lição ✓</button>
          ) : (
            <button type="button" className="aj-bt aj-bt--forte" onClick={() => setI(i + 1)}>Fiz! Próximo ›</button>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------------- lista de lições (a trilha) ---------------- */
export function TrilhaLuxi({ irPara, onConcluir, licaoInicial = null, primeiraVez = false }) {
  const [feitas, setFeitas] = useState(lerProgresso);
  const [ativa, setAtiva] = useState(licaoInicial);
  const total = LICOES.length;
  const nFeitas = LICOES.filter((l) => feitas[l.id]).length;
  const intro = primeiraVez && nFeitas === 0; // boas-vindas só enquanto nenhuma lição foi feita
  const licao = LICOES.find((l) => l.id === ativa);
  const topo = useRef(null);

  useTrava(!licao);
  useEffect(() => { if (!licao && topo.current) topo.current.focus(); }, [licao]);
  useEffect(() => {
    if (licao) return undefined;
    const tecla = (e) => { if (e.key === "Escape") onConcluir(); };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [licao, onConcluir]);

  if (licao) {
    return (
      <LicaoAtiva
        licao={licao}
        irPara={irPara}
        onSair={() => (licaoInicial ? onConcluir() : setAtiva(null))}
        onFeita={(id) => { marcarFeita(id); setFeitas(lerProgresso()); if (licaoInicial) onConcluir(); else setAtiva(null); }}
      />
    );
  }

  return (
    <div className="aj-raiz aj-fundo" onClick={onConcluir}>
      <div className="aj-folha" role="dialog" aria-modal="true" aria-labelledby="aj-trilha-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="aj-folha-topo">
          <h2 id="aj-trilha-titulo" ref={topo} tabIndex={-1}>{intro ? "Bem-vinda à Luxi!" : "Aprenda a usar a Luxi"}</h2>
          <button type="button" className="aj-link" onClick={onConcluir}>Fechar</button>
        </div>
        <p className="aj-detalhe">
          {intro
            ? "Vamos aprender juntas, um passo de cada vez. Escolha uma lição. Você pode voltar aqui quando quiser, pelo botão Ajuda."
            : "Escolha uma lição. Cada uma leva poucos minutos e mostra, na própria tela, onde tocar."}
        </p>
        <p className="aj-progresso" role="status">{nFeitas === 0 ? `${total} lições para você` : `Você já fez ${nFeitas} de ${total} lições`}</p>
        <ol className="aj-licoes">
          {LICOES.map((l, n) => (
            <li key={l.id}>
              <button type="button" className={`aj-licao-btn ${feitas[l.id] ? "aj-feita" : ""}`} onClick={() => setAtiva(l.id)}>
                <span className="aj-num" aria-hidden="true">{feitas[l.id] ? "✓" : n + 1}</span>
                <span className="aj-licao-txt">
                  <b>{l.titulo}</b>
                  <small>{l.resumo} · {l.minutos} min</small>
                </span>
                <span className="aj-ir">{feitas[l.id] ? "Rever" : "Começar"}</span>
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="aj-bt aj-bt--leve aj-cheio" onClick={onConcluir}>{intro ? "Fazer depois" : "Voltar para o app"}</button>
      </div>
    </div>
  );
}

/* ---------------- botão de ajuda no canto + painel ---------------- */
export function AjudaLuxi({ aba, irPara }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState(null);
  const [trilha, setTrilha] = useState(null); // null = fechada | { licao: null } = lista | { licao: "id" } = direto numa lição
  const caixa = useRef(null);

  const resultados = useMemo(() => buscarPerguntas(busca), [busca]);
  const daTela = useMemo(() => PERGUNTAS.filter((p) => p.aba === aba), [aba]);
  const lista = busca.trim().length >= 3 ? resultados : daTela.length ? daTela.concat(PERGUNTAS.filter((p) => p.aba !== aba)) : PERGUNTAS;
  const titulo = busca.trim().length >= 3 ? (resultados.length ? "Respostas para você" : "Não achei essa dúvida") : daTela.length ? "Dúvidas desta tela e outras" : "Dúvidas do dia a dia";

  const fechar = useCallback(() => { setAberto(false); setBusca(""); setAberta(null); }, []);

  useEffect(() => {
    if (!aberto) return undefined;
    const tecla = (e) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", tecla);
    const t = setTimeout(() => caixa.current && caixa.current.focus(), 60);
    return () => { document.removeEventListener("keydown", tecla); clearTimeout(t); };
  }, [aberto, fechar]);
  useTrava(aberto);

  if (trilha) return <TrilhaLuxi irPara={irPara} licaoInicial={trilha.licao} onConcluir={() => setTrilha(null)} />;

  return (
    <div className="aj-raiz">
      <button type="button" className="aj-fab" onClick={() => setAberto(true)} aria-haspopup="dialog">
        <span className="aj-fab-ic" aria-hidden="true">?</span>
        <span>Ajuda</span>
      </button>

      {aberto ? (
        <div className="aj-fundo" onClick={fechar}>
          <div className="aj-folha" role="dialog" aria-modal="true" aria-labelledby="aj-ajuda-titulo" onClick={(e) => e.stopPropagation()}>
            <div className="aj-folha-topo">
              <h2 id="aj-ajuda-titulo">Como posso ajudar?</h2>
              <button type="button" className="aj-link" onClick={fechar}>Fechar</button>
            </div>

            <button type="button" className="aj-bt aj-bt--forte aj-cheio" onClick={() => { fechar(); setTrilha({ licao: null }); }}>
              Aprender passo a passo
            </button>

            <label className="aj-campo" htmlFor="aj-busca">Escreva a sua dúvida</label>
            <input id="aj-busca" ref={caixa} className="aj-input" value={busca} placeholder="Ex.: como vender, foto, cliente…" onChange={(e) => { setBusca(e.target.value); setAberta(null); }} autoComplete="off" />

            <h3 className="aj-sub">{titulo}</h3>
            {busca.trim().length >= 3 && !resultados.length ? (
              <p className="aj-detalhe">Tente outra palavra, como “foto”, “vender” ou “cliente”. Ou fale com a gente pelo WhatsApp, logo abaixo.</p>
            ) : null}
            <ul className="aj-perguntas">
              {lista.map((p) => {
                const id = p.q;
                const ab = aberta === id;
                return (
                  <li key={id}>
                    <button type="button" className="aj-pergunta" aria-expanded={ab} onClick={() => setAberta(ab ? null : id)}>
                      <span>{p.q}</span><span aria-hidden="true">{ab ? "−" : "+"}</span>
                    </button>
                    {ab ? (
                      <div className="aj-resposta">
                        <ol>{p.passos.map((s) => <li key={s}>{s}</li>)}</ol>
                        <div className="aj-acoes">
                          {p.licao ? <button type="button" className="aj-bt aj-bt--forte" onClick={() => { fechar(); setTrilha({ licao: p.licao }); }}>Aprender passo a passo</button> : null}
                          {p.aba ? <button type="button" className="aj-bt aj-bt--leve" onClick={() => { fechar(); if (irPara) irPara(p.aba); }}>Me leve até lá</button> : null}
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            <a className="aj-bt aj-bt--zap aj-cheio" href={linkSuporte("Oi! Preciso de ajuda com a Luxi.")} target="_blank" rel="noopener noreferrer">Falar com a gente no WhatsApp</a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- mensagem do dia ---------------- */
export function MensagemDoDia({ pausar = false }) {
  const [mostrar, setMostrar] = useState(false);
  const hoje = hojeChave();

  useEffect(() => {
    if (pausar) return undefined;
    let ja = null;
    try { ja = localStorage.getItem(CHAVE_DIA); } catch (e) { ja = "x"; } // sem armazenamento: não insiste
    if (ja === hoje) return undefined;
    const t = setTimeout(() => setMostrar(true), 700);
    return () => clearTimeout(t);
  }, [pausar, hoje]);

  const fechar = useCallback(() => {
    try { localStorage.setItem(CHAVE_DIA, hoje); } catch (e) { /* ok */ }
    setMostrar(false);
  }, [hoje]);

  useTrava(mostrar && !pausar);
  useEffect(() => {
    if (!mostrar) return undefined;
    const tecla = (e) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [mostrar, fechar]);

  if (!mostrar || pausar) return null;
  return (
    <div className="aj-raiz aj-fundo aj-fundo--centro" onClick={fechar}>
      <div className="aj-folha aj-dia" role="dialog" aria-modal="true" aria-labelledby="aj-dia-titulo" onClick={(e) => e.stopPropagation()}>
        <h2 id="aj-dia-titulo">{saudacao()}!</h2>
        <p className="aj-dia-msg">{mensagemDeHoje()}</p>
        <button type="button" className="aj-bt aj-bt--forte aj-cheio" onClick={fechar} autoFocus>Começar o meu dia</button>
      </div>
    </div>
  );
}
