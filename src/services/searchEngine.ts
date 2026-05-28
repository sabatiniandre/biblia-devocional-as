import { offlineDb, normalize } from '../lib/offlineDb';

function similarity(a: string, b: string) {
  if (!a || !b) return 0;

  const max = Math.max(a.length, b.length);
  let matches = 0;

  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }

  return matches / max;
}

function scoreMatch(query: string, text: string) {
  const q = normalize(query);
  const t = normalize(text);

  if (!t) return 0;

  // match exato
  if (t === q) return 1;

  // começa com query
  if (t.startsWith(q)) return 0.9;

  // contém query
  if (t.includes(q)) return 0.7;

  // similaridade leve
  return similarity(q, t) * 0.6;
}

export const searchEngine = {

  // =========================
  // DICIONÁRIO INTELIGENTE
  // =========================
  async searchDictionary(query: string, activeTab: string) {
    const all = await offlineDb.getAllDictionaryEntries();
    const q = normalize(query);

    const scored = (all || [])
      .map((e: any) => {
        const word = e.word || e.title || e.lemma || '';
        const def = e.definition || e.content || e.entry || '';

        let score = 0;

        // score principal
        score = Math.max(
          scoreMatch(q, word),
          scoreMatch(q, def)
        );

        // penaliza se for de outro módulo
        if (
          e.moduleId &&
          activeTab &&
          e.moduleId !== activeTab
        ) {
          score *= 0.6;
        }

        return {
          id: e.id,
          word,
          definition: def,
          type: e.type || 'verbete',
          score
        };
      })
      .filter(e => e.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return scored;
  },

  // =========================
  // STRONG (INTELIGENTE)
  // =========================
  async searchStrong(query: string) {
    const q = query.toUpperCase();

    const direct = await offlineDb.getStrongDefinition(q);
    if (direct) {
      return [{ ...direct, score: 1 }];
    }

    const all = await offlineDb.getAllDictionaryEntries();

    return (all || [])
      .filter((e: any) => e.type === 'strong')
      .map((e: any) => {
        const score =
          e.id === q ? 1 :
          e.lemma?.toUpperCase() === q ? 0.9 :
          similarity(q, e.lemma || '') * 0.7;

        return { ...e, score };
      })
      .filter(e => e.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  },

  // =========================
  // AUTO CORREÇÃO (tipo Google)
  // =========================
  suggestCorrection(query: string, list: any[]) {
    const q = normalize(query);

    let best = null;
    let bestScore = 0;

    for (const item of list) {
      const word = normalize(item.word || item.lemma || item.title || '');

      const score = similarity(q, word);

      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }

    return bestScore > 0.6 ? best : null;
  }
};