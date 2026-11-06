import React, { useState } from 'react';
import {
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import { UserProfile, Language } from '../types';
import { dataService } from '../services/dataService';
import { motion } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

import { BrandLogo } from './BrandLogo';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  language: Language;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  language
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const branding = dataService.getAppBranding();
  const allUsers = dataService.getAllUsers();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      // Find matching demo user or match by email
      const matched = allUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (matched) {
        triggerHaptic('success');
        dataService.setCurrentUser(matched);
        onLoginSuccess(matched);
      } else {
        triggerHaptic('warning');
        setErrorMessage(
          language === 'lo'
            ? 'ບໍ່ພົບອີເມວນີ້ໃນລະບົບ ກະລຸນາເລືອກບັນຊີທົດລອງດ້ານລຸ່ມ'
            : 'Email not found. Please choose one of the demo accounts below to sign in.'
        );
      }
      setIsLoading(false);
    }, 600);
  };

  const selectDemoPersona = (user: UserProfile) => {
    triggerHaptic('medium');
    setEmail(user.email);
    setPassword('demo-pass-2026');
    setErrorMessage('');
    dataService.setCurrentUser(user);
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Brand Icon & Title */}
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            className="flex justify-center"
          >
            <BrandLogo branding={branding} size="xl" />
          </motion.div>

          <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
            {branding.appName}
          </h2>

          <p className="text-xs text-[var(--color-text-secondary)] font-medium">
            {branding.tagline || (language === 'lo'
              ? 'ລະບົບຕິດຕາມໂປຣໂມຊັ່ນ ແລະ ລາຍການວຽກຮ້ານຄ້າ'
              : 'Promotion Tracking & Retail Store Execution')}
          </p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-6 calm-card p-6 rounded-3xl"
        >
          <div className="mb-4">
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              {language === 'lo' ? 'ເຂົ້າສູ່ລະບົບ' : 'Sign In'}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {language === 'lo' ? 'ປ້ອນຂໍ້ມູນປະຈຳຕົວເພື່ອເລີ່ມຕົ້ນ' : 'Enter your credentials to continue'}
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                {language === 'lo' ? 'ອີເມວ' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@promotrack.la"
                  className="w-full text-xs pl-10 pr-3 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                {language === 'lo' ? 'ລະຫັດຜ່ານ' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-10 pr-10 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.96 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{language === 'lo' ? 'ເຂົ້າສູ່ລະບົບ' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Quick Demo Personas */}
          <div className="mt-6 pt-5 border-t border-[var(--color-border)] space-y-2">
            <span className="text-[11px] font-bold text-[var(--color-text-secondary)] block text-center">
              {language === 'lo' ? 'ຫຼື ເລືອກບັນຊີທົດລອງ (1-Click Login):' : 'Or sign in with a demo persona:'}
            </span>

            <div className="grid grid-cols-2 gap-2">
              {allUsers.map((user) => (
                <motion.button
                  key={user.id}
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={() => selectDemoPersona(user)}
                  className="p-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-left hover:border-[var(--color-primary)] transition"
                >
                  <div className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                    {user.fullName.split(' ')[0]}
                  </div>
                  <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded mt-0.5 ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 'Sales Rep'}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Security badge footer */}
        <div className="mt-6 text-center flex items-center justify-center gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <span>Protected with Supabase PostgreSQL & Row Level Security</span>
        </div>

      </div>
    </div>
  );
};
