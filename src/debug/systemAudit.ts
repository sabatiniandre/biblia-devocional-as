import { getDB } from '../lib/offlineDb';

export async function runSystemAudit() {
  console.clear();

  // Limpa o cache antigo de livros apenas uma vez para garantir abreviações PT padronizadas
  if (!localStorage.getItem('books_migrated_v2')) {
    localStorage.removeItem('bible_books_cache');
    localStorage.setItem('books_migrated_v2', 'true');
    console.log('[SystemAudit] Cache obsoleto de abreviações de livros limpo com sucesso.');
  }

  console.log('==============================');
  console.log('🔥 ARAI SYSTEM AUDIT');
  console.log('==============================');

  try {
    const db = await getDB();

    console.log('✅ IndexedDB conectado');
    console.log('📦 Database:', db.name);
    console.log('📦 Version:', db.version);

    const stores = Array.from(db.objectStoreNames);

    console.log('🗂 Stores encontradas:', stores);

    for (const storeName of stores) {
      try {
        const count = await db.count(storeName);

        console.log(`📁 ${storeName}: ${count} registros`);

        // mostra exemplo real
        if (count > 0) {
          const sample = await db.getAll(storeName);

          console.log(
            `🧪 SAMPLE ${storeName}:`,
            sample?.[0]
          );
        }

      } catch (err) {
        console.error(`❌ ERRO STORE ${storeName}`, err);
      }
    }

    // ==========================
    // TESTE DICIONÁRIOS
    // ==========================

    try {
      const dict = await db.getAll('dictionary_entries');

      console.log('📚 dictionary_entries:', dict.length);

      if (dict.length > 0) {
        console.log('📚 exemplo:', dict[0]);
      } else {
        console.warn('⚠ dictionary_entries vazio');
      }
    } catch (err) {
      console.error('❌ dictionary_entries falhou', err);
    }

    try {
      const strong = await db.getAll('strong_dictionary');

      console.log('📖 strong_dictionary:', strong.length);

      if (strong.length > 0) {
        console.log('📖 exemplo:', strong[0]);
      } else {
        console.warn('⚠ strong_dictionary vazio');
      }
    } catch (err) {
      console.error('❌ strong_dictionary falhou', err);
    }

    try {
      const pt = await db.getAll('portuguese_dictionary');

      console.log('🇧🇷 portuguese_dictionary:', pt.length);

      if (pt.length > 0) {
        console.log('🇧🇷 exemplo:', pt[0]);
      } else {
        console.warn('⚠ portuguese_dictionary vazio');
      }
    } catch (err) {
      console.error('❌ portuguese_dictionary falhou', err);
    }

    // ==========================
    // TESTE BÍBLIA
    // ==========================

    try {
      const bible = await db.getAll('bible_chapters');

      console.log('📜 bible_chapters:', bible.length);

      if (bible.length > 0) {
        console.log('📜 exemplo:', bible[0]);
      } else {
        console.warn('⚠ bible_chapters vazio');
      }
    } catch (err) {
      console.error('❌ bible_chapters falhou', err);
    }

    console.log('==============================');
    console.log('✅ AUDITORIA FINALIZADA');
    console.log('==============================');

  } catch (err) {
    console.error('💥 SYSTEM AUDIT FAILED', err);
  }
}