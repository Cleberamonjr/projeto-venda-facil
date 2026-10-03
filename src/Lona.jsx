/* ============================================================
   Lona (tela do app) — a dona e cada consultora montam a vitrine e tratam os pedidos.
   Fica fora do App.jsx de propósito: o App só a chama. Tudo grava por funções do banco
   (dados.js), que conferem quem está chamando. Rascunho salva sozinho; só "Publicar" muda o que a cliente vê.
   ============================================================ */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as dados from "./dados.js";
import Vitrine from "./lona/Vitrine.jsx";
import "./lona/editor.css";
import {
  CORES, FONTES, MODELO_PADRAO, brl, centavosParaCampo, comprimirParaBlob, corValida, fotoUsavel,
  hrefWhats, igual, linkDaLona, paraCentavos,
} from "./lona/util.js";

const https = (u) => typeof u === "string" && /^https:\/\//.test(u);
const indicesFoto = (fotos) => (Array.isArray(fotos) ? fotos : []).map((f, i) => (https(f) ? i : -1)).filter((i) => i >= 0);
const normalizar = (r) => ({
  nome: "", frase: "", fonte: "helvetica", cor: "#1a1a1a", whatsapp: "", modelo: MODELO_PADRAO, capa: null,
  links: [], ordem: [], itens: {}, ...(r || {}),
});
const novoItem = (p) => ({ preco: "preco", centavos: Math.round(Number(p.venda || 0) * 100), tamanho: true, banho: true, nota: "", foto: indicesFoto(p.fotos)[0] ?? 0 });
const erroTexto = (e) => (e && e.message) || "Não deu certo. Tente de novo.";

function rotuloDoPedido(p) {
  if (p.status === "confirmado") return ["Virou venda", "ativo"];
  if (p.status === "cancelado") return ["Cancelado", "vencido"];
  if (!p.reserva_ativa) return ["Reserva vencida", "vencido"];
  return p.origem === "pago_loja" ? ["Avisou que pagou", "ativo"] : ["Entrega a combinar", "ativo"];
}

export default function Lona({ d, recarregar }) {
  const lojaId = d.lojaId;
  const [fase, setFase] = useState("carregando"); // carregando | ok | erro
  const [erroGeral, setErroGeral] = useState("");
  const [resumo, setResumo] = useState([]);
  const [consultoraId, setConsultoraId] = useState(null);
  const [lona, setLona] = useState(null);
  const [rasc, setRasc] = useState(normalizar());
  const [salvoRasc, setSalvoRasc] = useState(null);
  const [salvo, setSalvo] = useState("salvo"); // salvo | pendente | salvando | erro
  const [aba, setAba] = useState("lona");
  const [aviso, setAviso] = useState(null);
  const [busca, setBusca] = useState("");
  const [previa, setPrevia] = useState(false);
  const [ocupado, setOcupado] = useState("");
  const [tirando, setTirando] = useState(false);
  const [pix, setPix] = useState("");
  const [pedidos, setPedidos] = useState(null);
  const [conf, setConf] = useState(null); // { id, valores }
  const [cancelando, setCancelando] = useState(null);

  const rascRef = useRef(rasc);
  const lonaRef = useRef(null);
  const timer = useRef(null);
  const fila = useRef(Promise.resolve());
  const pendente = useRef(false);

  const estoque = useMemo(() => (d.estoque || []).filter((p) => !p.arquivada), [d.estoque]);
  const porId = useMemo(() => Object.fromEntries((d.estoque || []).map((p) => [p.id, p])), [d.estoque]);
  const podeEditar = !!(lona && lona.pode_editar);
  const ehDona = !(d.perfil && d.perfil.papel === "consultora" && !d.perfil.mestre);

  /* ---------- salvar sozinho ---------- */
  const salvarAgora = useCallback(() => {
    clearTimeout(timer.current);
    fila.current = fila.current.then(async () => {
      const l = lonaRef.current;
      if (!l || !l.pode_editar || !pendente.current) return;
      const enviado = rascRef.current;
      pendente.current = false;
      setSalvo("salvando");
      try {
        const r = await dados.lonaSalvar(l.id, enviado);
        setSalvoRasc(r);
        setSalvo(pendente.current ? "pendente" : "salvo");
      } catch (e) {
        pendente.current = true;
        setSalvo("erro");
        setAviso({ tipo: "erro", texto: erroTexto(e) });
      }
    });
    return fila.current;
  }, []);

  const alterar = useCallback((fn) => {
    const novo = fn(rascRef.current);
    rascRef.current = novo;
    setRasc(novo);
    pendente.current = true;
    setSalvo("pendente");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { salvarAgora(); }, 900);
  }, [salvarAgora]);

  useEffect(() => () => { clearTimeout(timer.current); if (pendente.current) salvarAgora(); }, [salvarAgora]);

  /* ---------- carregar ---------- */
  const abrirLona = useCallback(async (cid) => {
    try {
      await salvarAgora();
      const l = await dados.lonaMinha(cid);
      lonaRef.current = l;
      const r = normalizar(l.rascunho);
      rascRef.current = r;
      pendente.current = false;
      setLona(l); setRasc(r); setSalvoRasc(r); setSalvo("salvo"); setPix(l.pix_chave || "");
      setFase("ok");
    } catch (e) {
      setErroGeral(erroTexto(e));
      setFase("erro");
    }
  }, [salvarAgora]);

  useEffect(() => {
    if (!lojaId) return;
    let vivo = true;
    (async () => {
      try {
        const lista = await dados.lonaResumo();
        if (!vivo) return;
        setResumo(lista);
        const minha = lista.find((c) => (ehDona ? c.eh_dona : true)) || lista[0];
        const cid = minha ? minha.consultora_id : null;
        setConsultoraId(cid);
        await abrirLona(cid);
      } catch (e) {
        if (vivo) { setErroGeral(erroTexto(e)); setFase("erro"); }
      }
    })();
    return () => { vivo = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaId]);

  const trocarConsultora = async (cid) => {
    if (cid === consultoraId) return;
    setConsultoraId(cid); setFase("carregando"); setAviso(null); setConf(null); setPrevia(false);
    await abrirLona(cid);
  };

  const carregarPedidos = useCallback(async () => {
    try { setPedidos(await dados.lonaPedidos(null)); }
    catch (e) { setPedidos([]); setAviso({ tipo: "erro", texto: erroTexto(e) }); }
  }, []);
  useEffect(() => { if (fase === "ok" && aba === "pedidos") carregarPedidos(); }, [aba, fase, carregarPedidos]);

  const recarregarResumo = async () => { try { setResumo(await dados.lonaResumo()); } catch (e) { /* mantém */ } };

  /* ---------- sem loja real (demonstração / administradora) ---------- */
  if (!lojaId) {
    return (
      <div className="oj-vazio">
        <span className="oj-serif">A lona fica na sua loja</span>
        Ela funciona na conta de uma loja real. Aqui, na demonstração, não há cliente para abrir o link.
      </div>
    );
  }
  if (fase === "carregando") return <div className="oj-vazio" role="status">Abrindo sua lona…</div>;
  if (fase === "erro") {
    return (
      <div className="oj-vazio">
        <span className="oj-serif">Não deu para abrir a lona</span>
        {erroGeral}
        <div style={{ marginTop: 14 }}><button className="oj-btn" style={{ width: "auto" }} onClick={() => { setFase("carregando"); abrirLona(consultoraId); }}>Tentar de novo</button></div>
      </div>
    );
  }

  /* ---------- derivados ---------- */
  const noAr = !!lona.publicado;
  const mudou = salvo !== "salvo" || !igual(salvoRasc, lona.publicado);
  const link = noAr ? linkDaLona(lona.slug) : null;
  const q = busca.trim().toLowerCase();
  const incluidas = rasc.ordem;
  const fora = estoque.filter((p) => !rasc.ordem.includes(p.id) && (!q || [p.codigo, p.nome, p.banho].some((x) => String(x || "").toLowerCase().includes(q))));

  const incluir = (p) => alterar((r) => ({ ...r, ordem: [...r.ordem, p.id], itens: { ...r.itens, [p.id]: r.itens[p.id] || novoItem(p) } }));
  const tirar = (id) => alterar((r) => {
    const itens = { ...r.itens }; delete itens[id];
    return { ...r, ordem: r.ordem.filter((x) => x !== id), itens };
  });
  const mover = (id, delta) => alterar((r) => {
    const i = r.ordem.indexOf(id), j = i + delta;
    if (i < 0 || j < 0 || j >= r.ordem.length) return r;
    const ordem = [...r.ordem]; [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
    return { ...r, ordem };
  });
  const ordenar = (modo) => alterar((r) => {
    const col = (p) => ((d.colecoes || []).find((c) => c.id === p.colecaoId) || {}).nome || "";
    const chave = { banho: (p) => p.banho || "", colecao: col };
    const ordem = [...r.ordem].sort((a, b) => {
      const pa = porId[a], pb = porId[b];
      if (!pa || !pb) return 0;
      if (modo === "recente") return String(pb.entradaEm || "").localeCompare(String(pa.entradaEm || ""));
      return chave[modo](pa).localeCompare(chave[modo](pb), "pt");
    });
    return { ...r, ordem };
  });
  const mudarItem = (id, patch) => alterar((r) => ({ ...r, itens: { ...r.itens, [id]: { ...r.itens[id], ...patch } } }));
  const trocarFoto = (id, p) => {
    const idx = indicesFoto(p.fotos); if (idx.length < 2) return;
    const atual = rasc.itens[id].foto; const prox = idx[(idx.indexOf(atual) + 1) % idx.length];
    mudarItem(id, { foto: prox });
  };
  const trocarLink = (i, campo, valor) => alterar((r) => {
    const ls = [r.links[0] || { label: "", url: "" }, r.links[1] || { label: "", url: "" }];
    ls[i] = { ...ls[i], [campo]: valor };
    return { ...r, links: ls.filter((l) => l.label || l.url) };
  });

  const enviarCapa = async (file) => {
    if (!file) return;
    setOcupado("capa"); setAviso(null);
    try {
      const blob = await comprimirParaBlob(file);
      const url = await dados.enviarCapaLona(lojaId, lona.consultora_id, blob);
      alterar((r) => ({ ...r, capa: url }));
    } catch (e) { setAviso({ tipo: "erro", texto: "Não deu para enviar essa foto. Tente outra." }); }
    setOcupado("");
  };

  const publicar = async () => {
    setOcupado("publicar"); setAviso(null);
    try {
      await salvarAgora();
      await dados.lonaPublicar(lona.id);
      await abrirLona(lona.consultora_id); await recarregarResumo();
      setAviso({ tipo: "ok", texto: "Lona publicada! Já pode mandar o link para suas clientes." });
    } catch (e) { setAviso({ tipo: "erro", texto: erroTexto(e) }); }
    setOcupado("");
  };
  const tirarDoAr = async () => {
    setOcupado("tirar"); setTirando(false); setAviso(null);
    try {
      await dados.lonaTirarDoAr(lona.id);
      await abrirLona(lona.consultora_id); await recarregarResumo();
      setAviso({ tipo: "ok", texto: "Lona fora do ar. Quem tem o link verá que ela não está disponível." });
    } catch (e) { setAviso({ tipo: "erro", texto: erroTexto(e) }); }
    setOcupado("");
  };
  const salvarPix = async () => {
    setOcupado("pix"); setAviso(null);
    try { await dados.lonaSalvarPix(pix); setLona((l) => ({ ...l, pix_chave: pix.trim() || null })); setAviso({ tipo: "ok", texto: "Chave Pix salva." }); }
    catch (e) { setAviso({ tipo: "erro", texto: erroTexto(e) }); }
    setOcupado("");
  };
  const copiarLink = async () => {
    try { await navigator.clipboard.writeText(link); setAviso({ tipo: "ok", texto: "Link copiado." }); }
    catch (e) { setAviso({ tipo: "erro", texto: "Não consegui copiar. Segure o link para copiar." }); }
  };

  const confirmar = async () => {
    setOcupado("confirmar"); setAviso(null);
    try {
      const valores = {};
      Object.entries(conf.valores).forEach(([k, v]) => { const c = paraCentavos(v); if (c > 0) valores[k] = c; });
      await dados.lonaConfirmar(conf.id, valores);
      setConf(null);
      if (recarregar) await recarregar();
      await carregarPedidos(); await recarregarResumo();
      setAviso({ tipo: "ok", texto: "Venda registrada. O estoque baixou e a comissão foi calculada." });
    } catch (e) { setAviso({ tipo: "erro", texto: erroTexto(e) }); }
    setOcupado("");
  };
  const cancelar = async (id) => {
    setOcupado("cancelar"); setAviso(null);
    try { await dados.lonaCancelar(id); setCancelando(null); await carregarPedidos(); await recarregarResumo(); setAviso({ tipo: "ok", texto: "Pedido cancelado. As peças voltaram para a lona." }); }
    catch (e) { setAviso({ tipo: "erro", texto: erroTexto(e) }); }
    setOcupado("");
  };

  /* prévia: monta, com o rascunho e o estoque, o mesmo formato que a cliente recebe */
  const itensPrevia = rasc.ordem.flatMap((id) => {
    const p = porId[id], it = rasc.itens[id];
    if (!p || !it || p.arquivada || p.qtd < 1) return [];
    const foto = fotoUsavel(p.fotos, it.foto || 0);
    if (!foto) return [];
    const base = Math.round(Number(p.venda || 0) * 100);
    return [{ id, codigo: p.codigo, nome: p.nome, foto, preco: it.preco, centavos: it.preco === "preco" ? Math.max(it.centavos, base) : null,
      banho: it.banho ? p.banho : null, tamanho: it.tamanho ? p.tamanho : null, nota: it.nota || null }];
  });

  const abertos = (pedidos || []).filter((p) => p.status === "aberto" || p.status === "pago").length;
  const estadoSalvo = { salvo: "Rascunho salvo", pendente: "Salvando…", salvando: "Salvando…", erro: "Não salvou. Vou tentar de novo" }[salvo];

  return (
    <div className="lona-ed">
      {ehDona && resumo.length > 1 ? (
        <div className="oj-card flat">
          <div className="oj-meta">Lona de quem?</div>
          <div className="oj-chips" role="group" aria-label="Escolher consultora">
            {resumo.map((c) => (
              <button key={c.consultora_id} className="oj-chip" data-on={c.consultora_id === consultoraId ? "1" : "0"} aria-pressed={c.consultora_id === consultoraId} onClick={() => trocarConsultora(c.consultora_id)}>
                {c.nome}{c.abertos > 0 ? ` · ${c.abertos}` : ""}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="oj-card">
        <div className="lona-ed-topo">
          <div style={{ minWidth: 0 }}>
            <div className="oj-sec" style={{ margin: 0 }}>{lona.consultora_nome}</div>
            <div className="oj-meta">{estadoSalvo}</div>
          </div>
          <span className={`oj-estado ${noAr ? "ativo" : "vencido"}`}>{noAr ? (mudou ? "No ar · com mudanças" : "No ar") : "Fora do ar"}</span>
        </div>

        {!lona.pode_editar ? <div className="oj-aviso" style={{ margin: "12px 0 0" }}>O plano da loja está em modo leitura. Você vê a lona, mas não consegue mudar nada até regularizar.</div> : null}
        {aviso ? <div className={aviso.tipo === "ok" ? "oj-aviso" : "oj-erro"} role={aviso.tipo === "ok" ? "status" : "alert"} style={{ margin: "12px 0 0" }}>{aviso.texto}</div> : null}

        {link ? (
          <>
            <div className="lona-ed-link oj-quebra">{link}</div>
            <div className="oj-acoes">
              <button className="oj-bt" onClick={copiarLink}>Copiar link</button>
              <a className="oj-bt" href={link} target="_blank" rel="noopener noreferrer">Abrir</a>
              <a className="oj-bt" href={hrefWhats("", `Veja minha lona: ${link}`)} target="_blank" rel="noopener noreferrer">Mandar no WhatsApp</a>
            </div>
          </>
        ) : <div className="oj-meta" style={{ marginTop: 10 }}>Publique para ganhar o link que você manda para suas clientes.</div>}

        {lona.pode_editar ? (
          <div className="oj-acoes">
            <button className="oj-btn" style={{ width: "auto", flex: "1 1 180px" }} disabled={ocupado === "publicar" || (noAr && !mudou)} onClick={publicar}>
              {ocupado === "publicar" ? "Publicando…" : noAr ? "Publicar mudanças" : "Publicar lona"}
            </button>
            {noAr && !tirando ? <button className="oj-bt" onClick={() => setTirando(true)}>Tirar do ar</button> : null}
          </div>
        ) : null}
        {tirando ? (
          <div className="oj-erro" style={{ margin: "12px 0 0" }}>
            Quem já tem o link vai ver que a lona não está disponível. Pode publicar de novo quando quiser.
            <div className="oj-acoes"><button className="oj-bt" onClick={tirarDoAr}>Sim, tirar do ar</button><button className="oj-bt" onClick={() => setTirando(false)}>Não</button></div>
          </div>
        ) : null}
        {noAr && mudou ? <div className="oj-meta" style={{ marginTop: 8 }}>O link que a cliente já tem só muda quando você publicar.</div> : null}
      </div>

      <div className="oj-seg" style={{ gridTemplateColumns: "1fr 1fr" }} role="tablist">
        <button role="tab" aria-selected={aba === "lona"} onClick={() => setAba("lona")}>Minha lona</button>
        <button role="tab" aria-selected={aba === "pedidos"} onClick={() => setAba("pedidos")}>Pedidos{abertos > 0 ? ` (${abertos})` : ""}</button>
      </div>

      {aba === "lona" ? (
        <fieldset className="lona-ed-grupo" disabled={!lona.pode_editar}>
          <div className="oj-card">
            <div className="oj-sec" style={{ margin: "0 0 8px", fontSize: 18 }}>Sua vitrine</div>
            <div className="oj-campo">
              <label htmlFor="ln-nome">Nome na lona</label>
              <input id="ln-nome" className="oj-in" value={rasc.nome} maxLength={60} onChange={(e) => alterar((r) => ({ ...r, nome: e.target.value }))} />
            </div>
            <div className="oj-campo">
              <label htmlFor="ln-frase">Frase (até 80 letras)</label>
              <input id="ln-frase" className="oj-in" value={rasc.frase} maxLength={80} onChange={(e) => alterar((r) => ({ ...r, frase: e.target.value }))} />
            </div>
            <div className="oj-campo">
              <label htmlFor="ln-zap">WhatsApp que recebe os pedidos (com DDD)</label>
              <input id="ln-zap" className="oj-in" inputMode="tel" value={rasc.whatsapp} onChange={(e) => alterar((r) => ({ ...r, whatsapp: e.target.value.replace(/\D/g, "").slice(0, 11) }))} />
            </div>
            <div className="oj-campo">
              <label>Capa</label>
              {https(rasc.capa) ? <img className="lona-ed-capa" src={rasc.capa} alt="Capa atual da lona" /> : <div className="oj-meta">Sem capa: a vitrine usa a cor escolhida.</div>}
              <label className="oj-bt lona-ed-arquivo">
                {ocupado === "capa" ? "Enviando…" : https(rasc.capa) ? "Trocar capa" : "Escolher capa"}
                <input type="file" accept="image/*" onChange={(e) => { enviarCapa(e.target.files && e.target.files[0]); e.target.value = ""; }} />
              </label>
              {https(rasc.capa) ? <button type="button" className="oj-link-sutil" onClick={() => alterar((r) => ({ ...r, capa: null }))}>Tirar capa</button> : null}
            </div>
            <div className="oj-campo">
              <label>Letra</label>
              <div className="oj-chips">
                {Object.entries(FONTES).map(([id, f]) => (
                  <button key={id} type="button" className="oj-chip" data-on={rasc.fonte === id ? "1" : "0"} aria-pressed={rasc.fonte === id} style={{ fontFamily: f.pilha }} onClick={() => alterar((r) => ({ ...r, fonte: id }))}>{f.rotulo}</button>
                ))}
              </div>
            </div>
            <div className="oj-campo">
              <label>Cor dos botões</label>
              <div className="oj-chips">
                {CORES.map((hex) => (
                  <button key={hex} type="button" aria-label={`Cor ${hex}`} aria-pressed={rasc.cor.toLowerCase() === hex} className="lona-ed-cor" data-on={rasc.cor.toLowerCase() === hex ? "1" : "0"} style={{ background: hex }} onClick={() => alterar((r) => ({ ...r, cor: hex }))} />
                ))}
                <input type="color" className="lona-ed-cor-livre" aria-label="Escolher outra cor" value={corValida(rasc.cor) ? rasc.cor : "#1a1a1a"} onChange={(e) => alterar((r) => ({ ...r, cor: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="oj-card">
            <div className="oj-sec" style={{ margin: "0 0 4px", fontSize: 18 }}>Peças na lona ({incluidas.length})</div>
            <div className="oj-meta">A cliente vê foto, nome, preço, tamanho e banho. O custo nunca aparece. Peça sem unidade em estoque some sozinha.</div>
            {incluidas.length > 1 ? (
              <div className="oj-chips" role="group" aria-label="Ordenar">
                <span className="oj-meta" style={{ alignSelf: "center" }}>Ordenar por</span>
                <button type="button" className="oj-chip" onClick={() => ordenar("recente")}>Mais recente</button>
                <button type="button" className="oj-chip" onClick={() => ordenar("banho")}>Banho</button>
                <button type="button" className="oj-chip" onClick={() => ordenar("colecao")}>Coleção</button>
              </div>
            ) : null}
            {incluidas.length === 0 ? <div className="oj-meta" style={{ marginTop: 12 }}>Nenhuma peça ainda. Escolha abaixo em "Adicionar peças".</div> : null}
            {incluidas.map((id, pos) => {
              const p = porId[id]; const it = rasc.itens[id];
              if (!it) return null;
              if (!p || p.arquivada) {
                return (
                  <div key={id} className="oj-linha">
                    <div className="oj-erro" style={{ margin: 0 }}>Esta peça saiu do estoque e não aparece para a cliente.</div>
                    <div className="oj-acoes"><button className="oj-bt" onClick={() => tirar(id)}>Tirar da lona</button></div>
                  </div>
                );
              }
              const foto = fotoUsavel(p.fotos, it.foto || 0);
              const piso = Math.round(Number(p.venda || 0) * 100);
              return (
                <div key={id} className="oj-linha lona-ed-item">
                  <div className="lona-ed-item-topo">
                    {foto ? <img className="lona-ed-mini" src={foto} alt="" /> : <span className="lona-ed-mini lona-ed-sem">Sem foto</span>}
                    <div className="oj-quebra" style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{p.nome || p.codigo}</div>
                      <div className="oj-meta">{p.codigo} · {p.qtd} em estoque · preço da loja {brl(piso)}</div>
                      {p.qtd < 1 ? <div className="oj-meta lona-ed-alerta">Sem estoque: não aparece para a cliente</div> : null}
                      {!foto ? <div className="oj-meta lona-ed-alerta">Sem foto na internet: abra a peça no Estoque e salve de novo</div> : null}
                    </div>
                  </div>
                  <div className="lona-ed-grade">
                    <div className="oj-campo" style={{ margin: 0 }}>
                      <label htmlFor={`pm-${id}`}>Preço</label>
                      <select id={`pm-${id}`} className="oj-in" value={it.preco} onChange={(e) => mudarItem(id, { preco: e.target.value })}>
                        <option value="preco">Mostrar preço</option><option value="consulte">Consulte</option><option value="oculto">Esconder preço</option>
                      </select>
                    </div>
                    <div className="oj-campo" style={{ margin: 0 }}>
                      <label htmlFor={`pv-${id}`}>Seu preço (R$)</label>
                      <input id={`pv-${id}`} className="oj-in" inputMode="decimal" disabled={it.preco !== "preco"} key={`${id}-${it.centavos}`} defaultValue={centavosParaCampo(it.centavos)}
                        onBlur={(e) => { const novo = Math.max(paraCentavos(e.target.value) || piso, piso); e.target.value = centavosParaCampo(novo); mudarItem(id, { centavos: novo }); }} />
                    </div>
                  </div>
                  {it.preco === "preco" && it.centavos <= piso ? <div className="oj-meta">Não pode ficar abaixo do preço da loja.</div> : null}
                  <div className="oj-campo" style={{ margin: "10px 0 0" }}>
                    <label htmlFor={`pn-${id}`}>Recado de uma linha (opcional)</label>
                    <input id={`pn-${id}`} className="oj-in" maxLength={80} value={it.nota} onChange={(e) => mudarItem(id, { nota: e.target.value })} />
                  </div>
                  <div className="lona-ed-checks">
                    <label><input type="checkbox" checked={!!it.tamanho} onChange={(e) => mudarItem(id, { tamanho: e.target.checked })} /> Mostrar tamanho</label>
                    <label><input type="checkbox" checked={!!it.banho} onChange={(e) => mudarItem(id, { banho: e.target.checked })} /> Mostrar banho</label>
                  </div>
                  <div className="oj-acoes">
                    <button className="oj-bt" disabled={pos === 0} onClick={() => mover(id, -1)} aria-label={`Subir ${p.nome || p.codigo}`}>Subir</button>
                    <button className="oj-bt" disabled={pos === incluidas.length - 1} onClick={() => mover(id, 1)} aria-label={`Descer ${p.nome || p.codigo}`}>Descer</button>
                    {indicesFoto(p.fotos).length > 1 ? <button className="oj-bt" onClick={() => trocarFoto(id, p)}>Outra foto</button> : null}
                    <button className="oj-bt" onClick={() => tirar(id)}>Tirar</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="oj-card">
            <div className="oj-sec" style={{ margin: "0 0 4px", fontSize: 18 }}>Adicionar peças</div>
            <input className="oj-in" placeholder="Buscar por código, nome ou banho" aria-label="Buscar peça" value={busca} onChange={(e) => setBusca(e.target.value)} />
            {fora.length === 0 ? <div className="oj-meta" style={{ marginTop: 10 }}>Nenhuma peça para adicionar.</div> : null}
            {fora.slice(0, 60).map((p) => {
              const foto = fotoUsavel(p.fotos, 0);
              const motivo = p.qtd < 1 ? "Sem estoque" : !foto ? "Sem foto na internet" : "";
              return (
                <div key={p.id} className="oj-item">
                  {foto ? <img className="lona-ed-mini lona-ed-mini--p" src={foto} alt="" /> : <span className="lona-ed-mini lona-ed-mini--p lona-ed-sem" />}
                  <div className="oj-quebra" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{p.nome || p.codigo}</div>
                    <div className="oj-meta">{p.codigo} · {brl(Math.round(Number(p.venda || 0) * 100))}{motivo ? ` · ${motivo}` : ""}</div>
                  </div>
                  <button className="oj-bt" disabled={!!motivo} onClick={() => incluir(p)} aria-label={`Incluir ${p.nome || p.codigo}`}>Incluir</button>
                </div>
              );
            })}
            {fora.length > 60 ? <div className="oj-meta" style={{ marginTop: 8 }}>Mostrando 60. Use a busca para achar as outras.</div> : null}
          </div>

          <div className="oj-card">
            <div className="oj-sec" style={{ margin: "0 0 4px", fontSize: 18 }}>Mensagem do WhatsApp</div>
            <div className="oj-meta">Use {"{nome}"} para o seu nome e {"{pecas}"} para a lista das peças.</div>
            <textarea className="oj-in" rows={5} aria-label="Modelo da mensagem" value={rasc.modelo} maxLength={600} onChange={(e) => alterar((r) => ({ ...r, modelo: e.target.value }))} />
            <button type="button" className="oj-link-sutil" onClick={() => alterar((r) => ({ ...r, modelo: MODELO_PADRAO }))}>Voltar ao texto sugerido</button>
          </div>

          <div className="oj-card">
            <div className="oj-sec" style={{ margin: "0 0 4px", fontSize: 18 }}>Pagamento e links</div>
            {ehDona ? (
              <>
                <div className="oj-meta">A cliente paga direto à loja. Sem chave, a opção de pagar some e ela só combina a entrega. Esta chave aparece para quem abrir qualquer lona da loja.</div>
                <div className="oj-campo" style={{ marginTop: 10 }}>
                  <label htmlFor="ln-pix">Chave Pix da loja</label>
                  <input id="ln-pix" className="oj-in" value={pix} maxLength={140} onChange={(e) => setPix(e.target.value)} />
                </div>
                <button className="oj-bt" disabled={ocupado === "pix" || pix.trim() === (lona.pix_chave || "")} onClick={salvarPix}>{ocupado === "pix" ? "Salvando…" : "Salvar chave"}</button>
              </>
            ) : (
              <div className="oj-meta">Chave Pix da loja: {lona.pix_chave ? <b>{lona.pix_chave}</b> : "ainda não cadastrada"}. Só a dona da loja altera.</div>
            )}
            {[0, 1].map((i) => {
              const l = rasc.links[i] || { label: "", url: "" };
              return (
                <div key={i} className="lona-ed-grade" style={{ marginTop: 12 }}>
                  <div className="oj-campo" style={{ margin: 0 }}>
                    <label htmlFor={`ll-${i}`}>Link {i + 1}: nome</label>
                    <input id={`ll-${i}`} className="oj-in" maxLength={40} value={l.label} onChange={(e) => trocarLink(i, "label", e.target.value)} />
                  </div>
                  <div className="oj-campo" style={{ margin: 0 }}>
                    <label htmlFor={`lu-${i}`}>Link {i + 1}: endereço (https://)</label>
                    <input id={`lu-${i}`} className="oj-in" inputMode="url" value={l.url} onChange={(e) => trocarLink(i, "url", e.target.value)} />
                  </div>
                </div>
              );
            })}
            <div className="oj-meta" style={{ marginTop: 8 }}>Links aparecem na hora de pagar. Só endereços que começam com https:// são aceitos.</div>
          </div>

          <div className="oj-card">
            <button className="oj-btn sec" style={{ width: "100%" }} onClick={() => setPrevia((v) => !v)} aria-expanded={previa}>{previa ? "Esconder prévia" : "Ver como a cliente vê"}</button>
            {previa ? (
              <div className="lona-ed-previa">
                <Vitrine previa lona={{ ...rasc, loja: lona.loja_nome, pix: lona.pix_chave, itens: itensPrevia }} />
              </div>
            ) : null}
          </div>
        </fieldset>
      ) : (
        <div className="lona-ed-pedidos">
          {pedidos === null ? <div className="oj-vazio" role="status">Carregando pedidos…</div> : null}
          {pedidos && pedidos.length === 0 ? (
            <div className="oj-vazio"><span className="oj-serif">Nenhum pedido ainda</span>Quando uma cliente fechar o carrinho na sua lona, o pedido aparece aqui e as peças ficam reservadas por 7 dias.</div>
          ) : null}
          {(pedidos || []).map((p) => {
            const [rot, cls] = rotuloDoPedido(p);
            const aberto = p.status === "aberto" || p.status === "pago";
            const emConf = conf && conf.id === p.id;
            const semEstoque = p.itens.some((i) => !i.estoque_ok);
            return (
              <div key={p.id} className="oj-card">
                <div className="lona-ed-topo">
                  <div className="oj-quebra" style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 17 }}>{p.cliente_nome}</div>
                    <div className="oj-meta">{resumo.length > 1 ? `${p.consultora_nome} · ` : ""}{new Date(p.criado_em).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <span className={`oj-estado ${cls}`}>{rot}</span>
                </div>
                <div className="oj-quebra" style={{ marginTop: 8, fontSize: 14 }}>{p.itens.map((i) => `${i.codigo} ${i.nome || ""}`.trim()).join(" · ")}</div>
                <div className="oj-meta" style={{ marginTop: 4 }}>
                  {p.total_centavos > 0 ? `${brl(p.total_centavos)} · ` : "Preço a combinar · "}
                  {p.origem === "pago_loja" ? "disse que vai pagar à loja (confira o comprovante)" : "quer combinar a entrega"}
                </div>
                <div className="oj-acoes">
                  <a className="oj-bt" href={hrefWhats(p.cliente_whatsapp, `Oi ${p.cliente_nome}! Aqui é ${lona.consultora_nome}, vi seu pedido na minha lona.`)} target="_blank" rel="noopener noreferrer">Chamar no WhatsApp</a>
                  {aberto && lona.pode_editar ? (
                    <>
                      <button className="oj-bt" disabled={semEstoque} onClick={() => setConf(emConf ? null : { id: p.id, valores: Object.fromEntries(p.itens.map((i) => [i.id, centavosParaCampo(i.preco_centavos != null ? i.preco_centavos : i.preco_loja_centavos)])) })}>
                        {emConf ? "Fechar" : "Confirmar venda"}
                      </button>
                      <button className="oj-bt" onClick={() => setCancelando(cancelando === p.id ? null : p.id)}>Cancelar pedido</button>
                    </>
                  ) : null}
                </div>
                {semEstoque && aberto ? <div className="oj-meta lona-ed-alerta" style={{ marginTop: 6 }}>Alguma peça não está mais em estoque. Resolva no Estoque ou cancele o pedido.</div> : null}
                {emConf ? (
                  <div className="lona-ed-conf">
                    <div className="oj-meta">Confira o valor combinado de cada peça. Vira venda {p.origem === "pago_loja" ? "paga (Dinheiro)" : "a receber (Na confiança)"}, baixa o estoque e calcula a comissão.</div>
                    {p.itens.map((i) => (
                      <div key={i.id} className="oj-campo" style={{ margin: "10px 0 0" }}>
                        <label htmlFor={`cv-${i.id}`}>{i.codigo} {i.nome || ""} (R$)</label>
                        <input id={`cv-${i.id}`} className="oj-in" inputMode="decimal" value={conf.valores[i.id]} onChange={(e) => setConf((c) => ({ ...c, valores: { ...c.valores, [i.id]: e.target.value } }))} />
                      </div>
                    ))}
                    <button className="oj-btn" style={{ marginTop: 12 }} disabled={ocupado === "confirmar"} onClick={confirmar}>{ocupado === "confirmar" ? "Registrando…" : "Registrar venda"}</button>
                  </div>
                ) : null}
                {cancelando === p.id ? (
                  <div className="oj-erro" style={{ margin: "12px 0 0" }}>
                    As peças voltam a aparecer na lona. Esta ação não apaga nada do estoque.
                    <div className="oj-acoes"><button className="oj-bt" disabled={ocupado === "cancelar"} onClick={() => cancelar(p.id)}>Sim, cancelar</button><button className="oj-bt" onClick={() => setCancelando(null)}>Não</button></div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
