// Testa a função admin-excluir-usuario com um "Supabase" falso: travas de segurança, ordem das operações e falhas parciais.
import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
import { build } from 'esbuild';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = await build({ entryPoints: [path.join(raiz, 'supabase/functions/admin-excluir-usuario/index.ts')], bundle: true, format: 'esm', platform: 'node', write: false,
  plugins: [{ name: 'npm-stub', setup(b) { b.onResolve({ filter: /^npm:/ }, (a) => ({ path: a.path, namespace: 'stub' })); b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const createClient = () => { throw new Error("não usado no teste"); };', loader: 'js' })); } }] });
const arq = path.join(os.tmpdir(), 'fn-excluir-' + Date.now() + '.mjs'); fs.writeFileSync(arq, r.outputFiles[0].text);
const { tratar } = await import(pathToFileURL(arq).href); fs.unlinkSync(arq);

const ADM = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', ALVO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', LOJA = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
function montar({ ehAdmin = true, previa, dbErro, dbOk, arquivos = { romaneios: ['1.jpg', '2.jpg'], 'fotos-pecas': ['a.jpg'] }, storageFalha = false, deleteErro = null } = {}) {
  const chamadas = []; const files = JSON.parse(JSON.stringify(arquivos));
  const previaPadrao = { email: 'cliente@teste.com', e_admin: false, sou_eu: false, lojas: [{ id: LOJA }], contagens: { pecas: 3 } };
  const deps = {
    clienteDoUsuario: () => ({
      auth: { getUser: async () => ({ data: { user: { id: ADM } }, error: null }) },
      rpc: async (n, a) => { chamadas.push('usuario:' + n); if (n === 'sou_admin_luxi') return { data: ehAdmin };
        if (n === 'admin_prever_exclusao') return previa === 'nao_existe' ? { data: null, error: { code: 'LX404' } } : { data: { ...previaPadrao, ...(previa || {}) } }; return { data: null }; } }),
    admin: {
      rpc: async (n, a) => { chamadas.push('servico:' + n); deps.ultimoRpc = a; if (dbErro) return { data: null, error: { code: dbErro } };
        return { data: dbOk || { email: 'cliente@teste.com', lojas: [LOJA], contagens: { pecas: 3, vendas: 1 } }, error: null }; },
      storage: { from: (b) => ({
        list: async (pref) => { chamadas.push(`storage.list:${b}`); if (storageFalha) return { data: null, error: { message: 'x' } }; return { data: (files[b] || []).map((n) => ({ name: n, id: 'id-' + n })), error: null }; },
        remove: async (cams) => { chamadas.push(`storage.remove:${b}:${cams.length}`); files[b] = (files[b] || []).filter((n) => !cams.includes(`${LOJA}/${n}`)); return { error: null }; } }) },
      auth: { admin: { deleteUser: async (id) => { chamadas.push('servico:deleteUser:' + id); return { error: deleteErro }; } } } } };
  return { deps, chamadas, files };
}
const chamar = async (m, corpo, { token = 'tok', metodo = 'POST' } = {}) => {
  const res = await tratar(new Request('https://x/fn', { method: metodo, headers: token ? { Authorization: 'Bearer ' + token } : {}, body: metodo === 'POST' ? (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)) : undefined }), m.deps);
  return { status: res.status, corpo: await res.json().catch(() => null), cache: res.headers.get('Cache-Control') };
};
const ok = { user_id: ALVO, confirmar_email: 'cliente@teste.com', motivo: 'pedido da cliente' };
const casos = [
  ['sem token → 401, nada é chamado', async () => { const m = montar(); const x = await chamar(m, ok, { token: '' }); return x.status === 401 && !m.chamadas.some((c) => c.startsWith('servico')); }],
  ['quem chama NÃO é administradora → 403 e não consulta nem apaga nada', async () => { const m = montar({ ehAdmin: false }); const x = await chamar(m, ok); return x.status === 403 && !m.chamadas.some((c) => c.startsWith('servico') || c.includes('prever')); }],
  ['id inválido → 400', async () => { const m = montar(); const x = await chamar(m, { ...ok, user_id: 'abc' }); return x.status === 400 && x.corpo.erro === 'usuario_invalido'; }],
  ['conta que não existe → 404', async () => { const m = montar({ previa: 'nao_existe' }); const x = await chamar(m, ok); return x.status === 404 && !m.chamadas.some((c) => c.startsWith('servico')); }],
  ['conta de administração como alvo → 403, nada apagado', async () => { const m = montar({ previa: { e_admin: true } }); const x = await chamar(m, ok); return x.status === 403 && !m.chamadas.some((c) => c.startsWith('servico')); }],
  ['a própria conta de quem pede → 403', async () => { const m = montar({ previa: { sou_eu: true } }); const x = await chamar(m, ok); return x.status === 403 && !m.chamadas.some((c) => c.startsWith('servico')); }],
  ['e-mail de confirmação errado → 400 e NADA é apagado', async () => { const m = montar(); const x = await chamar(m, { ...ok, confirmar_email: 'outra@pessoa.com' }); return x.status === 400 && x.corpo.erro === 'confirmacao_incorreta' && !m.chamadas.some((c) => c.startsWith('servico')); }],
  ['confirmação vazia → 400', async () => { const m = montar(); const x = await chamar(m, { ...ok, confirmar_email: '   ' }); return x.status === 400 && !m.chamadas.some((c) => c.startsWith('servico')); }],
  ['sucesso (e-mail com maiúsculas/espaços): banco → arquivos → conta, nessa ordem', async () => { const m = montar(); const x = await chamar(m, { ...ok, confirmar_email: '  CLIENTE@Teste.com ' });
    const ordem = m.chamadas.filter((c) => !c.startsWith('usuario')).join(' > ');
    return x.status === 200 && x.corpo.ok && x.corpo.conta_removida && x.corpo.arquivos_removidos === 3 && x.corpo.pendencias.length === 0 && x.cache === 'no-store'
      && ordem.indexOf('admin_excluir_dados_usuario') < ordem.indexOf('storage.list') && ordem.indexOf('storage.remove') < ordem.indexOf('deleteUser') && m.files.romaneios.length === 0 && m.files['fotos-pecas'].length === 0; }],
  ['assinatura ativa sem confirmação extra → 409 e arquivos/conta intocados', async () => { const m = montar({ dbErro: 'LX409' }); const x = await chamar(m, ok); return x.status === 409 && x.corpo.erro === 'assinatura_ativa' && !m.chamadas.some((c) => c.startsWith('storage') || c.includes('deleteUser')); }],
  ['"forcar" é repassado ao banco só quando é exatamente true', async () => { const a = montar(); await chamar(a, { ...ok, forcar: true }); const b = montar(); await chamar(b, { ...ok, forcar: 'true' }); return a.deps.ultimoRpc.p_forcar === true && b.deps.ultimoRpc.p_forcar === false; }],
  ['falha no banco → 500 e NÃO toca em arquivos nem na conta', async () => { const m = montar({ dbErro: 'XX000' }); const x = await chamar(m, ok); return x.status === 500 && x.corpo.erro === 'falha_no_banco' && !m.chamadas.some((c) => c.startsWith('storage') || c.includes('deleteUser')); }],
  ['limite de exclusões por hora → 429', async () => { const m = montar({ dbErro: 'LX429' }); const x = await chamar(m, ok); return x.status === 429 && !m.chamadas.some((c) => c.includes('deleteUser')); }],
  ['arquivos falham: dados já saíram → 200 com pendência "arquivos" e ainda remove a conta', async () => { const m = montar({ storageFalha: true }); const x = await chamar(m, ok); return x.status === 200 && x.corpo.pendencias.join() === 'arquivos' && x.corpo.conta_removida && m.chamadas.some((c) => c.includes('deleteUser')); }],
  ['conta falha ao remover → 200 com pendência "conta"', async () => { const m = montar({ deleteErro: { message: 'boom' } }); const x = await chamar(m, ok); return x.status === 200 && x.corpo.pendencias.join() === 'conta' && x.corpo.conta_removida === false; }],
  ['conta já inexistente ("not found") conta como removida', async () => { const m = montar({ deleteErro: { message: 'User not found' } }); const x = await chamar(m, ok); return x.status === 200 && x.corpo.conta_removida === true && x.corpo.pendencias.length === 0; }],
  ['motivo enorme é cortado em 500 caracteres', async () => { const m = montar(); await chamar(m, { ...ok, motivo: 'x'.repeat(5000) }); return m.deps.ultimoRpc.p_motivo.length === 500; }],
  ['corpo inválido → 400; método errado → 405', async () => { const m = montar(); const a = await chamar(m, 'não é json'); const b = await chamar(m, null, { metodo: 'GET' }); return a.status === 400 && b.status === 405; }],
];
let falhas = 0;
for (const [n, fn] of casos) { let ok2 = false; try { ok2 = await fn(); } catch (e) { console.log('   exceção:', e.message); } if (!ok2) falhas++; console.log(ok2 ? '✅' : '❌', n); }
console.log(falhas ? `\n${falhas} FALHA(S) na função de excluir` : `\nFUNÇÃO DE EXCLUIR OK: ${casos.length} de ${casos.length}`); process.exit(falhas ? 1 : 0);
