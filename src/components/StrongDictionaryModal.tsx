import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Book, Volume2, Search, Loader2 } from 'lucide-react';
import { strongService } from '../services/bibleService';

interface StrongDictionaryModalProps {
  strongId: string | null;
  onClose: () => void;
}

export const StrongDictionaryModal: React.FC<StrongDictionaryModalProps> = ({ strongId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadTip, setDownloadTip] = useState(false);

  useEffect(() => {
    if (strongId) {
      fetchDefinition(strongId);
      setDownloadTip(false);
    }
  }, [strongId]);

  const fetchDefinition = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await strongService.getDefinition(id);
      console.log("[STRONG LOOKUP RESULT]", result);
      if (!result) {
        if (!navigator.onLine) {
          setError('OFFLINE_NO_DICT');
        } else {
          setError('Verbete não encontrado nos dicionários online e offline.');
        }
      } else {
        setData(result);
      }
    } catch (err) {
      if (!navigator.onLine) {
        setError('OFFLINE_NO_DICT');
      } else {
        setError('Não foi possível carregar a definição no momento.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDict = () => {
    setDownloadTip(true);
  };

  return (
    <AnimatePresence>
      {strongId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative z-10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center">
                  <Book className="w-6 h-6 text-stone-900" />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-stone-900 leading-tight">Dicionário Strong</h3>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{strongId}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-stone-50 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-4 text-stone-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm italic font-serif">Consultando o léxico original...</p>
              </div>
            ) : error === 'OFFLINE_NO_DICT' ? (
              <div className="py-12 text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center">
                    <Search className="w-8 h-8 text-stone-300" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-stone-900 font-bold">Dicionário offline não instalado.</p>
                  <p className="text-stone-500 text-xs px-4">Baixe o léxico bíblico para acessar definições mesmo sem internet.</p>
                </div>
                <button 
                  onClick={handleDownloadDict}
                  className="w-full py-4 bg-stone-100 text-stone-900 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-stone-200 transition-colors"
                >
                  Baixar Dicionário Offline
                </button>
                {downloadTip && (
                  <p className="text-[10px] text-orange-600 bg-orange-50 p-3 rounded-xl font-medium leading-relaxed">
                    Vá em <strong>Ajustes &gt; Módulos</strong> no menu lateral para instalar os dicionários offline.
                  </p>
                )}
              </div>
            ) : error ? (
              <div className="py-12 text-center space-y-4">
                <p className="text-stone-600 text-sm">{error}</p>
                <button 
                  onClick={() => fetchDefinition(strongId)}
                  className="px-6 py-2 bg-stone-900 text-white rounded-xl font-medium"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : data ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl font-serif font-bold text-stone-900">
                      {data.word || data.lemma || strongId}
                    </span>
                    {(data.transliteration || data.translit) && (
                      <button className="p-1.5 hover:bg-stone-50 rounded-lg text-stone-300">
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-stone-500 italic">
                    {data.transliteration || data.translit || "Sem transliteração"} 
                    {data.pronunciation && ` • `}
                    {data.pronunciation && (
                      <span className="font-sans font-medium uppercase text-[10px] tracking-widest not-italic">
                        {data.pronunciation}
                      </span>
                    )}
                  </p>
                </div>
 
                <div className="p-5 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-stone-800 leading-relaxed font-serif text-lg">
                    {data.definition || "Definição não encontrada no dicionário."}
                  </p>
                </div>
 
                {data.usage && (
                  <div>
                    <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 px-1">Uso Bíblico</h4>
                    <p className="text-sm text-stone-600 leading-relaxed">
                      {data.usage}
                    </p>
                  </div>
                )}
 
                {!data.definition && !data.lemma && (
                  <div className="py-4 text-center">
                    <p className="text-stone-400 text-xs italic">Verbete não encontrado no dicionário offline.</p>
                  </div>
                )}

                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-stone-800 transition-colors shadow-lg active:scale-[0.98]"
                >
                  Fechar Definição
                </button>
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
