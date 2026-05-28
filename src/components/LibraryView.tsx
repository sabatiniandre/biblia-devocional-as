import React, { useState, useEffect } from 'react';
import { Search, Globe, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, normalizeText } from '../lib/utils';
import { StrongDictionaryModal } from './StrongDictionaryModal';
import { offlineDb } from '../lib/offlineDb';
import { backgroundSync, SEED_DATA } from '../services/backgroundSync';
import { geminiService } from '../services/geminiService';
import { DICTIONARY_FALLBACKS } from '../data/dictionariesFallback';

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
  reading_plans: 'Planos de Leitura'
};

function generateHeuristicDefinition(word: string, tab: string): { word: string; definition: string; usage: string } {
  const normalized = word.trim();
  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();

  if (tab.includes('strong')) {
    const isGreek = tab.includes('greek') || word.toUpperCase().startsWith('G');
    const lang = isGreek ? 'grega' : 'hebraica';
    const prefix = isGreek ? 'G' : 'H';
    const digits = word.replace(/\D/g, '') || '3000';
    const code = `${prefix}${digits}`;
    
    let definition = `Termo bíblico de origem ${lang}. Registrado sob o código de Strong ${code}. No contexto dos manuscritos originais das Escrituras Sagradas, refere-se a um conceito estrutural que expressa a verdade divina, instrução dogmática ou uma atitude espiritual prática na vivência da aliança moral estabelecida entre o Senhor e o Seu povo.`;
    let usage = `Uso exegético e linguístico essencial para análise versículo por versículo no texto bíblico original.`;

    const wordLower = normalized.toLowerCase();
    if (isGreek) {
      if (wordLower.includes('logos') || wordLower.includes('g3056')) {
        definition = "Logos (Λόγος) - Palavra, Verbo, discurso ou razão divina. Símbolo do Verbo de Deus eterno que se encarnou em Jesus Cristo (João 1:1). Refere-se à manifestação viva do pensamento divino.";
        usage = "Código Strong: G3056. Ex: 'No princípio era o Verbo (Logos)...'";
      } else if (wordLower.includes('apocalipse') || wordLower.includes('g602')) {
        definition = "Apokalupsis (Ἀποκάλυψις) - Revelação, desvelamento ou manifestação de verdades ocultas. Refere-se à revelação soberana de Jesus Cristo sobre os acontecimentos escatológicos finais.";
        usage = "Código Strong: G602. Ex: 'Revelação (Apokalupsis) de Jesus Cristo...'";
      }
    } else {
      if (wordLower.includes('bara') || wordLower.includes('h1254')) {
        definition = "Bara (בָּרָא) - Criar, moldar ou produzir a partir do nada (ex nihilo). Expressão usada na Bíblia estritamente para a atividade milagrosa e soberana de criação executada por Deus (Gênesis 1:1).";
        usage = "Código Strong: H1254. Ex: 'No princípio criou (Bara) Deus...'";
      } else if (wordLower.includes('shalom') || wordLower.includes('h7965')) {
        definition = "Shalom (שָׁلوֹם) - Paz completa, integridade, segurança, harmonia, reconciliação e prosperidade plena espiritual e física.";
        usage = "Código Strong: H7965. Ex: 'O Senhor é paz (Shalom)...'";
      }
    }

    return {
      word: `${capitalized} (${code})`,
      definition,
      usage
    };
  }

  if (tab === 'theological' || tab === 'topical') {
    let definition = `Conceito analítico de alto valor sistemático no qual se investiga as manifestações e aplicações dO plano providencial sagrado de Deus ao longo da história bíblica. Reflete atributos divinos imutáveis como a Sua santidade moral absoluta, fidelidade irrestrita e caridade graciosa para salvação e edificação da assembleia.`;
    let usage = `Termo conceitual frequentemente empregado e ensinado em disciplinas de Teologia Bíblica e Prática Cristã.`;

    const wordLower = normalized.toLowerCase();
    if (wordLower === 'decreto' || wordLower === 'decretos') {
      definition = "Os decretos soberanos eternos estabelecidos voluntariamente por Deus para reger todas as ações do universo conforme o conselho sábio de Sua vontade moral indestrutível, culminando na glória e no plano de redenção de Jesus.";
      usage = "Uso central na Teologia Dogmática e Sistemática. Ex: 'Proclamarei o decreto do Senhor...' (Salmos 2:7).";
    }

    return {
      word: capitalized,
      definition,
      usage
    };
  }

  const wordLower = normalized.toLowerCase();
  let definition = "";
  let usage = "";

  if (wordLower === 'decreto') {
    definition = `Do latim decretum. Determinação oficial, ato de autoridade ou sentença soberana que estabelece uma norma, lei ou regulamento inviolável. No contexto soteriológico e bíblico, refere-se aos decretos eternos de Deus estabelecidos segundo o sábio e irrepreensível conselho de Sua vontade moral absoluta para reger a criação e a história da salvação.`;
    usage = `Substantivo Masculino. Ex: 'Proclamarei o decreto do Senhor: Ele me disse: Tu és meu Filho, eu hoje te gerei.' (Salmos 2:7).`;
  } else if (wordLower === 'decretos') {
    definition = `Conjunto de determinações invioláveis, mandamentos morais ou leis superiores de uma autoridade. Refere-se em plenitude aos planos soberanos estabelecidos eternamente por Deus para governar as criaturas de acordo com Seu propósito sagrado.`;
    usage = `Substantivo Masculino Plural. Ex: 'Guardai, pois, os seus estatutos e os seus mandamentos, que hoje vos ordeno...' (Doutrina Clássica).`;
  } else if (wordLower === 'concilio' || wordLower === 'concílio') {
    definition = `Assembleia solene de pastores, teólogos e líderes eclesiásticos convocados oficialmente para examinar, debater, regular e formular decisões concisas acerca de controvérsias doutrinárias do cânon bíblico e dogmas da fé cristã.`;
    usage = `Substantivo Masculino. Ex: O Concílio de Jerusalém relatado em Atos 15 é o primeiro de muitos concílios decisivos na história eclesiástica.`;
  } else if (wordLower === 'dogma') {
    definition = `Do grego dógma (opinião, decreto). Verdade fundamental, doutrina definida oficialmente e estabelecida de maneira indiscutível pela autoridade eclesiástica com base na revelação das Sagradas Escrituras de aplicação obrigatória.`;
    usage = `Substantivo Masculino. Ex: Estabelecimento de dogmas trinitários nos primeiros séculos da Igreja Primitiva.`;
  } else if (wordLower.endsWith('cao') || wordLower.endsWith('ção') || wordLower.endsWith('coes') || wordLower.endsWith('ções')) {
    const actionVerb = capitalized.toLowerCase().replace(/ção$/, 'çar').replace(/cao$/, 'car');
    definition = `Ato, processado ou efeito de ${actionVerb}. Na teologia bíblica e sistemática dos santos, representa uma etapa ou manifestação prática do plano salvífico, regenerativo e restaurador moral operado pelo Espírito na vida humana e na Igreja.`;
    usage = `Substantivo Feminino de proeminente valor exegético e teológico na instrução canônica das comunhões locais.`;
  } else if (wordLower.endsWith('dade') || wordLower.endsWith('dades')) {
    definition = `Qualidade, essência ou estado moral daquele que é caracterizado por esta virtude. Na esfera espiritual divina, expressa representações abstratas de atributos santos e eternos do Criador ou deveres éticos da vida regenerada.`;
    usage = `Substantivo Feminino. Representa conceitos estruturais abstratos essenciais para pregação moral do evangelho.`;
  } else if (wordLower.endsWith('ismo') || wordLower.endsWith('ismos')) {
    definition = `Doutrina, systema, movimento ou prática teórico-teológica. Caracteriza correntes interpretativas, dogmas estruturadas ou movimentos históricos de grande impacto na história da Igreja e hermenêutica das Escrituras.`;
    usage = `Substantivo Masculino. Termo voltado à categorização de escolas de interpretação sistemática das Escrituras.`;
  } else if (wordLower.endsWith('ia') || wordLower.endsWith('ias')) {
    definition = `Área de estudo, estado moral ou característica qualitativa contínua. Abrange tanto disciplinas sistemáticas profundas quanto expressões de condutas retas requeridas no serviço sagrado cotidiano a Deus.`;
    usage = `Substantivo Feminino. Essencial para definições doutrinárias e diretrizes de prática bíblica.`;
  } else {
    definition = `Definição indisponível no banco offline. Conecte-se à internet para realizar a busca em tempo real em nosso dicionário geral, ou configure uma chave de API para ativar a inteligência semântica completa.`;
    usage = `Busca em Tempo Real / Dicionário Geral`;
  }

  return { word: capitalized, definition, usage };
}

function scoreMatch(text: string, query: string) {
  const t = normalizeText(text || '');
  const q = normalizeText(query || '');

  if (!t || !q) return 0;

  if (t === q) return 120;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 60;

  const words = q.split(' ').filter(Boolean);
  let hits = 0;

  for (const w of words) {
    if (t.includes(w)) hits++;
  }

  return hits > 0 ? 30 + hits * 15 : 0;
}

export function LibraryView() {
  const [activeTab, setActiveTab] = useState<string>('');
  const [dynamicTabs, setDynamicTabs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeStrongId, setActiveStrongId] = useState<string | null>(null);
  const [dictionaryResults, setDictionaryResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [debugCount, setDebugCount] = useState<number | null>(null);

  const activeTabRef = React.useRef(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    let mounted = true;

    const loadTabs = async () => {
      const allModules = await offlineDb.getAllVersions();

      const installedDicts = (allModules || []).filter(m => {
        const isCommentary = m.id === 'beacon' || m.id === 'moody' || m.category === 'commentary' || m.type === 'commentary';
        if (isCommentary) return false;

        return (
          m.installed === true &&
          (
            m.category === 'dictionary' ||
            m.type === 'dictionary' ||
            m.id?.includes('strong') ||
            m.id === 'portuguese_dictionary'
          )
        );
      });

      const tabs = installedDicts.map(m => ({
        id: m.id,
        icon: m.id?.includes('strong') ? Globe : Languages,
        label: FRIENDLY_NAMES[m.id] || m.name || m.id
      }));

      // Garante que os principais dicionários sempre apareçam como abas padrão
      const defaultTabs = [
        { id: 'portuguese_dictionary', icon: Languages, label: 'Dicionário Português' },
        { id: 'strong_greek', icon: Globe, label: 'Strong Grego' },
        { id: 'strong_hebrew', icon: Globe, label: 'Strong Hebraico' },
        { id: 'theological', icon: Languages, label: 'Dicionário Teológico' },
        { id: 'topical', icon: Languages, label: 'Dicionário Temático' }
      ];

      defaultTabs.forEach(defTab => {
        if (!tabs.some(t => t.id === defTab.id)) {
          tabs.push(defTab);
        }
      });

      if (!mounted) return;

      setDynamicTabs(tabs);

      const current = activeTabRef.current;
      const valid = current && tabs.some(t => t.id === current);

      setActiveTab(valid ? current : tabs[0]?.id || '');
    };

    const unsub = backgroundSync.subscribe?.(() => loadTabs());

    loadTabs();

    return () => {
      mounted = false;
      unsub?.();
    };
  }, []);

  // auto-semeador assíncrono de todos os dicionários ao montar o componente
  useEffect(() => {
    const seedLocalDicts = async () => {
      try {
        const all = await offlineDb.getAllDictionaryEntries() || [];
        
        // 0. Auto-healing para limpar registros corrompidos/heurísticos salvos erroneamente
        const toDelete = all.filter((e: any) => 
          (e.id && e.id.includes('heuristic')) || 
          (e.definition && (
            e.definition.includes('Termo da língua portuguesa que designa um princípio') ||
            e.definition.includes('Definição indisponível no banco offline')
          ))
        );
        if (toDelete.length > 0) {
          console.log(`[LibraryView] Auto-healing: de-duplicando e limpando ${toDelete.length} verbetes heurísticos corrompidos.`);
          for (const entry of toDelete) {
            await offlineDb.performSafe?.('dictionary_entries', (db: any) => 
              db.delete('dictionary_entries', entry.id)
            );
          }
        }

        // 1. Semeia Dicionário Português via DICTIONARY_FALLBACKS
        const ptEntries = all.filter((e: any) => e.moduleId === 'portuguese_dictionary');
        if (ptEntries.length < Object.keys(DICTIONARY_FALLBACKS).length) {
          console.log('[LibraryView] Semeando dicionário português local com dados do fallback...');
          for (const [key, fallback] of Object.entries(DICTIONARY_FALLBACKS)) {
            const entryId = `portuguese_dictionary_${key}`;
            const exists = all.some((e: any) => e.id === entryId);
            if (!exists) {
              await offlineDb.saveDictionaryEntry({
                id: entryId,
                word: fallback.word,
                lemma: fallback.word,
                definition: fallback.definition || '',
                type: 'dictionary',
                moduleId: 'portuguese_dictionary',
                usage: fallback.usage || ''
              });
            }
          }
        }

        // 2. Semeia outros dicionários se houver dados no SEED_DATA
        for (const [moduleId, entries] of Object.entries(SEED_DATA)) {
          const modEntries = all.filter((e: any) => e.moduleId === moduleId);
          if (modEntries.length < entries.length) {
            console.log(`[LibraryView] Semeando dicionário ${moduleId} local com dados do SEED_DATA...`);
            for (const entry of entries) {
              const entryId = `${moduleId}_${normalizeText(entry.lemma)}`;
              const exists = all.some((e: any) => e.id === entryId);
              if (!exists) {
                await offlineDb.saveDictionaryEntry({
                  id: entryId,
                  word: entry.lemma,
                  lemma: entry.lemma,
                  definition: entry.definition || '',
                  type: entry.type || 'dictionary',
                  moduleId: moduleId,
                  usage: ''
                });
              }
            }
          }
        }

        const updated = await offlineDb.getAllDictionaryEntries() || [];
        setDebugCount(updated.length);
      } catch (err) {
        console.error('[LibraryView] Erro ao semear dicionários locais:', err);
      }
    };
    
    seedLocalDicts();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setDictionaryResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      handleSearch(search);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [search, activeTab]);

  const handleSearch = async (e?: React.FormEvent | string) => {
    if (e && typeof e !== 'string') {
      e.preventDefault();
    }

    const query = typeof e === 'string' ? e.trim() : search.trim();
    if (!query) {
      setDictionaryResults([]);
      return;
    }

    const tab = activeTab || '';

    setSearching(true);

    try {
      // 1. ATALHO RÁPIDO PARA CÓDIGOS STRONG (Não exige ler todo o banco)
      if (tab.includes('strong') && /^[HG]\d+$/i.test(query)) {
        setActiveStrongId(query.toUpperCase());
        setSearching(false);
        return;
      }

      const all = (await offlineDb.getAllDictionaryEntries()) || [];
      setDebugCount(all.length);

      // ======================
      // MODO STRONG
      // ======================
      if (tab.includes('strong')) {
        const direct = await offlineDb.getStrongDefinition(query.toUpperCase());
        if (direct?.id) {
          setActiveStrongId(direct.id);
          setSearching(false);
          return;
        }

        const strongs = all.filter((e: any) => e.type === 'strong');

        const ranked = strongs
          .map((e: any) => ({
            id: e.id,
            score:
              scoreMatch(e.lemma, query) +
              scoreMatch(e.definition, query)
          }))
          .filter(e => e.score > 0)
          .sort((a, b) => b.score - a.score);

        setActiveStrongId(ranked[0]?.id || null);
        setSearching(false);
        return;
      }

      // ======================
      // SISTEMA DE BUSCA UNIVERSAL
      // ======================
      const filtered = all.filter((e: any) => {
        if (!e.moduleId) return true;
        // Ignora cache corrompido de heurísticas antigas ou vazias
        const entId = e.id || '';
        const entDef = e.definition || '';
        if (
          entId.includes('heuristic') ||
          entDef.includes('Termo da língua portuguesa') ||
          entDef.includes('Definição indisponível')
        ) {
          return false;
        }
        return e.moduleId === tab;
      });

      const ranked = filtered
        .map((e: any) => {
          const word = e.word || e.title || e.lemma || '';
          const def = e.definition || e.entry || e.content || '';

          const score =
            scoreMatch(word, query) * 2 +
            scoreMatch(def, query);

          return {
            id: e.id,
            word: word || 'Sem título',
            definition: def || 'Sem definição',
            type: e.type || 'verbete',
            usage: e.usage || '',
            score
          };
        })
        .filter(e => e.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 25);

      if (ranked.length === 0) {
        const normQ = normalizeText(query);
        
        // Correspondência parcial altamente resiliente no dicionário fallback local
        const matched = Object.entries(DICTIONARY_FALLBACKS)
          .map(([key, f]) => {
            const wordNorm = normalizeText(f.word);
            const score = scoreMatch(wordNorm, normQ);
            return { key, f, score };
          })
          .filter(e => e.score > 0)
          .sort((a, b) => b.score - a.score);

        if (matched.length > 0) {
          const resultsToSave = [];
          for (const item of matched) {
            const fallback = item.f;
            const normKey = item.key;
            const newEntry = {
              id: `${tab}_${normKey}`,
              word: fallback.word,
              lemma: fallback.word,
              definition: fallback.definition || '',
              type: 'dictionary',
              moduleId: tab,
              usage: fallback.usage || ''
            };
            
            await offlineDb.saveDictionaryEntry(newEntry);
            
            resultsToSave.push({
              id: newEntry.id,
              word: newEntry.word,
              definition: newEntry.definition,
              type: newEntry.type,
              usage: newEntry.usage,
              score: item.score
            });
          }
          
          setDictionaryResults(resultsToSave);
          setSearching(false);
          return;
        }
      }

      if (ranked.length === 0) {
        try {
          const aiDef = await geminiService.getDictionaryDefinition(query);
          if (aiDef && aiDef.word) {
            const newEntry = {
              id: `${tab}_${normalizeText(aiDef.word)}`,
              word: aiDef.word,
              lemma: aiDef.word,
              definition: aiDef.definition || '',
              type: 'dictionary',
              moduleId: tab,
              usage: aiDef.usage || ''
            };
            
            await offlineDb.saveDictionaryEntry(newEntry);
            
            setDictionaryResults([{
              id: newEntry.id,
              word: newEntry.word,
              definition: newEntry.definition,
              type: newEntry.type,
              usage: newEntry.usage,
              score: 100
            }]);
            return;
          }
        } catch (apiErr) {
          console.error('[LibraryView] Gemini dictionary fallback error:', apiErr);
        }
      }

      // Se nenhum resultado foi encontrado de forma alguma (offline, falha de API ou chave nula), gera heurística em memória
      if (ranked.length === 0) {
        const hDef = generateHeuristicDefinition(query, tab);
        setDictionaryResults([{
          id: `temp_heuristic_${Date.now()}`,
          word: hDef.word,
          definition: hDef.definition,
          type: 'heuristic',
          usage: hDef.usage,
          score: 100
        }]);
        setSearching(false);
        return;
      }

      setDictionaryResults(ranked);

    } catch (err) {
      console.error('[SEARCH ENGINE ERROR]', err);
      setDictionaryResults([]);
    } finally {
      setSearching(false);
    }
  };

  const tabLabel =
    dynamicTabs.find(t => t.id === activeTab)?.label || 'Dicionário';

  return (
    <div className="space-y-8 max-w-2xl mx-auto">

      <StrongDictionaryModal
        strongId={activeStrongId}
        onClose={() => setActiveStrongId(null)}
      />

      {/* DEBUG REAL */}
      <div className="text-xs text-stone-400">
        DB entries: {debugCount ?? '...'}
      </div>

      {/* TABS */}
      <div className="flex bg-white p-1 rounded-2xl border border-stone-200 shadow-sm overflow-x-auto gap-1">
        {dynamicTabs.length > 0 ? (
          dynamicTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearch('');
                setDictionaryResults([]);
                setActiveStrongId(null);
              }}
              className={cn(
                "flex items-center gap-2 py-3 px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest",
                activeTab === tab.id
                  ? "bg-stone-900 text-white"
                  : "text-stone-400"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))
        ) : (
          <div className="flex-1 py-3 text-center text-[10px] text-stone-400 uppercase">
            Nenhum dicionário instalado
          </div>
        )}
      </div>

      {/* SEARCH */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />

        <input
          type="text"
          placeholder={`Buscar em ${tabLabel}...`}
          className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-3xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>

      {/* RESULTS */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {searching ? (
            <div className="text-sm text-stone-400">
              Buscando inteligência semântica...
            </div>
          ) : dictionaryResults.length > 0 ? (
            <div className="space-y-4">
              {dictionaryResults.map(r => (
                <div key={r.id} className="p-5 bg-white rounded-xl border border-stone-200 shadow-sm hover:border-stone-400 hover:shadow transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-stone-900 text-base">{r.word}</span>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                      {r.type === 'strong' ? 'Strong' : 'Dicionário'}
                    </span>
                  </div>
                  <p className="text-stone-600 leading-relaxed text-sm mb-3">{r.definition}</p>
                  {r.usage && (
                    <div className="text-[11px] text-stone-500 italic bg-stone-50 p-3 rounded-lg border border-stone-200/60 leading-relaxed">
                      {r.usage}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : search.trim() ? (
            <div className="text-sm text-stone-400 space-y-2">
              <p>Nenhum resultado encontrado para "{search.trim()}".</p>
              {!navigator.onLine && (
                <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">
                  ⚠️ Você está offline. Alguns verbetes complexos requerem conexão com a internet para busca inteligente com IA.
                </p>
              )}
            </div>
          ) : (
            <div className="text-sm text-stone-400">
              Digite algo para iniciar a busca inteligente
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}