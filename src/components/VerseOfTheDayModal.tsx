import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Share2,
  X,
  Instagram,
  MessageCircle,
  Twitter,
  Download,
  Copy,
  Check,
  BookOpen
} from 'lucide-react';

import { promises } from '../data/promises';
import { cn } from '../lib/utils';
import { bibleService } from '../services/bibleService';
import { offlineDb } from '../lib/offlineDb';

// 🔥 FIX CRÍTICO: remover extensão .ts
import { geminiService } from '../services/geminiService';

import html2canvas from 'html2canvas';

interface VerseOfTheDayModalProps {
  onClose: () => void;
  onNavigate?: (book: string, chapter: number, verse: number) => void;
}

export const VerseOfTheDayModal: React.FC<VerseOfTheDayModalProps> = ({ onClose, onNavigate }) => {
  const [verse, setVerse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const loadVerse = async () => {
      const date = new Date();
      const dayOfYear = Math.floor(
        (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
      );
      const index = dayOfYear % promises.length;
      const initialPromise = promises[index];

      try {
        const versionsToTry = ['nvibr', 'ara'];
        let finalVerse: any = null;
        let source = 'NONE';
        let selectedVersion = 'none';
        const economyMode = geminiService.isEconomyMode();

        for (const vId of versionsToTry) {
          try {
            const cached = await offlineDb.getChapter(
              vId,
              initialPromise.book,
              initialPromise.chapter
            );

            let data = cached;

            if (!data && navigator.onLine && !economyMode) {
              data = await bibleService.getChapter(
                vId,
                initialPromise.book,
                initialPromise.chapter
              );
              source = 'ONLINE';
            } else if (data) {
              source = 'OFFLINE';
            }

            if (data && data.verses) {
              const match = data.verses.find(
                v => v.number === initialPromise.verse
              );

              if (match) {
                finalVerse = {
                  ...initialPromise,
                  text: match.text
                };
                selectedVersion = vId;
                break;
              }
            }
          } catch (e) {
            console.warn(`[VERSE] Failed in ${vId}:`, e);
          }
        }

        if (!finalVerse) {
          console.error('[VERSE] No module text found.');

          setVerse({
            reference: 'Salmos 23:1',
            text: 'O Senhor é o meu pastor; nada me falta.',
            book: 'sl',
            chapter: 23,
            verse: 1
          });

          setLoading(false);
          return;
        }

        console.log('[VERSE FINAL VERSION]', selectedVersion.toUpperCase());
        console.log('[VERSE FINAL SOURCE]', source);

        setVerse(finalVerse);
      } catch (err) {
        console.error('[VERSE] load failed:', err);
      } finally {
        setLoading(false);
      }
    };

    loadVerse();
  }, []);

  if (!verse) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-xl flex items-center gap-3 border border-stone-200"
        >
          <div className="w-5 h-5 border-2 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
          <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">
            Sincronizando Mensagem...
          </span>
        </motion.div>
      </div>
    );
  }

  const captureImage = async () => {
    if (!cardRef.current) return null;

    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#000'
      });

      return new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/png', 1.0)
      );
    } catch (err) {
      console.error('Capture failed:', err);
      return null;
    }
  };

  const getFontSize = (text: string) => {
    const len = text.length;
    if (len < 55) return 'text-2xl sm:text-3xl';
    if (len < 110) return 'text-xl sm:text-2xl';
    if (len < 165) return 'text-lg sm:text-xl';
    if (len < 240) return 'text-base sm:text-lg';
    return 'text-sm sm:text-base';
  };

  const shareImage = async () => {
    if (sharing) return;
    setSharing(true);

    try {
      const blob = await captureImage();

      if (!blob) return;

      const file = new File([blob], 'versiculo.png', {
        type: 'image/png'
      });

      const appUrl = `${window.location.origin}`;
      const text = `"${verse.text}" — ${verse.reference}`;

      if (navigator.share) {
        await navigator.share({
          files: [file],
          text,
          title: 'Versículo do Dia'
        });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'versiculo.png';
        link.click();
      }
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setSharing(false);
    }
  };

  const downloadImage = async () => {
    showToast("Preparando imagem para download...");
    try {
      const blob = await captureImage();
      if (blob) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `versiculo_${verse.reference.replace(/\s+/g, '_').toLowerCase()}.png`;
        link.click();
        showToast("Imagem baixada com sucesso!");
      } else {
        showToast("Erro ao gerar imagem.");
      }
    } catch (err) {
      console.error('Download failed:', err);
      showToast("Erro ao baixar imagem.");
    }
  };

  const copyText = () => {
    navigator.clipboard.writeText(
      `"${verse.text}" — ${verse.reference}`
    );
    setCopied(true);
    showToast("Texto copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareInstagram = async () => {
    showToast("Preparando imagem e copiando texto...");
    const blob = await captureImage();
    if (blob) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'versiculo.png';
      link.click();
      copyText();
      showToast("Imagem salva! Cole a mensagem na legenda do Instagram.");
    } else {
      showToast("Falha ao gerar imagem para o Instagram.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl border border-stone-200/50"
        onClick={e => e.stopPropagation()}
      >
        <div ref={cardRef} className="relative aspect-square w-full overflow-hidden">
          <img
            src={`https://picsum.photos/seed/${verse.reference}/1080/1080`}
            className="absolute inset-0 w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-black/60" />

          <div className="absolute inset-0 flex flex-col justify-center items-center text-center text-white p-6 sm:p-10">
            <h2
              className={cn("italic font-bold tracking-tight leading-relaxed", getFontSize(verse.text))}
            >
              "{verse.text}"
            </h2>

            <p className="mt-4 text-xs sm:text-sm uppercase tracking-widest opacity-90 font-medium">
              {verse.reference}
            </p>
          </div>
        </div>

        {/* Linha de compartilhamento em redes específicas */}
        <div className="px-6 py-4 text-center border-b border-stone-100 bg-stone-50/40">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">
            Compartilhar nas Redes
          </p>
          <div className="flex justify-center gap-5">
            {/* WhatsApp */}
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`"${verse.text}" — ${verse.reference}\n\nCompartilhado via ARAi`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-green-50 text-green-600 hover:bg-green-100 hover:scale-105 active:scale-95 rounded-full transition-all flex items-center justify-center cursor-pointer"
              title="Compartilhar no WhatsApp"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.705 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
              </svg>
            </a>

            {/* Instagram */}
            <button
              onClick={shareInstagram}
              className="p-3 bg-pink-50 text-pink-600 hover:bg-pink-100 hover:scale-105 active:scale-95 rounded-full transition-all flex items-center justify-center cursor-pointer"
              title="Salvar e Compartilhar no Instagram"
            >
              <Instagram className="w-5 h-5" />
            </button>

            {/* X */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`"${verse.text}" — ${verse.reference} #ARAi`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-stone-50 text-stone-900 hover:bg-stone-100 hover:scale-105 active:scale-95 rounded-full transition-all flex items-center justify-center cursor-pointer"
              title="Compartilhar no X"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            {/* Download */}
            <button
              onClick={downloadImage}
              className="p-3 bg-stone-50 text-stone-900 hover:bg-stone-100 hover:scale-105 active:scale-95 rounded-full transition-all flex items-center justify-center cursor-pointer"
              title="Baixar imagem do versículo"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 flex justify-between items-center bg-stone-50/80">
          <button
            onClick={copyText}
            className="p-2.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-full transition-all flex items-center justify-center cursor-pointer"
            title="Copiar Texto"
          >
            {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
          </button>

          {onNavigate && (
            <button
              onClick={() => onNavigate(verse.book || 'sl', verse.chapter || 23, verse.verse || 1)}
              className="px-5 py-2.5 bg-stone-900 text-stone-50 hover:bg-stone-800 active:scale-95 rounded-full text-xs font-bold uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 shadow-sm hover:shadow"
            >
              <BookOpen className="w-4 h-4" />
              Continuar Leitura
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="p-2.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-full transition-all flex items-center justify-center cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Elegant HUD Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 56 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 56 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-stone-950/95 text-stone-100 text-[11px] font-bold px-6 py-3 rounded-full shadow-2xl z-[120] uppercase tracking-wider font-sans border border-stone-800/80 backdrop-blur-md flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};