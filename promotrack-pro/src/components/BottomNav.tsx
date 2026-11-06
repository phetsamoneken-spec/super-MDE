import React from 'react';
import {
  LayoutDashboard,
  Store,
  CheckSquare,
  Tag,
  MoreHorizontal
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { motion } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  language: Language;
  overdueTasksCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  language,
  overdueTasksCount
}) => {
  const t = translations[language];

  // Exactly the 5 requested tabs for the 2026 Android PWA layout
  const items = [
    { id: 'dashboard' as NavTab, label: language === 'lo' ? 'ໜ້າຫຼັກ' : 'Home', icon: LayoutDashboard },
    { id: 'stores' as NavTab, label: language === 'lo' ? 'ຮ້ານຄ້າ' : 'Stores', icon: Store },
    {
      id: 'tasks' as NavTab,
      label: language === 'lo' ? 'ລາຍການວຽກ' : 'Tasks',
      icon: CheckSquare,
      badge: overdueTasksCount > 0 ? overdueTasksCount : undefined
    },
    { id: 'promotions' as NavTab, label: language === 'lo' ? 'ໂປຣໂມຊັ່ນ' : 'Promos', icon: Tag },
    { id: 'more' as NavTab, label: language === 'lo' ? 'ອື່ນໆ' : 'More', icon: MoreHorizontal }
  ];

  const handleTabClick = (tabId: NavTab) => {
    triggerHaptic('light');
    onSelectTab(tabId);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-3xl shadow-xl shadow-black/10 dark:shadow-black/50 mb-2 px-1.5 py-1.5 flex items-center justify-between">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.82 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              onClick={() => handleTabClick(item.id)}
              className={`relative min-w-[54px] min-h-[48px] py-1.5 px-1 flex-1 flex flex-col items-center justify-center gap-1 rounded-2xl transition-colors ${
                isActive
                  ? 'text-[var(--color-primary)] font-bold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {/* Active animated pill background */}
              {isActive && (
                <motion.div
                  layoutId="calmBottomNavPill"
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  className="absolute inset-0 bg-[var(--color-surface-secondary)] rounded-2xl -z-10 border border-[var(--color-border)]"
                />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-[var(--color-primary)]' : ''}`} />
                {item.badge !== undefined && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-2.5 min-w-[15px] h-3.5 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center"
                  >
                    {item.badge}
                  </motion.span>
                )}
              </div>

              <span className="text-[10px] tracking-tight leading-none truncate max-w-[56px]">
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
