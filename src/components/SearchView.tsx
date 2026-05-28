import React, { useState } from 'react';
import { bibleService } from '../services/bibleService';
import { Search, BookOpen, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { User } from 'firebase/auth';
import { GoogleGenAI } from "@google/genai";

interface SearchViewProps {
  user: User;
  reference: string;
  setReference: (ref: string) => void;
  setTab: (tab: any) => void;
}

export function SearchView({ user, reference, setReference, setTab }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAiResult, setIsAiResult] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setIsAiResult(false);
    try {
      const version = reference.split('/')[0] || 'ara';
      const data = await bibleService.search(version, query);
      
      if (data && data.verses) {
        setResults(data.verses);
        setIsAiResult(data.meta?.source === 'ai');
      } else if (data && Array.isArray(data)) {
        setResults(data);
      } else {
        throw new Error('Nenhum resultado encontrado.');
      }
    } catch (err: any) {
      setError(err.message || 'Falha na busca. Tente termos diferentes.');
    } finally {
      setLoading(false);
    }
  };

  const goToVerse = (verse: any) => {
    const version = reference.split('/')[0] || 'ara';
    const abbrev = typeof verse.book.abbrev === 'string' ? verse.book.abbrev : verse.book.abbrev.pt;
    setReference(`${version}/${abbrev}/${verse.chapter}`);
    setTab('read');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-stone-400" />
          <input 
            type="text" 
            placeholder="Pesquisar palavras ou versículos..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-3xl shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-200 text-stone-800"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && (
            <div className="absolute right-4">
              <Loader2 className="w-5 h-5 text-stone-400 animate-spin" />
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-stone-400 px-4 italic">
          Ex: "amor", "fé em deus", "salmos 23"
        </p>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-700 text-center font-serif text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {results.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">
                Resultados da Pesquisa ({results.length})
              </h3>
              {isAiResult && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                  <Sparkles className="w-2.5 h-2.5" />
                  AI Powered
                </div>
              )}
            </div>
            {results.map((verse, i) => (
              <motion.button 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => goToVerse(verse)}
                className="w-full text-left bg-white p-6 rounded-2xl border border-stone-100 hover:border-stone-300 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-serif font-bold text-stone-900 group-hover:text-stone-800">
                    {verse.book.name} {verse.chapter}:{verse.number}
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors" />
                </div>
                <p className="text-stone-600 font-serif leading-relaxed line-clamp-3 italic">
                  "{verse.text}"
                </p>
              </motion.button>
            ))}
          </div>
        ) : query && !loading ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-stone-100">
            <Search className="w-12 h-12 text-stone-200 mx-auto mb-4" />
            <p className="text-stone-500 font-serif italic text-lg">Nenhum resultado encontrado para "{query}"</p>
          </div>
        ) : !query && (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-stone-100 mx-auto mb-4" />
            <p className="text-stone-400 font-serif italic">Digite algo para começar sua pesquisa</p>
          </div>
        )}
      </div>
    </div>
  );
}
