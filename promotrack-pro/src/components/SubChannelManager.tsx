import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Language, SubChannel } from '../types';
import { dataService } from '../services/dataService';

interface Props {
  language: Language;
  onClose: () => void;
  onRefreshData: () => void;
}

export function SubChannelManager({ language, onClose, onRefreshData }: Props) {
  const lao = language === 'lo';
  const channels = dataService.getChannels();
  const [name, setName] = useState('');
  const [channelId, setChannelId] = useState(channels[0]?.id || '');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState<SubChannel | null>(null);
  const [, refresh] = useState(0);
  if (dataService.getCurrentUser().role !== 'admin') return null;

  const messages: Record<string, string> = {
    name_required: lao ? 'ກະລຸນາປ້ອນຊື່ Sub-channel' : 'Enter a Sub-channel name.',
    channel_required: lao ? 'ກະລຸນາເລືອກ Channel' : 'Choose a channel.',
    duplicate_name: lao ? 'ມີຊື່ນີ້ໃນ Channel ນີ້ແລ້ວ' : 'This name already exists in this channel.',
    in_use: lao ? 'ຍັງລົບບໍ່ໄດ້: ກະລຸນາປ່ຽນ Sub-channel ຂອງຮ້ານຄ້າ ແລະ ເອົາອອກຈາກເປົ້າໝາຍໂປຣໂມຊັ່ນ/ສິນຄ້າກ່ອນ.' : 'Still in use: reassign its stores and remove it from promotion/product targets before deleting.',
    admin_only: lao ? 'ສະເພາະ Admin ເທົ່ານັ້ນ' : 'Administrator access required.',
    not_found: lao ? 'ບໍ່ພົບ Sub-channel' : 'Sub-channel not found.'
  };
  const changed = () => { refresh((value) => value + 1); onRefreshData(); };
  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const result = dataService.addSubChannel({ name, channelId });
    setError(result.success ? '' : messages[result.error!] || result.error!);
    setNotice('');
    if (result.success) { setName(''); setNotice(lao ? 'ເພີ່ມ Sub-channel ສຳເລັດ' : 'Sub-channel added.'); changed(); }
  };
  const remove = () => {
    if (!deleting) return;
    const result = dataService.deleteSubChannel(deleting.id);
    setError(result.success ? '' : messages[result.error!] || result.error!);
    setNotice('');
    if (result.success) { setDeleting(null); setNotice(lao ? 'ລົບ Sub-channel ສຳເລັດ' : 'Sub-channel deleted.'); changed(); }
  };
  const usage = deleting ? dataService.getSubChannelUsage(deleting.id) : null;
  const field = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-sm';
  const button = 'rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-bold';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-2 sm:p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="sub-channel-title" onKeyDown={(event) => {
        if (event.key === 'Escape') { event.stopPropagation(); if (deleting) { setDeleting(null); setError(''); } else onClose(); }
      }} className="calm-card w-full max-w-lg rounded-3xl p-5 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="sub-channel-title" className="text-lg font-bold">{lao ? 'ຈັດການ Sub-channel' : 'Manage Sub-channels'}</h2>
          <button type="button" onClick={onClose} aria-label={lao ? 'ປິດ' : 'Close'} className={button}><X className="w-4 h-4" /></button>
        </div>
        {error && !deleting && <p role="alert" className="text-sm text-[var(--color-error)]">{error}</p>}
        {notice && <p role="status" className="text-sm text-[var(--color-primary)]">{notice}</p>}
        <form onSubmit={add} className="space-y-3">
          <label className="block text-xs font-bold">Channel
            <select value={channelId} onChange={(event) => setChannelId(event.target.value)} className={field} required>
              {channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold">{lao ? 'ຊື່ Sub-channel' : 'Sub-channel name'}
            <input value={name} onChange={(event) => setName(event.target.value)} className={field} required maxLength={100} autoFocus />
          </label>
          <button type="submit" className={`${button} flex items-center gap-2 bg-[var(--color-primary)] text-white`}><Plus className="w-4 h-4" />{lao ? 'ເພີ່ມ Sub-channel' : 'Add Sub-channel'}</button>
        </form>
        <ul className="divide-y divide-[var(--color-border)]">
          {dataService.getSubChannels().map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0"><p className="text-sm font-bold break-words">{item.name}</p><p className="text-xs text-[var(--color-text-secondary)]">{channels.find((channel) => channel.id === item.channelId)?.name}</p></div>
              <button type="button" className={`${button} shrink-0 text-[var(--color-error)]`} aria-label={`${lao ? 'ລົບ' : 'Delete'} ${item.name}`} onClick={() => { setDeleting(item); setError(''); setNotice(''); }}><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
        {deleting && usage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-sub-channel-title" className="calm-card w-full max-w-md rounded-2xl p-4 space-y-3">
            <h3 id="delete-sub-channel-title" className="font-bold">{lao ? 'ລົບ Sub-channel' : 'Delete Sub-channel'}: {deleting.name}?</h3>
            <p className="text-xs">{lao ? 'ກຳລັງໃຊ້ໂດຍ' : 'Used by'}: {usage.stores} {lao ? 'ຮ້ານຄ້າ' : 'stores'}, {usage.promotions} {lao ? 'ໂປຣໂມຊັ່ນ' : 'promotions'}, {usage.products} {lao ? 'ສິນຄ້າ' : 'products'}.</p>
            {error && <p role="alert" className="text-sm text-[var(--color-error)]">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={button} autoFocus onClick={() => { setDeleting(null); setError(''); }}>{lao ? 'ຍົກເລີກ' : 'Cancel'}</button>
              <button type="button" className={`${button} text-[var(--color-error)]`} onClick={remove}>{lao ? 'ຢືນຢັນລົບ' : 'Confirm Delete'}</button>
            </div>
          </section>
          </div>
        )}
      </section>
    </div>
  );
}
