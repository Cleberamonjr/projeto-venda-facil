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
    if (!data.session) {
      // Não pedimos confirmação de e-mail: entra direto com a senha que a pessoa acabou de criar.
      const { data: entrou, error: eEntrar } = await sb.auth.signInWithPassword({ email, password: senha });
      if (eEntrar) {
        throw new Error("Este e-mail já tem uma conta. Toque em “Já tenho conta” e entre com a sua senha.");
      }
      return entrou.user;
    }
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
    // 1) O servidor cria a conta JÁ CONFIRMADA (nenhum e-mail de confirmação existe nesse caminho).
    let jaTinhaConta = false;
    try {
      const { data, error } = await sb.functions.invoke("criar-conta-beta", { body: { token, senha } });
      if (error) throw error;
      jaTinhaConta = !!data?.existe;
    } catch (e) {
      const status = e?.context?.status;
      if (status && status >= 400 && status < 500) {
        const corpo = await e.context.json().catch(() => ({}));
        throw new Error(
          corpo?.erro === "senha_invalida"
            ? "A senha precisa ter entre 6 e 72 caracteres."
            : "Este convite é inválido, expirou ou já foi utilizado."
        );
      }
      // função fora do ar / sem internet: tenta o caminho direto em vez de travar o cadastro
      const { error: eS } = await sb.auth.signUp({ email: informado, password: senha });
      if (eS) throw new Error(traduzErro(eS.message));
    }
    // 2) Entra com a senha que ela escolheu.
    const { data: entrou, error: eEntrar } = await sb.auth.signInWithPassword({ email: informado, password: senha });
    if (eEntrar) {
      throw new Error(
        jaTinhaConta
          ? "Este e-mail já tem uma conta no Luxi. Toque em “Já tenho conta” e entre com a senha que você criou antes."
          : "Não consegui entrar com a conta nova. Tente de novo em instantes."
      );
    }
    await this.consumirConviteBeta(token);
    return { user: entrou.user, confirmado: true };
  },
  async consumirConviteBeta(token) {
    const { data, error } = await sb.rpc("consumir_convite_beta", { p_token: token });
    if (error) throw new Error("Não consegui confirmar este convite.");
    if (!data) throw new Error("Este convite não corresponde ao e-mail desta conta.");
    return true;
  },
  // Troca a senha da própria conta. Confere a senha atual antes: assim ninguém
  // troca a senha de quem deixou o celular aberto.
  async trocarSenha(senhaAtual, novaSenha) {
    const u = await this.usuario();
    if (!u?.email) throw new Error("Sua sessão expirou. Entre de novo para trocar a senha.");
    const { error: eAtual } = await sb.auth.signInWithPassword({ email: u.email, password: senhaAtual });
    if (eAtual) throw new Error("A senha atual não confere.");
    const { error } = await sb.auth.updateUser({ password: novaSenha });
    if (error) throw new Error(traduzErro(error.message));
    try { await sb.rpc("concluir_troca_senha"); } catch (e) { /* sem marca pendente: segue */ }
    return true;
  },
  // A administradora redefiniu a senha desta conta? Então ela precisa criar uma nova antes de usar o app.
  async precisaTrocarSenha() {
    try {
      const { data, error } = await sb.rpc("preciso_trocar_senha");
      return !error && data === true;
    } catch (e) {
      return false; // se a consulta falhar, nunca trava o acesso
    }
  },
  async definirNovaSenha(nova) {
    const { error } = await sb.auth.updateUser({ password: nova });
    if (error) throw new Error(traduzErro(error.message));
    await sb.rpc("concluir_troca_senha");
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
  if (m.includes("different from the old")) return "A nova senha precisa ser diferente da atual.";
  if (m.includes("rate limit") || m.includes("Too many")) return "Muitas tentativas seguidas. Espere um minutinho e tente de novo.";
  if (m.includes("Email not confirmed")) return "Não consegui entrar agora. Tente de novo em instantes.";
  return "Não consegui completar. Verifique sua conexão e tente de novo.";
}

/* ---------- criar loja + assinatura em teste de 72h ---------- */
export async function criarLoja({ nome, fornecedores, formas, margem, plano, dona, whatsapp }) {
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
      whatsapp: whatsapp ? String(whatsapp).replace(/\D/g, "").slice(0, 11) : null,
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
  let { data: loja, error: lojaError } = await sb
    .from("lojas")
    .select("*")
    .eq("dona_id", u.id)
    .maybeSingle();
  if (lojaError) throw lojaError;

  // 2) não é dona — está vinculada como consultora ativa em alguma loja?
  //    (o vínculo acontece em aceitarConvite; a policy de leitura de
  //    "lojas" já libera esse caso mesmo sem ser a dona.)
  let minhaConsultora = null;
  if (!loja) {
    const { data: cons, error: consError } = await sb
      .from("consultoras")
      .select("*")
      .eq("usuario_id", u.id)
      .eq("ativa", true)
      .maybeSingle();
    if (consError) throw consError;
    if (cons) {
      minhaConsultora = cons;
      const { data: lj, error: ljError } = await sb.from("lojas").select("*").eq("id", cons.loja_id).maybeSingle();
      if (ljError) throw ljError;
      loja = lj;
    }
  }
  if (!loja) return { semLoja: true };

  const [assin, cons, ent, pec, mal, mit, ven, sai, des, cli, col, rec] = await comTimeout(Promise.all([
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
    sb.from("contas_receber").select("*").eq("loja_id", loja.id),
  ]), 12000, "carregar dados da loja");

  const respostas = [assin, cons, ent, pec, mal, mit, ven, sai, des, cli, col, rec];
  const falha = respostas.find((x) => x && x.error);
  if (falha) {
    console.error("Falha ao carregar dados da loja:", falha.error);
    throw falha.error;
  }

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
    contasReceber: (rec.data || []).map((x) => ({ id:x.id, consultoraId:x.consultora_id, nome:x.nome, valor:r(x.valor_centavos), vencimento:x.vencimento, status:x.status, origem:x.origem, referenciaId:x.referencia_id, criadoEm:x.criado_em })),
    vendas: (ven.data || []).filter((x) => !x.cancelada_em).map((x) => ({
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
      canceladaEm: x.cancelada_em || null,
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

  const fotosPorItem = await Promise.all(itens.map((i) => subirFotos(lojaId, i.fotos || [])));
  const { error: e2 } = await sb.from("pecas").insert(
    itens.map((i, idx) => ({
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
      fotos: fotosPorItem[idx],
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

/* ---------- fotos das peças ----------
   As fotos vão para o armazenamento (bucket público "fotos-pecas", pasta = id da loja)
   e a peça guarda só o endereço da foto — leve e rápido de carregar no celular.
   Se o envio falhar, a foto NÃO se perde: continua guardada na própria peça. */
const BUCKET_FOTOS = "fotos-pecas";
async function subirFotos(lojaId, fotos = []) {
  if (!lojaId) return fotos;
  const saida = [];
  for (const f of fotos) {
    if (typeof f === "string" && f.startsWith("data:image")) {
      try {
        const blob = await (await fetch(f)).blob();
        const nome = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);
        const caminho = `${lojaId}/${nome}.jpg`;
        const { error } = await sb.storage.from(BUCKET_FOTOS).upload(caminho, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
        if (error) throw error;
        saida.push(sb.storage.from(BUCKET_FOTOS).getPublicUrl(caminho).data.publicUrl);
        continue;
      } catch (e) {
        /* mantém a foto como está */
      }
    }
    saida.push(f);
  }
  return saida;
}

/* ---------- peças: incluir manualmente, editar, arquivar, apagar ---------- */
export const pecas = {
  criar: async (lojaId, p) => {
    const fotosFinais = await subirFotos(lojaId, p.fotos || []);
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
      fotos: fotosFinais,
      fornecedor: p.fornecedor || null,
      colecao_id: p.colecaoId || null,
    });
    if (error) throw error;
  },
  atualizar: async (id, p, lojaId) => {
    const fotosFinais = await subirFotos(lojaId, p.fotos || []);
    const campos = {
      codigo: p.codigo,
      nome: p.nome,
      qtd: Number(p.qtd) || 0,
      custo_centavos: c(p.custo),
      venda_centavos: c(p.venda),
      banho: p.banho || null,
      pedra: p.pedra || null,
      acabamento: p.acabamento || null,
      tamanho: p.tamanho || null,
      fotos: fotosFinais,
      colecao_id: p.colecaoId || null,
    };
    // só mexe no fornecedor quando o formulário o informa (versões antigas do app não enviam)
    if (p.fornecedor !== undefined) campos.fornecedor = p.fornecedor || null;
    const { error } = await sb.from("pecas").update(campos).eq("id", id);
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

export async function maletaAcertoDados(maletaId) {
  const { data, error } = await sb.rpc("maleta_acerto_dados", { p_maleta: maletaId });
  if (error) throw new Error(error.message);
  return data;
}
export async function salvarMaletaAcerto(maletaId, itens, donaConfirmou=false, consultoraConfirmou=false, acertoJunto=false) {
  const { data, error } = await sb.rpc("maleta_acerto_salvar", {
    p_maleta: maletaId, p_itens: itens, p_dona_confirmou: donaConfirmou,
    p_consultora_confirmou: consultoraConfirmou, p_acerto_junto: acertoJunto
  });
  if (error) throw new Error(error.message);
  return data;
}
export async function fecharMaletaAcerto(maletaId) {
  const { data, error } = await sb.rpc("maleta_acerto_fechar", { p_maleta: maletaId });
  if (error) throw new Error(error.message);
  return data;
}
export async function desfazerMaletaAcerto(maletaId, motivo) {
  const { data, error } = await sb.rpc("maleta_acerto_desfazer", { p_maleta: maletaId, p_motivo: motivo || null });
  if (error) throw new Error(error.message);
  return data;
}
export async function registrarVendaMaleta(maletaId, v) {
  const { data, error } = await sb.rpc("maleta_registrar_venda", {
    p_maleta: maletaId, p_peca: v.pecaId, p_qtd: 1, p_valor_cent: c(v.valor),
    p_modalidade: MODALIDADE_PARA_ENUM[v.modalidade] || v.modalidade,
    p_cliente: v.cliente || null, p_pago: v.pago !== false, p_cobrar_em: v.cobrarEm || null
  });
  if (error) throw new Error(error.message);
  return data;
}
export async function quitarContaReceber(id) {
  const { error } = await sb.from("contas_receber").update({ status:"recebida", recebido_em:new Date().toISOString(), atualizado_em:new Date().toISOString() }).eq("id",id);
  if (error) throw error;
}
export async function reabrirMaleta(maletaId) {
  return desfazerMaletaAcerto(maletaId, "Desfazer acerto pela dona");
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
    const [{ data: assinatura }, { count }] = await Promise.all([
      sb.from("assinaturas").select("plano,status").eq("loja_id",lojaId).maybeSingle(),
      sb.from("consultoras").select("id", { count: "exact", head: true }).eq("loja_id",lojaId).eq("eh_dona",false).eq("ativa",true),
    ]);
    const limites = { crescimento: 5, joalheria: 10, inteligencia: 25 };
    const limite = limites[assinatura?.plano] || 0;
    if (!["trial","ativa"].includes(assinatura?.status) || !limite) {
      throw new Error("A equipe está disponível no plano Equipe.");
    }
    if ((count || 0) >= limite) {
      throw new Error("Você já chegou ao limite de vendedoras deste plano.");
    }
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


/* ---------- painel admin: uso real por loja (só a administradora consegue) ---------- */
export async function carregarUsoLojas() {
  const { data, error } = await sb.rpc("uso_lojas_luxi");
  if (error) throw new Error(error.message?.includes("negado") ? "Acesso restrito à administradora." : "Não consegui carregar o painel. Tente de novo.");
  return data;
}


/* ---------- painel admin: ajudar uma cliente que não consegue entrar ---------- */
export async function redefinirSenhaCliente(email, senha) {
  const { data, error } = await sb.functions.invoke("admin-redefinir-senha", {
    body: { email, ...(senha ? { senha } : {}) },
  });
  if (error) {
    let codigo = "";
    try { codigo = (await error.context.json())?.erro || ""; } catch (e) { /* sem corpo */ }
    const mensagens = {
      cliente_nao_encontrada: "Não achei nenhuma conta com esse e-mail.",
      conta_de_administracao: "Esta é uma conta de administração — para ela, use “Trocar minha senha”.",
      muitas_tentativas: "Muitas redefinições na última hora. Espere um pouco.",
      senha_invalida: "A senha precisa ter de 8 a 72 caracteres.",
      email_invalido: "Esse e-mail não parece certo.",
      acesso_negado: "Só a administradora pode fazer isso.",
      nao_autenticado: "Sua sessão expirou. Entre de novo.",
    };
    throw new Error(mensagens[codigo] || "Não consegui redefinir agora. Tente de novo.");
  }
  return data;
}

export async function auditoriaAdmin() {
  const { data, error } = await sb.rpc("auditoria_admin_recente");
  return error ? [] : data || [];
}

/* ---------- suporte: a administradora abre a loja de uma cliente (somente leitura, fica registrado) ---------- */
export async function verLojaSuporte(lojaId) {
  const { data, error } = await sb.rpc("admin_ver_loja", { p_loja: lojaId });
  if (error) {
    const msg = `${error.code || ""} ${error.message || ""}`;
    if (/PGRST202|Could not find the function|does not exist/i.test(msg))
      throw new Error("A visão de suporte ainda não foi ativada no servidor (falta rodar o SQL 20260930_admin_ver_loja).");
    if (/negado/i.test(msg)) throw new Error("Acesso restrito à administradora.");
    throw new Error("Não consegui abrir essa loja. Tente de novo.");
  }
  return data;
}

/* ---------- painel admin: excluir contas e dados (somente administradora, irreversível) ---------- */
export async function preverExclusao(userId) {
  const { data, error } = await sb.rpc("admin_prever_exclusao", { p_user: userId });
  if (error) throw new Error(/negado/i.test(error.message || "") ? "Só a administradora pode ver isso." : "Não consegui conferir o que seria apagado. Tente de novo.");
  return data;
}

export async function excluirUsuario({ userId, confirmarEmail, motivo, forcar }) {
  const { data, error } = await sb.functions.invoke("admin-excluir-usuario", {
    body: { user_id: userId, confirmar_email: confirmarEmail, motivo: motivo || "", forcar: forcar === true },
  });
  if (error) {
    let codigo = "";
    try { codigo = (await error.context.json())?.erro || ""; } catch (e) { /* sem corpo */ }
    const mensagens = {
      confirmacao_incorreta: "O e-mail digitado não confere com o da conta.",
      assinatura_ativa: "Esta cliente tem assinatura ativa. Marque a confirmação extra para excluir.",
      conta_de_administracao: "Contas de administração não podem ser excluídas por aqui.",
      muitas_exclusoes: "Muitas exclusões na última hora. Espere um pouco.",
      conta_nao_encontrada: "Essa conta já não existe.",
      acesso_negado: "Só a administradora pode fazer isso.",
      nao_autenticado: "Sua sessão expirou. Entre de novo.",
      falha_no_banco: "Não consegui apagar e NADA foi apagado. Tente de novo.",
    };
    throw new Error(mensagens[codigo] || "Não consegui excluir agora. Tente de novo.");
  }
  return data;
}

export async function exportarLoja(lojaId) {
  const { data, error } = await sb.rpc("admin_exportar_loja", { p_loja: lojaId });
  if (error) throw new Error("Não consegui gerar a cópia dos dados. Tente de novo.");
  return data;
}

export async function contasSemLoja() {
  const { data, error } = await sb.rpc("admin_contas_sem_loja");
  if (error) return [];
  return data || [];
}

export async function removerAcessoBeta(email) {
  const { error } = await sb.rpc("admin_remover_acesso_beta", { p_email: email });
  if (error) {
    if (error.code === "LX409") throw new Error("Esta pessoa já tem conta: exclua a conta pela lista de lojas ou de contas sem loja.");
    throw new Error("Não consegui remover esse acesso.");
  }
}

/* ---------- lona: a vitrine pública de cada consultora ----------
   Tudo passa por funções do banco (que conferem quem está chamando). As tabelas da lona são fechadas:
   nem esta camada nem ninguém lê/escreve nelas direto. O erro volta com o código (LX404, LX410...) que a
   vitrine usa para falar com a cliente em português. */
async function rpcLona(nome, args) {
  const { data, error } = await sb.rpc(nome, args);
  if (error) {
    const e = new Error(error.message || "Não deu certo");
    e.code = error.code;
    throw e;
  }
  return data;
}
export const lonaResumo = () => rpcLona("lona_resumo");
export const lonaMinha = (consultoraId) => rpcLona("lona_minha", { p_consultora: consultoraId || null });
export const lonaSalvar = (lonaId, rascunho) => rpcLona("lona_salvar", { p_lona: lonaId, p_rascunho: rascunho });
export const lonaPublicar = (lonaId) => rpcLona("lona_publicar", { p_lona: lonaId });
export const lonaTirarDoAr = (lonaId) => rpcLona("lona_tirar_do_ar", { p_lona: lonaId });
export const lonaSalvarPix = (chave) => rpcLona("lona_salvar_pix", { p_chave: chave || "" });
export const lonaPedidos = (consultoraId) => rpcLona("lona_pedidos_listar", { p_consultora: consultoraId || null });
export const lonaConfirmar = (pedidoId, valoresCentavos) =>
  rpcLona("lona_confirmar_pedido", { p_pedido: pedidoId, p_valores: valoresCentavos || {} });
export const lonaCancelar = (pedidoId) => rpcLona("lona_cancelar_pedido", { p_pedido: pedidoId });
/* públicas (a cliente, sem login) */
export const lonaPublica = (slug) => rpcLona("lona_publica", { p_slug: slug });
export const lonaCriarPedido = ({ slug, nome, whatsapp, pecas, origem }) =>
  rpcLona("lona_criar_pedido", { p_slug: slug, p_nome: nome, p_whatsapp: whatsapp, p_pecas: pecas, p_origem: origem });

/* capa da lona: bucket público "logos", pasta = id da loja, nome único a cada envio
   (o armazenamento não permite sobrescrever; a regra do banco exige "capa-<id da consultora>-…") */
export async function enviarCapaLona(lojaId, consultoraId, blob) {
  const sufixo = (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())).slice(0, 8);
  const caminho = `${lojaId}/capa-${consultoraId}-${sufixo}.jpg`;
  const { error } = await sb.storage.from("logos").upload(caminho, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  return sb.storage.from("logos").getPublicUrl(caminho).data.publicUrl;
}
