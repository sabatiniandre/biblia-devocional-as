import React, { useState } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  BookOpen, 
  Lightbulb, 
  Map as MapIcon, 
  Highlighter, 
  Settings,
  Cloud,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface TourStep {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const STEPS: TourStep[] = [
  {
    title: "Bem-vindo à Bíblia Devocional AS",
    description: "Sua jornada de fé e estudo agora conta com ferramentas modernas em uma interface tranquila. Vamos conhecer o essencial?",
    icon: BookOpen,
    color: "bg-stone-800"
  },
  {
    title: "Leitor Imersivo",
    description: "Aqui você lê as escrituras com foco total. No topo, você pode mudar o capítulo e o livro a qualquer momento.",
    icon: BookOpen,
    color: "bg-stone-800"
  },
  {
    title: "Planos Devocionais",
    description: "Escolha entre planos de 30, 90 ou 365 dias. Acompanhe sua leitura e veja se você está em dia ou defasado.",
    icon: Lightbulb,
    color: "bg-amber-500"
  },
  {
    title: "Marque o que Inspira",
    description: "Use o marcador de texto no topo para destacar versículos. Segure o botão para escolher entre 4 cores de destaque.",
    icon: Highlighter,
    color: "bg-yellow-400"
  },
  {
    title: "Seu Mapa de Fé",
    description: "Visualize seu progresso através de um mapa interativo que mostra quais capítulos você já conquistou.",
    icon: MapIcon,
    color: "bg-stone-900"
  },
  {
    title: "Sempre Sincronizado",
    description: "Suas notas, destaques e progresso são salvos na nuvem automaticamente. Continue de onde parou em qualquer lugar.",
    icon: Cloud,
    color: "bg-blue-500"
  },
  {
    title: "Ajuste ao seu Olhar",
    description: "Nas configurações (engrenagem), você pode mudar para o modo noturno, sépia, e ajustar o tamanho e estilo da fonte.",
    icon: Settings,
    color: "bg-stone-400"
  }
];

interface TourGuideProps {
  onClose: () => void;
}

export function TourGuide({ onClose }: TourGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(curr => curr + 1);
    } else {
      onClose();
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(curr => curr - 1);
    }
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl relative z-10 overflow-hidden flex flex-col"
      >
        {/* Header with Progress */}
        <div className="px-8 pt-8 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, idx) => (
              <div 
                key={idx}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  idx === currentStep ? "w-8 bg-stone-800" : (idx < currentStep ? "w-4 bg-stone-300" : "w-4 bg-stone-100")
                )}
              />
            ))}
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12 space-y-8 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className={cn(
                "w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg transform -rotate-3",
                step.color
              )}>
                <Icon className="w-10 h-10 text-white" />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 leading-tight">
                  {step.title}
                </h3>
                <p className="text-lg text-stone-500 leading-relaxed font-medium">
                  {step.description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex items-center justify-between pt-4 border-t border-stone-50">
          <button 
            onClick={prev}
            disabled={currentStep === 0}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all",
              currentStep === 0 ? "text-stone-200" : "text-stone-500 hover:bg-stone-50"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
            Anterior
          </button>

          <button 
            onClick={next}
            className="flex items-center gap-2 px-8 py-3 bg-stone-900 text-white rounded-2xl font-bold shadow-xl shadow-stone-200 hover:bg-stone-800 active:scale-95 transition-all"
          >
            {currentStep === STEPS.length - 1 ? 'Começar Agora' : 'Próximo'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {currentStep === STEPS.length - 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-24 right-8 bg-green-50 text-green-600 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border border-green-100"
          >
            <CheckCircle2 className="w-4 h-4" />
            Tudo pronto para sua jornada!
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
