import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, type LucideIcon } from 'lucide-react';
import type { Language } from '../types';

export function AccountModalShell({title,description,icon:Icon,language,onClose,busy=false,danger=false,children}:{
  title:string;description?:string;icon:LucideIcon;language:Language;onClose:()=>void;busy?:boolean;danger?:boolean;children:React.ReactNode;
}) {
  const titleId=useId(),descriptionId=useId();
  const panel=useRef<HTMLElement>(null);
  const latest=useRef({onClose,busy});latest.current={onClose,busy};
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const firstField=panel.current?.querySelector<HTMLElement>('input:not([disabled]):not([readonly]),select:not([disabled])');
    (firstField||panel.current?.querySelector<HTMLElement>('[data-modal-close]'))?.focus();
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'&&!latest.current.busy){event.preventDefault();latest.current.onClose();}
      if(event.key!=='Tab')return;
      const controls=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')||[]);
      const first=controls[0],last=controls[controls.length-1];
      if(!first)return;
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',keydown);
    return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',keydown);if(previous?.isConnected)previous.focus();};
  },[]);
  const close=()=>{if(!latest.current.busy)latest.current.onClose();};
  return createPortal(<div className="account-modal-backdrop" onPointerDown={event=>{if(event.target===event.currentTarget)close();}}>
    <section ref={panel} role={danger?'alertdialog':'dialog'} aria-modal="true" aria-labelledby={titleId} aria-describedby={description?descriptionId:undefined} className={`account-modal ${danger?'account-modal-danger':''}`}>
      <header className="account-modal-header"><span className="account-modal-icon"><Icon size={21}/></span><div className="min-w-0"><h2 id={titleId}>{title}</h2>{description&&<p id={descriptionId}>{description}</p>}</div><button type="button" data-modal-close disabled={busy} className="account-close" aria-label={language==='lo'?'ປິດໜ້າຕ່າງ':'Close dialog'} onClick={close}><X size={19}/></button></header>
      <div className="account-modal-body">{children}</div>
    </section>
  </div>,document.body);
}
