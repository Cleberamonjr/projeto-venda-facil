# Como publicar o Luxi sem quebrar quem está usando

## Requisito
Node 22 ou mais novo (o navegador simulado dos testes não roda em versões antigas; o `npm run publicar` avisa se for o caso).

## Regra única
Toda publicação passa por **um comando**, que constrói, testa e só então envia:

    DEPLOY_TOKEN=<token do repositório do site> npm run publicar -- "o que mudou, em uma frase"

Sem o `DEPLOY_TOKEN` ele faz só o ensaio (build + testes). Se qualquer teste falhar, **nada é enviado**.
Não suba arquivos direto no repositório do site: isso pula os testes.

## O que os testes garantem (tests/smoke.mjs)
Roda o app pronto num navegador simulado: build sem segredos · nenhuma variável/componente sumido · convite inválido não mostra cadastro ·
convite válido · login · internet ruim não trava a abertura · painel admin com dados reais ·
troca de senha (errada é recusada, certa é aceita) · aviso de versão nova · assistente do beta ·
envio de fotos (e foto preservada se o envio falhar) · cadastro pelo link sem pedir confirmação de e-mail ·
fornecedor ao incluir produto. Ao criar algo novo, **acrescente um teste**.

## Como a cliente recebe a atualização
A versão nova baixa em silêncio e **espera**. Aparece "Tem uma versão nova do Luxi · Atualizar".
Ela atualiza quando quiser (ou ao fechar e abrir o app). Nada recarrega no meio de uma venda.
Consequência: por alguns dias **convivem versões diferentes do app** — por isso a regra do banco abaixo.

## Mudou algo no servidor (funções em `supabase/functions/`)? Publique ANTES do app
As funções do servidor (ex.: `criar-conta-beta`) não vão junto com o site: são publicadas à parte no Supabase,
**antes** do app que as usa. Cada função tem seu teste em `tests/`. O app deve ter um caminho de reserva se a
função estiver fora do ar (foi assim no cadastro do beta).

## Mudou o banco? Regra: só ACRESCENTAR
1. Aplique o SQL **antes** de publicar o app que o usa.
2. Nunca renomeie nem apague coluna, tabela ou função que o app publicado usa. Crie uma **nova** ao lado
   (foi assim com `uso_lojas_luxi`, que não mexeu em `dados_admin_luxi`).
3. Só remova o antigo depois de ~2 semanas, quando ninguém mais usa a versão velha.
4. Guarde o SQL em `supabase/migrations/` com data no nome.

## Deu problema depois de publicar?
1. Cloudflare → Deployments → versão anterior → **Rollback** (1 clique, não perde nada).
2. Ou: `git revert <commit>` no repositório do site e enviar.
3. Versões boas ficam marcadas com tag `estavel-AAAA-MM-DD` nos dois repositórios.
Como nenhuma cliente é forçada a atualizar, quem ainda não tocou em "Atualizar" continua na versão boa.

## Segredos
Nunca no código nem no chat. Tokens colados em conversa devem ser revogados no mesmo dia.

## Acesso de suporte da administradora (ver a loja de uma cliente)
No painel **Uso do Luxi**, o botão "Ver loja e atividade" abre a loja da cliente em **somente leitura**.
Cada abertura é gravada em `auditoria_admin` (quem, qual loja, quando). A função `admin_ver_loja` só responde à
administradora e não devolve o código de convite das consultoras. Regra: **rode o SQL antes** de publicar o app que o usa
(`supabase/migrations/20260930_admin_ver_loja.sql`); sem ele, a tela avisa em vez de quebrar.
Alterações nos dados da cliente (correções) NÃO estão incluídas de propósito: exigem função própria, motivo e registro.

## Excluir clientes e acessos (somente administradora — IRREVERSÍVEL)
No modo observação (rodapé: "Excluir esta cliente e os dados dela…") ou em **Contas sem loja** → "Excluir…".
Segurança: o e-mail da conta precisa ser digitado e é conferido NO SERVIDOR; administradoras e a própria conta não podem ser
alvo; assinatura ativa exige confirmação extra; máx. 10 exclusões/hora; tudo grava no registro interno (o quê, quando, motivo).
Ordem: 1) banco numa transação só (ou apaga tudo ou nada) → 2) fotos/romaneios → 3) a conta de login. Se 2 ou 3 falharem,
os dados já saíram e a pessoa aparece em "Contas sem loja": basta excluir de novo.
NÃO são apagados: registros financeiros (obrigação fiscal), `pedidos-pdf` e o próprio registro interno de auditoria.
Antes de excluir há o botão "Baixar cópia dos dados" (arquivo JSON com dados pessoais: guardar com cuidado).
Peças que ficam na tela (janelas, botões flutuantes) devem ser desenhadas com `NoCorpo` (portal): o contêiner animado `.oja`
prende `position:fixed` e esconde a peça fora da janela.

## Regras de desenho do painel (lições de um defeito real no iPhone)
- Lista com ação = cartão em COLUNA (`.oj-linha` + `.oj-linha-topo` + `.oj-acoes`). NUNCA ponha `.oj-link-sutil` (largura 100%) ao lado
  de uma coluna flexível: a coluna colapsa (e-mail com 0 px de largura em 18 linhas). Texto longo usa `.oj-quebra` (overflow-wrap:anywhere), não `break-all`.
- Botões do painel: `.oj-bt` (mín. 44 px, foco visível). Perigo = `.oj-bt.perigo` / `.perigo-cheio`. Estado = `.oj-estado`. Cores de perigo por tema em `--perigo-*`.
- Tudo que fica fixo na tela (janelas, botões flutuantes) usa `NoCorpo` (portal). Campos com 16 px (senão o iPhone dá zoom).
- `tests/navegador/painel_celular.py` mede por código: borda, texto espremido, toque >= 44 px, contraste >= 4,5:1, rodapé da janela à vista
  (320/360/390/430 px x claro/escuro x 7 telas) e tem um AUTO-TESTE que injeta o defeito original e exige que seja acusado.
- Seções do painel: Lojas · Acessos · Suporte. O filtro de período não aparece no painel (ele não o usa).
