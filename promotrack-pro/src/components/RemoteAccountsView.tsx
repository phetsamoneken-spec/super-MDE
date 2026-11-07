import React, { useState } from 'react';
import { dataService } from '../services/dataService';
import type { Language, UserProfile } from '../types';

export function RemoteAccountsView({ currentUser, language }: { currentUser: UserProfile; language: Language }) {
  const lao = language === 'lo';
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<UserProfile | null>(null);
  if (currentUser.role !== 'admin') return <p>{lao ? 'ສະເພາະ Admin' : 'Administrator access required.'}</p>;
  return <section className="space-y-4">
    <h2 className="text-xl font-bold">{lao ? 'ຈັດການຜູ້ໃຊ້' : 'User Management'}</h2>
    <p className="text-sm text-[var(--color-text-secondary)]">{lao ? 'ຜູ້ໃຊ້ສ້າງບັນຊີ ແລະ ຢືນຢັນອີເມວກ່ອນ; ຈາກນັ້ນ Admin ຈຶ່ງມອບໝາຍ MDE ໃຫ້.' : 'Users register and verify their email first. Admin then assigns their MDE here.'}</p>
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
        <label className="block text-sm">MDE<select disabled={editing.role === 'admin' || editing.id === currentUser.id} value={editing.mdeId || ''} onChange={(event) => setEditing({ ...editing, mdeId: event.target.value || undefined })} className="w-full border border-[var(--color-border)] rounded-xl p-2.5"><option value="">{lao ? 'ຍັງບໍ່ມອບໝາຍ' : 'Unassigned'}</option>{dataService.getSalesReps().map((mde) => <option key={mde.id} value={mde.id}>{mde.fullName}</option>)}</select></label>
        {error && <p role="alert" className="text-sm text-[var(--color-error)]">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="p-2.5">{lao ? 'ຍົກເລີກ' : 'Cancel'}</button><button className="rounded-xl bg-[var(--color-primary)] text-white px-4 py-2.5">{lao ? 'ບັນທຶກ' : 'Save'}</button></div>
      </form>
    </section></div>}
  </section>;
}
