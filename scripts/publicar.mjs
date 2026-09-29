// Publica o Luxi SOMENTE se o build e todos os testes passarem.
//
//   npm run publicar -- "o que mudou, em uma frase"                 → ensaio (não envia nada)
//   DEPLOY_TOKEN=... npm run publicar -- "o que mudou"             → ensaio + envio + conferência
//
// Nunca apaga histórico (commit normal, sem force): qualquer versão anterior pode ser recuperada.
import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_SITE = process.env.DEPLOY_REPO || 'Cleberamonjr/organize-jewelry-app';
const token = process.env.DEPLOY_TOKEN || '';
const mensagem = process.argv.slice(2).join(' ').trim() || 'Atualização do Luxi';

if (Number(process.versions.node.split('.')[0]) < 22) {
  console.error(`\n⛔ Use o Node 22 ou mais novo (este é o ${process.versions.node}). Os testes usam um navegador simulado que não roda em versões antigas.\n   NADA foi publicado.`);
  process.exit(1);
}
const passo = (t) => console.log('\n▶ ' + t);
const falhar = (t) => { console.error('\n⛔ ' + t + '\n   NADA foi publicado.'); process.exit(1); };
const rodar = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: raiz, stdio: 'inherit', ...opts });

passo('1/4 Construindo o app');
if (rodar('npm', ['run', 'build']).status !== 0) falhar('O build falhou.');

passo('2/4 Rodando os testes');
for (const f of fs.readdirSync(path.join(raiz, 'tests')).filter((x) => /^funcao-.*\.mjs$/.test(x)).sort()) {
  if (rodar('node', ['tests/' + f]).status !== 0) falhar(`A função de servidor "${f.replace(/^funcao-|\.mjs$/g, '')}" falhou nos testes.`);
}
if (rodar('node', ['tests/smoke.mjs']).status !== 0) falhar('Algum teste falhou — corrija antes de publicar.');

const dist = path.join(raiz, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) falhar('dist/index.html não existe.');

if (!token) {
  console.log('\n✔ Ensaio concluído: build e testes passaram. Nada foi enviado (falta DEPLOY_TOKEN).');
  process.exit(0);
}

// Autenticação por cabeçalho (o token não fica gravado na URL nem aparece em mensagens de erro).
const auth = 'Authorization: Basic ' + Buffer.from('x-access-token:' + token).toString('base64');
const git = (args, cwd) => execFileSync('git', ['-c', 'http.extraheader=' + auth, ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

passo('3/4 Enviando para o site');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'luxi-site-'));
try {
  git(['clone', '--quiet', `https://github.com/${REPO_SITE}.git`, tmp]);
  for (const f of fs.readdirSync(tmp)) if (f !== '.git') fs.rmSync(path.join(tmp, f), { recursive: true, force: true });
  fs.cpSync(dist, tmp, { recursive: true });
  fs.copyFileSync(path.join(tmp, 'index.html'), path.join(tmp, '404.html'));
  fs.writeFileSync(path.join(tmp, '.nojekyll'), '');
  git(['config', 'user.email', 'luxi-dev@users.noreply.github.com'], tmp);
  git(['config', 'user.name', 'Luxi dev'], tmp);
  git(['add', '-A'], tmp);
  if (!git(['status', '--porcelain'], tmp)) { console.log('Nada mudou em relação ao que já está no ar.'); process.exit(0); }
  let fonte = 'local';
  try { fonte = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: raiz, encoding: 'utf8' }).trim(); } catch (_) {}
  git(['commit', '--quiet', '-m', `${mensagem} (fonte ${fonte})`], tmp);
  git(['push', '--quiet', 'origin', 'HEAD:main'], tmp);
  const sha = git(['rev-parse', 'HEAD'], tmp);
  console.log('Enviado: ' + sha.slice(0, 7));

  passo('4/4 Esperando o Cloudflare confirmar');
  let resultado = 'sem resposta';
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 10000));
    const r = await fetch(`https://api.github.com/repos/${REPO_SITE}/commits/${sha}/check-runs`, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' } });
    const cf = ((await r.json()).check_runs || []).find((c) => /Cloudflare/i.test(c.app?.name || ''));
    if (cf?.status === 'completed') { resultado = cf.conclusion === 'success' ? 'ok' : 'falhou'; break; }
  }
  if (resultado === 'ok') console.log('\n✔ NO AR. O Cloudflare confirmou "Deployed successfully". Quem está usando recebe a faixa "Atualizar".');
  else {
    console.error(`\n⛔ O Cloudflare NÃO confirmou (${resultado}).\n   Para voltar: no painel do Cloudflare → Deployments → escolha o anterior → "Rollback";\n   ou rode: git revert ${sha.slice(0, 7)} no repositório ${REPO_SITE} e envie.`);
    process.exit(1);
  }
} catch (e) {
  falhar('Erro ao enviar: ' + String(e.message || e).replaceAll(token, '***').split('\n')[0]);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
