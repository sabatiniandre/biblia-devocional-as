import { offlineDb } from '../lib/offlineDb';
import { normalizeText } from '../lib/utils';

function score(a: string, q: string) {
  const text = normalizeText(a);
  const query = normalizeText(q);

  if (!text || !query) return 0;

  if (text === query) return 100;
  if (text.startsWith(query)) return 90;
  if (text.includes(query)) return 70;

  const words = query.split(' ');
  let hits = 0;

  for (const w of words) {
    if (text.includes(w)) hits++;
  }

  return hits > 0 ? 40 + hits * 10 : 0;
}

export async function searchDictionary(query: string, mode: string) {
  const q = query.trim();
  if (!q) return [];

  // STRONG MODE
  if (mode.includes('strong')) {
    if (/^[HG]\d+$/i.test(q)) {
      const entry = await offlineDb.getStrongDefinition(q.toUpperCase());
      if (entry) return [{ ...entry, score: 100 }];
    }

    const all = await offlineDb.getAllDictionaryEntries();

    const ranked = (all || [])
      .filter((e: any) => e.type === 'strong')
      .map((e: any) => ({
        ...e,
        score:
          score(e.lemma || '', q) +
          score(e.definition || '', q)
      }))
      .filter(e => e.score > 0)
      .sort((a, b) => b.score - a.score);

    return ranked;
  }

  // PORTUGUÊS / GERAL
  const all = await offlineDb.getAllDictionaryEntries();

  const ranked = (all || [])
    .map((e: any) => {
      const word = e.word || e.title || e.lemma || '';
      const def = e.definition || e.entry || e.content || '';

      return {
        id: e.id,
        word,
        definition: def,
        type: e.type || 'verbete',
        score: score(word, q) * 2 + score(def, q)
      };
    })
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  return ranked;
}