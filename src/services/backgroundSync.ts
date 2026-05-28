import { bibleService } from './bibleService';
import { offlineDb, OfflineVersion } from '../lib/offlineDb';

export const SEED_DATA: Record<string, Array<{ lemma: string; definition: string; type?: string }>> = {
  strong_greek: [
    { lemma: 'G3056', definition: 'Logos (Λόγος) - Palavra, Verbo, discurso ou razão divina. Símbolo do Verbo de Deus eterno que se encarnou em Jesus Cristo (João 1:1). Refere-se à manifestação viva do pensamento divino.', type: 'strong' },
    { lemma: 'G26', definition: 'Agape (Ἀγάπη) - Amor sacrificial, incondicional, voluntário e guiado por princípios celestiais. O amor supremo e perfeito de Deus derramado nos corações humanos.', type: 'strong' },
    { lemma: 'G5547', definition: 'Christos (Χριστός) - O Ungido, o Messias. O enviado de Deus para redenção do homem, cumprindo as profecias do Antigo Testamento.', type: 'strong' },
    { lemma: 'G2098', definition: 'Euaggelion (Εὐαγγέλιον) - Boas novas, alegre mensagem. O Evangelho de salvação em Jesus Cristo.', type: 'strong' },
    { lemma: 'G4102', definition: 'Pistis (Πίστις) - Fé, fidelidade, confiança irrestrita e convicção firme na verdade divina e nas promessas do Senhor.', type: 'strong' },
    { lemma: 'G5485', definition: 'Charis (Χάρις) - Graça, favor imerecido e compassivo de Deus operando na salvação e santificação do homem.', type: 'strong' },
    { lemma: 'G1577', definition: 'Ekklesia (Ἐκκλησία) - Assembleia geral, igreja, comunidade dos fiéis chamados para fora do mundo para servir a Deus.', type: 'strong' },
    { lemma: 'G4151', definition: 'Pneuma (Πνεῦμα) - Espírito, fôlego, vento. Usado especificamente para o Espírito Santo de Deus em Sua atividade regeneradora.', type: 'strong' },
    { lemma: 'G1242', definition: 'Diatheke (Διαθήκη) - Aliança, pacto unilateral de fidelidade estabelecido por Deus com a raça humana.', type: 'strong' },
    { lemma: 'G3563', definition: 'Nous (Νοῦς) - Entendimento, mente, intelecto ou razão espiritual renovada para discernir a perfeita vontade de Deus.', type: 'strong' }
  ],
  strong_hebrew: [
    { lemma: 'H1254', definition: 'Bara (בָּרָא) - Criar, moldar ou produzir a partir do nada (ex nihilo). Expressão usada na Bíblia estritamente para a atividade milagrosa e soberana de criação executada por Deus (Gênesis 1:1).', type: 'strong' },
    { lemma: 'H7307', definition: 'Ruach (רוּחַ) - Espírito, sopro, fôlego da vida ou vento. Designa o Espírito de Yahweh em Sua força vivificadora e dinâmica.', type: 'strong' },
    { lemma: 'H430', definition: 'Elohim (אֱלֹהִים) - Deus, Divindade Suprema, Criador e Juiz. Usado no plural majestático para indicar plenitude, onipotência e comunhão trinitária em Gênesis 1:1.', type: 'strong' },
    { lemma: 'H3068', definition: 'Yahweh (יְהֹוָה) - O Senhor, o Tetragráma Sagrado. O nome próprio e inefável do Deus de Israel, revelando Sua autoexistência eterna e fidelidade pactual.', type: 'strong' },
    { lemma: 'H1288', definition: 'Barak (בָּרַך) - Abençoar, prostrar-se ou ajoelhar em reverência. Indica o derramamento dos favores divinos sobre a vida do homem.', type: 'strong' },
    { lemma: 'H2617', definition: 'Hesed (חֶסֶד) - Amor leal, misericórdia constante, bondade firme e fidelidade incondicional do pacto de Deus com os Seus fiéis.', type: 'strong' },
    { lemma: 'H7965', definition: 'Shalom (שָׁלוֹם) - Paz completa, integridade, segurança, harmonia, reconciliação e prosperidade plena espiritual e física.', type: 'strong' },
    { lemma: 'H1961', definition: 'Hayah (הָיָה) - Ser, existir, acontecer ou vir a ser. Raiz verbal ligada à revelação mística do nome "Eu Sou" no êxodo.', type: 'strong' },
    { lemma: 'H8451', definition: 'Torah (תּוֹרָה) - Lei, ensino, instrução, guia. O conjunto das leis fundamentais e ensinamentos divinos concedidos a Moisés.', type: 'strong' },
    { lemma: 'H5769', definition: 'Olam (עוֹלָם) - Eternidade, infinito, tempo indeterminado. Refere-se à natureza eterna e imutável de Deus.', type: 'strong' }
  ],
  theological: [
    { lemma: 'Soteriologia', definition: 'Ramo da teologia sistemática que estuda a doutrina da salvação, dividida em regeneração, justificidade, adoção, santificação e glorificação.' },
    { lemma: 'Cristologia', definition: 'Doutrina acerca da pessoa, natureza divino-humana e obra redentora de Jesus Cristo, o Filho de Deus encarnado.' },
    { lemma: 'Escatologia', definition: 'O estudo teológico dos acontecimentos do fim dos tempos, abrangendo a segunda vinda de Cristo, o juízo final e o estado eterno.' },
    { lemma: 'Pneumatologia', definition: 'O estudo doutrinário acerca do Espírito Santo, Sua divindade, personalidade e ministério ativo no crente e na colheita bíblica.' },
    { lemma: 'Trindade', definition: 'A incompreensível e maravilhosa verdade do único Deus verdadeiro manifestado e subsistente em três pessoas distintas, coeternas e consubstanciais: o Pai, o Filho e o Espírito Santo.' },
    { lemma: 'Justificação', definition: 'O ato judicial de Deus pelo qual Ele declara justo o pecador arrependido, unicamente com base nos méritos do sacrifício propiciatório de Cristo na cruz.' },
    { lemma: 'Graça Divina', definition: 'O favor e amor imerecidos concedidos ativamente por Deus à humanidade decaída, possibilitando redenção, transformação e fortalecimento santificador.' },
    { lemma: 'Eclesiologia', definition: 'Doutrina teológica sobre a essência, propósitos, organização, sacramentos/ordenanças e missão transformadora da Igreja no mundo.' }
  ],
  topical: [
    { lemma: 'Amor', definition: 'O maior de todos os princípios espirituais. Amar a Deus acima de todas as coisas e ao próximo como a si mesmo resume a Lei e os Profetas (Mateus 22:37-40).' },
    { lemma: 'Fé', definition: 'A certeza daquilo que esperamos e a prova inequívoca das realidades invisíveis. Essencial para agradar a Deus (Hebreus 11:1-6).' },
    { lemma: 'Paz', definition: 'Uma promessa de Jesus que excede todo o entendimento humano, guardando mente e sentimentos em meio a tribulações externas.' },
    { lemma: 'Perdão', definition: 'O ato restaurador da graça divina e humana, cancelando dívidas morais e promovendo reconciliação através do exemplo de Cristo.' },
    { lemma: 'Oração', definition: 'Diálogo franco e reverente de comunhão pessoal com o Criador. Poderosa chave para obter consolo, direcionamento e intervenções milagrosas.' },
    { lemma: 'Esperança', definition: 'A âncora firme da alma cristã, baseada na certeza absoluta do amor eterno e no triunfo glorioso de Cristo.' }
  ],
  beacon: [
    { lemma: 'Introdução ao Comentário Beacon', definition: 'O Comentário Bíblico Beacon oferece uma rica perspectiva teológica wesleyana, combinando erudição acadêmica exegética com um profundo senso de exortação espiritual.' },
    { lemma: 'Guia de Estudo Bíblico', definition: 'Para estudar com o comentário, selecione uma passagem bíblica no Reader ou digite a referência e o capítulo que deseja analisar. O sistema irá compilar os dados teológicos.' }
  ],
  moody: [
    { lemma: 'Introdução ao Comentário Moody', definition: 'O Comentário Bíblico Moody é uma ferramenta teológica amplamente aclamada de cunho conservador e focado na exegese gramático-histórica, facilitando a explanação detalhada versículo por versículo.' },
    { lemma: 'Guia de Análise Textual', definition: 'A exegese histórica do Comentário Moody ajuda a entender o contexto cultural original, o propósito do autor sagrado e a aplicação prática para os dias atuais.' }
  ],
  portuguese_dictionary: [
    { lemma: 'Salvação', definition: 'Livramento espiritual da condenação do pecado, da morte eterna e da separação de Deus, realizado por meio da graça divina através da fé no sacrifício de Jesus Cristo.' },
    { lemma: 'Fé', definition: 'Confiança irrestrita, certeza e convicção firme na verdade revelada de Deus, nas Suas promessas e no Seu caráter imutável.' },
    { lemma: 'Graça', definition: 'O imerecido favor divino concedido benevolentemente ao ser humano necessitado de salvação, sem qualquer mérito ou capacidade próprios.' },
    { lemma: 'Amor', definition: 'O mais sublime atributo do caráter de Deus (pois Deus é amor) e o principal mandamento da ética bíblica, caracterizado de forma incondicional e sacrificial.' }
  ]
};

const FRIENDLY_NAMES: Record<string, string> = {
  portuguese_dictionary: 'Dicionário Português',
  strong_greek: 'Strong Grego',
  strong_hebrew: 'Strong Hebraico',
  theological: 'Dicionário Teológico',
  topical: 'Dicionário Temático',
  beacon: 'Comentário Beacon',
  moody: 'Comentário Moody',
  morning_evening: 'Manhã e Noite',
  bible_maps: 'Mapas Bíblicos',
  reading_plans: 'Planos de Leitura',
  ara: 'ARA',
  nvibr: 'NVI',
  arc: 'ARC',
  arai: 'ARA Interlinear'
};

let isSyncing = false;
let stopRequested = false;

type SyncListener = (
  status: Record<string, OfflineVersion>
) => void;

const listeners = new Set<SyncListener>();

let currentStatus: Record<string, OfflineVersion> = {};

const notify = () => {
  listeners.forEach(listener => {
    try {
      listener(currentStatus);
    } catch (err) {
      console.error(
        '[BACKGROUND_SYNC_LISTENER_ERROR]',
        err
      );
    }
  });
};

export const backgroundSync = {

  // =========================================
  // SUBSCRIBE
  // =========================================
  subscribe(listener: SyncListener) {

    listeners.add(listener);

    try {
      listener(currentStatus);
    } catch (err) {
      console.error(
        '[SUBSCRIBE_ERROR]',
        err
      );
    }

    return () => {
      listeners.delete(listener);
    };
  },

  // =========================================
  // STATUS
  // =========================================
  getStatus() {
    return currentStatus;
  },

  refreshModules() {
    notify();
  },

  stop() {
    stopRequested = true;
  },

  // =========================================
  // INITIAL SYNC
  // =========================================
  async runInitialSync() {

    if (isSyncing) return;

    isSyncing = true;
    stopRequested = false;

    try {

      const versions =
        await offlineDb.getAllVersions();

      for (const v of (versions || [])) {
        if (v.downloading && !v.installed) {
          console.log(`[SYNC-INIT] Cleaned up stale download indicator for: ${v.id}`);
          v.downloading = false;
          v.progress = 0;
          await offlineDb.saveVersionInfo(v);
        }
        currentStatus[v.id] = v;
      }

      notify();

      // Ensure base Bible version records exist in DB without auto-downloading them
      const ara = await offlineDb.getVersionInfo('ara');
      if (!ara) {
        const araInfo = {
          id: 'ara',
          name: 'ARA',
          type: 'bible' as const,
          category: 'bible' as const,
          installed: false,
          downloading: false,
          progress: 0,
          lastUpdate: Date.now()
        };
        await offlineDb.saveVersionInfo(araInfo);
        currentStatus['ara'] = araInfo;
      }

      const nvibr = await offlineDb.getVersionInfo('nvibr');
      if (!nvibr) {
        const nvibrInfo = {
          id: 'nvibr',
          name: 'NVI',
          type: 'bible' as const,
          category: 'bible' as const,
          installed: false,
          downloading: false,
          progress: 0,
          lastUpdate: Date.now()
        };
        await offlineDb.saveVersionInfo(nvibrInfo);
        currentStatus['nvibr'] = nvibrInfo;
      }

      const arc = await offlineDb.getVersionInfo('arc');
      if (!arc) {
        const arcInfo = {
          id: 'arc',
          name: 'ARC',
          type: 'bible' as const,
          category: 'bible' as const,
          installed: false,
          downloading: false,
          progress: 0,
          lastUpdate: Date.now()
        };
        await offlineDb.saveVersionInfo(arcInfo);
        currentStatus['arc'] = arcInfo;
      }

      const arai = await offlineDb.getVersionInfo('arai');
      if (!arai) {
        const araiInfo = {
          id: 'arai',
          name: 'ARA Interlinear',
          type: 'bible' as const,
          category: 'bible' as const,
          installed: false,
          downloading: false,
          progress: 0,
          lastUpdate: Date.now()
        };
        await offlineDb.saveVersionInfo(araiInfo);
        currentStatus['arai'] = araiInfo;
      }

      notify();
      await offlineDb.audit();

    } catch (err) {

      console.error(
        '[INITIAL_SYNC_ERROR]',
        err
      );

    } finally {

      isSyncing = false;
    }
  },

  // =========================================
  // DOWNLOAD BÍBLIA
  // =========================================
  async syncVersion(
    versionId: string,
    booksInput?: any[]
  ) {

    stopRequested = false; // Reset stop flag so a stopped sync can be restarted!

    try {

      const books =
        booksInput ||
        await bibleService.getBooks();

      const total =
        books.reduce(
          (a, b) =>
            a + Number(b.chapters || 0),
          0
        );

      let done = 0;

      const info: OfflineVersion = {
        id: versionId,
        name: versionId === 'arai' ? 'ARA Interlinear' : versionId.toUpperCase(),
        type: 'bible' as const,
        category: 'bible' as const,
        installed: false,
        downloading: true,
        progress: 0,
        lastUpdate: Date.now()
      };

      await offlineDb.saveVersionInfo(info);

      currentStatus[versionId] = info;

      notify();

      // Create Task List for workers
      const tasks: { abbrev: string; ch: number }[] = [];
      for (const book of books) {
        for (let ch = 1; ch <= Number(book.chapters || 0); ch++) {
          tasks.push({ abbrev: book.abbrev.pt, ch });
        }
      }

      // 1. Primary fast track: Attempt bulk download in a single HTTP request (extremely fast and robust!)
      let bulkDownloadSuccess = false;
      try {
        console.log(`[SYNC-BULK] Attempting bulk download for version '${versionId}'...`);
        const bulkRes = await fetch(`/api/bible/bulk/${versionId}`);
        if (bulkRes.ok) {
          const chaptersList = await bulkRes.json();
          if (Array.isArray(chaptersList) && chaptersList.length > 0) {
            console.log(`[SYNC-BULK] Received ${chaptersList.length} chapters. Saving to IndexedDB in batches...`);
            
             let written = 0;
             const totalChapters = chaptersList.length;
             const batchSize = 100;
 
             for (let i = 0; i < totalChapters; i += batchSize) {
               if (stopRequested) break;
               const batch = chaptersList.slice(i, i + batchSize);
               
               await offlineDb.saveChaptersBulk(versionId, batch);
 
               written += batch.length;
               info.progress = Math.min(100, Math.round((written / totalChapters) * 100));
               currentStatus[versionId] = { ...info };
               notify();
               
               // Yield control back to browser UI paint loop
               await new Promise(resolve => setTimeout(resolve, 30));
             }

            bulkDownloadSuccess = true;
            console.log(`[SYNC-BULK] Bulk sync finished for ${versionId}. Success: ${!stopRequested}`);
          }
        }
      } catch (err: any) {
        console.warn(`[SYNC-BULK-ERROR] Bulk download failed, falling back:`, err.message);
      }

      // 2. Secondary fallback path: Copy from ARA or do chapter-by-chapter worker pool
      if (!bulkDownloadSuccess && !stopRequested) {
        let copiedFromAra = false;
        if (versionId === 'arai') {
          const araInfo = await offlineDb.getVersionInfo('ara');
          if (araInfo && araInfo.installed) {
            console.log('[SYNC] ARA is already installed. Copying chapters to ARAi+ locally to save bandwidth & quota!');
            
            for (let i = 0; i < tasks.length; i++) {
              if (stopRequested) break;
              const task = tasks[i];
              
              try {
                const data = await offlineDb.getChapter('ara', task.abbrev, task.ch);
                if (data) {
                  await offlineDb.saveChapter('arai', task.abbrev, task.ch, data);
                }
              } catch (err) {
                console.warn('[COPY_ARA_ERROR]', task.abbrev, task.ch, err);
              }
              
              done++;
              
              // Periodically notify UI to not block the thread
              if (i % 25 === 0 || i === tasks.length - 1) {
                info.progress = Math.round((done / total) * 100);
                currentStatus[versionId] = {
                  ...info
                };
                notify();
                await new Promise(resolve => setTimeout(resolve, 10));
              }
            }
            copiedFromAra = true;
          }
        }

        if (!copiedFromAra) {
          // Concurrency Worker Pool Setup (concurrency = 3 for nice performance and rate protection)
          const limit = 3;
          let taskIndex = 0;

          const runWorker = async () => {
            while (!stopRequested) {
              const index = taskIndex++;
              if (index >= tasks.length) break;
              const task = tasks[index];

              try {
                // Fetch with retry capability
                let data = null;
                let attempt = 0;
                while (attempt < 2 && !data && !stopRequested) {
                  try {
                    data = await bibleService.getChapter(
                      versionId,
                      task.abbrev,
                      task.ch,
                      true
                    );
                  } catch (err) {
                    attempt++;
                    if (attempt < 2) {
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }
                  }
                }

                if (data) {
                  await offlineDb.saveChapter(
                    versionId,
                    task.abbrev,
                    task.ch,
                    data
                  );
                }
              } catch (err) {
                console.warn('[SYNC_CHAPTER_ERROR]', versionId, task.abbrev, task.ch, err);
              }

              done++;
              info.progress = Math.round((done / total) * 100);
              currentStatus[versionId] = {
                ...info
              };
              notify();

              // Slower delay (150ms) to ensure politeness to external APIs and server
              await new Promise(resolve => setTimeout(resolve, 150));
            }
          };

          const workers = Array.from({ length: limit }, () => runWorker());
          await Promise.all(workers);
        }
      }

      if (!stopRequested) {
        info.installed = true;
        info.downloading = false;
        info.progress = 100;

        await offlineDb.saveVersionInfo(info);

        currentStatus[versionId] = {
          ...info
        };

        notify();

        console.log(
          '[BIBLE INSTALLED]',
          versionId
        );
      } else {
        console.log('[BIBLE INSTALLED CANCELLED/STOPPED]', versionId);
      }

    } catch (err) {

      console.error(
        '[SYNC_VERSION_ERROR]',
        err
      );
    }
  },

  // =========================================
  // DOWNLOAD DICIONÁRIO
  // =========================================
  async syncDictionary(id: string, customType?: string, customCategory?: string) {

    console.log(
      '[SYNC_DICTIONARY]',
      id,
      customType,
      customCategory
    );

    const resolvedType = (customType || (id === 'beacon' || id === 'moody' ? 'commentary' : 'dictionary')) as any;
    const resolvedCategory = (customCategory || (id === 'beacon' || id === 'moody' ? 'commentary' : 'dictionary')) as any;

    try {

      const info: OfflineVersion = {
        id,
        name: FRIENDLY_NAMES[id] || id,
        type: resolvedType,
        category: resolvedCategory,
        installed: false,
        downloading: true,
        progress: 0,
        lastUpdate: Date.now()
      };

      currentStatus[id] = info;

      notify();

      // =====================================
      // CARREGA JSON (COM FALLBACK PARA SEED_DATA)
      // =====================================
      let entries: any[] = [];
      try {
        const response = await fetch(`/dictionaries/${id}.json`);
        if (!response.ok) {
          throw new Error('404');
        }
        entries = await response.json();
      } catch (err) {
        console.log(`[SYNC_DICTIONARY] Fetch falhou para ${id}.json, usando dados de semente offline.`);
        entries = SEED_DATA[id] || [];
        if (entries.length === 0) {
          throw new Error(`Arquivo não encontrado e sem dados de semente para: ${id}.json`);
        }
      }

      console.log(
        '[RAW DICTIONARY ENTRIES]',
        entries?.length
      );

      if (
        !Array.isArray(entries)
      ) {

        throw new Error(
          'JSON do dicionário inválido'
        );
      }

      // =====================================
      // LIMPA DADOS ANTIGOS
      // =====================================
      await offlineDb.removeDictionaryData(id);

      // =====================================
      // SALVA ENTRIES
      // =====================================
      let saved = 0;

      for (const entry of entries) {

        try {

          const lemma =
            entry?.lemma ||
            entry?.word ||
            entry?.title ||
            entry?.term ||
            '';

          const definition =
            entry?.definition ||
            entry?.content ||
            entry?.entry ||
            '';

          if (
            !lemma ||
            !definition
          ) {
            continue;
          }

          await offlineDb.saveDictionaryEntry({

            id:
              entry?.id ||
              `${id}_${saved}`,

            lemma,
            word: lemma,
            definition,

            type:
              entry?.type ||
              (
                id.includes('strong')
                  ? 'strong'
                  : 'dictionary'
              ),

            moduleId: id
          });

          saved++;

          info.progress = Math.round(
            (saved / entries.length) * 100
          );

          currentStatus[id] = {
            ...info
          };

          notify();

        } catch (entryErr) {

          console.error(
            '[ENTRY_SAVE_ERROR]',
            entryErr
          );
        }
      }

      console.log(
        '[DICTIONARY SAVED]',
        saved
      );

      // =====================================
      // FINALIZA
      // =====================================
      const installedInfo: OfflineVersion = {
        id,
        name: FRIENDLY_NAMES[id] || id,
        type: resolvedType,
        category: resolvedCategory,
        installed: true,
        downloading: false,
        progress: 100,
        lastUpdate: Date.now()
      };

      await offlineDb.saveVersionInfo(
        installedInfo
      );

      currentStatus[id] = installedInfo;

      notify();

      await offlineDb.audit();

      return true;

    } catch (err) {

      console.error(
        '[SYNC_DICTIONARY_ERROR]',
        err
      );

      currentStatus[id] = {
        id,
        name: FRIENDLY_NAMES[id] || id,
        type: resolvedType,
        category: resolvedCategory,
        installed: false,
        downloading: false,
        progress: 0,
        lastUpdate: Date.now()
      };

      notify();

      return false;
    }
  },

  // =========================================
  // REMOVER MÓDULO
  // =========================================
  async removeModule(
    id: string,
    type: string
  ) {

    console.log(
      '[REMOVE_MODULE]',
      id,
      type
    );

    try {

      // =====================================
      // REMOVE DADOS DO DICIONÁRIO OU BÍBLIA
      // =====================================
      if (
        type === 'dictionary'
      ) {

        await offlineDb.removeDictionaryData(
          id
        );
      } else if (
        type === 'bible'
      ) {

        await offlineDb.removeBibleData(
          id
        );
      }

      // =====================================
      // REMOVE STATUS
      // =====================================
      delete currentStatus[id];

      notify();

      console.log(
        '[MODULE REMOVED SUCCESS]',
        id
      );

      return true;

    } catch (err) {

      console.error(
        '[REMOVE_MODULE_ERROR]',
        err
      );

      return false;
    }
  }
};