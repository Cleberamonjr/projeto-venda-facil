// Testa a lógica de segurança da função admin-redefinir-senha com um Supabase falso.
import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
import { build } from 'esbuild';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = await build({ entryPoints: [path.join(raiz, 'supabase/functions/admin-redefinir-senha/index.ts')], bundle: true, format: 'esm', platform: 'node', write: false,
  plugins: [{ name: 'npm-stub', setup(b) { b.onResolve({ filter: /^npm:/ }, (a) => ({ path: a.path, namespace: 'stub' })); b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const createClient = () => { throw new Error("não usado no teste"); };', loader: 'js' })); } }] });
const arq = path.join(os.tmpdir(), 'fn-redef-' + Date.now() + '.mjs'); fs.writeFileSync(arq, r.outputFiles[0].text);
const { tratar, gerarSenha } = await import(pathToFileURL(arq).href); fs.unlinkSync(arq);

function montar({ tokenValido = true, ehAdmin = true, alvo = { data: 'alvo-uuid', error: null }, troca = { error: null }, registro = { error: null } } = {}) {
  const chamadas = { troca: [], registro: [], alvo: [] };
  const usuario = {
    auth: { getUser: async () => tokenValido ? { data: { user: { id: 'admin-uuid' } }, error: null } : { data: null, error: { message: 'jwt inválido' } } },
    rpc: async (nome) => nome === 'sou_admin_luxi' ? { data: ehAdmin, error: null } : { data: null, error: { message: 'inesperado' } },
  };
  const admin = {
    rpc: async (nome, args) => {
      if (nome === 'admin_alvo_redefinicao') { chamadas.alvo.push(args); return alvo; }
      if (nome === 'admin_concluir_redefinicao') { chamadas.registro.push(args); return registro; }
      return { data: null, error: { message: 'inesperado' } };
    },
    auth: { admin: { updateUserById: async (id, dados) => { chamadas.troca.push({ id, ...dados }); return troca; } } },
  };
  return { deps: { clienteDoUsuario: () => usuario, admin }, chamadas };
}
const pedido = (corpo, { token = 'tok.en.jwt', metodo = 'POST' } = {}) => new Request('https://x/fn', { method: metodo, headers: token ? { Authorization: 'Bearer ' + token } : {}, body: metodo === 'POST' ? JSON.stringify(corpo) : undefined });
const rodar = async (corpo, cfg, opt) => { const m = montar(cfg); const res = await tratar(pedido(corpo, opt), m.deps); return { status: res.status, corpo: await res.json().catch(() => null), cache: res.headers.get('Cache-Control'), ...m }; };

const casos = [
  ['sem token → 401 e nada é tocado', async () => { const x = await rodar({ email: 'a@b.com' }, {}, { token: '' }); return x.status === 401 && !x.chamadas.troca.length && !x.chamadas.alvo.length; }],
  ['token inválido → 401', async () => { const x = await rodar({ email: 'a@b.com' }, { tokenValido: false }); return x.status === 401 && !x.chamadas.troca.length; }],
  ['cliente comum (não é admin) → 403 e não troca nada', async () => { const x = await rodar({ email: 'a@b.com' }, { ehAdmin: false }); return x.status === 403 && !x.chamadas.troca.length && !x.chamadas.alvo.length; }],
  ['e-mail inválido → 400', async () => { const x = await rodar({ email: 'isso-nao-e-email' }, {}); return x.status === 400 && !x.chamadas.troca.length; }],
  ['senha digitada curta (<8) → 400', async () => { const x = await rodar({ email: 'a@b.com', senha: '1234567' }, {}); return x.status === 400 && x.corpo.erro === 'senha_invalida' && !x.chamadas.troca.length; }],
  ['cliente não encontrada → 404 e não troca', async () => { const x = await rodar({ email: 'a@b.com' }, { alvo: { data: null, error: { code: 'LX404' } } }); return x.status === 404 && !x.chamadas.troca.length; }],
  ['alvo é conta de administração → 403 e não troca', async () => { const x = await rodar({ email: 'a@b.com' }, { alvo: { data: null, error: { code: 'LX403' } } }); return x.status === 403 && x.corpo.erro === 'conta_de_administracao' && !x.chamadas.troca.length; }],
  ['limite por hora estourado → 429 e não troca', async () => { const x = await rodar({ email: 'a@b.com' }, { alvo: { data: null, error: { code: 'LX429' } } }); return x.status === 429 && !x.chamadas.troca.length; }],
  ['sucesso SEM senha digitada: gera senha forte, troca e registra', async () => { const x = await rodar({ email: 'Cliente@Teste.com ' }, {});
    const s = x.corpo.senha; return x.status === 200 && x.corpo.gerada === true && /^[A-HJ-NP-Za-km-z2-9]{10}$/.test(s) && x.chamadas.troca.length === 1 && x.chamadas.troca[0].password === s && x.chamadas.troca[0].id === 'alvo-uuid' && x.chamadas.registro.length === 1 && x.corpo.registrado === true && x.corpo.email === 'cliente@teste.com'; }],
  ['sucesso COM senha digitada pela administradora: usa exatamente ela', async () => { const x = await rodar({ email: 'a@b.com', senha: 'MinhaSenha9' }, {}); return x.status === 200 && x.corpo.gerada === false && x.chamadas.troca[0].password === 'MinhaSenha9'; }],
  ['a resposta nunca vai para cache', async () => { const x = await rodar({ email: 'a@b.com' }, {}); return x.cache === 'no-store'; }],
  ['falha ao trocar a senha → 500 SEM registrar nem vazar senha', async () => { const x = await rodar({ email: 'a@b.com', senha: 'MinhaSenha9' }, { troca: { error: { message: 'boom senha=MinhaSenha9' } } }); return x.status === 500 && !x.chamadas.registro.length && !JSON.stringify(x.corpo).includes('MinhaSenha9'); }],
  ['falha só no registro: a senha JÁ mudou → devolve a senha com registrado=false', async () => { const x = await rodar({ email: 'a@b.com' }, { registro: { error: { message: 'x' } } }); return x.status === 200 && x.corpo.registrado === false && typeof x.corpo.senha === 'string'; }],
  ['método errado → 405', async () => { const m = montar(); const res = await tratar(pedido(null, { metodo: 'GET' }), m.deps); return res.status === 405; }],
  ['gerador de senha: 500 senhas seguidas, todas válidas e diferentes', async () => { const set = new Set(); for (let i = 0; i < 500; i++) { const s = gerarSenha(10); if (!/^[A-HJ-NP-Za-km-z2-9]{10}$/.test(s)) return false; set.add(s); } return set.size === 500; }],
];
let falhas = 0;
for (const [nome, fn] of casos) { let ok = false; try { ok = await fn(); } catch (e) { console.log('   exceção:', e.message); } if (!ok) falhas++; console.log(ok ? '✅' : '❌', nome); }
console.log(falhas ? `\n${falhas} FALHA(S) na função de redefinir senha` : `\nFUNÇÃO DE REDEFINIR SENHA OK: ${casos.length} de ${casos.length}`); process.exit(falhas ? 1 : 0);
