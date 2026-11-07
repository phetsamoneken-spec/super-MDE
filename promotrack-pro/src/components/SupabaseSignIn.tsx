import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LockKeyhole } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { dataService } from '../services/dataService';
import { FieldIllustration } from './FieldIllustration';
import { supabase } from '../services/supabaseClient';
import type { Language } from '../types';

export function SupabaseSignIn({ language }: { language: Language }) {
  const lao = language === 'lo';
  const branding = dataService.getAppBranding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };
  return <main className="signin-page">
    <motion.section initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:0.45}} className="signin-shell">
      <div className="signin-story">
        <div className="signin-wordmark"><BrandLogo branding={branding} size="lg"/> {branding.appName} <span className="signin-app-tag">FIELD APP</span></div>
        <FieldIllustration />
        <div className="signin-story-copy"><p className="eyebrow">{lao ? 'ທຸກຮ້ານຄ້າ. ທຸກໂອກາດ.' : 'EVERY OUTLET. EVERY OPPORTUNITY.'}</p>
        <h2>{lao ? 'ວຽກພາກສະໜາມ' : 'Your day in the field,'}<br/>{lao ? 'ທີ່ງ່າຍຂຶ້ນ.' : 'made simple.'}</h2>
        <p>{lao ? 'ຈັດການຮ້ານຄ້າ, ຕິດຕາມວຽກ ແລະ ໂປຣໂມຊັ່ນ ໃນບ່ອນດຽວ.' : 'Your outlets, follow-ups and promotions. Together in one place.'}</p></div>
      </div><div className="signin-form-panel space-y-5">
      <div className="signin-welcome"><span className="eyebrow">{lao ? 'ພ້ອມສຳລັບມື້ໃໝ່' : 'READY FOR A NEW DAY'}</span></div>
      <h1 className="text-2xl font-bold tracking-tight">{lao ? 'ເຂົ້າລະບົບ' : 'Sign in'}</h1>
      <p className="text-sm text-[var(--color-text-secondary)]">{lao ? 'ຍິນດີຕ້ອນຮັບ. ເຂົ້າບັນຊີເພື່ອເລີ່ມວຽກຂອງທ່ານ.' : 'Welcome. Sign in to get your day moving.'}</p><form onSubmit={submit} className="space-y-4 signin-form">
        <label className="block text-sm">{lao ? 'ອີເມວ' : 'Email'}<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-[var(--color-border)] p-3" /></label>
        <label className="block text-sm">{lao ? 'ລະຫັດຜ່ານ' : 'Password'}<input type="password" minLength={8} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-[var(--color-border)] p-3" /></label>
        {error && <p role="alert" className="text-sm text-[var(--color-error)]">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-[var(--color-primary)] p-3 text-white font-bold disabled:opacity-50">{busy ? (lao ? 'ກຳລັງດຳເນີນການ…' : 'Please wait…') : (lao ? 'ເຂົ້າລະບົບ' : 'Sign in')}</button>
      </form>
    <p className="text-sm text-[var(--color-text-secondary)]">{lao?'ໃຊ້ອີເມວ ແລະ ລະຫັດຜ່ານທີ່ Admin ກຳນົດໃຫ້.':'Use the email and password provided by your Admin.'}</p><div className="signin-security"><LockKeyhole size={13}/>{lao ? 'ບັນຊີສ່ວນຕົວຂອງທ່ານ' : 'Your personal workspace'}</div></div></motion.section>
  </main>;
}
