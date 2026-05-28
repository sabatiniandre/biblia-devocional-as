export interface FallbackDictEntry {
  word: string;
  definition: string;
  usage: string;
}

export const DICTIONARY_FALLBACKS: Record<string, FallbackDictEntry> = {
  "salvacao": {
    word: "Salvação",
    definition: "Do latim salvatio. No contexto teológico e bíblico, refere-se ao livramento espiritual da condenação do pecado, da morte eterna e da separação de Deus. É realizada por meio da graça divina através da fé no sacrifício vicário de Jesus Cristo na cruz e Sua ressurreição. A salvação abrange três momentos: a justificação (passado), a santificação (presente) e a glorificação (futuro).",
    usage: "Substantivo Feminino. Uso central na Soteriologia. Ex: 'Porque a graça de Deus se há manifestado, trazendo salvação a todos os homens' (Tito 2:11)."
  },
  "fe": {
    word: "Fé",
    definition: "Do grego 'pistis' (πίστις) e hebraico 'emunah' (אֱמוּנָה). Confiança irrestrita, certeza e convicção firme na verdade revelada de Deus, nas Suas promessas e no Seu caráter imutável. Não é apenas mero assentimento intelectual, mas sim uma entrega prática e ativa da vontade humana à soberania divina.",
    usage: "Substantivo Feminino. Ex: 'Ora, a fé é a certeza de coisas que se esperam, a convicção de fatos que se não veem' (Hebreus 11:1)."
  },
  "graca": {
    word: "Graça",
    definition: "Do grego 'charis' (χάρις) e hebraico 'chen' (חֵן). O imerecido favor divino concedido benevolentemente ao ser humano necessitado de salvação. Reflete a iniciativa amorosa de Deus em reconciliar consigo a humanidade decaída, provendo a redenção sem que o homem tenha qualquer mérito próprio ou capacidade de alcançá-la por obras.",
    usage: "Substantivo Feminino. Ex: 'Porque pela graça sois salvos, mediante a fé; e isto não vem de vós, é dom de Deus' (Efésios 2:8)."
  },
  "amor": {
    word: "Amor",
    definition: "Do grego 'agape' (ἀγάπη). O mais sublime atributo do caráter de Deus (pois 'Deus é amor') e o principal mandamento da ética bíblica. Caracteriza-se como um amor de escolha, incondicional, sacrificial, ativo e voluntário, que busca o bem-estar transcendente do outro independentemente de reciprocidade ou valor do destinatário.",
    usage: "Substantivo Masculino. Ex: 'Nisto consiste o amor: não em que nós tenhamos amado a Deus, mas em que ele nos amou...' (1 João 4:10)."
  },
  "pecado": {
    word: "Pecado",
    definition: "Do grego 'hamartia' (ἁμαρτία - errar o alvo) e hebraico 'chattah' (חַטָּאָה). Qualquer falta de conformidade de pensamento, palavra, desejo ou ação em relação à perfeita lei e santidade moral de Deus. O pecado produz a separação espiritual entre o homem e o Criador, trazendo ruína física, moral e condenação eterna.",
    usage: "Substantivo Masculino. Uso na Hamartiologia. Ex: 'Porque o salário do pecado é a morte, mas o dom gratuito de Deus é a vida eterna...' (Romanos 6:23)."
  },
  "justificacao": {
    word: "Justificação",
    definition: "Ato judicial e declaratório de Deus pelo qual Ele, com base nos méritos puríssimos e justiça imputada de Cristo, perdoa todos os pecados do homem arrependido e o declara totalmente justo diante do Seu tribunal. É um status legal definitivo concedido gratuitamente aos que exercem a fé salvadora.",
    usage: "Substantivo Feminino. Ex: 'Justificados, pois, mediante a fé, temos paz com Deus por meio de nosso Senhor Jesus Cristo' (Romanos 5:1)."
  },
  "santificacao": {
    word: "Santificação",
    definition: "O processo contínuo, dinâmico e progressivo operado pelo Espírito Santo no crente justificado, capacitando-o a separar-se do pecado e do sistema corrompido do mundo, sendo transformado moralmente conforme a imagem perfeita de Jesus Cristo. Exige a cooperação do crente por meio da obediência à Palavra de Deus.",
    usage: "Substantivo Feminino. Ex: 'Segui a paz com todos e a santificação, sem a qual ninguém verá o Senhor' (Hebreus 12:14)."
  },
  "misericordia": {
    word: "Misericórdia",
    definition: "Do latim miseri (miserável) + cor (coração). A compaixão activa de Deus que retém o juízo ou a punição perfeitamente merecidos pelo pecador. Enquanto a graça dá ao homem o que ele não merece (salvação), a misericórdia não lhe dá o castigo severo que ele de fato merece.",
    usage: "Substantivo Feminino. Ex: 'As misericórdias do Senhor são a causa de não sermos consumados, porque as suas compaixões não têm fim' (Lamentações 3:22)."
  },
  "alianca": {
    word: "Aliança",
    definition: "Do hebraico 'berith' (בְּרִית) e grego 'diatheke' (διαθήκη). Pacto moral solene, soberano e pactual estabelecido por Deus com a humanidade ou com indivíduos específicos. Define as bases de relacionamento, promessas divinas de bênção, juramentos e obrigações espirituais selados com sangue (como na Antiga e na Nova Aliança em Cristo).",
    usage: "Substantivo Feminino. Ex: 'Este é o cálice da nova aliança no meu sangue, derramado em favor de vós' (Lucas 22:20)."
  },
  "arrependimento": {
    word: "Arrependimento",
    definition: "Do grego 'metanoia' (μετάνοια). Mudança profunda de mente, atitude, afeições e direção de vida em relação ao pecado e a Deus. Envolve o reconhecimento sincero da culpa moral, tristeza genuína pelo pecado cometido e uma conversão ativa para buscar a justiça de Deus em obediência prática.",
    usage: "Substantivo Masculino. Ex: 'Arrependei-vos, pois, e convertei-vos para serem cancelados os vossos pecados' (Atos 3:19)."
  },
  "regeneracao": {
    word: "Regeneração",
    definition: "O ato milagroso e soberano do Espírito Santo pelo qual Ele infunde uma nova vida espiritual na alma outrora morta espiritualmente em delitos e pecados. É o 'novo nascimento', a transição radical das trevas para a luz que capacita a pessoa a crer, amar a Deus e andar em novidade de vida.",
    usage: "Substantivo Feminino. Ex: 'Não por obras de justiça que praticássemos, mas segundo a sua misericórdia, ele nos salvou mediante o lavar da regeneração...' (Tito 3:5)."
  },
  "redencao": {
    word: "Redenção",
    definition: "Do grego 'apolutrosis' (ἀπολύτρωσις). Libertação ou resgate de um escravo ou prisioneiro de suas dívidas sob o pagamento de um preço justo. Na teologia, é a libertação do homem do cativeiro do pecado, da lei e da morte, obtida pela dádiva da vida e derramamento do sangue perfeito de Jesus Cristo.",
    usage: "Substantivo Feminino. Ex: 'No qual temos a redenção, pelo seu sangue, a remissão dos pecados, segundo a riqueza da sua graça' (Efésios 1:7)."
  },
  "reconciliacao": {
    word: "Reconciliação",
    definition: "Do grego 'katallage' (καταλλαγή). Restabelecimento do relacionamento pacífico e harmonioso entre Deus e o homem decaído, pondo fim ao estado de inimizade moral anterior decorrente do pecado. Essa reconciliação foi plenamente intermediada, custeada e conquistada por Deus mediante a morte de Cristo na cruz.",
    usage: "Substantivo Feminino. Ex: 'Deus estava em Cristo reconciliando consigo o mundo, não imputando aos homens as suas transgressões' (2 Coríntios 5:19)."
  },
  "trindade": {
    word: "Trindade",
    definition: "A doutrina fundamental da teologia cristã que descreve a comunhão de Deus. Afirma que há um só Deus verdadeiro e absoluto que subsiste eternamente em três Pessoas perfeitamente distintas, coeternas, co-iguais e consubstanciais: o Pai, o Filho e o Espírito Santo. Um único Ser divino em três subsistências.",
    usage: "Substantivo Feminino. Uso na Teologia Própria. Ex: 'A graça do Senhor Jesus Cristo, e o amor de Deus, e a comunhão do Espírito Santo sejam com todos vós' (2 Coríntios 13:13)."
  },
  "esperanca": {
    word: "Esperança",
    definition: "Do grego 'elpis' (ἐλπίς). A certeza gozosa e convicta na concretização futura das promessas eternas de Deus baseada exclusivamente na fidelidade dEle. Não é um mero desejo otimista incerto, mas um firme âncora espiritual para a alma que sustenta o crente sob provações terrenas.",
    usage: "Substantivo Feminino. Ex: 'Retenhamos firmes a confissão da nossa esperança, sem vacilar, pois quem fez a promessa é fiel' (Hebreus 10:23)."
  },
  "igreja": {
    word: "Igreja",
    definition: "Do grego 'ekklesia' (ἐκκλησία - assembleia de chamados para fora). A comunidade universal de todos os regenerados e crentes em Jesus Cristo ao longo da história, zelada sob Seu senhorio (corpo místico de Cristo). Num sentido local, é o ajuntamento geográfico de discípulos dedicados ao louvor, comunhão, mútuo ensino, prática dos sacramentos e pregação do Evangelho.",
    usage: "Substantivo Feminino. Uso na Eclesiologia. Ex: 'Também eu te digo que tu és Pedro, e sobre esta pedra edificarei a minha igreja...' (Mateus 16:18)."
  },
  "oracao": {
    word: "Oração",
    definition: "O ato sagrado e íntimo de diálogo, adoração, confissão, petição, intercessão e agradecimento dirigido a Deus. É a expressão mais direta da fé viva e do relacionamento filial do crente com o Pai Celeste, sustentado pela mediação permanente de Jesus e intercessão do Espírito Santo.",
    usage: "Substantivo Feminino. Ex: 'Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas diante de Deus as vossas petições, pela oração e pela súplica, com ações de graças' (Filipenses 4:6)."
  },
  "espirito": {
    word: "Espírito",
    definition: "Do hebraico 'ruach' (רוּחַ) e grego 'pneuma' (πνεῦμα). Refere-se à substância imaterial humana ou celestial. Num contexto divino, refere-se ao Espírito Santo, a terceira Pessoa da Trindade que atua ativamente no mundo convencendo do pecado, operando o novo nascimento, habitando, guiando e consolando a vida do crente.",
    usage: "Substantivo Masculino. Ex: 'Deus é Espírito, e importa que os que o adoram o adorem in espírito e em verdade' (João 4:24)."
  },
  "evangelho": {
    word: "Evangelho",
    definition: "Do grego 'euaggelion' (εὐαγγέλιον - boas novas). A mensagem jubilosa da salvação eterna e reconciliação dos homens com Deus através da encarnação, vida perfeita, crucificação, morte vicária e ressurreição triunfante de Jesus Cristo.",
    usage: "Substantivo Masculino. Ex: 'Pois não me envergonho do evangelho, porque é o poder de Deus para a salvação de todo aquele que crê...' (Romanos 1:16)."
  },
  "discipulado": {
    word: "Discipulado",
    definition: "O processo espiritual, instrucional e de santificação pelo qual um seguidor fiel de Jesus Cristo ajuda outros a crescerem no conhecimento das Escrituras, em amor, em conduta moral e em testemunho ativo de acordo com a grande comissão bíblica de Cristo nos evangelhos.",
    usage: "Substantivo Masculino. Ex: 'Portanto, ide, fazei discípulos de todas as nações, batizando-os...' (Mateus 28:19)."
  },
  "batismo": {
    word: "Batismo",
    definition: "Sacramento, rito ou ordenança pública instituída diretamente por Jesus Cristo que expressa visivelmente a fé íntima do pecador em sua identificação perfeita com a morte, sepultamento e ressurreição santificadora do Messias.",
    usage: "Substantivo Masculino. Ex: 'Quem crer e for batizado será salvo; mas quem não crer será condenado' (Marcos 16:16)."
  },
  "parabola": {
    word: "Parábola",
    definition: "Uma narrativa histórica, fictícia ou terrena curta e extremamente vívida voltada para ilustrar verdades eternas de cunho ético ou teológico sobre o Reino de Deus. O método pedagógico favorito de Cristo em Seu ministério.",
    usage: "Substantivo Feminino. Ex: 'Tudo isto disse Jesus às multidões por parábolas, e sem parábolas nada lhes falava' (Mateus 13:34)."
  },
  "profecia": {
    word: "Profecia",
    definition: "Mensagem ou declaração moral inspirada vocal ou textualmente pelo Espírito Santo que edifica, consola, exorta ou prediz decisões futuras divinas sobre indivíduos e reinos morais.",
    usage: "Substantivo Feminino. Ex: 'Porque a profecia nunca foi produzida por vontade de homem algum, mas os homens santos de Deus falaram inspirados pelo Espírito Santo' (2 Pedro 1:21)."
  },
  "milagre": {
    word: "Milagre",
    definition: "Evento extraordinário, sobrenatural e historicamente perceptível operado diretamente pela vontade soberana de Deus sobre os elementos físicos para validar Sua divindade e transmitir Seus planos gloriosos.",
    usage: "Substantivo Masculino. Ex: 'Este início de sinais milagrosos fez Jesus em Caná da Galileia, manifestando a sua glória...' (João 2:11)."
  },
  "apostolo": {
    word: "Apóstolo",
    definition: "Do grego 'apostolos' (mensageiro oficial enviado em viagem de representação). Refere-se aos doze apóstolos escolhidos diretamente por Cristo e ressurretos designados para fundamentar teologicamente o Evangelho na Igreja Primitiva.",
    usage: "Substantivo Masculino. Ex: 'Edificados sobre o fundamento dos apóstolos e dos profetas, sendo o próprio Cristo Jesus a principal pedra de esquina' (Efésios 2:20)."
  },
  "sacerdote": {
    word: "Sacerdote",
    definition: "Do hebraico 'kohen' (כֹּהֵן). Aquele designado por Deus para interceder ministerialmente entre as famílias humanas e Sua majestade celestiais, prefigurando ritualmente o sacerdócio sacrificial e glorioso de Cristo Jesus em favor da raça humana.",
    usage: "Substantivo Masculino. Ex: 'Tu és sacerdote para sempre, segundo a ordem de Melquisedeque' (Hebreus 7:17)."
  },
  "sabedoria": {
    word: "Sabedoria",
    definition: "O temor prático e moral ao Senhor, a habilidade de estruturar as decisões intelectuais e diárias da existência humana em concordância com os desígnios perfeitos eternos do Criador.",
    usage: "Substantivo Feminino. Ex: 'O temor do Senhor é o princípio da sabedoria, e o conhecimento do Santo é prudência' (Provérbios 9:10)."
  },
  "justica": {
    word: "Justiça",
    definition: "Retidão e conformidade intrínseca do caráter de Deus aos padrões morais absolutos por Ele estabelecidos. Também representa a imputação jurídica dos méritos de Cristo ao crente ou o dever relacional de retidão com o próximo.",
    usage: "Substantivo Feminino. Ex: 'Mas buscai primeiro o Reino de Deus, e a sua justiça, e todas estas coisas vos serão acrescentadas' (Mateus 6:33)."
  },
  "paz": {
    word: "Paz",
    definition: "Shalom. Quietude de espírito e bem-estar integral restaurado entre o Criador e a humanidade justificada em Cristo, expressando repouso espiritual imune às perturbações e tribulações dEste mundo decadente.",
    usage: "Substantivo Feminino. Ex: 'Deixo-vos a paz, a minha paz vos dou; não vo-la dou como o mundo a dá' (João 14:27)."
  },
  "comunhao": {
    word: "Comunhão",
    definition: "Do grego 'koinonia'. Compartilhamento recíproco e vivência fraterna enraizada na presença do Espírito Santo na Igreja de Cristo, onde cada discípulo serve os irmãos com caridade moral, suporte e generosidade material.",
    usage: "Substantivo Feminino. Ex: 'E perseveravam na doutrina dos apóstolos, na comunhão, no partir do pão e nas orações' (Atos 2:42)."
  },
  "revelacao": {
    word: "Revelação",
    definition: "Ato da benevolência de Deus no qual Ele manifesta inteligivelmente à humanidade conhecimentos outrora ocultados aos olhos seculares, ocorrendo na criação, nas Sagradas Escrituras e corporificada perfeitamente em Jesus.",
    usage: "Substantivo Feminino. Ex: 'Revelação de Jesus Cristo, a qual Deus lhe deu, para mostrar aos seus servos as coisas que brevemente devem acontecer...' (Apocalipse 1:1)."
  },
  "expiacao": {
    word: "Expiação",
    definition: "Cobertura ou purificação vicária dos pecados e da culpa moral realizada pelo pagamento com sangue e doação sacrificial de vida, culminando perfeitamente e plenamente no sacrifício vicário de Cristo por nós na cruz do Calvário.",
    usage: "Substantivo Feminino. Ex: 'No qual também agora recebemos a expiação' (Romanos 5:11, trad. ARC)."
  },
  "providencia": {
    word: "Providência",
    definition: "Ato do cuidado soberano de Deus pelo qual Ele governa e preserva de forma ativa as ações terrenas físico-históricas de Sua feitura com amor, justiça e discernimento irrepreensíveis para que redundem em Seus eternos propósitos sagrados.",
    usage: "Substantivo Feminino. Ex: 'Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus' (Romanos 8:28)."
  },
  "eternidade": {
    word: "Eternidade",
    definition: "Inexistência cósmica de limites ou transição temporal. Atributo inalienável do Pai e lar espiritual prometido celestial aos fiéis comissionados à vida de comunhão infinita amorosa santa de Deus.",
    usage: "Substantivo Feminino. Ex: 'Porque habitas na eternidade, e cujo nome é Santo...' (Isaías 57:15)."
  },
  "biblia": {
    word: "Bíblia",
    definition: "A inspirada Palavra escrita de Deus composta por 66 volumes do cânon teológico, revelados providencialmente por escribas guiados pelo Espírito de Deus com finalidade redentora para a raça caída.",
    usage: "Substantivo Feminino. Ex: 'Toda a Escritura é inspirada por Deus e útil para o ensino, para a repreensão, para a correção, para a educação na justiça' (2 Timóteo 3:16)."
  },
  "juizo": {
    word: "Juízo",
    definition: "Veredito santo, retilíneo e legal de Deus instaurado na história moral ou proclamado solenemente no encerramento das eras pós-morte contra o mal e conforme a perfeita verdade de Sua essência.",
    usage: "Substantivo Masculino. Ex: 'E, assim como aos homens está ordenado morrerem uma só vez, vindo, depois disto, o juízo' (Hebreus 9:27)."
  },
  "gloria": {
    word: "Glória",
    definition: "A indescritível e resplendente exaltação do caráter moral de Deus, Sua radiância sobrenatural transcendente e majestade suprema diante das quais toda a criação santa reconhece e louva reverentemente.",
    usage: "Substantivo Feminino. Ex: 'Os céus proclamam a glória de Deus e o firmamento anuncia as obras das suas mãos' (Salmos 19:1)."
  },
  "santos": {
    word: "Santos",
    definition: "A designação dos discípulos chamados para a justiça divina, os quais foram regenerados na misericórdia e vivem cotidianamente apartados das imoralidades do século presente para consagração ao Pai.",
    usage: "Adjetivo / Substantivo Masculino Plural. Ex: 'À igreja de Deus que está em Corinto, aos santificados em Cristo Jesus, chamados santos...' (1 Coríntios 1:2)."
  },
  "verbo": {
    word: "Verbo",
    definition: "Do grego 'Logos'. A hipóstase, pessoa do Verbo eterno, o Filho unigênito que se fez homem verdadeiro, expressando eternamente em carne e espírito os pensamentos de amor e graça salvadora manifestados pelo Pai.",
    usage: "Substantivo Masculino. Ex: 'No princípio era o Verbo, e o Verbo estava com Deus, e o Verbo era Deus' (João 1:1)."
  },
  "sacrificio": {
    word: "Sacrifício",
    definition: "Ato intencional santo de doação e renúncia vital, caracterizado na antiga aliança por ofertas com sangue expiatório e consagrado ultimamente pela obediência ativa total perfeita provida por Jesus na cruz.",
    usage: "Substantivo Masculino. Ex: 'Rogo-vos, pois, irmãos, pelas misericórdias de Deus, que apresenteis o vosso corpo por sacrifício vivo, santo e agradável a Deus...' (Romanos 12:1)."
  },
  "redentor": {
    word: "Redentor",
    definition: "Aquele que realiza legalmente redimir a pessoa amada do endividamento moral, do aprisionamento ou do exílio eterno de suas capacidades; em plenitude, título outorgado a Jesus.",
    usage: "Substantivo Masculino. Ex: 'Porque eu sei que o meu Redentor vive, e que por fim se levantará sobre a terra' (Jó 19:25)."
  },
  "mediador": {
    word: "Mediador",
    definition: "O advogado e facilitador reconciliatório de excelência mística devidamente qualificado com divindade e humanidade íntegras para restabelecer a concórdia afetiva de pacto entre o Divino e a raça caída.",
    usage: "Substantivo Masculino. Ex: 'Porque há um só Deus e um só Mediador entre Deus e os homens, Cristo Jesus, homem' (1 Timóteo 2:5)."
  },
  "consolador": {
    word: "Consolador",
    definition: "Do grego 'Parakletos'. Aquele invocado para auxiliar nas intempéries, aconselhar no discernimento reto e prover refrigério contínuo à Igreja; a pessoa divina do Espírito Santo habitador.",
    usage: "Substantivo Masculino. Ex: 'Mas o Consolador, o Espírito Santo, a quem o Pai enviará em meu nome, esse vos ensinará todas as coisas...' (João 14:26)."
  },
  "messias": {
    word: "Messias",
    definition: "Do hebraico 'Mashiach' (O Ungido correspondente ao termo grego 'Christos'). O divino Ungido divinamente aguardado, profetizado historicamente para realizar a salvação, instaurar e liderar eternamente o Reino do Pai.",
    usage: "Substantivo Masculino. Ex: 'Achamos o Messias (que se traduz por Cristo)' (João 1:41)."
  },
  "teologia": {
    word: "Teologia",
    definition: "O estudo reverente, intelectual e estruturado fundado na autoveladora Palavra de Deus acerca do ser celestial divino, Suas leis morais, emanações físicas espirituais e plano soteriológico pactual histórico.",
    usage: "Substantivo Feminino. Do grego standard 'theos' (Deus) + 'logos' (estudo, razão)."
  },
  "soteriologia": {
    word: "Soteriologia",
    definition: "Subdivisão teológica dogmática centrada em investigar e descrever os parâmetros bíblicos referentes ao processo e etapas da libertação salutar moral de salvação promovidos por intermédio das obras messiânicas.",
    usage: "Substantivo Feminino. Termo originário do grego 'soterios' (salvação) + 'logos' (estudo)."
  },
  "cristologia": {
    word: "Cristologia",
    definition: "O escrutínio e investigação teológica focados nAquele que é o Cristo de Deus, abrangendo o estudo místico de Suas duas naturezas (Perfeitamente Divino, Perfeitamente Humano), vida santa, morte e ofícios permanentes.",
    usage: "Substantivo Feminino. Do grego 'christos' + 'logos'."
  },
  "pneumatologia": {
    word: "Pneumatologia",
    definition: "O exame e conceituação de doutrina teológica que se orienta a esclarecer e celebrar a natureza divina pessoal da terceira pessoa trinitária santa, o Espírito Santo, e Suas ações santificadoras e dons na assembleia dos homens.",
    usage: "Substantivo Feminino. Das raízes do grego 'pneuma' (espírito, sopro) + 'logos'."
  },
  "eclesiologia": {
    word: "Eclesiologia",
    definition: "O ramo teológico responsável pelo discernimento das atribuições organizacionais, ordenanças sacras ordinárias, essência espiritual e destinações proféticas universais e históricas locais conferidas à Igreja edificada por Jesus.",
    usage: "Substantivo Feminino. Do grego clérigo 'ekklesia' + 'logos'."
  },
  "escatologia": {
    word: "Escatologia",
    definition: "A disciplina teológica que contempla e investiga os eventos derradeiros profetizados nos livros canônicos sobre o desfecho providencial da cronologia humana, retorno do Messias, juízo final e consolidação do novo céu e nova terra.",
    usage: "Substantivo Feminino. Dos termos no grego 'eschatos' (último, derradeiro) + 'logos' (ensino)."
  }
};
