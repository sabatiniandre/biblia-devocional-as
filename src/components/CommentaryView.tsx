import React, { useState, useEffect } from 'react';
import { 
  Book, 
  Search, 
  ChevronRight, 
  Info, 
  Loader2,
  Library,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, normalizeText } from '../lib/utils';
import { offlineDb, OfflineVersion } from '../lib/offlineDb';
import { backgroundSync } from '../services/backgroundSync';
import { geminiService } from '../services/geminiService';

interface CommentaryViewProps {
  currentReference?: {
    bookId: string;
    bookName: string;
    chapter: number;
    verse?: number;
  };
}

export const CommentaryView: React.FC<CommentaryViewProps> = ({ currentReference }) => {
  const [installedCommentaries, setInstalledCommentaries] = useState<OfflineVersion[]>([]);
  const [activeCommentaryId, setActiveCommentaryId] = useState<string>('');
  const [search, setSearch] = useState(currentReference ? `${currentReference.bookName} ${currentReference.chapter}` : '');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>({});

  useEffect(() => {
    const loadModules = async () => {
      const all = await offlineDb.getAllVersions();
      const commentaries = all.filter(m => m.installed && (m.category === 'commentary' || m.type === 'commentary'));
      setInstalledCommentaries(commentaries);
      
      if (commentaries.length > 0 && !activeCommentaryId) {
        setActiveCommentaryId(commentaries[0].id);
      }
    };

    loadModules();
    const unsub = backgroundSync.subscribe(() => {
      loadModules();
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (activeCommentaryId && search) {
      handleSearch();
    }
  }, [activeCommentaryId]);

  // Auto-search when reference changes
  useEffect(() => {
    if (currentReference) {
      const refSearch = `${currentReference.bookName} ${currentReference.chapter}`;
      setSearch(refSearch);
      if (activeCommentaryId) {
        handleSearch(refSearch);
      }
    }
  }, [currentReference]);

  const handleSearch = async (overrideSearch?: string) => {
    const query = (overrideSearch || search).trim();
    if (!query || !activeCommentaryId) return;

    setLoading(true);
    try {
      const queryNorm = normalizeText(query);
      const allEntries = await offlineDb.getAllDictionaryEntries();
      
      console.log(`[COMMENTARY SEARCH] ${activeCommentaryId}`, { query, queryNorm, totalEntries: allEntries.length });

      // Filter by active commentary module and match query
      const matches = allEntries.filter(e => {
        const isCommentary = e.type === 'commentary' || (e as any).type === 'commentary';
        const isFromModule = e.moduleId === activeCommentaryId || e.id.toLowerCase().startsWith(`${activeCommentaryId}_`);
        
        if (!isCommentary || !isFromModule) return false;

        const lemmaNorm = normalizeText(e.lemma || '');
        const defNorm = normalizeText(e.definition || '');
        
        // Match in lemma or definition
        return lemmaNorm.includes(queryNorm) || defNorm.includes(queryNorm);
      }).map(e => ({
        id: e.id,
        title: e.lemma,
        content: e.definition,
        module: e.moduleId || e.type
      }));

      console.log("[COMMENTARY MATCHES]", matches.length);

      if (matches.length === 0) {
        try {
          const aiComm = await geminiService.getCommentary(activeCommentaryId, query);
          if (aiComm && aiComm.title) {
            const newEntry = {
              id: `${activeCommentaryId}_${normalizeText(query)}`,
              word: query,
              lemma: aiComm.title,
              definition: aiComm.content || '',
              type: 'commentary',
              moduleId: activeCommentaryId
            };
            
            await offlineDb.saveDictionaryEntry(newEntry);
            
            setResults([{
              id: newEntry.id,
              title: newEntry.lemma,
              content: newEntry.definition,
              module: newEntry.moduleId
            }]);
            return;
          }
        } catch (apiErr) {
          console.error('[CommentaryView] Gemini commentary fallback error:', apiErr);
        }
      }

      setResults(matches);
    } catch (err) {
      console.error("[COMMENTARY SEARCH ERROR]", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-6">
        <h2 className="text-2xl font-serif font-bold text-stone-900 mb-1 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-stone-400" />
          Comentários Bíblicos
        </h2>
        <p className="text-stone-500 text-sm italic">Estudo aprofundado versículo por versículo.</p>
      </header>

      {/* Module Selector */}
      <div className="flex bg-stone-100 p-1 rounded-2xl mb-4 overflow-x-auto scrollbar-none flex-nowrap gap-1">
        {installedCommentaries.length > 0 ? installedCommentaries.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveCommentaryId(m.id)}
            className={cn(
              "flex-none px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
              activeCommentaryId === m.id 
                ? "bg-white text-stone-900 shadow-sm" 
                : "text-stone-400 hover:text-stone-600"
            )}
          >
            {m.name}
          </button>
        )) : (
          <div className="flex-1 py-2 text-center text-[10px] font-bold text-stone-400 uppercase tracking-widest italic">
            Nenhum comentário instalado
          </div>
        )}
      </div>

      <div className="relative mb-6">
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar comentário (ex: Mateus 1)..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-3xl shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-100 transition-all text-stone-800"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <button 
          onClick={() => handleSearch()}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400 uppercase tracking-widest hover:text-stone-900 transition-colors"
        >
          Buscar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-stone-200">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-20 text-center"
            >
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-stone-200 mb-4" />
              <p className="text-stone-400 font-serif italic">Buscando explicações...</p>
            </motion.div>
          ) : results.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {results.map((res, idx) => (
                <div key={res.id || idx} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:border-stone-200 transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-stone-900 font-serif text-lg">{res.title}</h4>
                    <span className="text-[9px] font-bold text-stone-300 bg-stone-50 px-2 py-1 rounded-md uppercase tracking-widest group-hover:text-stone-500 transition-colors">
                      {installedCommentaries.find(c => c.id === activeCommentaryId)?.name || 'Comentário'}
                    </span>
                  </div>
                  <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">{res.content}</p>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="py-16 text-center bg-stone-50/50 rounded-[2.5rem] border-2 border-dashed border-stone-100"
            >
              {installedCommentaries.length === 0 ? (
                <div className="px-8 flex flex-col items-center">
                  <Library className="w-12 h-12 text-stone-100 mb-4" />
                  <p className="text-stone-500 font-serif italic text-lg mb-2">Biblioteca Vazia</p>
                  <p className="text-stone-400 text-sm mb-6 max-w-xs mx-auto">
                    Baixe os módulos de comentários (Moody, Henry, etc.) na aba de ajustes para ter acesso offline.
                  </p>
                  <div className="p-4 bg-orange-50 rounded-2xl flex items-center gap-3 text-left">
                    <AlertCircle className="w-5 h-5 text-orange-400 shrink-0" />
                    <p className="text-[10px] text-orange-700 font-medium">Acesse "Ajustes" no menu lateral para instalar novos módulos.</p>
                  </div>
                </div>
              ) : (
                <div className="px-8">
                  <Book className="w-12 h-12 text-stone-100 mx-auto mb-4" />
                  <p className="text-stone-500 font-serif italic text-lg">{search ? "Não encontrado" : "Verbetes do Comentário"}</p>
                  <p className="text-stone-400 text-sm mt-1">
                    {search ? "Tente buscar pela referência simplificada (ex: Joao 3)." : "Selecione a referência acima para consultar os comentários."}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 p-4 bg-stone-50 rounded-2xl flex items-start gap-4">
        <Info className="w-4 h-4 text-stone-300 shrink-0 mt-1" />
        <p className="text-[10px] text-stone-500 italic leading-relaxed">
          Os comentários são ferramentas de apoio e devem ser conferidos com as Escrituras. Todos os dados carregados estão salvos permanentemente em seu dispositivo.
        </p>
      </div>
    </div>
  );
};
