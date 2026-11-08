import { CampaignImage } from './CampaignImage';
import { DashboardCampaignCarousel } from './DashboardCampaignCarousel';
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
  FileSpreadsheet,
  Sparkles
} from 'lucide-react';
import { Store, Promotion, PromotionStore, FollowUpTask, UserProfile, Language, NewProductLaunch, NewProductStoreOrder } from '../types';
import { translations } from '../i18n/translations';
import { dataService } from '../services/dataService';
import { PromotionStoresDetailModal } from './PromotionStoresDetailModal';
import { EditPromotionModal } from './EditPromotionModal';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface DashboardViewProps {
  newProducts: NewProductLaunch[];
  newProductOrders: NewProductStoreOrder[];
  onOpenNewProductOrders: (productId:string, storeId?:string) => void;
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
  newProducts,
  newProductOrders,
  onOpenNewProductOrders,
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

  const recent = <T extends {createdAt:string}>(items:T[]) => [...items].sort((a,b)=>(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0)).slice(0,3);

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
    year: 'numeric',
    timeZone: 'Asia/Bangkok'
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

  const metrics = [
    {tone:'violet',label:t.kpiTotalStores,value:totalStores.toLocaleString(language==='lo'?'lo-LA':'en-US'),caption:language==='lo'?'ຮ້ານຄ້າທັງໝົດ':'Total outlets',icon:StoreIcon,tab:'stores'},
    {tone:'mint',label:t.kpiOrderedStores,value:orderedStores.toLocaleString(),caption:`${orderedStores} / ${participatingCount} ${language==='lo'?'ຮ້ານສັ່ງຊື້ແລ້ວ':'participating outlets ordered'}`,icon:CheckCircle2,tab:'tracking'},
    {tone:'peach',label:t.kpiNotOrderedStores,value:notOrderedStores.toLocaleString(),caption:language==='lo'?'ຍັງບໍ່ທັນສັ່ງຊື້':'Awaiting an order',icon:Clock,tab:'tracking'},
    {tone:'blue',label:t.kpiConversionRate,value:`${conversionRate}%`,caption:language==='lo'?'ຈາກຮ້ານທີ່ເຂົ້າຮ່ວມໂປຣໂມຊັ່ນ':'Of participating promotion outlets',icon:Percent,tab:'tracking'}
  ];

  return (
    <div className="dashboard-page colorful-dashboard space-y-6 max-w-5xl mx-auto">

      {/* 1. Header (Greeting, Date, Notification Icon, Avatar) */}
      <div className="dashboard-greeting flex items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-3">
          <img
            src={avatarFor(currentUser)}
            alt={currentUser.fullName}
            className="w-11 h-11 rounded-2xl profile-photo object-contain ring-2 ring-[var(--color-primary)]"
          />
          <div>
            <p className="dashboard-kicker">{language==='lo'?'ຍິນດີຕ້ອນຮັບກັບຄືນ':'WELCOME BACK'}</p>
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
            aria-label={language==='lo'?'ແຈ້ງເຕືອນວຽກ':'Task notifications'} aria-expanded={showNotifications}
            className="dashboard-bell p-2.5 rounded-2xl calm-surface-secondary text-[var(--color-text-primary)] relative border border-[var(--color-border)]"
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

      <section className="dashboard-hero dashboard-hero--campaigns">
        <div className="dashboard-hero-copy"><div className="dashboard-workspace-pill"><Sparkles size={12}/>{currentUser.role==='admin' ? (language==='lo'?'ພື້ນທີ່ຈັດການຂອງທ່ານ':'YOUR TEAM WORKSPACE') : (language==='lo'?'ພື້ນທີ່ການຂາຍຂອງທ່ານ':'YOUR SALES WORKSPACE')}</div><p className="eyebrow">{language === 'lo' ? 'ຮູບແນະນຳສຳລັບທ່ານ' : 'IN THE SPOTLIGHT'}</p>
        <h2>{language === 'lo' ? 'ສິນຄ້າໃໝ່' : 'New products.'}<br/>{' '}{language === 'lo' ? 'ແລະ ໂປຣໂມຊັ່ນ' : 'Fresh promotions.'}</h2>
        <div className="dashboard-hero-actions"><button onClick={() => handleCardClick('stores')} className="hero-cta">{language === 'lo' ? 'ເບິ່ງຮ້ານຄ້າ' : 'Explore outlets'}<ArrowRight size={15}/></button><button onClick={()=>handleCardClick('tasks')} className="hero-today"><Calendar size={14}/>{todayFollowUps.length} {language==='lo'?'ວຽກມື້ນີ້':'due today'}</button></div></div>
        <DashboardCampaignCarousel products={newProducts} promotions={promotions} language={language} onOpenProduct={onOpenNewProductOrders} onOpenPromotion={setSelectedPromoForDetail}/>
      </section>
      {/* 2. Compact Promotion Selector */}
      <div className="dashboard-section-heading"><div><p className="dashboard-kicker">{language==='lo'?'ຂໍ້ມູນຂອງທ່ານ':'AT A GLANCE'}</p><h2>{language==='lo'?'ພາບລວມໂປຣໂມຊັ່ນ':'Promotion overview'}</h2></div></div>
      <div className="dashboard-promo-filter calm-surface p-2 rounded-2xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 pl-2">
          <Tag className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
            {language === 'lo' ? 'ໂປຣໂມຊັ່ນ:' : 'Promo:'}
          </span>
        </div>

        <select aria-label={language==='lo'?'ໂປຣໂມຊັ່ນສຳລັບຕົວເລກສະຫຼຸບ':'Promotion for summary metrics'}
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

      <div className="dashboard-metrics grid grid-cols-2 xl:grid-cols-4 gap-3" aria-label={language==='lo'?'ຕົວເລກສະຫຼຸບ':'Summary metrics'}>
        {metrics.map((metric,index)=>{
          const Icon=metric.icon;
          return <motion.button type="button" key={metric.tone} whileHover={{y:-3}} whileTap={{scale:.98}} onClick={()=>handleCardClick(metric.tab)} className={`metric-card metric-${metric.tone}`} aria-label={`${metric.label}: ${metric.value}`}>
            <div className="metric-topline"><span className="metric-label">{metric.label}</span><span className="metric-icon"><Icon size={17}/></span></div>
            <div className="metric-value">{metric.value}</div>
            {index===3 && <div className="metric-progress" role="progressbar" aria-label={metric.label} aria-valuenow={Number(conversionRate)} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${Math.min(100,Number(conversionRate))}%`}}/></div>}
            <div className="metric-bottomline"><span>{metric.caption}</span><ArrowRight size={13} aria-hidden="true"/></div>
          </motion.button>;
        })}
      </div>

      {/* 4. Quick Actions Row */}
      <div className="dashboard-quick-actions calm-surface p-2.5 rounded-3xl flex items-center justify-between gap-2">
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
          <div className="dashboard-task-empty calm-card p-4 rounded-3xl text-center text-xs text-[var(--color-text-secondary)]">
            <CheckCircle2 size={23} className="shrink-0"/>{language === 'lo' ? 'ບໍ່ມີວຽກຄົບກຳນົດມື້ນີ້' : 'No follow-up tasks due today.'}
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
      <div className="dashboard-promotions space-y-3">
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

        <div className="grid sm:grid-cols-2 gap-3">
          {promotions.length === 0 && <p className="calm-card rounded-2xl p-6 text-sm text-[var(--color-text-secondary)] sm:col-span-2">{language === 'lo' ? 'ຍັງບໍ່ມີໂປຣໂມຊັ່ນ. ເມື່ອເພີ່ມແລ້ວ ຮູບຈະສະແດງຢູ່ນີ້.' : 'No promotions yet. Added promotions will appear here with their images.'}</p>}
          {recent(promotions).map((promo) => {
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
                <div className="bg-[var(--color-surface)]">
                  <CampaignImage src={promo.imageUrl} alt={promo.promotionName} language={language} full/>
                  <div className="flex items-center justify-between gap-2 px-3 pt-3">

                  {/* Top: Status Badge + Admin Edit/Delete */}
                  <div className="flex items-center gap-1.5">
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

                  {/* Admin Quick Action Buttons below image */}
                  {currentUser.role === 'admin' && (
                    <div
                      className="flex items-center gap-1.5"
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

                  </div>
                  {/* Title and controls stay outside the image. */}
                  <div className="p-3 text-[var(--color-text-primary)]">
                    <h4 className="text-sm sm:text-base font-extrabold leading-snug break-words">
                      {promo.promotionName}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-secondary)] mt-0.5">
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

      <section className="dashboard-products space-y-3" aria-labelledby="dashboard-products-title">
        <div className="flex items-center justify-between gap-3 px-1"><h3 id="dashboard-products-title" className="text-xs font-bold flex items-center gap-2"><PackagePlus size={16} className="text-[var(--color-primary)]"/>{language === 'lo' ? 'ສິນຄ້າໃໝ່ຫຼ້າສຸດ' : 'Latest New Products'}</h3><button onClick={()=>handleCardClick('newProducts')} className="text-xs font-bold text-[var(--color-primary)]">{language === 'lo' ? 'ທັງໝົດ' : 'View all'}</button></div>
        <div className="grid sm:grid-cols-2 gap-3">
          {newProducts.length === 0 && <p className="calm-card rounded-2xl p-6 text-sm text-[var(--color-text-secondary)] sm:col-span-2">{language === 'lo' ? 'ຍັງບໍ່ມີສິນຄ້າໃໝ່. ເມື່ອເພີ່ມແລ້ວ ຮູບຈະສະແດງຢູ່ນີ້.' : 'No new products yet. Added products will appear here with their images.'}</p>}
          {recent(newProducts).map(product=>{
            const orders = newProductOrders.filter(order=>order.productId===product.id);
            const ordered = orders.filter(order=>order.orderStatus==='Ordered').length;
            return <motion.button key={product.id} whileTap={{scale:.985}} onClick={()=>onOpenNewProductOrders(product.id)} className="calm-card rounded-3xl overflow-hidden text-left min-w-0 flex flex-col" aria-label={`${language === 'lo' ? 'ເບິ່ງການສັ່ງຊື້' : 'View orders'}: ${product.productName}`}>
              <CampaignImage src={product.imageUrl} alt={product.productName} language={language} full/>
              <div className="p-4 space-y-2"><div className="flex justify-between gap-2"><h4 className="text-sm font-bold break-words">{product.productName}</h4><span className="text-[10px] text-[var(--color-primary)] shrink-0">{product.status}</span></div><p className="text-xs text-[var(--color-text-secondary)]">{product.sku} · {product.packSize}</p><div className="flex items-center justify-between text-xs gap-2"><span>{language === 'lo' ? 'ຮ້ານທີ່ສັ່ງຊື້' : 'Stores ordered'}: <strong>{ordered}/{orders.length}</strong></span><span className="text-[var(--color-primary)] flex items-center gap-1">{language === 'lo' ? 'ເບິ່ງການສັ່ງຊື້' : 'View orders'}<ChevronRight size={14}/></span></div></div>
            </motion.button>;
          })}
        </div>
      </section>

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
