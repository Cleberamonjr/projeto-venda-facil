/* ============================================================
   Luxi — cérebro da Conselheira
   Motor determinístico: transforma dados reais da loja em
   sinais, prioridades e recomendações acionáveis.

   Regra central:
   FATO -> LEITURA -> RECOMENDAÇÃO -> AÇÃO

   Este arquivo não inventa métricas. Um LLM poderá futuramente
   apenas melhorar a linguagem, mantendo estes dados como fonte
   de verdade.
   ============================================================ */

const N = (v) => Number(v || 0);
const arr = (v) => Array.isArray(v) ? v : [];

function dataValida(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inicioMes(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function inicioMesAnterior(d) {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

function fimMesAnterior(d) {
  return new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59, 999);
}

function diasDesde(v, agora) {
  const d = dataValida(v);
  if (!d) return Infinity;
  return Math.floor((agora.getTime() - d.getTime()) / 86400000);
}

function moeda(v) {
  return N(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

function pct(v) {
  return N(v).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }) + "%";
}

function nomePrimeiro(nome = "") {
  const n = String(nome).trim();
  return n ? n.split(/\s+/)[0] : "";
}

function normalizarNivel(d) {
  const p = d?.perfil || {};
  const informado = p.nivelLoja || p.nivel_loja || p.estagioLoja;
  if (informado) {
    const s = String(informado).toLowerCase();
    if (s.includes("prof")) return "Profissional";
    if (s.includes("consol")) return "Consolidada";
    if (s.includes("cres")) return "Em crescimento";
    if (s.includes("constru")) return "Em construção";
  }

  const clientes = arr(d?.clientes).length;
  const vendas = arr(d?.vendas).length;
  const estoque = arr(d?.estoque).length;

  if (clientes < 15 && vendas < 30) return "Em construção";
  if (clientes < 60 || vendas < 120 || estoque < 150) return "Em crescimento";
  if (clientes < 150 || vendas < 300) return "Consolidada";
  return "Profissional";
}

function venderNoPeriodo(vendas, inicio, fim) {
  return vendas.filter((v) => {
    const d = dataValida(v.data);
    return d && d >= inicio && d <= fim;
  });
}

function calcularPeriodo(vendas, inicio, fim) {
  const vs = venderNoPeriodo(vendas, inicio, fim);
  const faturamento = vs.reduce((s, v) => s + N(v.valor), 0);
  const pecas = vs.reduce((s, v) => s + Math.max(1, N(v.qtd)), 0);
  const custo = vs.reduce((s, v) => s + N(v.custo), 0);
  const clientes = new Set(vs.map((v) => String(v.cliente || "").trim().toLowerCase()).filter(Boolean));
  return {
    vendas: vs.length,
    faturamento,
    pecas,
    custo,
    clientes: clientes.size,
    ticket: vs.length ? faturamento / vs.length : 0,
    margemBruta: faturamento ? ((faturamento - custo) / faturamento) * 100 : 0,
  };
}

function estoqueParado(d, agora) {
  return arr(d?.estoque)
    .filter((p) => N(p.qtd) > 0)
    .map((p) => ({
      ...p,
      dias: diasDesde(p.entradaEm, agora),
      valorEstoque: N(p.custo) * N(p.qtd),
    }))
    .filter((p) => p.dias >= 90)
    .sort((a, b) => b.valorEstoque - a.valorEstoque);
}

function estoqueBaixo(d) {
  return arr(d?.estoque)
    .filter((p) => N(p.qtd) > 0 && N(p.qtd) <= 2)
    .sort((a, b) => N(a.qtd) - N(b.qtd));
}

function produtosMaisVendidos(vendas, inicio, fim) {
  const mapa = new Map();
  venderNoPeriodo(vendas, inicio, fim).forEach((v) => {
    const chave = String(v.pecaId || v.codigo || v.nome || "").trim();
    if (!chave) return;
    const atual = mapa.get(chave) || {
      id: v.pecaId,
      codigo: v.codigo,
      nome: v.nome || v.codigo || "Produto",
      qtd: 0,
      faturamento: 0,
    };
    atual.qtd += Math.max(1, N(v.qtd));
    atual.faturamento += N(v.valor);
    mapa.set(chave, atual);
  });
  return [...mapa.values()].sort((a, b) => b.qtd - a.qtd);
}

function clientesHistorico(d, agora) {
  const vendas = arr(d?.vendas);
  const mapa = new Map();

  vendas.forEach((v) => {
    const nome = String(v.cliente || "").trim();
    if (!nome) return;
    const chave = nome.toLowerCase();
    const dt = dataValida(v.data);
    if (!dt) return;
    const item = mapa.get(chave) || { nome, compras: 0, valor: 0, ultimaCompra: null };
    item.compras += 1;
    item.valor += N(v.valor);
    if (!item.ultimaCompra || dt > item.ultimaCompra) item.ultimaCompra = dt;
    mapa.set(chave, item);
  });

  return [...mapa.values()].map((x) => ({
    ...x,
    diasSemComprar: diasDesde(x.ultimaCompra, agora),
  }));
}

function criarSinais(d, agora = new Date()) {
  const vendas = arr(d?.vendas);
  const mesAtualInicio = inicioMes(agora);
  const mesAnteriorInicio = inicioMesAnterior(agora);
  const mesAnteriorFim = fimMesAnterior(agora);

  const atual = calcularPeriodo(vendas, mesAtualInicio, agora);
  const anterior = calcularPeriodo(vendas, mesAnteriorInicio, mesAnteriorFim);
  const anteriores = calcularPeriodo(
    vendas,
    new Date(agora.getFullYear(), agora.getMonth() - 2, 1),
    new Date(agora.getFullYear(), agora.getMonth() - 1, 0, 23, 59, 59, 999)
  );

  const clientes = clientesHistorico(d, agora);
  const inativas = clientes
    .filter((c) => c.diasSemComprar >= 45 && c.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const novas = clientes.filter((c) => c.compras === 1 && c.diasSemComprar <= 45);
  const parados = estoqueParado(d, agora);
  const baixos = estoqueBaixo(d);
  const top = produtosMaisVendidos(vendas, mesAtualInicio, agora);

  const estoqueValor = arr(d?.estoque)
    .filter((p) => N(p.qtd) > 0)
    .reduce((s, p) => s + N(p.custo) * N(p.qtd), 0);

  const receitaDespesas = arr(d?.despesas)
    .filter((x) => {
      const dt = dataValida(x.data);
      return dt && dt >= mesAtualInicio && dt <= agora;
    })
    .reduce((s, x) => s + N(x.valor), 0);

  return {
    nivel: normalizarNivel(d),
    periodo: { atual, anterior, anteriores },
    clientes: {
      total: arr(d?.clientes).length,
      inativas,
      novas,
      historico: clientes,
    },
    estoque: {
      totalItens: arr(d?.estoque).length,
      valor: estoqueValor,
      parados,
      baixos,
    },
    produtos: { top },
    despesas: receitaDespesas,
    loja: d?.perfil?.loja || "sua loja",
  };
}

function addSinal(lista, sinal) {
  if (sinal && sinal.score > 0) lista.push(sinal);
}

function construirRecomendacoes(s) {
  const r = [];
  const atual = s.periodo.atual;
  const ant = s.periodo.anterior;
  const nivel = s.nivel;

  // 1. Reativação: alto valor e baixo esforço.
  const inativas = s.clientes.inativas.slice(0, 5);
  if (inativas.length >= 2) {
    const valor = inativas.slice(0, 3).reduce((sum, c) => sum + c.valor, 0);
    addSinal(r, {
      id: "reativacao-clientes",
      tipo: "cliente",
      score: Math.min(100, 62 + Math.min(25, inativas.length * 4)),
      prioridade: "alta",
      titulo: "Eu começaria pelas suas clientes",
      resumo: `${inativas.length} cliente${inativas.length === 1 ? "" : "s"} estão há pelo menos 45 dias sem comprar.`,
      leitura: valor
        ? `Você já vendeu ${moeda(valor)} para as clientes de maior valor que ficaram paradas. Eu tentaria a recompra antes de buscar novas clientes.`
        : "Você já tem relacionamento criado. Eu trabalharia a recompra antes de buscar novas clientes.",
      acao: "Ver clientes para reativar",
      destino: "clientes",
      dados: { quantidade: inativas.length, clientes: inativas.slice(0, 3) },
    });
  }

  // 2. Estoque parado: dinheiro imobilizado.
  if (s.estoque.parados.length >= 3) {
    const valor = s.estoque.parados.reduce((sum, p) => sum + p.valorEstoque, 0);
    addSinal(r, {
      id: "estoque-parado",
      tipo: "estoque",
      score: Math.min(96, 58 + Math.min(30, s.estoque.parados.length * 3)),
      prioridade: valor >= 500 ? "alta" : "media",
      titulo: "Tem estoque pedindo atenção",
      resumo: `${s.estoque.parados.length} produto${s.estoque.parados.length === 1 ? "" : "s"} estão há 90 dias ou mais sem girar.`,
      leitura: `Hoje há aproximadamente ${moeda(valor)} de custo parado nesses produtos. Eu tentaria girar uma parte antes de comprar mais.`,
      acao: "Ver estoque parado",
      destino: "estoque",
      dados: { quantidade: s.estoque.parados.length, valor, produtos: s.estoque.parados.slice(0, 5) },
    });
  }

  // 3. Produto campeão com estoque baixo.
  const baixosMap = new Map(s.estoque.baixos.map((p) => [String(p.id || p.codigo), p]));
  const campeaoComPoucoEstoque = s.produtos.top.find((p) => {
    const chave = String(p.id || p.codigo);
    return baixosMap.has(chave);
  });
  if (campeaoComPoucoEstoque) {
    const p = baixosMap.get(String(campeaoComPoucoEstoque.id || campeaoComPoucoEstoque.codigo));
    addSinal(r, {
      id: "repor-campeao",
      tipo: "produto",
      score: 90,
      prioridade: "alta",
      titulo: "Eu protegeria esse produto",
      resumo: `${campeaoComPoucoEstoque.nome} está vendendo e já está com pouco estoque.`,
      leitura: `Ele vendeu ${campeaoComPoucoEstoque.qtd} unidade${campeaoComPoucoEstoque.qtd === 1 ? "" : "s"} no período e restam ${p.qtd} em estoque.`,
      acao: "Ver produto",
      destino: "estoque",
      dados: { produto: p, vendas: campeaoComPoucoEstoque.qtd },
    });
  }

  // 4. Queda de vendas: procurar a causa antes de agir.
  if (ant.faturamento > 0 && atual.faturamento < ant.faturamento * 0.8) {
    const quedaFat = ((ant.faturamento - atual.faturamento) / ant.faturamento) * 100;
    const quedaVendas = ant.vendas > 0 ? ((ant.vendas - atual.vendas) / ant.vendas) * 100 : 0;
    const quedaTicket = ant.ticket > 0 ? ((ant.ticket - atual.ticket) / ant.ticket) * 100 : 0;

    let causa = "menos vendas";
    if (quedaVendas > quedaTicket && quedaVendas >= 10) causa = "menos pedidos fechados";
    else if (quedaTicket >= 10) causa = "ticket médio menor";

    addSinal(r, {
      id: "queda-momento",
      tipo: "momento",
      score: 84,
      prioridade: "alta",
      titulo: "Seu ritmo caiu e eu quero olhar isso com você",
      resumo: `O faturamento está ${pct(quedaFat)} abaixo do mês anterior.`,
      leitura: `A principal pista agora é ${causa}. Eu investigaria isso antes de simplesmente aumentar descontos ou comprar mais estoque.`,
      acao: "Ver vendas",
      destino: "vendas",
      dados: { quedaFat, quedaVendas, quedaTicket },
    });
  }

  // 5. Crescimento: consolidar o que funcionou.
  if (ant.faturamento > 0 && atual.faturamento >= ant.faturamento * 1.15) {
    const alta = ((atual.faturamento - ant.faturamento) / ant.faturamento) * 100;
    addSinal(r, {
      id: "crescimento",
      tipo: "celebracao",
      score: 76,
      prioridade: "media",
      titulo: "Gostei do movimento da sua loja",
      resumo: `Seu faturamento está ${pct(alta)} acima do mês anterior.`,
      leitura: nivel === "Em construção"
        ? "Agora eu não tentaria mudar tudo. Eu descobriria quais produtos e clientes puxaram esse avanço para repetir o que funcionou."
        : "Eu aproveitaria esse momento para identificar o que trouxe o resultado e transformar isso em repetição, não em sorte.",
      acao: "Ver vendas",
      destino: "vendas",
      dados: { alta },
    });
  }

  // 6. Clientes novas sem segunda compra.
  if (s.clientes.novas.length >= 3) {
    addSinal(r, {
      id: "segunda-compra",
      tipo: "cliente",
      score: 73,
      prioridade: "media",
      titulo: "Tem cliente nova para cuidar de perto",
      resumo: `${s.clientes.novas.length} clientes compraram uma vez e ainda não fizeram uma segunda compra.`,
      leitura: "Eu trabalharia essa segunda compra. É uma oportunidade de transformar aquisição em relacionamento.",
      acao: "Ver clientes",
      destino: "clientes",
      dados: { quantidade: s.clientes.novas.length },
    });
  }

  // 7. Estoque baixo genérico, só aparece se não houver um campeão já priorizado.
  if (s.estoque.baixos.length >= 5 && !r.some((x) => x.id === "repor-campeao")) {
    addSinal(r, {
      id: "estoque-baixo",
      tipo: "estoque",
      score: 57,
      prioridade: "media",
      titulo: "Alguns produtos estão chegando ao fim",
      resumo: `${s.estoque.baixos.length} produtos estão com até 2 unidades disponíveis.`,
      leitura: "Eu conferiria primeiro se eles estão entre os produtos que mais saem antes de fazer uma reposição maior.",
      acao: "Ver estoque",
      destino: "estoque",
      dados: { quantidade: s.estoque.baixos.length },
    });
  }

  // 8. Falta de movimento: conselho compatível com maturidade.
  if (atual.vendas === 0 && ant.vendas === 0) {
    addSinal(r, {
      id: "sem-movimento",
      tipo: "alerta",
      score: 82,
      prioridade: "alta",
      titulo: "Hoje eu começaria pela ativação da loja",
      resumo: "Ainda não encontrei vendas suficientes para apontar um padrão comercial.",
      leitura: nivel === "Em construção"
        ? "Nesta fase, eu priorizaria colocar produtos na frente das clientes e registrar cada venda. A Luxi precisa de movimento para aprender com você."
        : "Antes de tomar decisões de estoque ou preço, eu buscaria entender onde a venda está travando.",
      acao: "Ver vendas",
      destino: "vendas",
      dados: {},
    });
  }

  // O motor sempre devolve poucas recomendações.
  return r
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function criarMensagem(s, recomendacoes) {
  const nome = nomePrimeiro(s?.perfil?.nome || "");
  const saudacao = nome ? `Oi, ${nome} 🌷` : "Dei uma olhadinha na sua loja 🌷";

  if (!recomendacoes.length) {
    return {
      titulo: "Está tudo tranquilo por aqui",
      texto: "Ainda não encontrei uma oportunidade forte o bastante para interromper você. Vou continuar observando a loja.",
      saudacao,
    };
  }

  const principal = recomendacoes[0];
  return {
    titulo: principal.titulo,
    texto: principal.leitura,
    saudacao,
  };
}

export function analisarLoja(d, agora = new Date()) {
  const sinais = criarSinais(d, agora);
  const recomendacoes = construirRecomendacoes(sinais);

  return {
    versao: 1,
    geradoEm: new Date(agora).toISOString(),
    nivelLoja: sinais.nivel,
    sinais,
    recomendacoes,
    mensagem: criarMensagem({ ...sinais, perfil: d?.perfil }, recomendacoes),
  };
}

export default analisarLoja;
