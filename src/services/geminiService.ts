export const geminiService = {
  isEconomyMode() {
    try {
      const saved = localStorage.getItem('readerSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!parsed.economyMode;
      }
    } catch {}
    return false;
  },

  async getStrongDefinition(id: string) {
    try {
      const response = await fetch(`/api/gemini/strong-definition/${id}`);
      if (!response.ok) throw new Error("Erro ao buscar definição");
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Resposta inesperada do servidor");
      }
      
      return await response.json();
    } catch (error) {
      console.error("API Strong Definition failed:", error);
      throw error;
    }
  },

  async getDictionaryDefinition(word: string) {
    try {
      const response = await fetch(`/api/gemini/dictionary-definition/${encodeURIComponent(word)}`);
      if (!response.ok) throw new Error("Erro ao buscar definição do dicionário");
      return await response.json();
    } catch (error) {
      console.error("API Dictionary Definition failed:", error);
      throw error;
    }
  },

  async searchFallback(text: string, version: string) {
    if (this.isEconomyMode()) return { verses: [] };
    try {
      const response = await fetch("/api/gemini/search-fallback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, version })
      });
      if (!response.ok) return { verses: [] };
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) return { verses: [] };
      
      return await response.json();
    } catch (error) {
      console.error("API Search Fallback failed:", error);
      return { verses: [] };
    }
  },

  async getInterlinearVerses(verses: any[], book?: string, chapter?: number) {
    if (this.isEconomyMode()) return verses;
    // Session cache to prevent redundant calls in the same user session
    const cacheKey = `interlinear_${book}_${chapter}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        console.log(`[Gemini] Cache HIT (Session): ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (e) { /* ignore cache read error */ }

    try {
      const response = await fetch("/api/gemini/interlinear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verses, book, chapter })
      });
      
      if (!response.ok) {
        // If it's a quota error, we might want to know
        if (response.status === 429) {
          console.warn("[Gemini] API returned 429 Quota Exceeded");
        }
        return verses;
      }
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn(`[Gemini] API returned non-JSON response: ${contentType}`);
        return verses;
      }

      const result = await response.json();
      
      // Only cache if we got something back that looks like interlinear data
      // (checking if at least one verse has an interlinear tag <S> or <O>)
      const isEnriched = result.some((v: any) => v.text.includes('<S') || v.text.includes('<O'));
      if (isEnriched) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } catch (e) { /* ignore session quota error */ }
      }
      
      return result;
    } catch (error: any) {
      // Enrichment is optional. If it fails for any network reason, we just return original verses.
      // This prevents "Failed to fetch" errors from cluttering the console in offline mode.
      const isNetworkError = error?.message?.includes('fetch') || !navigator.onLine;
      
      if (isNetworkError) {
        console.warn("[Gemini] Interlinear enrichment skipped: Network unreachable");
      } else {
        // Log other unexpected errors as warnings too since this is non-critical
        console.warn("API Interlinear non-fatal error:", error);
      }
      return verses;
    }
  },

  async getCommentary(commentaryId: string, reference: string) {
    try {
      const response = await fetch(`/api/gemini/commentary/${encodeURIComponent(commentaryId)}/${encodeURIComponent(reference)}`);
      if (!response.ok) throw new Error("Erro ao buscar comentário bíblico");
      return await response.json();
    } catch (error) {
      console.error("API Commentary failed:", error);
      throw error;
    }
  }
};
