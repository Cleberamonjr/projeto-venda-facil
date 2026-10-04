import React, { useEffect, useMemo, useState } from "react";

const brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function toDate(value) {
  if (!value) return null;
  const s = String(value);
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + "T12:00:00" : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthKey(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

function monthLabel(date) {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function inMonth(value, year, month) {
  const d = toDate(value);
  return !!d && d.getFullYear() === year && d.getMonth() === month;
}

function pctChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function signedPct(value) {
  const n = Number(value) || 0;
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

function formatDelta(current, previous, kind = "number") {
  const delta = current - previous;
  if (kind === "money") return (delta >= 0 ? "+" : "") + brl(delta);
  return (delta >= 0 ? "+" : "") + delta.toLocaleString("pt-BR");
}

function nivelLoja(d) {
  const clientes = (d.clientes || []).length;
  const vendas = (d.vendas || []).length;
  const estoque = (d.estoque || []).length;
  if (clientes < 15 && vendas < 30) return "Em construção";
  if (clientes < 60 || vendas < 120 || estoque < 150) return "Em crescimento";
  if (clientes < 150 || vendas < 300) return "Consolidada";
  return "Profissional";
}

function analisarMes(d, alvo, anterior) {
  const vendas = (d.vendas || []).filter(v => inMonth(v.data, alvo.getFullYear(), alvo.getMonth()));
  const vendasAnt = (d.vendas || []).filter(v => inMonth(v.data, anterior.getFullYear(), anterior.getMonth()));
  const despesas = (d.despesas || []).filter(x => inMonth(x.data, alvo.getFullYear(), alvo.getMonth()));
  const despesasAnt = (d.despesas || []).filter(x => inMonth(x.data, anterior.getFullYear(), anterior.getMonth()));

  const receita = vendas.reduce((s, v) => s + (Number(v.valor) || 0), 0);
  const receitaAnt = vendasAnt.reduce((s, v) => s + (Number(v.valor) || 0), 0);
  const custo = vendas.reduce((s, v) => s + (Number(v.custo) || 0), 0);
  const custoAnt = vendasAnt.reduce((s, v) => s + (Number(v.custo) || 0), 0);
  const despesa = despesas.reduce((s, x) => s + (Number(x.valor) || 0), 0);
  const despesaAnt = despesasAnt.reduce((s, x) => s + (Number(x.valor) || 0), 0);

  const clientes = new Set(vendas.map(v => String(v.cliente || "").trim()).filter(Boolean));
  const clientesAnt = new Set(vendasAnt.map(v => String(v.cliente || "").trim()).filter(Boolean));

  const porProduto = {};
  vendas.forEach(v => {
    const key = String(v.codigo || v.pecaId || v.nome || "Sem código");
    porProduto[key] = (porProduto[key] || 0) + (Number(v.valor) || 0);
  });
  const topProduto = Object.entries(porProduto).sort((a, b) => b[1] - a[1])[0];

  const qtdPecas = vendas.reduce((s, v) => s + (Number(v.qtd) || 1), 0);
  const qtdPecasAnt = vendasAnt.reduce((s, v) => s + (Number(v.qtd) || 1), 0);
  const ticket = vendas.length ? receita / vendas.length : 0;
  const ticketAnt = vendasAnt.length ? receitaAnt / vendasAnt.length : 0;
  const margem = receita ? ((receita - custo) / receita) * 100 : 0;
  const margemAnt = receitaAnt ? ((receitaAnt - custoAnt) / receitaAnt) * 100 : 0;
  const lucro = receita - custo - despesa;
  const lucroAnt = receitaAnt - custoAnt - despesaAnt;

  const estoque = (d.estoque || []).filter(p => Number(p.qtd) > 0);
  const paradas = estoque.filter(p => {
    const e = toDate(p.entradaEm);
    return e && Math.floor((alvo.getTime() - e.getTime()) / 86400000) > 45;
  });
  const valorParado = paradas.reduce((s, p) => s + (Number(p.qtd) || 0) * (Number(p.custo) || 0), 0);

  const crescimento = pctChange(receita, receitaAnt);
  let causa = "";
  if (!receita && !receitaAnt) {
    causa = "Ainda não há vendas suficientes nos dois meses para eu fazer uma leitura confiável.";
  } else if (receitaAnt === 0 && receita > 0) {
    causa = "Este foi o primeiro mês com vendas registradas. Ainda não existe uma base anterior comparável.";
  } else {
    const vendasPct = pctChange(vendas.length, vendasAnt.length);
    const ticketPct = pctChange(ticket, ticketAnt);
    if (crescimento > 0 && vendasPct > ticketPct + 3) {
      causa = "Seu crescimento veio principalmente de mais vendas. Você colocou mais clientes e pedidos para dentro da loja.";
    } else if (crescimento > 0 && ticketPct > vendasPct + 3) {
      causa = "Seu crescimento veio principalmente do valor de cada venda. Você vendeu com um ticket médio maior.";
    } else if (crescimento < 0 && vendasPct < ticketPct - 3) {
      causa = "A queda veio principalmente da quantidade de vendas. O ticket não foi o principal problema.";
    } else if (crescimento < 0 && ticketPct < vendasPct - 3) {
      causa = "A queda veio principalmente do ticket médio. Você manteve parte do movimento, mas vendeu menos por pedido.";
    } else {
      causa = "O resultado mudou pela combinação de quantidade de vendas e valor médio dos pedidos.";
    }
  }

  const destaques = [];
  if (topProduto) destaques.push({ tipo: "Produto destaque", titulo: topProduto[0], texto: brl(topProduto[1]) + " em vendas no mês." });
  if (clientes.size > clientesAnt.size) destaques.push({ tipo: "Carteira", titulo: "+" + (clientes.size - clientesAnt.size) + " clientes comprando", texto: "Sua base ativa cresceu em relação ao mês anterior." });
  if (margem > margemAnt + 2 && receita > 0) destaques.push({ tipo: "Margem", titulo: "+" + (margem - margemAnt).toFixed(1) + " p.p.", texto: "Você reteve uma parcela maior de cada venda antes das despesas." });
  if (qtdPecas > qtdPecasAnt) destaques.push({ tipo: "Giro", titulo: "+" + (qtdPecas - qtdPecasAnt) + " peças", texto: "Você colocou mais peças para girar." });
  if (!destaques.length) destaques.push({ tipo: "Constância", titulo: "Você manteve a operação ativa", texto: "Agora vamos transformar os números em uma próxima ação." });

  const pontos = [];
  if (valorParado > 0) pontos.push({ tipo: "Estoque", titulo: brl(valorParado) + " em peças antigas", texto: "Eu olharia primeiro para essas peças antes de comprar mais." });
  if (clientesAnt.size > 0 && clientes.size < clientesAnt.size) pontos.push({ tipo: "Clientes", titulo: "Menos clientes compraram", texto: "Vale recuperar quem costumava comprar com você." });
  if (margem < 40 && receita > 0) pontos.push({ tipo: "Margem", titulo: "Sua margem ficou apertada", texto: "Crescer faturamento sem cuidar da margem pode esconder um mês fraco." });
  if (despesa > receita * 0.3 && receita > 0) pontos.push({ tipo: "Despesas", titulo: "As despesas consumiram " + ((despesa / receita) * 100).toFixed(0) + "% da receita", texto: "Eu revisaria as maiores despesas antes de assumir novos custos." });

  return {
    vendas, vendasAnt, receita, receitaAnt, custo, custoAnt, despesa, despesaAnt, lucro, lucroAnt,
    clientes: clientes.size, clientesAnt: clientesAnt.size, ticket, ticketAnt, margem, margemAnt,
    qtdPecas, qtdPecasAnt, crescimento, causa, destaques, pontos, nivel: nivelLoja(d),
    paradas, valorParado
  };
}

export default function RetrospectivaMes({ d, autoAbrir = false }) {
  const [aberta, setAberta] = useState(false);
  const [modo, setModo] = useState("resumo");

  const { alvo, anterior, analise } = useMemo(() => {
    const agora = new Date();
    const alvo = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const anterior = new Date(agora.getFullYear(), agora.getMonth() - 2, 1);
    return { alvo, anterior, analise: analisarMes(d || {}, alvo, anterior) };
  }, [d]);

  useEffect(() => {
    if (!autoAbrir || !d) return;
    try {
      const key = "luxi:retrospectiva:v1:" + (d.lojaId || d.perfil?.email || "demo") + ":" + monthKey(alvo);
      if (localStorage.getItem(key) !== "1") setAberta(true);
    } catch (_) {}
  }, [autoAbrir, d, alvo]);

  const fechar = () => {
    try {
      const key = "luxi:retrospectiva:v1:" + (d.lojaId || d.perfil?.email || "demo") + ":" + monthKey(alvo);
      localStorage.setItem(key, "1");
    } catch (_) {}
    setAberta(false);
  };

  const variacao = analise.crescimento;
  const positiva = variacao > 0;
  const neutra = Math.abs(variacao) < 0.5;

  const conteudo = (
    <div className="luxi-retro-wrap">
      <div className="luxi-retro-hero">
        <div className="luxi-retro-kicker">RETROSPECTIVA LUXI · {analise.nivel.toUpperCase()}</div>
        <h2>Seu {monthLabel(alvo)} foi assim, querida. ✨</h2>
        <p>Eu comparei seu mês com {monthLabel(anterior)} para entender não só o resultado, mas o que levou sua loja até ele.</p>
      </div>

      <div className="luxi-retro-grid">
        <div className="luxi-retro-metric">
          <span>Faturamento</span><strong>{brl(analise.receita)}</strong>
          <small>{signedPct(variacao)} · {formatDelta(analise.receita, analise.receitaAnt, "money")} vs. mês anterior</small>
        </div>
        <div className="luxi-retro-metric">
          <span>Vendas</span><strong>{analise.vendas.length}</strong>
          <small>{formatDelta(analise.vendas.length, analise.vendasAnt)} pedidos</small>
        </div>
        <div className="luxi-retro-metric">
          <span>Ticket médio</span><strong>{brl(analise.ticket)}</strong>
          <small>{signedPct(pctChange(analise.ticket, analise.ticketAnt))} vs. anterior</small>
        </div>
        <div className="luxi-retro-metric">
          <span>Lucro estimado</span><strong>{brl(analise.lucro)}</strong>
          <small>{formatDelta(analise.lucro, analise.lucroAnt, "money")} vs. anterior</small>
        </div>
      </div>

      <div className="luxi-retro-card luxi-retro-story">
        <div className="luxi-retro-label">💗 Minha leitura</div>
        <h3>{neutra ? "Seu resultado ficou praticamente estável." : positiva ? "Você avançou este mês." : "Este mês pediu mais atenção."}</h3>
        <p>{analise.causa}</p>
        <p className="luxi-retro-note">Você está no estágio <b>{analise.nivel.toLowerCase()}</b>. Então eu não vou comparar sua loja com uma operação maior. Vou comparar você com você mesma.</p>
      </div>

      <div className="luxi-retro-card">
        <div className="luxi-retro-label">✨ Destaques do mês</div>
        {analise.destaques.map((x, i) => (
          <div className="luxi-retro-item" key={i}>
            <div><b>{x.titulo}</b><span>{x.tipo}</span></div>
            <p>{x.texto}</p>
          </div>
        ))}
      </div>

      {analise.pontos.length > 0 && (
        <div className="luxi-retro-card">
          <div className="luxi-retro-label">🌷 O que eu cuidaria agora</div>
          {analise.pontos.slice(0, 3).map((x, i) => (
            <div className="luxi-retro-item atencao" key={i}>
              <div><b>{x.titulo}</b><span>{x.tipo}</span></div>
              <p>{x.texto}</p>
            </div>
          ))}
        </div>
      )}

      <div className="luxi-retro-card luxi-retro-next">
        <div className="luxi-retro-label">💡 Meu foco para o próximo mês</div>
        <h3>{analise.valorParado > 0 ? "Primeiro, faça o estoque girar." : analise.clientes < analise.clientesAnt ? "Primeiro, vamos recuperar clientes." : analise.crescimento < 0 ? "Primeiro, vamos recuperar o ritmo de vendas." : "Agora, vamos transformar crescimento em recorrência."}</h3>
        <p>{analise.valorParado > 0 ? "Eu começaria pelas peças que já estão há mais tempo na sua loja. Não quero que você coloque dinheiro novo onde ainda existe dinheiro parado." : "Eu escolheria uma ação simples e repetível. Loja saudável não cresce só em um mês bom; cresce quando consegue repetir o que funcionou."}</p>
      </div>

      <div className="luxi-retro-footer">
        <span>Luxi está olhando os seus números com você.</span>
        {aberta && <button onClick={fechar}>Entendi, vamos para o próximo mês</button>}
      </div>
    </div>
  );

  if (!aberta) return <>{conteudo}</>;

  return (
    <div className="luxi-retro-overlay" role="dialog" aria-modal="true" aria-label="Retrospectiva mensal">
      <div className="luxi-retro-modal">
        <button className="luxi-retro-close" onClick={fechar} aria-label="Fechar">×</button>
        {conteudo}
      </div>
    </div>
  );
}
