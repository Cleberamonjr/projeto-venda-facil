// Testa a função csp-report: registra o que interessa, NUNCA o segredo do convite, e não quebra com lixo.
import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
import { build } from 'esbuild';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = await build({ entryPoints: [path.join(raiz, 'supabase/functions/csp-report/index.ts')], bundle: true, format: 'esm', platform: 'node', write: false });
const arq = path.join(os.tmpdir(), 'fn-csp-' + Date.now() + '.mjs'); fs.writeFileSync(arq, r.outputFiles[0].text);
const { tratar } = await import(pathToFileURL(arq).href); fs.unlinkSync(arq);
const chamar = async (corpo, metodo = 'POST') => { const linhas = []; const res = await tratar(new Request('https://x/csp', { method: metodo, body: metodo === 'POST' ? (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)) : undefined }), (l) => linhas.push(l)); return { status: res.status, linhas }; };
const SEGREDO = 'SEGREDO_DO_CONVITE_1234567890abcdef';
const casos = [
  ['relatório no formato antigo: registra e tira o segredo da URL', async () => { const x = await chamar({ 'csp-report': { 'document-uri': `https://app.pages.dev/?beta=${SEGREDO}#frag`, 'violated-directive': 'img-src', 'blocked-uri': 'https://evil.com/x.png?token=abc', disposition: 'report' } });
    return x.status === 204 && x.linhas.length === 1 && x.linhas[0].includes('img-src') && x.linhas[0].includes('https://evil.com/x.png') && !x.linhas[0].includes(SEGREDO) && !x.linhas[0].includes('token=abc') && !x.linhas[0].includes('frag'); }],
  ['formato novo (lista): registra os campos certos', async () => { const x = await chamar([{ type: 'csp-violation', body: { documentURL: `https://app.pages.dev/?beta=${SEGREDO}`, effectiveDirective: 'connect-src', blockedURL: 'https://outro.com/api', disposition: 'enforce' } }]);
    return x.status === 204 && x.linhas.length === 1 && x.linhas[0].includes('connect-src') && !x.linhas[0].includes(SEGREDO); }],
  ['valores especiais (inline/eval) passam sem quebrar', async () => { const x = await chamar({ 'csp-report': { 'blocked-uri': 'inline', 'violated-directive': 'script-src' } }); return x.status === 204 && x.linhas[0].includes('"bloqueado":"inline"'); }],
  ['corpo que não é JSON → 204, nada registrado', async () => { const x = await chamar('isto não é json'); return x.status === 204 && x.linhas.length === 0; }],
  ['corpo gigante é cortado e não derruba', async () => { const x = await chamar('{"csp-report":{"blocked-uri":"' + 'a'.repeat(50000) + '"}}'); return x.status === 204 && x.linhas.length === 0; }],
  ['no máximo 5 relatórios por chamada', async () => { const x = await chamar(Array.from({ length: 20 }, () => ({ body: { blockedURL: 'x' } }))); return x.linhas.length === 5; }],
  ['método errado → 405; pré-verificação → 204', async () => { const a = await chamar(null, 'GET'); const b = await chamar(null, 'OPTIONS'); return a.status === 405 && b.status === 204; }],
];
let falhas = 0;
for (const [n, fn] of casos) { let ok = false; try { ok = await fn(); } catch (e) { console.log('   exceção:', e.message); } if (!ok) falhas++; console.log(ok ? '✅' : '❌', n); }
console.log(falhas ? `\n${falhas} FALHA(S) na função de relatórios` : `\nFUNÇÃO DE RELATÓRIOS OK: ${casos.length} de ${casos.length}`); process.exit(falhas ? 1 : 0);
