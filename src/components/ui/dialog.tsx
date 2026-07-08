'use client';

import * as React from 'react';
import { twMerge } from 'tailwind-merge';
import { X } from 'lucide-react';
import { Button } from './button';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Dialog({ isOpen, onClose, title, children }: DialogProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl transition-all duration-200 dark:shadow-slate-950/50">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 overflow-y-auto max-h-[70vh]">{children}</div>
      </div>
    </div>
  );
}
