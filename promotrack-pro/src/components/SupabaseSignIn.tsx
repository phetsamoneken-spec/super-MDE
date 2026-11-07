import React, { useState } from 'react';
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
  return <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)] text-[var(--color-text-primary)]">
    <section className="calm-card w-full max-w-md rounded-3xl p-6 space-y-5">
      <h1 className="text-2xl font-black">PromoTrack</h1>
      <h2 className="font-bold">{register ? (lao ? 'ສ້າງບັນຊີ' : 'Create account') : (lao ? 'ເຂົ້າລະບົບ' : 'Sign in')}</h2>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">{lao ? 'ອີເມວ' : 'Email'}<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-[var(--color-border)] p-3" /></label>
        <label className="block text-sm">{lao ? 'ລະຫັດຜ່ານ' : 'Password'}<input type="password" minLength={8} autoComplete={register ? 'new-password' : 'current-password'} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-[var(--color-border)] p-3" /></label>
        {error && <p role="alert" className="text-sm text-[var(--color-error)]">{error}</p>}
        {notice && <p role="status" className="text-sm text-[var(--color-primary)]">{notice}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-[var(--color-primary)] p-3 text-white font-bold disabled:opacity-50">{busy ? (lao ? 'ກຳລັງດຳເນີນການ…' : 'Please wait…') : register ? (lao ? 'ສ້າງບັນຊີ' : 'Create account') : (lao ? 'ເຂົ້າລະບົບ' : 'Sign in')}</button>
      </form>
      <button type="button" onClick={() => { setRegister(!register); setError(''); setNotice(''); }} className="text-sm underline text-[var(--color-primary)]">{register ? (lao ? 'ມີບັນຊີແລ້ວ? ເຂົ້າລະບົບ' : 'Already registered? Sign in') : (lao ? 'ຍັງບໍ່ມີບັນຊີ? ສ້າງບັນຊີ' : 'New here? Create account')}</button>
    </section>
  </main>;
}
