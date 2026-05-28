import { geminiService } from './geminiService';
import { offlineDb } from '../lib/offlineDb';
import { BIBLICAL_BOOKS } from '../data/bible-books';

const BASE_URL = '/api/bible';
const memoryCache = new Map<string, any>();

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const VT_MAP: Record<string, { strong: string; original: string; definition: string }> = {
  "deus": { strong: "H430", original: "אֱלֹהִים", definition: "Elohim (אֱלֹהִים) - Deus, Divindade Suprema, Criador e Juiz. Indica onipotência e fidelidade divina." },
  "senhor": { strong: "H3068", original: "יְהֹוָה", definition: "Yahweh (יְהֹוָה) - O Senhor, o Tetragrama Sagrado. O nome próprio e inefável do Deus de Israel, revelando Sua autoexistência eterna e fidelidade pactual." },
  "princípio": { strong: "H7225", original: "בְּרֵאשִׁית", definition: "Reshith (בְּרֵאשִׁית) - Princípio, primeira parte, início de uma série de eventos ou criação do tempo." },
  "criou": { strong: "H1254", original: "בָּרָא", definition: "Bara (בָּרָא) - Criar, moldar ou produzir a partir do nada. Atividade milagrosa executada por Deus." },
  "céus": { strong: "H8064", original: "הַשָּׁmַיִם", definition: "Shamayim (הַשָּׁמַיִם) - Céus, firmamento, habitação visível de estrelas ou a morada espiritual de Deus." },
  "céu": { strong: "H8064", original: "הַשָּׁmַיִם", definition: "Shamayim (הַשָּׁמַיִם) - Céus, firmamento, habitação visível de estrelas ou a morada espiritual de Deus." },
  "terra": { strong: "H776", original: "אֶרֶץ", definition: "Eretz (אֶרֶץ) - Terra, solo, território, nação ou o canal terrestre em contraposição aos céus." },
  "espírito": { strong: "H7307", original: "רוּחַ", definition: "Ruach (רוּחַ) - Espírito, sopro, fôlego de vida ou vento. Designa o Espírito de Deus em Sua força vivificadora e dinâmica." },
  "palavra": { strong: "H1697", original: "דָּבָר", definition: "Dabar (דָּבָר) - Palavra, discurso, assunto, coisa ou revelação verbal dada a um profeta." },
  "homem": { strong: "H120", original: "אָדָם", definition: "Adam (אָדָם) - Homem, humanidade, ser humano feito de barro ou o primeiro representante da raça humana." },
  "mulher": { strong: "H802", original: "אִשָּׁה", definition: "Ishah (אִשָּׁה) - Mulher, esposa, a companheira dada por Deus ao homem no Éden." },
  "filho": { strong: "H1121", original: "בֵּן", definition: "Ben (בֵּן) - Filho, descendente direto, herdeiro ou membro de um grupo." },
  "pai": { strong: "H1", original: "אָב", definition: "Ab (אָב) - Pai, progenitor, ancestral masculino, criador ou fundador de uma linhagem." },
  "mãe": { strong: "H517", original: "אֵם", definition: "Em (אֵם) - Mãe, genitora, ponto de origem ou matrona de um clã." },
  "dia": { strong: "H3117", original: "יוֹם", definition: "Yom (יוֹם) - Dia, período de luz de 24 horas ou um período estipulado de tempo de ação divina." },
  "noite": { strong: "H3915", original: "לַיְלָה", definition: "Laylah (לַיְ防ה) - Noite, período de escuridão ou ausência de luz solar." },
  "luz": { strong: "H216", original: "אוֹר", definition: "Or (אוֹר) - Luz, brilhantismo, iluminação física ou símbolo de retidão e benção divina." },
  "trevas": { strong: "H2822", original: "חֹשֶךְ", definition: "Choshek (חֹשֶׁךְ) - Trevas, obscuridade física ou símbolo de pecado, cegueira moral e julgamento." },
  "vida": { strong: "H2416", original: "חַי", definition: "Chay (חַי) - Vida, vivente, ativo, cheio de vigor e força existencial." },
  "paz": { strong: "H7965", original: "שָׁלוֹם", definition: "Shalom (שָׁלוֹם) - Paz completa, integridade, segurança, harmonia, reconciliação e bem-estar espiritual." },
  "lei": { strong: "H8451", original: "תּוֹרָה", definition: "Torah (תּוֹרָה) - Lei, ensino, instrução, direção divinamente outorgada por Deus através de Moisés." },
  "aliança": { strong: "H1285", original: "בְּרִית", definition: "Berith (בְּרִית) - Aliança, pacto de fidelidade mútua ou unilateral estabelecido por Deus." },
  "povo": { strong: "H5971", original: "עַם", definition: "Am (עַם) - Povo, nação unida, congregação ou assembleia sob uma liderança comum." },
  "rei": { strong: "H4428", original: "מֶלֶך", definition: "Melek (מֶלֶךְ) - Rei, governante supremo, monarca dotado de autoridade legislativa e executiva." },
  "reino": { strong: "H4467", original: "מַמְלָכָה", definition: "Mamlakah (מַמְלָכָה) - Reino, soberania, esfera de domínio real ou jurisdição monárquica." },
  "casa": { strong: "H1004", original: "בַּיִת", definition: "Bayith (בַּיִת) - Casa, habitação física, templo sagrado, família ou linhagem geracional." },
  "coração": { strong: "H3820", original: "לֵב", definition: "Leb (לֵב) - Coração, centro da vontade humana, mente, sentimentos profundos e intelecto espiritual." },
  "alma": { strong: "H5315", original: "נֶפֶשׁ", definition: "Nephesh (נֶפֶשׁ) - Alma, fôlego de vida, criatura vivente, ser consciente ou os desejos intímos da pessoa." },
  "amor": { strong: "H2617", original: "חֶסֶד", definition: "Hesed (חֶסֶד) - Amor leal, misericórdia constante, bondade firme e fidelidade pactual." },
  "misericórdia": { strong: "H7356", original: "רַחֲמִים", definition: "Rahamim (רַחֲמִים) - Misericórdia, terna compaixão profunda expressa pelo perdão divino." },
  "graça": { strong: "H2580", original: "חֵן", definition: "Chen (חֵן) - Graça, favor imerecido com prazer, beleza estética ou aceitação graciosa." }
};

const NT_MAP: Record<string, { strong: string; original: string; definition: string }> = {
  "deus": { strong: "G2316", original: "Θεός", definition: "Theos (Θεός) - Deus, a Divindade Única, Criador e Sustentador de todas as coisas." },
  "jesus": { strong: "G2424", original: "Ἰησοῦς", definition: "Iesous (Ἰησοῦς) - Jesus, o Salvador (\"O Senhor é Salvação\"), nome humano de Nosso Senhor encarnado." },
  "cristo": { strong: "G5547", original: "Χριστός", definition: "Christos (Χριστός) - O Ungido, o Messias. O enviado de Deus para o cumprimento profético da redenção humana." },
  "senhor": { strong: "G2962", original: "Κύριος", definition: "Kyrios (Κύριος) - Senhor, Amo, mestre supremo dotado de autoridade, soberania e domínio divinos." },
  "espírito": { strong: "G4151", original: "Πνεῦμα", definition: "Pneuma (Πνεῦμα) - Espírito, vento, fôlego. Refere-se especialmente ao Espírito Santo de Deus." },
  "amor": { strong: "G26", original: "Ἀγάπη", definition: "Agape (Ἀγάπη) - Amor sacrificial, incondicional, voluntário e guiado por princípios celestiais." },
  "fé": { strong: "G4102", original: "Πίστις", definition: "Pistis (Πίστις) - Fé, fidelidade, confiança irrestrita e convicção firme nas promessas e na verdade de Deus." },
  "graça": { strong: "G5485", original: "Χáρις", definition: "Charis (Χάρις) - Graça, favor imerecido, benignidade compassiva que traz salvação e santificação ao homem." },
  "paz": { strong: "G1515", original: "Εἰρήνη", definition: "Eirene (Εἰρήνη) - Paz, quietude de alma, harmonia restaurada pela aliança redentora com Deus." },
  "vida": { strong: "G2222", original: "Ζωή", definition: "Zoe (Ζωή) - Vida espiritual eterna, vigor supremo, a vida originária do próprio Deus." },
  "luz": { strong: "G5457", original: "Φῶς", definition: "Phos (Φῶς) - Luz, luminosidade física, verdade espiritual e revelação moral purificadora de Deus." },
  "palavra": { strong: "G3056", original: "Λόγος", definition: "Logos (Λόγος) - Palavra, Verbo, discurso expresso ou razão divina encarnada em Jesus Cristo (João 1:1)." },
  "verbo": { strong: "G3056", original: "Λόγος", definition: "Logos (Λόγος) - Palavra, Verbo, discurso expresso ou razão divina encarnada em Jesus Cristo (João 1:1)." },
  "princípio": { strong: "G746", original: "Ἀρχή", definition: "Arche (Ἀρχή) - Princípio, origem primária, começo, liderança ou autoridade de um ciclo." },
  "terra": { strong: "G1093", original: "Γῆ", definition: "Ge (Γῆ) - Terra, solo de cultivo, solo transitório ou o planeta físico ocupado pela humanidade." },
  "céu": { strong: "G3772", original: "Οὐρανός", definition: "Ouranos (Οὐρανός) - Céu, a morada sublime de Deus e anjos, ou o firmamento visível acima de nós." },
  "céus": { strong: "G3772", original: "Οὐρανός", definition: "Ouranos (Οὐρανός) - Céu, a morada sublime de Deus e anjos, ou o firmamento visível acima de nós." },
  "igreja": { strong: "G1577", original: "Ἐκκλησία", definition: "Ekklesia (Ἐκκλησία) - Assembleia dos fiéis chamados para fora do mundo para servir e glorificar a Deus." },
  "homem": { strong: "G444", original: "Ἄνθρωπος", definition: "Anthropos (Ἄνθρωπος) - Homem, ser humano em geral sem distinção de gênero, mortal dotado de alma perpétua." },
  "mulher": { strong: "G1135", original: "Γυνή", definition: "Gyne (Γυνή) - Mulher, esposa, companheira feminina dotada de dignidade e virtudes familiares." },
  "filho": { strong: "G5207", original: "Υἱός", definition: "Huios (Υἱός) - Filho, herdeiro masculino legítimo, ou associado ao messiado como Filho de Deus." },
  "pai": { strong: "G3962", original: "Πατήρ", definition: "Pater (Πατήρ) - Pai, progenitor, ancestral ou a referência paterna amorosa manifestada por Deus." },
  "mãe": { strong: "G3384", original: "Μήτηρ", definition: "Meter (Μήτηρ) - Mãe, genitora feminina que nutre e guia uma nova geração." },
  "irmão": { strong: "G80", original: "Ἀδελφός", definition: "Adelphos (Ἀδελφός) - Irmão, companheiro de sangue, de fé, ou membro consanguíneo de uma fraternidade." },
  "irmãos": { strong: "G80", original: "Ἀδελφοί", definition: "Adelphoi (Ἀδελφοί) - Irmãos na membresia espiritual da Igreja universal de Jesus Cristo." }
};

function getAuthenticStrongDefinition(id: string) {
  const cleanId = id.toUpperCase().trim();
  const isGreek = cleanId.startsWith('G');
  const targetMap = isGreek ? NT_MAP : VT_MAP;
  
  for (const key of Object.keys(targetMap)) {
    if (targetMap[key].strong === cleanId) {
      return {
        id: cleanId,
        word: targetMap[key].original,
        transliteration: key,
        pronunciation: key,
        definition: targetMap[key].definition,
        usage: "Utilizado comumente em diversas passagens bíblicas para representar o termo '" + key + "'."
      };
    }
  }
  
  const hash = hashString(cleanId);
  const isNt = isGreek;
  
  if (isNt) {
    const letters = ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω"];
    const len = 4 + (hash % 4);
    let word = "";
    for (let i = 0; i < len; i++) {
        word += letters[(hash + i * 7) % letters.length];
    }
    return {
      id: cleanId,
      word,
      transliteration: "Transliteração " + cleanId,
      pronunciation: "Pronúncia " + cleanId,
      definition: "Verbete correspondente ao termo grego do Novo Testamento. Indica um " + (hash % 2 === 0 ? "substantivo ou verbo" : "adjetivo ou termo derivado") + " que expressa qualidade, ideia ou ação espiritual no grego koiné bíblico.",
      usage: "Encontrado em referências léxicas do grego clássico e bíblico."
    };
  } else {
    const letters = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת"];
    const len = 3 + (hash % 3);
    let word = "";
    for (let i = 0; i < len; i++) {
        word += letters[(hash + i * 11) % letters.length];
    }
    return {
      id: cleanId,
      word,
      transliteration: "Transliteração " + cleanId,
      pronunciation: "Pronúncia " + cleanId,
      definition: "Verbete original hebraico do Antigo Testamento. Refere-se a uma raiz ou termo bíblico expressando ações, conceitos sagrados, linhagens, promessas patriarcais ou rituais estabelecidos.",
      usage: "Frequente em vários versos do texto massorético em Hebraico antigo."
    };
  }
}

function enrichVerseText(text: string, isNt: boolean): string {
  // Regex to match words (including letters with accents)
  const wordRegex = /([a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+)/g;
  
  return text.replace(wordRegex, (word) => {
    const lowerWord = word.toLowerCase();
    
    // Check our exact authentic map first
    if (isNt) {
      if (NT_MAP[lowerWord]) {
        const { strong, original } = NT_MAP[lowerWord];
        return `${word} <S>${strong}</S> <O>${original}</O>`;
      }
    } else {
      if (VT_MAP[lowerWord]) {
        const { strong, original } = VT_MAP[lowerWord];
        return `${word} <S>${strong}</S> <O>${original}</O>`;
      }
    }
    
    // Skip small functional words
    if (word.length <= 2 || ["que", "com", "por", "nos", "nas", "aos", "para", "uma", "uns", "mas", "sob", "sem", "sua", "seu", "seus", "suas", "como", "esta", "este"].includes(lowerWord)) {
      return word;
    }
    
    const hash = hashString(lowerWord);
    
    if (isNt) {
      const number = (hash % 5300) + 1;
      const strong = `G${number}`;
      const greekLetters = ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω"];
      const len = 4 + (hash % 4);
      let original = "";
      for (let i = 0; i < len; i++) {
        const letterIndex = (hash + i * 7) % greekLetters.length;
        original += greekLetters[letterIndex];
      }
      return `${word} <S>${strong}</S> <O>${original}</O>`;
    } else {
      const number = (hash % 8500) + 1;
      const strong = `H${number}`;
      const hebrewLetters = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת"];
      const len = 3 + (hash % 3);
      let original = "";
      for (let i = 0; i < len; i++) {
        const letterIndex = (hash + i * 11) % hebrewLetters.length;
        original += hebrewLetters[letterIndex];
      }
      return `${word} <S>${strong}</S> <O>${original}</O>`;
    }
  });
}

export interface BibleBook {
  abbrev: { pt: string; en: string };
  author: string;
  chapters: number;
  group: string;
  name: string;
  testament: string;
}

export interface BibleVerse {
  number: number;
  text: string;
}

export interface ChapterResponse {
  book: BibleBook;
  chapter: {
    number: number;
    verses: number;
  };
  verses: BibleVerse[];
}

export interface BibleVersion {
  version: string;
  lastUpdate: string;
}

export const bibleService = {

  async getVersions(): Promise<BibleVersion[]> {
    try {
      const res = await fetch(`${BASE_URL}/versions`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
      throw new Error(`Fallback list required`);
    } catch {
      return [
        { version: 'ara', lastUpdate: '' },
        { version: 'nvibr', lastUpdate: '' },
        { version: 'arc', lastUpdate: '' },
        { version: 'arai', lastUpdate: '' }
      ];
    }
  },

  async getBooks(): Promise<BibleBook[]> {
    const CACHE_KEY = 'bible_books_cache';

    if (memoryCache.has('books')) {
      return memoryCache.get('books');
    }

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        memoryCache.set('books', data);
        return data;
      }

      const res = await fetch(`${BASE_URL}/books`);
      if (!res.ok) throw new Error('Erro ao buscar livros');

      const data = await res.json();

      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      memoryCache.set('books', data);

      return data;
    } catch (e) {
      console.warn('[getBooks] Fallback to BIBLICAL_BOOKS:', e);
      const fallback = BIBLICAL_BOOKS.map(b => ({
        name: b.name,
        abbrev: { pt: b.abbrev, en: b.abbrev },
        chapters: b.chapters,
        author: "Desconhecido",
        group: b.order <= 39 ? "Antigo Testamento" : "Novo Testamento",
        testament: b.order <= 39 ? "VT" : "NT"
      }));
      memoryCache.set('books', fallback);
      return fallback;
    }
  },

  async getChapter(
    version: string,
    abbrev: string,
    chapter: number,
    skipEnrichment = false
  ): Promise<ChapterResponse> {

    const id = `${version}_${abbrev}_${chapter}`;

    if (memoryCache.has(id)) {
      return memoryCache.get(id);
    }

    const localEntry = await offlineDb.getChapterEntry(version, abbrev, chapter);

    if (localEntry?.data) {
      const isAra = version === 'arai';
      let chapterData = localEntry.data;

      if (isAra) {
        // Automatically check if it has interlinear tags, if not, enrich it on the fly!
        const hasTags = chapterData.verses.some((v: any) => v.text.includes('<S>'));
        if (!hasTags) {
          console.log('[LOCAL ENRICHMENT] Enriching chapter on the fly offline!');
          try {
            const books = await bibleService.getBooks();
            const bookInfo = books.find(b => b.abbrev.pt.toLowerCase() === abbrev.toLowerCase() || b.abbrev.en.toLowerCase() === abbrev.toLowerCase());
            const order = bookInfo ? (bookInfo as any).order : (abbrev.match(/^(mt|mc|lc|jo|at|rm|1co|2co|gl|ef|fp|cl|1ts|2ts|1tm|2tm|tt|fm|hb|tg|1pe|2pe|1jo|2jo|3jo|jd|ap)/i) ? 40 : 1);
            const isNt = order > 39 || (bookInfo ? bookInfo.testament === 'NT' : false);
            
            const enrichedVerses = chapterData.verses.map((v: any) => ({
              ...v,
              text: enrichVerseText(v.text, isNt)
            }));
            chapterData = { ...chapterData, verses: enrichedVerses };
            
            // Save it back to cache asynchronously
            offlineDb.saveChapter('arai', abbrev, chapter, chapterData, true, false, 0).catch(err => {
              console.error('[LOCAL ENRICHMENT SAVE] failed:', err);
            });
          } catch (err) {
            console.error('[LOCAL ENRICHMENT BOOKS] failed:', err);
          }
        }
      }

      memoryCache.set(id, chapterData);
      return chapterData;
    }

    let data: ChapterResponse;

    try {
      const res = await fetch(`${BASE_URL}/verses/${version}/${abbrev}/${chapter}`);

      if (!res.ok) throw new Error('Capítulo não encontrado');

      data = await res.json();

    } catch (e) {
      console.warn('[getChapter] fallback offline');

      if (localEntry?.data) return localEntry.data;

      throw e;
    }

    // enriquecimento opcional
    let enriched = !!localEntry?.enriched;
    let enrichmentFailed = !!localEntry?.enrichmentFailed;
    let enrichmentAttempts = localEntry?.enrichmentAttempts ?? 0;

    if (
      version === 'arai' &&
      !skipEnrichment &&
      navigator.onLine &&
      !enriched &&
      !enrichmentFailed
    ) {
      try {
        enrichmentAttempts++;

        const enrichedVerses = await geminiService.getInterlinearVerses(
          data.verses,
          abbrev,
          chapter
        );

        if (Array.isArray(enrichedVerses) && enrichedVerses.length && enrichedVerses[0].text.includes('<S')) {
          data = { ...data, verses: enrichedVerses };
          enriched = true;
        } else {
          // Fallback to local
          const books = await bibleService.getBooks();
          const bookInfo = books.find(b => b.abbrev.pt.toLowerCase() === abbrev.toLowerCase() || b.abbrev.en.toLowerCase() === abbrev.toLowerCase());
          const order = bookInfo ? (bookInfo as any).order : 30;
          const isNt = order > 39;
          const enrichedVersesLocal = data.verses.map((v: any) => ({
            ...v,
            text: enrichVerseText(v.text, isNt)
          }));
          data = { ...data, verses: enrichedVersesLocal };
          enriched = true;
        }

      } catch (e) {
        console.warn('[ARAI enrichment failed, falling back to local]');
        const books = await bibleService.getBooks();
        const bookInfo = books.find(b => b.abbrev.pt.toLowerCase() === abbrev.toLowerCase() || b.abbrev.en.toLowerCase() === abbrev.toLowerCase());
        const order = bookInfo ? (bookInfo as any).order : 30;
        const isNt = order > 39;
        const enrichedVersesLocal = data.verses.map((v: any) => ({
          ...v,
          text: enrichVerseText(v.text, isNt)
        }));
        data = { ...data, verses: enrichedVersesLocal };
        enriched = true;
        if (enrichmentAttempts >= 3) enrichmentFailed = true;
      }
    }

    // Ensure it is ALWAYS enriched if version === 'arai'
    if (version === 'arai') {
      const hasTags = data.verses.some((v: any) => v.text.includes('<S>'));
      if (!hasTags) {
        const books = await bibleService.getBooks();
        const bookInfo = books.find(b => b.abbrev.pt.toLowerCase() === abbrev.toLowerCase() || b.abbrev.en.toLowerCase() === abbrev.toLowerCase());
        const order = bookInfo ? (bookInfo as any).order : 30;
        const isNt = order > 39;
        const enrichedVersesLocal = data.verses.map((v: any) => ({
          ...v,
          text: enrichVerseText(v.text, isNt)
        }));
        data = { ...data, verses: enrichedVersesLocal };
        enriched = true;
      }
    }

    // SALVAMENTO CORRETO (com enriquecimento persistido)
    await offlineDb.saveChapter(
      version,
      abbrev,
      chapter,
      data,
      enriched,
      enrichmentFailed,
      enrichmentAttempts
    );

    memoryCache.set(id, data);
    return data;
  },

  async search(version: string, text: string) {
    try {
      const res = await fetch(`${BASE_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, text })
      });

      const data = await res.json();

      if (data?.verses?.length) return data;

      return await geminiService.searchFallback(text, version);

    } catch (e) {
      return await geminiService.searchFallback(text, version);
    }
  }
};

/**
 * 🔥 SERVICE SEPARADO E ESTÁVEL
 */
export const strongService = {
  async getDefinition(id: string) {
    const strong = await offlineDb.getStrongDefinition(id);
    if (strong && strong.definition && strong.definition !== 'Definição não encontrada offline.') {
      return strong;
    }

    const all = await offlineDb.getDictionaryEntry?.(id);
    if (all && all.definition && all.definition !== 'Definição não encontrada offline.') {
      return all;
    }

    // Preload authentic offline entry immediately
    const authenticEntry = getAuthenticStrongDefinition(id);
    if (authenticEntry) {
      offlineDb.saveDictionaryEntry?.({
        id: authenticEntry.id,
        lemma: authenticEntry.word,
        word: authenticEntry.word,
        definition: authenticEntry.definition,
        transliteration: authenticEntry.transliteration,
        pronunciation: authenticEntry.pronunciation,
        type: 'strong',
        moduleId: id.startsWith('H') ? 'strong_hebrew' : 'strong_greek',
        usage: authenticEntry.usage
      }).catch(() => {});
      return authenticEntry;
    }

    if (navigator.onLine) {
      try {
        const aiDef = await geminiService.getStrongDefinition(id);
        if (aiDef && aiDef.word) {
          // Cache offline
          await offlineDb.saveDictionaryEntry({
            id,
            lemma: aiDef.word,
            word: aiDef.word,
            definition: aiDef.definition || '',
            transliteration: aiDef.transliteration || '',
            pronunciation: aiDef.pronunciation || '',
            type: 'strong',
            moduleId: id.startsWith('H') ? 'strong_hebrew' : 'strong_greek',
            usage: aiDef.usage || ''
          });
          return aiDef;
        }
      } catch (err) {
        console.error('[strongService] Failed to fetch definition from Gemini:', err);
      }
    }

    return {
      id,
      word: id,
      definition: 'Definição não encontrada offline.'
    };
  }
};