import React, { useEffect, useRef, useState } from 'react';
import { CalendarCheck, Pencil, Trash2 } from 'lucide-react';
import type { Language, Store, UserProfile } from '../types';
import type { OutletVisit } from '../types/coverage';
import { outletVisits } from '../services/outletVisits';
import { AccountModalShell } from './AccountModalShell';

export function OutletVisitHistory({store,user,mdes,language,onClose,onChanged}:{store:Store;user:UserProfile;mdes:UserProfile[];language:Language;onClose:()=>void;onChanged:()=>void}) {
  const lao=language==='lo';
  const [rows,setRows]=useState<OutletVisit[]>([]),[page,setPage]=useState(0),[more,setMore]=useState(false);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false);
  const [editing,setEditing]=useState<string>(),[note,setNote]=useState(''),[deleting,setDeleting]=useState<string>();
  useEffect(()=>{
    const controller=new AbortController();let active=true;setLoading(true);setError('');const timeout=window.setTimeout(()=>controller.abort(),20000);
    outletVisits.history(store.id,0,controller.signal).then(next=>{if(active){setRows(next);setPage(0);setMore(next.length===20);}})
      .catch(cause=>{if(active)setError(cause.message);}).finally(()=>{window.clearTimeout(timeout);if(active)setLoading(false);});
    return()=>{active=false;window.clearTimeout(timeout);controller.abort();};
  },[store.id,user.id,user.mdeId,revision]);
  const closeButton=useRef<HTMLButtonElement>(null);
  const reload=()=>setRevision(value=>value+1);
  const change=async(action:()=>Promise<unknown>)=>{
    setBusy(true);setError('');try{await action();setEditing(undefined);setDeleting(undefined);reload();onChanged();requestAnimationFrame(()=>closeButton.current?.focus());}
    catch(cause){setError(cause instanceof Error?cause.message:'Could not save this visit.');}finally{setBusy(false);}
  };
  return <AccountModalShell title={lao?'ປະຫວັດຢ້ຽມຢາມ':'Visit history'} description={`${store.storeCode} · ${store.storeName}`} icon={CalendarCheck} language={language} onClose={onClose} busy={busy}>
    {error&&<div role="alert" className="account-message account-message-error">{error}<button type="button" onClick={reload} disabled={busy} className="underline ml-2">{lao?'ລອງໃໝ່':'Retry'}</button></div>}
    {loading?<p role="status">{lao?'ກຳລັງໂຫຼດ…':'Loading…'}</p>:<>
      {!rows.length&&!error&&<p className="coverage-muted">{lao?'ຍັງບໍ່ມີປະຫວັດຢ້ຽມຢາມ':'No visits have been recorded.'}</p>}
      <div className="coverage-history-list">{rows.map(visit=>{
        const mine=user.role==='sales'&&visit.visitedBy===user.id&&visit.mdeId===user.mdeId;
        return <article key={visit.id} className="coverage-history-item">
          <div className="coverage-history-heading"><strong>{visit.visitedOn}</strong><span>{mdes.find(mde=>mde.id===visit.mdeId)?.fullName||store.mdeName||'MDE'}</span></div>
          <p className="coverage-note">{visit.note||(lao?'ບໍ່ມີໝາຍເຫດ':'No note')}</p>
          {mine&&<div className="coverage-history-actions"><button type="button" disabled={busy} onClick={()=>{setEditing(visit.id);setNote(visit.note);setDeleting(undefined);}}><Pencil size={14}/>{lao?'ແກ້ໝາຍເຫດ':'Edit note'}</button><button type="button" disabled={busy} onClick={()=>{setDeleting(visit.id);setEditing(undefined);}}><Trash2 size={14}/>{lao?'ລົບບັນທຶກ':'Delete visit'}</button></div>}
          {editing===visit.id&&<form className="account-form coverage-visit-form" onSubmit={event=>{event.preventDefault();void change(()=>outletVisits.update(visit,note));}}>
            <label>{lao?'ໝາຍເຫດ':'Note'}<textarea autoFocus aria-label={lao?'ໝາຍເຫດ':'Note'} value={note} maxLength={2000} onChange={event=>setNote(event.target.value)} disabled={busy} rows={3}/></label>
            <div className="coverage-history-actions"><button type="button" disabled={busy} onClick={()=>{setEditing(undefined);closeButton.current?.focus();}}>{lao?'ຍົກເລີກ':'Cancel'}</button><button type="submit" disabled={busy} className="coverage-primary">{busy?(lao?'ກຳລັງບັນທຶກ…':'Saving…'):(lao?'ບັນທຶກ':'Save note')}</button></div>
          </form>}
          {deleting===visit.id&&<div className="coverage-delete-confirm" role="group" aria-label={lao?'ຢືນຢັນລົບການຢ້ຽມຢາມ':'Confirm visit deletion'}><p>{lao?'ລົບບັນທຶກການຢ້ຽມຢາມວັນນີ້? ຕົວເລກ Coverage ຈະຖືກຄຳນວນໃໝ່.':'Delete this visit? Coverage will be recalculated.'}</p><div className="coverage-history-actions"><button type="button" disabled={busy} onClick={()=>{setDeleting(undefined);closeButton.current?.focus();}}>{lao?'ຍົກເລີກ':'Cancel'}</button><button type="button" disabled={busy} className="account-button-danger" onClick={()=>void change(()=>outletVisits.remove(visit))}>{lao?'ຢືນຢັນລົບ':'Confirm delete'}</button></div></div>}
        </article>;
      })}</div>
      {more&&<button type="button" className="account-button account-button-secondary" disabled={busy} onClick={async()=>{
        setBusy(true);setError('');try{const next=await outletVisits.history(store.id,page+1);setRows(previous=>[...new Map([...previous,...next].map(row=>[row.id,row])).values()]);setPage(value=>value+1);setMore(next.length===20);}catch(cause){setError(cause instanceof Error?cause.message:'Could not load visits.');}finally{setBusy(false);}
      }}>{busy?(lao?'ກຳລັງໂຫຼດ…':'Loading…'):(lao?'ເບິ່ງເພີ່ມ':'Load more visits')}</button>}
    </>}
    <div className="account-modal-actions"><button type="button" ref={closeButton} className="account-button account-button-secondary" disabled={busy} onClick={onClose}>{lao?'ປິດ':'Close'}</button></div>
  </AccountModalShell>;
}
