import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { offlineDb } from '../lib/offlineDb';

export const syncService = {
  // Highlights
  async saveHighlight(userId: string, highlight: any) {
    const { verseId, color, text } = highlight;
    const localId = `h_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const highlightData = {
      ...highlight,
      id: localId,
      userId,
      createdAt: Date.now()
    };

    // 1. Save Locally to ARAiOfflineDB
    await offlineDb.saveHighlight(highlightData);

    // 2. Save to Firestore (Will sync when online)
    try {
      const path = `users/${userId}/highlights`;
      await setDoc(doc(collection(db, path)), {
        ...highlight,
        userId,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('[SYNC] Firestore highlight save delayed (offline)');
    }
  },

  // Favorites
  async toggleFavorite(userId: string, favorite: any) {
    const id = favorite.id; // e.g. "gn.1.1"
    
    // Toggle local
    const favorites = await offlineDb.getFavorites();
    const exists = favorites.find((f: any) => f.id === id);
    
    if (exists) {
      await offlineDb.removeFavorite(id);
    } else {
      await offlineDb.saveFavorite({ ...favorite, timestamp: Date.now() });
    }

    // Firestore Sync
    try {
      const path = `users/${userId}/favorites`;
      if (exists) {
        await deleteDoc(doc(db, path, id.replace(/\./g, '_')));
      } else {
        await setDoc(doc(db, path, id.replace(/\./g, '_')), {
          ...favorite,
          userId,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.warn('[SYNC] Firestore favorite toggle delayed (offline)');
    }
  },

  // Reading Progress (Verse by verse)
  async markAsRead(userId: string, bookAbbrev: string, chapter: number, verses: number[]) {
    // 1. Local Save
    for (const vNum of verses) {
      const id = `${bookAbbrev}.${chapter}.${vNum}`;
      await offlineDb.saveProgressMapItem({
        id,
        userId,
        book: bookAbbrev,
        chapter,
        verse: vNum,
        readAt: Date.now()
      });
    }

    // 2. Firestore Batch
    try {
      const batch = writeBatch(db);
      const path = `users/${userId}/readingProgress`;
      for (const vNum of verses) {
        const verseId = `${bookAbbrev}.${chapter}.${vNum}`;
        const docId = verseId.replace(/\./g, '_');
        batch.set(doc(db, path, docId), {
          userId,
          verseId,
          readAt: serverTimestamp()
        });
      }
      await batch.commit();
    } catch (e) {
       console.warn('[SYNC] Firestore progress batch delayed (offline)');
    }
  },

  // Start Sync Process (Initial populate from IDB to catch up offline work)
  // This is a complex topic, but for this app, Firestore Persistence handles the queuing.
  // We just need to make sure the components read from IDB if Firestore is sluggish.
};
