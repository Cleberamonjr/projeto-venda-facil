import React, { useEffect, useMemo, useState } from "react";
import * as dados from "./dados.js";

const TIPOS = [
  ["loja", "🏪", "Tenho uma loja", "Organizo minha própria loja"],
  ["revendedora", "💎", "Sou revendedora", "Vendo produtos de outras marcas"],
  ["ambos", "✨", "Faço os dois", "Loja e revenda"],
];

function Botao({ children, secundario=false, disabled=false, onClick }) {
  return <button type="button" className={secundario ? "oj-btn sec" : "oj-btn"} disabled={disabled} onClick={onClick}>{children}</button>;
}

function CampoSenhaLocal({ value, onChange, label }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="oj-campo">
      <label>{label}</label>
      <div className="oj-senha-wrap">
        <input className="oj-in" type={ver ? "text" : "password"} value={value}
          autoComplete="new-password" onChange={e => onChange(e.target.value)} />
        <button type="button" className="oj-senha-olho" aria-label={ver ? "Ocultar senha" : "Mostrar senha"} onClick={() => setVer(v => !v)}>
          {ver ? "◉" : "○"}
        </button>
      </div>
    </div>
  );
}

export function Cadastro({ onPronto, onMestre, contaLogada, criarConta, tentarEntrar, aoEntrar }) {
  const [etapa, setEtapa] = useState(0);
  const [tipo, setTipo] = useState("");
  const [f, setF] = useState({
    nome: "", email: "", senha: "", senha2: "", loja: "", whatsapp: "",
    plano: "crescimento",
    fornecedores: [{ nome: "", margem: "100" }],
    formas: ["Dinheiro", "Débito", "Crédito", "Na confiança"],
    margem: "100", fiado: true
  });
  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState(false);
  const [inicio, setInicio] = useState("");
  const [beta, setBeta] = useState(null);
  useEffect(() => {
    if (!contaLogada) { setBeta(null); return; }
    let ativo = true;
    dados.meuAcessoBeta().then(v => { if (ativo) setBeta(v); }).catch(() => { if (ativo) setBeta(null); });
    return () => { ativo = false; };
  }, [contaLogada]);
  const diasBeta = beta?.expira_em ? Math.max(1, Math.ceil((new Date(beta.expira_em).getTime() - Date.now()) / 864e5)) : 0;
  const alterar = (k,v) => setF(prev => ({...prev,[k]:v}));

  const avancar = async () => {
    setErro("");
    if (etapa === 1 && !tipo) return setErro("Escolha uma opção para continuar.");
    if (etapa === 2) {
      if (!contaLogada) {
        if (!f.nome.trim() || !f.email.trim() || f.senha.length < 6 || f.senha !== f.senha2)
          return setErro("Preencha seu nome, e-mail e uma senha válida. As senhas precisam ser iguais.");
        setProcessando(true);
        try { await criarConta(f.email.trim(), f.senha); }
        catch (e) { setErro(e.message || "Não consegui criar sua conta. Tente novamente."); setProcessando(false); return; }
        setProcessando(false);
      }
      setEtapa(3); return;
    }
    if (etapa === 3) {
      if (!f.loja.trim()) return setErro("Digite o nome da sua loja.");
      setEtapa(4); return;
    }
    if (etapa === 4) {
      if (!inicio) return setErro("Escolha como você quer começar.");
      setProcessando(true);
      try {
        await onPronto({
          ...f, tipoNegocio: tipo,
          fornecedores: f.fornecedores.filter(x => x.nome.trim())
        });
      } catch (e) {
        setErro(e.message || "Não consegui preparar sua loja.");
      } finally { setProcessando(false); }
      return;
    }
  };

  const voltar = () => { setErro(""); setEtapa(v => Math.max(0, v-1)); };

  if (etapa === 0) return (
    <div className="luxi-onboarding"><EstilosOnboarding />
      <div className="luxi-ob-logo">💗</div>
      <div className="oj-marca"><b>Luxi</b></div>
      <h1 className="oj-h1 oj-serif ob-title">Bem-vinda à Luxi</h1>
      <p className="oj-sub ob-lead">Vamos colocar seu negócio em ordem juntas.</p>
      <p className="ob-copy">Em poucos passos, vamos organizar seus produtos, abrir sua loja on-line e deixar sua gestão pronta para começar.</p>
      {beta && diasBeta > 0 && (
        <div className="ob-beta-card">
          <span>Seu acesso beta</span>
          <b>{diasBeta} dias</b>
          <small>Você usa a Luxi completa durante o período liberado, sem cartão e sem cobrança.</small>
        </div>
      )}
      <div className="ob-progress"><i style={{width:"20%"}} /></div>
      <Botao onClick={() => beta && diasBeta > 0 ? setEtapa(3) : setEtapa(1)}>
        {beta && diasBeta > 0 ? "Começar meu beta" : "Começar"}
      </Botao>
      <div className="ob-note">Você poderá ajustar suas informações depois.</div>
    </div>
  );

  return (
    <div className="luxi-onboarding">
      <div className="ob-head">
        <button type="button" className="ob-back" onClick={voltar} aria-label="Voltar">‹</button>
        <div className="ob-step">{Math.min(etapa,4)} de 4</div>
      </div>
      <div className="ob-progress"><i style={{width:(Math.min(100,(etapa/4)*100))+"%"}} /></div>

      {etapa === 1 && <>
        <h1 className="oj-h1 oj-serif ob-title">Qual é o seu negócio?</h1>
        <p className="ob-copy">Isso ajuda a Luxi a preparar a experiência certa para você e organizar sua rotina de vendas.</p>
        <div className="ob-options">
          {TIPOS.map(([id,icon,title,desc]) => (
            <button type="button" key={id} className="ob-option" data-selected={tipo===id ? "1":"0"} onClick={() => setTipo(id)}>
              <span className="ob-icon">{icon}</span><span><b>{title}</b><small>{desc}</small></span>{tipo===id && <strong>✓</strong>}
            </button>
          ))}
        </div>
        {erro && <div className="oj-erro ob-error">{erro}</div>}
        <Botao onClick={avancar} disabled={!tipo}>Continuar</Botao>
      </>}

      {etapa === 2 && <>
        <h1 className="oj-h1 oj-serif ob-title">Sua conta</h1>
        <p className="ob-copy">{contaLogada ? "Sua conta já está pronta. Vamos preparar sua loja." : "Leva menos de um minuto. Depois você pode começar a organizar seus produtos."}</p>
        {!contaLogada && <>
          <div className="oj-campo"><label>Seu nome</label><input className="oj-in" value={f.nome} autoComplete="name" onChange={e=>alterar("nome",e.target.value)} placeholder="Como você quer ser chamada" /></div>
          <div className="oj-campo"><label>E-mail</label><input className="oj-in" type="email" inputMode="email" autoCapitalize="none" autoComplete="email" value={f.email} onChange={e=>alterar("email",e.target.value)} placeholder="voce@email.com" /></div>
          <CampoSenhaLocal label="Senha — mínimo 6 caracteres" value={f.senha} onChange={v=>alterar("senha",v)} />
          <CampoSenhaLocal label="Repita a senha" value={f.senha2} onChange={v=>alterar("senha2",v)} />
        </>}
        {erro && <div className="oj-erro ob-error">{erro}</div>}
        <Botao onClick={avancar} disabled={processando}>{processando ? "Criando sua conta…" : "Continuar"}</Botao>
      </>}

      {etapa === 3 && <>
        <h1 className="oj-h1 oj-serif ob-title">Seu negócio</h1>
        <p className="ob-copy">Qual nome você quer ver na sua Luxi?</p>
        <div className="oj-campo"><label>Nome da loja</label><input className="oj-in" autoComplete="organization" value={f.loja} onChange={e=>alterar("loja",e.target.value)} placeholder="Ex.: Ateliê Rosa" /></div>
        <div className="oj-campo"><label>WhatsApp comercial <small>(opcional)</small></label><input className="oj-in" type="tel" inputMode="tel" autoComplete="tel" value={f.whatsapp} onChange={e=>alterar("whatsapp",e.target.value)} placeholder="Ex.: +55 11 99999-9999" /></div>
        <div className="ob-note">O WhatsApp ajuda a preparar seu canal de atendimento e sua loja on-line. Você pode configurar ou alterar isso depois.</div>
        {erro && <div className="oj-erro ob-error">{erro}</div>}
        <Botao onClick={avancar} disabled={processando}>Continuar</Botao>
      </>}

      {etapa === 4 && <>
        <h1 className="oj-h1 oj-serif ob-title">Como você quer começar?</h1>
        <p className="ob-copy">Você já tem produtos para cadastrar?</p>
        <div className="ob-options">
          <button type="button" className="ob-option" data-selected={inicio==="importar"?"1":"0"} onClick={()=>setInicio("importar")}>
            <span className="ob-icon">📥</span><span><b>Quero importar meus produtos</b><small>Traga vários produtos de uma vez e evite cadastrar tudo novamente.</small></span>{inicio==="importar"&&<strong>✓</strong>}
          </button>
          <button type="button" className="ob-option" data-selected={inicio==="manual"?"1":"0"} onClick={()=>setInicio("manual")}>
            <span className="ob-icon">➕</span><span><b>Quero adicionar manualmente</b><small>Comece pelas peças mais importantes e complete depois.</small></span>{inicio==="manual"&&<strong>✓</strong>}
          </button>
        </div>
        {erro && <div className="oj-erro ob-error">{erro}</div>}
        <Botao onClick={avancar} disabled={processando || !inicio}>{processando ? "Preparando sua loja…" : "Continuar"}</Botao>
      </>}
    </div>
  );
}

export function getNextBestAction(d) {
  const produtos = Array.isArray(d?.estoque) ? d.estoque : [];
  const vendas = Array.isArray(d?.vendas) ? d.vendas : [];
  const colecoes = Array.isArray(d?.colecoes) ? d.colecoes : [];
  const semFoto = produtos.filter((p) => {
    const fotos = Array.isArray(p?.fotos) ? p.fotos : [];
    return fotos.length === 0 && !p?.capa && !p?.foto && !p?.imagem;
  }).length;

  if (!produtos.length) return {
    type: "produtos", title: "Cadastre seus primeiros produtos",
    description: "Comece trazendo suas peças para a Luxi.",
    cta: "Adicionar produtos", aba: "estoque"
  };
  if (semFoto > 0) return {
    type: "fotos", title: "Adicione fotos aos seus produtos",
    description: "Comece pelas peças que você quer destacar.",
    cta: "Adicionar fotos", aba: "estoque"
  };
  if (!colecoes.length) return {
    type: "catalogo", title: "Sua loja on-line está quase pronta",
    description: "Organize suas peças em uma coleção e prepare sua Lona para as clientes pedirem.",
    cta: "Preparar loja on-line", aba: "lona"
  };
  if (!vendas.length) return {
    type: "venda", title: "Vamos registrar sua primeira venda",
    description: "A primeira venda começa a transformar seus dados em informação útil.",
    cta: "Registrar venda", aba: "vendas"
  };
  return {
    type: "analise", title: "Veja o que suas vendas estão mostrando",
    description: "Continue registrando suas vendas para encontrar padrões reais.",
    cta: "Ver análise", aba: "graficos"
  };
}

export function ProximoPasso({ d, irPara }) {
  const acao = getNextBestAction(d);
  return (
    <div className="ob-next ob-next-dashboard">
      <div className="ob-next-copy">
        <span>Próximo passo</span><b>{acao.title}</b><small>{acao.description}</small>
      </div>
      <button type="button" className="oj-btn mini" onClick={() => irPara(acao.aba)}>
        {acao.cta} →
      </button>
    </div>
  );
}

export function TourLuxi({ irPara, onConcluir }) {
  const [etapa, setEtapa] = useState(0);
  const [alvo, setAlvo] = useState(null);
  const passos = [
    { aba:"painel", alvo:'[data-tour-role="inicio"]', titulo:"A Luxi começa aqui", texto:"Este é o seu ponto de partida. Aqui você acompanha o que merece atenção e encontra os principais caminhos da sua operação." },
    { aba:"estoque", alvo:'[data-tour-role="pecas"]', titulo:"Suas peças", texto:"Aqui você cadastra produtos, adiciona fotos, preços e organiza suas coleções. É a base para a Luxi trabalhar com dados reais." },
    { aba:"vendas", alvo:'[data-tour-role="vendas"]', titulo:"Suas vendas", texto:"Registre as vendas aqui. Esse histórico mantém a operação organizada e alimenta as orientações da Luxi." },
    { aba:"clientes", alvo:'[data-tour-role="clientes"]', titulo:"Suas clientes", texto:"Aqui ficam as informações do relacionamento com quem compra de você, sem espalhar a operação por vários lugares." },
    { aba:"lona", alvo:'[data-tour-role="lona-screen"]', titulo:"Sua loja on-line", texto:"A Lona é a vitrine pública da sua Luxi. Você organiza suas peças e prepara o espaço para suas clientes conhecerem e pedirem produtos." },
    { aba:"conselho", alvo:'[data-tour-role="conselheira-screen"]', titulo:"Sua Conselheira", texto:"Ela transforma o que você registra em próximos passos úteis, para você saber o que merece atenção sem precisar procurar." },
  ];
  const passo = passos[etapa];

  useEffect(() => {
    irPara(passo.aba);
  }, [etapa]);

  useEffect(() => {
    let ativo = true;
    const localizar = () => {
      const el = document.querySelector(passo.alvo);
      if (!el) { if (ativo) setAlvo(null); return; }
      const r = el.getBoundingClientRect();
      if (ativo) setAlvo({ top:r.top, left:r.left, width:r.width, height:r.height });
      el.scrollIntoView({ block:"nearest", inline:"nearest" });
    };
    const t = setTimeout(localizar, 240);
    window.addEventListener("resize", localizar);
    window.addEventListener("scroll", localizar, true);
    return () => { ativo=false; clearTimeout(t); window.removeEventListener("resize", localizar); window.removeEventListener("scroll", localizar, true); };
  }, [etapa, passo.alvo]);

  const proximo = () => etapa === passos.length - 1 ? onConcluir() : setEtapa(v => v + 1);
  return (
    <div className="ob-tour" role="dialog" aria-modal="true" aria-label="Tour guiado da Luxi">
      <EstilosOnboarding />
      <div className="ob-tour-dim" />
      {alvo && <div className="ob-tour-focus" style={{top:alvo.top-7,left:alvo.left-7,width:alvo.width+14,height:alvo.height+14}} />}
      {alvo && <div className="ob-tour-arrow" style={{top:Math.max(18,alvo.top-28),left:Math.min(window.innerWidth-38,Math.max(18,alvo.left+alvo.width/2-14))}}>↓</div>}
      <div className="ob-tour-card">
        <div className="ob-tour-head"><span>{etapa+1} de {passos.length}</span><button type="button" onClick={onConcluir}>Pular tour</button></div>
        <div className="ob-tour-kicker">LUXI · {passo.aba==="lona" ? "LOJA ON-LINE" : passo.aba==="conselho" ? "CONSELHEIRA" : "GESTÃO"}</div>
        <h2>{passo.titulo}</h2>
        <p>{passo.texto}</p>
        <div className="ob-tour-hint">{alvo ? "A área destacada é onde isso acontece. Observe na própria tela." : "Carregando a área desta etapa…"}</div>
        <div className="ob-tour-actions">
          <button type="button" className="oj-btn sec" onClick={onConcluir}>Pular</button>
          <button type="button" className="oj-btn" onClick={proximo}>{etapa===passos.length-1 ? "Começar a usar" : "Próximo →"}</button>
        </div>
      </div>
    </div>
  );
}

export function OnboardingOperacional({ d, onImportar, irPara, onConcluir }) {
  const [modo, setModo] = useState("tour");
  const [etapa, setEtapa] = useState(0);
  const produtos = Array.isArray(d?.estoque) ? d.estoque : [];
  const semFoto = produtos.filter((p) => {
    const fotos = Array.isArray(p?.fotos) ? p.fotos : [];
    return fotos.length === 0 && !p?.capa && !p?.foto && !p?.imagem;
  }).length;
  const acao = useMemo(() => getNextBestAction(d), [d]);

  if (modo === "tour") return <TourLuxi irPara={irPara} onConcluir={onConcluir} />;

  if (etapa === 0) return (
    <div className="ob-overlay"><EstilosOnboarding /><div className="ob-sheet">
      <div className="ob-step">Preenchimento assistido</div>
      <h2>Vamos preparar seus primeiros produtos.</h2>
      <p>Você pode importar um romaneio ou cadastrar manualmente. A Luxi não cria dados fictícios.</p>
      <Botao onClick={() => { onImportar(); setEtapa(1); }}>📥 Importar meus produtos</Botao>
      <button type="button" className="oj-link-sutil" onClick={() => setModo("tour")}>Voltar ao tour</button>
      <button type="button" className="oj-link-sutil" onClick={onConcluir}>Fazer depois</button>
    </div></div>
  );

  if (etapa === 1) {
    const quantidade = produtos.length;
    return (
      <div className="ob-overlay"><EstilosOnboarding /><div className="ob-sheet">
        <div className="ob-step">Preenchimento assistido</div>
        <h2>{quantidade ? "Seus produtos já estão aqui." : "Vamos cadastrar seus produtos."}</h2>
        <p>{quantidade ? "✨ " + quantidade + (quantidade===1 ? " produto chegou" : " produtos chegaram") + " à sua Luxi." : "A importação ainda não adicionou produtos. Você pode tentar novamente ou continuar manualmente."}</p>
        {quantidade>0 && <div className="ob-photo-grid">{produtos.slice(0,3).map(p => {
          const foto=Array.isArray(p?.fotos)&&p.fotos[0]?p.fotos[0]:(p?.capa||p?.foto||p?.imagem);
          return <div key={p.id} className="ob-photo-card">{foto?<img src={foto} alt="" />:<span>＋ Foto</span>}<small>{p.nome||p.codigo||"Produto"}</small></div>;
        })}</div>}
        <Botao onClick={() => { if(quantidade&&semFoto) irPara("estoque"); setEtapa(2); }}>{quantidade&&semFoto?"Adicionar fotos":"Continuar"}</Botao>
        <button type="button" className="oj-link-sutil" onClick={() => setEtapa(2)}>Fazer depois</button>
      </div></div>
    );
  }

  return (
    <div className="ob-overlay"><EstilosOnboarding /><div className="ob-sheet">
      <div className="ob-step">Próximo passo</div>
      <h2>💗 Sua Luxi está pronta.</h2>
      <p>O tour mostrou onde as principais funções ficam. Agora você pode preencher no seu ritmo.</p>
      <div className="ob-next"><span>Luxi recomenda</span><b>{acao.title}</b><small>{acao.description}</small></div>
      <Botao onClick={onConcluir}>Começar a usar a Luxi</Botao>
    </div></div>
  );
}

const ONBOARDING_CSS = String.raw`/* ===== onboarding Luxi v2.3 ===== */
.luxi-onboarding{min-height:100vh;max-width:520px;margin:0 auto;padding:48px 24px 40px;background:linear-gradient(to bottom,#FBF8F9,#F5EEF0);display:flex;flex-direction:column;justify-content:center}
.luxi-onboarding .oj-btn{margin-top:18px}.luxi-onboarding .oj-campo{margin-bottom:13px}.luxi-onboarding .oj-in{background:#fff}.luxi-onboarding .oj-marca{text-align:center;font-size:32px}
.luxi-onboarding .ob-title{font-size:34px;margin-top:18px}.ob-lead{font-size:19px;color:var(--rose-esc);line-height:1.4;margin-top:10px}.ob-copy{font-size:14px;line-height:1.6;color:var(--tinta-cl);margin:10px 0 18px}.ob-beta-card{padding:14px;border:1px solid var(--rose);background:var(--rose-cl);border-radius:14px;margin:16px 0 4px}.ob-beta-card span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--rose-btn);font-weight:700}.ob-beta-card b{display:block;font-size:28px;color:var(--marinho);margin:3px 0}.ob-beta-card small{display:block;font-size:11.5px;line-height:1.45;color:var(--tinta-cl)}
.ob-note{font-size:11.5px;line-height:1.5;color:var(--tinta-cl);text-align:center;margin-top:12px}
.luxi-ob-logo{width:64px;height:64px;border-radius:50%;background:var(--rose-cl);display:grid;place-items:center;margin:0 auto 8px;font-size:27px}
.ob-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}.ob-back{width:44px;height:44px;border:0;background:transparent;color:var(--tinta);font-size:30px;border-radius:10px}.ob-step{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--tinta-cl);font-weight:700}
.ob-progress{height:5px;background:var(--linha);border-radius:99px;overflow:hidden;margin:8px 0 24px}.ob-progress i{display:block;height:100%;background:var(--rose-btn);border-radius:99px;transition:width .25s ease}
.ob-options{display:flex;flex-direction:column;gap:10px;margin:18px 0}.ob-option{display:flex;align-items:center;gap:12px;width:100%;min-height:74px;padding:13px 14px;border:1px solid var(--linha);background:#fff;border-radius:16px;text-align:left;color:var(--tinta);font:inherit;cursor:pointer}
.ob-option[data-selected="1"]{border-color:var(--rose);background:var(--rose-cl);box-shadow:0 4px 14px -8px rgba(160,96,109,.35)}.ob-option .ob-icon{font-size:25px;flex:none}.ob-option span:nth-child(2){flex:1;min-width:0}.ob-option b{display:block;font-size:15px;line-height:1.3}.ob-option small{display:block;color:var(--tinta-cl);font-size:11.5px;line-height:1.35;margin-top:3px}.ob-option strong{color:var(--rose-btn);font-size:18px}.ob-error{margin:10px 0!important}
.ob-overlay{position:fixed;inset:0;z-index:75;background:rgba(58,47,53,.42);backdrop-filter:blur(3px);display:flex;align-items:flex-end;justify-content:center;padding:14px}.ob-sheet{width:min(520px,100%);background:var(--bege);border:1px solid var(--linha);border-radius:22px;padding:24px 20px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -12px 50px -20px rgba(58,47,53,.45);animation:sobe .25s ease both}.ob-sheet h2{font-size:25px;line-height:1.2;margin:8px 0;color:var(--tinta)}.ob-sheet p{font-size:14px;line-height:1.55;color:var(--tinta-cl);margin:7px 0 14px}
.ob-photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.ob-photo-card{min-width:0;aspect-ratio:1/1;border:1px solid var(--linha);border-radius:12px;background:var(--bege-2);overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.ob-photo-card img{width:100%;height:100%;object-fit:cover}.ob-photo-card span{font-size:13px;color:var(--rose-btn);font-weight:700}.ob-photo-card small{display:block;max-width:100%;padding:3px 5px;font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ob-advice{padding:14px;border:1px solid var(--linha);background:var(--rose-cl);border-radius:14px;margin:16px 0}.ob-advice b{display:block;color:var(--rose-btn);font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px}.ob-advice span{display:block;font-size:13px;line-height:1.5;color:var(--tinta)}
.ob-next{padding:15px;border:1px solid var(--rose);background:var(--rose-cl);border-radius:14px;margin:16px 0}.ob-next span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--rose-btn);font-weight:700}.ob-next b{display:block;font-size:16px;line-height:1.35;margin-top:5px;color:var(--tinta)}.ob-next small{display:block;font-size:11.5px;line-height:1.45;color:var(--tinta-cl);margin-top:4px}
@media(max-width:400px){.luxi-onboarding{padding-left:16px;padding-right:16px}.luxi-onboarding .ob-title{font-size:29px}.ob-sheet{padding-left:16px;padding-right:16px}}
@media(prefers-reduced-motion:reduce){.ob-progress i,.ob-sheet{transition:none;animation:none}}\n.ob-next-dashboard{margin:12px 20px 18px;display:flex;align-items:center;gap:12px;justify-content:space-between}.ob-next-dashboard .ob-next-copy{flex:1;min-width:0}.ob-next-dashboard .oj-btn{flex:0 0 auto;width:auto;margin:0}.ob-next-dashboard b{font-size:15px}.ob-next-dashboard small{max-width:520px}

.ob-tour{position:fixed;inset:0;z-index:80;pointer-events:none}.ob-tour-dim{position:absolute;inset:0;background:rgba(38,28,33,.54)}.ob-tour-focus{position:fixed;z-index:81;border:2px solid var(--rose-btn);border-radius:14px;box-shadow:0 0 0 9999px rgba(38,28,33,.54),0 0 0 6px rgba(196,138,148,.18);pointer-events:none;transition:top .22s,left .22s,width .22s,height .22s}.ob-tour-arrow{position:fixed;z-index:82;width:28px;height:28px;border-radius:50%;background:var(--rose-btn);color:#fff;display:grid;place-items:center;font-weight:800;box-shadow:0 5px 16px rgba(0,0,0,.22);pointer-events:none}.ob-tour-card{position:fixed;z-index:83;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(500px,calc(100% - 24px));background:var(--bege);border:1px solid var(--linha);border-radius:20px;padding:17px 18px 16px;box-shadow:0 -12px 50px -18px rgba(38,28,33,.55);pointer-events:auto}.ob-tour-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.ob-tour-head span,.ob-tour-kicker{font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:var(--rose-btn)}.ob-tour-head button{border:0;background:none;color:var(--tinta-cl);font:inherit;font-size:11px;text-decoration:underline;cursor:pointer}.ob-tour-kicker{margin-top:10px}.ob-tour-card h2{font-size:22px;line-height:1.2;margin:5px 0;color:var(--tinta)}.ob-tour-card p{font-size:13px;line-height:1.5;color:var(--tinta-cl);margin:0 0 8px}.ob-tour-hint{font-size:11px;line-height:1.4;color:var(--tinta-cl);padding:9px 10px;border-radius:10px;background:var(--rose-cl);margin:8px 0 10px}.ob-tour-actions{display:flex;gap:8px}.ob-tour-actions .oj-btn{flex:1;margin:0}.ob-tour-actions .sec{flex:0 0 34%}@media(max-width:400px){.ob-tour-card{padding:15px}.ob-tour-card h2{font-size:20px}}
`;

function EstilosOnboarding() {
  return <style>{ONBOARDING_CSS}</style>;
}
