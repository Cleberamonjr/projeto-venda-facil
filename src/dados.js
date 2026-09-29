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
    // Beta não exige confirmação de e-mail: se o signUp não devolveu sessão
    // (setting do Auth ainda ligado), tenta entrar na hora — o trigger
    // auto_confirmar_email no banco já marca o e-mail como confirmado.
    if (!data.session) {
      const login = await sb.auth.signInWithPassword({ email, password: senha });
      if (!login.error && login.data?.session) return login.data.user;
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
    const { data, error } = await sb.auth.signUp({ email: informado, password: senha });
    if (error) throw new Error(traduzErro(error.message));
    let session = data.session;
    // Beta não exige confirmação de e-mail. Se o Auth ainda estiver com
    // "Confirm email" ligado, o signUp não devolve sessão — tenta entrar
    // na hora (o trigger auto_confirmar_email no banco já libera o acesso).
    if (!session) {
      const login = await sb.auth.signInWithPassword({ email: informado, password: senha });
      if (!login.error && login.data?.session) session = login.data.session;
    }
    if (session) await this.consumirConviteBeta(token);
    return { user: data.user || session?.user, confirmado: !!session };
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
