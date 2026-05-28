/**
 * Script para pré-gerar o cache do ARAi+ para os capítulos mais populares.
 * 
 * Uso:
 * 1. Certifique-se de que o servidor está rodando (npm run dev)
 * 2. Em outro terminal, execute: npx tsx scripts/pregenerate_cache.ts
 */

const POPULAR_CHAPTERS = [
  { book: 'sl', chapter: 23, name: 'Salmo 23' },
  { book: 'jo', chapter: 3, name: 'João 3' },
  { book: 'rm', chapter: 8, name: 'Romanos 8' },
  { book: 'is', chapter: 53, name: 'Isaías 53' },
  { book: 'mt', chapter: 5, name: 'Mateus 5' },
  { book: 'gn', chapter: 1, name: 'Gênesis 1' },
  { book: 'sl', chapter: 91, name: 'Salmo 91' },
];

const API_BASE = 'http://localhost:3000/api';
const VERSION = 'ara'; // Pegamos o texto da ARA para transformar em ARAi+

async function seedCache() {
  console.log('🚀 Iniciando pré-geração de cache para capítulos populares...');
  
  for (const item of POPULAR_CHAPTERS) {
    try {
      console.log(`\n📖 Processando ${item.name} (${item.book} ${item.chapter})...`);
      
      // 1. Buscar os versículos originais
      const versesRes = await fetch(`${API_BASE}/bible/verses/${VERSION}/${item.book}/${item.chapter}`);
      if (!versesRes.ok) {
        console.error(`❌ Erro ao buscar versículos para ${item.name}: ${versesRes.statusText}`);
        continue;
      }
      
      const data: any = await versesRes.json();
      const verses = data.verses;
      
      if (!verses || verses.length === 0) {
        console.warn(`⚠️ Nenhum versículo encontrado para ${item.name}`);
        continue;
      }

      console.log(`✨ Versículos obtidos. Enviando para processamento Gemini (ARAi+)...`);

      // 2. Enviar para o endpoint de interlinear para processar e salvar no cache
      const interlinearRes = await fetch(`${API_BASE}/gemini/interlinear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verses,
          book: item.book,
          chapter: item.chapter,
          version: 'arai'
        }),
      });

      if (interlinearRes.ok) {
        console.log(`✅ ${item.name} processado e salvo no cache com sucesso!`);
      } else {
        const error = await interlinearRes.text();
        console.error(`❌ Falha no processamento de ${item.name}: ${error}`);
      }

    } catch (error) {
      console.error(`💥 Erro fatal ao processar ${item.name}:`, error);
    }
  }

  console.log('\n🏁 Pré-geração concluída!');
}

seedCache().catch(console.error);
