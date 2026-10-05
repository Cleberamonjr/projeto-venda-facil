import { useEffect, useState } from "react";

const VERSAO = "2.8";
const MELHORIAS = [
  "Conceder mais dias sem criar outro convite.",
  "Reativar conta encerrada ou bloqueada.",
  "Bloquear acesso na hora, sem apagar a loja.",
  "Excluir usuário só com o e-mail confirmado.",
];

export function AvisoDeAtualizacao({ versaoEmVigor }) {
  const [escondido, setEscondido] = useState(false);
  const emVigor = versaoEmVigor === VERSAO;
  if (emVigor || escondido) return null;
  return (
    <div className="oj-card" role="status" style={{ marginBottom: 12 }}>
      <div className="oj-lbl">Atualização {VERSAO} ainda não está em vigor</div>
      <div className="oj-nome" style={{ marginTop: 6 }}>Tem uma versão nova do Luxi.</div>
      <ul className="oj-meta" style={{ margin: "8px 0 12px", paddingLeft: 18 }}>
        {MELHORIAS.map((m) => <li key={m}>{m}</li>)}
      </ul>
      <button className="oj-bt forte" onClick={() => window.dispatchEvent(new Event("luxi:nova-versao"))}>
        Atualizar agora
      </button>
      <button className="oj-bt" style={{ marginLeft: 8 }} onClick={() => setEscondido(true)}>Depois</button>
    </div>
  );
}

export function UsuariosAcessos({ supabase, contas = [], onExcluir }) {
  const [dias, setDias] = useState(7);
  const [msg, setMsg] = useState("");

  async function chamar(nome, args) {
    const { error } = await supabase.rpc(nome, args);
    setMsg(error ? error.message : "Feito.");
  }

  return (
    <div>
      <AvisoDeAtualizacao versaoEmVigor={window.__LUXI_VERSAO__ || ""} />
      <div className="oj-sec">Usuários e acessos</div>
      {contas.map((c) => (
        <div className="oj-card" key={c.email} style={{ marginBottom: 10 }}>
          <div className="oj-nome">{c.email}</div>
          <div className="oj-meta">{c.bloqueado ? "Bloqueada" : c.ativo ? "Ativa" : "Encerrada"}</div>
          <div className="oj-acoes" style={{ marginTop: 8 }}>
            <button className="oj-bt" onClick={() => chamar("admin_conceder_dias", { p_email: c.email, p_dias: Number(dias) })}>+ {dias} dias</button>
            <button className="oj-bt" onClick={() => chamar("admin_reativar_conta", { p_email: c.email, p_dias: Number(dias) })}>Reativar</button>
            <button className="oj-bt" onClick={() => window.confirm("Bloquear o acesso?") && chamar("admin_bloquear_conta", { p_email: c.email })}>Bloquear</button>
            <button className="oj-bt" onClick={() => onExcluir?.(c)}>Excluir usuário</button>
          </div>
        </div>
      ))}
      <label className="oj-campo">Dias a conceder
        <input type="number" min="1" max="365" value={dias} onChange={(e) => setDias(e.target.value)} />
      </label>
      {msg && <div className="oj-meta">{msg}</div>}
    </div>
  );
}
