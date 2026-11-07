import React, { useState } from 'react';
import { LogOut, Mail, ShieldCheck, Store, UserRound } from 'lucide-react';
import type { Language, UserProfile } from '../types';
import { dataService } from '../services/dataService';
import { AccountAvatar } from './AccountAvatar';
import { AccountModalShell } from './AccountModalShell';

export function AccountDialog({user,language,onClose,onSignOut}:{user:UserProfile;language:Language;onClose:()=>void;onSignOut:()=>void|Promise<void>}) {
  const lao=language==='lo';
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const mde=dataService.getSalesReps().find(item=>item.id===user.mdeId);
  return <AccountModalShell title={lao?'ບັນຊີຂອງທ່ານ':'Your account'} description="Super MDE" icon={UserRound} language={language} onClose={onClose} busy={busy}>
    <div className="account-profile-hero"><AccountAvatar name={user.fullName} url={user.avatarUrl} large/><h3>{user.fullName}</h3><span className={`account-pill ${user.role==='admin'?'account-pill-violet':'account-pill-mint'}`}><ShieldCheck size={13}/>{user.role==='admin'?'Admin':(lao?'ພະນັກງານຂາຍ':'Sales')}</span></div>
    <dl className="account-profile-details"><div><Mail size={18}/><div><dt>{lao?'ອີເມວ':'Email'}</dt><dd>{user.email}</dd></div></div><div><Store size={18}/><div><dt>{lao?'ສິດເບິ່ງຮ້ານຄ້າ':'Outlet access'}</dt><dd>{user.role==='admin'?(lao?'ຮ້ານຄ້າທັງໝົດ':'All outlets'):mde?.fullName||(lao?'ຍັງບໍ່ມອບໝາຍ MDE':'MDE not assigned')}</dd></div></div></dl>
    {error&&<p role="alert" className="account-message account-message-error">{error}</p>}
    <div className="account-modal-actions"><button type="button" className="account-button account-button-secondary" disabled={busy} onClick={onClose}>{lao?'ປິດ':'Close'}</button><button type="button" className="account-button account-button-danger" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await onSignOut();}catch(cause){setError(cause instanceof Error?cause.message:'Sign out failed.');}finally{setBusy(false);}}}><LogOut size={17}/>{busy?(lao?'ກຳລັງອອກ…':'Signing out…'):(lao?'ອອກຈາກລະບົບ':'Sign out')}</button></div>
  </AccountModalShell>;
}
