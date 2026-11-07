import React, { useEffect, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import type { Language } from '../types';

export function CampaignImage({ src, alt, language, className = '', contain = false }: { src?: string; alt: string; language: Language; className?: string; contain?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return <div className={`overflow-hidden bg-[var(--color-surface-secondary)] ${className}`}>
    {src && !failed ? <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`w-full h-full ${contain ? 'object-contain' : 'object-cover'}`} /> :
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2 text-[var(--color-text-secondary)]" role="img" aria-label={`${alt}: ${language === 'lo' ? 'ຍັງບໍ່ມີຮູບ' : 'No image available'}`}><ImageIcon className="w-6 h-6 opacity-50"/><span className="text-[10px] text-center">{language === 'lo' ? 'ຍັງບໍ່ມີຮູບ' : 'No image available'}</span></div>}
  </div>;
}
