/* ============================================================
   LonaPublica — a página da cliente: abre por  /?m=apelido  (sem login).
   Só lê o que a dona/consultora PUBLICOU; nunca vê custo nem estoque.
   Fica separada do app de propósito: se algo falhar aqui, o app da loja não é afetado.
   ============================================================ */
import { Component, useCallback, useEffect, useState } from "react";
import * as dados from "./dados.js";
import Vitrine from "./lona/Vitrine.jsx";
import "./lona/lona.css";

export class ErroDaLona extends Component {
  constructor(p) { super(p); this.state = { erro: false }; }
  static getDerivedStateFromError() { return { erro: true }; }
  componentDidCatch(e) { try { console.error("Lona quebrou:", e); } catch (_) {} }
  render() {
    if (this.state.erro) {
      return (
        <div className="lona" style={{ padding: "64px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 18, marginBottom: 12 }}>Não foi possível abrir esta lona.</p>
          <button type="button" className="lona-bt lona-bt--cor" onClick={() => window.location.reload()}>Tentar de novo</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LonaPublica({ slug }) {
  const [estado, setEstado] = useState({ fase: "carregando", lona: null });

  const carregar = useCallback(async (silencioso) => {
    if (!silencioso) setEstado((e) => ({ ...e, fase: "carregando" }));
    try {
      const lona = await dados.lonaPublica(slug);
      setEstado(lona ? { fase: "ok", lona } : { fase: "naoexiste", lona: null });
    } catch (e) {
      // numa atualização silenciosa, mantém o que já está na tela
      setEstado((atual) => (silencioso && atual.lona ? atual : { fase: "erro", lona: null }));
    }
  }, [slug]);

  useEffect(() => { carregar(false); }, [carregar]);

  useEffect(() => {
    const l = estado.lona;
    document.title = l ? `${l.nome} · ${l.loja || "Lona"}` : "Lona";
    // a lona é para quem recebe o link; não precisa aparecer em buscadores
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) { meta = document.createElement("meta"); meta.setAttribute("name", "robots"); document.head.appendChild(meta); }
    meta.setAttribute("content", "noindex");
    const cor = l && /^#[0-9a-fA-F]{6}$/.test(l.cor || "") ? l.cor : null;
    let tema = document.querySelector('meta[name="theme-color"]');
    if (cor && tema) tema.setAttribute("content", cor);
  }, [estado.lona]);

  const pedir = useCallback(
    ({ origem, nome, fone, ids }) => dados.lonaCriarPedido({ slug, nome, whatsapp: fone, pecas: ids, origem }),
    [slug],
  );

  if (estado.fase === "carregando") {
    return <div className="lona" style={{ padding: "96px 24px", textAlign: "center", color: "#5e584f" }} role="status">Abrindo a lona…</div>;
  }
  if (estado.fase === "naoexiste") {
    return (
      <div className="lona" style={{ padding: "96px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>Esta lona não está disponível</h1>
        <p style={{ color: "#5e584f", lineHeight: 1.5 }}>O link pode estar errado ou a vendedora tirou a lona do ar. Peça um link novo a ela.</p>
      </div>
    );
  }
  if (estado.fase === "erro") {
    return (
      <div className="lona" style={{ padding: "96px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>Sem conexão</h1>
        <p style={{ color: "#5e584f", marginBottom: 20 }}>Não deu para abrir a lona agora.</p>
        <button type="button" className="lona-bt lona-bt--cor" onClick={() => carregar(false)}>Tentar de novo</button>
      </div>
    );
  }
  return <Vitrine lona={estado.lona} onPedido={pedir} onAtualizar={() => carregar(true)} />;
}
