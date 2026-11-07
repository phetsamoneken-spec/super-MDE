import { avatarFor } from '../utils/avatar';
import React, { useState, useMemo } from 'react';
import {
  Store as StoreIcon,
  CheckCircle2,
  Clock,
  Percent,
  Tag,
  AlertTriangle,
  Bell,
  ArrowRight,
  TrendingUp,
  Plus,
  Calendar,
  Layers,
  User,
  PackagePlus,
  ChevronRight,
  Edit2,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';
import { Store, Promotion, PromotionStore, FollowUpTask, UserProfile, Language } from '../types';
import { translations } from '../i18n/translations';
import { dataService } from '../services/dataService';
import { PromotionStoresDetailModal } from './PromotionStoresDetailModal';
import { EditPromotionModal } from './EditPromotionModal';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface DashboardViewProps {
  stores: Store[];
  promotions: Promotion[];
  promoStores: PromotionStore[];
  tasks: FollowUpTask[];
  salesReps: UserProfile[];
  currentUser: UserProfile;
  language: Language;
  onNavigateTab: (tab: 'dashboard' | 'stores' | 'tasks' | 'promotions' | 'newProducts' | 'tracking' | 'excel' | 'more') => void;
  onOpenNewTaskModal?: () => void;
  onOpenNewStoreModal?: () => void;
  onRefreshData?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stores,
  promotions,
  promoStores,
  tasks,
  salesReps,
  currentUser,
  language,
  onNavigateTab,
  onOpenNewTaskModal,
  onOpenNewStoreModal,
  onRefreshData
}) => {
  const t = translations[language];

  // Compact promotion selector for dashboard KPIs
  const [selectedPromoId, setSelectedPromoId] = useState<string>(
    promotions[0]?.id || 'all'
  );
  const [showNotifications, setShowNotifications] = useState(false);

  // Modal states for promotion stores detail & admin edit
  const [selectedPromoForDetail, setSelectedPromoForDetail] = useState<Promotion | null>(null);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  const storeMap = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const promoMap = useMemo(() => new Map(promotions.map((p) => [p.id, p])), [promotions]);

  // Filtered promo-stores for the selected promotion (or all)
  const activePromoStores = useMemo(() => {
    if (selectedPromoId === 'all') return promoStores;
    return promoStores.filter((ps) => ps.promotionId === selectedPromoId);
  }, [promoStores, selectedPromoId]);

  // Distinct stores
  const distinctParticipatingStores = useMemo(() => {
    return new Set(activePromoStores.map((ps) => ps.storeId));
  }, [activePromoStores]);

  const distinctOrderedStores = useMemo(() => {
    return new Set(
      activePromoStores.filter((ps) => ps.orderStatus === 'Ordered').map((ps) => ps.storeId)
    );
  }, [activePromoStores]);

  const distinctNotOrderedStores = useMemo(() => {
    return new Set(
      activePromoStores.filter((ps) => ps.orderStatus === 'Not Ordered').map((ps) => ps.storeId)
    );
  }, [activePromoStores]);

  const distinctFollowUpStores = useMemo(() => {
    return new Set(
      activePromoStores.filter((ps) => ps.orderStatus === 'Follow-up Required').map((ps) => ps.storeId)
    );
  }, [activePromoStores]);

  // 4 Primary KPI values as requested
  const totalStores = stores.length;
  const orderedStores = distinctOrderedStores.size;
  const notOrderedStores = distinctNotOrderedStores.size;
  const participatingCount = distinctParticipatingStores.size;
  const conversionRate = participatingCount > 0
    ? ((orderedStores / participatingCount) * 100).toFixed(1)
    : '0.0';

  // Date formatted
  const today = new Date();
  const dateFormatted = today.toLocaleDateString(language === 'lo' ? 'lo-LA' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // Today & Overdue tasks
  const nowTime = today.getTime();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const endOfToday = startOfToday + 86400000;

  const todayFollowUps = tasks.filter((t) => {
    const due = new Date(t.dueDate).getTime();
    return due >= startOfToday && due < endOfToday && t.taskStatus !== 'Completed';
  });

  const overdueTasks = tasks.filter((t) => {
    const due = new Date(t.dueDate).getTime();
    return due < startOfToday && t.taskStatus !== 'Completed' && t.taskStatus !== 'Cancelled';
  });

  const handleCardClick = (tab: any) => {
    triggerHaptic('medium');
    onNavigateTab(tab);
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">

      {/* 1. Header (Greeting, Date, Notification Icon, Avatar) */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          <img
            src={avatarFor(currentUser)}
            alt={currentUser.fullName}
            className="w-11 h-11 rounded-2xl object-cover ring-2 ring-[var(--color-primary)]"
          />
          <div>
            <h1 className="text-base font-black text-[var(--color-text-primary)] leading-tight">
              {language === 'lo' ? `ສະບາຍດີ, ${currentUser.fullName.split(' ')[0]}` : `Hello, ${currentUser.fullName.split(' ')[0]}`}
            </h1>
            <p className="text-[11px] text-[var(--color-text-secondary)] font-medium">
              {dateFormatted}
            </p>
          </div>
        </div>

        {/* Notification Bell with Overdue Badge */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => {
              triggerHaptic('light');
              setShowNotifications(!showNotifications);
            }}
            className="p-2.5 rounded-2xl calm-surface-secondary text-[var(--color-text-primary)] relative border border-[var(--color-border)]"
          >
            <Bell className="w-4 h-4" />
            {overdueTasks.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </motion.button>

          {/* Quick Notification Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                className="absolute right-0 mt-2 w-72 calm-card p-3 rounded-3xl shadow-xl z-50 text-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)] mb-2">
                  <span className="font-bold text-[var(--color-text-primary)]">
                    {language === 'lo' ? 'ແຈ້ງເຕືອນໜ້າວຽກ' : 'Task Notifications'}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-secondary)] font-bold">
                    {overdueTasks.length} {language === 'lo' ? 'ກາຍກຳນົດ' : 'overdue'}
                  </span>
                </div>

                {overdueTasks.length === 0 ? (
                  <p className="text-[11px] text-[var(--color-text-secondary)] text-center py-2">
                    {language === 'lo' ? 'ບໍ່ມີວຽກກາຍກຳນົດ' : 'No overdue tasks'}
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {overdueTasks.slice(0, 3).map((ot) => (
                      <div
                        key={ot.id}
                        onClick={() => {
                          setShowNotifications(false);
                          handleCardClick('tasks');
                        }}
                        className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] cursor-pointer"
                      >
                        <p className="font-bold text-[var(--color-text-primary)] truncate">{ot.taskTitle}</p>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400">
                          Due: {ot.dueDate.substring(0, 10)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Compact Promotion Selector */}
      <div className="calm-surface p-2 rounded-2xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 pl-2">
          <Tag className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
            {language === 'lo' ? 'ໂປຣໂມຊັ່ນ:' : 'Promo:'}
          </span>
        </div>

        <select
          value={selectedPromoId}
          onChange={(e) => {
            triggerHaptic('light');
            setSelectedPromoId(e.target.value);
          }}
          className="text-xs font-bold rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] border-none py-1.5 px-3 outline-none cursor-pointer max-w-[200px] truncate"
        >
          <option value="all">{language === 'lo' ? 'ທຸກໂປຣໂມຊັ່ນ (All)' : 'All Promotions'}</option>
          {promotions.map((p) => (
            <option key={p.id} value={p.id}>{p.promotionName}</option>
          ))}
        </select>
      </div>

      {/* 3. Two-Column KPI Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        
        {/* KPI 1: Total Stores */}
        <motion.div
          whileTap={{ scale: 0.96 }}
          onClick={() => handleCardClick('stores')}
          className="calm-card p-3.5 rounded-3xl cursor-pointer hover:border-[var(--color-primary)] transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
              {t.kpiTotalStores}
            </span>
            <div className="w-7 h-7 rounded-xl bg-[var(--color-surface-secondary)] flex items-center justify-center text-[var(--color-primary)]">
              <StoreIcon className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-2.5">
            <div className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
              {totalStores}
            </div>
            <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
              {language === 'lo' ? 'ຮ້ານຄ້າທັງໝົດ' : 'Total outlets'}
            </p>
          </div>
        </motion.div>

        {/* KPI 2: Ordered Stores */}
        <motion.div
          whileTap={{ scale: 0.96 }}
          onClick={() => handleCardClick('tracking')}
          className="calm-card p-3.5 rounded-3xl cursor-pointer hover:border-[var(--color-primary)] transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
              {t.kpiOrderedStores}
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[var(--color-success)]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-2.5">
            <div className="text-2xl font-black text-[var(--color-success)] tracking-tight">
              {orderedStores}
            </div>
            <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
              {orderedStores} / {participatingCount} {language === 'lo' ? 'ຮ້ານສັ່ງຊື້ແລ້ວ' : 'ordered'}
            </p>
          </div>
        </motion.div>

        {/* KPI 3: Not Ordered Stores */}
        <motion.div
          whileTap={{ scale: 0.96 }}
          onClick={() => handleCardClick('tracking')}
          className="calm-card p-3.5 rounded-3xl cursor-pointer hover:border-[var(--color-primary)] transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
              {t.kpiNotOrderedStores}
            </span>
            <div className="w-7 h-7 rounded-xl bg-[var(--color-surface-secondary)] flex items-center justify-center text-[var(--color-text-secondary)]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-2.5">
            <div className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
              {notOrderedStores}
            </div>
            <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
              {language === 'lo' ? 'ຍັງບໍ່ທັນສັ່ງຊື້' : 'Pending orders'}
            </p>
          </div>
        </motion.div>

        {/* KPI 4: Conversion Rate */}
        <motion.div
          whileTap={{ scale: 0.96 }}
          className="calm-card p-3.5 rounded-3xl flex flex-col justify-between border-[var(--color-border)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
              {t.kpiConversionRate}
            </span>
            <div className="w-7 h-7 rounded-xl bg-[var(--color-surface-secondary)] flex items-center justify-center text-[var(--color-primary)]">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-2.5">
            <div className="text-2xl font-black text-[var(--color-primary)] tracking-tight">
              {conversionRate}%
            </div>
            {/* Simple progress bar */}
            <div className="w-full bg-[var(--color-surface-secondary)] h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, parseFloat(conversionRate))}%` }}
              />
            </div>
          </div>
        </motion.div>

      </div>

      {/* 4. Quick Actions Row */}
      <div className="calm-surface p-2.5 rounded-3xl flex items-center justify-between gap-2">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => handleCardClick('tracking')}
          className="flex-1 py-2 px-2.5 rounded-2xl bg-[var(--color-surface-secondary)] hover:bg-[var(--color-border)] text-[var(--color-text-primary)] text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
        >
          <TrendingUp className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <span>{language === 'lo' ? 'ຕິດຕາມການສັ່ງຊື້' : 'Order Tracking'}</span>
        </motion.button>

        {currentUser.role === 'admin' && (
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              triggerHaptic('medium');
              if (onOpenNewStoreModal) onOpenNewStoreModal();
              else handleCardClick('stores');
            }}
            className="flex-1 py-2 px-2.5 rounded-2xl bg-[var(--color-surface-secondary)] hover:bg-[var(--color-border)] text-[var(--color-text-primary)] text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>{language === 'lo' ? 'ເພີ່ມຮ້ານຄ້າ' : 'Add Store'}</span>
          </motion.button>
        )}

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            triggerHaptic('medium');
            if (onOpenNewTaskModal) onOpenNewTaskModal();
            else handleCardClick('tasks');
          }}
          className="flex-1 py-2 px-2.5 rounded-2xl bg-[var(--color-surface-secondary)] hover:bg-[var(--color-border)] text-[var(--color-text-primary)] text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
        >
          <Calendar className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <span>{language === 'lo' ? 'ເພີ່ມວຽກ' : 'Add Task'}</span>
        </motion.button>
      </div>

      {/* 5. Today's Follow-ups Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
              {language === 'lo' ? 'ວຽກທີ່ຕ້ອງຕິດຕາມມື້ນີ້' : "Today's Follow-ups"}
            </h3>
          </div>
          <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">
            {todayFollowUps.length} {language === 'lo' ? 'ລາຍການ' : 'tasks'}
          </span>
        </div>

        {todayFollowUps.length === 0 ? (
          <div className="calm-card p-4 rounded-3xl text-center text-xs text-[var(--color-text-secondary)]">
            {language === 'lo' ? 'ບໍ່ມີວຽກຄົບກຳນົດມື້ນີ້' : 'No follow-up tasks due today.'}
          </div>
        ) : (
          <div className="space-y-2">
            {todayFollowUps.slice(0, 3).map((task) => {
              const store = storeMap.get(task.storeId);
              return (
                <motion.div
                  key={task.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCardClick('tasks')}
                  className="calm-card p-3 rounded-2xl flex items-center justify-between cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                      {task.taskTitle}
                    </h4>
                    <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 truncate">
                      {store ? `${store.storeName} (${store.storeCode})` : 'Store'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Overdue Tasks Section (Calm visual styling) */}
      {overdueTasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                {language === 'lo' ? 'ວຽກກາຍກຳນົດ (Overdue)' : 'Overdue Tasks'}
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
              {overdueTasks.length}
            </span>
          </div>

          <div className="space-y-2">
            {overdueTasks.slice(0, 2).map((ot) => {
              const store = storeMap.get(ot.storeId);
              return (
                <motion.div
                  key={ot.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCardClick('tasks')}
                  className="calm-card p-3 rounded-2xl border-amber-500/30 bg-amber-500/5 flex items-center justify-between cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                      {ot.taskTitle}
                    </h4>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                      {store?.storeName} • Due: {ot.dueDate.substring(0, 10)}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 shrink-0">
                    {language === 'lo' ? 'ຕິດຕາມດ່ວນ' : 'Action'}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. Recent Promotions Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
              {language === 'lo' ? 'ໂປຣໂມຊັ່ນຫຼ້າສຸດ' : 'Recent Promotions'}
            </h3>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleCardClick('promotions')}
            className="text-[11px] font-bold text-[var(--color-primary)] flex items-center gap-0.5"
          >
            <span>{language === 'lo' ? 'ທັງໝົດ' : 'View all'}</span>
            <ChevronRight className="w-3 h-3" />
          </motion.button>
        </div>

        <div className="space-y-3">
          {promotions.slice(0, 3).map((promo) => {
            const pStores = promoStores.filter((ps) => ps.promotionId === promo.id);
            const ord = pStores.filter((ps) => ps.orderStatus === 'Ordered').length;
            const conv = pStores.length > 0 ? Math.round((ord / pStores.length) * 100) : 0;

            return (
              <motion.div
                key={promo.id}
                whileTap={{ scale: 0.985 }}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedPromoForDetail(promo);
                }}
                className="calm-card rounded-3xl overflow-hidden cursor-pointer group hover:border-[var(--color-primary)] transition border border-[var(--color-border)] shadow-xs"
              >
                {/* 1. Large Image Banner */}
                <div className="relative h-36 sm:h-44 w-full bg-slate-950 overflow-hidden">
                  <img
                    src={promo.imageUrl || `${import.meta.env.BASE_URL}icons/image-placeholder.svg`}
                    alt={promo.promotionName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

                  {/* Top: Status Badge + Admin Edit/Delete */}
                  <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs ${
                        promo.status === 'Active'
                          ? 'bg-emerald-500/90 text-white'
                          : promo.status === 'Draft'
                          ? 'bg-amber-500/90 text-white'
                          : 'bg-slate-700/90 text-slate-200'
                      }`}
                    >
                      {promo.status}
                    </span>
                  </div>

                  {/* Admin Quick Action Buttons over image */}
                  {currentUser.role === 'admin' && (
                    <div
                      className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          setEditingPromo(promo);
                        }}
                        className="p-1.5 rounded-full bg-black/60 text-white hover:bg-emerald-600 transition backdrop-blur-md"
                        title={language === 'lo' ? 'ແກ້ໄຂໂປຣໂມຊັ່ນ' : 'Edit Promotion'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('warning');
                          if (
                            window.confirm(
                              language === 'lo'
                                ? `ທ່ານຕ້ອງການລົບໂປຣໂມຊັ່ນ "${promo.promotionName}" ແທ້ບໍ່?`
                                : `Delete promotion "${promo.promotionName}"?`
                            )
                          ) {
                            dataService.deletePromotion(promo.id);
                            if (onRefreshData) onRefreshData();
                          }
                        }}
                        className="p-1.5 rounded-full bg-black/60 text-rose-300 hover:bg-rose-600 hover:text-white transition backdrop-blur-md"
                        title={language === 'lo' ? 'ລົບໂປຣໂມຊັ່ນ' : 'Delete Promotion'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  )}

                  {/* Bottom: Promotion Title & Dates */}
                  <div className="absolute bottom-2.5 left-3 right-3 text-white">
                    <h4 className="text-sm sm:text-base font-extrabold leading-tight drop-shadow-sm truncate">
                      {promo.promotionName}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-200 mt-0.5">
                      <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{promo.startDate} - {promo.endDate}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Card Bottom: Order Progress & Tap Hint */}
                <div className="p-3 bg-[var(--color-surface)] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
                      {language === 'lo' ? 'ຮ້ານຄ້າທີ່ສັ່ງຊື້ໂປຣນີ້:' : 'Stores Ordered:'}
                    </span>
                    <span className="font-bold text-[var(--color-primary)] text-xs">
                      {ord}/{pStores.length} {language === 'lo' ? 'ຮ້ານ' : 'stores'} ({conv}%)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-[var(--color-surface-secondary)] h-1.5 rounded-full overflow-hidden border border-[var(--color-border)]">
                    <div
                      style={{ width: `${conv}%` }}
                      className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-300"
                    />
                  </div>

                  {/* Tap Hint Banner */}
                  <div className="pt-1 flex items-center justify-between text-[11px] text-[var(--color-primary)] font-bold">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{language === 'lo' ? 'ກົດເພື່ອເບິ່ງລາຍຊື່ຮ້ານຄ້າທີ່ສັ່ງຊື້' : 'Tap to see ordering stores'}</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 8. New Product Launch Orders Banner (NPD Distribution) */}
      <motion.div
        whileTap={{ scale: 0.985 }}
        onClick={() => {
          triggerHaptic('light');
          onNavigateTab('newProducts');
        }}
        className="calm-card p-4 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 hover:border-[var(--color-primary)] cursor-pointer transition flex items-center justify-between gap-3 shadow-2xs"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <PackagePlus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-black text-[var(--color-text-primary)] truncate">
                {language === 'lo' ? 'ຕິດຕາມການສັ່ງຊື້ສິນຄ້າໃໝ່ (NPD Launches)' : 'New Product Launch Orders'}
              </h4>
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500 text-white shrink-0">
                Sub-Channel
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 truncate">
              {language === 'lo'
                ? 'ເລືອກຮ້ານຄ້າຕາມ Sub-Channel, ຕິດຕາມການລົງຕົວຢ່າງ ແລະ ການສັ່ງຊື້ສິນຄ້າໃໝ່'
                : 'Select stores by Sub-Channel, track sampling, and new product orders'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] shrink-0">
          <span className="hidden sm:inline">{language === 'lo' ? 'ເບິ່ງລາຍການ' : 'View'}</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </motion.div>

      {/* Promotion Stores Detail Modal (Shows all stores that ordered this promotion) */}
      <PromotionStoresDetailModal
        promotion={selectedPromoForDetail}
        isOpen={Boolean(selectedPromoForDetail)}
        onClose={() => setSelectedPromoForDetail(null)}
        stores={stores}
        promoStores={promoStores}
        currentUser={currentUser}
        salesReps={salesReps}
        language={language}
        onRefreshData={() => {
          if (onRefreshData) onRefreshData();
        }}
        onOpenTracking={(promoId) => {
          setSelectedPromoForDetail(null);
          onNavigateTab('tracking');
        }}
        onEditPromotion={(promo) => {
          setSelectedPromoForDetail(null);
          setEditingPromo(promo);
        }}
        onDeletePromotion={(promo) => {
          dataService.deletePromotion(promo.id);
          setSelectedPromoForDetail(null);
          if (onRefreshData) onRefreshData();
        }}
      />

      {/* Edit Promotion Modal for Admin */}
      <EditPromotionModal
        isOpen={Boolean(editingPromo)}
        onClose={() => setEditingPromo(null)}
        promotion={editingPromo}
        language={language}
        onSaved={() => {
          setEditingPromo(null);
          if (onRefreshData) onRefreshData();
        }}
        onDeleted={() => {
          setEditingPromo(null);
          if (onRefreshData) onRefreshData();
        }}
      />

    </div>
  );
};
