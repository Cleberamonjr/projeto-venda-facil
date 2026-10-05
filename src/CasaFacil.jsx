import { useState } from "react";
import LojaOnline from "./LojaOnline.jsx";
import { hrefWhats } from "./lona/util.js";

const enviouChave = (id) => "vf:enviou:" + (id || "local");
const brl = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fotoDe = (p) => (p.fotos || [])[0] || "";

async function lerFoto(file) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
  const lado = 900;
  const esc = Math.min(1, lado / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * esc));
  c.height = Math.max(1, Math.round(img.height * esc));
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.72);
}

export default function CasaFacil({ d, salvarPeca, registrarVenda, quitarVenda, recarregar, abrirRomaneio, sair }) {
  const pecas = (d.estoque || []).filter((p) => !p.arquivada && Number(p.qtd) > 0);
  const deve = (d.vendas || []).filter((v) => v.modalidade === "Na confiança" && !v.pago);
  const [porta, setPorta] = useState(() => (localStorage.getItem(enviouChave(d.lojaId)) ? "inicio" : "primeira"));
  const [menu, setMenu] = useState(false);
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [foto, setFoto] = useState("");
  const [quem, setQuem] = useState("");
  const [pago, setPago] = useState("Dinheiro");
  const [pecaId, setPecaId] = useState("");

  const marcarEnviou = () => {
    localStorage.setItem(enviouChave(d.lojaId), "1");
    setPorta("inicio");
  };

  const criar = async () => {
    const venda = Number(String(preco).replace(",", "."));
    if (!nome.trim() || !venda) return;
    setOcupado(true);
    setAviso("");
    try {
      await salvarPeca({
        nome: nome.trim(),
        codigo: "VF" + Date.now().toString().slice(-6),
        qtd: 1,
        custo: 0,
        venda,
        fotos: foto ? [foto] : [],
      });
      setNome("");
      setPreco("");
      setFoto("");
      setAviso("Peça no estoque.");
      if (porta === "primeira") setPorta("mandar");
    } catch (e) {
      setAviso(e.message || "Não salvou.");
    }
    setOcupado(false);
  };

  const mandarPeca = (p) => {
    const texto = [p.nome, brl(p.venda), fotoDe(p)].filter(Boolean).join("\n");
    window.open(hrefWhats("", texto), "_blank", "noopener");
    marcarEnviou();
    setAviso("Abri o WhatsApp com a peça.");
  };

  const vender = async () => {
    const p = pecas.find((x) => x.id === pecaId) || pecas[0];
    if (!p) return;
    setOcupado(true);
    setAviso("");
    try {
      await registrarVenda({
        pecaId: p.id,
        qtd: 1,
        valor: p.venda,
        modalidade: pago,
        cliente: quem.trim() || "Cliente",
        pago: pago !== "Na confiança",
      });
      setQuem("");
      setPorta("inicio");
      setAviso("Venda registrada.");
    } catch (e) {
      setAviso(e.message || "Não registrou.");
    }
    setOcupado(false);
  };

  const proximo = !pecas.length
    ? ["Cadastrar a primeira peça", "pecas"]
    : pecas.some((p) => !fotoDe(p))
      ? ["Pôr foto nas peças", "pecas"]
      : null;

  return (
    <div className="vf">
      <style>{`
        .vf{min-height:100%;background:var(--bege);color:var(--tinta);font-family:"Helvetica Neue",Helvetica,Arial,sans-serif}
        .vf-topo{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 6px}
        .vf-logo{width:44px;height:44px;border-radius:12px;border:1px dashed var(--linha);display:grid;place-items:center;color:var(--tinta-cl);font-size:11px}
        .vf-nome{font-size:20px;letter-spacing:-.04em;font-weight:650}
        .vf-sub{color:var(--tinta-cl);font-size:12px}
        .vf main{padding:8px 18px 108px}
        .vf h1{font-size:30px;line-height:1.12;letter-spacing:-.04em;font-weight:560;margin:8px 0}
        .vf p{color:var(--tinta-cl);line-height:1.4}
        .vf button,.vf input,.vf select{font:inherit;font-size:16px}
        .vf-acao{min-height:50px;width:100%;border:0;border-radius:13px;background:#8C3D48;color:#fff;font-weight:650}
        .vf-fantasma{min-height:48px;width:100%;margin-top:8px;border:1px solid var(--linha);border-radius:13px;background:transparent;color:var(--tinta-cl)}
        .vf-campo{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
        .vf-campo span{font-size:13px;color:var(--tinta-cl)}
        .vf-campo input,.vf-campo select{min-height:48px;border:1px solid var(--linha);border-radius:12px;background:var(--bg-1,#fff);padding:0 12px;color:var(--tinta)}
        .vf-card{background:var(--bg-1,#fff);border:1px solid var(--linha);border-radius:16px;padding:4px 14px}
        .vf-peca{display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--linha)}
        .vf-peca:last-child{border-bottom:0}
        .vf-foto{width:56px;height:56px;border-radius:12px;background:var(--bege-2);flex:0 0 auto;background-size:cover;background-position:center}
        .vf-aviso{background:#F4E8EA;border-radius:14px;padding:12px 14px;margin:12px 0}
        .vf-abas{position:sticky;bottom:0;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--linha);background:var(--bege);padding-bottom:env(safe-area-inset-bottom)}
        .vf-abas button{min-height:56px;border:0;background:transparent;color:var(--tinta-cl)}
        .vf-abas button.on{background:#F4E8EA;color:#8C3D48;font-weight:700}
        .vf-menu{position:fixed;inset:0;background:rgba(43,26,29,.28);display:flex;justify-content:flex-end;z-index:30}
        .vf-lado{width:min(320px,88%);height:100%;background:var(--bege);padding:22px 18px}
        .vf-lado button{width:100%;text-align:left;min-height:48px;border:0;border-bottom:1px solid var(--linha);background:transparent;color:var(--tinta)}
      `}</style>
      <header className="vf-topo">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="vf-logo" aria-label="Espaço do logo">logo</div>
          <div>
            <div className="vf-nome">Venda Fácil</div>
            <div className="vf-sub">{d.perfil?.loja || "sua loja"}</div>
          </div>
        </div>
        {porta !== "primeira" && porta !== "mandar" ? <button className="vf-fantasma" style={{ width: 44, margin: 0 }} onClick={() => setMenu(true)}>Menu</button> : null}
      </header>
      <main>
        {aviso ? <div className="vf-aviso">{aviso}</div> : null}
        {porta === "primeira" ? (
          <>
            <h1>Cadastrar a peça</h1>
            <p>Nome, preço e foto. O código fica para depois.</p>
            {formulario()}
          </>
        ) : null}
        {porta === "mandar" ? (
          <>
            <h1>Mandar no WhatsApp</h1>
            <p>A cliente pediu o modelo. Manda esta peça.</p>
            {lista(true)}
          </>
        ) : null}
        {porta === "inicio" ? inicio() : null}
        {porta === "pecas" ? (
          <>
            <h1>Peças</h1>
            <p>{pecas.length} à venda.</p>
            {lista(false)}
            <div style={{ height: 12 }} />
            {formulario()}
          </>
        ) : null}
        {porta === "vender" ? venderTela() : null}
        {porta === "loja" ? <LojaOnline d={d} irPara={() => setPorta("pecas")} recarregar={recarregar} /> : null}
        {porta === "cobrar" ? cobrar() : null}
      </main>
      {porta !== "primeira" && porta !== "mandar" ? (
        <nav className="vf-abas">
          {[["inicio", "Início"], ["pecas", "Peças"], ["vender", "Vender"], ["loja", "Loja"]].map(([id, rot]) => (
            <button key={id} className={porta === id ? "on" : ""} onClick={() => { setAviso(""); setPorta(id); }}>{rot}</button>
          ))}
        </nav>
      ) : null}
      {menu ? (
        <div className="vf-menu" onClick={() => setMenu(false)}>
          <aside className="vf-lado" onClick={(ev) => ev.stopPropagation()}>
            <button onClick={() => { setMenu(false); abrirRomaneio(); }}>Trazer várias de uma nota</button>
            <button onClick={() => { setMenu(false); setPorta("cobrar"); }}>Quem deve</button>
            <button disabled>Maleta e acerto</button>
            <button disabled>Assinatura · R$ 69,90</button>
            <button onClick={sair}>Sair</button>
          </aside>
        </div>
      ) : null}
    </div>
  );

  function formulario() {
    return (
      <>
        <label className="vf-campo"><span>Nome</span><input value={nome} placeholder="Colar Riviera" onChange={(ev) => setNome(ev.target.value)} /></label>
        <label className="vf-campo"><span>Preço de venda</span><input inputMode="decimal" value={preco} placeholder="70" onChange={(ev) => setPreco(ev.target.value)} /></label>
        <label className="vf-campo"><span>Foto</span><input type="file" accept="image/*" onChange={async (ev) => { const f = ev.target.files && ev.target.files[0]; if (f) setFoto(await lerFoto(f)); }} /></label>
        <button className="vf-acao" disabled={ocupado} onClick={criar}>{ocupado ? "Salvando…" : "Salvar peça"}</button>
      </>
    );
  }

  function lista(mandar) {
    if (!pecas.length) return <p>Nenhuma peça ainda.</p>;
    return (
      <div className="vf-card">
        {pecas.map((p) => (
          <div key={p.id}>
            <div className="vf-peca">
              <div className="vf-foto" style={fotoDe(p) ? { backgroundImage: `url(${fotoDe(p)})` } : null} />
              <div><b>{p.nome}</b><div className="vf-sub">{p.qtd} no estoque</div></div>
              <div style={{ marginLeft: "auto", fontWeight: 650 }}>{brl(p.venda)}</div>
            </div>
            {mandar ? <button className="vf-acao" onClick={() => mandarPeca(p)}>Mandar no WhatsApp</button> : null}
          </div>
        ))}
      </div>
    );
  }

  function inicio() {
    return (
      <>
        <h1>{proximo ? proximo[0] : "O dia está em ordem."}</h1>
        <p>{proximo ? "Uma coisa de cada vez." : "Vendeu, cobrou, mandou a peça."}</p>
        {proximo ? <button className="vf-acao" onClick={() => setPorta(proximo[1])}>{proximo[0]}</button> : null}
        {deve.length ? (
          <button className="vf-fantasma" onClick={() => setPorta("cobrar")}>{deve.length} para cobrar · {brl(deve.reduce((s, v) => s + Number(v.valor || 0), 0))}</button>
        ) : null}
        {lista(true)}
      </>
    );
  }

  function venderTela() {
    if (!pecas.length) return <button className="vf-acao" onClick={() => setPorta("pecas")}>Cadastrar a primeira peça</button>;
    return (
      <>
        <h1>Vender</h1>
        <p>A peça sai do estoque sozinha.</p>
        <label className="vf-campo"><span>Peça</span>
          <select value={pecaId || pecas[0].id} onChange={(ev) => setPecaId(ev.target.value)}>
            {pecas.map((p) => <option key={p.id} value={p.id}>{p.nome} · {brl(p.venda)}</option>)}
          </select>
        </label>
        <label className="vf-campo"><span>Quem comprou</span><input value={quem} placeholder="Nome da cliente" onChange={(ev) => setQuem(ev.target.value)} /></label>
        <label className="vf-campo"><span>Como pagou</span>
          <select value={pago} onChange={(ev) => setPago(ev.target.value)}>
            <option>Dinheiro</option><option>Débito</option><option>Crédito</option><option>Na confiança</option>
          </select>
        </label>
        <button className="vf-acao" disabled={ocupado} onClick={vender}>Registrar venda</button>
      </>
    );
  }

  function cobrar() {
    if (!deve.length) return <p>Ninguém ficou de pagar.</p>;
    return (
      <>
        <h1>Quem deve</h1>
        {deve.map((v) => (
          <div key={v.id} className="vf-card" style={{ marginBottom: 8 }}>
            <div className="vf-peca"><div><b>{v.cliente || "Cliente"}</b><div className="vf-sub">{v.nome}</div></div><div style={{ marginLeft: "auto" }}>{brl(v.valor)}</div></div>
            <button className="vf-acao" onClick={async () => { await quitarVenda(v); setAviso("Recebido."); setPorta("inicio"); }}>Marcar como pago</button>
          </div>
        ))}
      </>
    );
  }
}
