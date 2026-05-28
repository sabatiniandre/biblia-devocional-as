import React, { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  User,
  signOut 
} from 'firebase/auth';
import { 
  BookOpen, 
  Calendar, 
  Search, 
  StickyNote, 
  Settings, 
  Library,
  MessageSquare,
  Map as MapIcon,
  LogOut,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Highlighter,
  Eraser,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  Package,
  Zap,
  ZapOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthorFooter } from './components/AuthorFooter';
import { Reader } from './components/Reader';
import { ProgressMap } from './components/ProgressMap';
import { SearchView } from './components/SearchView';
import { NotesView } from './components/NotesView';
import { LibraryView } from './components/LibraryView';
import { DevotionalView } from './components/DevotionalView';
import { TourGuide } from './components/TourGuide';
import { HighlightsView } from './components/HighlightsView';
import { ModulesView } from './components/ModulesView';
import { CommentaryView } from './components/CommentaryView';
import { VerseOfTheDayModal } from './components/VerseOfTheDayModal';
import { InstallGuide } from './components/InstallGuide';
import { cn } from './lib/utils';
import { promises } from './data/promises';
import { BIBLICAL_BOOKS } from './data/bible-books';

type Tab = 'read' | 'progress' | 'search' | 'notes' | 'library' | 'devotional' | 'highlights' | 'modules' | 'commentary' | 'settings_sidebar';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('read');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentReference, setCurrentReference] = useState(() => {
    const saved = localStorage.getItem('lastReadReference');
    return (saved && saved.includes('/')) ? saved : 'ara/gn/1';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [showDailyVerse, setShowDailyVerse] = useState(true);
  const [readerSettings, setReaderSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('readerSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure valid font size, defaulting to 'lg' (24px) if missing or invalid
        if (!['base', 'lg', 'xl', '2xl', '3xl', '4xl'].includes(parsed.fontSize)) {
          parsed.fontSize = 'lg';
        }
        return parsed;
      }
    } catch {}
    return {
      theme: 'sepia',
      font: 'serif',
      fontSize: 'lg', // 24px
      economyMode: false
    };
  });
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  
  // Quota retry timer
  useEffect(() => {
    if (quotaExceeded) {
      const timer = setTimeout(() => {
        setQuotaExceeded(false);
        console.log('Attempting to resume Firestore operations after quota wait...');
      }, 30 * 60 * 1000); // 30 minutes
      return () => clearTimeout(timer);
    }
  }, [quotaExceeded]);
  
  const [highlightMode, setHighlightMode] = useState(false);
  const [eraseMode, setEraseMode] = useState(false);
  const [activeHighlightColorIndex, setActiveHighlightColorIndex] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [showPickerInReader, setShowPickerInReader] = useState(false);
  const [pickerType, setPickerType] = useState<'book' | 'version'>('book');
  const [books, setBooks] = useState<any[]>([]);
  
  useEffect(() => {
    if (!initializing) {
      import('./services/backgroundSync').then(m => {
        m.backgroundSync.runInitialSync();
      });
    }
  }, [initializing]);

  useEffect(() => {
    import('./services/bibleService').then(m => {
      m.bibleService.getBooks().then(setBooks);
    });
  }, []);

  useEffect(() => {
    // Update theme-color meta tag dynamically
    const themeBg = {
      dark: '#0c0a09',
      sepia: '#F4ECD8',
      paper: '#F5F5F0',
      light: '#ffffff'
    }[readerSettings.theme as 'dark' | 'sepia' | 'paper' | 'light'] || '#ffffff';
    
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', themeBg);

    // Also update apple-mobile-web-app-status-bar-style if possible
    // Note: status-bar-style only supports default, black, black-translucent
    const appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleMeta) {
      appleMeta.setAttribute('content', readerSettings.theme === 'dark' ? 'black' : 'default');
    }
  }, [readerSettings.theme]);
  const isLongPress = React.useRef(false);
  const colors = ['#FEF08A', '#BBF7D0', '#BFDBFE', '#FBCFE8'];
  const longPressTimer = React.useRef<any>(null);
  const installEventTracked = React.useRef(false);

  useEffect(() => {
    // Track PWA Installations
    const handleAppInstalled = async () => {
      if (installEventTracked.current) return;
      installEventTracked.current = true;
      
      try {
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        await addDoc(collection(db, 'analytics', 'installs', 'records'), {
          type: 'installation',
          timestamp: serverTimestamp(),
          userAgent: navigator.userAgent,
          platform: navigator.platform
        });
        console.log('Installation tracked successfully');
      } catch (err) {
        console.error('Error tracking installation:', err);
      }
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Check if launched as PWA (standalone)
    if (window.matchMedia('(display-mode: standalone)').matches) {
       // Optional: you could track PWA launches here too
    }

    return () => window.removeEventListener('appinstalled', handleAppInstalled);
  }, []);

  useEffect(() => {
    // Routine to check for app updates every 24 hours
    const checkUpdate = async () => {
      if (!('serviceWorker' in navigator)) return;
      
      const lastCheck = localStorage.getItem('last_update_check');
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000;
      
      if (!lastCheck || (now - parseInt(lastCheck)) > ONE_DAY) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            localStorage.setItem('last_update_check', now.toString());
            console.log('Checking for service worker updates (24h routine)...');
            await registration.update();
          }
        } catch (err) {
          console.error('Manual update check failed:', err);
        }
      }
    };
    
    checkUpdate();
    const interval = setInterval(checkUpdate, 60 * 60 * 1000); // Check every hour while app is open
    return () => clearInterval(interval);
  }, []);

  const handleHighlightButtonClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }
    setHighlightMode(!highlightMode);
    if (!highlightMode) setEraseMode(false);
  };

  const handleEraserButtonClick = () => {
    setEraseMode(!eraseMode);
    if (!eraseMode) setHighlightMode(false);
  };

  const startLongPress = (e: React.MouseEvent | React.TouchEvent) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowColorPicker(true);
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 2000);
  };

  const endLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const toggleReminders = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          setRemindersEnabled(!remindersEnabled);
        }
      });
    } else {
      setRemindersEnabled(!remindersEnabled);
    }
  };

  // Daily verse logic is now handled in useState initializer to prevent double-shuffle

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const userRef = doc(db, 'users', u.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Sync logic: Preference for Cloud if it exists, otherwise Local
            if (userData.lastReadReference && !localStorage.getItem('lastReadReference')) {
              setCurrentReference(userData.lastReadReference);
              localStorage.setItem('lastReadReference', userData.lastReadReference);
            }
            if (userData.readerSettings) {
              setReaderSettings(prev => {
                const merged = { ...prev, ...userData.readerSettings };
                localStorage.setItem('readerSettings', JSON.stringify(merged));
                return merged;
              });
            }
          } else {
            // New user initialization
            const { setDoc, serverTimestamp } = await import('firebase/firestore');
            await setDoc(userRef, {
              userId: u.uid,
              email: u.email,
              displayName: u.displayName,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              preferredVersion: 'ara',
              theme: readerSettings.theme,
              readerSettings: readerSettings,
              lastReadReference: currentReference
            });
          }
        } catch (err: any) {
          if (err?.code === 'resource-exhausted') {
            setQuotaExceeded(true);
            console.warn('Firebase Quota hit. Running in local mode.');
          } else {
            console.error('Initial sync error:', err);
          }
        }
      }
      setInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  const lastFirestoreUpdate = React.useRef<Record<string, number>>({});

  const updateReaderSettings = async (newSettings: Partial<typeof readerSettings>) => {
    const updated = { ...readerSettings, ...newSettings };
    setReaderSettings(updated);
    localStorage.setItem('readerSettings', JSON.stringify(updated));
    
    const now = Date.now();
    const lastUpdate = lastFirestoreUpdate.current['settings'] || 0;
    
    // Throttle settings updates to once per 15 seconds to save quota
    // ALSO respect Economy Mode: if ON, skip Firestore
    if (user && !quotaExceeded && !updated.economyMode && (now - lastUpdate > 15000)) {
      try {
        const { setDoc, doc, serverTimestamp } = await import('firebase/firestore');
        lastFirestoreUpdate.current['settings'] = now;
        await setDoc(doc(db, 'users', user.uid), { 
          readerSettings: updated,
          updatedAt: serverTimestamp() 
        }, { merge: true });
      } catch (err: any) {
        if (err?.code === 'resource-exhausted' || err?.message?.toLowerCase().includes('quota')) {
          setQuotaExceeded(true);
        } else {
          console.error(err);
        }
      }
    }
  };

  const handleUpdateReference = async (ref: string) => {
    if (!ref || !ref.includes('/')) return;
    
    // Immediate UI update
    setCurrentReference(ref);
    localStorage.setItem('lastReadReference', ref);
    
    const now = Date.now();
    const lastUpdate = lastFirestoreUpdate.current['reference'] || 0;
    
    // Throttle reference cloud updates to once per 20 seconds to save quota
    // ALSO respect Economy Mode: if ON, skip Firestore sync
    if (user && !quotaExceeded && !readerSettings.economyMode && (now - lastUpdate > 20000)) {
      try {
        const { setDoc, doc, serverTimestamp } = await import('firebase/firestore');
        lastFirestoreUpdate.current['reference'] = now;
        await setDoc(doc(db, 'users', user.uid), { 
          lastReadReference: ref,
          updatedAt: serverTimestamp() 
        }, { merge: true });
      } catch (err: any) {
        if (err?.code === 'resource-exhausted' || err?.message?.toLowerCase().includes('quota')) {
          setQuotaExceeded(true);
        } else {
          console.error(err);
        }
      }
    }
  };

  const navigateChapter = async (dir: number) => {
    const parts = currentReference.split('/');
    const version = parts[0];
    const bookAbbrev = parts[1];
    const chapter = parseInt(parts[2]);
    
    let nextChapter = chapter + dir;
    let nextBook = bookAbbrev;
    
    const currentBook = books.find(b => b.abbrev.pt === bookAbbrev);
    
    if (nextChapter < 1) {
      const currentIndex = books.findIndex(b => b.abbrev.pt === bookAbbrev);
      if (currentIndex > 0) {
        const prevBook = books[currentIndex - 1];
        nextBook = prevBook.abbrev.pt;
        nextChapter = prevBook.chapters;
      } else {
        return;
      }
    } else if (currentBook && nextChapter > currentBook.chapters) {
      const currentIndex = books.findIndex(b => b.abbrev.pt === bookAbbrev);
      if (currentIndex < books.length - 1) {
        const followingBook = books[currentIndex + 1];
        nextBook = followingBook.abbrev.pt;
        nextChapter = 1;
      } else {
        return;
      }
    }
    
    const newRef = `${version}/${nextBook}/${nextChapter}`;
    handleUpdateReference(newRef);
  };

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = () => signOut(auth);

  const resetAppData = async () => {
    if (!user) return;
    
    setIsResetting(true);
    try {
      const { collection, getDocs, deleteDoc, doc, writeBatch } = await import('firebase/firestore');
      
      const collectionsToReset = ['highlights', 'annotations', 'readingProgress'];
      
      for (const collName of collectionsToReset) {
        const collRef = collection(db, 'users', user.uid, collName);
        const snapshot = await getDocs(collRef);
        
        // Use batches for efficiency if there are many docs
        // Firestore batches are limited to 500 operations
        const docs = snapshot.docs;
        for (let i = 0; i < docs.length; i += 500) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + 500);
          chunk.forEach((d) => {
            batch.delete(d.ref);
          });
          await batch.commit();
        }
      }
      
      // Also reset user profile settings
      const userRef = doc(db, 'users', user.uid);
      await deleteDoc(userRef);
      
      // Reload the page to reset the state
      window.location.reload();
    } catch (error) {
      console.error("Error resetting app data:", error);
      alert("Erro ao reiniciar dados. Tente novamente.");
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  const currentBookAbbrev = currentReference.split('/')[1];
  const currentChapter = currentReference.split('/')[2];
  const currentBookName = BIBLICAL_BOOKS.find(b => b.abbrev === currentBookAbbrev)?.name || 'Leitura';

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6"
        >
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-10 h-10 text-stone-800" />
          </div>
          <h1 className="text-3xl font-serif font-medium text-stone-900">Bíblia devocional AS</h1>
          <p className="text-stone-600">Sincronize seu progresso, faça anotações e explore as escrituras com profundidade.</p>
          <button 
            onClick={login}
            className="w-full bg-stone-800 text-white py-3 rounded-xl font-medium hover:bg-stone-700 transition-colors flex items-center justify-center gap-2"
          >
            <UserIcon className="w-5 h-5" />
            Entrar com Google
          </button>
        </motion.div>
      </div>
    );
  }

  const tabs = [
    { id: 'read', icon: BookOpen, label: 'Bíblia (Leitura)' },
    { id: 'devotional', icon: Lightbulb, label: 'Plano de Leitura' },
    { id: 'commentary', icon: MessageSquare, label: 'Comentários' },
    { id: 'progress', icon: MapIcon, label: 'Meu Mapa' },
    { id: 'search', icon: Search, label: 'Pesquisa' },
    { id: 'highlights', icon: Highlighter, label: 'Marcações' },
    { id: 'notes', icon: StickyNote, label: 'Anotações' },
    { id: 'library', icon: Library, label: 'Dicionários' },
    { id: 'modules', icon: Package, label: '📦 Módulos' },
    { id: 'settings_sidebar', icon: Settings, label: 'Configurações' },
    { id: 'tour', icon: HelpCircle, label: 'Tour pelo App' },
  ];

  // Map icons for safety (some might not be imported)
  const MessageSquareIcon = MessageSquare;

  return (
    <div className={cn(
      "h-[100dvh] w-screen flex flex-col lg:flex-row overflow-hidden transition-colors duration-500",
      {
        'bg-[#F5F5F0]': readerSettings.theme === 'paper',
        'bg-[#F4ECD8]': readerSettings.theme === 'sepia',
        'bg-white': readerSettings.theme === 'light',
        'bg-stone-950': readerSettings.theme === 'dark',
      }
    )}>
      {/* Dynamic Theme Color Meta */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --theme-bg: ${
            readerSettings.theme === 'dark' ? '#0c0a09' : 
            readerSettings.theme === 'sepia' ? '#F4ECD8' : 
            readerSettings.theme === 'paper' ? '#F5F5F0' : '#ffffff'
          };
        }
      `}} />
      
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[75] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 border-r z-[90] transform transition-transform duration-300 lg:relative lg:translate-x-0 flex flex-col transition-colors duration-500",
        readerSettings.theme === 'dark' ? "bg-stone-900 border-stone-800" : "bg-white border-stone-200",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", readerSettings.theme === 'dark' ? "bg-stone-800" : "bg-stone-800")}>
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className={cn("font-serif font-bold text-lg", readerSettings.theme === 'dark' ? "text-stone-100" : "text-stone-900")}>Devocional AS</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-black/10 rounded-full">
            <X className={cn("w-5 h-5", readerSettings.theme === 'dark' ? "text-stone-400" : "text-stone-500")} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'tour') {
                  setIsTourActive(true);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  return;
                }
                setActiveTab(tab.id as Tab);
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200",
                activeTab === tab.id 
                  ? (readerSettings.theme === 'dark' ? "bg-stone-800 text-stone-100 border-l-4 border-stone-100" : "bg-stone-100 text-stone-900 border-l-4 border-stone-800")
                  : (readerSettings.theme === 'dark' ? "text-stone-400 hover:bg-stone-800 hover:text-stone-100" : "text-stone-500 hover:bg-stone-50 hover:text-stone-800")
              )}
            >
              <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? (readerSettings.theme === 'dark' ? "text-stone-100" : "text-stone-800") : "text-stone-400")} />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}

          <button
            onClick={() => setShowResetConfirm(true)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 mt-4 border border-dashed",
              readerSettings.theme === 'dark' 
                ? "text-red-400 border-stone-800 hover:bg-red-500/10" 
                : "text-red-500 border-stone-200 hover:bg-red-50"
            )}
          >
            <RefreshCw className="w-5 h-5 opacity-70" />
            <span className="font-medium">Reiniciar App</span>
          </button>
        </nav>

        <div className={cn("p-4 border-t", readerSettings.theme === 'dark' ? "border-stone-800" : "border-stone-100")}>
          <div className={cn("flex items-center gap-3 p-3 rounded-2xl", readerSettings.theme === 'dark' ? "bg-stone-800" : "bg-stone-50")}>
            <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border border-stone-200" />
            <div className="flex-1 overflow-hidden">
              <p className={cn("text-sm font-medium truncate", readerSettings.theme === 'dark' ? "text-stone-100" : "text-stone-900")}>{user.displayName}</p>
              <p className="text-xs text-stone-500 truncate">{user.email}</p>
            </div>
            <button onClick={logout} className="p-2 hover:bg-black/10 rounded-full transition-colors">
              <LogOut className="w-4 h-4 text-stone-500" />
            </button>
          </div>
          <div className="mt-4 text-[10px] text-center text-stone-400 font-bold uppercase tracking-[0.2em] opacity-50">
            v1.2.5 • AS
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className={cn(
          "h-16 md:h-16 border-b px-2 md:px-4 flex items-center justify-between z-[80] shadow-sm transition-colors duration-500 shrink-0 sticky top-0",
          "pt-[env(safe-area-inset-top)] box-content",
          {
            'bg-stone-950 border-stone-800 text-stone-100': readerSettings.theme === 'dark',
            'bg-[#F5F5F0] border-stone-200 text-stone-900': readerSettings.theme === 'paper',
            'bg-[#F4ECD8] border-[#E2D2B5] text-[#5B4636]': readerSettings.theme === 'sepia',
            'bg-white border-stone-100 text-stone-900': readerSettings.theme === 'light',
          }
        )}>
          <div className="flex items-center gap-1 md:gap-3 overflow-hidden">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className={cn("p-2 rounded-xl transition-colors shrink-0", readerSettings.theme === 'dark' ? "hover:bg-stone-800 text-stone-400" : "hover:bg-stone-100 text-stone-600")}
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {activeTab === 'read' ? (
              <div className="flex items-center gap-0.5 md:gap-1.5 ml-1 overflow-hidden">
                <button 
                  onClick={() => navigateChapter(-1)}
                  className={cn("p-1.5 md:p-2 rounded-xl transition-colors shrink-0", readerSettings.theme === 'dark' ? "hover:bg-stone-800 text-stone-400" : "hover:bg-stone-100 text-stone-600")}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="overflow-hidden">
                  <button 
                    onClick={() => { setPickerType('book'); setShowPickerInReader(true); }}
                    className={cn("px-2 md:px-3 py-1.5 rounded-xl transition-all font-serif font-bold text-base md:text-lg truncate block max-w-[120px] md:max-w-none text-left", 
                      readerSettings.theme === 'dark' ? "hover:bg-stone-800 text-stone-100" : "hover:bg-stone-100 text-stone-900"
                    )}
                  >
                    {currentReference.split('/')[1].toUpperCase()} {currentReference.split('/')[2]}
                  </button>
                </div>
                <button 
                  onClick={() => navigateChapter(1)}
                  className={cn("p-1.5 md:p-2 rounded-xl transition-colors shrink-0", readerSettings.theme === 'dark' ? "hover:bg-stone-800 text-stone-400" : "hover:bg-stone-100 text-stone-600")}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <h2 className={cn("font-serif text-lg md:text-xl capitalize ml-2 truncate", readerSettings.theme === 'dark' ? "text-stone-100" : "text-stone-800")}>
                {tabs.find(t => t.id === activeTab)?.label}
              </h2>
            )}
          </div>

          <div className="flex items-center gap-0.5 md:gap-1.5 shrink-0">
            {activeTab === 'read' && (
              <>
                <button
                  onMouseDown={startLongPress}
                  onMouseUp={endLongPress}
                  onMouseLeave={endLongPress}
                  onTouchStart={startLongPress}
                  onTouchEnd={endLongPress}
                  onClick={handleHighlightButtonClick}
                  className={cn(
                    "p-2 rounded-xl transition-all flex items-center justify-center relative",
                    highlightMode 
                      ? (readerSettings.theme === 'dark' ? "bg-white text-stone-900" : "bg-stone-900 text-white shadow-md shadow-stone-900/10") 
                      : "hover:bg-black/5 text-stone-400"
                  )}
                >
                  <Highlighter className="w-5 h-5 md:w-6 md:h-6" />
                  {!highlightMode && (
                    <div 
                      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border border-white shadow-sm" 
                      style={{ backgroundColor: colors[activeHighlightColorIndex] }}
                    />
                  )}
                </button>

                <button
                  onClick={handleEraserButtonClick}
                  className={cn(
                    "p-2 rounded-xl transition-all flex items-center justify-center",
                    eraseMode 
                      ? (readerSettings.theme === 'dark' ? "bg-white text-stone-900" : "bg-stone-900 text-white shadow-md shadow-stone-900/10") 
                      : "hover:bg-black/5 text-stone-400"
                  )}
                >
                  <Eraser className="w-5 h-5 md:w-6 md:h-6" />
                </button>

                <button 
                  onClick={() => setActiveTab('commentary')}
                  className={cn(
                    "p-3 rounded-2xl flex items-center gap-2 transition-all active:scale-95 group",
                    readerSettings.theme === 'dark' ? "bg-stone-800 text-stone-100" : "bg-stone-50 hover:bg-stone-100 text-stone-400"
                  )}
                  title="Abrir Comentários"
                >
                  <MessageSquareIcon className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">Comentário</span>
                </button>
              </>
            )}
          </div>
        </header>

        <AnimatePresence>
          {showColorPicker && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowColorPicker(false)}
                className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl relative z-10"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest">Cor do Destaque</h3>
                  <button onClick={() => setShowColorPicker(false)} className="p-1 hover:bg-stone-100 rounded-full">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {colors.map((color, index) => (
                    <button 
                      key={color}
                      onClick={() => {
                        setActiveHighlightColorIndex(index);
                        setShowColorPicker(false);
                      }}
                      className={cn(
                        "w-full aspect-square rounded-2xl border-2 transition-all",
                        activeHighlightColorIndex === index ? "border-stone-900 scale-110 shadow-md" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showResetConfirm && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isResetting && setShowResetConfirm(false)}
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl relative z-10 text-center"
              >
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">Reiniciar Aplicativo?</h3>
                <p className="text-stone-500 text-sm mb-8 leading-relaxed">
                  Isso apagará permanentemente todos os seus destaques, anotações, histórico de leitura e configurações. Esta ação não pode ser desfeita.
                </p>
                
                <div className="space-y-3">
                  <button 
                    disabled={isResetting}
                    onClick={resetAppData}
                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold transition-all hover:bg-red-600 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isResetting ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : 'Sim, apagar tudo'}
                  </button>
                  <button 
                    disabled={isResetting}
                    onClick={() => setShowResetConfirm(false)}
                    className="w-full py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettings(false)}
                className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-serif font-bold text-stone-900">Configurações</h3>
                  <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-stone-100 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <button
                    onClick={async () => {
                      if (!window.confirm("Deseja atualizar o aplicativo agora?")) return;
                      const { forceAppUpdate } = await import('./services/updateManager')
                      await forceAppUpdate();
                    }}
                    className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Atualizar Aplicativo</span>
                  </button>

                  <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-stone-500" />
                      <div>
                        <p className="text-sm font-bold text-stone-900">Lembretes Diários</p>
                        <p className="text-xs text-stone-500">Receba notificações de leitura</p>
                      </div>
                    </div>
                    <button 
                      onClick={toggleReminders}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        remindersEnabled ? "bg-stone-900" : "bg-stone-200"
                      )}
                    >
                      <motion.div 
                        animate={{ x: remindersEnabled ? 24 : 2 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full"
                      />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest pl-1">Aparência do Texto</label>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-stone-500 ml-1">Fonte</p>
                        <select 
                          value={readerSettings.font}
                          onChange={(e) => updateReaderSettings({ font: e.target.value as any })}
                          className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none"
                        >
                          <option value="serif">Clássica (Serif)</option>
                          <option value="sans">Moderna (Sans)</option>
                          <option value="mono">Técnica (Mono)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-stone-500 ml-1">Tamanho</p>
                        <select 
                          value={readerSettings.fontSize}
                          onChange={(e) => updateReaderSettings({ fontSize: e.target.value as any })}
                          className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none"
                        >
                          <option value="base">Mínima (20px)</option>
                          <option value="lg">Regular (24px)</option>
                          <option value="xl">Média (30px)</option>
                          <option value="2xl">Grande (36px)</option>
                          <option value="3xl">Extra (48px)</option>
                          <option value="4xl">Máxima (60px)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-stone-500 ml-1">Tema de Fundo</p>
                       <div className="flex gap-3">
                          {[
                            { id: 'light', name: 'Claro', bg: 'bg-white', text: 'text-stone-900', border: 'border-stone-200' },
                            { id: 'sepia', name: 'Sépia', bg: 'bg-[#F4ECD8]', text: 'text-[#5B4636]', border: 'border-[#E2D2B5]' },
                            { id: 'paper', name: 'Papel', bg: 'bg-[#F5F5F0]', text: 'text-stone-800', border: 'border-stone-200' },
                            { id: 'dark', name: 'Escuro', bg: 'bg-stone-900', text: 'text-stone-200', border: 'border-stone-800' }
                          ].map((theme) => (
                            <button
                              key={theme.id}
                              onClick={() => updateReaderSettings({ theme: theme.id as any })}
                              className={cn(
                                "flex-1 aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
                                theme.bg,
                                readerSettings.theme === theme.id ? "ring-2 ring-stone-400 border-transparent scale-105" : theme.border
                              )}
                            >
                              <span className={cn("text-[10px] font-bold uppercase", theme.text)}>{theme.name}</span>
                            </button>
                          ))}
                       </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest pl-1">Versão Preferida</label>
                    <select 
                      value={currentReference.split('/')[0]}
                      onChange={(e) => {
                        const parts = currentReference.split('/');
                        const newRef = `${e.target.value}/${parts[1]}/${parts[2]}`;
                        handleUpdateReference(newRef);
                      }}
                      className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-200"
                    >
                      <option value="ara">ARA (Almeida Revista e Atualizada)</option>
                      <option value="nvibr">NVI (Nova Versão Internacional)</option>
                      <option value="arai">ARAi+ (Strong)</option>
                      <option value="acf">Almeida Corrigida Fiel</option>
                      <option value="ra">Almeida Revista e Atualizada</option>
                      <option value="rc">Almeida Revista e Corrigida</option>
                    </select>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-stone-100 flex justify-end">
                   <button 
                     onClick={() => setShowSettings(false)}
                     className="px-6 py-2 bg-stone-900 text-white rounded-xl font-medium"
                   >
                     Concluído
                   </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="flex-1 min-h-0 relative flex flex-col">
          {isTourActive && <TourGuide onClose={() => setIsTourActive(false)} />}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className={cn(
                "flex-1 w-full max-w-4xl mx-auto overflow-y-auto overflow-x-hidden",
                activeTab === 'read' ? "px-0" : "px-4 md:px-12 py-8"
              )}>
                  {activeTab === 'read' && (
                    <Reader 
                      reference={currentReference} 
                      setReference={handleUpdateReference} 
                      user={user} 
                      settings={readerSettings}
                      setTab={setActiveTab}
                      highlightMode={highlightMode}
                      activeColor={colors[activeHighlightColorIndex]}
                      eraseMode={eraseMode}
                      initialShowPicker={showPickerInReader}
                      pickerStep={pickerType}
                      onPickerClose={() => setShowPickerInReader(false)}
                      navigateChapter={navigateChapter}
                      quotaExceeded={quotaExceeded}
                      setQuotaExceeded={setQuotaExceeded}
                    />
                  )}
                  {activeTab === 'modules' && <ModulesView settings={readerSettings} updateSettings={updateReaderSettings} />}
                  {activeTab === 'progress' && <ProgressMap user={user} />}
                  {activeTab === 'search' && <SearchView user={user} reference={currentReference} setReference={handleUpdateReference} setTab={setActiveTab} />}
                  {activeTab === 'highlights' && <HighlightsView user={user} />}
                  {activeTab === 'notes' && <NotesView user={user} />}
                  {activeTab === 'library' && <LibraryView />}
                  {activeTab === 'commentary' && (
                    <CommentaryView 
                      currentReference={{
                        bookId: currentReference.split('/')[1],
                        bookName: currentBookName,
                        chapter: parseInt(currentReference.split('/')[2]),
                        verse: currentReference.split('/')[3] ? parseInt(currentReference.split('/')[3]) : undefined
                      }}
                    />
                  )}
                  {activeTab === 'settings_sidebar' && (
                    <div className="max-w-md mx-auto py-8">
                       <h2 className="text-2xl font-serif font-bold text-stone-900 mb-6 px-4">Configurações</h2>
                       <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl mx-4">
                              <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-stone-500" />
                                <div>
                                  <p className="text-sm font-bold text-stone-900">Lembretes Diários</p>
                                  <p className="text-xs text-stone-500">Receba notificações de leitura</p>
                                </div>
                              </div>
                              <button 
                                onClick={toggleReminders}
                                className={cn(
                                  "w-12 h-6 rounded-full transition-colors relative",
                                  remindersEnabled ? "bg-stone-900" : "bg-stone-200"
                                )}
                              >
                                <motion.div 
                                  animate={{ x: remindersEnabled ? 24 : 2 }}
                                  className="absolute top-1 w-4 h-4 bg-white rounded-full"
                                />
                              </button>
                            </div>

                            <div className="space-y-3 px-4">
                              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest pl-1">Aparência do Texto</label>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-stone-500 ml-1">Fonte</p>
                                  <select 
                                    value={readerSettings.font}
                                    onChange={(e) => updateReaderSettings({ font: e.target.value as any })}
                                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none"
                                  >
                                    <option value="serif">Clássica (Serif)</option>
                                    <option value="sans">Moderna (Sans)</option>
                                    <option value="mono">Técnica (Mono)</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-stone-500 ml-1">Tamanho</p>
                                  <select 
                                    value={readerSettings.fontSize}
                                    onChange={(e) => updateReaderSettings({ fontSize: e.target.value as any })}
                                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none"
                                  >
                                    <option value="base">Mínima (20px)</option>
                                    <option value="lg">Regular (24px)</option>
                                    <option value="xl">Média (30px)</option>
                                    <option value="2xl">Grande (36px)</option>
                                    <option value="3xl">Extra (48px)</option>
                                    <option value="4xl">Máxima (60px)</option>
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-stone-500 ml-1">Tema de Fundo</p>
                                <div className="flex gap-3">
                                    {[
                                      { id: 'light', name: 'Claro', bg: 'bg-white', text: 'text-stone-900', border: 'border-stone-200' },
                                      { id: 'sepia', name: 'Sépia', bg: 'bg-[#F4ECD8]', text: 'text-[#5B4636]', border: 'border-[#E2D2B5]' },
                                      { id: 'paper', name: 'Papel', bg: 'bg-[#F5F5F0]', text: 'text-stone-800', border: 'border-stone-200' },
                                      { id: 'dark', name: 'Escuro', bg: 'bg-stone-900', text: 'text-stone-200', border: 'border-stone-800' }
                                    ].map((theme) => (
                                      <button
                                        key={theme.id}
                                        onClick={() => updateReaderSettings({ theme: theme.id as any })}
                                        className={cn(
                                          "flex-1 aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
                                          theme.bg,
                                          readerSettings.theme === theme.id ? "ring-2 ring-stone-400 border-transparent scale-105" : theme.border
                                        )}
                                      >
                                        <span className={cn("text-[10px] font-bold uppercase", theme.text)}>{theme.name}</span>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2 px-4">
                              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest pl-1">Versão Preferida</label>
                              <select 
                                value={currentReference.split('/')[0]}
                                onChange={(e) => {
                                  const parts = currentReference.split('/');
                                  const newRef = `${e.target.value}/${parts[1]}/${parts[2]}`;
                                  handleUpdateReference(newRef);
                                }}
                                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-200"
                              >
                                <option value="ara">ARA (Almeida Revista e Atualizada)</option>
                                <option value="nvibr">NVI (Nova Versão Internacional)</option>
                                <option value="arai">ARAi+ (Strong)</option>
                                <option value="acf">Almeida Corrigida Fiel</option>
                                <option value="ra">Almeida Revista e Atualizada</option>
                                <option value="rc">Almeida Revista e Corrigida</option>
                              </select>
                            </div>
                       </div>
                    </div>
                  )}
                  {activeTab === 'devotional' && (
                    <DevotionalView 
                      user={user} 
                      onNavigate={(ref) => {
                        handleUpdateReference(ref);
                        setActiveTab('read');
                      }}
                    />
                  )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showDailyVerse && (
            <VerseOfTheDayModal 
              onClose={() => setShowDailyVerse(false)} 
              onNavigate={(book, chapter, verse) => {
                const currentVersion = currentReference.split('/')[0];
                const newRef = `${currentVersion}/${book}/${chapter}/${verse}`;
                handleUpdateReference(newRef);
                setActiveTab('read');
                setShowDailyVerse(false);
              }}
            />
          )}
        </AnimatePresence>

        <InstallGuide />
      </div>
    </div>
  );
}
