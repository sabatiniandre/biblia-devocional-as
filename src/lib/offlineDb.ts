import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'ARAiOfflineDB';
const DB_VERSION = 11;

// =========================
// NORMALIZAÇÃO
// =========================
export const normalize = (text: string) =>
  (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export interface OfflineVersion {
  id: string;
  name: string;

  type:
    | 'bible'
    | 'dictionary'
    | 'commentary'
    | 'devotional'
    | 'reading-plan'
    | 'map';

  category:
    | 'bible'
    | 'dictionary'
    | 'commentary'
    | 'devotional'
    | 'plan'
    | 'map';

  installed: boolean;
  downloading?: boolean;
  progress?: number;
  lastUpdate: number;
  version?: string;
}

export interface DictionaryEntry {
  id: string;
  lemma: string;
  definition: string;
  shortDefinition?: string;

  language?:
    | 'greek'
    | 'hebrew'
    | 'portuguese';

  type?:
    | 'strong'
    | 'dictionary'
    | 'commentary'
    | 'devotional'
    | 'synonym';

  moduleId?: string;
}

let dbPromise:
  | Promise<IDBPDatabase<any>>
  | null = null;

// =========================
// DB INIT
// =========================
export const getDB = async () => {

  if (!dbPromise) {

    dbPromise = openDB(
      DB_NAME,
      DB_VERSION,
      {

        upgrade(db, oldVersion, newVersion, transaction) {

          console.log(
            `[IDB UPGRADE] version ${DB_VERSION}`
          );

          const stores = [
            'chapters',
            'bible_chapters',
            'installed_modules',
            'bible_versions',
            'strong_dictionary',
            'synonym_dictionary',
            'interlinear_tokens',
            'morphology',
            'reading_plans',
            'devotionals',
            'verse_cache',
            'portuguese_dictionary',
            'dictionary_entries',
            'maps',
            'studies',
            'progress_map',
            'favorites',
            'highlights',
            'local_progress'
          ];

          for (const store of stores) {

            if (
              !db.objectStoreNames.contains(store)
            ) {

              db.createObjectStore(
                store,
                {
                  keyPath: 'id'
                }
              );
            }
          }

          // índice do português
          if (
            db.objectStoreNames.contains(
              'portuguese_dictionary'
            )
          ) {

            const store =
              transaction.objectStore(
                'portuguese_dictionary'
              );

            if (
              !store.indexNames.contains(
                'normalized'
              )
            ) {

              store.createIndex(
                'normalized',
                'normalized',
                {
                  unique: false
                }
              );
            }
          }
        }
      }
    );
  }

  return dbPromise;
};

// =========================
// CORE WRAPPER
// =========================
export const offlineDb = {

  // =========================
  // SAFE EXECUTION
  // =========================
  async performSafe(
    storeName: string,
    operation: (
      db: IDBPDatabase<any>
    ) => Promise<any>
  ) {

    const db = await getDB();

    if (
      !db.objectStoreNames.contains(
        storeName
      )
    ) {

      console.warn(
        `[STORE NOT FOUND] ${storeName}`
      );

      return null;
    }

    try {

      return await operation(db);

    } catch (err) {

      console.error(
        `[IDB ERROR] ${storeName}`,
        err
      );

      return null;
    }
  },

  // =========================
  // AUDIT
  // =========================
  async audit() {

    const db = await getDB();

    console.log(
      '[DB STORES]',
      Array.from(db.objectStoreNames)
    );

    const dictionary =
      await db.getAll(
        'dictionary_entries'
      );

    const strongs =
      await db.getAll(
        'strong_dictionary'
      );

    console.log(
      '[DB AUDIT]',
      {
        dictionary_entries:
          dictionary.length,

        strong_dictionary:
          strongs.length
      }
    );
  },

  // =========================
  // VERSIONS
  // =========================
  async saveVersionInfo(
    version: OfflineVersion
  ) {

    await this.performSafe(
      'installed_modules',
      db =>
        db.put(
          'installed_modules',
          version
        )
    );

    if (
      version.type === 'bible'
    ) {

      await this.performSafe(
        'bible_versions',
        db =>
          db.put(
            'bible_versions',
            version
          )
      );
    }
  },

  async getVersionInfo(
    id: string
  ) {

    return (
      await this.performSafe(
        'installed_modules',
        db =>
          db.get(
            'installed_modules',
            id
          )
      )
    ) || await this.performSafe(
      'bible_versions',
      db =>
        db.get(
          'bible_versions',
          id
        )
    );
  },

  async getAllVersions() {

    const a =
      await this.performSafe(
        'installed_modules',
        db =>
          db.getAll(
            'installed_modules'
          )
      ) || [];

    const b =
      await this.performSafe(
        'bible_versions',
        db =>
          db.getAll(
            'bible_versions'
          )
      ) || [];

    const map = new Map();

    [...a, ...b].forEach(v => {

      if (
        v?.id &&
        !map.has(v.id)
      ) {
        // Auto-repair metadata for Comentário Beacon and Comentário Moody
        if (v.id === 'beacon' || v.id === 'moody') {
          v.type = 'commentary';
          v.category = 'commentary';
        }

        map.set(v.id, v);
      }
    });

    return Array.from(
      map.values()
    );
  },

  // =========================
  // BÍBLIA
  // =========================
  async saveChapter(
    version: string,
    abbrev: string,
    chapter: number,
    data: any,
    enriched?: boolean,
    enrichmentFailed?: boolean,
    enrichmentAttempts?: number
  ) {

    const id =
      `${version}_${abbrev}_${chapter}`;

    const entry = {
      id,
      version,
      abbrev,
      chapter,
      data,
      timestamp: Date.now(),
      enriched,
      enrichmentFailed,
      enrichmentAttempts
    };

    await this.performSafe(
      'bible_chapters',
      db =>
        db.put(
          'bible_chapters',
          entry
        )
    );
  },

  async saveChaptersBulk(
    version: string,
    chaptersList: any[]
  ) {
    const db = await getDB();
    const tx = db.transaction('bible_chapters', 'readwrite');
    for (const chData of chaptersList) {
      const abbrev = chData.book?.abbrev?.pt || chData.book?.abbrev;
      const chapterNum = chData.chapter?.number;
      if (abbrev && chapterNum) {
        const id = `${version}_${abbrev}_${chapterNum}`;
        const entry = {
          id,
          version,
          abbrev,
          chapter: chapterNum,
          data: chData,
          timestamp: Date.now()
        };
        await tx.store.put(entry);
      }
    }
    await tx.done;
  },

  async getChapter(
    version: string,
    abbrev: string,
    chapter: number
  ) {

    const id =
      `${version}_${abbrev}_${chapter}`;

    const res =
      await this.performSafe(
        'bible_chapters',
        db =>
          db.get(
            'bible_chapters',
            id
          )
      );

    return res?.data || null;
  },

  // ✅ CORREÇÃO PRINCIPAL
  async getChapterEntry(
    version: string,
    abbrev: string,
    chapter: number
  ) {

    const id =
      `${version}_${abbrev}_${chapter}`;

    return await this.performSafe(
      'bible_chapters',
      db =>
        db.get(
          'bible_chapters',
          id
        )
    );
  },

  // =========================
  // SAVE DICTIONARY ENTRY
  // =========================
  async saveDictionaryEntry(
    entry: any
  ) {

    const normalized =
      normalize(
        entry?.lemma ||
        entry?.word ||
        entry?.title ||
        entry?.id ||
        ''
      );

    const data = {

      ...entry,

      id:
        entry?.id ||
        normalized,

      word:
        entry?.word ||
        normalized,

      lemma:
        entry?.lemma ||
        normalized,

      normalized,

      moduleId:
        entry?.moduleId ||
        entry?.dictionary ||
        'default'
    };

    await this.performSafe(
      'dictionary_entries',
      db =>
        db.put(
          'dictionary_entries',
          data
        )
    );

    // strong
    if (
      entry?.type === 'strong'
    ) {

      await this.performSafe(
        'strong_dictionary',
        db =>
          db.put(
            'strong_dictionary',
            data
          )
      );
    }
  },

  // =========================
  // GET ENTRY
  // =========================
  async getDictionaryEntry(
    id: string
  ) {

    return await this.performSafe(
      'dictionary_entries',
      db =>
        db.get(
          'dictionary_entries',
          id
        )
    );
  },

  // =========================
  // GET ALL
  // =========================
  async getAllDictionaryEntries() {

    const res =
      await this.performSafe(
        'dictionary_entries',
        db =>
          db.getAll(
            'dictionary_entries'
          )
      );

    console.log(
      '[ALL DICTIONARY ENTRIES]',
      res?.length || 0
    );

    return Array.isArray(res)
      ? res
      : [];
  },

  // =========================
  // STRONG
  // =========================
  async getStrongDefinition(
    id: string
  ) {

    return await this.performSafe(
      'strong_dictionary',
      db =>
        db.get(
          'strong_dictionary',
          id
        )
    );
  },

  // =========================
  // SEARCH
  // =========================
  async searchPortugueseDictionary(
    query: string
  ) {

    const all =
      await this.getAllDictionaryEntries();

    const q =
      normalize(query);

    return all.filter((e: any) => {

      const text =
        normalize(
          e.word ||
          e.title ||
          e.lemma ||
          e.definition ||
          ''
        );

      return text.includes(q);
    });
  },

  // =========================
  // REMOVE MODULE DATA
  // =========================
  async removeDictionaryData(
    moduleId: string
  ) {

    const db = await getDB();

    try {

      const allEntries =
        await db.getAll(
          'dictionary_entries'
        );

      for (const entry of allEntries) {

        if (
          entry.moduleId === moduleId ||
          entry.type === moduleId
        ) {

          await db.delete(
            'dictionary_entries',
            entry.id
          );
        }
      }

      if (
        moduleId.includes(
          'strong'
        )
      ) {

        const strongs =
          await db.getAll(
            'strong_dictionary'
          );

        for (const entry of strongs) {

          if (entry.moduleId === moduleId) {
            await db.delete(
              'strong_dictionary',
              entry.id
            );
          }
        }
      }

      await db.delete(
        'installed_modules',
        moduleId
      );

      console.log(
        '[MODULE REMOVED]',
        moduleId
      );

      return true;

    } catch (err) {

      console.error(
        '[REMOVE_DICTIONARY_DATA_ERROR]',
        err
      );

      return false;
    }
  },

  // =========================
  // REMOVE BIBLE DATA
  // =========================
  async removeBibleData(versionId: string) {
    const db = await getDB();
    try {
      const tx = db.transaction('bible_chapters', 'readwrite');
      const range = IDBKeyRange.bound(`${versionId}_`, `${versionId}_\uffff`);
      await tx.store.delete(range);
      await tx.done;

      await db.delete('installed_modules', versionId);
      await db.delete('bible_versions', versionId);

      console.log('[BIBLE DATA REMOVED]', versionId);
      return true;
    } catch (err) {
      console.error('[REMOVE_BIBLE_DATA_ERROR]', err);
      return false;
    }
  },

  // =========================
  // FAVORITES
  // =========================
  async getFavorites() {

    return await this.performSafe(
      'favorites',
      db =>
        db.getAll(
          'favorites'
        )
    ) || [];
  },

  async saveFavorite(
    item: any
  ) {

    return await this.performSafe(
      'favorites',
      db =>
        db.put(
          'favorites',
          item
        )
    );
  },

  async removeFavorite(
    id: string
  ) {

    return await this.performSafe(
      'favorites',
      db =>
        db.delete(
          'favorites',
          id
        )
    );
  },

  // =========================
  // HIGHLIGHTS
  // =========================
  async getHighlights() {

    return await this.performSafe(
      'highlights',
      db =>
        db.getAll(
          'highlights'
        )
    ) || [];
  },

  async saveHighlight(
    item: any
  ) {

    return await this.performSafe(
      'highlights',
      db =>
        db.put(
          'highlights',
          item
        )
    );
  },

  // =========================
  // PROGRESS
  // =========================
  async getProgressMap() {

    return await this.performSafe(
      'progress_map',
      db =>
        db.getAll(
          'progress_map'
        )
    ) || [];
  },

  async saveProgressMapItem(
    item: any
  ) {

    return await this.performSafe(
      'progress_map',
      db =>
        db.put(
          'progress_map',
          item
        )
    );
  },

  async saveLocalProgress(
    item: any
  ) {

    return await this.performSafe(
      'local_progress',
      db =>
        db.put(
          'local_progress',
          item
        )
    );
  }
};