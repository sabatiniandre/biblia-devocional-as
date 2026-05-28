import { BIBLICAL_BOOKS } from './bible-books';

export interface ReadingPlanItem {
  day: number;
  readings: string[]; // references in format 'abbrev/chapter'
}

export interface ReadingPlan {
  id: string;
  name: string;
  description: string;
  durationDays: number;
  category: 'chronological' | 'thematic' | 'speed';
  items: ReadingPlanItem[];
}

// Helper to generate a sequential plan
const generateSequentialPlan = (name: string, description: string, id: string, days: number, books: string[]): ReadingPlan => {
  const planItems: ReadingPlanItem[] = [];
  const allChapters: string[] = [];
  
  books.forEach(abbrev => {
    const book = BIBLICAL_BOOKS.find(b => b.abbrev === abbrev);
    if (book) {
      for (let i = 1; i <= book.chapters; i++) {
        allChapters.push(`${abbrev}/${i}`);
      }
    }
  });

  const chaptersPerDay = Math.ceil(allChapters.length / days);
  
  for (let d = 1; d <= days; d++) {
    const dayReadings = allChapters.slice((d - 1) * chaptersPerDay, d * chaptersPerDay);
    if (dayReadings.length > 0) {
      planItems.push({ day: d, readings: dayReadings });
    }
  }

  return {
    id,
    name,
    description,
    durationDays: days,
    category: 'speed',
    items: planItems
  };
};

export const READING_PLANS: ReadingPlan[] = [
  {
    id: 'jesus-30',
    name: '30 Dias com Jesus',
    description: 'Um mergulho nos ensinos e na vida de Jesus através dos Evangelhos.',
    durationDays: 30,
    category: 'thematic',
    items: [
      { day: 1, readings: ['mt/1', 'mt/2'] },
      { day: 2, readings: ['mt/3', 'mt/4'] },
      { day: 3, readings: ['mt/5', 'mt/6'] },
      { day: 4, readings: ['mt/7', 'mt/8'] },
      { day: 5, readings: ['mt/9', 'mt/10'] },
      { day: 6, readings: ['mt/11', 'mt/12'] },
      { day: 7, readings: ['mt/13', 'mt/14'] },
      { day: 8, readings: ['mt/15', 'mt/16'] },
      { day: 9, readings: ['mt/17', 'mt/18'] },
      { day: 10, readings: ['mt/19', 'mt/20'] },
      { day: 11, readings: ['mt/21', 'mt/22'] },
      { day: 12, readings: ['mt/23', 'mt/24'] },
      { day: 13, readings: ['mt/25', 'mt/26'] },
      { day: 14, readings: ['mt/27', 'mt/28'] },
      { day: 15, readings: ['mc/1', 'mc/2'] },
      { day: 16, readings: ['mc/3', 'mc/4'] },
      { day: 17, readings: ['mc/5', 'mc/6'] },
      { day: 18, readings: ['mc/7', 'mc/8'] },
      { day: 19, readings: ['mc/9', 'mc/10'] },
      { day: 20, readings: ['mc/11', 'mc/12'] },
      { day: 21, readings: ['mc/13', 'mc/14'] },
      { day: 22, readings: ['mc/15', 'mc/16'] },
      { day: 23, readings: ['lc/1', 'lc/2'] },
      { day: 24, readings: ['lc/3', 'lc/4'] },
      { day: 25, readings: ['lc/5', 'lc/6'] },
      { day: 26, readings: ['lc/7', 'lc/8'] },
      { day: 27, readings: ['lc/9', 'lc/10'] },
      { day: 28, readings: ['joa/1', 'joa/2'] },
      { day: 29, readings: ['joa/3', 'joa/4'] },
      { day: 30, readings: ['joa/5', 'joa/6'] },
    ]
  },
  {
    id: 'wisdom-31',
    name: 'Sabedoria: Salmos e Provérbios',
    description: 'Um mês dedicado aos cânticos e conselhos práticos dos livros de sabedoria.',
    durationDays: 31,
    category: 'thematic',
    items: Array.from({ length: 31 }, (_, i) => ({
      day: i + 1,
      readings: [`sl/${i * 5 + 1}`, `sl/${i * 5 + 2}`, `sl/${i * 5 + 3}`, `sl/${i * 5 + 4}`, `sl/${i * 5 + 5}`, `pv/${i + 1}`]
        .filter(ref => {
          const [abbrev, ch] = ref.split('/');
          const book = BIBLICAL_BOOKS.find(b => b.abbrev === abbrev);
          return book && parseInt(ch) <= book.chapters;
        })
    }))
  },
  generateSequentialPlan(
    'A Bíblia em 90 Dias',
    'Um desafio intenso para ler toda a Bíblia em apenas 3 meses.',
    'bible-90',
    90,
    BIBLICAL_BOOKS.map(b => b.abbrev)
  ),
  generateSequentialPlan(
    'Novo Testamento em 180 Dias',
    'Uma jornada tranquila através de todo o Novo Testamento.',
    'nt-180',
    180,
    BIBLICAL_BOOKS.filter(b => b.order >= 40).map(b => b.abbrev)
  ),
  // Chronological 1 Year Interleaved
  {
    id: 'year-interleaved',
    name: 'Bíblia em 1 Ano (Misto)',
    description: 'Leitura diária intercalando o Antigo e o Novo Testamento para uma melhor compreensão.',
    durationDays: 365,
    category: 'chronological',
    items: Array.from({ length: 365 }, (_, i) => {
      const day = i + 1;
      // Procedural generation of a "mixed" plan for brevity in code
      // Day 1: Gn 1-2, Mt 1
      // Roughly 3 OT chapters and 1 NT chapter per day
      const otBooks = BIBLICAL_BOOKS.filter(b => b.order < 40);
      const ntBooks = BIBLICAL_BOOKS.filter(b => b.order >= 40);
      
      const otChapters: string[] = [];
      otBooks.forEach(b => {
        for (let c = 1; c <= b.chapters; c++) otChapters.push(`${b.abbrev}/${c}`);
      });
      
      const ntChapters: string[] = [];
      ntBooks.forEach(b => {
        for (let c = 1; c <= b.chapters; c++) ntChapters.push(`${b.abbrev}/${c}`);
      });
      
      const otPerDay = otChapters.length / 365;
      const ntPerDay = ntChapters.length / 365;
      
      const otStart = Math.floor(i * otPerDay);
      const otEnd = Math.floor((i + 1) * otPerDay);
      const ntStart = Math.floor(i * ntPerDay);
      const ntEnd = Math.floor((i + 1) * ntPerDay);
      
      return {
        day,
        readings: [
          ...otChapters.slice(otStart, otEnd),
          ...ntChapters.slice(ntStart, ntEnd)
        ]
      };
    })
  }
];
