import React, { useState } from 'react';
import { LogOut, Mail, ShieldCheck, Store, UserRound } from 'lucide-react';
import type { Language, UserProfile } from '../types';
import { avatarFor } from '../utils/avatar';
import { dataService } from '../services/dataService';
import { AccountAvatar } from './AccountAvatar';
import { AccountModalShell } from './AccountModalShell';
import { PWAInstallCard } from './PWAInstallCard';

export function AccountDialog({user,language,onClose,onSignOut}:{user:UserProfile;language:Language;onClose:()=>void;onSignOut:()=>void|Promise<void>}) {
  const lao=language==='lo';
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[viewPhoto,setViewPhoto]=useState(false);
  const mde=dataService.getSalesReps().find(item=>item.id===user.mdeId);
  return <AccountModalShell title={viewPhoto?(lao?'ຮູບໂປຣໄຟລ໌':'Profile photo'):(lao?'ບັນຊີຂອງທ່ານ':'Your account')} description={viewPhoto?user.fullName:'Super MDE'} icon={UserRound} language={language} onClose={()=>{if(viewPhoto)setViewPhoto(false);else onClose();}} busy={busy}>
    {viewPhoto?<><img src={user.avatarUrl} alt={lao?`ຮູບເຕັມ: ${user.fullName}`:`Full profile photo: ${user.fullName}`} className="account-full-photo" onError={event=>{const fallback=avatarFor({fullName:user.fullName});if(event.currentTarget.src!==fallback)event.currentTarget.src=fallback;}}/><div className="account-modal-actions"><button type="button" className="account-button account-button-secondary" onClick={()=>setViewPhoto(false)}>{lao?'ກັບຄືນ':'Back'}</button></div></>:<>
    <div className="account-profile-hero">{user.avatarUrl?<button type="button" className="account-photo-button" disabled={busy} onClick={()=>setViewPhoto(true)} aria-label={lao?'ເບິ່ງຮູບເຕັມ':'View full photo'}><AccountAvatar name={user.fullName} url={user.avatarUrl} large/><span>{lao?'ເບິ່ງຮູບເຕັມ':'View full photo'}</span></button>:<AccountAvatar name={user.fullName} large/>}<h3>{user.fullName}</h3><span className={`account-pill ${user.role==='admin'?'account-pill-violet':'account-pill-mint'}`}><ShieldCheck size={13}/>{user.role==='admin'?'Admin':(lao?'ພະນັກງານຂາຍ':'Sales')}</span></div>
    <dl className="account-profile-details"><div><Mail size={18}/><div><dt>{lao?'ອີເມວ':'Email'}</dt><dd>{user.email}</dd></div></div><div><Store size={18}/><div><dt>{lao?'ສິດເບິ່ງຮ້ານຄ້າ':'Outlet access'}</dt><dd>{user.role==='admin'?(lao?'ຮ້ານຄ້າທັງໝົດ':'All outlets'):mde?.fullName||(lao?'ຍັງບໍ່ມອບໝາຍ MDE':'MDE not assigned')}</dd></div></div></dl>
    <PWAInstallCard language={language} compact/>
    {error&&<p role="alert" className="account-message account-message-error">{error}</p>}
    <div className="account-modal-actions"><button type="button" className="account-button account-button-secondary" disabled={busy} onClick={onClose}>{lao?'ປິດ':'Close'}</button><button type="button" className="account-button account-button-danger" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await onSignOut();}catch(cause){setError(cause instanceof Error?cause.message:'Sign out failed.');}finally{setBusy(false);}}}><LogOut size={17}/>{busy?(lao?'ກຳລັງອອກ…':'Signing out…'):(lao?'ອອກຈາກລະບົບ':'Sign out')}</button></div>
    </>}
  </AccountModalShell>;
}
