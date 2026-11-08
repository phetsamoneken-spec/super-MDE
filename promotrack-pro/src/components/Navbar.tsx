import { avatarFor } from '../utils/avatar';
import React, { useState } from 'react';
import {
  Menu,
  Moon,
  Sun,
  Globe,
  Database,
  UserCheck,
  Download,
  WifiOff,
  Sparkles,
  ChevronDown,
  Palette
} from 'lucide-react';
import { AppBranding, UserProfile, Language } from '../types';
import { translations } from '../i18n/translations';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { BrandLogo } from './BrandLogo';
import { motion } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface NavbarProps {
  currentUser: UserProfile;
  appBranding: AppBranding;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isDark: boolean;
  onThemeToggle: () => void;
  onToggleMobileMenu: () => void;
  onOpenSwitchUser: () => void;
  onOpenDbReview: () => void;
  onOpenBrandingModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  appBranding,
  language,
  onLanguageChange,
  isDark,
  onThemeToggle,
  onToggleMobileMenu,
  onOpenSwitchUser,
  onOpenDbReview,
  onOpenBrandingModal
}) => {
  const t = translations[language];
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSModal, setShowIOSModal] = useState(false);

  return (
    <>
      <header className="app-topbar sticky top-0 z-40 w-full bg-[var(--color-surface)] border-b-2 border-[var(--color-border)] shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
          
          {/* Left: Mobile hamburger & Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                triggerHaptic('light');
                onToggleMobileMenu();
              }}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition"
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </motion.button>

            <motion.div
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if(currentUser.role !== 'admin') return;
                triggerHaptic('light');
                onOpenBrandingModal();
              }}
              className="flex items-center gap-2 cursor-pointer group"
              title={currentUser.role==='admin'?(language === 'lo' ? 'ກົດເພື່ອປ່ຽນຊື່ແອັບ ແລະ ໂລໂກ້' : 'Click to customize app name & logo'):appBranding.appName}
            >
              <BrandLogo branding={appBranding} size="md" className="group-hover:scale-105 transition-transform" />
              <div>
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-[var(--color-text-primary)] flex items-center gap-1.5 leading-tight">
                  <span className="truncate max-w-[150px] sm:max-w-[220px]">{appBranding.appName}</span>
                  <span className="hidden sm:inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    PWA
                  </span>
                </h1>
                <p className="text-[10px] text-[var(--color-text-secondary)] hidden md:block truncate max-w-[240px]">
                  {appBranding.tagline}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right: Actions, Language, Theme, PWA Install, User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            
            {/* Offline status indicator */}
            {!isOnline && (
              <div className="flex items-center gap-1 px-2 py-0.8 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
                <WifiOff className="w-3 h-3 animate-pulse" />
                <span className="hidden sm:inline">Offline</span>
              </div>
            )}

            {/* PWA Install Button */}
            {!isInstalled && isInstallable && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                  triggerHaptic('medium');
                  install();
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{t.installApp}</span>
              </motion.button>
            )}

            {!isInstalled && isIOS && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                  triggerHaptic('light');
                  setShowIOSModal(true);
                }}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.installIOSGuide}</span>
              </motion.button>
            )}

            {currentUser.role === 'admin' && <>
            {/* App Branding & Logo Customization Shortcut */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                if(currentUser.role !== 'admin') return;
                triggerHaptic('light');
                onOpenBrandingModal();
              }}
              title={language === 'lo' ? 'ປັບແຕ່ງຊື່ແອັບ & ໂລໂກ້' : 'Customize App Name & Logo'}
              className="p-1.5 sm:p-2 rounded-xl text-[var(--color-primary)] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
            >
              <Palette className="w-4 h-4" />
            </motion.button>

            {/* Supabase Architecture Review shortcut */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                triggerHaptic('light');
                onOpenDbReview();
              }}
              title="View Supabase Schema & RLS Review"
              className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/40 transition"
            >
              <Database className="w-4 h-4" />
            </motion.button>

            </>}

            {/* Language Switcher */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                triggerHaptic('light');
                onLanguageChange(language === 'en' ? 'lo' : 'en');
              }}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition"
              title="Switch Language (ພາສາລາວ / English)"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'en' ? 'ລາວ' : 'EN'}</span>
            </motion.button>

            {/* Theme Toggle */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                triggerHaptic('light');
                onThemeToggle();
              }}
              className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </motion.button>

            {/* User Persona & Role Badge */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                triggerHaptic('medium');
                onOpenSwitchUser();
              }}
              className="flex items-center gap-1.5 sm:gap-2 p-1 sm:pl-1.5 sm:pr-2.5 sm:py-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 transition group text-left"
              title={language === 'lo' ? 'ບັນຊີຂອງທ່ານ' : 'Your account'}
            >
              <img
                src={avatarFor(currentUser)}
                alt={currentUser.fullName}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-500/50"
              />
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {currentUser.fullName.split(' ')[0]}
                </div>
                <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 leading-none">
                  {currentUser.role === 'admin' ? t.adminBadge : t.salesBadge}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
            </motion.button>

          </div>
        </div>
      </header>

      {/* iOS Safari Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl glass-panel p-6 shadow-2xl dark:bg-slate-900"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Install on iPhone / iPad (iOS Safari)
            </h3>
            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2 mb-4 list-decimal pl-4">
              <li>Tap the <strong className="text-slate-900 dark:text-white">Share</strong> icon at the bottom of Safari.</li>
              <li>Scroll down the actions list and tap <strong className="text-slate-900 dark:text-white">Add to Home Screen</strong>.</li>
              <li>Tap <strong className="text-slate-900 dark:text-white">Add</strong> in the top right corner.</li>
            </ol>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
            >
              Close
            </motion.button>
          </motion.div>
        </div>
      )}
    </>
  );
};
