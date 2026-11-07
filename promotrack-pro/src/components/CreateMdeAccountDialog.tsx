import React, { useState } from 'react';
import { KeyRound, ShieldCheck, UserPlus } from 'lucide-react';
import { AccountModalShell } from './AccountModalShell';
import { AccountAvatar } from './AccountAvatar';
import { dataService } from '../services/dataService';
import { manageMdeAccount } from '../services/adminAccounts';
import type { Language, UserProfile } from '../types';

export function CreateMdeAccountDialog({language,initial,onClose,onSaved}:{language:Language;initial?:{name:string;email:string;mde:string};onClose:()=>void;onSaved:()=>Promise<void>}) {
  const lao=language==='lo';
  const [form,setForm]=useState({name:initial?.name||'',email:initial?.email||'',mde:initial?.mde||'',password:'',avatar:''});
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const mdes=dataService.getSalesReps().slice().sort((a,b)=>a.fullName.localeCompare(b.fullName));
  return <AccountModalShell title={lao?'ສ້າງບັນຊີ MDE':'Create MDE account'} description={lao?'Admin ກຳນົດບັນຊີ ແລະ ລະຫັດຜ່ານ':'Admin-managed sign-in and outlet access'} icon={UserPlus} language={language} onClose={onClose} busy={busy}>
    <form className="account-form" onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');try{await manageMdeAccount({operation:'create',email:form.email.trim(),name:form.name.trim(),password:form.password,mde_id:form.mde,avatar_url:form.avatar||undefined});setForm(current=>({...current,password:''}));await onSaved();onClose();}catch(cause){setError(cause instanceof Error?cause.message:'Could not create account');}finally{setBusy(false);}}}>
      <div className="account-edit-avatar"><AccountAvatar name={form.name||'MDE'} url={form.avatar} large/><label>{lao?'ຮູບ MDE':'MDE photo'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event=>{const file=event.target.files?.[0];if(!file)return;if(file.size>5*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){setError(lao?'ໃຊ້ PNG/JPEG/WebP ບໍ່ເກີນ 5 MB':'Use PNG/JPEG/WebP up to 5 MB');return;}const reader=new FileReader();reader.onload=()=>setForm(current=>({...current,avatar:String(reader.result)}));reader.readAsDataURL(file);}}/></label></div>
      <label>{lao?'ຊື່ MDE':'MDE name'}<input required maxLength={120} disabled={busy} value={form.name} onChange={event=>setForm({...form,name:event.target.value})}/></label>
      <label>{lao?'ອີເມວສຳລັບລັອກອິນ':'Sign-in email'}<input type="email" autoComplete="off" required disabled={busy} value={form.email} onChange={event=>setForm({...form,email:event.target.value})}/></label>
      <label>{lao?'ລະຫັດຜ່ານທີ່ Admin ກຳນົດ':'Password set by Admin'}<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={busy} value={form.password} onChange={event=>setForm({...form,password:event.target.value})}/></label>
      <label>{lao?'ກຸ່ມຮ້ານ B1–B7':'Outlet group B1–B7'}<select aria-label={lao?'ກຸ່ມຮ້ານ B1–B7':'Outlet group B1–B7'} required disabled={busy} value={form.mde} onChange={event=>setForm({...form,mde:event.target.value})}><option value="">{lao?'ເລືອກ MDE':'Select MDE'}</option>{mdes.map(mde=><option value={mde.id} key={mde.id}>{mde.fullName}</option>)}</select></label>
      <p className="account-form-note"><ShieldCheck size={16}/>{lao?'ຜູ້ໃຊ້ເຂົ້າລະບົບດ້ວຍອີເມວ ແລະ ລະຫັດຜ່ານທີ່ Admin ແຈ້ງໃຫ້. ເຫັນສະເພາະຮ້ານຂອງກຸ່ມທີ່ມອບໝາຍ.':'The colleague signs in with the email and password provided by Admin and sees only the assigned outlet group.'}</p>
      {error&&<p role="alert" className="account-message account-message-error">{error}</p>}
      <div className="account-modal-actions"><button type="button" className="account-button account-button-secondary" disabled={busy} onClick={onClose}>{lao?'ຍົກເລີກ':'Cancel'}</button><button className="account-button account-button-primary" disabled={busy}>{busy?(lao?'ກຳລັງສ້າງ…':'Creating…'):(lao?'ສ້າງບັນຊີ':'Create account')}</button></div>
    </form>
  </AccountModalShell>;
}

export function MdePasswordDialog({user,language,onClose}:{user:UserProfile;language:Language;onClose:()=>void}) {
  const lao=language==='lo';
  const [password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  return <AccountModalShell title={lao?'ກຳນົດລະຫັດຜ່ານ MDE':'Set MDE password'} description={user.email} icon={KeyRound} language={language} onClose={onClose} busy={busy}>
    {saved?<><p role="status" className="account-message account-message-success">{lao?'ປ່ຽນລະຫັດຜ່ານສຳເລັດ':'Password updated'}</p><button className="account-button account-button-secondary" onClick={onClose}>{lao?'ປິດ':'Close'}</button></>:<form className="account-form" onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');try{await manageMdeAccount({operation:'password',user_id:user.id,password});setPassword('');setSaved(true);}catch(cause){setError(cause instanceof Error?cause.message:'Could not update password');}finally{setBusy(false);}}}><label>{lao?'ລະຫັດຜ່ານໃໝ່ (8 ຕົວຂຶ້ນໄປ)':'New password (at least 8 characters)'}<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} disabled={busy} value={password} onChange={event=>setPassword(event.target.value)}/></label>{error&&<p role="alert" className="account-message account-message-error">{error}</p>}<div className="account-modal-actions"><button type="button" className="account-button account-button-secondary" disabled={busy} onClick={onClose}>{lao?'ຍົກເລີກ':'Cancel'}</button><button className="account-button account-button-primary" disabled={busy}>{busy?(lao?'ກຳລັງບັນທຶກ…':'Saving…'):(lao?'ບັນທຶກ':'Save password')}</button></div></form>}
  </AccountModalShell>;
}
