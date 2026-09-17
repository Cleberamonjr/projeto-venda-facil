# Plano de evolução — Luxi (revenda inteligente)

Diagnóstico do repo atual: `src/App.jsx` tem **7.177 linhas** e `src/dados.js` concentra `carregarTudo()`. Isso confirma exatamente o cenário do prompt: tudo monolítico e acoplado. Migrar tudo de uma vez nesse arquivo é arriscado — o plano abaixo usa migração incremental (strangler pattern), sem quebrar o app em produção.

## Ajustes que sugiro ao seu prompt original

1. **Não migrar tudo de uma vez.** Com 7k linhas em App.jsx, refatorar tudo num PR só é praticamente impossível de revisar/testar. Proposta: criar a nova árvore `src/app` + `src/features` **ao lado** do código atual, trocar apenas o router para apontar a Home nova para lá, e ir "puxando" cada tela para dentro de `features/` uma de cada vez. App.jsx vai encolhendo a cada PR até virar só bootstrap.
2. **`carregarTudo()` não pode ser removido no dia 1.** Outras telas hoje dependem dele. Faça a Home e a Lulu pararem de chamá-lo (usando RPC/views novas) mas deixe-o vivo para as telas ainda não migradas. Ele só morre quando a última feature for migrada.
3. **Lulu sem LLM no início é o caminho certo.** Comece com um `luluResponder(pergunta, contexto)` 100% de regras (usa o mesmo `insights/` da Home). Isso já entrega valor e depois você só troca o "motor" dentro da Edge Function sem tocar no frontend.
4. **Views/RPC no Supabase antes do frontend.** Sugiro criar 2-3 views/RPCs primeiro (ex: `resumo_financeiro(loja_id)`, `pecas_paradas(loja_id)`, `proxima_acao(loja_id)`) e só depois consumir na Home — evita Home leve "na prática, mas com select * escondido dentro de uma function".
5. **Feature flag simples** (`?home=v2` ou variável local) enquanto a Home nova convive com a antiga, para você comparar lado a lado antes de trocar de vez.

## Arquitetura de pastas (conforme solicitado)

```
src/
├── app/                  # providers, router, layout raiz
├── features/
│   ├── home/             # Home inteligente
│   ├── inventory/        # Estoque
│   ├── sales/            # Vendas
│   ├── clients/
│   ├── team/             # Maleta + Equipe
│   ├── insights/         # regras puras -> frases humanas
│   ├── lulu/             # Chat da Lulu
│   └── account/
├── services/             # dados.js (legado) + supabase.js + edgeFunctions.js
├── hooks/
├── components/ui/        # design system leve (Card, Button, Skeleton...)
└── utils/                # dinheiro em centavos, datas, formatação
```

## Fases de execução

**Fase 0 — Fundação (1 PR)**
- Criar `app/router.jsx`, `app/providers.jsx`, `components/ui/` (Card, Button, Skeleton com shimmer, EmptyState).
- Criar `services/supabaseClient.js` (se não existir) e `services/edgeFunctions.js` (chamada genérica para Edge Functions).
- Sem mudar nada visível ainda.

**Fase 1 — Módulo `insights/` (regras puras)**
- Funções puras: `getRecebiveisUrgentes()`, `getLucroPeriodo()`, `getPecasParadas()`, `getProximaAcao()`, cada uma recebendo dados já agregados (não a base inteira) e devolvendo `{ valor, frase, urgencia }`.
- Testável isoladamente, sem UI.

**Fase 2 — Home nova**
- RPC/views no Supabase para os 4 cards (a receber, lucro, peças paradas, próxima ação).
- Tela `features/home/Home.jsx` consumindo `insights/` + agregados leves.
- Empty state "Sua revenda ainda está começando...".
- Banner do plano Livre discreto (aparece só após 2-3 ações ou no fim da tela).
- Ligar via feature flag antes de virar a Home padrão.

**Fase 3 — Lulu (chat)**
- Botão flutuante + drawer/bottom-sheet em `features/lulu/`.
- Estado local com histórico limitado (10-15 msgs).
- Edge Function `lulu-responder`: recebe pergunta + contexto resumido (os mesmos agregados da Home) e devolve resposta. Sem chave de LLM: começa respondendo com as regras de `insights/` + respostas padrão empáticas. Trocar por Groq/Gemini depois é só mudar o corpo da function.
- Ponto rosa pulsante quando há insight novo (comparar timestamp do último insight visto, guardado em localStorage/estado da conta).

**Fase 4 — Migração das telas existentes**
- Uma feature por vez: Estoque → Vendas → Clientes → Equipe/Maleta → Conta.
- Cada uma sai de App.jsx, ganha `React.lazy` + `Suspense`, e passa a buscar seus próprios dados (sem `carregarTudo()`).
- App.jsx vai encolhendo a cada PR.

**Fase 5 — Navegação e linguagem**
- Menu lateral com rótulos humanos (trocar "Romaneio"→"Peças que chegaram", "Conselheiro"→"O que a Lulu recomenda hoje", "Maleta"→"O que está com quem").
- Revisar toda a UI removendo jargão de ERP (sistema, módulo, registro, lançamento).

**Fase 6 — LLM real na Lulu (opcional, quando houver chave)**
- Trocar o "motor" da Edge Function para Groq Llama 3.1/3.3 ou Gemini Flash, mantendo o mesmo contrato de entrada/saída — frontend não muda.

## Stack confirmada no repo

React 18 + Vite + `@supabase/supabase-js` (sem Tailwind/styled-components — CSS puro). Logo:
- Supabase já é a base de dados/backend → RPCs e Edge Functions são o caminho natural (Fase 6 usa Supabase Edge Functions por padrão, sem depender de Cloudflare).
- `components/ui/` será CSS puro (CSS Modules ou classes globais, seguindo o padrão já usado em App.css), sem introduzir nova lib de estilos.

## Decisão a confirmar com você

- Você prefere Supabase Edge Functions (mesmo provedor do banco, mais simples) ou Cloudflare Workers para a function da Lulu? Recomendo Supabase Edge Functions por já estar no stack.

## Próximo passo sugerido

Aprovar este plano (ou ajustar fases) e eu começo pela **Fase 0 + Fase 1**, que não alteram nada visível e são a base segura para tudo o resto.
