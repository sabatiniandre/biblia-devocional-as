import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';

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
import { StickyNote, Calendar, Trash2, Edit2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotesViewProps {
  user: User;
}

export function NotesView({ user }: NotesViewProps) {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const removeNote = async (id: string) => {
    const path = `users/${user.uid}/annotations/${id}`;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/annotations`, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  useEffect(() => {
    const path = `users/${user.uid}/annotations`;
    const q = query(
      collection(db, path),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const n: any[] = [];
      snapshot.forEach(doc => n.push({ id: doc.id, ...doc.data() }));
      setNotes(n);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user.uid]);

  if (loading) {
    return <div className="animate-pulse flex space-y-4 flex-col">
      {[1,2,3].map(i => <div key={i} className="h-40 bg-white rounded-3xl" />)}
    </div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-serif font-bold text-stone-800">Minhas Notas</h3>
        <span className="bg-stone-200 text-stone-600 px-3 py-1 rounded-full text-xs font-bold">
          {notes.length} ANOTAÇÕES
        </span>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-20 bg-white border border-stone-100 rounded-3xl">
          <StickyNote className="w-12 h-12 text-stone-200 mx-auto mb-4" />
          <p className="text-stone-500 font-serif italic text-lg">Você ainda não fez nenhuma anotação.</p>
          <p className="text-stone-400 text-sm mt-2">Toque em qualquer versículo para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {notes.map((note) => (
              <motion.div 
                key={note.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex flex-col justify-between"
              >
                <div>
                   <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-stone-400 uppercase tracking-widest bg-stone-50 px-2 py-1 rounded-lg">
                        {(() => {
                           if (note.verseRange && note.verseId) {
                             const parts = note.verseId.split('.');
                             return `${parts[0].toUpperCase()} ${parts[1]}:${note.verseRange}`;
                           }
                           return note.verseId;
                        })()}
                      </span>
                      {confirmDeleteId === note.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              removeNote(note.id);
                              setConfirmDeleteId(null);
                            }}
                            className="text-xs font-bold text-red-600 hover:text-red-700 uppercase tracking-wider"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-bold text-stone-400 hover:text-stone-600 uppercase tracking-wider"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setConfirmDeleteId(note.id)}
                          className="text-stone-300 hover:text-red-500 transition-colors"
                          title="Excluir Nota"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                   </div>
                   <p className="text-stone-800 font-serif leading-relaxed mb-6 whitespace-pre-wrap">
                     {note.content}
                   </p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-stone-50 text-stone-400">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Calendar className="w-3 h-3" />
                    {note.updatedAt?.toDate ? format(note.updatedAt.toDate(), "d 'de' MMMM", { locale: ptBR }) : 'Recentemente'}
                  </div>
                  <button className="p-2 hover:bg-stone-50 rounded-full text-stone-500">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
