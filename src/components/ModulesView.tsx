import React, {
  useState,
  useEffect
} from 'react';

import {
  Package,
  Download,
  Trash2,
  CheckCircle2,
  BookOpen,
  Map as MapIcon,
  Search,
  Layout,
  MessageSquare,
  Lightbulb
} from 'lucide-react';

import {
  motion
} from 'motion/react';

import {
  cn
} from '../lib/utils';

import {
  offlineDb,
  OfflineVersion
} from '../lib/offlineDb';

import {
  backgroundSync
} from '../services/backgroundSync';

interface ModulesViewProps {
  settings: any;
  updateSettings: (
    settings: any
  ) => void;
}

export const ModulesView:
React.FC<ModulesViewProps> = ({
  settings,
  updateSettings
}) => {

  const [
    versions,
    setVersions
  ] = useState<OfflineVersion[]>([]);

  const [
    syncStatus,
    setSyncStatus
  ] = useState<
    Record<string, OfflineVersion>
  >({});

  const [
    activeCategory,
    setActiveCategory
  ] = useState<
    'all' |
    'installed' |
    'available'
  >('all');

  const [
    confirmDeleteId,
    setConfirmDeleteId
  ] = useState<string | null>(null);

  // =========================================
  // LOAD
  // =========================================
  useEffect(() => {

    const loadVersions =
      async () => {

      const v =
        await offlineDb.getAllVersions();

      console.log(
        '[INSTALLED MODULES]',
        v
      );

      setVersions([...v]);
    };

    const unsub =
      backgroundSync.subscribe(
        (status) => {

          setSyncStatus({
            ...status
          });

          loadVersions();
        }
      );

    loadVersions();

    const interval =
      setInterval(
        loadVersions,
        3000
      );

    return () => {

      unsub();

      clearInterval(interval);
    };

  }, []);

  // =========================================
  // MODULES
  // =========================================
  const ALL_MODULES_DEF = [

    // BIBLES
    {
      id: 'ara',
      name: 'Almeida ARA',
      type: 'bible',
      category: 'bible',
      size: '4.4MB'
    },

    {
      id: 'nvibr',
      name: 'NVI (Internacional)',
      type: 'bible',
      category: 'bible',
      size: '4.2MB'
    },

    {
      id: 'arai',
      name: 'Almeida Strong (ARAi+)',
      type: 'bible',
      category: 'bible',
      size: '4.8MB'
    },

    // DICTIONARIES
    {
      id: 'strong_greek',
      name: 'Strong Grego',
      type: 'dictionary',
      category: 'dictionary',
      size: '2.4MB'
    },

    {
      id: 'strong_hebrew',
      name: 'Strong Hebraico',
      type: 'dictionary',
      category: 'dictionary',
      size: '2.1MB'
    },

    {
      id: 'portuguese_dictionary',
      name: 'Dicionário Português',
      type: 'dictionary',
      category: 'dictionary',
      size: '3.8MB'
    },

    {
      id: 'theological',
      name: 'Dicionário Teológico',
      type: 'dictionary',
      category: 'dictionary',
      size: '1.8MB'
    },

    {
      id: 'topical',
      name: 'Dicionário Temático',
      type: 'dictionary',
      category: 'dictionary',
      size: '1.5MB'
    },

    // COMMENTARIES
    {
      id: 'moody',
      name: 'Comentário Moody',
      type: 'commentary',
      category: 'commentary',
      size: '8.2MB'
    },

    {
      id: 'beacon',
      name: 'Comentário Beacon',
      type: 'commentary',
      category: 'commentary',
      size: '9.5MB'
    },

    // PLANS
    {
      id: 'reading_plans',
      name: 'Planos de Leitura',
      type: 'reading-plan',
      category: 'plan',
      size: '0.5MB'
    },

    // DEVOTIONALS
    {
      id: 'morning_evening',
      name: 'Manhã e Noite',
      type: 'devotional',
      category: 'devotional',
      size: '2.2MB'
    },

    // MAPS
    {
      id: 'bible_maps',
      name: 'Mapas Bíblicos',
      type: 'map',
      category: 'map',
      size: '1.2MB'
    }
  ];

  // =========================================
  // DOWNLOAD
  // =========================================
  const handleDownload =
    async (
      id: string,
      type: string
    ) => {

      try {

        console.log(
          '[DOWNLOAD MODULE]',
          id
        );

        if (type === 'bible') {

          await backgroundSync
            .syncVersion(id);

        } else {

          const targetMod = ALL_MODULES_DEF.find(m => m.id === id);
          await backgroundSync
            .syncDictionary(id, targetMod?.type || type, targetMod?.category);
        }

        const updated =
          await offlineDb
            .getAllVersions();

        setVersions([
          ...updated
        ]);

        backgroundSync
          .refreshModules();

      } catch (err) {

        console.error(
          '[DOWNLOAD ERROR]',
          err
        );
      }
    };

  // =========================================
  // REMOVE
  // =========================================
  const handleRemove =
    async (
      id: string,
      type: string
    ) => {

      try {

        console.log(
          '[REMOVE MODULE]',
          id
        );

        // remove status
        await backgroundSync
          .removeModule(
            id,
            type
          );

        // remove dados físicos
        if (type === 'bible') {
          await offlineDb
            .removeBibleData(id);
        } else {
          await offlineDb
            .removeDictionaryData(id);
        }

        // reload
        const updated =
          await offlineDb
            .getAllVersions();

        setVersions([
          ...updated
        ]);

        backgroundSync
          .refreshModules();

        console.log(
          '[MODULE FULLY REMOVED]',
          id
        );

      } catch (err) {

        console.error(
          '[REMOVE ERROR]',
          err
        );
      }
    };

  // =========================================
  // STATUS
  // =========================================
  const getModuleStatus =
    (id: string) => {

      const verInfo =
        versions.find(
          item =>
            item.id === id
        );

      const status =
        syncStatus[id];

      const isInstalled =
        verInfo?.installed;

      const isDownloading =
        status?.downloading;

      const progress =
        status?.progress ||
        verInfo?.progress ||
        0;

      return {
        isInstalled,
        isDownloading,
        progress
      };
    };

  // =========================================
  // CARD
  // =========================================
  const renderModuleCard =
    (m: any) => {

      const {
        isInstalled,
        isDownloading,
        progress
      } = getModuleStatus(m.id);

      if (
        activeCategory ===
        'installed' &&
        !isInstalled
      ) return null;

      if (
        activeCategory ===
        'available' &&
        isInstalled
      ) return null;

      return (

        <div
          key={m.id}
          className={cn(
            'p-4 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between h-full',
            isInstalled
              ? 'bg-stone-50 border-stone-200'
              : 'bg-white border-stone-100'
          )}
        >

          <div className="flex items-start justify-between gap-3 mb-4 relative z-10">

            <div className="flex items-center gap-3 min-w-0">

              <div
                className={cn(
                  'w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center font-bold text-[10px] uppercase tracking-widest',
                  isInstalled
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-400'
                )}
              >
                {
                  m.type === 'bible'
                    ? m.id
                    : m.type.substring(0, 3)
                }
              </div>

              <div className="min-w-0">
                <h4
                  className="font-bold text-stone-900 text-sm truncate"
                  title={m.name}
                >
                  {m.name}
                </h4>

                <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest truncate">
                  {m.size} • {m.category}
                </p>
              </div>
            </div>

            <div className="flex-none flex items-center gap-2">

              {isInstalled ? (
                confirmDeleteId === m.id ? (
                  <div className="flex items-center gap-1.5 bg-stone-100 rounded-xl px-2 py-1">
                    <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider px-1">Certeza?</span>
                    <button
                      onClick={() => {
                        handleRemove(m.id, m.type);
                        setConfirmDeleteId(null);
                      }}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all"
                    >
                      Sim
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2.5 py-1 bg-stone-200 hover:bg-stone-300 text-stone-600 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(m.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-stone-200/50 hover:bg-stone-200 rounded-xl transition-all text-[10px] font-bold text-stone-500 hover:text-red-600 uppercase tracking-widest whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Desinstalar</span>
                  </button>
                )
              ) : isDownloading ? (

                <div className="flex items-center gap-2 px-3 py-1 bg-stone-100 rounded-lg">

                  <Download className="w-3 h-3 text-stone-400 animate-bounce" />

                  <span className="text-[9px] font-bold text-zinc-500">
                    {progress}%
                  </span>
                </div>

              ) : (

                <button
                  onClick={() =>
                    handleDownload(
                      m.id,
                      m.type
                    )
                  }
                  className="p-2 bg-stone-900 text-white rounded-xl hover:scale-105 transition-all shadow-md shadow-stone-200"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {(isDownloading ||
            (
              progress > 0 &&
              !isInstalled
            )
          ) && (

            <div className="mt-auto pt-2 space-y-1 relative z-10">

              <div className="w-full h-1 bg-stone-200 rounded-full overflow-hidden">

                <motion.div
                  initial={{
                    width: 0
                  }}
                  animate={{
                    width: `${progress}%`
                  }}
                  className="h-full bg-stone-600"
                />
              </div>
            </div>
          )}

          {isInstalled && (

            <div className="absolute top-1 right-1 opacity-5">

              <CheckCircle2 className="w-12 h-12 text-stone-900" />

            </div>
          )}
        </div>
      );
    };

  // =========================================
  // SECTIONS
  // =========================================
  const sections = [

    {
      id: 'bible',
      title: 'Bíblias',
      icon: BookOpen
    },

    {
      id: 'dictionary',
      title: 'Dicionários',
      icon: Search
    },

    {
      id: 'commentary',
      title: 'Comentários',
      icon: MessageSquare
    },

    {
      id: 'plan',
      title: 'Planos',
      icon: Layout
    },

    {
      id: 'devotional',
      title: 'Devocionais',
      icon: Lightbulb
    },

    {
      id: 'map',
      title: 'Mapas',
      icon: MapIcon
    }
  ];

  // =========================================
  // RENDER
  // =========================================
  return (

    <div className="flex flex-col h-full max-h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-700">

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0">

        <div>

          <h1 className="text-xl md:text-2xl font-serif font-bold text-stone-900 flex items-center gap-2">

            <Package className="w-5 h-5 text-stone-400" />

            Módulos da Biblioteca
          </h1>

          <p className="text-stone-500 text-xs">
            Instale recursos bíblicos offline.
          </p>
        </div>
      </header>

      <div className="flex items-center justify-between mb-6 shrink-0">

        <div className="flex bg-stone-100 p-1 rounded-xl">

          {[
            'all',
            'installed',
            'available'
          ].map((tab) => (

            <button
              key={tab}
              onClick={() =>
                setActiveCategory(
                  tab as any
                )
              }
              className={cn(
                'px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all',
                activeCategory === tab
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500'
              )}
            >
              {
                tab === 'all'
                  ? 'Todos'
                  : tab === 'installed'
                  ? 'Instalados'
                  : 'Disponíveis'
              }
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-10 scrollbar-thin scrollbar-thumb-stone-200">

        {sections.map(section => {

          const sectionModules =
            ALL_MODULES_DEF.filter(
              m =>
                m.category ===
                section.id
            );

          const visibleModules =
            sectionModules.filter(
              m => {

                const {
                  isInstalled
                } = getModuleStatus(m.id);

                if (
                  activeCategory ===
                  'installed'
                ) {
                  return isInstalled;
                }

                if (
                  activeCategory ===
                  'available'
                ) {
                  return !isInstalled;
                }

                return true;
              }
            );

          if (
            visibleModules.length === 0
          ) {
            return null;
          }

          return (

            <section
              key={section.id}
              className="space-y-4"
            >

              <div className="flex items-center gap-3 px-1">

                <div className="p-2 bg-stone-50 rounded-lg border border-stone-100">

                  <section.icon className="w-4 h-4 text-stone-400" />

                </div>

                <h2 className="text-lg font-serif font-bold text-stone-900">
                  {section.title}
                </h2>

                <div className="h-px flex-1 bg-stone-100 ml-2" />

                <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">

                  {visibleModules.length} itens

                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                {visibleModules.map(m =>
                  renderModuleCard(m)
                )}

              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};