// Testa a lógica da função criar-conta-beta com um "Supabase" falso.
import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
import { build } from 'esbuild';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = await build({ entryPoints: [path.join(raiz, 'supabase/functions/criar-conta-beta/index.ts')], bundle: true, format: 'esm', platform: 'node', write: false,
  plugins: [{ name: 'npm-stub', setup(b) { b.onResolve({ filter: /^npm:/ }, (a) => ({ path: a.path, namespace: 'stub' })); b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const createClient = () => { throw new Error("não usado no teste"); };', loader: 'js' })); } }] });
const arq = path.join(os.tmpdir(), 'fn-conta-' + Date.now() + '.mjs'); fs.writeFileSync(arq, r.outputFiles[0].text);
const { tratar } = await import(pathToFileURL(arq).href); fs.unlinkSync(arq);

const futuro = new Date(Date.now() + 86400e3).toISOString(), passado = new Date(Date.now() - 86400e3).toISOString();
const TOKEN_OK = 'a'.repeat(32);
function falso({ convite, criarErro, erroConsulta } = {}) {
  const criados = [];
  const admin = {
    from: () => ({ select: () => ({ eq: (_c, v) => ({ maybeSingle: async () => erroConsulta ? { data: null, error: { message: 'x' } } : { data: v === TOKEN_OK ? convite : null, error: null } }) }) }),
    auth: { admin: { createUser: async (args) => { criados.push(args); return criarErro ? { data: null, error: criarErro } : { data: { user: { id: 'u' } }, error: null }; } } },
  };
  return { admin, criados };
}
const chamar = async (corpo, deps, metodo = 'POST') => { const res = await tratar(new Request('https://x/fn', { method: metodo, body: metodo === 'POST' ? JSON.stringify(corpo) : undefined }), deps.admin); return { status: res.status, corpo: await res.json().catch(() => null) }; };

const conviteBom = { email: 'cliente@teste.com', ativo: true, expira_em: futuro };
const casos = [
  ['cria conta confirmada com convite válido', async () => { const d = falso({ convite: conviteBom }); const x = await chamar({ token: TOKEN_OK, senha: 'segredo1' }, d);
    return x.status === 200 && x.corpo.criada && d.criados.length === 1 && d.criados[0].email_confirm === true && d.criados[0].email === 'cliente@teste.com'; }],
  ['o e-mail vem do convite, mesmo que o pedido traga outro', async () => { const d = falso({ convite: conviteBom }); await chamar({ token: TOKEN_OK, senha: 'segredo1', email: 'invasor@x.com' }, d); return d.criados[0].email === 'cliente@teste.com'; }],
  ['token que não existe → recusa e não cria', async () => { const d = falso({ convite: conviteBom }); const x = await chamar({ token: 'b'.repeat(32), senha: 'segredo1' }, d); return x.status === 400 && x.corpo.erro === 'convite_invalido' && d.criados.length === 0; }],
  ['convite vencido → recusa', async () => { const d = falso({ convite: { ...conviteBom, expira_em: passado } }); const x = await chamar({ token: TOKEN_OK, senha: 'segredo1' }, d); return x.status === 400 && d.criados.length === 0; }],
  ['convite revogado → recusa', async () => { const d = falso({ convite: { ...conviteBom, ativo: false } }); const x = await chamar({ token: TOKEN_OK, senha: 'segredo1' }, d); return x.status === 400 && d.criados.length === 0; }],
  ['senha curta → recusa', async () => { const d = falso({ convite: conviteBom }); const x = await chamar({ token: TOKEN_OK, senha: '123' }, d); return x.status === 400 && x.corpo.erro === 'senha_invalida' && d.criados.length === 0; }],
  ['token vazio/curto → recusa', async () => { const d = falso({ convite: conviteBom }); const x = await chamar({ token: 'abc', senha: 'segredo1' }, d); return x.status === 400 && d.criados.length === 0; }],
  ['conta já existe → avisa "existe" (o app pede a senha dela)', async () => { const d = falso({ convite: conviteBom, criarErro: { code: 'email_exists', message: 'A user with this email address has already been registered' } }); const x = await chamar({ token: TOKEN_OK, senha: 'segredo1' }, d); return x.status === 200 && x.corpo.existe === true; }],
  ['erro inesperado ao criar → 500 sem vazar detalhes', async () => { const d = falso({ convite: conviteBom, criarErro: { message: 'db exploded: senha=segredo1' } }); const x = await chamar({ token: TOKEN_OK, senha: 'segredo1' }, d); return x.status === 500 && !JSON.stringify(x.corpo).includes('segredo1'); }],
  ['corpo inválido e método errado', async () => { const d = falso({ convite: conviteBom }); const a = await tratar(new Request('https://x/fn', { method: 'POST', body: 'não é json' }), d.admin); const b = await chamar(null, d, 'GET'); return a.status === 400 && b.status === 405; }],
];
let falhas = 0;
for (const [nome, fn] of casos) { let ok = false; try { ok = await fn(); } catch (e) { console.log('   exceção:', e.message); } if (!ok) falhas++; console.log(ok ? '✅' : '❌', nome); }
console.log(falhas ? `\n${falhas} FALHA(S) na função` : `\nFUNÇÃO OK: ${casos.length} de ${casos.length}`); process.exit(falhas ? 1 : 0);
