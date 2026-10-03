import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/*  ler-romaneio  (OpenAI / GPT-4o)
 *  Proxy de leitura de romaneio. A chave da OpenAI vive AQUI, nunca no navegador.
 *  Fluxo: valida sessao -> chama o modelo com a foto -> normaliza -> devolve JSON.
 *  A conferencia humana acontece no app: nada entra no estoque sem o usuario confirmar.
 *
 *  v7: alem de codigo/nome/qtd/custo, le banho, pedra, modelo (acabamento) e tamanho quando a
 *  descricao disser CLARAMENTE. Tudo e casado com as opcoes exatas do app (com acento); o que nao
 *  casar e descartado em vez de virar um campo vazio enganoso.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// Opcoes IGUAIS as do app (src/App.jsx). Mudou la, mude aqui.
const BANHOS = ["Ouro 24k", "Ouro 18k", "Ouro 10k", "Ouro rosé", "Ródio branco", "Ródio negro", "Prata 925"];
const PEDRAS = ["Sem pedra", "Zircônia", "Vidro", "Moissanite"];
const ACABAMENTOS = ["Lisa", "Cravejada", "Pérolas", "Acetinada", "Esmaltada", "Orgânica", "Minimalista", "Maximalista"];
const TAMANHOS = ["35cm", "40cm", "45cm", "50cm", "60cm", "70cm", "16cm", "18cm", "20cm", "25cm"];

const chave = (s: unknown) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "");
const casar = (valor: unknown, lista: string[]) => {
  const k = chave(valor);
  if (!k) return "";
  return lista.find((o) => chave(o) === k) ?? "";
};

const INSTRUCAO = `Voce le romaneios de semijoias (notas de pedido de fornecedor brasileiro).

Extraia TODOS os itens da tabela. Responda SOMENTE com JSON valido, sem markdown,
sem crases, sem texto antes ou depois.

Formato exato:
{"itens":[{"codigo":"","nome":"","qtd":0,"custo":0,"banho":"","pedra":"","acabamento":"","tamanho":"","confianca":"alta"}],"aviso":""}

Regras:
- codigo: a referencia da peca como esta escrita. Mantenha letras, numeros, hifens e pontos.
- nome: a descricao da peca. Se nao houver, use string vazia.
- qtd: quantidade como numero inteiro. Nunca invente: se ilegivel, use 0.
- custo: valor UNITARIO em reais como numero decimal com ponto. Se a linha so tiver total,
  divida pelo qtd. Converta "12,50" para 12.5. Se ilegivel, use 0.
- banho: preencha quando o romaneio OU a descricao da linha disser claramente o banho
  (ex.: "ouro 18k", "banho de ouro", "rodio negro", "prata 925", "rose"). Use exatamente um de:
  ${BANHOS.map((x) => `"${x}"`).join(", ")}. Se nao houver indicacao clara, string vazia.
  NUNCA deduza o banho pelo preco ou pelo tipo da peca.
- pedra: quando a descricao citar a pedra (zirconia, cristal, vidro, moissanite), use exatamente um de:
  ${PEDRAS.map((x) => `"${x}"`).join(", ")} ("cristal" conta como "Vidro"). Use "Sem pedra" somente se a
  linha disser "lisa", "sem pedra" ou equivalente. Na duvida, string vazia.
- acabamento: o modelo da peca, somente se a descricao disser claramente. Use exatamente um de:
  ${ACABAMENTOS.map((x) => `"${x}"`).join(", ")}. Caso contrario, string vazia.
- tamanho: medida escrita na linha, somente se for uma destas: ${TAMANHOS.map((x) => `"${x}"`).join(", ")}.
  Caso contrario, string vazia.
- confianca: "alta" quando todos os campos da linha estao nitidos, "baixa" quando voce
  precisou adivinhar codigo, nome, qtd ou custo. Banho/pedra/acabamento/tamanho vazios NAO baixam a confianca.
- aviso: string curta em portugues se a imagem estiver cortada, tremida, ilegivel em parte,
  ou se parecer nao ser um romaneio. Caso contrario, string vazia.
- NUNCA invente linhas que nao existem. Preferir devolver menos itens a inventar dados.
- Ignore cabecalhos, rodapes, totais gerais, dados do fornecedor e condicoes de pagamento.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "Metodo nao permitido" }, 405);

  const inicio = Date.now();

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) return json({ erro: "Sessao ausente. Entre novamente." }, 401);

    const body = await req.json().catch(() => null);
    if (!body?.arquivo || !body?.tipo)
      return json({ erro: "Envie o arquivo do romaneio." }, 400);

    const { arquivo, tipo } = body as { arquivo: string; tipo: string };

    if (arquivo.length > 8_000_000)
      return json(
        { erro: "Arquivo muito grande. Tire a foto com qualidade media." },
        413,
      );

    const chaveOpenAI = Deno.env.get("OPENAI_API_KEY");
    if (!chaveOpenAI)
      return json(
        { erro: "Servico de leitura indisponivel. Tente cadastrar manualmente." },
        503,
      );

    const dataUrl = `data:${tipo || "image/jpeg"};base64,${arquivo}`;

    const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${chaveOpenAI}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: INSTRUCAO },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia os itens deste romaneio." },
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
            ],
          },
        ],
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      console.error("openai", resposta.status, detalhe.slice(0, 500));
      const msg =
        resposta.status === 429
          ? "Muitas leituras ao mesmo tempo. Tente em alguns segundos."
          : "Nao consegui ler agora. Tente de novo ou cadastre manualmente.";
      return json({ erro: msg }, 502);
    }

    const data = await resposta.json();
    const texto = (data.choices?.[0]?.message?.content ?? "")
      .replace(/```json|```/g, "")
      .trim();

    let extraido: { itens?: unknown[]; aviso?: string };
    try {
      extraido = JSON.parse(texto);
    } catch {
      const m = texto.match(/\{[\s\S]*\}/);
      if (!m)
        return json(
          { erro: "Nao consegui entender este romaneio. Cadastre manualmente." },
          422,
        );
      try {
        extraido = JSON.parse(m[0]);
      } catch {
        return json(
          { erro: "Nao consegui entender este romaneio. Cadastre manualmente." },
          422,
        );
      }
    }

    const brutos = Array.isArray(extraido.itens) ? extraido.itens : [];
    const num = (v: unknown) => {
      const n = Number(String(v ?? "").replace(",", "."));
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };

    const itens = brutos
      .map((raw) => {
        const i = raw as Record<string, unknown>;
        const codigo = String(i.codigo ?? "").trim().slice(0, 40);
        const qtd = Math.round(num(i.qtd));
        const custo = Math.round(num(i.custo) * 100) / 100;
        return {
          codigo,
          nome: String(i.nome ?? "").trim().slice(0, 120),
          qtd,
          custo,
          // so vale o que casa com as opcoes do app; o resto vira "Nao informar" (nunca um valor torto)
          banho: casar(i.banho, BANHOS),
          pedra: casar(i.pedra, PEDRAS),
          acabamento: casar(i.acabamento, ACABAMENTOS),
          tamanho: casar(i.tamanho, TAMANHOS),
          revisar: i.confianca === "baixa" || !codigo || qtd <= 0 || custo <= 0,
        };
      })
      .filter((i) => i.codigo || i.nome);

    if (!itens.length)
      return json(
        {
          erro:
            "Nao encontrei itens neste romaneio. Tente uma foto mais reta e iluminada.",
        },
        422,
      );

    const uso = data.usage ?? {};
    const custoUsd =
      ((uso.prompt_tokens ?? 0) / 1e6) * 2.5 +
      ((uso.completion_tokens ?? 0) / 1e6) * 10;

    return json({
      itens,
      aviso: String(extraido.aviso ?? ""),
      revisar: itens.filter((i) => i.revisar).length,
      diagnostico: {
        ms: Date.now() - inicio,
        tokens_entrada: uso.prompt_tokens ?? 0,
        tokens_saida: uso.completion_tokens ?? 0,
        custo_usd: Math.round(custoUsd * 10000) / 10000,
      },
    });
  } catch (e) {
    console.error("erro", e);
    return json(
      { erro: "Erro inesperado. Tente de novo ou cadastre manualmente." },
      500,
    );
  }
});
