/* ============================================================
   Loja on-line — a porta de entrada (antes: "Catálogo").
   Um lugar só para: ver o link da loja, publicar com um toque, mandar para as clientes e ver o que falta.
   A personalização (capa, preços, Pix, pedidos) fica na tela "Editar loja e pedidos" (Lona.jsx).
   O envio de peças avulsas pelo WhatsApp (o antigo Catálogo) continua disponível, recolhido, no fim.
   ============================================================ */
import { useCallback, useEffect, useMemo, useState } from "react";
import * as dados from "./dados.js";
import { novoItem, normalizar } from "./Lona.jsx";
import { fotoUsavel, hrefWhats, linkDaLona, soDigitos } from "./lona/util.js";
import "./lona/editor.css";

const erroTexto = (e) => (e && e.message) || "Não deu certo. Tente de novo.";

export default function LojaOnline({ d, irPara, recarregar, Avulso }) {
  const lojaId = d.lojaId;
  const ehConsultora = d.perfil && d.perfil.papel === "consultora" && !d.perfil.mestre;
  const [fase, setFase] = useState("carregando"); // carregando | ok | erro
  const [erroGeral, setErroGeral] = useState("");
  const [lona, setLona] = useState(null);
  const [abertos, setAbertos] = useState(0);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState("");
  const [zap, setZap] = useState(soDigitos(d.perfil && d.perfil.whatsapp).slice(-11));
  const [zapCliente, setZapCliente] = useState("");
  const [texto, setTexto] = useState("");

  const elegiveis = useMemo(() => (d.estoque || []).filter((p) => !p.arquivada && p.qtd > 0), [d.estoque]);

  const carregar = useCallback(async () => {
    try {
      const lista = await dados.lonaResumo();
      const minha = lista.find((c) => (ehConsultora ? true : c.eh_dona)) || lista[0];
      const l = await dados.lonaMinha(minha ? minha.consultora_id : null);
      setLona(l);
      setAbertos(minha ? minha.abertos : 0);
      setFase("ok");
    } catch (e) { setErroGeral(erroTexto(e)); setFase("erro"); }
  }, [ehConsultora]);

  useEffect(() => { if (lojaId) carregar(); }, [lojaId, carregar]);

  const link = lona && lona.publicado ? linkDaLona(lona.slug) : null;
  useEffect(() => {
    if (link) setTexto(`${d.perfil.loja}\n\nConfira as peças na nossa loja on-line e peça por lá:\n${link}`);
  }, [link, d.perfil.loja]);

  /* sem loja real (demonstração/administradora): só o envio avulso de sempre */
  if (!lojaId) return <>{Avulso}</>;
  if (fase === "carregando") return <div className="oj-vazio" role="status">Abrindo sua loja on-line…</div>;
  if (fase === "erro") {
    return (
      <div className="oj-vazio">
        <span className="oj-serif">Não deu para abrir a loja on-line</span>{erroGeral}
        <div style={{ marginTop: 14 }}><button className="oj-btn" style={{ width: "auto" }} onClick={() => { setFase("carregando"); carregar(); }}>Tentar de novo</button></div>
        <div style={{ marginTop: 18 }}>{Avulso}</div>
      </div>
    );
  }

  const rasc = normalizar(lona.rascunho);
  const noAr = !!lona.publicado;
  const naLona = new Set(rasc.ordem);
  const comFoto = elegiveis.filter((p) => fotoUsavel(p.fotos, 0)); // regra da loja: sem foto, não aparece
  const novas = comFoto.filter((p) => !naLona.has(p.id));
  const visiveis = comFoto.filter((p) => naLona.has(p.id));
  const semFoto = elegiveis.filter((p) => !fotoUsavel(p.fotos, 0));
  const zapUsado = soDigitos(rasc.whatsapp).length >= 10 ? soDigitos(rasc.whatsapp) : zap;
  const zapOk = soDigitos(zapUsado).length >= 10 && soDigitos(zapUsado).length <= 11;

  const montar = (base) => ({
    ...base,
    whatsapp: soDigitos(base.whatsapp).length >= 10 ? base.whatsapp : soDigitos(zapUsado).slice(-11),
    ordem: [...base.ordem, ...novas.map((p) => p.id)],
    itens: { ...base.itens, ...Object.fromEntries(novas.map((p) => [p.id, novoItem(p)])) },
  });

  const publicar = async (msgOk) => {
    setOcupado("publicar"); setAviso(null);
    try {
      if (!zapOk) throw new Error("Informe o WhatsApp (com DDD) que vai receber os pedidos.");
      if (!lona.pode_editar) throw new Error("O plano da loja está em modo leitura.");
      await dados.lonaSalvar(lona.id, montar(rasc));
      await dados.lonaPublicar(lona.id);
      await carregar();
      setAviso({ tipo: "ok", texto: msgOk });
    } catch (e) { setAviso({ tipo: "erro", texto: erroTexto(e) }); }
    setOcupado("");
  };

  const copiar = async () => {
    try { await navigator.clipboard.writeText(link); setAviso({ tipo: "ok", texto: "Link copiado." }); }
    catch (e) { setAviso({ tipo: "erro", texto: "Não consegui copiar. Segure o link para copiar." }); }
  };
  const compartilhar = async () => {
    try { await navigator.share({ title: d.perfil.loja, text: texto, url: link }); }
    catch (e) { /* a pessoa fechou a janela de compartilhar */ }
  };

  return (
    <div className="lona-ed">
      <div className="oj-card">
        <div className="lona-ed-topo">
          <div style={{ minWidth: 0 }}>
            <div className="oj-sec" style={{ margin: 0 }}>{d.perfil.loja}</div>
            <div className="oj-meta">{noAr ? "Sua loja on-line está aberta para as clientes." : "Sua loja on-line ainda não está aberta."}</div>
          </div>
          <span className={`oj-estado ${noAr ? "ativo" : "vencido"}`}>{noAr ? "No ar" : "Fora do ar"}</span>
        </div>

        {aviso ? <div className={aviso.tipo === "ok" ? "oj-aviso" : "oj-erro"} role={aviso.tipo === "ok" ? "status" : "alert"} style={{ margin: "12px 0 0" }}>{aviso.texto}</div> : null}
        {!lona.pode_editar ? <div className="oj-aviso" style={{ margin: "12px 0 0" }}>O plano da loja está em modo leitura. Regularize para publicar mudanças.</div> : null}

        {noAr ? (
          <>
            <div className="lona-ed-link oj-quebra" data-teste="link-loja">{link}</div>
            <div className="oj-acoes">
              <button className="oj-bt" onClick={copiar}>Copiar link</button>
              <a className="oj-bt" href={link} target="_blank" rel="noopener noreferrer">Ver a loja</a>
              {typeof navigator !== "undefined" && navigator.share ? <button className="oj-bt" onClick={compartilhar}>Compartilhar</button> : null}
            </div>
          </>
        ) : (
          <>
            <div className="oj-meta" style={{ marginTop: 12 }}>
              Em um toque a loja abre com todas as suas peças em estoque e você ganha um link para mandar às clientes. Elas escolhem e pedem sem precisar de login.
              Você pode mudar capa, preços e Pix depois.
            </div>
            {soDigitos(rasc.whatsapp).length < 10 ? (
              <div className="oj-campo" style={{ marginTop: 12 }}>
                <label htmlFor="lo-zap">WhatsApp que recebe os pedidos (com DDD)</label>
                <input id="lo-zap" className="oj-in" inputMode="tel" value={zap} onChange={(e) => setZap(soDigitos(e.target.value).slice(0, 11))} />
              </div>
            ) : null}
            <button className="oj-btn" style={{ marginTop: 12 }} disabled={ocupado === "publicar" || !lona.pode_editar || elegiveis.length === 0} onClick={() => publicar("Sua loja on-line está no ar! Agora é só mandar o link para suas clientes.")}>
              {ocupado === "publicar" ? "Abrindo a loja…" : "Abrir minha loja on-line"}
            </button>
            {elegiveis.length === 0 ? <div className="oj-meta" style={{ marginTop: 8 }}>Cadastre peças no Estoque (com unidades disponíveis) para abrir a loja.</div> : null}
          </>
        )}
      </div>

      {noAr ? (
        <>
          <div className="oj-card">
            <div className="oj-sec" style={{ margin: "0 0 8px", fontSize: 18 }}>Mandar para uma cliente</div>
            <div className="oj-campo">
              <label htmlFor="lo-zc">WhatsApp da cliente (opcional)</label>
              <input id="lo-zc" className="oj-in" inputMode="tel" value={zapCliente} onChange={(e) => setZapCliente(soDigitos(e.target.value).slice(0, 11))} />
            </div>
            <div className="oj-campo">
              <label htmlFor="lo-tx">Mensagem</label>
              <textarea id="lo-tx" className="oj-in" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} />
            </div>
            <a className="oj-btn" style={{ display: "block", textAlign: "center", textDecoration: "none" }} href={hrefWhats(zapCliente, texto)} target="_blank" rel="noopener noreferrer">
              Enviar no WhatsApp
            </a>
            <div className="oj-meta" style={{ marginTop: 8 }}>A cliente recebe o link da loja, não a lista de peças.</div>
          </div>

          <div className="oj-card">
            <div className="oj-sec" style={{ margin: "0 0 8px", fontSize: 18 }}>Como está a sua loja</div>
            <div className="oj-linha"><b>{visiveis.length}</b> {visiveis.length === 1 ? "peça" : "peças"} à venda na loja on-line</div>
            <div className="oj-linha"><b>{abertos}</b> {abertos === 1 ? "pedido" : "pedidos"} para você tratar</div>
            {semFoto.length > 0 ? (
              <div className="oj-linha lona-ed-alerta">{semFoto.length} {semFoto.length === 1 ? "peça está" : "peças estão"} sem foto e <b>não aparece{semFoto.length === 1 ? "" : "m"} na loja</b>. Fotografe no Estoque para entrar{semFoto.length === 1 ? "" : "em"}.</div>
            ) : null}
            {novas.length > 0 ? (
              <>
                <div className="oj-linha"><b>{novas.length}</b> {novas.length === 1 ? "peça nova no estoque ainda não está" : "peças novas no estoque ainda não estão"} na loja on-line.</div>
                <button className="oj-bt" disabled={ocupado === "publicar" || !lona.pode_editar} onClick={() => publicar(`${novas.length === 1 ? "Peça adicionada" : "Peças adicionadas"} e publicada${novas.length === 1 ? "" : "s"}.`)}>
                  {ocupado === "publicar" ? "Publicando…" : `Adicionar ${novas.length} ${novas.length === 1 ? "peça" : "peças"} à loja on-line`}
                </button>
              </>
            ) : null}
            <div className="oj-acoes">
              <button className="oj-bt" onClick={() => irPara("lona")}>{abertos > 0 ? `Ver pedidos (${abertos})` : "Editar loja e pedidos"}</button>
              {semFoto.length > 0 ? <button className="oj-bt" onClick={() => irPara("estoque")}>Ir ao Estoque</button> : null}
            </div>
          </div>
        </>
      ) : null}

      {Avulso ? (
        <details className="lona-ed-avulso">
          <summary>Enviar peças avulsas no WhatsApp</summary>
          <div style={{ marginTop: 12 }}>{Avulso}</div>
        </details>
      ) : null}
    </div>
  );
}
