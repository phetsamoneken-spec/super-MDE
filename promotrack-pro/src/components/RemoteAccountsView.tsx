import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, KeyRound, Mail, Pencil, Plus, Search, ShieldCheck, Store, Trash2, UserPlus, Users, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { dataService } from '../services/dataService';
import type { Language, UserProfile } from '../types';
import { CreateMdeAccountDialog, MdePasswordDialog } from './CreateMdeAccountDialog';
import { AccountAvatar } from './AccountAvatar';
import { AccountModalShell } from './AccountModalShell';

type PendingAccess={email:string;full_name:string;mde_id:string};
const message=(cause:unknown)=>cause instanceof Error?cause.message:'Please try again.';

export function RemoteAccountsView({currentUser,language,onRefresh}:{currentUser:UserProfile;language:Language;onRefresh:()=>Promise<void>}) {
  const lao=language==='lo';
  const [editing,setEditing]=useState<UserProfile|null>(null);
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<'all'|'registered'|'pending'>('all');
  const [adding,setAdding]=useState(false);
  const [creating,setCreating]=useState(false);
  const [passwordUser,setPasswordUser]=useState<UserProfile|null>(null);
  const [editingPending,setEditingPending]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [pendingDelete,setPendingDelete]=useState<string|null>(null);
  const [deleting,setDeleting]=useState<UserProfile|null>(null);
  const [pending,setPending]=useState<PendingAccess[]>([]);
  const [loadingPending,setLoadingPending]=useState(true);
  const [newUser,setNewUser]=useState({email:'',name:'',mde:''});

  const loadPending=async()=>{
    setLoadingPending(true);
    try {
      const {data,error}=await supabase.from('app_user_assignments').select('email,full_name,mde_id').is('claimed_at',null).order('created_at');
      if(error)throw new Error(error.message);
      setPending(data||[]);
    }finally{setLoadingPending(false);}
  };
  useEffect(()=>{if(currentUser.role==='admin')void loadPending().catch(cause=>setError(message(cause)));},[currentUser.id,currentUser.role]);
  if(currentUser.role!=='admin')return <p>{lao?'ສະເພາະ Admin':'Administrator access required.'}</p>;

  const profiles=dataService.getAccountProfiles().slice().sort((a,b)=>Number(b.id===currentUser.id)-Number(a.id===currentUser.id)||a.fullName.localeCompare(b.fullName));
  const mdes=dataService.getSalesReps().slice().sort((a,b)=>a.fullName.localeCompare(b.fullName));
  const mdeName=(id?:string)=>mdes.find(item=>item.id===id)?.fullName;
  const matches=(values:(string|undefined)[])=>values.some(value=>value?.toLowerCase().includes(query.trim().toLowerCase()));
  const registeredRows=filter==='pending'?[]:profiles.filter(user=>matches([user.fullName,user.email,user.phone,mdeName(user.mdeId)]));
  const pendingRows=filter==='registered'?[]:pending.filter(user=>matches([user.full_name,user.email,mdeName(user.mde_id)]));
  const openAdd=()=>{setEditingPending(false);setNewUser({email:'',name:'',mde:''});setCreating(true);setError('');setNotice('');};
  const anyModal=creating||!!passwordUser||adding||!!editing||!!deleting||!!pendingDelete;

  return <section className="accounts-page">
    <header className="accounts-heading"><div className="accounts-heading-copy"><span className="accounts-heading-icon"><Users size={24}/></span><div><p className="accounts-eyebrow">{lao?'ທີມງານຂອງທ່ານ':'TEAM WORKSPACE'}</p><h2>{lao?'ຈັດການຜູ້ໃຊ້':'User Management'}</h2></div></div><button type="button" className="account-button account-button-primary" onClick={openAdd}><Plus size={18}/>{lao?'ເພີ່ມ User':'Add user'}</button></header>
    <p className="accounts-subtitle">{lao?'ຈັດການບັນຊີ ແລະ ມອບໝາຍສິດເບິ່ງຮ້ານຕາມ B1–B7.':'Manage your team and assign outlet access by B1–B7.'}</p>
    <div className="accounts-stats"><div className="accounts-stat accounts-stat-violet"><Users size={19}/><strong>{profiles.length}</strong><span>{lao?'ບັນຊີໃນແອັບ':'Registered accounts'}</span></div><div className="accounts-stat accounts-stat-amber"><Clock3 size={19}/><strong>{loadingPending?'—':pending.length}</strong><span>{lao?'ລໍຖ້າສະໝັກ/ຢືນຢັນ':'Awaiting registration'}</span></div><div className="accounts-stat accounts-stat-mint"><Store size={19}/><strong>{mdes.length}</strong><span>{lao?'ກຸ່ມຮ້ານ MDE':'MDE outlet groups'}</span></div></div>
    {notice&&<p role="status" className="account-message account-message-success"><CheckCircle2 size={17}/>{notice}</p>}
    {error&&!anyModal&&<p role="alert" className="account-message account-message-error">{error}</p>}
    <div className="accounts-toolbar"><div className="accounts-search"><Search size={18}/><input aria-label={lao?'ຄົ້ນຫາຜູ້ໃຊ້':'Search users'} placeholder={lao?'ຄົ້ນຫາຊື່, ອີເມວ ຫຼື B1–B7':'Search name, email, phone or B1–B7'} value={query} onChange={event=>setQuery(event.target.value)}/>{query&&<button type="button" aria-label={lao?'ລ້າງການຄົ້ນຫາ':'Clear search'} onClick={()=>setQuery('')}><X size={16}/></button>}</div><div className="accounts-tabs" role="group" aria-label={lao?'ສະຖານະຜູ້ໃຊ້':'Account status'}>{(['all','registered','pending'] as const).map(value=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value==='all'?(lao?'ທັງໝົດ':'All'):value==='registered'?(lao?'ບັນຊີໃນແອັບ':'Registered'):(lao?'ລໍຖ້າ':'Pending')}</button>)}</div></div>
    <div className="accounts-directory-heading"><h3>{lao?'ລາຍຊື່ທີມງານ':'Team directory'}</h3><span>{registeredRows.length+pendingRows.length} {lao?'ລາຍການ':'shown'}</span></div>
    <div className="accounts-directory">
      {registeredRows.map(profile=><article key={profile.id} className="accounts-row"><AccountAvatar name={profile.fullName} url={profile.avatarUrl}/><div className="accounts-row-identity"><div className="accounts-name-line"><h3>{profile.fullName}</h3>{profile.id===currentUser.id&&<span className="account-pill account-pill-neutral">{lao?'ທ່ານ':'You'}</span>}</div><p className="accounts-email"><Mail size={13}/><span>{profile.email}</span></p><div className="accounts-row-meta"><span className={`account-pill ${profile.role==='admin'?'account-pill-violet':'account-pill-mint'}`}><ShieldCheck size={12}/>{profile.role==='admin'?'Admin':'Sales'}</span><span className="accounts-scope"><Store size={12}/>{profile.role==='admin'?(lao?'ທຸກຮ້ານຄ້າ':'All outlets'):mdeName(profile.mdeId)||(lao?'ຍັງບໍ່ມອບໝາຍ':'Unassigned')}</span>{profile.phone&&<span className="accounts-scope">{profile.phone}</span>}</div></div><div className="accounts-row-actions"><button type="button" className="account-button account-button-secondary" onClick={()=>{setEditing({...profile});setError('');}}><Pencil size={15}/>{lao?'ແກ້ໄຂ':'Edit'}</button>{profile.role==='sales'&&<button type="button" className="account-button account-button-secondary" aria-label={lao?'ກຳນົດລະຫັດຜ່ານ':'Set password'} onClick={()=>setPasswordUser(profile)}><KeyRound size={15}/></button>}{profile.id!==currentUser.id&&<button type="button" className="account-button account-button-delete" onClick={()=>{setDeleting(profile);setError('');}}><Trash2 size={15}/>{lao?'ລົບ':'Delete'}</button>}</div></article>)}
      {pendingRows.map(item=><article key={item.email} className="accounts-row accounts-row-pending"><AccountAvatar name={item.full_name}/><div className="accounts-row-identity"><div className="accounts-name-line"><h3>{item.full_name}</h3><span className="account-pill account-pill-amber"><Clock3 size={12}/>{lao?'ລໍຖ້າຢືນຢັນ':'Pending'}</span></div><p className="accounts-email"><Mail size={13}/><span>{item.email}</span></p><div className="accounts-row-meta"><span className="accounts-scope"><Store size={12}/>{mdeName(item.mde_id)}</span><span className="accounts-pending-note">{lao?'ລໍຖ້າສະໝັກ/ຢືນຢັນອີເມວ':'Awaiting registration / email verification'}</span></div></div><div className="accounts-row-actions"><button type="button" className="account-button account-button-secondary" onClick={()=>{setNewUser({email:item.email,name:item.full_name,mde:item.mde_id});setCreating(true);}}><UserPlus size={15}/>{lao?'ສ້າງບັນຊີ':'Create login'}</button><button type="button" className="account-button account-button-secondary" onClick={()=>{setNewUser({email:item.email,name:item.full_name,mde:item.mde_id});setEditingPending(true);setAdding(true);setError('');}}><Pencil size={15}/>{lao?'ແກ້ໄຂ':'Edit'}</button><button type="button" className="account-button account-button-delete" onClick={()=>{setPendingDelete(item.email);setError('');}}><Trash2 size={15}/>{lao?'ລົບ':'Delete'}</button></div></article>)}
      {!registeredRows.length&&!pendingRows.length&&<div className="accounts-empty"><Users size={30}/><p>{loadingPending?(lao?'ກຳລັງໂຫຼດ…':'Loading…'):(lao?'ບໍ່ພົບຜູ້ໃຊ້ທີ່ກົງກັບການຄົ້ນຫາ':'No users match this search')}</p>{query&&<button type="button" className="account-button account-button-secondary" onClick={()=>setQuery('')}>{lao?'ລ້າງການຄົ້ນຫາ':'Clear search'}</button>}</div>}
    </div>
    <aside className="accounts-access-note"><ShieldCheck size={21}/><p>{lao?'Admin ສ້າງບັນຊີ MDE, ກຳນົດລະຫັດຜ່ານ ແລະ ມອບໝາຍ B1–B7. ຜູ້ໃຊ້ເຂົ້າເບິ່ງສະເພາະຮ້ານຂອງຕົນ.':'Admin creates MDE sign-ins, sets passwords and assigns B1–B7 outlet access.'}</p></aside>

    {creating&&<CreateMdeAccountDialog language={language} initial={newUser} onClose={()=>setCreating(false)} onSaved={async()=>{await onRefresh();await loadPending();setNotice(lao?'ສ້າງບັນຊີ MDE ສຳເລັດ':'MDE account created. The colleague can sign in now.');}}/>}
    {passwordUser&&<MdePasswordDialog user={passwordUser} language={language} onClose={()=>setPasswordUser(null)}/>}
    {adding&&<AccountModalShell title={lao?'ເພີ່ມ User / ມອບໝາຍ B1–B7':'Add user / assign B1–B7'} description={editingPending?(lao?'ແກ້ໄຂສິດທີ່ກຽມໄວ້':'Edit prepared access'):(lao?'ກຽມສິດໃຫ້ສະມາຊິກໃໝ່':'Prepare access for a colleague')} icon={UserPlus} language={language} onClose={()=>setAdding(false)} busy={busy}>
      <form className="account-form" onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');try{const {data,error}=await supabase.rpc('admin_assign_user',{user_email:newUser.email.trim(),user_name:newUser.name.trim(),assigned_mde:newUser.mde});if(error)throw new Error(error.message);await onRefresh();await loadPending();setAdding(false);setNewUser({email:'',name:'',mde:''});setNotice(data==='assigned'?(lao?'ມອບໝາຍໃຫ້ບັນຊີທີ່ຢືນຢັນແລ້ວສຳເລັດ.':'Assigned to the verified account.'):(lao?'ບັນທຶກສິດແລ້ວ. ໃຫ້ຜູ້ໃຊ້ສະໝັກ ແລະ ຢືນຢັນອີເມວຂອງຕົນ.':'Access prepared. The user must register and verify their email.'));}catch(cause){setError(message(cause));}finally{setBusy(false);}}}>
        <label>{lao?'ຊື່ຜູ້ໃຊ້':'Full name'}<input required disabled={busy} value={newUser.name} onChange={event=>setNewUser({...newUser,name:event.target.value})}/></label>
        <label>{lao?'ອີເມວ':'Email'}<input type="email" required disabled={busy} readOnly={editingPending} value={newUser.email} onChange={event=>setNewUser({...newUser,email:event.target.value})}/></label>
        <label>{lao?'ເລືອກກຸ່ມຮ້ານ B1–B7':'Outlet group B1–B7'}<select aria-label={lao?'ເລືອກກຸ່ມຮ້ານ B1–B7':'Outlet group B1–B7'} required disabled={busy} value={newUser.mde} onChange={event=>setNewUser({...newUser,mde:event.target.value})}><option value="">{lao?'ເລືອກ MDE':'Select MDE'}</option>{mdes.map(item=><option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label>
        <p className="account-form-note"><ShieldCheck size={16}/>{lao?'ຜູ້ໃຊ້ຕັ້ງລະຫັດຜ່ານໃນໜ້າສະໝັກດ້ວຍຕົນເອງ. ຂັ້ນຕອນນີ້ບັນທຶກສິດເຂົ້າໃຊ້ ແລະ ບໍ່ສົ່ງອີເມວ.':'Users choose their own password during registration. This prepares access and sends no email.'}</p>
        {error&&<p role="alert" className="account-message account-message-error">{error}</p>}
        <div className="account-modal-actions"><button type="button" className="account-button account-button-secondary" disabled={busy} onClick={()=>setAdding(false)}>{lao?'ຍົກເລີກ':'Cancel'}</button><button className="account-button account-button-primary" disabled={busy}><UserPlus size={16}/>{busy?(lao?'ກຳລັງບັນທຶກ…':'Saving…'):(lao?'ບັນທຶກ User':'Save user')}</button></div>
      </form>
    </AccountModalShell>}
    {editing&&<AccountModalShell title={lao?'ແກ້ໄຂຜູ້ໃຊ້':'Edit user'} description={editing.email} icon={Pencil} language={language} onClose={()=>setEditing(null)}>
      <form className="account-form" onSubmit={event=>{event.preventDefault();const result=dataService.updateUser(editing.id,{fullName:editing.fullName.trim(),phone:editing.phone,avatarUrl:editing.avatarUrl,role:editing.role,mdeId:editing.role==='admin'?undefined:editing.mdeId||undefined});if(!result.success)setError(result.error||'Update failed.');else setEditing(null);}}>
        <div className="account-edit-avatar"><AccountAvatar name={editing.fullName} url={editing.avatarUrl} large/><label>{lao?'ຮູບໂປຣໄຟລ໌':'Profile photo'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>{const file=event.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){setError('Maximum image size: 5 MB');return;}const reader=new FileReader();reader.onload=()=>setEditing(current=>current?{...current,avatarUrl:String(reader.result)}:current);reader.readAsDataURL(file);}}/></label></div>
        <label>{lao?'ຊື່':'Name'}<input required value={editing.fullName} onChange={event=>setEditing({...editing,fullName:event.target.value})}/></label>
        <label>{lao?'ເບີໂທ':'Phone'}<input type="tel" value={editing.phone||''} onChange={event=>setEditing({...editing,phone:event.target.value})}/></label>
        <div className="account-form-columns"><label>{lao?'ສິດຜູ້ໃຊ້':'Role'}<select aria-label={lao?'ສິດຜູ້ໃຊ້':'Role'} disabled={editing.id===currentUser.id} value={editing.role} onChange={event=>setEditing({...editing,role:event.target.value as UserProfile['role']})}><option value="sales">Sales</option><option value="admin">Admin</option></select></label><label>MDE<select aria-label="MDE" disabled={editing.role==='admin'||editing.id===currentUser.id} value={editing.mdeId||''} onChange={event=>setEditing({...editing,mdeId:event.target.value||undefined})}><option value="">{lao?'ຍັງບໍ່ມອບໝາຍ':'Unassigned'}</option>{mdes.map(item=><option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label></div>
        {error&&<p role="alert" className="account-message account-message-error">{error}</p>}
        <div className="account-modal-actions"><button type="button" className="account-button account-button-secondary" onClick={()=>setEditing(null)}>{lao?'ຍົກເລີກ':'Cancel'}</button><button className="account-button account-button-primary"><CheckCircle2 size={16}/>{lao?'ບັນທຶກ':'Save'}</button></div>
      </form>
    </AccountModalShell>}
    {pendingDelete&&<AccountModalShell title={lao?'ລົບສິດທີ່ກຽມໄວ້?':'Remove pending access?'} icon={Trash2} language={language} onClose={()=>setPendingDelete(null)} busy={busy} danger><p className="account-delete-email">{pendingDelete}</p><p className="account-form-note">{lao?'ລົບການມອບໝາຍ B1–B7 ທີ່ຍັງລໍຖ້າສະໝັກ/ຢືນຢັນ.':'Removes this pending B1–B7 assignment.'}</p>{error&&<p role="alert" className="account-message account-message-error">{error}</p>}<div className="account-modal-actions"><button type="button" className="account-button account-button-secondary" disabled={busy} onClick={()=>setPendingDelete(null)}>{lao?'ຍົກເລີກ':'Cancel'}</button><button type="button" className="account-button account-button-danger" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const {error}=await supabase.from('app_user_assignments').delete().eq('email',pendingDelete).is('claimed_at',null);if(error)throw new Error(error.message);await loadPending();setPendingDelete(null);}catch(cause){setError(message(cause));}finally{setBusy(false);}}}><Trash2 size={16}/>{lao?'ຢືນຢັນລົບ':'Confirm delete'}</button></div></AccountModalShell>}
    {deleting&&<AccountModalShell title={lao?'ລົບໂປຣໄຟລ໌ຜູ້ໃຊ້?':'Delete app profile?'} icon={Trash2} language={language} onClose={()=>setDeleting(null)} danger><p className="account-delete-email">{deleting.email}</p><p className="account-form-note">{lao?'ລົບໂປຣໄຟລ໌ແອັບ ແລະ ສິດ MDE. ບັນຊີ Auth ຍັງຢູ່; ເຂົ້າໃໝ່ຈະເປັນຜູ້ໃຊ້ຍັງບໍ່ມອບໝາຍ. ຖ້າຕ້ອງການປິດບັນຊີ ໃຫ້ໃຊ້ Supabase Authentication.':'Removes the app profile and MDE assignment. The Auth account remains and can return as unassigned. To disable sign-in, use Supabase Authentication.'}</p>{error&&<p role="alert" className="account-message account-message-error">{error}</p>}<div className="account-modal-actions"><button type="button" className="account-button account-button-secondary" onClick={()=>setDeleting(null)}>{lao?'ຍົກເລີກ':'Cancel'}</button><button type="button" className="account-button account-button-danger" onClick={()=>{const result=dataService.deleteUser(deleting.id);if(result.success)setDeleting(null);else setError(result.error||'Delete failed.');}}><Trash2 size={16}/>{lao?'ຢືນຢັນລົບ':'Confirm delete'}</button></div></AccountModalShell>}
  </section>;
}
