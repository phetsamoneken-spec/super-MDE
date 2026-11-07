import { avatarFor } from '../utils/avatar';
import React from 'react';
import {
  LayoutDashboard,
  Store,
  Tag,
  CheckSquare,
  FileSpreadsheet,
  Database,
  Users,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Settings,
  X,
  PackagePlus
} from 'lucide-react';
import { UserProfile, Language } from '../types';
import { translations } from '../i18n/translations';
import { motion } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

export type NavTab = 'dashboard' | 'stores' | 'tasks' | 'promotions' | 'newProducts' | 'tracking' | 'excel' | 'dbReview' | 'more' | 'users';

interface SidebarProps {
  connected?: boolean;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: UserProfile;
  language: Language;
  overdueTasksCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenSwitchUser: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  connected,
  currentTab,
  onSelectTab,
  currentUser,
  language,
  overdueTasksCount,
  isOpenMobile,
  onCloseMobile,
  onOpenSwitchUser
}) => {
  const t = translations[language];

  const navItems = [
    { id: 'dashboard' as NavTab, label: language === 'lo' ? 'ໜ້າຫຼັກ (Home)' : 'Home Dashboard', icon: LayoutDashboard },
    { id: 'stores' as NavTab, label: t.navStores, icon: Store },
    {
      id: 'tasks' as NavTab,
      label: t.navTasks,
      icon: CheckSquare,
      badge: overdueTasksCount > 0 ? overdueTasksCount : undefined
    },
    { id: 'promotions' as NavTab, label: t.navPromotions, icon: Tag },
    {
      id: 'newProducts' as NavTab,
      label: language === 'lo' ? 'ຕິດຕາມສິນຄ້າໃໝ່' : 'New Products',
      icon: PackagePlus,
      badge: 'NPD'
    },
    { id: 'tracking' as NavTab, label: t.navTracking, icon: TrendingUp },
    {
      id: 'users' as NavTab,
      label: language === 'lo' ? 'ຈັດການຜູ້ໃຊ້' : 'User Management',
      icon: Users,
      badge: currentUser.role === 'admin' ? 'Admin' : undefined
    },
    { id: 'excel' as NavTab, label: t.navExcel, icon: FileSpreadsheet },
    { id: 'more' as NavTab, label: language === 'lo' ? 'ຕັ້ງຄ່າ' : 'Settings', icon: Settings }
  ];

  const handleSelect = (id: NavTab) => {
    triggerHaptic('light');
    onSelectTab(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-15 sm:top-16 bottom-0 left-0 z-40 w-64 calm-surface p-4 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-1">
          {/* Mobile close button */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-border)] lg:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {language === 'lo' ? 'ເມນູນຳທາງ' : 'Navigation'}
            </span>
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition group ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white shadow-xs'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition ${isActive ? 'text-white' : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)]'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-white text-[var(--color-primary-dark)]'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Bottom Current User Card with switch role shortcut */}
        <div className="pt-3 border-t border-[var(--color-border)]">
          <div className="p-3 rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
            <div className="flex items-center gap-2.5">
              <img
                src={avatarFor(currentUser)}
                alt={currentUser.fullName}
                className="w-9 h-9 rounded-xl object-cover ring-2 ring-[var(--color-primary)]"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                  {currentUser.fullName}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                    currentUser.role === 'admin'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  }`}>
                    {currentUser.role === 'admin' ? 'Admin' : 'Sales Rep'}
                  </span>
                </div>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                triggerHaptic('light');
                onOpenSwitchUser();
              }}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold text-[var(--color-primary)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] transition shadow-2xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{connected ? (language === 'lo' ? 'ບັນຊີ' : 'Account') : t.switchAccount}</span>
            </motion.button>
          </div>
        </div>
      </aside>
    </>
  );
};
