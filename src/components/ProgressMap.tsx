import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, getDocs, writeBatch, doc } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}
import { User } from 'firebase/auth';
import { motion } from 'motion/react';
import { Trophy, Calendar, CheckCircle, Circle, X, ChevronLeft, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { AnimatePresence } from 'motion/react';

interface ProgressMapProps {
  user: User;
}

const BOOKS = [
  { name: 'Gênesis', abbrev: 'gn', chapters: 50, group: 'Pentateuco' },
  { name: 'Êxodo', abbrev: 'ex', chapters: 40, group: 'Pentateuco' },
  { name: 'Levítico', abbrev: 'lv', chapters: 27, group: 'Pentateuco' },
  { name: 'Números', abbrev: 'num', chapters: 36, group: 'Pentateuco' },
  { name: 'Deuteronômio', abbrev: 'dt', chapters: 34, group: 'Pentateuco' },
  { name: 'Josué', abbrev: 'js', chapters: 24, group: 'Históricos' },
  { name: 'Juízes', abbrev: 'jz', chapters: 21, group: 'Históricos' },
  { name: 'Rute', abbrev: 'rt', chapters: 4, group: 'Históricos' },
  { name: '1 Samuel', abbrev: '1sm', chapters: 31, group: 'Históricos' },
  { name: '2 Samuel', abbrev: '2sm', chapters: 24, group: 'Históricos' },
  { name: '1 Reis', abbrev: '1rs', chapters: 22, group: 'Históricos' },
  { name: '2 Reis', abbrev: '2rs', chapters: 25, group: 'Históricos' },
  { name: '1 Crônicas', abbrev: '1cr', chapters: 29, group: 'Históricos' },
  { name: '2 Crônicas', abbrev: '2cr', chapters: 36, group: 'Históricos' },
  { name: 'Esdras', abbrev: 'ezr', chapters: 10, group: 'Históricos' },
  { name: 'Neemias', abbrev: 'ne', chapters: 13, group: 'Históricos' },
  { name: 'Ester', abbrev: 'et', chapters: 10, group: 'Históricos' },
  { name: 'Jó', abbrev: 'jo', chapters: 42, group: 'Poéticos' },
  { name: 'Salmos', abbrev: 'sl', chapters: 150, group: 'Poéticos' },
  { name: 'Provérbios', abbrev: 'pv', chapters: 31, group: 'Poéticos' },
  { name: 'Eclesiastes', abbrev: 'ec', chapters: 12, group: 'Poéticos' },
  { name: 'Cânticos', abbrev: 'ct', chapters: 8, group: 'Poéticos' },
  { name: 'Isaías', abbrev: 'is', chapters: 66, group: 'Profetas Maiores' },
  { name: 'Jeremias', abbrev: 'jr', chapters: 52, group: 'Profetas Maiores' },
  { name: 'Lamentações', abbrev: 'lm', chapters: 5, group: 'Profetas Maiores' },
  { name: 'Ezequiel', abbrev: 'ez', chapters: 48, group: 'Profetas Maiores' },
  { name: 'Daniel', abbrev: 'dn', chapters: 12, group: 'Profetas Maiores' },
  { name: 'Oseias', abbrev: 'os', chapters: 14, group: 'Profetas Menores' },
  { name: 'Joel', abbrev: 'jl', chapters: 3, group: 'Profetas Menores' },
  { name: 'Amós', abbrev: 'am', chapters: 9, group: 'Profetas Menores' },
  { name: 'Obadias', abbrev: 'ob', chapters: 1, group: 'Profetas Menores' },
  { name: 'Jonas', abbrev: 'jon', chapters: 4, group: 'Profetas Menores' },
  { name: 'Miqueias', abbrev: 'mq', chapters: 7, group: 'Profetas Menores' },
  { name: 'Naum', abbrev: 'na', chapters: 3, group: 'Profetas Menores' },
  { name: 'Habacuque', abbrev: 'hc', chapters: 3, group: 'Profetas Menores' },
  { name: 'Sofonias', abbrev: 'sf', chapters: 3, group: 'Profetas Menores' },
  { name: 'Ageu', abbrev: 'ag', chapters: 2, group: 'Profetas Menores' },
  { name: 'Zacarias', abbrev: 'zc', chapters: 14, group: 'Profetas Menores' },
  { name: 'Malaquias', abbrev: 'ml', chapters: 4, group: 'Profetas Menores' },
  { name: 'Mateus', abbrev: 'mt', chapters: 28, group: 'Evangelhos' },
  { name: 'Marcos', abbrev: 'mc', chapters: 16, group: 'Evangelhos' },
  { name: 'Lucas', abbrev: 'lc', chapters: 24, group: 'Evangelhos' },
  { name: 'João', abbrev: 'joa', chapters: 21, group: 'Evangelhos' },
  { name: 'Atos', abbrev: 'at', chapters: 28, group: 'História' },
  { name: 'Romanos', abbrev: 'rm', chapters: 16, group: 'Cartas' },
  { name: '1 Coríntios', abbrev: '1co', chapters: 16, group: 'Cartas' },
  { name: '2 Coríntios', abbrev: '2co', chapters: 13, group: 'Cartas' },
  { name: 'Gálatas', abbrev: 'gl', chapters: 6, group: 'Cartas' },
  { name: 'Efésios', abbrev: 'ef', chapters: 6, group: 'Cartas' },
  { name: 'Filipenses', abbrev: 'fp', chapters: 4, group: 'Cartas' },
  { name: 'Colossenses', abbrev: 'cl', chapters: 4, group: 'Cartas' },
  { name: '1 Tessalonicenses', abbrev: '1ts', chapters: 5, group: 'Cartas' },
  { name: '2 Tessalonicenses', abbrev: '2ts', chapters: 3, group: 'Cartas' },
  { name: '1 Timóteo', abbrev: '1tm', chapters: 6, group: 'Cartas' },
  { name: '2 Timóteo', abbrev: '2tm', chapters: 4, group: 'Cartas' },
  { name: 'Tito', abbrev: 'tt', chapters: 3, group: 'Cartas' },
  { name: 'Filemom', abbrev: 'fm', chapters: 1, group: 'Cartas' },
  { name: 'Hebreus', abbrev: 'hb', chapters: 13, group: 'Cartas' },
  { name: 'Tiago', abbrev: 'tg', chapters: 5, group: 'Cartas' },
  { name: '1 Pedro', abbrev: '1pe', chapters: 5, group: 'Cartas' },
  { name: '2 Pedro', abbrev: '2pe', chapters: 3, group: 'Cartas' },
  { name: '1 João', abbrev: '1jo', chapters: 5, group: 'Cartas' },
  { name: '2 João', abbrev: '2jo', chapters: 1, group: 'Cartas' },
  { name: '3 João', abbrev: '3jo', chapters: 1, group: 'Cartas' },
  { name: 'Judas', abbrev: 'jd', chapters: 1, group: 'Cartas' },
  { name: 'Apocalipse', abbrev: 'ap', chapters: 22, group: 'Profecia' }
];

export function ProgressMap({ user }: ProgressMapProps) {
  const [readVerses, setReadVerses] = useState<Set<string>>(new Set());
  const [selectedBookDetail, setSelectedBookDetail] = useState<typeof BOOKS[0] | null>(null);
  const [selectedChapterVerses, setSelectedChapterVerses] = useState<{ number: number, text: string }[] | null>(null);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [activeChapter, setActiveChapter] = useState<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const path = `users/${user.uid}/readingProgress`;
    const q = collection(db, path);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const read = new Set<string>();
      snapshot.forEach(doc => read.add(doc.data().verseId));
      setReadVerses(read);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const fetchChapterVerses = async (bookAbbrev: string, chapter: number) => {
    setLoadingVerses(true);
    setActiveChapter(chapter);
    try {
      const { bibleService } = await import('../services/bibleService');
      const data = await bibleService.getChapter('nvibr', bookAbbrev, chapter);
      setSelectedChapterVerses(data.verses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVerses(false);
    }
  };

  const totalChapters = BOOKS.reduce((acc, book) => acc + book.chapters, 0);
  
  // Optimization: Pre-process read verses to know exactly which chapters are read
  const readChaptersSet = new Set<string>();
  const chapterVerseCounts = new Map<string, number>(); // book.chap -> count

  readVerses.forEach(v => {
    const parts = v.split('.');
    if (parts.length >= 2) {
      const key = `${parts[0]}.${parts[1]}`;
      readChaptersSet.add(key);
      chapterVerseCounts.set(key, (chapterVerseCounts.get(key) || 0) + 1);
    }
  });

  // Note: We don't have total verses per chapter here easily. 
  // Let's assume a chapter is "In Progress" if it has > 0 read verses but not "Complete".
  // Actually, without the total count per chapter, "Complete" is hard. 
  // But we can mark it as complete if the user manually "Marks Chapter as Read".
  // Let's use a heuristic or just show "Lido" if it exists in readChaptersSet for now,
  // and refine the "All Verses" logic if we fetch them.

  const readChaptersInBook = (bookAbbrev: string) => {
    let count = 0;
    const book = BOOKS.find(b => b.abbrev === bookAbbrev);
    if (!book) return 0;
    for (let i = 1; i <= book.chapters; i++) {
      if (readChaptersSet.has(`${bookAbbrev}.${i}`)) {
        count++;
      }
    }
    return count;
  };

  const readChaptersCount = Array.from(readChaptersSet).length;
  const percentage = Math.round((readChaptersCount / totalChapters) * 100);

  const handleReset = async () => {
    setResetting(true);
    const path = `users/${user.uid}/readingProgress`;
    try {
      const q = collection(db, path);
      const snapshot = await getDocs(q);
      
      // Firestore batches are limited to 500 operations
      const chunks = [];
      for (let i = 0; i < snapshot.docs.length; i += 500) {
        chunks.push(snapshot.docs.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
      
      setShowResetConfirm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    } finally {
      setResetting(false);
    }
  };
  
  // 1 year plan: ~3.2 chapters per day
  const daysLeft = Math.ceil((totalChapters - readChaptersCount) / 3.2);

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-stone-200">
        <div className="space-y-2">
          <h2 className="text-4xl font-serif font-bold text-stone-900">{percentage}% <span className="text-stone-400 font-medium text-2xl italic">concluído</span></h2>
          <div className="flex items-center gap-4 text-stone-500 font-medium font-sans text-sm">
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-600" /> {readChaptersCount} capítulos</span>
            <span className="w-1 h-1 bg-stone-300 rounded-full" />
            <span className="flex items-center gap-1"><Circle className="w-4 h-4 text-stone-300" /> {totalChapters - readChaptersCount} restantes</span>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 flex items-center gap-4">
            <div className="p-3 bg-stone-900 rounded-xl">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-widest font-bold">Plano de 1 Ano</p>
              <p className="text-stone-900 font-medium">Faltam aprox. {daysLeft} dias</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
          >
            <Trash2 className="w-4 h-4" />
            Reiniciar Histórico
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Books Map */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-serif font-bold text-stone-800 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              Mapa Devocional
            </h3>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-stone-400">
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-stone-900" /> Lido</span>
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-stone-400" /> Em andamento</span>
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full border border-stone-200" /> Pendente</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {BOOKS.map((book) => {
              const chaptersRead = readChaptersInBook(book.abbrev);
              const isRead = chaptersRead > 0;
              const isComplete = chaptersRead === book.chapters;
              
              return (
                <button 
                  key={book.abbrev}
                  onClick={() => setSelectedBookDetail(book)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border relative group",
                    isComplete
                      ? "bg-stone-900 text-white border-stone-900 scale-105 shadow-md"
                      : isRead 
                        ? "bg-stone-500 text-stone-50 border-stone-500" 
                        : "bg-white text-stone-300 border-stone-100 hover:border-stone-300 hover:text-stone-500"
                  )}
                >
                  {book.abbrev.toUpperCase()}
                  {isRead && !isComplete && (
                    <div className="absolute -bottom-1 left-0 right-0 h-1 bg-stone-900 rounded-full opacity-30" />
                  )}
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-stone-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {book.name}: {chaptersRead} / {book.chapters} cap
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Categories / Groups */}
        <section className="space-y-8">
           <h3 className="text-xl font-serif font-bold text-stone-800">Progresso por Grupos</h3>
           <div className="space-y-6">
             {Array.from(new Set(BOOKS.map(b => b.group))).map(group => {
               const groupBooks = BOOKS.filter(b => b.group === group);
               const totalGroupChapters = groupBooks.reduce((s, b) => s + b.chapters, 0);
               const groupReadChapters = groupBooks.reduce((s, b) => s + readChaptersInBook(b.abbrev), 0);
               const groupPercentage = Math.round((groupReadChapters / totalGroupChapters) * 100);

               return (
                 <div key={group} className="space-y-2">
                   <div className="flex justify-between text-sm">
                     <span className="font-medium text-stone-700">{group}</span>
                     <span className="text-stone-400 font-sans">{groupReadChapters} / {totalGroupChapters} cap</span>
                   </div>
                   <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${groupPercentage}%` }}
                        className="h-full bg-stone-800 rounded-full" 
                     />
                   </div>
                 </div>
               );
             })}
           </div>
        </section>
      </div>

      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => !resetting && setShowResetConfirm(false)}
               className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10 text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-stone-900 mb-2">Reiniciar Histórico?</h3>
              <p className="text-stone-500 mb-8 leading-relaxed">
                Esta ação apagará permanentemente todo o seu progresso de leitura. Você terá que começar do zero.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleReset}
                  disabled={resetting}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resetting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Sim, apagar tudo'}
                </button>
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  disabled={resetting}
                  className="w-full py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedBookDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => { setSelectedBookDetail(null); setSelectedChapterVerses(null); setActiveChapter(null); }}
               className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative z-10"
            >
               <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-4">
                   {selectedChapterVerses && (
                     <button 
                       onClick={() => setSelectedChapterVerses(null)}
                       className="p-2 hover:bg-stone-100 rounded-full"
                     >
                       <ChevronLeft className="w-5 h-5 text-stone-400" />
                     </button>
                   )}
                   <div>
                     <h3 className="text-2xl font-serif font-bold text-stone-900">
                       {selectedBookDetail.name} {selectedChapterVerses ? activeChapter : ''}
                     </h3>
                     <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">
                       {selectedChapterVerses ? 'Detalhe do Capítulo' : selectedBookDetail.group}
                     </p>
                   </div>
                 </div>
                 <button 
                   onClick={() => { setSelectedBookDetail(null); setSelectedChapterVerses(null); setActiveChapter(null); }}
                   className="p-2 hover:bg-stone-100 rounded-full"
                 >
                   <X className="w-6 h-6 text-stone-400" />
                 </button>
               </div>
               
               <div className="flex-1 overflow-y-auto pr-2 scrollbar-none">
                 {!selectedChapterVerses ? (
                   <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                     {Array.from({ length: selectedBookDetail.chapters }, (_, i) => i + 1).map(chapNum => {
                       const chapterKey = `${selectedBookDetail.abbrev}.${chapNum}`;
                       const readVersesInChap = chapterVerseCounts.get(chapterKey) || 0;
                       
                       // We don't know total verses until we fetch. 
                       // But if we've fetched it, we can be precise.
                       // For the grid view, let's just show 'Ready' if > 0 for now, 
                       // or fetch counts when the book is selected? Too expensive.
                       // Let's use the fetched verses if chapNum is the active one.
                       
                       const isStarted = readVersesInChap > 0;
                       
                       // If we have selectedChapterVerses and it's THIS chapter, we can be exact
                       let isComplete = false;
                       if (selectedChapterVerses && activeChapter === chapNum) {
                          isComplete = selectedChapterVerses.every(v => readVerses.has(`${selectedBookDetail.abbrev}.${chapNum}.${v.number}`));
                       } else if (readVersesInChap > 30) {
                          // Simple heuristic for larger chapters if not fetched
                          isComplete = true; 
                       }
                       
                       return (
                         <button 
                           key={chapNum}
                           onClick={() => fetchChapterVerses(selectedBookDetail.abbrev, chapNum)}
                           className={cn(
                             "aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold border transition-all relative overflow-hidden",
                             isComplete 
                               ? "bg-stone-900 border-stone-900 text-white" 
                               : isStarted
                                 ? "bg-amber-50 border-amber-200 text-amber-700"
                                 : "bg-stone-50 border-stone-100 text-stone-300 hover:border-stone-400 hover:text-stone-800"
                           )}
                           title={isComplete ? 'Lido' : isStarted ? 'Em andamento' : 'Pendente'}
                         >
                           {loadingVerses && activeChapter === chapNum ? (
                             <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
                           ) : (
                             <>
                               <span>{chapNum}</span>
                               {isStarted && !isComplete && (
                                 <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/20" />
                               )}
                             </>
                           )}
                         </button>
                       );
                     })}
                   </div>
                 ) : (
                   <div className="space-y-4">
                     {selectedChapterVerses.map(v => {
                       const verseId = `${selectedBookDetail.abbrev}.${activeChapter}.${v.number}`;
                       const isRead = readVerses.has(verseId);
                       
                       return (
                         <div 
                           key={v.number}
                           className={cn(
                             "p-4 rounded-2xl border transition-all flex gap-4",
                             isRead ? "bg-green-50 border-green-100" : "bg-stone-50 border-stone-100"
                           )}
                         >
                           <div className="flex-shrink-0">
                             <div className={cn(
                               "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                               isRead ? "bg-green-600 text-white" : "bg-stone-200 text-stone-500"
                             )}>
                               {v.number}
                             </div>
                           </div>
                           <p className={cn(
                             "text-sm leading-relaxed",
                             isRead ? "text-stone-800 font-medium" : "text-stone-400 italic"
                           )}>
                             {v.text}
                           </p>
                         </div>
                       );
                     })}
                   </div>
                 )}
               </div>
               
               <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-stone-900" />
                   <span className="text-xs font-medium text-stone-500">Lido</span>
                   <div className="w-3 h-3 rounded-full bg-amber-400 ml-4" />
                   <span className="text-xs font-medium text-stone-500">Em andamento</span>
                   <div className="w-3 h-3 rounded-full bg-stone-200 ml-4" />
                   <span className="text-xs font-medium text-stone-500">Pendente</span>
                 </div>
                 <p className="text-sm font-serif italic text-stone-400">
                    {selectedChapterVerses 
                      ? `${selectedChapterVerses.filter(v => readVerses.has(`${selectedBookDetail.abbrev}.${activeChapter}.${v.number}`)).length} de ${selectedChapterVerses.length} versículos`
                      : `${readChaptersInBook(selectedBookDetail.abbrev)} de ${selectedBookDetail.chapters} capítulos`
                    }
                 </p>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
