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
