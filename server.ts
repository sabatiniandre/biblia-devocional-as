import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Read Firebase config
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    console.log("[Firebase] Config loaded. Managed Project ID:", firebaseConfig.projectId);
    console.log("[Firebase] Config Database ID:", firebaseConfig.firestoreDatabaseId);
  } else {
    console.warn("[Firebase] WARNING: firebase-applet-config.json not found at", configPath);
  }
} catch (e) {
  console.error("Failed to read firebase-applet-config.json:", e);
}

// Initialize Firebase Admin for server-side caching
try {
  if (getApps().length === 0) {
    // Priority: 1. Environment variable (set by AI Studio), 2. config file, 3. hardcoded fallback
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || firebaseConfig.projectId;
    
    console.log("[Firebase] Initializing Admin for Project:", projectId);
    initializeApp({
      projectId: projectId
    });
  }
} catch (e) {
  console.error("Firebase Admin initialization failed:", e);
}

// Ensure firestore is initialized even if initializeApp fails partially
let firestore: any;
let dbId = firebaseConfig.firestoreDatabaseId || '(default)';
let isFirestoreFunctional = false;

const initFirestore = (id: string) => {
  try {
    firestore = getFirestore(id);
    console.log(`[Firebase] Initialized Firestore with databaseId: ${id}`);
    return true;
  } catch (e) {
    console.error(`[Firebase] Failed to initialize Firestore with DB [${id}]:`, e);
    return false;
  }
};

initFirestore(dbId);

// Test connectivity and log detailed error if it fails
(async () => {
  const testConn = async (id: string) => {
    try {
      // Just a basic list to check permissions / existence
      await firestore.collection('cache_interlinear').limit(1).get();
      console.log(`[Firebase] Active: Connected to ${id === '(default)' ? 'default' : id} database.`);
      isFirestoreFunctional = true;
      return true;
    } catch (err: any) {
      console.error(`[Firebase] Connection error for ${id}:`, err.code, err.message);
      return false;
    }
  };

  const success = await testConn(dbId);
  
  if (!success && dbId !== '(default)') {
    console.warn(`[Firebase] Database ${dbId} unreachable. Attempting fallback to (default)...`);
    if (initFirestore('(default)')) {
      const fallbackSuccess = await testConn('(default)');
      if (fallbackSuccess) {
        dbId = '(default)';
        console.log(`[Firebase] Fallback Success: Now using (default) database.`);
      } else {
        console.error(`[Firebase] Critical: (default) database also unreachable. Caching disabled.`);
        isFirestoreFunctional = false;
      }
    }
  }
})();

// Runtime metrics storage
const serverMetrics = {
  interlinear: {
    requests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    aiCalls: 0,
    errors: 0,
    totalDuration: 0,
    popularChapters: {} as Record<string, number>,
  },
  strong: {
    requests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    aiCalls: 0,
    errors: 0,
    totalDuration: 0,
  }
};

function trackMetric(entity: 'interlinear' | 'strong', type: 'hit' | 'miss' | 'error' | 'call', duration?: number, key?: string) {
  const m = serverMetrics[entity];
  m.requests++;
  if (type === 'hit') m.cacheHits++;
  if (type === 'miss') m.cacheMisses++;
  if (type === 'error') m.errors++;
  if (type === 'call') m.aiCalls++;
  if (duration) m.totalDuration += duration;
  
  if (entity === 'interlinear' && key) {
    (m as any).popularChapters[key] = ((m as any).popularChapters[key] || 0) + 1;
  }

  // Log summary every 10 requests total
  const totalReq = serverMetrics.interlinear.requests + serverMetrics.strong.requests;
  if (totalReq % 10 === 0) {
    console.log(`[Metrics] Total: ${totalReq} | AI calls: ${serverMetrics.interlinear.aiCalls + serverMetrics.strong.aiCalls}`);
  }
}

// Initialize Gemini
let aiInstance: GoogleGenAI | null = null;
function getAI() {
  if (!aiInstance) {
    const rawKey = process.env.GEMINI_API_KEY;
    const apiKey = rawKey?.trim();
    
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
      console.warn("GEMINI_API_KEY is not configured, is empty, or is using a placeholder.");
      return null;
    }
    
    aiInstance = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

async function fetchFromDicionarioAberto(word: string) {
  try {
    const response = await fetch(`https://api.dicionario-aberto.net/word/${encodeURIComponent(word.toLowerCase())}`);
    if (!response.ok) return null;
    const data: any = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const entry = data[0];
      const xml = entry.xml || "";
      
      // Extract usage/gramGrp
      let parsedUsage = "Dicionário Geral";
      const gramGrpMatch = xml.match(/<gramGrp>([\s\S]*?)<\/gramGrp>/);
      if (gramGrpMatch) {
        const rawGram = gramGrpMatch[1].trim().toLowerCase().replace(/\./g, '');
        if (["f", "sf", "s f", "fem", "feminino"].includes(rawGram)) {
          parsedUsage = "Substantivo Feminino";
        } else if (["m", "sm", "s m", "masc", "masculino"].includes(rawGram)) {
          parsedUsage = "Substantivo Masculino";
        } else if (["adj", "adjectivo", "adjetivo"].includes(rawGram)) {
          parsedUsage = "Adjetivo";
        } else if (["v", "verbo"].includes(rawGram)) {
          parsedUsage = "Verbo";
        } else if (["adv", "adverbio", "advérbio"].includes(rawGram)) {
          parsedUsage = "Advérbio";
        } else {
          parsedUsage = gramGrpMatch[1].trim();
        }
      }

      // Extract all definitions from <def> blocks
      const defMatches = [...xml.matchAll(/<def>([\s\S]*?)<\/def>/g)];
      const definitions: string[] = [];

      for (const match of defMatches) {
        let defText = match[1].trim();
        if (defText) {
          // Clean the def text: remove other XML/HTML tags, normalize spacing
          defText = defText
            .replace(/<[^>]+>/g, '') // Remove XML tags
            .replace(/_(.*?)_/g, '$1') // Remove markdown underscores styling
            .replace(/\[/g, '').replace(/\]/g, '') // Remove brackets
            .split('\n')
            .map((line: string) => line.trim())
            .filter(Boolean)
            .join(' ');
          
          if (defText) {
            definitions.push(defText);
          }
        }
      }

      let parsedDefinition = "";
      if (definitions.length === 1) {
        parsedDefinition = definitions[0];
      } else if (definitions.length > 1) {
        parsedDefinition = definitions.map((d, index) => `${index + 1}. ${d}`).join('\n');
      }

      if (parsedDefinition) {
        return {
          word: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          definition: parsedDefinition,
          usage: parsedUsage
        };
      }
    }
  } catch (err) {
    console.error("[DicionarioAberto] Fallback error:", err);
  }
  return null;
}

const BASE_URL = 'https://abibliadigital.com.br/api';
const BOLLS_URL = 'https://bolls.life/get-chapter';

// Static mapping for books to use with Bolls Life (1-based order)
const BOOK_MAPPING: Record<string, number> = {
  // Gênesis
  "gn": 1, "gene": 1,
  // Êxodo
  "ex": 2, "exo": 2,
  // Levítico
  "lv": 3, "lev": 3,
  // Números
  "num": 4, "nm": 4,
  // Deuteronômio
  "dt": 5, "deu": 5,
  // Josué
  "js": 6, "jos": 6,
  // Juízes
  "jz": 7, "jui": 7,
  // Rute
  "rt": 8, "rut": 8,
  // 1 Samuel
  "1sm": 9, "1sa": 9,
  // 2 Samuel
  "2sm": 10, "2sa": 10,
  // 1 Reis
  "1rs": 11, "1re": 11,
  // 2 Reis
  "2rs": 12, "2re": 12,
  // 1 Crônicas
  "1cr": 13, "1ch": 13,
  // 2 Crônicas
  "2cr": 14, "2ch": 14,
  // Esdras
  "ezr": 15, "esd": 15, "ed": 15,
  // Neemias
  "ne": 16, "nee": 16,
  // Ester
  "et": 17, "est": 17,
  // Jó
  "jo": 18, "job": 18, "jb": 18,
  // Salmos
  "sl": 19, "ps": 19,
  // Provérbios
  "pv": 20, "pro": 20,
  // Eclesiastes
  "ec": 21, "ecc": 21,
  // Cantares
  "ct": 22, "cant": 22,
  // Isaías
  "is": 23, "isa": 23,
  // Jeremias
  "jr": 24, "jer": 24,
  // Lamentações
  "lm": 25, "lam": 25,
  // Ezequiel
  "ez": 26, "eze": 26,
  // Daniel
  "dn": 27, "dan": 27,
  // Oseias
  "os": 28, "hos": 28,
  // Joel
  "jl": 29, "joe": 29,
  // Amós
  "am": 30, "amo": 30,
  // Obadias
  "ob": 31, "oba": 31,
  // Jonas
  "jon": 32, "jn": 32,
  // Miqueias
  "mq": 33, "mic": 33,
  // Naum
  "na": 34, "nah": 34,
  // Habacuque
  "hc": 35, "hab": 35,
  // Sofonias
  "sf": 36, "zep": 36,
  // Ageu
  "ag": 37, "hag": 37,
  // Zacarias
  "zc": 38, "zec": 38,
  // Malaquias
  "ml": 39, "mal": 39,
  // Mateus
  "mt": 40, "mat": 40,
  // Marcos
  "mc": 41, "mar": 41,
  // Lucas
  "lc": 42, "luk": 42,
  // João
  "joa": 43, "jhn": 43, "joão": 43,
  // Atos
  "at": 44, "act": 44,
  // Romanos
  "rm": 45, "rom": 45,
  // 1 Coríntios
  "1co": 46, "1cor": 46,
  // 2 Coríntios
  "2co": 47, "2cor": 47,
  // Gálatas
  "gl": 48, "gal": 48,
  // Efésios
  "ef": 49, "eph": 49,
  // Filipenses
  "fp": 50, "phi": 50, "php": 50,
  // Colossenses
  "cl": 51, "col": 51,
  // 1 Tessalonicenses
  "1ts": 52, "1th": 52,
  // 2 Tessalonicenses
  "2ts": 53, "2th": 53,
  // 1 Timóteo
  "1tm": 54, "1ti": 54, "1tim": 54,
  // 2 Timóteo
  "2tm": 55, "2ti": 55, "2tim": 55,
  // Tito
  "tt": 56, "tit": 56,
  // Filemon
  "fm": 57, "phm": 57,
  // Hebreus
  "hb": 58, "heb": 58,
  // Tiago
  "tg": 59, "jas": 59,
  // 1 Pedro
  "1pe": 60, "1pt": 60,
  // 2 Pedro
  "2pe": 61, "2pt": 61,
  // 1 João
  "1jo": 62, "1jn": 62,
  // 2 João
  "2jo": 63, "2jn": 63,
  // 3 João
  "3jo": 64, "3jn": 64,
  // Judas
  "jd": 65, "jud": 65,
  // Apocalipse
  "ap": 66, "rev": 66
};

// Static books metadata as fallback (Complete set for NVI/Almeida compatibility)
const STATIC_BOOKS = [
  { name: "Gênesis", abbrev: { pt: "gn", en: "gn" }, chapters: 50, order: 1 },
  { name: "Êxodo", abbrev: { pt: "ex", en: "ex" }, chapters: 40, order: 2 },
  { name: "Levítico", abbrev: { pt: "lv", en: "lv" }, chapters: 27, order: 3 },
  { name: "Números", abbrev: { pt: "num", en: "num" }, chapters: 36, order: 4 },
  { name: "Deuteronômio", abbrev: { pt: "dt", en: "dt" }, chapters: 34, order: 5 },
  { name: "Josué", abbrev: { pt: "js", en: "js" }, chapters: 24, order: 6 },
  { name: "Juízes", abbrev: { pt: "jz", en: "jz" }, chapters: 21, order: 7 },
  { name: "Rute", abbrev: { pt: "rt", en: "rt" }, chapters: 4, order: 8 },
  { name: "1 Samuel", abbrev: { pt: "1sm", en: "1sm" }, chapters: 31, order: 9 },
  { name: "2 Samuel", abbrev: { pt: "2sm", en: "2sm" }, chapters: 24, order: 10 },
  { name: "1 Reis", abbrev: { pt: "1rs", en: "1rs" }, chapters: 22, order: 11 },
  { name: "2 Reis", abbrev: { pt: "2rs", en: "2rs" }, chapters: 25, order: 12 },
  { name: "1 Crônicas", abbrev: { pt: "1cr", en: "1cr" }, chapters: 29, order: 13 },
  { name: "2 Crônicas", abbrev: { pt: "2cr", en: "2cr" }, chapters: 36, order: 14 },
  { name: "Esdras", abbrev: { pt: "ezr", en: "ezr" }, chapters: 10, order: 15 },
  { name: "Neemias", abbrev: { pt: "ne", en: "ne" }, chapters: 13, order: 16 },
  { name: "Ester", abbrev: { pt: "et", en: "et" }, chapters: 10, order: 17 },
  { name: "Jó", abbrev: { pt: "jo", en: "jo" }, chapters: 42, order: 18 },
  { name: "Salmos", abbrev: { pt: "sl", en: "sl" }, chapters: 150, order: 19 },
  { name: "Provérbios", abbrev: { pt: "pv", en: "pv" }, chapters: 31, order: 20 },
  { name: "Eclesiastes", abbrev: { pt: "ec", en: "ec" }, chapters: 12, order: 21 },
  { name: "Cantares", abbrev: { pt: "ct", en: "ct" }, chapters: 8, order: 22 },
  { name: "Isaías", abbrev: { pt: "is", en: "is" }, chapters: 66, order: 23 },
  { name: "Jeremias", abbrev: { pt: "jr", en: "jr" }, chapters: 52, order: 24 },
  { name: "Lamentações", abbrev: { pt: "lm", en: "lm" }, chapters: 5, order: 25 },
  { name: "Ezequiel", abbrev: { pt: "ez", en: "ez" }, chapters: 48, order: 26 },
  { name: "Daniel", abbrev: { pt: "dn", en: "dn" }, chapters: 12, order: 27 },
  { name: "Oseias", abbrev: { pt: "os", en: "os" }, chapters: 14, order: 28 },
  { name: "Joel", abbrev: { pt: "jl", en: "jl" }, chapters: 3, order: 29 },
  { name: "Amós", abbrev: { pt: "am", en: "am" }, chapters: 9, order: 30 },
  { name: "Obadias", abbrev: { pt: "ob", en: "ob" }, chapters: 1, order: 31 },
  { name: "Jonas", abbrev: { pt: "jon", en: "jon" }, chapters: 4, order: 32 },
  { name: "Miqueias", abbrev: { pt: "mq", en: "mq" }, chapters: 7, order: 33 },
  { name: "Naum", abbrev: { pt: "na", en: "na" }, chapters: 3, order: 34 },
  { name: "Habacuque", abbrev: { pt: "hc", en: "hc" }, chapters: 3, order: 35 },
  { name: "Sofonias", abbrev: { pt: "sf", en: "sf" }, chapters: 3, order: 36 },
  { name: "Ageu", abbrev: { pt: "ag", en: "ag" }, chapters: 2, order: 37 },
  { name: "Zacarias", abbrev: { pt: "zc", en: "zc" }, chapters: 14, order: 38 },
  { name: "Malaquias", abbrev: { pt: "ml", en: "ml" }, chapters: 4, order: 39 },
  { name: "Mateus", abbrev: { pt: "mt", en: "mt" }, chapters: 28, order: 40 },
  { name: "Marcos", abbrev: { pt: "mc", en: "mc" }, chapters: 16, order: 41 },
  { name: "Lucas", abbrev: { pt: "lc", en: "lc" }, chapters: 24, order: 42 },
  { name: "João", abbrev: { pt: "joa", en: "joa" }, chapters: 21, order: 43 },
  { name: "Atos", abbrev: { pt: "at", en: "at" }, chapters: 28, order: 44 },
  { name: "Romanos", abbrev: { pt: "rm", en: "rm" }, chapters: 16, order: 45 },
  { name: "1 Coríntios", abbrev: { pt: "1co", en: "1co" }, chapters: 16, order: 46 },
  { name: "2 Coríntios", abbrev: { pt: "2co", en: "2co" }, chapters: 13, order: 47 },
  { name: "Gálatas", abbrev: { pt: "gl", en: "gl" }, chapters: 6, order: 48 },
  { name: "Efésios", abbrev: { pt: "ef", en: "ef" }, chapters: 6, order: 49 },
  { name: "Filipenses", abbrev: { pt: "fp", en: "fp" }, chapters: 4, order: 50 },
  { name: "Colossenses", abbrev: { pt: "cl", en: "cl" }, chapters: 4, order: 51 },
  { name: "1 Tessalonicenses", abbrev: { pt: "1ts", en: "1ts" }, chapters: 5, order: 52 },
  { name: "2 Tessalonicenses", abbrev: { pt: "2ts", en: "2ts" }, chapters: 3, order: 53 },
  { name: "1 Timóteo", abbrev: { pt: "1tm", en: "1tm" }, chapters: 6, order: 54 },
  { name: "2 Timóteo", abbrev: { pt: "2tm", en: "2tm" }, chapters: 4, order: 55 },
  { name: "Tito", abbrev: { pt: "tt", en: "tt" }, chapters: 3, order: 56 },
  { name: "Filemon", abbrev: { pt: "fm", en: "fm" }, chapters: 1, order: 57 },
  { name: "Hebreus", abbrev: { pt: "hb", en: "hb" }, chapters: 13, order: 58 },
  { name: "Tiago", abbrev: { pt: "tg", en: "tg" }, chapters: 5, order: 59 },
  { name: "1 Pedro", abbrev: { pt: "1pe", en: "1pe" }, chapters: 5, order: 60 },
  { name: "2 Pedro", abbrev: { pt: "2pe", en: "2pe" }, chapters: 3, order: 61 },
  { name: "1 João", abbrev: { pt: "1jo", en: "1jo" }, chapters: 5, order: 62 },
  { name: "2 João", abbrev: { pt: "2jo", en: "2jo" }, chapters: 1, order: 63 },
  { name: "3 João", abbrev: { pt: "3jo", en: "3jo" }, chapters: 1, order: 64 },
  { name: "Judas", abbrev: { pt: "jd", en: "jd" }, chapters: 1, order: 65 },
  { name: "Apocalipse", abbrev: { pt: "ap", en: "ap" }, chapters: 22, order: 66 }
];

async function preseedCache() {
  const cacheDir = path.join(process.cwd(), "cache_chapters");
  if (!fs.existsSync(cacheDir)) {
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
    } catch (err: any) {
      console.error("[SEEDER] Failed to create cache directory:", err.message);
      return;
    }
  }

  const versionsToSeed = [
    { bollsCode: 'ARA', cacheCode: 'ara' },
    { bollsCode: 'NVIPT', cacheCode: 'nvibr' }
  ];

  for (const { bollsCode, cacheCode } of versionsToSeed) {
    let existingCount = 0;
    try {
      if (fs.existsSync(cacheDir)) {
        const files = fs.readdirSync(cacheDir);
        existingCount = files.filter(f => f.startsWith(`${cacheCode}_`)).length;
      }
    } catch (e) {
      console.error("[SEEDER] Error reading cache dir:", e);
    }

    // A complete Bible has precisely 1189 chapters.
    if (existingCount >= 1180) {
      console.log(`[SEEDER] Cache for ${cacheCode} is already populated (${existingCount} chapters). Skipping.`);
      continue;
    }

    console.log(`[SEEDER] Cache for ${cacheCode} is incomplete (${existingCount}/1189). Starting background seeding...`);

    // Run in background completely non-blocking
    (async () => {
      try {
        const url = `https://bolls.life/static/translations/${bollsCode}.json`;
        console.log(`[SEEDER] Fetching complete Bible ${bollsCode} from bolls.life...`);
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch complete Bible: status ${res.status}`);
        }
        const versesArr: any = await res.json();
        if (!Array.isArray(versesArr) || versesArr.length === 0) {
          throw new Error(`Invalid JSON format parsed from ${bollsCode}`);
        }

        console.log(`[SEEDER] Successfully downloaded ${versesArr.length} verses for ${bollsCode}. Processing into chapters...`);

        const grouped: Record<string, any> = {};

        for (const v of versesArr) {
          const bookNum = Number(v.book);
          const chapterNum = Number(v.chapter);
          const staticBook = STATIC_BOOKS.find(b => b.order === bookNum);
          if (!staticBook) continue;

          const abbrev = staticBook.abbrev.pt;
          const key = `${abbrev}_${chapterNum}`;

          if (!grouped[key]) {
            grouped[key] = {
              book: {
                name: staticBook.name,
                abbrev: { pt: abbrev }
              },
              chapter: {
                number: chapterNum,
                verses: 0
              },
              verses: []
            };
          }

          grouped[key].verses.push({
            number: Number(v.verse),
            text: v.text
          });
        }

        console.log(`[SEEDER] Writing ${Object.keys(grouped).length} chapter files for ${cacheCode} to disk...`);

        let writtenCount = 0;
        for (const [key, chData] of Object.entries(grouped)) {
          chData.verses.sort((a: any, b: any) => a.number - b.number);
          chData.chapter.verses = chData.verses.length;

          const cacheFilePath = path.join(cacheDir, `${cacheCode}_${key}.json`);
          fs.writeFileSync(cacheFilePath, JSON.stringify(chData), "utf8");
          writtenCount++;
        }

        console.log(`[SEEDER] Seeding for ${cacheCode} completed perfectly! Cached ${writtenCount} chapters.`);
      } catch (err: any) {
        console.error(`[SEEDER] Seeding failed for ${cacheCode}:`, err.message);
      }
    })();
  }
}

async function fetchWithLog(url: string, options: any = {}, silent = false) {
  const token = process.env.BIBLE_API_TOKEN;
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };
  
  try {
    const response = await fetch(url, { 
      ...options, 
      headers,
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) {
      const error = new Error(`Erro ${response.status}`);
      (error as any).status = response.status;
      throw error;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      throw new Error('Non-JSON response');
    }
  } catch (error: any) {
    if (!silent) {
      console.warn(`Primary source failed (${url}):`, error.message);
    }
    throw error;
  }
}

// Circuit breaker for Firestore writes
let firestoreWriteQuotaExceeded = false;
let lastQuotaCheckTime = 0;

function canWriteToFirestore() {
  if (!isFirestoreFunctional) return false;
  if (!firestoreWriteQuotaExceeded) return true;
  // Retry periodically (every 10 minutes)
  const now = Date.now();
  if (now - lastQuotaCheckTime > 600000) {
    firestoreWriteQuotaExceeded = false;
    return true;
  }
  return false;
}

function handleFirestoreWriteError(err: any, context: string) {
  const message = err.message || String(err);
  if (message.includes('RESOURCE_EXHAUSTED') || message.includes('quota') || message.includes('Quota limit exceeded')) {
     console.error(`[Firebase-Quota] Firestore write quota exceeded during ${context}. Disabling writes.`);
     firestoreWriteQuotaExceeded = true;
     lastQuotaCheckTime = Date.now();
  } else {
     console.error(`[Cache] FAILED to save ${context}:`, message);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Proxy for Bible versions
  app.get("/api/bible/versions", async (req, res) => {
    try {
      const data = await fetchWithLog(`${BASE_URL}/versions`, {}, true);
      res.json([
        ...data,
        { version: 'arai', name: 'ARAi+ (Strong)' }
      ]);
    } catch (error: any) {
      // Fallback static versions if API is down
      res.json([
        { version: "nvibr", name: "Nova Versão Internacional" },
        { version: "ara", name: "Almeida Revista e Atualizada" },
        { version: "arc", name: "Almeida Revista e Corrigida" },
        { version: "arai", name: "ARAi+ (Strong)" }
      ]);
    }
  });

  // API Proxy for Bible books
  app.get("/api/bible/books", async (req, res) => {
    try {
      const data = await fetchWithLog(`${BASE_URL}/books`, {}, true);
      if (Array.isArray(data)) {
        const sanitized = data.map((book: any, idx: number) => {
          const staticBook = STATIC_BOOKS[idx];
          if (staticBook) {
            return {
              ...book,
              abbrev: {
                pt: staticBook.abbrev.pt,
                en: staticBook.abbrev.en
              }
            };
          }
          return book;
        });
        return res.json(sanitized);
      }
      res.json(data);
    } catch (error: any) {
      res.json(STATIC_BOOKS.map(b => ({
        ...b,
        author: "Desconhecido",
        group: b.order <= 39 ? "Antigo Testamento" : "Novo Testamento",
        testament: b.order <= 39 ? "VT" : "NT"
      })));
    }
  });

  // API proxy for bulk Bible version download (downloads all chapters in one single payload, extremely fast!)
  app.get("/api/bible/bulk/:version", async (req, res) => {
    const { version } = req.params;
    const cacheDir = path.join(process.cwd(), "cache_chapters");
    const apiVersion = version === 'arai' ? 'ara' : version;
    
    try {
      if (fs.existsSync(cacheDir)) {
        const files = fs.readdirSync(cacheDir);
        const prefix = `${apiVersion}_`;
        const versionFiles = files.filter(f => f.startsWith(prefix) && f.endsWith('.json'));
        
        if (versionFiles.length > 0) {
          console.log(`[API-BULK] Compiling cached chapters for ${version} (count: ${versionFiles.length})`);
          const chapters: any[] = [];
          for (const file of versionFiles) {
            const filePath = path.join(cacheDir, file);
            try {
              const content = fs.readFileSync(filePath, "utf8");
              const parsed = JSON.parse(content);
              chapters.push(parsed);
            } catch (e: any) {
              // Ignore single file parse error
            }
          }
          if (chapters.length > 0) {
            return res.json(chapters);
          }
        }
      }
      
      // Fallback: Fetch directly from Bolls static translations if not found on disk cache
      const bollsCode = apiVersion === 'nvibr' ? 'NVIPT' : 'ARA';
      const bollsUrl = `https://bolls.life/static/translations/${bollsCode}.json`;
      console.log(`[API-BULK] Cache empty on server. Fetching from bolls.life: ${bollsUrl}`);
      
      const response = await fetch(bollsUrl, { signal: AbortSignal.timeout(15000) });
      if (response.ok) {
        const versesArr: any = await response.json();
        const grouped: Record<string, any> = {};
        
        for (const v of versesArr) {
          const bookNum = Number(v.book);
          const chapterNum = Number(v.chapter);
          const staticBook = STATIC_BOOKS.find(b => b.order === bookNum);
          if (!staticBook) continue;

          const abbrev = staticBook.abbrev.pt;
          const key = `${abbrev}_${chapterNum}`;

          if (!grouped[key]) {
            grouped[key] = {
              book: {
                name: staticBook.name,
                abbrev: { pt: abbrev }
              },
              chapter: {
                number: chapterNum,
                verses: 0
              },
              verses: []
            };
          }

          grouped[key].verses.push({
            number: Number(v.verse),
            text: v.text
          });
        }
        
        const result = Object.values(grouped).map((chData: any) => {
          chData.verses.sort((a: any, b: any) => a.number - b.number);
          chData.chapter.verses = chData.verses.length;
          return chData;
        });
        
        // Write to filesystem cache asynchronously in background to speed up next load
        Promise.resolve().then(() => {
          if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
          }
          for (const chData of result) {
            const cacheKey = `${apiVersion}_${chData.book.abbrev.pt.toLowerCase()}_${chData.chapter.number}.json`;
            const cacheFilePath = path.join(cacheDir, cacheKey);
            fs.writeFileSync(cacheFilePath, JSON.stringify(chData), "utf8");
          }
        }).catch(err => console.error("Error background saving to cache:", err.message));

        return res.json(result);
      }
      
      res.status(404).json({ error: 'Bulk download not available for this version' });
    } catch (err: any) {
      console.error("[API-BULK] Failed to compile bulk chapters:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // API Proxy for Bible chapters with Fallback to Bolls Life (and local file cache to prevent rate limits)
  app.get("/api/bible/verses/:version/:abbrev/:chapter", async (req, res) => {
    const { version, abbrev, chapter } = req.params;
    const apiVersion = version === 'arai' ? 'ara' : version;
    
    // Setup file cache
    const cacheDir = path.join(process.cwd(), "cache_chapters");
    if (!fs.existsSync(cacheDir)) {
      try {
        fs.mkdirSync(cacheDir, { recursive: true });
      } catch (err: any) {
        console.error("Failed to create cache_chapters directory:", err.message);
      }
    }
    
    const cacheKey = `${apiVersion}_${abbrev.toLowerCase()}_${chapter}.json`;
    const cacheFilePath = path.join(cacheDir, cacheKey);
    
    if (fs.existsSync(cacheFilePath)) {
      try {
        const cachedContent = fs.readFileSync(cacheFilePath, "utf8");
        const parsed = JSON.parse(cachedContent);
        if (parsed && parsed.verses && parsed.verses.length > 0) {
          return res.json(parsed);
        }
      } catch (e: any) {
        console.warn('Error reading from filesystem cache:', e.message);
      }
    }

    try {
      const data = await fetchWithLog(`${BASE_URL}/verses/${apiVersion}/${abbrev}/${chapter}`, {}, true);
      // Ensure we actually got verses, otherwise fall through to Bolls Life fallback
      if (!data || !data.verses || data.verses.length === 0) {
        throw new Error('No verses found in primary source');
      }
      
      // Save to cache asynchronously or synchronously
      try {
        fs.writeFileSync(cacheFilePath, JSON.stringify(data), "utf8");
      } catch (cacheErr: any) {
        console.warn("Failed to write to chapter cache file:", cacheErr.message);
      }
      
      res.json(data);
    } catch (error: any) {
      console.log(`Abibliadigital offline for ${version}/${abbrev}/${chapter}. Trying Bolls Life fallback...`);
      try {
        const bollsBookId = BOOK_MAPPING[abbrev.toLowerCase()];
        if (!bollsBookId) throw new Error(`Unknown book abbrev: ${abbrev}`);
        
        // Map common version codes to Bolls Life (ensure Portuguese versions)
        let bollsVersion = version.toUpperCase();
        if (bollsVersion === 'NVI' || bollsVersion === 'NVIBR') bollsVersion = 'NVIPT'; 
        if (bollsVersion === 'RA' || bollsVersion === 'ARA') bollsVersion = 'ARA';
        if (bollsVersion === 'RC') bollsVersion = 'ARC';
        if (bollsVersion === 'ACF') bollsVersion = 'ARC'; // Fallback to ARC for ACF
        if (bollsVersion === 'ARAI') bollsVersion = 'ARA'; // Use ARA as base for interlinear enrichment

        console.log(`Bolls Fetch: ${bollsVersion} - Book: ${bollsBookId} - Chapter: ${chapter}`);
        
        // Use the correct Bolls Life endpoint
        const response = await fetch(`https://bolls.life/get-chapter/${bollsVersion}/${bollsBookId}/${chapter}/`, {
          signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) {
           console.warn(`Bolls Life failed (${response.status}) for ${bollsVersion}`);
           // Final fallback to ARA if the specified version failed on Bolls
           if (bollsVersion !== 'ARA') {
             console.log("Trying final fallback to ARA...");
             const responseFallback = await fetch(`https://bolls.life/get-chapter/ARA/${bollsBookId}/${chapter}/`, {
               signal: AbortSignal.timeout(8000)
             });
             if (responseFallback.ok) {
               const versesArr = await responseFallback.json();
               const bookDataArr = STATIC_BOOKS.find(b => b.abbrev.pt === abbrev.toLowerCase()) || { name: abbrev };
               return res.json({
                 book: { name: (bookDataArr as any).name, abbrev: { pt: abbrev } },
                 chapter: { number: parseInt(chapter), verses: versesArr.length },
                 verses: versesArr.map((v: any) => ({ number: v.verse, text: v.text }))
               });
             }
           }
           throw new Error(`Bolls Life failed with status ${response.status}`);
        }
        
        const verses = await response.json();
        
        if (!Array.isArray(verses) || verses.length === 0) {
           console.warn(`Bolls Life returned empty or invalid for ${bollsVersion}`);
           // Final fallback to ARA if the specified version failed or was empty on Bolls
           if (bollsVersion !== 'ARA') {
             console.log("Trying final fallback to ARA...");
             const responseFallback = await fetch(`https://bolls.life/get-chapter/ARA/${bollsBookId}/${chapter}/`, {
               signal: AbortSignal.timeout(8000)
             });
             if (responseFallback.ok) {
               const versesArr = await responseFallback.json();
               if (Array.isArray(versesArr) && versesArr.length > 0) {
                 const bookDataArr = STATIC_BOOKS.find(b => b.abbrev.pt === abbrev.toLowerCase()) || { name: abbrev };
                 return res.json({
                   book: { name: (bookDataArr as any).name, abbrev: { pt: abbrev } },
                   chapter: { number: parseInt(chapter), verses: versesArr.length },
                   verses: versesArr.map((v: any) => ({ number: v.verse, text: v.text }))
                 });
               }
             }
           }
           throw new Error('Bolls Life response is empty or invalid');
        }
        
        // Transform Bolls Life format to ABibliaDigital format
        const bookData = STATIC_BOOKS.find(b => b.abbrev.pt === abbrev.toLowerCase()) || { name: abbrev };
        
        const transformed = {
          book: { name: (bookData as any).name, abbrev: { pt: abbrev } },
          chapter: { number: parseInt(chapter), verses: verses.length },
          verses: verses.map((v: any) => ({
            number: v.verse,
            text: v.text
          }))
        };
        console.log(`Bolls Fallback SUCCESS for ${abbrev} ${chapter}`);
        // Save to cache before sending response
        try {
          fs.writeFileSync(cacheFilePath, JSON.stringify(transformed), "utf8");
        } catch (cacheErr: any) {
          console.warn("Failed to write transformed fallback to cache file:", cacheErr.message);
        }
        res.json(transformed);
      } catch (fallbackError: any) {
        console.error('Bolls Life fallback failed:', fallbackError.message);
        res.status(503).json({ error: 'Nossas fontes bíblicas estão instáveis. Tente novamente em alguns minutos ou troque a versão nas configurações.' });
      }
    }
  });

  app.post("/api/bible/search", async (req, res) => {
    const { version, text } = req.body;
    const apiVersion = version === 'arai' ? 'ara' : version;
    try {
      // Primary search
      const data = await fetchWithLog(`${BASE_URL}/verses/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: apiVersion, text })
      });
      
      res.json(data);
    } catch (error: any) {
      console.log(`Primary search failed for "${text}".`);
      res.status(503).json({ error: 'Busca temporariamente indisponível. Tente termos menos específicos.' });
    }
  });

  // --- Gemini API ENDPOINTS ---

  app.get("/api/gemini/strong-definition/:id", async (req, res) => {
    const ai = getAI();
    if (!ai) return res.status(503).json({ error: "Gemini API key not configured" });

    const { id } = req.params;
    const cachePath = `cache_strong`;
    const startTime = performance.now();

    // 1. Check Persistent Cache (Firestore)
    if (isFirestoreFunctional) {
      try {
        const doc = await firestore.collection(cachePath).doc(id).get();
        if (doc.exists) {
          console.log(`[Cache-Strong] HIT for ${id}`);
          trackMetric('strong', 'hit');
          return res.json(doc.data());
        } else {
          console.log(`[Cache-Strong] MISS for ${id} (Not found in Firestore)`);
        }
      } catch (cacheError: any) {
        // If we get NOT_FOUND or PERMISSION_DENIED here, it's likely a persistent DB issue
        if (cacheError.message?.includes('NOT_FOUND') || cacheError.message?.includes('PERMISSION_DENIED')) {
           console.error(`[Cache-Strong] Firestore operational error: ${cacheError.message}. Disabling cache.`);
           isFirestoreFunctional = false;
        } else {
           console.error(`[Cache-Strong] Error reading Firestore for ${id}:`, cacheError.message);
        }
      }
    }

    console.log(`[Gemini] Cache MISS. Requesting Strong definition for: ${id}`);
    trackMetric('strong', 'miss');

    const prompt = `Aja como um especialista em léxico bíblico.
    Forneça a definição completa para o número de Strong: ${id}
    
    A resposta deve conter:
    1. Palavra original (Grego/Hebraico) e pronúncia.
    2. Significado literal e transliteração.
    3. Definição curta (1-2 frases).
    4. Uso no contexto bíblico (exemplos de versículos ou temas).
    `;

    try {
      let response: any;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                word: { type: Type.STRING },
                transliteration: { type: Type.STRING },
                pronunciation: { type: Type.STRING },
                definition: { type: Type.STRING },
                usage: { type: Type.STRING }
              },
              required: ["id", "word", "transliteration", "pronunciation", "definition", "usage"]
            }
          }
        });
      } catch (apiError: any) {
        if (apiError.message?.includes('429') || apiError.message?.includes('RESOURCE_EXHAUSTED')) {
          console.error(`[Gemini] QUOTA EXCEEDED (429) for Strong ID: ${id}`);
          return res.status(429).json({ error: "API quota exceeded. Please try again later." });
        }
        throw apiError;
      }

      const durationMs = performance.now() - startTime;
      const duration = durationMs.toFixed(2);
      console.log(`[Gemini] Strong definition SUCCESS for ${id} (${duration}ms)`);
      trackMetric('strong', 'call', durationMs);

      const rawText = response.text || "{}";
      const cleanText = rawText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const result = JSON.parse(cleanText);

      // 2. Save to Cache (Fire-and-forget)
      if (result.word && canWriteToFirestore()) {
        firestore.collection(cachePath).doc(id).set({
          ...result,
          createdAt: FieldValue.serverTimestamp()
        }).catch((err: any) => handleFirestoreWriteError(err, `strong-${id}`));
      }

      res.json(result);
    } catch (error: any) {
      console.error(`[Gemini] Strong Definition FAILED for ${id}:`, error);
      trackMetric('strong', 'error');
      res.status(500).json({ error: "Falha ao obter definição do Strong" });
    }
  });

  app.get("/api/gemini/dictionary-definition/:word", async (req, res) => {
    const ai = getAI();
    const { word } = req.params;
    const cachePath = `cache_dictionary`;
    const startTime = performance.now();

    // 1. Check Persistent Cache (Firestore)
    if (isFirestoreFunctional) {
      try {
        const doc = await firestore.collection(cachePath).doc(encodeURIComponent(word.toLowerCase())).get();
        if (doc.exists) {
          const cachedData = doc.data();
          const defText = cachedData?.definition || '';
          if (
            defText &&
            !defText.includes('Termo da língua portuguesa que designa um princípio') &&
            !defText.includes('Definição indisponível')
          ) {
            console.log(`[Cache-Dict] HIT for ${word}`);
            return res.json(cachedData);
          } else {
            console.log(`[Cache-Dict] Ignorando item de cache corrompido/placeholder para: ${word}`);
          }
        }
      } catch (cacheError: any) {
        console.error(`[Cache-Dict] Error reading Firestore for ${word}:`, cacheError.message);
      }
    }

    if (!ai) {
      console.log(`[Gemini] UNCONFIGURED. Falling back to Dicionário Aberto API for: ${word}`);
      const daResult = await fetchFromDicionarioAberto(word);
      if (daResult) {
        if (canWriteToFirestore()) {
          firestore.collection(cachePath).doc(encodeURIComponent(word.toLowerCase())).set({
            ...daResult,
            createdAt: FieldValue.serverTimestamp()
          }).catch((err: any) => handleFirestoreWriteError(err, `dict-${word}`));
        }
        return res.json(daResult);
      }
      return res.status(503).json({ error: "Gemini API key not configured and dictionary fallback failed" });
    }

    console.log(`[Gemini] Requesting definition for word: ${word}`);

    const prompt = `Aja como um renomado dicionário da língua portuguesa e teológico bíblico.
    Forneça a definição completa para a palavra: "${word}".
    
    A resposta deve conter:
    1. A palavra corrigida ortograficamente e acentuada devidamente (word).
    2. A definição precisa, clara e rica em detalhes linguísticos e contextuais (definition).
    3. Categoria gramatical ou notas de uso (usage).
    `;

    try {
      let response: any;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                definition: { type: Type.STRING },
                usage: { type: Type.STRING }
              },
              required: ["word", "definition", "usage"]
            }
          }
        });
      } catch (apiError: any) {
        console.warn(`[Gemini] API failed for ${word}. Attempting Dicionário Aberto fallback...`, apiError.message);
        const daResult = await fetchFromDicionarioAberto(word);
        if (daResult) {
          if (canWriteToFirestore()) {
            firestore.collection(cachePath).doc(encodeURIComponent(word.toLowerCase())).set({
              ...daResult,
              createdAt: FieldValue.serverTimestamp()
            }).catch((err: any) => handleFirestoreWriteError(err, `dict-${word}`));
          }
          return res.json(daResult);
        }

        if (apiError.message?.includes('429') || apiError.message?.includes('RESOURCE_EXHAUSTED')) {
          return res.status(429).json({ error: "Limite de cota excedido. Tente novamente mais tarde." });
        }
        throw apiError;
      }

      const durationMs = performance.now() - startTime;
      console.log(`[Gemini] Dictionary definition SUCCESS for ${word} (${durationMs.toFixed(2)}ms)`);

      const raw = response.text || "{}";
      const clean = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const result = JSON.parse(clean);

      // 2. Save to Cache
      if (result.word && canWriteToFirestore()) {
        firestore.collection(cachePath).doc(encodeURIComponent(word.toLowerCase())).set({
          ...result,
          createdAt: FieldValue.serverTimestamp()
        }).catch((err: any) => handleFirestoreWriteError(err, `dict-${word}`));
      }

      res.json(result);
    } catch (error: any) {
      console.error(`[Gemini] Dictionary Definition FAILED for ${word}:`, error);
      
      // Secondary fallback on general failure
      const daResult = await fetchFromDicionarioAberto(word);
      if (daResult) {
        if (canWriteToFirestore()) {
          firestore.collection(cachePath).doc(encodeURIComponent(word.toLowerCase())).set({
            ...daResult,
            createdAt: FieldValue.serverTimestamp()
          }).catch((err: any) => handleFirestoreWriteError(err, `dict-${word}`));
        }
        return res.json(daResult);
      }
      
      res.status(500).json({ error: "Falha ao obter definição" });
    }
  });

  app.get("/api/gemini/commentary/:commentaryId/:reference", async (req, res) => {
    const ai = getAI();
    if (!ai) return res.status(503).json({ error: "Gemini API key not configured" });

    const { commentaryId, reference } = req.params;
    const cachePath = `cache_commentary`;
    const startTime = performance.now();

    // 1. Check Persistent Cache (Firestore)
    if (isFirestoreFunctional) {
      try {
        const cacheKey = encodeURIComponent(`${commentaryId}_${reference.toLowerCase()}`);
        const doc = await firestore.collection(cachePath).doc(cacheKey).get();
        if (doc.exists) {
          console.log(`[Cache-Comm] HIT for ${commentaryId} - ${reference}`);
          return res.json(doc.data());
        }
      } catch (cacheError: any) {
        console.error(`[Cache-Comm] Error reading Firestore for ${commentaryId}_${reference}:`, cacheError.message);
      }
    }

    console.log(`[Gemini] Requesting commentary for ${commentaryId}: ${reference}`);

    const prompt = `Aja como o renomado comentário bíblico "${commentaryId.toUpperCase()}" (ex: Moody, Beacon).
    Forneça uma explicação/comentário teológico, exegético e histórico detalhado em português para a seguinte referência bíblica: "${reference}".
    
    A resposta deve conter:
    1. O título formatado (title). Exemplo: "Comentário Moody - João 3".
    2. O texto completo e estruturado do comentário interpretativo e explicativo para a passagem bíblica (content).
    `;

    try {
      let response: any;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING }
              },
              required: ["title", "content"]
            }
          }
        });
      } catch (apiError: any) {
        if (apiError.message?.includes('429') || apiError.message?.includes('RESOURCE_EXHAUSTED')) {
          return res.status(429).json({ error: "Limite de cota excedido. Tente novamente mais tarde." });
        }
        throw apiError;
      }

      const durationMs = performance.now() - startTime;
      console.log(`[Gemini] Commentary SUCCESS for ${commentaryId} - ${reference} (${durationMs.toFixed(2)}ms)`);

      const raw = response.text || "{}";
      const clean = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const result = JSON.parse(clean);

      // 2. Save to Cache
      if (result.title && canWriteToFirestore()) {
        const cacheKey = encodeURIComponent(`${commentaryId}_${reference.toLowerCase()}`);
        firestore.collection(cachePath).doc(cacheKey).set({
          ...result,
          createdAt: FieldValue.serverTimestamp()
        }).catch((err: any) => handleFirestoreWriteError(err, `comm-${cacheKey}`));
      }

      res.json(result);
    } catch (error: any) {
      console.error(`[Gemini] Commentary FAILED for ${commentaryId} - ${reference}:`, error);
      res.status(500).json({ error: "Falha ao obter comentário bíblico" });
    }
  });

  app.post("/api/gemini/search-fallback", async (req, res) => {
    const ai = getAI();
    if (!ai) return res.status(503).json({ error: "Gemini API key not configured" });

    const { text, version } = req.body;
    const startTime = performance.now();
    console.log(`[Gemini] AI Search fallback started for term: "${text}"`);

    const prompt = `Atue como um motor de pesquisa bíblica avançado.
    O usuário está buscando pela expressão: "${text}" na versão "${version}".
    
    OBJETIVO:
    Retornar exatamente os 10 versículos mais relevantes que contenham o tema ou as palavras buscadas.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    book: {
                      type: Type.OBJECT,
                      properties: {
                        abbrev: { type: Type.STRING },
                        name: { type: Type.STRING }
                      },
                      required: ["abbrev", "name"]
                    },
                    chapter: { type: Type.NUMBER },
                    number: { type: Type.NUMBER },
                    text: { type: Type.STRING }
                  },
                  required: ["book", "chapter", "number", "text"]
                }
              }
            },
            required: ["verses"]
          }
        }
      });

      const duration = (performance.now() - startTime).toFixed(2);
      const raw = response.text || '{"verses":[]}';
      const clean = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const data = JSON.parse(clean);
      console.log(`[Gemini] AI Search SUCCESS for "${text}" (${duration}ms) - Returned ${data.verses?.length || 0} verses`);
      
      res.json({
        verses: data.verses || [],
        meta: { source: 'ai' }
      });
    } catch (error: any) {
      console.error(`[Gemini] Search Fallback FAILED for "${text}":`, error);
      res.status(500).json({ verses: [], error: "Busca AI falhou" });
    }
  });

  // Map of active generation tasks to prevent duplicate AI calls for the same chapter
  const activeInterlinearTasks = new Map<string, Promise<any>>();

  app.post("/api/gemini/interlinear", async (req, res) => {
    const ai = getAI();
    if (!ai) return res.status(503).json({ error: "Gemini API key not configured" });

    const { verses, book, chapter, version = 'arai' } = req.body;
    
    // Generate a unique cache key
    const cacheKey = book && chapter ? `${version}-${book}-${chapter}` : null;
    const cachePath = `cache_interlinear`;

    if (cacheKey && isFirestoreFunctional) {
      // 1. Check persistent cache (Firestore)
      try {
        const doc = await firestore.collection(cachePath).doc(cacheKey).get();
        if (doc.exists) {
          console.log(`[Cache] HIT for ${cacheKey}`);
          trackMetric('interlinear', 'hit', undefined, cacheKey);
          return res.json(doc.data()?.verses || verses);
        } else {
          console.log(`[Cache] MISS for ${cacheKey} (Not found in Firestore)`);
        }
      } catch (cacheError: any) {
        if (cacheError.message?.includes('NOT_FOUND') || cacheError.message?.includes('PERMISSION_DENIED')) {
           console.error(`[Cache] Firestore operational error: ${cacheError.message}. Disabling cache.`);
           isFirestoreFunctional = false;
        } else {
           console.error(`[Cache] Error reading Firestore for ${cacheKey}:`, cacheError.message);
        }
        trackMetric('interlinear', 'error');
      }

      // 2. Check for an active task for the same chapter (Concurrency Protection)
      if (activeInterlinearTasks.has(cacheKey)) {
        console.log(`[Cache] REUSING active generation task for ${cacheKey}`);
        try {
          const result = await activeInterlinearTasks.get(cacheKey);
          trackMetric('interlinear', 'hit', undefined, cacheKey);
          return res.json(result);
        } catch (e) {
          // Task failed, proceed to try again or fallback
        }
      }
    }

    // 3. AI Generation Logic (Cache MISS)
    trackMetric('interlinear', 'miss', undefined, cacheKey || undefined);
    const startTime = performance.now();
    const verseCount = verses?.length || 0;
    console.log(`[Gemini] CACHE MISS for ${cacheKey || 'unknown'}: processing ${verseCount} verses`);

    const generateTask = (async () => {
      try {
        const prompt = `Aja como um tradutor acadêmico da Bíblia (formato Interlinear ARAi+).
Transforme os seguintes versículos em um formato interlinear onde cada palavra (ou grupo de palavras) é seguida por sua palavra original correspondente (Grego para Novo Testamento, Hebraico para Antigo).

EXEMPLO DE SAÍDA:
"No princípio <S>H7225</S> <O>בְּרֵאשִׁית</O> criou <S>H1254</S> <O>בָּרָא</O> Deus <S>H430</S> <O>אֱלֹהִים</O> os céus <S>H8064</S> <O>הַשָּׁמัיִם</O> e a terra <S>H776</S> <O>אָרץ</O>."

Use as tags:
<S>...</S> para o número de Strong.
<O>...</O> para a palavra no original.

Versículos para processar:
${verses.map((v: any) => `${v.number}. ${v.text}`).join('\n')}
`;

        const timeoutPromise = (ms: number) => new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Gemini timeout after ${ms/1000}s`)), ms)
        );

        const makeAiCall = async () => {
          try {
            return await ai.models.generateContent({
              model: "gemini-3.5-flash",
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    verses: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          number: { type: Type.NUMBER },
                          text: { type: Type.STRING }
                        },
                        required: ["number", "text"]
                      }
                    }
                  },
                  required: ["verses"]
                }
              }
            });
          } catch (apiError: any) {
            if (apiError.message?.includes('429') || apiError.message?.includes('RESOURCE_EXHAUSTED')) {
              console.error(`[Gemini] QUOTA EXCEEDED (429) for ${cacheKey || 'unknown'}`);
              throw new Error("GEMINI_QUOTA_EXCEEDED");
            }
            throw apiError;
          }
        };

        let response: any;
        try {
          response = await Promise.race([makeAiCall(), timeoutPromise(90000)]);
        } catch (e: any) {
          if (e.message === "GEMINI_QUOTA_EXCEEDED") throw e;
          if (e.message.includes("timeout")) {
            console.warn(`[Gemini] Timeout on attempt 1 for ${cacheKey}, retrying...`);
            response = await Promise.race([makeAiCall(), timeoutPromise(120000)]);
          } else throw e;
        }

        const durationMs = performance.now() - startTime;
        const rawText = response.text || "";
        let data;
        try {
          const cleanText = rawText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
          data = JSON.parse(cleanText || '{"verses":[]}');
        } catch (parseError: any) {
          console.error("[Gemini] ERROR: Failed to parse response", parseError);
          trackMetric('interlinear', 'error');
          throw parseError;
        }

        const enrichedVerses = data.verses || verses;
        console.log(`[Gemini] Interlinear SUCCESS in ${durationMs.toFixed(2)}ms for ${cacheKey || 'unknown'}`);
        trackMetric('interlinear', 'call', durationMs);

        if (cacheKey && enrichedVerses.length > 0 && enrichedVerses[0].text.includes('<S') && canWriteToFirestore()) {
          firestore.collection(cachePath).doc(cacheKey).set({
            verses: enrichedVerses,
            createdAt: FieldValue.serverTimestamp(),
            book,
            chapter,
            version
          }).catch((err: any) => handleFirestoreWriteError(err, cacheKey));
        }

        return enrichedVerses;
      } catch (error: any) {
        console.error(`[Gemini] Interlinear FAILED for ${cacheKey}:`, error.message);
        // Error is caught here, we still want to rethrow if it's Quota 
        // but the awaiters in the route handler will catch it too.
        throw error;
      }
    })();

    // Register active task if cacheKey exists
    if (cacheKey) {
      // Safe catch to prevent unhandled rejection during wait
      generateTask.catch(() => {}); 
      activeInterlinearTasks.set(cacheKey, generateTask);
      generateTask.finally(() => activeInterlinearTasks.delete(cacheKey));
    }

    try {
      const result = await generateTask;
      return res.json(result);
    } catch (error: any) {
      if (error.message === "GEMINI_QUOTA_EXCEEDED") {
        return res.status(429).json({ error: "Gemini quota exceeded", verses: verses || [] });
      }
      console.error("[Gemini-Route] Error awaiting task:", error.message);
      return res.json(verses || []);
    }
  });

  // Global API Error Handler to prevent returning HTML for missing/broken routes
  app.use('/api', (req, res, next) => {
    res.status(404).json({ error: "Endpoint not found" });
  });

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api')) {
      console.error("[API-Global-Error]:", err);
      return res.status(err.status || 500).json({ 
        error: err.message || "Internal Server Error",
        verses: (req as any).body?.verses // Return original verses if possible
      });
    }
    next(err);
  });

  // Metrics endpoint for internal monitoring
  app.get("/api/internal/metrics", (req, res) => {
    const i = serverMetrics.interlinear;
    const s = serverMetrics.strong;
    
    const sortedChapters = Object.entries(i.popularChapters)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    res.json({
      interlinear: {
        total_requests: i.requests,
        cache_hits: i.cacheHits,
        cache_misses: i.cacheMisses,
        hit_rate: i.requests > 0 ? ((i.cacheHits / i.requests) * 100).toFixed(2) + '%' : '0%',
        ai_calls: i.aiCalls,
        errors: i.errors,
        avg_ai_duration_ms: i.aiCalls > 0 ? (i.totalDuration / i.aiCalls).toFixed(2) : 0,
      },
      strong: {
        total_requests: s.requests,
        cache_hits: s.cacheHits,
        cache_misses: s.cacheMisses,
        hit_rate: s.requests > 0 ? ((s.cacheHits / s.requests) * 100).toFixed(2) + '%' : '0%',
        ai_calls: s.aiCalls,
        errors: s.errors,
        avg_ai_duration_ms: s.aiCalls > 0 ? (s.totalDuration / s.aiCalls).toFixed(2) : 0,
      },
      popular_chapters: Object.fromEntries(sortedChapters),
      estimated_cost_saved: ((i.cacheHits + s.cacheHits) * 0.0001).toFixed(4) + '$'
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    preseedCache().catch(err => console.error("Preseed cache error:", err));
  });
}

startServer();
