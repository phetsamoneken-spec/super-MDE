import React, { useState } from 'react';
import {
  User,
  Shield,
  FileSpreadsheet,
  Database,
  Globe,
  Moon,
  Sun,
  Download,
  LogOut,
  ChevronRight,
  HardDrive,
  Sparkles,
  Wifi,
  WifiOff,
  UserCheck,
  Palette,
  Users,
  Paintbrush,
  PackagePlus
} from 'lucide-react';
import { AppBranding, UserProfile, Language } from '../types';
import { NavTab } from './Sidebar';
import { translations } from '../i18n/translations';
import { motion } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface MoreScreenProps {
  currentUser: UserProfile;
  appBranding: AppBranding;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isDark: boolean;
  onThemeToggle: () => void;
  onOpenSwitchUser: () => void;
  onOpenDbReview: () => void;
  onOpenExcelCenter: () => void;
  onOpenBrandingModal: () => void;
  onOpenThemeColorModal: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onLogout: () => void;
}

export const MoreScreen: React.FC<MoreScreenProps> = ({
  currentUser,
  appBranding,
  language,
  onLanguageChange,
  isDark,
  onThemeToggle,
  onOpenSwitchUser,
  onOpenDbReview,
  onOpenExcelCenter,
  onOpenBrandingModal,
  onOpenThemeColorModal,
  onNavigateTab,
  onLogout
}) => {
  const t = translations[language];
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSModal, setShowIOSModal] = useState(false);

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      
      {/* Title */}
      <div>
        <h2 className="text-xl font-black text-[var(--color-text-primary)] tracking-tight">
          {language === 'lo' ? 'ເມນູເພີ່ມເຕີມ' : 'More Settings'}
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
          {language === 'lo' ? 'ຈັດການບັນຊີ, ນຳເຂົ້າຂໍ້ມູນ ແລະ ການຕັ້ງຄ່າ' : 'Account profile, tools, and app settings'}
        </p>
      </div>

      {/* User Profile Card */}
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          triggerHaptic('medium');
          onOpenSwitchUser();
        }}
        className="calm-card p-4 rounded-3xl cursor-pointer hover:border-[var(--color-primary)] transition flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.fullName}
            className="w-12 h-12 rounded-2xl object-cover ring-2 ring-[var(--color-primary)]"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                {currentUser.fullName}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                currentUser.role === 'admin'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {currentUser.role === 'admin' ? 'Admin' : 'Sales Rep'}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {currentUser.email} • {currentUser.phone}
            </p>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
      </motion.div>

      {/* Tools Section */}
      <div className="calm-card p-2 rounded-3xl divide-y divide-[var(--color-border)]">
        
        {/* App Branding & Logo Customization */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic('medium');
            onOpenBrandingModal();
          }}
          className="p-3.5 flex items-center justify-between cursor-pointer rounded-2xl hover:bg-[var(--color-surface-secondary)] transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-[var(--color-primary)] flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                {language === 'lo' ? 'ປັບແຕ່ງຊື່ແອັບ & ໂລໂກ້ (App Name & Logo)' : 'App Name & Logo Branding'}
              </h4>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                {appBranding.appName} • {language === 'lo' ? 'ປ່ຽນຊື່, ອັບໂຫຼດຮູບໂລໂກ້ ຫຼື ເລືອກສີ' : 'Change name, upload logo, or pick color'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </motion.div>

        {/* Theme Color Customizer */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic('medium');
            onOpenThemeColorModal();
          }}
          className="p-3.5 flex items-center justify-between cursor-pointer rounded-2xl hover:bg-[var(--color-surface-secondary)] transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Paintbrush className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                {language === 'lo' ? 'ປັບແຕ່ງສີແອັບ (Theme Color)' : 'Customize Theme Color'}
              </h4>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                {language === 'lo' ? '8 ໂທນສີມາດຕະຖານ Calm UI (Sage, Emerald, Blue, Rose...)' : 'Choose from 8 curated Calm UI palettes'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </motion.div>

        {/* User Management System (Admin Only) */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic('medium');
            onNavigateTab('users');
          }}
          className="p-3.5 flex items-center justify-between cursor-pointer rounded-2xl hover:bg-[var(--color-surface-secondary)] transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                  {language === 'lo' ? 'ລະບົບຈັດການຜູ້ໃຊ້ງານ' : 'User Management'}
                </h4>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  Admin Only
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                {language === 'lo' ? 'ເພີ່ມ, ລຶບ ແລະ ຈັດການຮູບໂປຣໄຟລ໌ຜູ້ໃຊ້' : 'Add, delete, and upload user profile photos'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </motion.div>

        {/* New Product Launch & Order Tracking */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic('light');
            onNavigateTab('newProducts');
          }}
          className="p-3.5 flex items-center justify-between cursor-pointer rounded-2xl hover:bg-[var(--color-surface-secondary)] transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-[var(--color-primary)] flex items-center justify-center">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                  {language === 'lo' ? 'ຕິດຕາມການສັ່ງຊື້ສິນຄ້າໃໝ່' : 'New Product Launches & Orders'}
                </h4>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Sub-Channel
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                {language === 'lo' ? 'ຕິດຕາມການກະຈາຍສິນຄ້າ, ລົງຕົວຢ່າງ ແລະ ການສັ່ງຊື້' : 'Track store distribution, sampling, and orders by Sub-Channel'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </motion.div>

        {/* Excel Import & Export Center */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic('light');
            onOpenExcelCenter();
          }}
          className="p-3.5 flex items-center justify-between cursor-pointer rounded-2xl hover:bg-[var(--color-surface-secondary)] transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-[var(--color-primary)] flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                {language === 'lo' ? 'ສູນນຳເຂົ້າ & ສົ່ງອອກ Excel' : 'Excel Import & Export Center'}
              </h4>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                .xlsx, .xls, .csv batch upload & custom reporting
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </motion.div>

        {/* Supabase Architecture Review */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic('light');
            onOpenDbReview();
          }}
          className="p-3.5 flex items-center justify-between cursor-pointer rounded-2xl hover:bg-[var(--color-surface-secondary)] transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                {language === 'lo' ? 'ກວດສອບຖານຂໍ້ມູນ Supabase & RLS' : 'Supabase Architecture & Security'}
              </h4>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                Inspect Phase 2 PostgreSQL migrations & policies
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </motion.div>

        {/* Switch Persona */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic('light');
            onOpenSwitchUser();
          }}
          className="p-3.5 flex items-center justify-between cursor-pointer rounded-2xl hover:bg-[var(--color-surface-secondary)] transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                {language === 'lo' ? 'ປ່ຽນບັນຊີທົດລອງ (Switch Persona)' : 'Switch User Role / Persona'}
              </h4>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                Test Admin vs Sales Rep RLS scoping
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </motion.div>

      </div>

      {/* Preferences Section */}
      <div className="calm-card p-2 rounded-3xl divide-y divide-[var(--color-border)]">
        
        {/* Language Switch */}
        <div className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-500/10 text-[var(--color-text-primary)] flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                {language === 'lo' ? 'ພາສາ (Language)' : 'Language'}
              </h4>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                {language === 'lo' ? 'ພາສາລາວ (Lao)' : 'English'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-[var(--color-surface-secondary)] p-1 rounded-xl">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                triggerHaptic('light');
                onLanguageChange('lo');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                language === 'lo'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              ລາວ
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                triggerHaptic('light');
                onLanguageChange('en');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                language === 'en'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              EN
            </motion.button>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                {language === 'lo' ? 'ໂໝດມືດ (Dark Mode)' : 'Appearance Theme'}
              </h4>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                {isDark ? 'Dark Mode' : 'Light Mode (Calm Sage)'}
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              triggerHaptic('light');
              onThemeToggle();
            }}
            className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-xs font-bold text-[var(--color-text-primary)]"
          >
            {isDark ? 'Switch to Light' : 'Switch to Dark'}
          </motion.button>
        </div>

        {/* PWA Install */}
        {!isInstalled && isInstallable && (
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-[var(--color-primary)] flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                  {t.installApp}
                </h4>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Install native-like Android PWA
                </p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                triggerHaptic('medium');
                install();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold shadow-xs"
            >
              Install
            </motion.button>
          </div>
        )}

      </div>

      {/* Network & Offline Status */}
      <div className="p-3 rounded-2xl bg-[var(--color-surface-secondary)] flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-emerald-600" />
          ) : (
            <WifiOff className="w-4 h-4 text-amber-600" />
          )}
          <span>{isOnline ? 'Online (Supabase Synced)' : 'Offline (Local Drafts Active)'}</span>
        </div>
        <span className="font-mono text-[10px]">v2026.1</span>
      </div>

      {/* Sign Out Button */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => {
          triggerHaptic('warning');
          onLogout();
        }}
        className="w-full py-3 rounded-2xl border border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 text-xs font-bold transition flex items-center justify-center gap-2 mt-2"
      >
        <LogOut className="w-4 h-4" />
        <span>{t.logout}</span>
      </motion.button>

    </div>
  );
};
