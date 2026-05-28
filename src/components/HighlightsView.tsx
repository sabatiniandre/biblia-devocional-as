import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Highlighter, Calendar, Trash2, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HighlightsViewProps {
  user: User;
}

export function HighlightsView({ user }: HighlightsViewProps) {
  const [highlights, setHighlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = `users/${user.uid}/highlights`;
    const q = query(
      collection(db, path),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const h: any[] = [];
      snapshot.forEach(doc => h.push({ id: doc.id, ...doc.data() }));
      setHighlights(h);
      setLoading(false);
    }, (err) => {
      console.error('Firestore Error: ', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const removeHighlight = async (id: string) => {
    try {
      await deleteDoc(doc(db, `users/${user.uid}/highlights`, id));
    } catch (err) {
      console.error('Error removing highlight:', err);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse flex space-y-4 flex-col">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-3xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-serif font-bold text-stone-800">Minhas Marcações</h3>
        <span className="bg-stone-200 text-stone-600 px-3 py-1 rounded-full text-xs font-bold">
          {highlights.length} MARCAÇÕES
        </span>
      </div>

      {highlights.length === 0 ? (
        <div className="text-center py-20 bg-white border border-stone-100 rounded-3xl">
          <Highlighter className="w-12 h-12 text-stone-200 mx-auto mb-4" />
          <p className="text-stone-500 font-serif italic text-lg">Você ainda não marcou nenhum trecho.</p>
          <p className="text-stone-400 text-sm mt-2">Destaque trechos enquanto lê para vê-los aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {highlights.map((h) => (
              <motion.div 
                key={h.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex flex-col gap-3 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       <div 
                         className="w-3 h-3 rounded-full border border-stone-200/50" 
                         style={{ backgroundColor: h.color }}
                       />
                       <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                         {h.verseId}
                       </span>
                    </div>
                    <p className="text-stone-800 font-serif italic leading-relaxed">
                      "{h.text}"
                    </p>
                  </div>
                  <button 
                    onClick={() => removeHighlight(h.id)}
                    className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-stone-50 text-stone-400">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Calendar className="w-3 h-3" />
                    {h.createdAt?.toDate ? format(h.createdAt.toDate(), "d 'de' MMMM", { locale: ptBR }) : 'Recentemente'}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-tight opacity-0 group-hover:opacity-100 transition-opacity">
                    <BookOpen className="w-3 h-3" /> Ver no texto
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
