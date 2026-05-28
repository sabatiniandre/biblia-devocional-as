import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share, MoreVertical, Smartphone, Monitor, CheckCircle2 } from 'lucide-react';

export const InstallGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [browser, setBrowser] = useState<'safari' | 'chrome' | 'other'>('other');
  const [os, setOs] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    // Check for invite parameter
    const params = new URLSearchParams(window.location.search);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (params.get('utm_source') === 'invite' && !isStandalone) {
      setIsOpen(true);
      // Clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // Browser detection
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const isChrome = /chrome|crios/.test(ua);

    if (isIos) {
      setOs('ios');
      setBrowser('safari');
    } else if (isAndroid) {
      setOs('android');
      setBrowser(isChrome ? 'chrome' : 'other');
    } else {
      setOs('desktop');
      setBrowser(isChrome ? 'chrome' : 'other');
    }
  }, []);

  if (!isOpen) return null;

  const steps = {
    ios: [
      {
        icon: <Share className="w-5 h-5 text-blue-500" />,
        text: 'Toque no botão de compartilhar (o ícone de quadrado com seta para cima na barra inferior).',
      },
      {
        icon: <Smartphone className="w-5 h-5 text-blue-500" />,
        text: 'Role para baixo e toque em "Adicionar à Tela de Início".',
      },
      {
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
        text: 'Toque em "Adicionar" no canto superior direito para confirmar.',
      },
    ],
    android: [
      {
        icon: <MoreVertical className="w-5 h-5 text-gray-500" />,
        text: 'Toque nos três pontos no canto superior direito do navegador.',
      },
      {
        icon: <Smartphone className="w-5 h-5 text-blue-500" />,
        text: 'Toque em "Instalar aplicativo" ou "Adicionar à tela inicial".',
      },
      {
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
        text: 'Confirme a instalação para ter o acesso rápido à Bíblia.',
      },
    ],
    desktop: [
      {
        icon: <Monitor className="w-5 h-5 text-blue-500" />,
        text: 'Procure pelo ícone de instalação na barra de endereços (lado direito).',
      },
      {
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
        text: 'Clique em "Instalar" para adicionar o atalho à sua área de trabalho.',
      },
    ],
  };

  const currentSteps = os === 'ios' ? steps.ios : os === 'android' ? steps.android : steps.desktop;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-stone-900 mb-2">Instale o App Bíblia</h3>
                  <p className="text-sm text-stone-500">Tenha a Palavra de Deus sempre à mão no seu celular.</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-stone-50 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-stone-400" />
                </button>
              </div>

              <div className="space-y-6">
                {currentSteps.map((step, index) => (
                  <div key={index} className="flex gap-4 items-start">
                    <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      {step.icon}
                    </div>
                    <div className="pt-2">
                      <p className="text-sm text-stone-700 leading-relaxed">
                        <span className="font-bold text-stone-900 mr-1">{index + 1}.</span> {step.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-full mt-8 py-4 bg-stone-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-stone-800 transition-colors shadow-lg active:scale-[0.98]"
              >
                Entendi, obrigado!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
