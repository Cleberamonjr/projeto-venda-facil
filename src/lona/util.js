/* ============================================================
   Lona — funções puras (sem tela, sem rede). Tudo aqui é testável sozinho.
   Adaptado do módulo "Catálogo Luxi / lona": mesma ideia, mesmos nomes de
   fonte e de campos, só que sem Tailwind/Zustand e falando com o banco do Luxi.
   ============================================================ */

/* centavos -> "R$ 129,90" */
export const brl = (cent) =>
  (Number(cent || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const soDigitos = (v) => String(v == null ? "" : v).replace(/\D/g, "");

/* "129,90" | "1.299,90" | "129.90" -> centavos (0 se não der para entender) */
export function paraCentavos(texto) {
  let t = String(texto == null ? "" : texto).replace(/[^\d.,]/g, "");
  if (!t) return 0;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if ((t.match(/\./g) || []).length > 1) t = t.replace(/\./g, "");
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

/* centavos -> "129,90" (para preencher campo) */
export const centavosParaCampo = (cent) => (Number(cent || 0) / 100).toFixed(2).replace(".", ",");

/* ---------- aparência ----------
   Sem fontes baixadas da internet (a política de segurança do Luxi não permite):
   cada "fonte" usa as que o aparelho já tem. Os ids são os do módulo original. */
export const FONTES = {
  helvetica: { rotulo: "Clássica", pilha: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  instrument: { rotulo: "Moderna", pilha: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif' },
  fraunces: { rotulo: "Elegante", pilha: 'Georgia, "Times New Roman", serif' },
  newsreader: { rotulo: "Editorial", pilha: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif' },
};
export const pilhaDaFonte = (id) => (FONTES[id] || FONTES.helvetica).pilha;

export const CORES = ["#1a1a1a", "#6b4a2f", "#6b3a4a", "#1f4d3a", "#243652", "#8a5a2a"];
export const COR_PADRAO = "#1a1a1a";
export const corValida = (hex) => /^#[0-9a-fA-F]{6}$/.test(String(hex || ""));

/* texto escuro ou claro, o que ficar legível em cima da cor escolhida */
export function corDoTexto(hex) {
  const bruto = String(hex || "").replace("#", "").trim();
  const cheio = bruto.length === 3 ? bruto.split("").map((c) => c + c).join("") : bruto;
  if (!/^[0-9a-fA-F]{6}$/.test(cheio)) return "#1C1612";
  const n = parseInt(cheio, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? "#1C1612" : "#FFF8EE";
}

/* ---------- WhatsApp ---------- */
export const MODELO_PADRAO = "Oi! Quero essa da maleta de {nome}.\n\n{pecas}\n\nPode separar pra mim?";

/* wa.me com DDI 55; sem número válido abre o WhatsApp para escolher o contato */
export function hrefWhats(fone, texto) {
  const d = soDigitos(fone);
  const t = encodeURIComponent(texto || "");
  if (d.length >= 10) return `https://wa.me/${d.startsWith("55") && d.length > 11 ? d : "55" + d}?text=${t}`;
  return `https://wa.me/?text=${t}`;
}

/* o preço como a cliente vê: "R$ 129,90" | "Consulte" | "" */
export function textoDoPreco(item) {
  if (!item) return "";
  if (item.preco === "consulte") return "Consulte";
  if (item.preco === "oculto") return "";
  return item.centavos != null ? brl(item.centavos) : "";
}

/* bloco de UMA peça dentro da mensagem */
export function blocoDaPeca(item) {
  const meta = [item.banho, item.tamanho].filter(Boolean).join(" · ");
  return [`${item.codigo} · ${item.nome || ""}`.trim(), meta, textoDoPreco(item), item.foto || ""].filter(Boolean).join("\n");
}

/* mensagem final. O modelo da revendedora usa {nome} e {pecas}; se esquecer {pecas}, as peças vão no fim. */
export function montarMensagem({ modelo, nome, itens, totalCentavos, fechamento }) {
  const base0 = String(modelo || MODELO_PADRAO);
  const base = base0.includes("{pecas}") ? base0 : `${base0}\n\n{pecas}`;
  const pecas = itens.map(blocoDaPeca).join("\n\n");
  const linhas = [base.split("{nome}").join(nome || "").split("{pecas}").join(pecas)];
  if (totalCentavos != null && totalCentavos > 0) linhas.push("", `Total: ${brl(totalCentavos)}`);
  if (fechamento) linhas.push("", fechamento);
  return linhas.join("\n");
}

/* total do carrinho: só soma o que tem preço; diz se sobrou peça "a combinar" */
export function totalDoCarrinho(itens) {
  let total = 0, acombinar = 0;
  for (const i of itens) {
    if (i.preco === "preco" && i.centavos != null) total += i.centavos;
    else acombinar += 1;
  }
  return { total, acombinar };
}

/* ---------- pedido da cliente ---------- */
export function validarCliente(nome, fone) {
  const n = String(nome || "").trim();
  const f = soDigitos(fone);
  if (n.length < 2) return "Informe seu nome.";
  if (f.length < 10 || f.length > 11) return "Informe seu WhatsApp com DDD.";
  return null;
}

/* O banco responde com códigos; aqui viram frases para a cliente. */
export function mensagemDeErro(e) {
  let cod = (e && e.code) || "";
  const msg = (e && e.message) || "";
  /* se o código não chegar, reconhece pelo texto que o banco escreve */
  if (!/^LX\d{3}$/.test(cod)) {
    if (/acabaram de sair/i.test(msg)) cod = "LX410";
    else if (/pedidos em aberto/i.test(msg)) cod = "LX429";
    else if (/n[aã]o est[aá] dispon[ií]vel/i.test(msg)) cod = "LX404";
    else if (/^Informe |Escolha de 1 a 8|Forma inv[aá]lida/i.test(msg)) cod = "LX422";
  }
  if (cod === "LX410") return { texto: msg || "Algumas peças acabaram de sair.", recarregar: true };
  if (cod === "LX429") return { texto: msg || "Há muitos pedidos em aberto. Fale direto no WhatsApp.", direto: true };
  if (cod === "LX422") return { texto: msg || "Confira seus dados." };
  if (cod === "LX404") return { texto: "Esta loja não está mais disponível.", recarregar: true };
  if (/failed to fetch|network|load failed|timeout/i.test(msg)) return { texto: "Sem conexão. Confira a internet e tente de novo." };
  return { texto: "Não deu para enviar agora. Tente de novo em instantes ou fale direto no WhatsApp." };
}

/* ---------- endereço da vitrine ----------
   Fica em "?m=apelido" (o mesmo jeito dos convites ?beta= e ?convite=). Não usamos "/m/apelido"
   porque o app é servido com caminhos relativos e a página abriria em branco. */
export const SLUG_RX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export function slugDaUrl(search) {
  try {
    const v = new URLSearchParams(search || "").get("m");
    return v && v.length <= 40 && SLUG_RX.test(v) ? v : null;
  } catch (e) {
    return null;
  }
}
export function linkDaLona(slug, loc) {
  const l = loc || (typeof window !== "undefined" ? window.location : { origin: "", pathname: "/" });
  return `${l.origin}${l.pathname}?m=${encodeURIComponent(slug)}`;
}

/* ---------- comparar rascunho x publicado ----------
   O banco guarda as chaves em outra ordem; para comparar, ordenamos antes. */
export function canonico(v) {
  if (Array.isArray(v)) return v.map(canonico);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v).sort()) o[k] = canonico(v[k]);
    return o;
  }
  return v;
}
export const igual = (a, b) => JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));

/* ---------- foto da capa ---------- */
export function comprimirParaBlob(file, borda = 1280, qualidade = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const esc = Math.min(1, borda / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(img.width * esc));
        cv.height = Math.max(1, Math.round(img.height * esc));
        const ctx = cv.getContext("2d");
        if (!ctx) throw new Error("canvas");
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        cv.toBlob((b) => (b ? resolve(b) : reject(new Error("imagem"))), "image/jpeg", qualidade);
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("imagem")); };
    img.src = url;
  });
}

/* ---------- foto usável (mesma regra do banco: só endereço https) ---------- */
export function fotoUsavel(fotos, idx = 0) {
  const lista = Array.isArray(fotos) ? fotos : [];
  const ok = (f) => typeof f === "string" && /^https:\/\//.test(f) && f.length <= 500;
  if (ok(lista[idx])) return lista[idx];
  return lista.find(ok) || null;
}
