/* ============================================================
   Conteúdo da Ajuda da Luxi: lições práticas, perguntas do dia a dia e mensagens do dia.
   Escrito para quem nunca usou o sistema: frases curtas, palavras do dia a dia, um passo por vez.
   Só prometa aqui botões que EXISTEM no app (os "alvo" são procurados pelo texto na tela;
   se um não for encontrado, a lição continua e apenas não destaca nada).
   ============================================================ */

/* Cada passo: fala (o que fazer, em uma frase), detalhe (o porquê / como), aba (leva a pessoa até a tela),
   alvo (texto do botão a destacar), dentro (onde procurar o botão, opcional). */
export const LICOES = [
  {
    id: "peca",
    titulo: "Cadastrar uma peça",
    resumo: "Colocar uma joia no seu estoque.",
    minutos: 3,
    passos: [
      { aba: "estoque", fala: "Vamos até as suas peças.", detalhe: "Toque em “Peças”, no alto da tela. É onde ficam todas as suas joias.", alvo: ["Peças"], dentro: ".oj-atalhos" },
      { aba: "estoque", fala: "Toque em “+ Cadastrar produto”.", detalhe: "Vai abrir uma ficha para você preencher.", alvo: ["Cadastrar produto"] },
      { fala: "Preencha a ficha.", detalhe: "Código (o número da etiqueta), nome da peça, quantas você tem, quanto pagou e por quanto vai vender. Se não souber algum, pode deixar em branco e voltar depois." },
      { fala: "Coloque uma foto da peça.", detalhe: "Toque no quadrado de foto. Sem foto, a peça não aparece na sua loja on-line, então vale a pena." },
      { fala: "Toque em “Salvar”.", detalhe: "Pronto! A peça já está no seu estoque.", alvo: ["Salvar"] },
    ],
  },
  {
    id: "romaneio",
    titulo: "Cadastrar várias peças de uma vez",
    resumo: "Tirar foto da nota do fornecedor e deixar a Luxi ler.",
    minutos: 4,
    passos: [
      { aba: "estoque", fala: "Vamos até as suas peças.", detalhe: "Toque em “Peças”, no alto da tela.", alvo: ["Peças"], dentro: ".oj-atalhos" },
      { aba: "estoque", fala: "Toque em “Importar romaneio”.", detalhe: "Romaneio é a nota ou lista que o seu fornecedor entrega com as peças.", alvo: ["Importar romaneio"] },
      { fala: "Tire uma foto da nota, ou escolha um arquivo.", detalhe: "Deixe a folha reta e bem iluminada. Também pode enviar um PDF." },
      { fala: "Espere a Luxi ler.", detalhe: "Leva alguns segundos. Ela escreve o código, o nome, a quantidade e o custo de cada peça." },
      { fala: "Confira com calma.", detalhe: "O preço de venda já vem calculado com a sua margem. Se algo estiver errado, é só corrigir ali mesmo. A Luxi nunca salva nada sem você confirmar." },
      { fala: "Toque para confirmar.", detalhe: "As peças entram no estoque. Depois, ponha foto em cada uma." },
    ],
  },
  {
    id: "foto",
    titulo: "Colocar foto nas peças",
    resumo: "A foto é o que põe a peça na sua loja on-line.",
    minutos: 2,
    passos: [
      { fala: "Abra o menu.", detalhe: "Toque nas três linhas, no canto de cima.", alvo: ["Abrir menu", "Menu"], dentro: "header, .oj-top" },
      { fala: "Toque em “Loja on-line”.", detalhe: "É a sua vitrine para as clientes.", alvo: ["Loja on-line"] },
      { fala: "Procure “Peças sem foto”.", detalhe: "Essa lista mostra as peças que ainda não aparecem para as clientes." },
      { fala: "Toque em “Adicionar foto” e tire a foto.", detalhe: "Faça uma peça de cada vez. A foto sobe sozinha.", alvo: ["Adicionar foto"] },
    ],
  },
  {
    id: "venda",
    titulo: "Registrar uma venda",
    resumo: "Dar baixa na peça e guardar quanto você recebeu.",
    minutos: 3,
    passos: [
      { fala: "Toque em “Vender”.", detalhe: "É o botão grande que fica sempre no alto da tela.", alvo: ["Vender"] },
      { fala: "Escolha a peça que você vendeu.", detalhe: "Pode procurar pelo nome ou pelo código." },
      { fala: "Diga como a cliente pagou.", detalhe: "Dinheiro, débito ou crédito: ela pagou na hora. “Na confiança”: ela vai pagar depois, e a Luxi guarda o lembrete de cobrar." },
      { fala: "Confira o valor e toque para registrar.", detalhe: "A peça sai do estoque sozinha e a venda aparece na tela “Vendas”." },
    ],
  },
  {
    id: "loja",
    titulo: "Abrir a loja on-line e mandar para uma cliente",
    resumo: "Um link só, e a cliente escolhe sozinha.",
    minutos: 3,
    passos: [
      { fala: "Abra o menu e toque em “Loja on-line”.", detalhe: "As três linhas ficam no canto de cima.", alvo: ["Loja on-line"] },
      { fala: "Toque em “Abrir minha loja on-line”.", detalhe: "Se pedir o seu WhatsApp, escreva com o DDD. É para onde chegam os pedidos.", alvo: ["Abrir minha loja on-line"] },
      { fala: "Copie o seu link.", detalhe: "Toque em “Copiar link”. Esse endereço é a sua loja.", alvo: ["Copiar link"] },
      { fala: "Ou envie direto no WhatsApp.", detalhe: "Escreva o telefone da cliente e toque em “Enviar no WhatsApp”.", alvo: ["Enviar no WhatsApp"] },
    ],
  },
  {
    id: "pedido",
    titulo: "Quando a cliente faz um pedido",
    resumo: "Ver o pedido e transformar em venda.",
    minutos: 3,
    passos: [
      { fala: "Abra a tela “Loja on-line” e toque em “Ver pedidos”.", detalhe: "Os pedidos das clientes aparecem ali, com o nome e o WhatsApp dela.", alvo: ["Ver pedidos"] },
      { fala: "Fale com a cliente.", detalhe: "Toque em “Chamar no WhatsApp” para combinar entrega e pagamento.", alvo: ["Chamar no WhatsApp"] },
      { fala: "Combinado? Toque em “Confirmar venda”.", detalhe: "Confira o valor de cada peça e registre. O pedido vira venda e a peça sai do estoque.", alvo: ["Confirmar venda"] },
      { fala: "Se a cliente desistiu, toque em “Cancelar pedido”.", detalhe: "As peças voltam a aparecer na loja.", alvo: ["Cancelar pedido"] },
    ],
  },
  {
    id: "cliente",
    titulo: "Cadastrar uma cliente",
    resumo: "Guardar quem compra de você.",
    minutos: 2,
    passos: [
      { aba: "clientes", fala: "Toque em “Clientes”.", detalhe: "No alto da tela, ao lado de Vendas.", alvo: ["Clientes"], dentro: ".oj-atalhos" },
      { aba: "clientes", fala: "Procure “Nova cliente”.", detalhe: "Escreva o nome e o WhatsApp dela.", alvo: ["Nova cliente"] },
      { fala: "Salve.", detalhe: "Nas próximas vendas, é só escolher o nome dela." },
    ],
  },
  {
    id: "fiado",
    titulo: "Vender na confiança e cobrar depois",
    resumo: "Não esquecer quem ficou de pagar.",
    minutos: 3,
    passos: [
      { fala: "Registre a venda normalmente.", detalhe: "Toque em “Vender”, escolha a peça e, na forma de pagamento, escolha “Na confiança”.", alvo: ["Vender"] },
      { aba: "clientes", fala: "Quando ela pagar, abra “Clientes”.", detalhe: "Ali ficam as vendas que ainda não foram pagas.", alvo: ["Clientes"], dentro: ".oj-atalhos" },
      { fala: "Marque como pago.", detalhe: "Procure a venda da cliente e toque em quitar. A Luxi guarda o recebimento." },
    ],
  },
];

/* Perguntas do dia a dia. "licao" abre a lição; "ir" leva até a tela; "aba" diz em que tela a pergunta é mais útil. */
export const PERGUNTAS = [
  { q: "Como cadastro uma peça?", palavras: "cadastrar peca produto novo estoque adicionar", passos: ["Toque em “Peças”, no alto da tela.", "Toque em “+ Cadastrar produto”.", "Preencha a ficha e coloque uma foto.", "Toque em “Salvar”."], licao: "peca", aba: "estoque" },
  { q: "Como cadastro muitas peças de uma vez?", palavras: "romaneio nota fornecedor importar varias foto pdf", passos: ["Em “Peças”, toque em “Importar romaneio”.", "Tire uma foto da nota do fornecedor, ou escolha um arquivo.", "Confira o que a Luxi leu e corrija se precisar.", "Confirme. As peças entram no estoque."], licao: "romaneio", aba: "estoque" },
  { q: "Como coloco foto numa peça?", palavras: "foto fotografar imagem camera sem foto", passos: ["Abra o menu e toque em “Loja on-line”.", "Procure “Peças sem foto”.", "Toque em “Adicionar foto” na peça e tire a foto."], licao: "foto" },
  { q: "Por que a minha peça não aparece na loja on-line?", palavras: "nao aparece loja online vitrine sumiu peca foto estoque", passos: ["A peça precisa ter foto. Sem foto ela fica escondida.", "Ela precisa ter pelo menos 1 em estoque.", "Se acabou de publicar a loja, toque em “Publicar mudanças”.", "Veja em “Peças sem foto” quais faltam."], licao: "foto" },
  { q: "Como registro uma venda?", palavras: "vender venda registrar baixa vendi", passos: ["Toque em “Vender”, no alto da tela.", "Escolha a peça.", "Escolha como a cliente pagou.", "Confira o valor e registre."], licao: "venda" },
  { q: "A cliente vai pagar depois. O que eu faço?", palavras: "fiado confianca depois cobrar pagar receber dever", passos: ["Ao vender, escolha a forma “Na confiança”.", "Quando ela pagar, vá em “Clientes”.", "Encontre a venda dela e marque como paga."], licao: "fiado", aba: "clientes" },
  { q: "Como mando a minha loja para uma cliente?", palavras: "link loja online enviar whatsapp mandar cliente compartilhar", passos: ["Abra o menu e toque em “Loja on-line”.", "Se ainda não abriu, toque em “Abrir minha loja on-line”.", "Toque em “Copiar link” ou em “Enviar no WhatsApp”."], licao: "loja" },
  { q: "A cliente fez um pedido. E agora?", palavras: "pedido cliente confirmar cancelar entrega loja online", passos: ["Abra “Loja on-line” e toque em “Ver pedidos”.", "Fale com a cliente pelo botão do WhatsApp.", "Combinado? Toque em “Confirmar venda”."], licao: "pedido" },
  { q: "Como cadastro uma cliente?", palavras: "cliente cadastrar nova telefone", passos: ["Toque em “Clientes”.", "Procure “Nova cliente”.", "Escreva o nome e o WhatsApp e salve."], licao: "cliente", aba: "clientes" },
  { q: "Como mudo o preço de uma peça?", palavras: "preco valor mudar alterar editar venda", passos: ["Toque em “Peças”.", "Toque na peça que quer mudar.", "Corrija o preço de venda e salve."], aba: "estoque" },
  { q: "O que é margem?", palavras: "margem lucro percentual quanto ganho", passos: ["É quanto você ganha em cima do que pagou.", "Exemplo: pagou R$ 10 e vende por R$ 25. Você ganhou R$ 15.", "Ao importar um romaneio, a Luxi já calcula o preço de venda com a sua margem."] },
  { q: "Como aumento o tamanho da letra?", palavras: "letra aumentar tamanho fonte grande ler", passos: ["Toque no botão com a letra “A”, no canto da tela.", "Toque no “A” grande para aumentar, ou no pequeno para diminuir."] },
  { q: "Como vejo quanto vendi?", palavras: "quanto vendi vendas resultado total mes lucro", passos: ["Toque em “Início” para ver o resumo.", "Toque em “Vendas” para ver cada venda.", "O filtro no alto troca o período: 7 dias, este mês ou tudo."], aba: "painel" },
  { q: "Quero falar com uma pessoa", palavras: "falar pessoa suporte atendimento humano problema erro", passos: ["Toque no botão verde “Falar com a gente no WhatsApp”, aqui embaixo.", "Conte o que aconteceu. Se puder, mande uma foto da tela."], suporte: true },
];

/* Mensagens do dia: uma por dia, na primeira abertura. Calmas, sem cobrança, sem promessa. */
export const MENSAGENS_DO_DIA = [
  "O que você construiu até aqui foi feito com as suas mãos, peça por peça. Isso merece respeito, a começar pelo seu.",
  "Você não precisa dar conta de tudo hoje. Faça a próxima coisa bem feita, e já é muito.",
  "Cada cliente que confia em você enxerga o cuidado que você tem. Esse cuidado é o seu diferencial.",
  "Ter um negócio seu é coragem de todo dia. Hoje, repare no quanto você já andou.",
  "Descansar também é trabalhar pelo seu negócio. Cuide de você com a mesma atenção que cuida das suas clientes.",
  "Seu tempo vale. Cobrar o que o seu trabalho vale não é pedir demais, é ser justa com você.",
  "Nem todo dia vai ser de muitas vendas, e tudo bem. O que você planta com constância aparece.",
  "Você aprende o que precisa, no seu ritmo. Ninguém nasce sabendo mexer em tudo, e você já está aqui.",
  "Uma joia bonita faz alguém se sentir vista. Você faz isso por muitas mulheres, todos os dias.",
  "Organizar o seu dinheiro é uma forma de liberdade. Cada registro de hoje é um passo para ela.",
  "Peça ajuda quando precisar. Pedir ajuda é inteligência, não fraqueza.",
  "Hoje, escolha uma coisa pequena para resolver. Pequenas vitórias seguidas viram grandes mudanças.",
  "Você é a pessoa que mais conhece o seu negócio. Confie no seu olhar.",
  "Comemore o que deu certo, mesmo que pareça pouco. Foi você que fez acontecer.",
  "Dizer “não” também faz parte de crescer. Proteger o seu tempo é proteger o seu negócio.",
  "Mulheres que empreendem sustentam famílias, sonhos e bairros inteiros. O seu trabalho importa de verdade.",
  "Um passo de cada vez ainda é caminhar. Não se compare com o ritmo de ninguém.",
  "Respire fundo antes de começar. Um dia calmo rende mais do que um dia corrido.",
  "As suas clientes voltam porque são bem tratadas. Isso não se aprende em curso, é seu.",
  "Errar faz parte. O que importa é que você continua tentando, e isso já te diferencia.",
  "Você merece ver o seu esforço virar resultado. Registrar as vendas é o primeiro passo para enxergar isso.",
  "Não deixe para depois o que cabe em cinco minutos. Tirar da frente também alivia a cabeça.",
  "A sua história com esse negócio está só começando um novo capítulo. Escreva-o do seu jeito.",
  "Valorize quem caminha com você: família, amigas, clientes. E valorize a mulher que lidera tudo isso: você.",
  "Hoje pode ser o dia de organizar aquela gaveta, aquela lista, aquela ideia. Comece pelo que for mais leve.",
  "Beleza que vende é beleza que você escolhe com carinho. Seu gosto é um talento.",
  "Você não precisa ser perfeita para ser incrível. Feito com cuidado já está ótimo.",
  "Confie no processo e cuide dos detalhes. É assim que um negócio pequeno fica grande.",
  "Se o dia estiver pesado, faça o mínimo e guarde força para amanhã. Amanhã você tem outra chance.",
  "Você chegou até aqui. Isso já diz muito sobre a sua força.",
  "Aprender uma coisa nova por semana, em um ano, é muita coisa. Hoje é um bom dia para a de hoje.",
];

/* Uma mensagem por dia, sempre a mesma no mesmo dia. */
export function mensagemDeHoje(data = new Date()) {
  const dias = Math.floor(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()) / 86400000);
  return MENSAGENS_DO_DIA[dias % MENSAGENS_DO_DIA.length];
}

const ELOGIOS = [
  "Você está no comando",
  "Que olhar de dona",
  "Seu cuidado aparece",
  "Você faz isso com brilho",
  "Que presença",
  "Você sabe o que a loja precisa",
  "Isso aqui tem a sua marca",
  "Você conduz com leveza",
];

/* Elogio do dia, o mesmo o dia inteiro. Sem bom dia, boa tarde ou boa noite. */
export function saudacao(data = new Date()) {
  const dias = Math.floor(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()) / 86400000);
  return ELOGIOS[dias % ELOGIOS.length];
}

export const hojeChave = (data = new Date()) =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;

/* busca de dúvida: ignora acento e maiúscula; conta quantas palavras da pessoa batem */
export const semAcento = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function buscarPerguntas(texto, lista = PERGUNTAS) {
  const termos = semAcento(texto).split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
  if (!termos.length) return [];
  return lista
    .map((p) => {
      // a palavra na própria pergunta vale mais do que nas palavras-chave escondidas
      const na = semAcento(p.q), nas = semAcento(p.palavras);
      const pontos = termos.reduce((n, t) => n + (na.includes(t) ? 3 : nas.includes(t) ? 1 : 0), 0);
      return { p, pontos };
    })
    .filter((x) => x.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos)
    .map((x) => x.p);
}
