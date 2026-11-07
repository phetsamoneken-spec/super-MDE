import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { dataService } from '../services/dataService';
import type { Language, UserProfile } from '../types';

export function RemoteAccountsView({ currentUser, language, onRefresh }: { currentUser: UserProfile; language: Language; onRefresh: () => Promise<void> }) {
  const lao = language === 'lo';
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [pending, setPending] = useState<{email:string;full_name:string;mde_id:string}[]>([]);
  const [newUser, setNewUser] = useState({email:'',name:'',mde:''});
  const loadPending = async () => {
    const {data,error} = await supabase.from('app_user_assignments').select('email,full_name,mde_id').is('claimed_at',null).order('created_at');
    if(error) setError(error.message); else setPending(data || []);
  };
  useEffect(() => { if(currentUser.role==='admin') void loadPending(); }, [currentUser.id, currentUser.role]);
  const [deleting, setDeleting] = useState<UserProfile | null>(null);
  if (currentUser.role !== 'admin') return <p>{lao ? 'ສະເພາະ Admin' : 'Administrator access required.'}</p>;
  return <section className="space-y-4">
    <div className="flex flex-wrap gap-3 items-center justify-between"><h2 className="text-xl font-bold">{lao ? 'ຈັດການຜູ້ໃຊ້' : 'User Management'}</h2><button className="rounded-xl bg-[var(--color-primary)] text-white px-4 py-3 font-bold" onClick={() => {setAdding(true);setError('');setNotice('');}}>{lao ? '+ ເພີ່ມ User' : '+ Add user'}</button></div>
    <p className="text-sm text-[var(--color-text-secondary)]">{lao ? 'Admin ເພີ່ມອີເມວ ແລະ ເລືອກ B1–B7. ຜູ້ໃຊ້ສະໝັກດ້ວຍອີເມວນັ້ນ ແລະ ຢືນຢັນອີເມວ ເພື່ອເຫັນສະເພາະຮ້ານຂອງຕົນ.' : 'Add an email and choose B1–B7. The user registers with that email and verifies it to access only their assigned outlets.'}</p>
    {notice && <p role="status" className="rounded-xl bg-[var(--color-surface-secondary)] p-3 text-sm">{notice}</p>}
    {error && !editing && !adding && <p role="alert">{error}</p>}
    {pending.map(item => <article key={item.email} className="calm-card rounded-2xl p-4 flex flex-wrap justify-between gap-3"><div><h3 className="font-bold">{item.full_name}</h3><p className="text-sm break-all">{item.email}</p><p className="text-xs">{dataService.getSalesReps().find(m => m.id===item.mde_id)?.fullName} · {lao ? 'ລໍຖ້າສະໝັກ/ຢືນຢັນອີເມວ' : 'Awaiting registration / verification'}</p></div><button className="rounded-xl border px-3 py-2" onClick={() => {setNewUser({email:item.email,name:item.full_name,mde:item.mde_id});setAdding(true);setError('');}}>{lao ? 'ແກ້ໄຂ' : 'Edit'}</button><button className="rounded-xl border px-3 py-2" onClick={()=>setPendingDelete(item.email)}>{lao ? 'ລົບ' : 'Delete'}</button></article>)}
    {pendingDelete && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><section role="alertdialog" aria-modal="true" className="calm-card rounded-3xl max-w-md p-5 space-y-4"><h3 className="font-bold">{lao ? 'ລົບສິດທີ່ກຽມໄວ້?' : 'Remove pending access?'}</h3><p className="break-all">{pendingDelete}</p><div className="flex gap-3"><button disabled={busy} onClick={()=>setPendingDelete(null)}>{lao ? 'ຍົກເລີກ' : 'Cancel'}</button><button disabled={busy} onClick={async()=>{setBusy(true);const {error}=await supabase.from('app_user_assignments').delete().eq('email',pendingDelete).is('claimed_at',null);if(error)setError(error.message);else {setPendingDelete(null);await loadPending();}setBusy(false);}}>{lao ? 'ຢືນຢັນລົບ' : 'Confirm delete'}</button></div>{error&&<p role="alert">{error}</p>}</section></div>}
    {adding && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><section role="dialog" aria-modal="true" aria-labelledby="add-user-title" className="calm-card rounded-3xl w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 space-y-4">
      <h3 id="add-user-title" className="font-bold">{lao ? 'ເພີ່ມ User / ມອບໝາຍ B1–B7' : 'Add user / assign B1–B7'}</h3>
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault();setBusy(true);setError('');
        try {
          const {data,error}=await supabase.rpc('admin_assign_user',{user_email:newUser.email.trim(),user_name:newUser.name.trim(),assigned_mde:newUser.mde});
          if(error) throw new Error(error.message);
          await onRefresh(); await loadPending();setAdding(false);setNewUser({email:'',name:'',mde:''});
          setNotice(data==='assigned' ? (lao ? 'ມອບໝາຍໃຫ້ບັນຊີທີ່ຢືນຢັນແລ້ວສຳເລັດ.' : 'Assigned to the verified account.') : (lao ? 'ບັນທຶກສິດແລ້ວ. ໃຫ້ຜູ້ໃຊ້ສະໝັກ ແລະ ຢືນຢັນອີເມວຂອງຕົນ.' : 'Access prepared. The user must register and verify their email.'));
        } catch(cause) {setError(cause instanceof Error ? cause.message : 'Could not save user.');} finally {setBusy(false);}
      }}>
        <label className="block text-sm">{lao ? 'ຊື່ຜູ້ໃຊ້' : 'Full name'}<input required value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})} className="w-full border rounded-xl p-3" /></label>
        <label className="block text-sm">{lao ? 'ອີເມວ' : 'Email'}<input type="email" required value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} className="w-full border rounded-xl p-3" /></label>
        <label className="block text-sm">{lao ? 'ເລືອກກຸ່ມຮ້ານ B1–B7' : 'Outlet group B1–B7'}<select aria-label={lao ? 'ເລືອກກຸ່ມຮ້ານ B1–B7' : 'Outlet group B1–B7'} required value={newUser.mde} onChange={e=>setNewUser({...newUser,mde:e.target.value})} className="w-full border rounded-xl p-3"><option value="">{lao ? 'ເລືອກ MDE' : 'Select MDE'}</option>{dataService.getSalesReps().slice().sort((a,b)=>a.fullName.localeCompare(b.fullName)).map(m=><option key={m.id} value={m.id}>{m.fullName}</option>)}</select></label>
        <p className="text-xs text-[var(--color-text-secondary)]">{lao ? 'ຜູ້ໃຊ້ຕັ້ງລະຫັດຜ່ານໃນໜ້າສະໝັກດ້ວຍຕົນເອງ. ຂັ້ນຕອນນີ້ບັນທຶກສິດເຂົ້າໃຊ້ ແລະ ບໍ່ສົ່ງອີເມວ.' : 'Users choose their own password during registration. This prepares access and sends no email.'}</p>
        {error && <p role="alert">{error}</p>}
        <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={()=>setAdding(false)}>{lao ? 'ຍົກເລີກ' : 'Cancel'}</button><button disabled={busy} className="rounded-xl bg-[var(--color-primary)] text-white px-4 py-3">{busy ? (lao ? 'ກຳລັງບັນທຶກ…' : 'Saving…') : (lao ? 'ບັນທຶກ User' : 'Save user')}</button></div>
      </form>
    </section></div>}
    <input aria-label={lao ? 'ຄົ້ນຫາຜູ້ໃຊ້' : 'Search users'} placeholder={lao ? 'ຄົ້ນຫາຊື່, ອີເມວ, ເບີໂທ' : 'Search name, email, phone'} value={query} onChange={e => setQuery(e.target.value)} className="w-full border rounded-xl p-3" />
    {dataService.getAccountProfiles().filter(p => [p.fullName,p.email,p.phone || ''].some(value => value.toLowerCase().includes(query.toLowerCase()))).map((profile) => <article key={profile.id} className="calm-card rounded-2xl p-4 flex items-center justify-between gap-3">
      <div className="min-w-0"><h3 className="font-bold break-words">{profile.fullName}</h3><p className="text-sm break-all">{profile.email}</p><p className="text-xs">{profile.role} · {dataService.getSalesReps().find((mde) => mde.id === profile.mdeId)?.fullName || '—'}</p></div>
      <div className="flex gap-2"><button className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" onClick={() => { setEditing({ ...profile }); setError(''); }}>{lao ? 'ແກ້ໄຂ' : 'Edit'}</button>{profile.id !== currentUser.id && <button className="rounded-xl border px-3 py-2 text-sm" onClick={() => setDeleting(profile)}>{lao ? 'ລົບ' : 'Delete'}</button>}</div>
    </article>)}
    {deleting && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><section role="alertdialog" aria-modal="true" className="calm-card rounded-3xl max-w-md p-5 space-y-4">
      <h3 className="font-bold">{lao ? 'ລົບໂປຣໄຟລ໌ຜູ້ໃຊ້?' : 'Delete app profile?'}</h3><p>{deleting.email}</p>
      <p className="text-sm">{lao ? 'ລົບໂປຣໄຟລ໌ແອັບ ແລະ ສິດ MDE. ບັນຊີ Auth ຍັງຢູ່; ເຂົ້າໃໝ່ຈະເປັນຜູ້ໃຊ້ຍັງບໍ່ມອບໝາຍ. ຖ້າຕ້ອງການປິດບັນຊີ ໃຫ້ໃຊ້ Supabase Authentication.' : 'Removes the app profile and MDE assignment. The Auth account remains and can return as unassigned. To disable sign-in, use Supabase Authentication.'}</p>
      <div className="flex gap-3"><button onClick={() => setDeleting(null)}>{lao ? 'ຍົກເລີກ' : 'Cancel'}</button><button onClick={() => { const result=dataService.deleteUser(deleting.id); if(result.success) setDeleting(null); else setError(result.error || 'Delete failed.'); }}>{lao ? 'ຢືນຢັນລົບ' : 'Confirm delete'}</button></div>{error && <p role="alert">{error}</p>}
    </section></div>}
    {editing && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><section role="dialog" aria-modal="true" aria-labelledby="account-edit-title" className="calm-card rounded-3xl w-full max-w-md p-5 space-y-4">
      <h3 id="account-edit-title" className="font-bold">{lao ? 'ແກ້ໄຂຜູ້ໃຊ້' : 'Edit user'}</h3>
      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault(); const result = dataService.updateUser(editing.id, { fullName: editing.fullName.trim(), phone: editing.phone, avatarUrl: editing.avatarUrl, role: editing.role, mdeId: editing.role === 'admin' ? undefined : editing.mdeId || undefined });
        if (!result.success) setError(result.error || 'Update failed.'); else setEditing(null);
      }}>
        <label className="block text-sm">{lao ? 'ຊື່' : 'Name'}<input required value={editing.fullName} onChange={(event) => setEditing({ ...editing, fullName: event.target.value })} className="w-full border border-[var(--color-border)] rounded-xl p-2.5" /></label>
        <label className="block text-sm">{lao ? 'ເບີໂທ' : 'Phone'}<input type="tel" value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone:e.target.value })} className="w-full border rounded-xl p-2.5" /></label>
        <label className="block text-sm">{lao ? 'ຮູບໂປຣໄຟລ໌' : 'Profile photo'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { const file=event.target.files?.[0]; if(!file) return; if(file.size>5*1024*1024){setError('Maximum image size: 5 MB');return;} const reader=new FileReader();reader.onload=()=>setEditing(current=>current ? {...current,avatarUrl:String(reader.result)} : current);reader.readAsDataURL(file); }} className="w-full p-2" /></label>
        <label className="block text-sm">{lao ? 'ສິດຜູ້ໃຊ້' : 'Role'}<select disabled={editing.id === currentUser.id} value={editing.role} onChange={(event) => setEditing({ ...editing, role: event.target.value as UserProfile['role'] })} className="w-full border border-[var(--color-border)] rounded-xl p-2.5"><option value="sales">Sales</option><option value="admin">Admin</option></select></label>
        <label className="block text-sm">MDE<select disabled={editing.role === 'admin' || editing.id === currentUser.id} value={editing.mdeId || ''} onChange={(event) => setEditing({ ...editing, mdeId: event.target.value || undefined })} className="w-full border border-[var(--color-border)] rounded-xl p-2.5"><option value="">{lao ? 'ຍັງບໍ່ມອບໝາຍ' : 'Unassigned'}</option>{dataService.getSalesReps().slice().sort((a,b)=>a.fullName.localeCompare(b.fullName)).map((mde) => <option key={mde.id} value={mde.id}>{mde.fullName}</option>)}</select></label>
        {error && <p role="alert" className="text-sm text-[var(--color-error)]">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="p-2.5">{lao ? 'ຍົກເລີກ' : 'Cancel'}</button><button className="rounded-xl bg-[var(--color-primary)] text-white px-4 py-2.5">{lao ? 'ບັນທຶກ' : 'Save'}</button></div>
      </form>
    </section></div>}
  </section>;
}
