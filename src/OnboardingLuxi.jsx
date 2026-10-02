import React, { useMemo, useState } from "react";

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
    nome: "", email: "", senha: "", senha2: "", loja: "",
    plano: "crescimento",
    fornecedores: [{ nome: "", margem: "100" }],
    formas: ["Dinheiro", "Débito", "Crédito", "Na confiança"],
    margem: "100", fiado: true
  });
  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState(false);
  const [inicio, setInicio] = useState("");
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
    <div className="luxi-onboarding">
      <div className="luxi-ob-logo">💗</div>
      <div className="oj-marca"><b>Luxi</b></div>
      <h1 className="oj-h1 oj-serif ob-title">Bem-vinda à Luxi</h1>
      <p className="oj-sub ob-lead">Vamos colocar seu negócio em ordem juntas.</p>
      <p className="ob-copy">Em poucos passos, vamos organizar seus produtos, preparar seu catálogo e deixar sua gestão pronta para começar.</p>
      <div className="ob-progress"><i style={{width:"20%"}} /></div>
      <Botao onClick={() => setEtapa(1)}>Começar</Botao>
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
        <p className="ob-copy">Isso ajuda a Luxi a preparar a experiência certa para você.</p>
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
        <div className="ob-note">Você poderá alterar isso depois.</div>
        {erro && <div className="oj-erro ob-error">{erro}</div>}
        <Botao onClick={avancar} disabled={processando}>Continuar</Botao>
      </>}

      {etapa === 4 && <>
        <h1 className="oj-h1 oj-serif ob-title">Como você quer começar?</h1>
        <p className="ob-copy">Você já tem produtos para cadastrar?</p>
        <div className="ob-options">
          <button type="button" className="ob-option" data-selected={inicio==="importar"?"1":"0"} onClick={()=>setInicio("importar")}>
            <span className="ob-icon">📥</span><span><b>Quero importar meus produtos</b><small>Traga vários produtos de uma vez.</small></span>{inicio==="importar"&&<strong>✓</strong>}
          </button>
          <button type="button" className="ob-option" data-selected={inicio==="manual"?"1":"0"} onClick={()=>setInicio("manual")}>
            <span className="ob-icon">➕</span><span><b>Quero adicionar manualmente</b><small>Comece cadastrando suas primeiras peças.</small></span>{inicio==="manual"&&<strong>✓</strong>}
          </button>
        </div>
        {erro && <div className="oj-erro ob-error">{erro}</div>}
        <Botao onClick={avancar} disabled={processando || !inicio}>{processando ? "Preparando sua loja…" : "Continuar"}</Botao>
      </>}
    </div>
  );
}

export function ProximoPasso({ d, irPara }) {
  const produtos = Array.isArray(d?.estoque) ? d.estoque : [];
  const semFoto = produtos.filter(p => !p.capa && !p.foto && !p.imagem).length;
  let acao = { type:"produtos", title:"Cadastre seus primeiros produtos", description:"Comece trazendo suas peças para a Luxi.", cta:"Adicionar produtos", aba:"estoque" };
  if (produtos.length && semFoto > 0) acao = { type:"fotos", title:"Adicione fotos aos seus produtos", description:"Comece pelas peças que você quer destacar.", cta:"Adicionar fotos", aba:"estoque" };
  else if (produtos.length && !d?.perfil?.catalogoPronto && !d?.catalogoPronto) acao = { type:"catalogo", title:"Seu catálogo está quase pronto", description:"Prepare uma vitrine para compartilhar com suas clientes.", cta:"Preparar catálogo", aba:"catalogo" };
  else if (produtos.length && (!Array.isArray(d?.vendas) || d.vendas.length === 0)) acao = { type:"venda", title:"Vamos registrar sua primeira venda", description:"A primeira venda começa a transformar seus dados em informação útil.", cta:"Registrar venda", aba:"vendas" };
  else if (produtos.length) acao = { type:"analise", title:"Veja o que suas vendas estão mostrando", description:"Continue registrando suas vendas para encontrar padrões reais.", cta:"Ver análise", aba:"conselho" };
  return (
    <div className="ob-next ob-next-dashboard">
      <div className="ob-next-copy"><span>Próximo passo</span><b>{acao.title}</b><small>{acao.description}</small></div>
      <button type="button" className="oj-btn mini" onClick={() => irPara(acao.aba)}>{acao.cta} →</button>
    </div>
  );
}

export function OnboardingOperacional({ d, onImportar, irPara, onConcluir }) {
  const [etapa,setEtapa]=useState(0);
  const produtos=Array.isArray(d?.estoque)?d.estoque:[];
  const semFoto=produtos.filter(p=>!p.capa && !p.foto && !p.imagem).length;
  const proximo=useMemo(()=>{
    if (!produtos.length) return {type:"produtos",title:"Cadastre seus primeiros produtos"};
    if (semFoto>0) return {type:"fotos",title:"Adicione fotos aos seus produtos"};
    if (!d?.perfil?.catalogoPronto && !d?.catalogoPronto) return {type:"catalogo",title:"Seu catálogo está quase pronto"};
    if (!Array.isArray(d?.vendas) || d.vendas.length===0) return {type:"venda",title:"Vamos registrar sua primeira venda"};
    return {type:"analise",title:"Veja o que suas vendas estão mostrando"};
  },[produtos.length,semFoto,d?.perfil?.catalogoPronto,d?.catalogoPronto,d?.vendas?.length]);

  if(etapa===0) return (
    <div className="ob-overlay">
      <div className="ob-sheet">
        <div className="ob-step">4 de 7</div>
        <h2>Vamos trazer seus produtos para a Luxi.</h2>
        <p>Você não precisa cadastrar tudo novamente.</p>
        <div className="ob-progress"><i style={{width:"57%"}} /></div>
        <Botao onClick={()=>{onImportar();setEtapa(1)}}>📥 Importar meus produtos</Botao>
        <button type="button" className="oj-link-sutil" onClick={()=>onConcluir()}>Prefiro adicionar manualmente</button>
        <div className="ob-note">A importação usa a função real de romaneio da Luxi. Não criamos dados fictícios.</div>
      </div>
    </div>
  );

  if(etapa===1) return (
    <div className="ob-overlay">
      <div className="ob-sheet">
        <div className="ob-step">5 de 7</div>
        <h2>Seus produtos já estão aqui.</h2>
        <p>{produtos.length ? produtos.length+" "+(produtos.length===1?"produto chegou":"produtos chegaram")+" à sua Luxi." : "Você pode começar adicionando suas primeiras peças."}</p>
        <div className="ob-photo-grid">
          {produtos.slice(0,3).map(p=><div key={p.id} className="ob-photo-card">{p.capa||p.foto||p.imagem ? <img src={p.capa||p.foto||p.imagem} alt="" />:<span>＋ Foto</span>}<small>{p.nome||p.codigo||"Produto"}</small></div>)}
        </div>
        <p className="ob-copy">Agora você pode adicionar fotos às peças que quiser. Não precisa fazer tudo agora.</p>
        <Botao onClick={()=>{onConcluir();irPara("estoque")}}>Adicionar fotos</Botao>
        <button type="button" className="oj-link-sutil" onClick={()=>onConcluir()}>Fazer depois</button>
      </div>
    </div>
  );

  if(etapa===2) return (
    <div className="ob-overlay">
      <div className="ob-sheet">
        <div className="ob-step">6 de 7</div>
        <h2>💡 A Luxi também observa seu negócio.</h2>
        <p>Conforme você registrar produtos, clientes e vendas, ela vai ajudar você a perceber o que merece sua atenção.</p>
        <div className="ob-advice"><b>Uma ideia da Luxi</b><span>Vou mostrar uma próxima ação útil quando houver algo que mereça sua atenção.</span></div>
        <Botao onClick={()=>setEtapa(3)}>Entendi</Botao>
      </div>
    </div>
  );

  return (
    <div className="ob-overlay">
      <div className="ob-sheet">
        <div className="ob-step">7 de 7</div>
        <h2>💗 Sua Luxi está pronta.</h2>
        <p>Você já começou a organizar seu negócio.</p>
        <div className="ob-next"><span>Próximo passo</span><b>{proximo.title}</b><small>A Luxi vai continuar guiando você por aqui.</small></div>
        <Botao onClick={onConcluir}>Começar a usar a Luxi</Botao>
      </div>
    </div>
  );
}

/* ===== onboarding Luxi v2.3 ===== */
.luxi-onboarding{min-height:100vh;max-width:520px;margin:0 auto;padding:48px 24px 40px;background:linear-gradient(to bottom,#FBF8F9,#F5EEF0);display:flex;flex-direction:column;justify-content:center}
.luxi-onboarding .oj-btn{margin-top:18px}.luxi-onboarding .oj-campo{margin-bottom:13px}.luxi-onboarding .oj-in{background:#fff}.luxi-onboarding .oj-marca{text-align:center;font-size:32px}
.luxi-onboarding .ob-title{font-size:34px;margin-top:18px}.ob-lead{font-size:19px;color:var(--rose-esc);line-height:1.4;margin-top:10px}.ob-copy{font-size:14px;line-height:1.6;color:var(--tinta-cl);margin:10px 0 18px}.ob-note{font-size:11.5px;line-height:1.5;color:var(--tinta-cl);text-align:center;margin-top:12px}
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
