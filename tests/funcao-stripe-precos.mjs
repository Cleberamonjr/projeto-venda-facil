// Preços de cobrança decididos no servidor: precisam bater com os da tela (Solo 69,90 / Equipe 129,90; anual = 12 meses com 5% off).
import fs from 'fs';
const src = fs.readFileSync('supabase/functions/stripe-assinar/index.ts', 'utf8');
const bloco = src.slice(src.indexOf('// <<precos'), src.indexOf('// precos>>'));
const { PRECOS, centavosAnual } = new Function(bloco + '\nreturn { PRECOS, centavosAnual };')();
const app = fs.readFileSync('src/App.jsx', 'utf8');
let ok = 0; const falhas = []; const t = (c, m) => (c ? ok++ : falhas.push(m));
t(PRECOS.inicio.mensal === 6990 && PRECOS.crescimento.mensal === 12990, 'mensal: Solo 69,90 e Equipe 129,90');
t(centavosAnual(6990) === 79686 && centavosAnual(12990) === 148086, 'anual: Solo R$ 796,86 e Equipe R$ 1.480,86 (5% off)');
t(!PRECOS.joalheria && !PRECOS.inteligencia && !PRECOS.controle && !PRECOS.livre, 'planos "em breve", legado e livre NÃO são vendáveis');
// confere com a tabela da tela
for (const [id, valor] of [['inicio', '69.9'], ['crescimento', '129.9']]) {
  const re = new RegExp(`id: "${id}",[\\s\\S]{0,400}?valor: ${valor.replace('.', '\\.')},`);
  t(re.test(app), `a tela mostra ${id} por R$ ${valor}`);
}
t(/mensal \* 12 \* 0\.95/.test(app), 'a tela calcula o anual como 12 meses com 5% de desconto');
console.log(falhas.length ? `PREÇOS: ${falhas.length} FALHA(S)\n- ` + falhas.join('\n- ') : `PREÇOS DA COBRANÇA OK: ${ok} de ${ok}`);
process.exit(falhas.length ? 1 : 0);
