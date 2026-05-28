import React, { useState, useEffect, useCallback, useRef } from 'react';
import { bibleService, ChapterResponse, BibleBook, BibleVersion } from '../services/bibleService';
import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, addDoc, query, where, getDocs, onSnapshot, serverTimestamp, deleteDoc, writeBatch } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { 
  ChevronLeft, 
  ChevronRight, 
  PlusCircle, 
  CheckCircle2, 
  MinusCircle,
  BookOpen,
  MessageSquare,
  Highlighter,
  RotateCcw,
  Library,
  BookMarked,
  Copy,
  Search,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { cn } from '../lib/utils';
import { offlineDb, OfflineVersion } from '../lib/offlineDb';
import { backgroundSync } from '../services/backgroundSync';
import { motion, AnimatePresence } from 'motion/react';
import { StrongDictionaryModal } from './StrongDictionaryModal';

interface ReaderProps {
  reference: string;
  setReference: (ref: string) => void;
  user: User;
  settings: {
    theme: string;
    font: string;
    fontSize: string;
  };
  setTab: (tab: any) => void;
  highlightMode: boolean;
  activeColor: string;
  eraseMode: boolean;
  initialShowPicker?: boolean;
  pickerStep?: 'book' | 'version' | 'chapter';
  onPickerClose?: () => void;
  navigateChapter: (dir: number) => void;
  quotaExceeded: boolean;
  setQuotaExceeded: (exceeded: boolean) => void;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, onQuotaExceeded?: () => void) {
  const message = error instanceof Error ? error.message : String(error);
  const isQuota = message.toLowerCase().includes('quota') || message.toLowerCase().includes('resource-exhausted');
  
  if (isQuota && onQuotaExceeded) {
    onQuotaExceeded();
  }

  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export function Reader({ 
  reference, 
  setReference, 
  user, 
  settings, 
  setTab, 
  highlightMode, 
  activeColor, 
  eraseMode, 
  initialShowPicker, 
  pickerStep: initialPickerStep,
  onPickerClose,
  navigateChapter,
  quotaExceeded,
  setQuotaExceeded
}: ReaderProps) {
  const [data, setData] = useState<ChapterResponse | null>(null);
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [loading, setLoading] = useState(true);
  const readVersesRef = useRef<Set<string>>(new Set());
  const [readVerses, setReadVerses] = useState<Set<string>>(new Set());

  // Download sync status
  const [syncStatus, setSyncStatus] = useState<Record<string, OfflineVersion>>({});
  const [showDownloadPrompt, setShowDownloadPrompt] = useState<string | null>(null);
  const [pendingVersion, setPendingVersion] = useState<string | null>(null);

  const parts = reference.split('/');
  const version = parts[0];
  const bookAbbrev = parts[1];
  const chapter = parts[2];
  const verseFromRef = parts[3] ? parseInt(parts[3]) : null;

  useEffect(() => {
    return backgroundSync.subscribe((status) => {
      setSyncStatus({ ...status });

      // Check if pending version just finished
      if (pendingVersion && status[pendingVersion]?.installed && !status[pendingVersion]?.downloading) {
        console.log(`[OFFLINE] Auto-switching to newly installed version: ${pendingVersion}`);
        const newRef = `${pendingVersion}/${bookAbbrev}/${chapter}`;
        setReference(newRef);
        setPendingVersion(null);
      }
    });
  }, [pendingVersion, bookAbbrev, chapter, setReference]);

  useEffect(() => {
    readVersesRef.current = readVerses;
  }, [readVerses]);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geminiQuotaExceeded, setGeminiQuotaExceeded] = useState(false);
  const [activeStrongId, setActiveStrongId] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const initialSelectionDone = useRef(false);

  const fetchChapter = useCallback(async () => {
    if (!version || !bookAbbrev || !chapter || isNaN(parseInt(chapter))) {
      console.warn('fetchChapter: Missing or invalid reference part:', { version, bookAbbrev, chapter });
      setLoading(false);
      return;
    }
    
    console.log(`fetchChapter: Starting fetch for ${version}/${bookAbbrev}/${chapter}`);
    setLoading(true);
    setError(null);
    setGeminiQuotaExceeded(false);

    try {
      const localCheck = await offlineDb.getChapter(version, bookAbbrev, parseInt(chapter));
      console.log("[OFFLINE LOAD]", !!localCheck);

      const result = await bibleService.getChapter(version, bookAbbrev, parseInt(chapter));
      if (!result || !result.verses || result.verses.length === 0) {
        console.warn('fetchChapter: Empty result from service');
        throw new Error('Nenhum versículo encontrado para este capítulo.');
      }
      setData(result);
      console.log('fetchChapter: Success');
    } catch (err: any) {
      if (err?.message?.includes('fetch') || !navigator.onLine) {
        console.warn('fetchChapter: Network unavailable, trying offline IndexedDB fallback...');
      } else {
        console.error('fetchChapter: Error:', err);
      }

      // Try local IndexedDB check as robust fallback
      try {
        const localCheck = await offlineDb.getChapter(version, bookAbbrev, parseInt(chapter));
        if (localCheck && localCheck.verses && localCheck.verses.length > 0) {
          setData(localCheck);
          setError(null);
          console.log('fetchChapter: Loaded successfully from local IndexedDB fallback after fetch error');
          return;
        }
      } catch (localErr) {
        console.error('fetchChapter: Local IndexedDB fallback check failed:', localErr);
      }
      
      // Handle status 429 for Gemini Quota
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('Gemini quota exceeded')) {
        setGeminiQuotaExceeded(true);
      }

      const message = err instanceof Error ? err.message : 'Erro ao carregar os textos.';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [version, bookAbbrev, chapter]);

  useEffect(() => {
    initialSelectionDone.current = false;
    // Only clear data if we are actually going to fetch something new
    if (version && bookAbbrev && chapter) {
      setData(null);
      fetchChapter();
    }
  }, [fetchChapter]);

  useEffect(() => {
    if (loading || !data) return;
    
    if (verseFromRef && !initialSelectionDone.current) {
      setTimeout(() => {
        const element = document.getElementById(`verse-${verseFromRef}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          initialSelectionDone.current = true;
        }
      }, 500); // Increased for layout stability
    } else if (!verseFromRef) {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, data, verseFromRef]);

  useEffect(() => {
    const path = `users/${user.uid}/readingProgress`;
    const q = query(
      collection(db, path),
      where('verseId', '>=', `${bookAbbrev}.${chapter}.`),
      where('verseId', '<=', `${bookAbbrev}.${chapter}.\uf8ff`)
    );

    // Initial load from IndexedDB for true offline-first
    const loadLocal = async () => {
      try {
        const localItems = await offlineDb.getProgressMap();
        const read = new Set<string>();
        localItems.forEach((item: any) => {
          if (item.id.startsWith(`${bookAbbrev}.${chapter}.`)) {
            read.add(item.id);
          }
        });
        setReadVerses(read);
      } catch (e) {}
    };
    loadLocal();

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const read = new Set<string>();
      snapshot.forEach(doc => read.add(doc.data().verseId));
      // Merge with local if needed, but Firestore Persistence usually handles this.
      // However, for newly created offline items not yet in IDB Persistence:
      setReadVerses(prev => new Set([...prev, ...read]));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path, () => setQuotaExceeded(true));
    });
    return () => unsubscribe();
  }, [user.uid, bookAbbrev, chapter]);

  useEffect(() => {
    const path = `users/${user.uid}/highlights`;
    const q = query(
      collection(db, path),
      where('verseId', '>=', `${bookAbbrev}.${chapter}.`),
      where('verseId', '<=', `${bookAbbrev}.${chapter}.\uf8ff`)
    );

    // Initial load from IndexedDB
    const loadLocal = async () => {
      try {
        const localH = await offlineDb.getHighlights();
        const filtered = localH.filter((h: any) => h.verseId.startsWith(`${bookAbbrev}.${chapter}.`));
        if (filtered.length > 0) setHighlights(filtered);
      } catch (e) {}
    };
    loadLocal();

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const h: any[] = [];
      snapshot.forEach(doc => h.push({ id: doc.id, ...doc.data() }));
      setHighlights(h);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path, () => setQuotaExceeded(true));
    });
    return () => unsubscribe();
  }, [user.uid, bookAbbrev, chapter]);

  // Handle intersection for automatic reading progress - DISABLED to fix unexpected behavior
  useEffect(() => {
    if (loading || !data) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // We track the scroll position locally but ONLY update cloud via navigation buttons or periodic sync
        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
          const verseNumStr = entry.target.id.split('-')[1];
          if (verseNumStr) {
            const verseNum = parseInt(verseNumStr);
            const newRefWithVerse = `${version}/${bookAbbrev}/${chapter}/${verseNum}`;
            if (reference !== newRefWithVerse) {
               setReference(newRefWithVerse);
            }
          }
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '-50px 0px 0px 0px' 
    });

    const verseElements = document.querySelectorAll('[id^="verse-"]');
    verseElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [loading, data, bookAbbrev, chapter, version, reference, setReference, user.uid]);

  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [lastSelectedVerse, setLastSelectedVerse] = useState<number | null>(null);

  const copyToClipboard = useCallback(async () => {
    if (!data || selectedVerses.length === 0) return;
    
    // Sort selected verses
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    const versesToCopy = data.verses.filter(v => sorted.includes(v.number));
    
    let text = `${data.book.name} ${chapter}:`;
    if (sorted.length === 1) {
      text += `${sorted[0]}\n${versesToCopy[0].text}`;
    } else {
      text += `${sorted[0]}-${sorted[sorted.length - 1]}\n`;
      text += versesToCopy.map(v => `${v.number} ${v.text}`).join('\n');
    }
    
    try {
      await navigator.clipboard.writeText(text);
      // Optional: show toast
      setSelectedVerses([]);
      setLastSelectedVerse(null);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, [data, selectedVerses, chapter]);

  const markSelectedAsRead = async (unread = false) => {
    if (!data || selectedVerses.length === 0 || quotaExceeded) return;

    // 1. Local Save (IndexedDB)
    for (const verseNum of selectedVerses) {
      const verseId = `${bookAbbrev}.${chapter}.${verseNum}`;
      if (unread) {
        // We don't have a specific removeProgressMapItem, but we can design sync later
      } else {
        await offlineDb.saveProgressMapItem({
          id: verseId,
          userId: user.uid,
          book: bookAbbrev,
          chapter: parseInt(chapter),
          verse: verseNum,
          readAt: Date.now()
        });
      }
    }

    // 2. Firestore Sync
    const batch = writeBatch(db);
    const path = `users/${user.uid}/readingProgress`;
    
    for (const verseNum of selectedVerses) {
      const verseId = `${bookAbbrev}.${chapter}.${verseNum}`;
      const docId = verseId.replace(/\./g, '_');
      if (unread) {
        batch.delete(doc(db, path, docId));
      } else {
        batch.set(doc(db, path, docId), {
          userId: user.uid,
          verseId,
          readAt: serverTimestamp()
        });
      }
    }
    
    try {
      await batch.commit();
      setSelectedVerses([]);
      setLastSelectedVerse(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path, () => setQuotaExceeded(true));
    }
  };

  const toggleVerseSelection = (verseNum: number) => {
    setSelectedVerses(prev => {
      if (prev.includes(verseNum)) {
        const filtered = prev.filter(v => v !== verseNum);
        if (filtered.length === 0) setLastSelectedVerse(null);
        return filtered;
      }
      
      if (prev.length === 0) {
        setLastSelectedVerse(verseNum);
        return [verseNum];
      }
      
      const start = Math.min(lastSelectedVerse!, verseNum);
      const end = Math.max(lastSelectedVerse!, verseNum);
      const range: number[] = [];
      for (let i = start; i <= end; i++) {
        range.push(i);
      }
      
      setLastSelectedVerse(verseNum);
      return [...new Set([...prev, ...range])].sort((a, b) => a - b);
    });
  };

  const toggleRead = async (verseNum: number, forceRead = false) => {
    if (quotaExceeded) return;
    const verseId = `${bookAbbrev}.${chapter}.${verseNum}`;
    const path = `users/${user.uid}/readingProgress`;
    const progressDoc = doc(db, path, verseId.replace(/\./g, '_'));
    
    try {
      if (forceRead || !readVerses.has(verseId)) {
        // SAVE LOCAL
        await offlineDb.saveProgressMapItem({
          id: verseId,
          userId: user.uid,
          book: bookAbbrev,
          chapter: parseInt(chapter),
          verse: verseNum,
          readAt: Date.now()
        });
        
        await setDoc(progressDoc, {
          userId: user.uid,
          verseId,
          readAt: serverTimestamp()
        });
      } else {
        await deleteDoc(progressDoc);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path, () => setQuotaExceeded(true));
    }
  };

  const unmarkChapterAsRead = async () => {
    if (!data || quotaExceeded) return;
    const batch = writeBatch(db);
    const path = `users/${user.uid}/readingProgress`;
    
    // Optimistic update
    const newReadVerses = new Set(readVerses);
    let count = 0;
    for (const v of data.verses) {
      const verseId = `${bookAbbrev}.${chapter}.${v.number}`;
      const docId = verseId.replace(/\./g, '_');
      batch.delete(doc(db, path, docId));
      newReadVerses.delete(verseId);
      count++;
    }
    
    if (count > 0) {
      try {
        setReadVerses(newReadVerses);
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path, () => setQuotaExceeded(true));
        // Revert on error - the onSnapshot will eventually fix it too
      }
    }
  };

  const markChapterAsRead = async () => {
    if (!data || quotaExceeded) return;
    const batch = writeBatch(db);
    const path = `users/${user.uid}/readingProgress`;
    
    // Optimistic update
    const newReadVerses = new Set(readVerses);
    let count = 0;
    for (const v of data.verses) {
      const verseId = `${bookAbbrev}.${chapter}.${v.number}`;
      if (!readVerses.has(verseId)) {
        const docId = verseId.replace(/\./g, '_');
        batch.set(doc(db, path, docId), {
          userId: user.uid,
          verseId,
          readAt: serverTimestamp()
        });
        newReadVerses.add(verseId);
        count++;
      }
    }
    
    if (count > 0) {
      try {
        setReadVerses(newReadVerses);
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path, () => setQuotaExceeded(true));
      }
    }
  };

  const saveNote = async () => {
    const verseToNote = selectedVerses[0] || lastSelectedVerse;
    if (!verseToNote || !noteContent.trim() || quotaExceeded) return;
    setSavingNote(true);
    const verseId = `${bookAbbrev}.${chapter}.${verseToNote}`;
    const path = `users/${user.uid}/annotations`;
    const noteId = verseId.replace(/\./g, '_');
    
    // Calculate range string for metadata
    let verseRange = `${verseToNote}`;
    if (selectedVerses.length > 1) {
      const sorted = [...selectedVerses].sort((a, b) => a - b);
      verseRange = `${sorted[0]}-${sorted[sorted.length - 1]}`;
    }

    // 1. SAVE LOCAL
    // Note: Since I didn't create a 'saveNote' or 'saveAnnotation' specifically in offlineDb, 
    // I can use local_progress or add a new store, but for simplicity I'll use localProgress for now
    // or just rely on Firestore Persistence as it's less critical than highlights/progress for offline search.
    // Actually, I'll use a generic save to local_progress
    await offlineDb.saveLocalProgress({ id: `note_${noteId}`, content: noteContent, verseId });

    try {
      await setDoc(doc(db, path, noteId), {
        userId: user.uid,
        verseId,
        verseRange, // New field to store the range context
        content: noteContent,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setShowNoteModal(false);
      setNoteContent('');
      setSelectedVerses([]);
      setLastSelectedVerse(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path, () => setQuotaExceeded(true));
    } finally {
      setSavingNote(false);
    }
  };

  const openNoteModal = async (verseNum: number) => {
    const verseId = `${bookAbbrev}.${chapter}.${verseNum}`;
    const path = `users/${user.uid}/annotations`;
    const noteId = verseId.replace(/\./g, '_');
    
    // Check if note exists
    const { getDoc } = await import('firebase/firestore');
    const noteDoc = await getDoc(doc(db, path, noteId));
    if (noteDoc.exists()) {
      setNoteContent(noteDoc.data().content);
    } else {
      setNoteContent('');
    }
    setShowNoteModal(true);
  };

  const handleHighlight = useCallback(async (color: string, directText?: string, directVerse?: number) => {
    const textToHighlight = directText || selectedText;
    const verseToUse = directVerse || selectedVerse || (selectedVerses.length > 0 ? selectedVerses[0] : lastSelectedVerse);
    
    if (!verseToUse || !textToHighlight || quotaExceeded) return;

    const verseId = `${bookAbbrev}.${chapter}.${verseToUse}`;
    const path = `users/${user.uid}/highlights`;

    const highlightData = {
      userId: user.uid,
      verseId,
      text: textToHighlight,
      color,
      createdAt: Date.now()
    };

    // 1. LOCAL SAVE
    await offlineDb.saveHighlight(highlightData);

    // 2. FIRESTORE SAVE
    try {
      await addDoc(collection(db, path), {
        ...highlightData,
        createdAt: serverTimestamp()
      });
      
      // Clear selection after success
      window.getSelection()?.removeAllRanges();
      setSelectedText('');
      setSelectionRect(null);
      setSelectionPopupView('colors');
      setSelectedVerse(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path, () => setQuotaExceeded(true));
    }
  }, [user.uid, bookAbbrev, chapter, selectedText, selectedVerse, selectedVerses, lastSelectedVerse, quotaExceeded]);

  const removeHighlight = async (hId: string) => {
    const path = `users/${user.uid}/highlights`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'highlights', hId));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path, () => setQuotaExceeded(true));
    }
  };

  useEffect(() => {
    if (initialShowPicker) {
      setShowPicker(true);
      setPickerStep(initialPickerStep || 'book');
    }
  }, [initialShowPicker, initialPickerStep]);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerStep, setPickerStep] = useState<'version' | 'book' | 'chapter' | 'verse'>('book');

  useEffect(() => {
    if (!showPicker && onPickerClose) {
      onPickerClose();
    }
  }, [showPicker, onPickerClose]);
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [selectionRect, setSelectionRect] = useState<{ top: number, left: number } | null>(null);
  const [selectionPopupView, setSelectionPopupView] = useState<'colors'>('colors');

  const themeClasses = {
    light: 'bg-white text-stone-900 border-stone-100',
    sepia: 'bg-[#F4ECD8] text-[#5B4636] border-[#E2D2B5]',
    paper: 'bg-[#F5F5F0] text-stone-800 border-stone-200',
    dark: 'bg-stone-950 text-stone-200 border-stone-800'
  }[settings.theme] || 'bg-white text-stone-900';

  const fontClasses = {
    serif: 'font-serif',
    sans: 'font-sans',
    slab: 'font-slab',
    mono: 'font-mono'
  }[settings.font] || 'font-serif';

  const fontSizePx = {
    base: 20,
    lg: 24,
    xl: 30,
    '2xl': 36,
    '3xl': 48,
    '4xl': 60
  }[settings.fontSize as keyof typeof fontSizePx] || 24;

  const sizeClasses = {
    base: 'text-[20px]',
    lg: 'text-[24px]',
    xl: 'text-[30px]',
    '2xl': 'text-[36px]',
    '3xl': 'text-[48px]',
    '4xl': 'text-[60px]'
  }[settings.fontSize] || 'text-[24px]';

  const isInterlinear = version === 'arai';

  useEffect(() => {
    bibleService.getBooks().then(setBooks).catch(console.error);
    bibleService.getVersions().then(setVersions).catch(console.error);
  }, []);

  const menuRef = useRef<HTMLDivElement>(null);

  const handleSelection = useCallback((e: MouseEvent | TouchEvent) => {
    // If clicking inside the menu, keep the selection state
    const target = e.target as HTMLElement;
    if (target.closest('.verse-actions-menu')) {
      return;
    }

    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Find the verse container correctly by looking at where the selection started
      let container = range.startContainer;
      if (container.nodeType === Node.TEXT_NODE) container = container.parentElement!;
      const verseEl = (container as HTMLElement).closest('[id^="verse-"]');
      
      if (verseEl) {
        const verseNum = parseInt(verseEl.id.split('-')[1]);
        setSelectedVerse(verseNum);
        // Normalize whitespace and trim
        const rawText = selection.toString().replace(/\s+/g, ' ').trim();
        setSelectedText(rawText);
        
        if (highlightMode) {
          // Add a small timeout to ensure the highlight is applied after selection state settles
          setTimeout(() => {
            handleHighlight(activeColor, rawText, verseNum);
          }, 50);
        } else if (eraseMode) {
          // Find and remove highlights in this verse that contain the selected text or are contained by it
          const verseId = `${bookAbbrev}.${chapter}.${verseNum}`;
          const overlappingHighlights = highlights.filter(h => 
            h.verseId === verseId && 
            (h.text.includes(rawText) || rawText.includes(h.text))
          );
          
          if (overlappingHighlights.length > 0) {
            overlappingHighlights.forEach(h => removeHighlight(h.id));
            window.getSelection()?.removeAllRanges();
          }
        } else {
          setSelectionRect({ top: rect.bottom, left: rect.left + rect.width / 2 });
        }
      }
    } else {
      // Small delay on clear to avoid flickering when clicking buttons
      setTimeout(() => {
        if (!window.getSelection()?.toString()) {
          setSelectionRect(null);
          setSelectedText('');
          setSelectionPopupView('colors');
          setSelectedVerse(null);
        }
      }, 100);
    }
  }, [highlightMode, activeColor, eraseMode, bookAbbrev, chapter, handleHighlight, highlights, removeHighlight]);

  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => handleSelection(e);
    const onTouchEnd = (e: TouchEvent) => handleSelection(e);
    
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onTouchEnd);
    
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleSelection]);

  const selectVersion = async (newVersion: string) => {
    const ver = newVersion.toLowerCase();
    console.log("[VERSION SELECT]", ver);
    
    // Check if installed
    const verInfo = await offlineDb.getVersionInfo(ver);
    if (!verInfo?.installed && !syncStatus[ver]?.downloading) {
      setShowDownloadPrompt(ver);
      setShowPicker(false);
      return;
    }

    const newRef = `${newVersion}/${bookAbbrev}/${chapter}`;
    setReference(newRef);
    setPickerStep('book');
    setShowPicker(false);
  };

  const startDownload = async (vId: string) => {
    setPendingVersion(vId);
    setShowDownloadPrompt(null);
    backgroundSync.syncVersion(vId);
  };

  const selectReference = (book: string, chap: number, verseNum?: number) => {
    const newRef = verseNum ? `${version}/${book}/${chap}/${verseNum}` : `${version}/${book}/${chap}`;
    setReference(newRef);
    setShowPicker(false);
    setPickerStep('book');
    setSelectedBook(null);
    setSelectedChapter(null);
    initialSelectionDone.current = false; // Allow scrolling to new verse
    
    if (verseNum) {
      setSelectedVerses([verseNum]);
      setLastSelectedVerse(verseNum);
      // The useEffect with initialSelectionDone handles the scrolling
    }

    const userRef = doc(db, 'users', user.uid);
    setDoc(userRef, { lastReadReference: newRef, updatedAt: serverTimestamp() }, { merge: true }).catch(err => {
       handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`, () => setQuotaExceeded(true));
    });
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
        <p className="text-stone-500 font-serif italic">Preparando as escrituras...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 bg-white rounded-[2rem] border border-stone-100 p-8 shadow-sm max-w-md mx-auto">
        <div ref={topRef} />
        <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-stone-300" />
        </div>
        <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">Capítulo não encontrado</h3>
        <p className="text-stone-500 text-sm mb-8 leading-relaxed">
          {error.includes('Nenhum versículo') 
            ? "Não conseguimos localizar os textos para este capítulo na versão selecionada. Tente trocar a versão ou voltar ao início."
            : error}
        </p>
        <div className="grid grid-cols-1 gap-3">
          <button 
            onClick={() => fetchChapter()}
            className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-stone-800 transition-colors shadow-lg active:scale-[0.98]"
          >
            Tentar Novamente
          </button>
          <button 
            onClick={() => setReference(`nvibr/${bookAbbrev}/${chapter}`)}
            className="w-full py-4 bg-stone-100 text-stone-700 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-stone-200 transition-colors"
          >
            Mudar para NVIbr (Seguro)
          </button>
          <button 
            onClick={() => setReference('nvibr/gn/1')}
            className="w-full py-4 bg-white border border-stone-200 text-stone-400 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-stone-50 transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen -mx-4 -my-8 px-4 py-8 md:-mx-12 md:px-12 transition-colors duration-500",
      settings.theme === 'dark' ? 'bg-stone-950' : 'bg-transparent',
      isInterlinear && "parchment-texture"
    )}>
      <div className={cn(
        "max-w-prose mx-auto rounded-3xl p-6 md:p-10 shadow-sm border transition-all duration-500 relative",
        isInterlinear ? "parchment-texture font-bible border-[#D4C3A3] shadow-[#00000010]" : themeClasses
      )}>
        <div ref={topRef} className="h-0" />
        
        {/* Quota Alerts */}
        <AnimatePresence mode="wait">
          {quotaExceeded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-900 font-bold text-sm">Sincronização Limitada</p>
                <p className="text-amber-700 text-xs leading-relaxed">
                  O limite gratuito do banco de dados foi atingido. Suas marcações e progresso serão mantidos apenas nesta sessão.
                </p>
              </div>
            </motion.div>
          )}

          {geminiQuotaExceeded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-6 flex items-start gap-3"
            >
              <Lightbulb className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-purple-900 font-bold text-sm">IA em Repouso</p>
                <p className="text-purple-700 text-xs leading-relaxed">
                  O limite da IA gratuita foi atingido. O modo interlinear e as definições Strong podem estar temporariamente indisponíveis.
                </p>
              </div>
            </motion.div>
          )}

          {/* Sync Progress Alert */}
          {Object.values(syncStatus).some(v => v.downloading) && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-6 overflow-hidden"
            >
              {Object.values(syncStatus).filter(v => v.downloading).map(v => (
                <div key={v.id} className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-stone-600 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-2 h-2 bg-stone-900 rounded-full animate-pulse" />
                      Baixando {v.id.toUpperCase()}...
                    </span>
                    <span className="font-mono text-stone-400 font-bold">{v.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-stone-900 transition-all duration-500 ease-out" 
                      style={{ width: `${v.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
        {showDownloadPrompt && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
             <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDownloadPrompt(null)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative z-10 text-center"
            >
              <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookMarked className="w-8 h-8 text-stone-300" />
              </div>
              <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">Versão não instalada</h3>
              <p className="text-stone-500 text-sm mb-8 leading-relaxed">
                A versão <span className="font-bold">{showDownloadPrompt.toUpperCase()}</span> ainda não está disponível offline. Deseja baixar agora? (Aprox. 5MB)
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => startDownload(showDownloadPrompt)}
                  className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg active:scale-[0.98] transition-all"
                >
                  Baixar Versão
                </button>
                <button 
                  onClick={() => setShowDownloadPrompt(null)}
                  className="w-full py-4 bg-white border border-stone-200 text-stone-500 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-stone-50 transition-all"
                >
                  Agora Não
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showPicker && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowPicker(false); setPickerStep('book'); setSelectedBook(null); setSelectedChapter(null); }}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full h-[80vh] flex flex-col shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-serif font-bold text-stone-900">
                  {pickerStep === 'version' && 'Escolher Versão'}
                  {pickerStep === 'book' && 'Escolher Livro'}
                  {pickerStep === 'chapter' && `Capítulo - ${selectedBook?.name}`}
                  {pickerStep === 'verse' && `Versículo - ${selectedBook?.name} ${selectedChapter}`}
                </h3>
                <button 
                  onClick={() => {
                    if (pickerStep === 'verse') setPickerStep('chapter');
                    else if (pickerStep === 'chapter') setPickerStep('book');
                    else if (pickerStep === 'book') setShowPicker(false);
                    else setPickerStep('book'); // From Version back to Book
                  }} 
                  className="p-2 hover:bg-stone-100 rounded-full"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto pb-4 pr-2 scrollbar-none">
                {pickerStep === 'version' ? (
                  <div className="space-y-2">
                    {versions.map(v => (
                      <button 
                        key={v.version}
                        onClick={() => selectVersion(v.version)}
                        className={cn(
                          "w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between",
                          version === v.version ? "bg-stone-900 text-white border-stone-900" : "bg-stone-50 border-stone-200 hover:border-stone-400"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold uppercase tracking-widest">{v.version}</span>
                          {syncStatus[v.version.toLowerCase()]?.downloading && (
                            <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-bold animate-pulse">
                              {syncStatus[v.version.toLowerCase()]?.progress}%
                            </span>
                          )}
                        </div>
                        {version === v.version && <CheckCircle2 className="w-5 h-5" />}
                      </button>
                    ))}
                  </div>
                ) : pickerStep === 'book' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {books.map(b => (
                      <button 
                        key={b.abbrev.pt}
                        onClick={() => { setSelectedBook(b); setPickerStep('chapter'); }}
                        className={cn(
                          "text-left p-4 rounded-2xl border transition-all",
                          bookAbbrev === b.abbrev.pt ? "bg-stone-900 text-white border-stone-900" : "bg-stone-50 border-stone-200 hover:border-stone-400"
                        )}
                      >
                        <p className="font-bold text-sm leading-tight">{b.name}</p>
                        <p className="text-[10px] opacity-70 uppercase tracking-widest mt-1">{b.group}</p>
                      </button>
                    ))}
                  </div>
                ) : pickerStep === 'chapter' ? (
                  <div className="grid grid-cols-5 md:grid-cols-8 gap-2">
                    {Array.from({ length: selectedBook?.chapters || 0 }, (_, i) => i + 1).map(c => (
                      <button 
                        key={c}
                        onClick={() => { setSelectedChapter(c); setPickerStep('verse'); }}
                        className={cn(
                          "w-full aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all border",
                          bookAbbrev === selectedBook?.abbrev.pt && parseInt(chapter) === c 
                            ? "bg-stone-800 text-white border-stone-800" 
                            : "bg-white border-stone-200 text-stone-400 hover:border-stone-400 hover:text-stone-800"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 md:grid-cols-8 gap-2">
                    <button 
                      onClick={() => selectReference(selectedBook!.abbrev.pt, selectedChapter!)}
                      className="col-span-full mb-4 p-4 bg-stone-100 rounded-2xl font-bold text-stone-800"
                    >
                      Ler Capítulo Inteiro
                    </button>
                    {Array.from({ length: 150 }, (_, i) => i + 1).map(v => (
                       <button 
                        key={v}
                        onClick={() => selectReference(selectedBook!.abbrev.pt, selectedChapter!, v)}
                        className="w-full aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all border bg-white border-stone-200 text-stone-400 hover:border-stone-400 hover:text-stone-800"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {pickerStep !== 'version' && (
                <div className="mt-6 pt-6 border-t border-stone-100">
                  <button 
                    onClick={() => setPickerStep('version')}
                    className="w-full p-4 bg-stone-50 rounded-2xl flex items-center justify-between group hover:bg-stone-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg border border-stone-200 group-hover:border-stone-300">
                        <RotateCcw className="w-4 h-4 text-stone-500" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Versão Atual</p>
                        <p className="text-sm font-serif font-bold text-stone-800">{version.toUpperCase()}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-400" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNoteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowNoteModal(false)}
               className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
            />
            <motion.div 
               initial={{ opacity: 0, y: 50 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 50 }}
               className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative z-10"
            >
               <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">Anotação</h3>
               <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-6">
                 {data?.book.name} {chapter}:{(() => {
                   if (selectedVerses.length > 1) {
                     const sorted = [...selectedVerses].sort((a, b) => a - b);
                     return `${sorted[0]}-${sorted[sorted.length - 1]}`;
                   }
                   return selectedVerses[0] || lastSelectedVerse;
                 })()}
               </p>
               
               <textarea 
                 autoFocus
                 value={noteContent}
                 onChange={(e) => setNoteContent(e.target.value)}
                 className="w-full h-40 p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-200 text-stone-800 placeholder-stone-300 mb-6"
                 placeholder="O que o Espírito diz a você através deste versículo?"
               />
               
               <div className="flex gap-3">
                 <button 
                   onClick={() => setShowNoteModal(false)}
                   className="flex-1 py-3 border border-stone-200 rounded-xl text-stone-600 font-medium hover:bg-stone-50 transition-colors"
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={saveNote}
                   disabled={savingNote || !noteContent.trim()}
                   className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all disabled:opacity-50"
                 >
                   {savingNote ? 'Salvando...' : 'Salvar Nota'}
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Removed Redundant Header */}

      <div className={cn("space-y-4 leading-relaxed selection:bg-stone-500/20", fontClasses, sizeClasses)}>
        {data?.verses.map((v) => (
          <div 
            key={v.number}
            id={`verse-${v.number}`}
            className={cn(
               "group relative p-2 rounded-xl transition-all duration-300",
               selectedVerses.includes(v.number) ? "bg-black/5 ring-1 ring-black/10" : "hover:bg-black/2"
            )}
            onClick={() => {
               const selection = window.getSelection()?.toString();
               if (!selection) {
                 toggleVerseSelection(v.number);
               }
            }}
          >
            <span 
              className={cn(
                "opacity-40 font-bold select-none pointer-events-none align-baseline mr-2",
                isInterlinear ? "bible-verse-number" : "font-sans"
              )}
              style={{ fontSize: `${fontSizePx - 2}px` }}
            >
              {v.number}
              {readVerses.has(`${bookAbbrev}.${chapter}.${v.number}`) && (
                <CheckCircle2 className="inline w-3 h-3 text-green-600 ml-1" />
              )}
            </span>
            <span className={cn(
              "transition-colors duration-500",
              readVerses.has(`${bookAbbrev}.${chapter}.${v.number}`) ? "opacity-30" : "opacity-100"
            )}>
              {/* Verse Text Rendering with Strong's and Highlights */}
              {(() => {
                const verseHighlights = highlights.filter(h => h.verseId === `${bookAbbrev}.${chapter}.${v.number}`);
                const isARAi = version === 'arai';
                
                // Logging as requested
                if (isARAi) {
                  console.log("[ARAI MODULE]", { 
                    version, 
                    book: bookAbbrev, 
                    chapter, 
                    verse: v.number, 
                    hasTokens: !!(v as any).tokens,
                    hasStrongs: v.text.includes('<S'),
                    textSnippet: v.text.substring(0, 40)
                  });
                }

                let renderedNodes: React.ReactNode[] = [];

                // 1. Check for Token-based structure (Modern format)
                if (isARAi && (v as any).tokens) {
                  const tokens = (v as any).tokens;
                  renderedNodes = tokens.map((token: any, idx: number) => {
                    console.log("[STRONG TOKEN]", token);
                    if (token.strong) {
                      return (
                        <span 
                          key={`token-${idx}`} 
                          className="strong-token group relative inline-block cursor-pointer mx-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log("[STRONG CLICK]", token.strong);
                            setActiveStrongId(token.strong);
                          }}
                        >
                          <span className={cn("bible-text", !token.word && "italic opacity-50")}>
                            {token.word || token.lemma || "..."}
                          </span>
                          <sup className="text-[10px] text-[#2D5A27] font-bold ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            {token.strong}
                          </sup>
                        </span>
                      );
                    }
                    return <span key={`token-${idx}`} className="mx-0.5">{token.word}</span>;
                  });
                } else {
                  // 2. Tag-based parsing (Legacy/Fallback format)
                  // Handle Strong's Numbers tags <S>G1234</S> and Original Words <O>...</O>
                  const tagRegex = /(<S>[HG]\d+<\/S>|<S\s+[HG]\d+>|<S>[HG]\d+|<O>[^<]+<\/O>|\[[HG]\d+\]|\([HG]\d+\)|[HG]\d{3,5})/gi;
                  let currentText = v.text;
                  let lastIndex = 0;
                  let match;

                  while ((match = tagRegex.exec(currentText)) !== null) {
                    if (match.index > lastIndex) {
                      renderedNodes.push(currentText.substring(lastIndex, match.index));
                    }
                    
                    const tagContent = match[0];
                    const strongIdMatch = tagContent.match(/[HG]\d+/i);
                    const strongId = strongIdMatch ? strongIdMatch[0].toUpperCase() : null;

                    // If it's a naked Strong (just G1234) we only render it if it's NOT part of a word or we are in Interlinear mode
                    const isNakedStrong = !tagContent.includes('<') && !tagContent.includes('[') && !tagContent.includes('(');
                    const shouldRender = strongId && (!isNakedStrong || isInterlinear);

                    if (shouldRender && strongId) {
                      renderedNodes.push(
                        <button
                          key={`strong-${strongId}-${match.index}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log("[STRONG CLICK]", strongId);
                            setActiveStrongId(strongId);
                          }}
                          className={cn(
                            "inline-flex items-center justify-center px-1.5 mx-0.5 font-bold font-sans rounded transition-all select-none",
                            "relative -top-1",
                            "hover:bg-stone-800 hover:text-white z-10",
                            isInterlinear ? "text-[#2D5A27] dark:text-green-400 text-[11px]" : "bg-stone-100/80 text-stone-900 border border-stone-200/50 dark:bg-stone-800 dark:text-stone-200 text-[10px]"
                          )}
                        >
                          {strongId}
                        </button>
                      );
                    } else if (tagContent.startsWith('<O>')) {
                      const originalWord = tagContent.replace(/<\/?O>/g, '');
                      renderedNodes.push(
                        <span
                          key={`original-${originalWord}-${match.index}`}
                          className="bible-original-word"
                          onClick={(e) => {
                            e.stopPropagation();
                            const prevStrong = renderedNodes.slice().reverse().find(n => React.isValidElement(n) && n.key?.toString().startsWith('strong-'));
                            if (prevStrong) {
                               const sid = (prevStrong as any).key.split('-')[1];
                               console.log("[STRONG CLICK]", sid);
                               setActiveStrongId(sid);
                            }
                          }}
                        >
                          {originalWord}
                        </span>
                      );
                    }
                    
                    lastIndex = tagRegex.lastIndex;
                  }
                  
                  if (lastIndex < currentText.length) {
                    renderedNodes.push(currentText.substring(lastIndex));
                  }
                }
                
                // If no nodes (no strongs or tags), use original text as first node
                if (renderedNodes.length === 0) renderedNodes = [v.text];

                // Second pass: Apply Highlights
                if (verseHighlights.length === 0) return renderedNodes;

                let finalRenderedText = [...renderedNodes];
                
                verseHighlights.forEach(h => {
                  if (!h.text) return;
                  const newFinal: React.ReactNode[] = [];
                  
                  finalRenderedText.forEach(segment => {
                    if (typeof segment !== 'string') {
                      newFinal.push(segment);
                      return;
                    }
                    
                    const escaped = h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
                    const parts = segment.split(new RegExp(`(${escaped})`, 'gi'));
                    
                    if (parts.length > 1) {
                      parts.forEach((part, i) => {
                        if (i % 2 === 1) {
                          newFinal.push(
                            <mark 
                              key={`${h.id}-${i}`}
                              style={{ backgroundColor: h.color }}
                              className="px-0.5 rounded cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); removeHighlight(h.id); }}
                            >
                              {part}
                            </mark>
                          );
                        } else if (part) {
                          newFinal.push(part);
                        }
                      });
                    } else {
                      newFinal.push(segment);
                    }
                  });
                  finalRenderedText = newFinal;
                });
                
                return finalRenderedText;
              })()}
            </span>

            {/* Inline Verse Menu (The "Janela" requested) */}
            <AnimatePresence mode="wait">
              {selectedVerses.length === 1 && selectedVerses[0] === v.number && !selectionRect && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-white shadow-2xl border border-stone-200 rounded-2xl p-1.5 flex items-center gap-1 z-[60] verse-actions-menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(); }}
                    className="p-2 hover:bg-stone-50 rounded-xl transition-colors text-stone-600 flex items-center gap-2 px-3"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase">Copiar</span>
                  </button>
                  <div className="w-px h-4 bg-stone-100" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); openNoteModal(v.number); }}
                    className="p-2 hover:bg-stone-50 rounded-xl transition-colors text-stone-600 flex items-center gap-2 px-3"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase">Nota</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedVerses([]); }}
                    className="p-2 hover:bg-stone-50 rounded-xl transition-colors text-stone-400"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Floating Selection Toolbar */}
      <AnimatePresence>
        {selectedVerses.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] w-[95%] max-w-lg"
          >
            <div className={cn(
              "bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col",
              settings.theme === 'dark' && "bg-stone-900 border-stone-800"
            )}>
              <div className="px-6 py-3 border-b border-stone-100 flex items-center justify-between">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                  {selectedVerses.length} {selectedVerses.length === 1 ? 'Versículo selecionado' : 'Versículos selecionados'}
                </span>
                <button 
                  onClick={() => { setSelectedVerses([]); setLastSelectedVerse(null); }}
                  className="p-1 hover:bg-stone-100 rounded-lg"
                >
                  <RotateCcw className="w-4 h-4 text-stone-400" />
                </button>
              </div>
              
              <div className="grid grid-cols-4 gap-1 p-2">
                <button 
                  onClick={copyToClipboard}
                  className="flex flex-col items-center gap-2 p-3 hover:bg-stone-50 rounded-2xl transition-colors text-stone-600"
                >
                  <Copy className="w-6 h-6" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Copiar</span>
                </button>
                
                <button 
                  onClick={() => markSelectedAsRead(false)}
                  className="flex flex-col items-center gap-2 p-3 hover:bg-stone-50 rounded-2xl transition-colors text-stone-600"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Lido</span>
                </button>

                <button 
                  onClick={() => {
                    openNoteModal(selectedVerses[0] || lastSelectedVerse!);
                  }}
                  className="flex flex-col items-center gap-2 p-3 hover:bg-stone-50 rounded-2xl transition-colors text-stone-600 disabled:opacity-30"
                >
                  <MessageSquare className="w-6 h-6" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Nota</span>
                </button>

                <button 
                  onClick={() => markSelectedAsRead(true)}
                  className="flex flex-col items-center gap-2 p-3 hover:bg-stone-50 rounded-2xl transition-colors text-stone-600"
                >
                  <RotateCcw className="w-6 h-6" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Reset</span>
                </button>
              </div>
              
              {selectedVerses.length === 1 && (
                <div className="px-4 pb-4 flex gap-2">
                  {['#FEF08A', '#BBF7D0', '#BFDBFE', '#FBCFE8'].map(color => (
                    <button 
                      key={color}
                      onClick={() => {
                        handleHighlight(color, data?.verses.find(v => v.number === selectedVerses[0])?.text, selectedVerses[0]);
                        setSelectedVerses([]);
                      }}
                      className="flex-1 aspect-square rounded-xl border border-stone-100 shadow-sm transition-all hover:scale-105"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {selectionRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed z-[200] bg-white shadow-2xl border border-stone-200 rounded-3xl p-4 min-w-[240px] verse-actions-menu translate-y-2"
            style={{
              top: selectionRect.top + 10,
              left: Math.min(window.innerWidth - 260, Math.max(20, selectionRect.left - 120))
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                  <Highlighter className="w-3 h-3" />
                  Destacar Seleção
                </span>
                <button 
                  onClick={() => { 
                    window.getSelection()?.removeAllRanges(); 
                    setSelectionRect(null);
                  }}
                  className="p-1 hover:bg-stone-50 rounded-lg"
                >
                  <RotateCcw className="w-3 h-3 text-stone-400" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {['#FEF08A', '#BBF7D0', '#BFDBFE', '#FBCFE8'].map(color => (
                   <button 
                    key={color}
                    onClick={() => handleHighlight(color)}
                    className="w-full aspect-square rounded-2xl border border-stone-100 shadow-sm hover:scale-110 active:scale-95 transition-all"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="border-t border-stone-100 pt-2 grid grid-cols-2 gap-2">
                <button 
                  onClick={() => {
                    if (selectedText) {
                      navigator.clipboard.writeText(selectedText);
                      setSelectionRect(null);
                    }
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 bg-stone-50 text-stone-600 rounded-xl transition-colors text-xs font-bold hover:bg-stone-100"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar
                </button>
                <button 
                  onClick={() => openNoteModal(selectedVerse || selectedVerses[0] || lastSelectedVerse!)}
                  className="flex items-center justify-center gap-2 py-2.5 bg-stone-50 text-stone-600 rounded-xl transition-colors text-xs font-bold hover:bg-stone-100"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Nota
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-20 pt-12 border-t border-stone-200 flex flex-col items-center gap-8">
         <StrongDictionaryModal 
           strongId={activeStrongId} 
           onClose={() => setActiveStrongId(null)} 
         />
         <p className="text-stone-400 font-serif italic text-sm text-center px-6 leading-relaxed">
           "Lâmpada para os meus pés é tua palavra e luz, para o meu caminho."<br/>
           <span className="not-italic font-sans text-[10px] font-bold uppercase tracking-widest mt-2 block opacity-60">— Salmos 119:105</span>
         </p>
         
         <div className="flex flex-col gap-4 w-full max-w-sm px-4 footer-navigation-container pb-12 md:pb-0">
           <div className="grid grid-cols-2 gap-3">
             <button 
               onClick={() => navigateChapter(-1)}
               className="px-4 py-6 bg-stone-100 text-stone-700 rounded-[2rem] font-bold text-sm hover:bg-stone-200 transition-all flex flex-col items-center justify-center gap-2 border border-stone-200/50 shadow-sm active:scale-95"
             >
               <ChevronLeft className="w-6 h-6 text-stone-400" />
               <span className="text-[10px] uppercase tracking-wider opacity-60">Anterior</span>
             </button>
             
             <button 
               onClick={() => navigateChapter(1)}
               className="px-4 py-6 bg-stone-900 text-white rounded-[2rem] font-bold text-sm hover:bg-stone-800 transition-all transform active:scale-95 flex flex-col items-center justify-center gap-2 shadow-xl shadow-stone-900/20"
             >
               <ChevronRight className="w-6 h-6 text-stone-400/50" />
               <span className="text-[10px] uppercase tracking-wider text-stone-400">Próximo</span>
             </button>
           </div>
           
           <div className="grid grid-cols-2 gap-3">
             <button 
               onClick={markChapterAsRead}
               className="px-4 py-6 bg-green-50 text-stone-700 rounded-[2rem] font-bold text-sm hover:bg-green-100 transition-all flex flex-col items-center justify-center gap-2 border border-green-100 shadow-sm active:scale-95"
             >
               <CheckCircle2 className="w-6 h-6 text-green-600" />
               <span className="text-[10px] uppercase tracking-wider text-stone-400">Marcar</span>
             </button>
 
             <button 
               onClick={unmarkChapterAsRead}
               className="px-4 py-6 bg-stone-50 text-stone-700 rounded-[2rem] font-bold text-sm hover:bg-stone-100 transition-all flex flex-col items-center justify-center gap-2 border border-stone-200/50 shadow-sm active:scale-95"
             >
               <MinusCircle className="w-6 h-6 text-stone-300" />
               <span className="text-[10px] uppercase tracking-wider text-stone-400">Desmarcar</span>
             </button>
           </div>

           <a 
             href="https://payhip.com/andresabatini"
             target="_blank"
             rel="noopener noreferrer"
             className="mt-4 text-stone-400 text-sm uppercase font-bold tracking-[0.2em] hover:text-stone-600 transition-colors flex items-center justify-center gap-2"
           >
             <BookOpen className="w-3.5 h-3.5" /> Veja os livros do autor
           </a>
         </div>
      </div>
    </div>
  </div>
);
}
