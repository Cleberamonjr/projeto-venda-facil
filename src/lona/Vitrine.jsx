/* ============================================================
   Vitrine — a página que a CLIENTE vê (sem login). Também serve de prévia no editor.
   Sempre clara, independente do tema do app. Feita para celular primeiro.

   Fluxo do pedido (diferente do módulo original de propósito):
     1) a cliente monta o carrinho e preenche nome + WhatsApp;
     2) o pedido é REGISTRADO primeiro (onPedido). Só se der certo...
     3) ...aparece o botão que abre o WhatsApp da vendedora com o pedido pronto.
   Assim a cliente nunca é mandada ao WhatsApp por um pedido que não foi registrado.
   Nenhum dos dois caminhos confirma a venda: quem confirma é a vendedora, no login dela.
   ============================================================ */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./lona.css";
import {
  COR_PADRAO, brl, corDoTexto, corValida, hrefWhats, mensagemDeErro, montarMensagem,
  pilhaDaFonte, soDigitos, textoDoPreco, totalDoCarrinho, validarCliente,
} from "./util.js";

const https = (u) => typeof u === "string" && /^https:\/\//.test(u);

async function copiarTexto(t) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch (e) {
    try {
      const a = document.createElement("textarea");
      a.value = t;
      a.setAttribute("readonly", "");
      a.style.position = "fixed";
      a.style.left = "-9999px";
      document.body.appendChild(a);
      a.select();
      const ok = document.execCommand("copy");
      a.remove();
      return ok;
    } catch (e2) {
      return false;
    }
  }
}

export default function Vitrine({ lona, onPedido, onAtualizar, previa = false }) {
  const itens = useMemo(() => (Array.isArray(lona.itens) ? lona.itens : []), [lona.itens]);
  const marca = corValida(lona.cor) ? lona.cor : COR_PADRAO;
  const tinta = corDoTexto(marca);
  const temPix = !!(lona.pix && String(lona.pix).trim());

  const [carrinho, setCarrinho] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [fone, setFone] = useState("");
  const [fase, setFase] = useState("editando"); // editando | enviando | feito
  const [erro, setErro] = useState(null);
  const [feito, setFeito] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const tituloRef = useRef(null);

  /* se uma peça saiu da vitrine (atualização), tira do carrinho */
  useEffect(() => {
    setCarrinho((atual) => {
      const vivos = atual.filter((id) => itens.some((i) => i.id === id));
      return vivos.length === atual.length ? atual : vivos;
    });
  }, [itens]);

  /* janela do carrinho: Esc fecha, página de trás não rola, foco vai para o título */
  useEffect(() => {
    if (!aberto || previa) return undefined;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("keydown", tecla);
    const t = setTimeout(() => tituloRef.current && tituloRef.current.focus(), 30);
    return () => {
      document.body.style.overflow = antes;
      document.removeEventListener("keydown", tecla);
      clearTimeout(t);
    };
  }, [aberto, previa]);

  const noCarrinho = itens.filter((i) => carrinho.includes(i.id));
  const { total, acombinar } = totalDoCarrinho(noCarrinho);

  const alternar = (id) => {
    setErro(null);
    setCarrinho((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  };

  const mensagemDireta = useCallback(
    (lista, fechamento, totalCent) =>
      hrefWhats(
        lona.whatsapp,
        montarMensagem({ modelo: lona.modelo, nome: lona.nome, itens: lista, totalCentavos: totalCent, fechamento }),
      ),
    [lona.whatsapp, lona.modelo, lona.nome],
  );

  const fechamentoDoPedido = (origem, n, f) => {
    const quem = `Cliente: ${n.trim()} · ${soDigitos(f)}`;
    return origem === "pago_loja"
      ? `${quem}\nVou pagar direto para ${lona.loja || "a loja"}.\nPix: ${lona.pix}\nMando o comprovante. A entrega eu combino com você.`
      : `${quem}\nAinda não vou pagar. Quero combinar a entrega com você.`;
  };

  async function enviar(origem) {
    if (previa || fase === "enviando") return;
    const problema = validarCliente(nome, fone);
    if (problema) { setErro({ texto: problema }); return; }
    if (!noCarrinho.length) { setErro({ texto: "Escolha ao menos uma peça." }); return; }
    setErro(null);
    setFase("enviando");
    const lista = noCarrinho;
    try {
      await onPedido({ origem, nome: nome.trim(), fone: soDigitos(fone), ids: lista.map((i) => i.id) });
      setFeito({ origem, nome: nome.trim(), lista, total: totalDoCarrinho(lista).total, fone: soDigitos(fone) });
      setCarrinho([]);
      setFase("feito");
    } catch (e) {
      const m = mensagemDeErro(e);
      setErro(m);
      setFase("editando");
      if (m.recarregar && onAtualizar) onAtualizar();
    }
  }

  async function copiarPix() {
    const ok = await copiarTexto(String(lona.pix));
    setCopiado(ok);
    if (ok) setTimeout(() => setCopiado(false), 1800);
  }

  function fecharJanela() {
    setAberto(false);
    if (fase === "feito") { setFase("editando"); setFeito(null); }
  }

  const estilo = { "--lona-fonte": pilhaDaFonte(lona.fonte), "--lona-cor": marca, "--lona-tinta": tinta };

  return (
    <article className={`lona${previa ? " lona--previa" : ""}`} style={estilo} aria-label={`Lona de ${lona.nome || "vendedora"}`}>
      {previa ? (
        <p className="lona-aviso-previa" role="note">Prévia: é assim que a cliente vê. Aqui os pedidos ficam desligados.</p>
      ) : (
        <button type="button" className="lona-carrinho-btn" onClick={() => setAberto(true)} aria-haspopup="dialog">
          Carrinho{carrinho.length > 0 ? ` · ${carrinho.length}` : ""}
        </button>
      )}

      {https(lona.capa) ? (
        <img className="lona-capa" src={lona.capa} alt="" width="1280" height="720" decoding="async" />
      ) : (
        <div className="lona-capa lona-capa--vazia" aria-hidden="true" />
      )}

      <header className="lona-col lona-topo">
        <h1 className="lona-nome">{lona.nome}</h1>
        {lona.frase ? <p className="lona-frase">{lona.frase}</p> : null}
        <div className="lona-filete" />
      </header>

      {itens.length === 0 ? (
        <div className="lona-col lona-vazia">
          <p>Nenhuma peça disponível agora.</p>
          {!previa && soDigitos(lona.whatsapp).length >= 10 ? (
            <a className="lona-bt lona-bt--cor" href={hrefWhats(lona.whatsapp, `Oi ${lona.nome || ""}! Vi sua lona. O que você tem de novo?`)} target="_blank" rel="noopener noreferrer">
              Chamar {lona.nome} no WhatsApp
            </a>
          ) : null}
        </div>
      ) : (
        <ul className="lona-col lona-lista">
          {itens.map((it) => {
            const meta = [it.banho, it.tamanho].filter(Boolean).join(" · ");
            const preco = textoDoPreco(it);
            const dentro = carrinho.includes(it.id);
            return (
              <li key={it.id} className="lona-peca">
                {https(it.foto) ? (
                  <img className="lona-foto" src={it.foto} alt={it.nome || it.codigo} width="800" height="800" loading="lazy" decoding="async" />
                ) : null}
                <div className="lona-linha">
                  <h2 className="lona-peca-nome">{it.nome || it.codigo}</h2>
                  {preco ? <p className="lona-preco">{preco}</p> : null}
                </div>
                {meta ? <p className="lona-meta">{meta}</p> : null}
                {it.nota ? <p className="lona-nota">{it.nota}</p> : null}
                {previa ? null : (
                  <div className="lona-acoes">
                    <button type="button" className={`lona-bt ${dentro ? "lona-bt--ok" : "lona-bt--cor"}`} onClick={() => alternar(it.id)} aria-pressed={dentro}>
                      {dentro ? "No carrinho ✓" : "Por no carrinho"}
                    </button>
                    <a className="lona-bt lona-bt--leve" href={mensagemDireta([it])} target="_blank" rel="noopener noreferrer">
                      Quero essa
                    </a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <footer className="lona-col lona-rodape">{lona.loja ? `${lona.loja}. ` : ""}Vitrine Luxi.</footer>

      {!previa && carrinho.length > 0 && !aberto ? (
        <div className="lona-barra" role="region" aria-label="Carrinho">
          <div className="lona-barra-in">
            <p>{carrinho.length} {carrinho.length === 1 ? "peça" : "peças"}{total > 0 ? ` · ${brl(total)}` : ""}</p>
            <button type="button" className="lona-bt lona-bt--cor" onClick={() => setAberto(true)}>Ver e enviar</button>
          </div>
        </div>
      ) : null}

      {!previa && aberto ? (
        <div className="lona-fundo" onClick={fecharJanela}>
          <div className="lona-janela" role="dialog" aria-modal="true" aria-labelledby="lona-carrinho-titulo" onClick={(e) => e.stopPropagation()}>
            <div className="lona-janela-topo">
              <h2 id="lona-carrinho-titulo" ref={tituloRef} tabIndex={-1}>{fase === "feito" ? "Pedido enviado" : "Seu carrinho"}</h2>
              <button type="button" className="lona-fechar" onClick={fecharJanela}>Fechar</button>
            </div>

            {fase === "feito" && feito ? (
              <div className="lona-feito" aria-live="polite">
                <p className="lona-feito-ok">Pronto, {feito.nome}! Seu pedido foi registrado e as peças ficam reservadas para você por alguns dias.</p>
                <p>Falta só um passo: avise {lona.nome} no WhatsApp para ela combinar com você.</p>
                <a
                  className="lona-bt lona-bt--cor lona-bt--grande"
                  href={mensagemDireta(feito.lista, fechamentoDoPedido(feito.origem, feito.nome, feito.fone), feito.total)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir o WhatsApp de {lona.nome}
                </a>
                <button type="button" className="lona-bt lona-bt--leve" onClick={fecharJanela}>Voltar para a lona</button>
              </div>
            ) : (
              <>
                {erro ? (
                  <div className="lona-erro" role="alert">
                    <p>{erro.texto}</p>
                    {erro.direto && soDigitos(lona.whatsapp).length >= 10 ? (
                      <a className="lona-bt lona-bt--leve" href={mensagemDireta(noCarrinho)} target="_blank" rel="noopener noreferrer">Falar direto no WhatsApp</a>
                    ) : null}
                  </div>
                ) : null}

                {noCarrinho.length === 0 ? (
                  <p className="lona-sutil">Ainda vazio. Escolha as peças na lona.</p>
                ) : (
                  <ul className="lona-itens">
                    {noCarrinho.map((it) => (
                      <li key={it.id}>
                        {https(it.foto) ? <img src={it.foto} alt="" width="64" height="64" /> : <span className="lona-sem-foto" />}
                        <div className="lona-itens-txt">
                          <p>{it.nome || it.codigo}</p>
                          <p className="lona-sutil">{textoDoPreco(it) || "Preço a combinar"}</p>
                        </div>
                        <button type="button" className="lona-tirar" onClick={() => alternar(it.id)} aria-label={`Tirar ${it.nome || it.codigo} do carrinho`}>Tirar</button>
                      </li>
                    ))}
                  </ul>
                )}

                {total > 0 ? (
                  <p className="lona-total"><span>Total</span><strong>{brl(total)}</strong></p>
                ) : null}
                {acombinar > 0 && noCarrinho.length > 0 ? <p className="lona-sutil">{acombinar === 1 ? "1 peça tem" : `${acombinar} peças têm`} o preço combinado com {lona.nome}.</p> : null}

                {noCarrinho.length > 0 ? (
                  <>
                    <label className="lona-campo" htmlFor="lona-nome">
                      Seu nome
                      <input id="lona-nome" value={nome} onChange={(e) => setNome(e.target.value.slice(0, 60))} autoComplete="name" />
                    </label>
                    <label className="lona-campo" htmlFor="lona-fone">
                      Seu WhatsApp (com DDD)
                      <input id="lona-fone" value={fone} inputMode="tel" autoComplete="tel" onChange={(e) => setFone(soDigitos(e.target.value).slice(0, 11))} />
                    </label>

                    {temPix ? (
                      <section className="lona-bloco">
                        <h3>Pagar agora</h3>
                        <p className="lona-sutil">O valor vai direto para {lona.loja || "a loja"}. Depois do pagamento, mande o comprovante no WhatsApp.</p>
                        <button type="button" className="lona-pix" onClick={copiarPix}>
                          <span>{copiado ? "Chave copiada ✓" : "Copiar chave Pix"}</span>
                          <code>{lona.pix}</code>
                        </button>
                        {(lona.links || []).filter((l) => https(l.url)).map((l) => (
                          <a key={l.url} className="lona-link" href={l.url} target="_blank" rel="noopener noreferrer">{l.label || l.url}</a>
                        ))}
                        <button type="button" className="lona-bt lona-bt--cor lona-bt--grande" disabled={fase === "enviando"} onClick={() => enviar("pago_loja")}>
                          {fase === "enviando" ? "Enviando…" : "Enviar pedido (vou pagar)"}
                        </button>
                      </section>
                    ) : null}

                    <section className="lona-bloco">
                      <h3>{temPix ? "Ou combinar a entrega" : "Enviar pedido"}</h3>
                      <p className="lona-sutil">Sem pagar agora. {lona.nome} fala com você no WhatsApp para combinar entrega e pagamento.</p>
                      <button type="button" className={`lona-bt lona-bt--grande ${temPix ? "lona-bt--leve" : "lona-bt--cor"}`} disabled={fase === "enviando"} onClick={() => enviar("entrega")}>
                        {fase === "enviando" ? "Enviando…" : `Enviar pedido para ${lona.nome}`}
                      </button>
                    </section>
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}
