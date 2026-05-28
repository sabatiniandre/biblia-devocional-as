import React from 'react';
import { cn } from '../lib/utils';

interface AuthorFooterProps {
  theme?: string;
  className?: string;
}

export function AuthorFooter({ theme = 'paper', className }: AuthorFooterProps) {
  return (
    <footer className={cn(
      "mt-12 py-8 border-t w-full text-center transition-colors duration-500",
      theme === 'dark' ? "border-stone-800" : "border-stone-200",
      className
    )}>
      <a 
        href="https://payhip.com/andresabatini" 
        target="_blank" 
        rel="noopener noreferrer"
        className={cn(
          "transition-colors text-sm font-medium inline-flex items-center justify-center gap-2",
          theme === 'dark' ? "text-stone-500 hover:text-stone-300" : "text-stone-500 hover:text-stone-800"
        )}
      >
        Veja os livros do autor
      </a>
    </footer>
  );
}
