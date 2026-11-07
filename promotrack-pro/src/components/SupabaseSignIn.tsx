import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LockKeyhole, Sparkles } from 'lucide-react';
import { FieldIllustration } from './FieldIllustration';
import { supabase } from '../services/supabaseClient';
import type { Language } from '../types';

export function SupabaseSignIn({ language }: { language: Language }) {
  const lao = language === 'lo';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      if (register) {
        const result = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).href } });
        if (result.error) throw result.error;
        if (!result.data.session) setNotice(lao ? 'ກວດອີເມວເພື່ອຢືນຢັນບັນຊີ ແລ້ວກັບມາລັອກອິນ.' : 'Check your email to confirm the account, then return to sign in.');
      } else {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error;
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };
  return <main className="signin-page">
    <motion.section initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:0.45}} className="signin-shell">
      <div className="signin-story">
        <div className="signin-wordmark"><span><Sparkles size={20}/></span> PromoTrack <span className="signin-app-tag">FIELD APP</span></div>
        <FieldIllustration />
        <div className="signin-story-copy"><p className="eyebrow">{lao ? 'ທຸກຮ້ານຄ້າ. ທຸກໂອກາດ.' : 'EVERY OUTLET. EVERY OPPORTUNITY.'}</p>
        <h2>{lao ? 'ວຽກພາກສະໜາມ' : 'Your day in the field,'}<br/>{lao ? 'ທີ່ງ່າຍຂຶ້ນ.' : 'made simple.'}</h2>
        <p>{lao ? 'ຈັດການຮ້ານຄ້າ, ຕິດຕາມວຽກ ແລະ ໂປຣໂມຊັ່ນ ໃນບ່ອນດຽວ.' : 'Your outlets, follow-ups and promotions. Together in one place.'}</p></div>
      </div><div className="signin-form-panel space-y-5">
      <div className="signin-welcome"><span className="eyebrow">{lao ? 'ພ້ອມສຳລັບມື້ໃໝ່' : 'READY FOR A NEW DAY'}</span></div>
      <h1 className="text-2xl font-bold tracking-tight">{register ? (lao ? 'ສ້າງບັນຊີ' : 'Create account') : (lao ? 'ເຂົ້າລະບົບ' : 'Sign in')}</h1>
      <p className="text-sm text-[var(--color-text-secondary)]">{lao ? 'ຍິນດີຕ້ອນຮັບ. ເຂົ້າບັນຊີເພື່ອເລີ່ມວຽກຂອງທ່ານ.' : 'Welcome. Sign in to get your day moving.'}</p><form onSubmit={submit} className="space-y-4 signin-form">
        <label className="block text-sm">{lao ? 'ອີເມວ' : 'Email'}<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-[var(--color-border)] p-3" /></label>
        <label className="block text-sm">{lao ? 'ລະຫັດຜ່ານ' : 'Password'}<input type="password" minLength={8} autoComplete={register ? 'new-password' : 'current-password'} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-[var(--color-border)] p-3" /></label>
        {error && <p role="alert" className="text-sm text-[var(--color-error)]">{error}</p>}
        {notice && <p role="status" className="text-sm text-[var(--color-primary)]">{notice}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-[var(--color-primary)] p-3 text-white font-bold disabled:opacity-50">{busy ? (lao ? 'ກຳລັງດຳເນີນການ…' : 'Please wait…') : register ? (lao ? 'ສ້າງບັນຊີ' : 'Create account') : (lao ? 'ເຂົ້າລະບົບ' : 'Sign in')}</button>
      </form>
      <button type="button" onClick={() => { setRegister(!register); setError(''); setNotice(''); }} className="text-sm underline text-[var(--color-primary)]">{register ? (lao ? 'ມີບັນຊີແລ້ວ? ເຂົ້າລະບົບ' : 'Already registered? Sign in') : (lao ? 'ຍັງບໍ່ມີບັນຊີ? ສ້າງບັນຊີ' : 'New here? Create account')}</button>
    <div className="signin-security"><LockKeyhole size={13}/>{lao ? 'ບັນຊີສ່ວນຕົວຂອງທ່ານ' : 'Your personal workspace'}</div></div></motion.section>
  </main>;
}
