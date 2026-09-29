/* ============================================================
   Luxi — camada de dados
   Substitui o localStorage. Toda leitura e escrita passa por aqui.
   O app continua trabalhando com o mesmo formato de objeto de antes,
   então as telas mudam pouco: onde havia `salvar(novo)`, agora há
   uma função específica desta camada.
   ============================================================ */

import { createClient } from "@supabase/supabase-js";

export const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

/* ---------- centavos <-> reais ---------- */
const c = (r) => Math.round(Number(r || 0) * 100);
const r = (cent) => (Number(cent || 0)) / 100;

/* ---------- rótulos (tela) <-> enums (banco) ----------
   O banco guarda modalidade/motivo/tipo como enum em minúsculo e sem
   acento; a tela usa os rótulos bonitos. A conversão mora aqui — só
   nesta camada — para as telas não precisarem saber que isso existe. */
const MODALIDADE_PARA_ENUM = {
  "Dinheiro": "dinheiro",
  "Débito": "debito",
  "Crédito": "credito",
  "Na confiança": "confianca",
};
const ENUM_PARA_MODALIDADE = {
  dinheiro: "Dinheiro",
  debito: "Débito",
  credito: "Crédito",
  confianca: "Na confiança",
};
const MOTIVO_PARA_ENUM = {
  "Devolução": "devolucao",
  "Troca": "troca",
  "Defeito": "defeito",
  "Garantia": "garantia",
  "Cortesia": "cortesia",
  "Perda": "perda",
};
const ENUM_PARA_MOTIVO = {
  devolucao: "Devolução",
  troca: "Troca",
  defeito: "Defeito",
  garantia: "Garantia",
  cortesia: "Cortesia",
  perda: "Perda",
};
const ENUM_PARA_TIPO_DESPESA = { fixa: "Fixa", variavel: "Variável" };

/* ---------- autenticação ---------- */
export const auth = {
  async ehAdmin() {
    const { data, error } = await sb.rpc("sou_admin_luxi");
    return !error && data === true;
  },
  async cadastrar(email, senha) {
    // BETA FECHADO: só cria conta se o e-mail estiver liberado no painel admin.
    const { data: liberado, error: eV } = await sb.rpc("email_liberado_beta", {
      p_email: email.trim(),
    });
    if (eV) throw new Error("Não consegui verificar o acesso. Tente de novo.");
    if (!liberado) {
      throw new Error(
        "Este e-mail ainda não tem acesso ao beta. O Luxi está em fase fechada — peça um convite para começar."
      );
    }
    const { data, error } = await sb.auth.signUp({ email, password: senha });
    if (error) throw new Error(traduzErro(error.message));
    return data.user;
  },
  async validarConviteBeta(token) {
    const { data, error } = await sb.rpc("validar_convite_beta", { p_token: token });
    if (error) throw new Error("Não consegui validar este convite. Tente de novo.");
    if (!data?.email) throw new Error("Este convite é inválido, expirou ou já foi utilizado.");
    return data;
  },
  async cadastrarBeta(token, email, senha) {
    const convite = await this.validarConviteBeta(token);
    const informado = email.trim().toLowerCase();
    if (informado !== convite.email.toLowerCase()) {
      throw new Error("Este link é exclusivo para o e-mail convidado.");
    }
    const { data, error } = await sb.auth.signUp({ email: informado, password: senha });
    if (error) throw new Error(traduzErro(error.message));
    if (data.session) await this.consumirConviteBeta(token);
    return { user: data.user, confirmado: !!data.session };
  },
  async consumirConviteBeta(token) {
    const { data, error } = await sb.rpc("consumir_convite_beta", { p_token: token });
    if (error) throw new Error("Não consegui confirmar este convite.");
    if (!data) throw new Error("Este convite não corresponde ao e-mail desta conta.");
    return true;
  },
  async entrar(email, senha) {
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) throw new Error(traduzErro(error.message));
    return data.user;
  },
  async alterarSenha(novaSenha) {
    const senha = String(novaSenha || "");
    if (senha.length < 6) throw new Error("A senha precisa ter ao menos 6 caracteres.");
    const { error } = await sb.auth.updateUser({ password: senha });
    if (error) throw new Error(traduzErro(error.message));
    return true;
  },
  async sair() {
    await sb.auth.signOut();
  },
  async usuario() {
    const { data } = await sb.auth.getUser();
    return data?.user ?? null;
  },
  aoMudar(cb) {
    return sb.auth.onAuthStateChange((_e, sessao) => cb(sessao?.user ?? null));
  },
};

function traduzErro(m = "") {
  if (m.includes("Invalid login")) return "E-mail ou senha não conferem.";
  if (m.includes("already registered")) return "Este e-mail já tem conta. Entre.";
  if (m.includes("Password should be")) return "A senha precisa de ao menos 6 caracteres.";
  if (m.includes("Email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  return "Não consegui completar. Verifique sua conexão e tente de novo.";
}

/* ---------- criar loja + assinatura em teste de 72h ---------- */
export async function criarLoja({ nome, fornecedores, formas, margem, plano, dona }) {
  const u = await auth.usuario();
  if (!u) throw new Error("Sessão ausente.");

  // fornecedores pode vir como objetos {nome, margem} (formato novo) ou strings.
  const fornArr = (fornecedores || []).map((x) =>
    typeof x === "string" ? { nome: x, margem: Number(margem) || 100 } : { nome: x.nome, margem: Number(x.margem) || 100 }
  );
  const fornNomes = fornArr.map((x) => x.nome).filter(Boolean);

  const { data: loja, error } = await sb
    .from("lojas")
    .insert({
      dona_id: u.id,
      nome,
      fornecedores: fornNomes, // mantém a coluna antiga preenchida (compat)
      fornecedores_json: fornArr, // formato novo com margem
      formas_pagamento: formas && formas.length ? formas : ["Dinheiro", "Débito", "Crédito", "Na confiança"],
      margem_padrao: Number(margem) || Number(fornArr[0]?.margem) || 100,
    })
    .select()
    .single();
  if (error) throw error;

  // Cliente beta recebe os dias que foram liberados no painel admin;
  // quem não é beta segue com o teste padrão de 72h.
  let trialAte = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
  try {
    const { data: beta } = await sb.rpc("meu_acesso_beta");
    if (beta?.expira_em) trialAte = beta.expira_em;
  } catch (e) {
    /* se a consulta falhar, mantém o teste padrão — nunca impede a criação da loja */
  }

  await sb.from("assinaturas").insert({
    loja_id: loja.id,
    plano,
    status: "trial",
    trial_ate: trialAte,
  });

  await sb.from("consultoras").insert({
    loja_id: loja.id,
    nome: dona || "Você (dona)",
    comissao: 0,
    eh_dona: true,
  });

  return loja;
}

/* ---------- carregar tudo de uma vez ---------- */
// Blindagem: qualquer query que passe de 12s é abortada em vez de travar a tela.
function comTimeout(promise, ms = 12000, oQue = "consulta") {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error("Tempo esgotado: " + oQue)), ms)),
  ]);
}

export async function carregarTudo() {
  const u = await auth.usuario();
  if (!u) return null;

  if (await auth.ehAdmin()) {
    return {
      lojaId: null,
      perfil: {
        nome: u.email,
        loja: "Painel Luxi",
        fornecedores: [],
        margem: "100",
        fiado: false,
        papel: "dona",
        plano: "joalheria",
        assinado: true,
        mestre: true,
        admin: true,
      },
      assinantes: {},
      entradas: [],
      estoque: [],
      consultoras: [],
      vendas: [],
      clientes: [],
      maletas: [],
      despesas: [],
      colecoes: [],
    };
  }

  // 1) é dona de alguma loja?
  let { data: loja } = await sb
    .from("lojas")
    .select("*")
    .eq("dona_id", u.id)
    .maybeSingle();

  // 2) não é dona — está vinculada como consultora ativa em alguma loja?
  //    (o vínculo acontece em aceitarConvite; a policy de leitura de
  //    "lojas" já libera esse caso mesmo sem ser a dona.)
  let minhaConsultora = null;
  if (!loja) {
    const { data: cons } = await sb
      .from("consultoras")
      .select("*")
      .eq("usuario_id", u.id)
      .eq("ativa", true)
      .maybeSingle();
    if (cons) {
      minhaConsultora = cons;
      const { data: lj } = await sb.from("lojas").select("*").eq("id", cons.loja_id).maybeSingle();
      loja = lj;
    }
  }
  if (!loja) return { semLoja: true };

  const [assin, cons, ent, pec, mal, mit, ven, sai, des, cli, col] = await comTimeout(Promise.all([
    sb.from("assinaturas").select("*").eq("loja_id", loja.id).maybeSingle(),
    sb.from("consultoras").select("*").eq("loja_id", loja.id),
    sb.from("entradas").select("*").eq("loja_id", loja.id),
    sb.from("pecas").select("*").eq("loja_id", loja.id),
    sb.from("maletas").select("*").eq("loja_id", loja.id),
    sb.from("maleta_itens").select("*"),
    sb.from("vendas").select("*").eq("loja_id", loja.id),
    sb.from("saidas").select("*").eq("loja_id", loja.id),
    sb.from("despesas").select("*").eq("loja_id", loja.id),
    sb.from("clientes").select("*").eq("loja_id", loja.id),
    sb.from("colecoes").select("*").eq("loja_id", loja.id),
  ]), 12000, "carregar dados da loja");

  const a = assin.data || {};

  return {
    lojaId: loja.id,
    perfil: {
      nome: u.email,
      loja: loja.nome,
      slug: loja.slug,
      logo: loja.logo_path,
      whatsapp: loja.whatsapp,
      fornecedores:
        loja.fornecedores_json && loja.fornecedores_json.length
          ? loja.fornecedores_json
          : (loja.fornecedores || []).map((n) => ({
              nome: n,
              margem: String(loja.margem_padrao ?? 100),
            })),
      formas: loja.formas_pagamento || ["Dinheiro", "Débito", "Crédito", "Na confiança"],
      margem: String(loja.margem_padrao ?? 100),
      limiteInadimplencia: Number(loja.limite_inadimplencia ?? 0),
      papel: minhaConsultora ? "consultora" : "dona",
      consultoraId: minhaConsultora?.id || null,
      plano: a.plano || "livre",
      assinado: a.status === "ativa",
      trialAte: a.trial_ate,
      atrasoDesde: a.atraso_desde,
      status: a.status,
      mestre: false,
    },
    consultoras: (cons.data || []).map((x) => ({
      id: x.id,
      nome: x.nome,
      comissao: Number(x.comissao),
      foto: x.foto_path,
      dona: x.eh_dona,
      ativa: x.ativa,
      convite: x.convite_codigo,
      vinculada: !!x.usuario_id,
    })),
    entradas: (ent.data || []).map((x) => ({
      id: x.id,
      fornecedor: x.fornecedor,
      arquivo: x.arquivo_path,
      data: x.criada_em,
      qtdItens: x.qtd_itens,
      total: r(x.total_centavos),
    })),
    estoque: (pec.data || []).map((x) => ({
      id: x.id,
      entradaId: x.entrada_id,
      codigo: x.codigo,
      nome: x.nome,
      qtd: x.qtd,
      custo: r(x.custo_centavos),
      venda: r(x.venda_centavos),
      banho: x.banho,
      pedra: x.pedra,
      acabamento: x.acabamento,
      tamanho: x.tamanho,
      fotos: x.fotos || [],
      fornecedor: x.fornecedor,
      entradaEm: x.entrada_em,
      arquivada: x.arquivada,
      margemAplicada: x.margem_aplicada != null ? Number(x.margem_aplicada) : null,
      colecaoId: x.colecao_id,
    })),
    colecoes: (col.data || []).map((x) => ({
      id: x.id,
      nome: x.nome,
      criadaEm: x.criada_em,
    })),
    maletas: (mal.data || []).map((m) => ({
      id: m.id,
      consultoraId: m.consultora_id,
      prazo: m.prazo_dias,
      status: m.status,
      abertaEm: m.aberta_em,
      fechadaEm: m.fechada_em,
      itens: (mit.data || [])
        .filter((i) => i.maleta_id === m.id)
        .map((i) => ({
          pecaId: i.peca_id,
          codigo: i.codigo,
          nome: i.nome,
          qtd: i.qtd,
          custo: r(i.custo_centavos),
          venda: r(i.venda_centavos),
        })),
    })),
    vendas: (ven.data || []).map((x) => ({
      id: x.id,
      pecaId: x.peca_id,
      consultoraId: x.consultora_id,
      maletaId: x.maleta_id,
      codigo: x.codigo,
      nome: x.nome,
      qtd: x.qtd,
      valor: r(x.valor_centavos),
      custo: r(x.custo_centavos),
      comissao: r(x.comissao_centavos),
      modalidade: ENUM_PARA_MODALIDADE[x.modalidade] || x.modalidade,
      cliente: x.cliente,
      pago: x.pago,
      cobrarEm: x.cobrar_em,
      data: x.vendida_em,
    })),
    saidas: (sai.data || []).map((x) => ({
      id: x.id,
      pecaId: x.peca_id,
      codigo: x.codigo,
      nome: x.nome,
      qtd: x.qtd,
      custo: r(x.custo_centavos),
      valor: r(x.custo_centavos),
      motivo: ENUM_PARA_MOTIVO[x.motivo] || x.motivo,
      observacao: x.observacao,
      data: x.saiu_em,
    })),
    despesas: (des.data || []).map((x) => ({
      id: x.id,
      nome: x.nome,
      valor: r(x.valor_centavos),
      tipo: ENUM_PARA_TIPO_DESPESA[x.tipo] || x.tipo,
      data: x.competencia,
    })),
    clientes: (cli.data || []).map((x) => ({
      id: x.id,
      nome: x.nome,
      telefone: x.telefone,
      cpf: x.cpf,
      endereco: x.endereco,
      criadoEm: x.criado_em,
    })),
  };
}

/* ---------- clientes ---------- */
export async function salvarCliente(lojaId, cli) {
  const { error } = await sb.from("clientes").insert({
    loja_id: lojaId,
    nome: cli.nome,
    telefone: cli.telefone || null,
    cpf: cli.cpf || null,
    endereco: cli.endereco || null,
  });
  if (error) throw error;
}

/* ---------- romaneio: grava entrada + peças em uma transação lógica ---------- */
export async function salvarRomaneio(lojaId, { fornecedor, arquivo, itens, colecaoId }) {
  const total = itens.reduce((s, i) => s + i.qtd * c(i.custo), 0);

  const { data: entrada, error } = await sb
    .from("entradas")
    .insert({
      loja_id: lojaId,
      fornecedor,
      arquivo_path: arquivo,
      qtd_itens: itens.length,
      total_centavos: total,
    })
    .select()
    .single();
  if (error) throw error;

  const { error: e2 } = await sb.from("pecas").insert(
    itens.map((i) => ({
      loja_id: lojaId,
      entrada_id: entrada.id,
      codigo: i.codigo,
      nome: i.nome || i.codigo,
      qtd: i.qtd,
      custo_centavos: c(i.custo),
      venda_centavos: c(i.venda),
      banho: i.banho || null,
      pedra: i.pedra || null,
      acabamento: i.acabamento || null,
      tamanho: i.tamanho || null,
      fotos: i.fotos || [],
      fornecedor,
      colecao_id: colecaoId || null,
    })),
  );
  if (e2) {
    await sb.from("entradas").delete().eq("id", entrada.id);
    throw e2;
  }
  return entrada.id;
}

export async function excluirEntrada(entradaId) {
  const { error } = await sb.from("entradas").delete().eq("id", entradaId);
  if (error) throw error;
}

/* ---------- venda: registrada em uma função do banco (registrar_venda)
   que trava a linha da peça e baixa o estoque na mesma transação —
   evita duas vendas simultâneas venderem a mesma unidade duas vezes. */
export async function registrarVenda(lojaId, v) {
  const { data, error } = await sb.rpc("registrar_venda", {
    p_loja: lojaId,
    p_peca: v.pecaId,
    p_qtd: Number(v.qtd) || 1,
    p_valor_cent: c(v.valor),
    p_modalidade: MODALIDADE_PARA_ENUM[v.modalidade] || v.modalidade,
    p_consultora: v.consultoraId || null,
    p_maleta: v.maletaId || null,
    p_cliente: v.cliente || null,
    p_pago: v.pago,
    p_cobrar_em: v.cobrarEm ? String(v.cobrarEm).slice(0, 10) : null,
  });
  if (error) throw new Error(error.message);
  return data; // id da venda
}

export async function quitarVenda(id) {
  const { error } = await sb
    .from("vendas")
    .update({ pago: true, pago_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/* ---------- saída de peça: também via função do banco (registrar_saida),
   mesma lógica de trava de linha para não perder atualização. */
export async function registrarSaida(lojaId, pecaId, motivo, observacao) {
  const { data, error } = await sb.rpc("registrar_saida", {
    p_loja: lojaId,
    p_peca: pecaId,
    p_motivo: MOTIVO_PARA_ENUM[motivo] || motivo,
    p_observacao: observacao || null,
  });
  if (error) throw new Error(error.message);
  return data; // id da saída
}

/* ---------- peças: incluir manualmente, editar, arquivar, apagar ---------- */
export const pecas = {
  criar: async (lojaId, p) => {
    const { error } = await sb.from("pecas").insert({
      loja_id: lojaId,
      entrada_id: p.entradaId || null,
      codigo: p.codigo,
      nome: p.nome || p.codigo,
      qtd: Number(p.qtd) || 0,
      custo_centavos: c(p.custo),
      venda_centavos: c(p.venda),
      banho: p.banho || null,
      pedra: p.pedra || null,
      acabamento: p.acabamento || null,
      tamanho: p.tamanho || null,
      fotos: p.fotos || [],
      fornecedor: p.fornecedor || null,
      colecao_id: p.colecaoId || null,
    });
    if (error) throw error;
  },
  atualizar: async (id, p) => {
    const { error } = await sb
      .from("pecas")
      .update({
        codigo: p.codigo,
        nome: p.nome,
        qtd: Number(p.qtd) || 0,
        custo_centavos: c(p.custo),
        venda_centavos: c(p.venda),
        banho: p.banho || null,
        pedra: p.pedra || null,
        acabamento: p.acabamento || null,
        tamanho: p.tamanho || null,
        fotos: p.fotos || [],
        colecao_id: p.colecaoId || null,
      })
      .eq("id", id);
    if (error) throw error;
  },
  // já vendeu/saiu alguma vez: não pode sumir de vez, senão o histórico
  // (vendas/saídas) fica com uma peça "fantasma" — então arquiva com
  // qtd zerada em vez de apagar.
  arquivar: async (id) => {
    const { error } = await sb.from("pecas").update({ arquivada: true, qtd: 0 }).eq("id", id);
    if (error) throw error;
  },
  // nunca foi movimentada: pode apagar de vez. Se por algum motivo já
  // tiver uma maleta apontando pra ela, o banco recusa (FK) — o erro
  // sobe pra tela pedir pra arquivar em vez de apagar.
  excluir: async (id) => {
    const { error } = await sb.from("pecas").delete().eq("id", id);
    if (error) throw error;
  },
};

/* ---------- coleções: agrupamentos nomeados de peças, para facilitar
   estratégias de venda. Criadas no Estoque ou direto ao subir um
   romaneio. Uma peça pertence a no máximo uma coleção. ---------- */
export const colecoes = {
  criar: async (lojaId, nome) => {
    const { data, error } = await sb
      .from("colecoes")
      .insert({ loja_id: lojaId, nome: nome.trim() })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id, nome: data.nome, criadaEm: data.criada_em };
  },
  renomear: async (id, nome) => {
    const { error } = await sb.from("colecoes").update({ nome: nome.trim() }).eq("id", id);
    if (error) throw error;
  },
  remover: async (id) => {
    const { error } = await sb.from("colecoes").delete().eq("id", id);
    if (error) throw error;
  },
};

/* ---------- maleta ---------- */
export async function abrirMaleta(lojaId, { consultoraId, prazo, itens }) {
  const { data: maleta, error } = await sb
    .from("maletas")
    .insert({ loja_id: lojaId, consultora_id: consultoraId, prazo_dias: prazo })
    .select()
    .single();
  if (error) throw error;

  await sb.from("maleta_itens").insert(
    itens.map((i) => ({
      maleta_id: maleta.id,
      peca_id: i.pecaId,
      codigo: i.codigo,
      nome: i.nome,
      qtd: i.qtd,
      custo_centavos: c(i.custo),
      venda_centavos: c(i.venda),
    })),
  );

  for (const i of itens) {
    const { data: p } = await sb.from("pecas").select("qtd").eq("id", i.pecaId).single();
    await sb.from("pecas").update({ qtd: (p?.qtd || 0) - i.qtd }).eq("id", i.pecaId);
  }
  return maleta.id;
}

export async function encerrarMaleta(maletaId) {
  const { data: itens } = await sb
    .from("maleta_itens")
    .select("*")
    .eq("maleta_id", maletaId);

  for (const i of (itens || []).filter((x) => x.qtd > 0)) {
    if (!i.peca_id) continue;
    const { data: p } = await sb.from("pecas").select("qtd").eq("id", i.peca_id).single();
    await sb.from("pecas").update({ qtd: (p?.qtd || 0) + i.qtd }).eq("id", i.peca_id);
  }
  await sb
    .from("maletas")
    .update({ status: "fechada", fechada_em: new Date().toISOString() })
    .eq("id", maletaId);
}

/* ---------- consultoras, despesas, perfil ---------- */
/* Código de convite: longo o bastante para não dar pra adivinhar
   (a função aceitar_convite no banco só libera pra quem sabe o código
   exato, e só uma vez — usuario_id precisa estar vazio). */
const gerarConviteCodigo = () =>
  "luxi-" + Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);

export const consultoras = {
  criar: async (lojaId, x) => {
    const { data, error } = await sb
      .from("consultoras")
      .insert({
        loja_id: lojaId,
        nome: x.nome,
        comissao: x.comissao,
        foto_path: x.foto || null,
        convite_codigo: gerarConviteCodigo(),
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      nome: data.nome,
      comissao: Number(data.comissao),
      foto: data.foto_path,
      dona: data.eh_dona,
      ativa: data.ativa,
      convite: data.convite_codigo,
      vinculada: !!data.usuario_id,
    };
  },
  atualizar: async (id, campos) => {
    const { error } = await sb.from("consultoras").update(campos).eq("id", id);
    if (error) throw error;
  },
  remover: async (id) => {
    const { error } = await sb.from("consultoras").delete().eq("id", id);
    if (error) throw error;
  },
};

/* Aceitar um convite: a pessoa convidada, já logada (criou conta ou
   entrou), chama isto com o código que veio no link do WhatsApp. A
   função no banco vincula usuario_id = auth.uid() na consultora cujo
   convite_codigo bate — só funciona uma vez (usuario_id precisa estar
   vazio) e nunca revela nada sobre convites de outras lojas. */
export async function aceitarConvite(codigo) {
  const { data, error } = await sb.rpc("aceitar_convite", { codigo });
  if (error) throw new Error(error.message || "Convite inválido ou já utilizado.");
  return data; // id da consultora vinculada
}

export const despesas = {
  criar: async (lojaId, x) => {
    const { error } = await sb.from("despesas").insert({
      loja_id: lojaId,
      nome: x.nome,
      valor_centavos: c(x.valor),
      tipo: x.tipo === "Fixa" ? "fixa" : "variavel",
    });
    if (error) throw error;
  },
  remover: async (id) => {
    const { error } = await sb.from("despesas").delete().eq("id", id);
    if (error) throw error;
  },
};

export const loja = {
  atualizar: (lojaId, campos) => sb.from("lojas").update(campos).eq("id", lojaId),
  trocarPlano: (lojaId, plano) =>
    sb
      .from("assinaturas")
      .update({ plano, status: "ativa", atraso_desde: null, atualizada_em: new Date().toISOString() })
      .eq("loja_id", lojaId),
};

/* ---------- arquivos ---------- */
export async function enviarArquivo(bucket, lojaId, file, nome) {
  const caminho = `${lojaId}/${nome}`;
  const { error } = await sb.storage.from(bucket).upload(caminho, file, { upsert: true });
  if (error) throw error;
  return caminho;
}

export async function urlAssinada(bucket, caminho, segundos = 3600) {
  const { data } = await sb.storage.from(bucket).createSignedUrl(caminho, segundos);
  return data?.signedUrl ?? null;
}

/* ---------- leitura do romaneio (chama a Edge Function) ---------- */
export async function lerRomaneio(lojaId, file) {
  const base64 = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(",")[1]);
    fr.onerror = () => rej(new Error("Não consegui abrir o arquivo."));
    fr.readAsDataURL(file);
  });

  const { data, error } = await sb.functions.invoke("ler-romaneio", {
    body: { arquivo: base64, tipo: file.type, loja_id: lojaId },
  });

  if (error) throw new Error("Não consegui ler agora. Tente de novo ou cadastre manualmente.");
  if (data?.erro) throw new Error(data.erro);
  return data;
}

/* ---------- migração do localStorage ----------
   Roda uma vez, na primeira entrada após a atualização.
   Se der qualquer erro, o localStorage NÃO é apagado. */
export async function migrarDoLocalStorage(lojaId) {
  const bruto = localStorage.getItem("oj:dados:v1");
  if (!bruto) return { migrado: false };

  const d = JSON.parse(bruto);
  if (!d?.estoque?.length) return { migrado: false };

  const mapaEntrada = {};
  for (const e of d.entradas || []) {
    const itens = (d.estoque || []).filter((p) => p.entradaId === e.id);
    if (!itens.length) continue;
    mapaEntrada[e.id] = await salvarRomaneio(lojaId, {
      fornecedor: e.fornecedor,
      arquivo: null,
      itens,
    });
  }

  for (const x of d.despesas || []) await despesas.criar(lojaId, x);
  for (const cst of (d.consultoras || []).filter((k) => !k.dona))
    await consultoras.criar(lojaId, cst);

  localStorage.setItem("oj:dados:migrado", new Date().toISOString());
  return { migrado: true, entradas: Object.keys(mapaEntrada).length };
}

/* ---------- Dados reais do admin (só acessível com service role via RPC) ---------- */
export async function carregarDadosAdmin() {
  const { data, error } = await sb.rpc("dados_admin_luxi");
  if (error) throw new Error(error.message || "Não consegui carregar os dados administrativos.");
  return data || {};
}

/* ---------- Acessos beta (plano grátis por tempo determinado) ---------- */
export async function criarAcessoBeta({ email, dias, plano = "crescimento", obs = "" }) {
  // Usa a função do banco (segura) que libera o e-mail para criar conta beta.
  const { data, error } = await sb.rpc("liberar_beta", {
    p_email: email.trim(),
    p_dias: Number(dias) || 30,
    p_plano: plano,
    p_obs: obs || null,
  });
  if (error) throw new Error(error.message || "Não consegui liberar esse acesso.");
  return data;
}

export async function revogarBeta(email) {
  const { error } = await sb.rpc("revogar_beta", { p_email: email });
  if (error) throw new Error(error.message || "Não consegui revogar.");
}

export async function listarAcessosBeta() {
  const { data } = await sb.from("acessos_beta").select("*").order("criado_em", { ascending: false });
  return data || [];
}

/* ---------- prazo do beta da própria cliente (para os textos da tela) ---------- */
export async function meuAcessoBeta() {
  try {
    const { data, error } = await sb.rpc("meu_acesso_beta");
    return error ? null : data || null;
  } catch (e) {
    return null;
  }
}
