import { CampaignImage } from './CampaignImage';
import { CampaignMdeFilter } from './CampaignMdeFilter';
import React, { useState, useMemo } from 'react';
import {
  X,
  Tag,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Store as StoreIcon,
  Search,
  Filter,
  ArrowRight,
  Edit2,
  Trash2,
  Users,
  Phone,
  FileText,
  DollarSign,
  Share2
} from 'lucide-react';
import {
  Promotion,
  Store as StoreType,
  PromotionStore,
  UserProfile,
  Language,
  OrderStatus
} from '../types';
import { translations } from '../i18n/translations';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface PromotionStoresDetailModalProps {
  mdeFilter?:string;onMdeFilterChange?:(value:string)=>void;
  promotion: Promotion | null;
  isOpen: boolean;
  onClose: () => void;
  stores: StoreType[];
  promoStores: PromotionStore[];
  currentUser: UserProfile;
  salesReps: UserProfile[];
  language: Language;
  onRefreshData: () => void;
  onOpenTracking: (promotionId: string) => void;
  onEditPromotion?: (promotion: Promotion) => void;
  onDeletePromotion?: (promotion: Promotion) => void;
}

export const PromotionStoresDetailModal: React.FC<PromotionStoresDetailModalProps> = ({
  mdeFilter='all',onMdeFilterChange,
  promotion,
  isOpen,
  onClose,
  stores,
  promoStores,
  currentUser,
  salesReps,
  language,
  onRefreshData,
  onOpenTracking,
  onEditPromotion,
  onDeletePromotion
}) => {
  const t = translations[language];

  // Tab filter: 'Ordered' (default as user requested: "ເຫັນລາຍຊື່ຮ້ານທີສັ່ງຊື້ໂປຮນີ່"), 'Pending', 'All'
  const [activeTab, setActiveTab] = useState<'Ordered' | 'Pending' | 'All'>('Ordered');
  const [searchQuery, setSearchQuery] = useState('');
  const [subChannelFilter, setSubChannelFilter] = useState<string>('all');

  // Quick order status update state
  const [updatingRecord, setUpdatingRecord] = useState<{
    record: PromotionStore;
    store: StoreType;
  } | null>(null);
  const [updateStatus, setUpdateStatus] = useState<OrderStatus>('Ordered');
  const [updateOrderValue, setUpdateOrderValue] = useState<number>(0);
  const [updateNotes, setUpdateNotes] = useState<string>('');

  // Delete confirmation modal state
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Map stores for rapid lookup
  const storeMap = useMemo(() => {
    return new Map<string, StoreType>(stores.map((s) => [s.id, s]));
  }, [stores]);

  const salesRepMap = useMemo(() => {
    return new Map<string, UserProfile>(salesReps.map((r) => [r.id, r]));
  }, [salesReps]);

  // Participating store records for this promotion
  const promotionStoreRecords = useMemo(() => {
    if (!promotion) return [];
    return promoStores.filter((ps) => ps.promotionId === promotion.id);
  }, [promotion, promoStores]);

  // Summary counts
  const summary = useMemo(() => {
    const total = promotionStoreRecords.length;
    const ordered = promotionStoreRecords.filter((ps) => ps.orderStatus === 'Ordered');
    const followUp = promotionStoreRecords.filter((ps) => ps.orderStatus === 'Follow-up Required');
    const notOrdered = promotionStoreRecords.filter((ps) => ps.orderStatus === 'Not Ordered');
    const pendingTotal = followUp.length + notOrdered.length;
    const totalOrderValue = ordered.reduce((sum, ps) => sum + (ps.orderAmount || 0), 0);
    const convRate = total > 0 ? Math.round((ordered.length / total) * 100) : 0;

    return {
      total,
      orderedCount: ordered.length,
      orderedRecords: ordered,
      followUpCount: followUp.length,
      notOrderedCount: notOrdered.length,
      pendingCount: pendingTotal,
      totalOrderValue,
      convRate
    };
  }, [promotionStoreRecords]);

  // Available Sub-Channels in this promotion
  const availableSubChannels = useMemo(() => {
    const set = new Set<string>();
    promotionStoreRecords.forEach((ps) => {
      const store = storeMap.get(ps.storeId);
      if (store?.subChannel) set.add(store.subChannel);
    });
    return Array.from(set).sort();
  }, [promotionStoreRecords, storeMap]);

  // Filtered store records for current tab & search
  const displayedRecords = useMemo(() => {
    let list = promotionStoreRecords;

    // Filter by tab
    if (activeTab === 'Ordered') {
      list = list.filter((ps) => ps.orderStatus === 'Ordered');
    } else if (activeTab === 'Pending') {
      list = list.filter((ps) => ps.orderStatus === 'Follow-up Required' || ps.orderStatus === 'Not Ordered');
    }

    // Filter by sub-channel
    if (subChannelFilter !== 'all') {
      list = list.filter((ps) => {
        const store = storeMap.get(ps.storeId);
        return store?.subChannel === subChannelFilter;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((ps) => {
        const store = storeMap.get(ps.storeId);
        if (!store) return false;
        return (
          store.storeName.toLowerCase().includes(q) ||
          store.storeCode.toLowerCase().includes(q) ||
          store.subChannel.toLowerCase().includes(q) ||
          (ps.remark && ps.remark.toLowerCase().includes(q))
        );
      });
    }

    return list;
  }, [promotionStoreRecords, activeTab, subChannelFilter, searchQuery, storeMap]);

  if (!isOpen || !promotion) return null;

  const handleOpenUpdateOrder = (record: PromotionStore, store: StoreType) => {
    triggerHaptic('light');
    setUpdatingRecord({ record, store });
    setUpdateStatus(record.orderStatus);
    setUpdateOrderValue(record.orderAmount || 500000);
    setUpdateNotes(record.remark || '');
  };

  const handleSaveStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingRecord) return;

    triggerHaptic('medium');
    dataService.updateOrderStatus({
      promotionStoreId: updatingRecord.record.id,
      newStatus: updateStatus,
      orderAmount: updateStatus === 'Ordered' ? Number(updateOrderValue) : undefined,
      orderDate: updateStatus === 'Ordered' ? new Date().toISOString() : undefined,
      remark: updateNotes
    });

    setUpdatingRecord(null);
    onRefreshData();
  };

  const handleDeleteConfirmed = () => {
    triggerHaptic('warning');
    if (onDeletePromotion) {
      onDeletePromotion(promotion);
    } else {
      dataService.deletePromotion(promotion.id);
      onRefreshData();
    }
    setIsConfirmDeleteOpen(false);
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={language==='lo'?'ລາຍລະອຽດໂປຣໂມຊັ່ນ':'Promotion details'} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="w-full sm:max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* 1. Large Hero Header Banner */}
        <div className="relative shrink-0 p-4 pr-14 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          {/* Close button */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white backdrop-blur-md flex items-center justify-center hover:bg-black/80 transition z-10"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </motion.button>

          {/* Top Status & Admin Action Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-sm ${
                promotion.status === 'Active'
                  ? 'bg-emerald-500/95 text-white'
                  : promotion.status === 'Draft'
                  ? 'bg-amber-500/95 text-white'
                  : 'bg-slate-700/95 text-slate-200'
              }`}
            >
              {promotion.status}
            </span>

            {/* Admin Edit & Delete Quick Badges */}
            {currentUser.role === 'admin' && (
              <div className="flex items-center gap-1.5">
                {onEditPromotion && (
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => {
                      triggerHaptic('light');
                      onEditPromotion(promotion);
                    }}
                    className="p-1.5 rounded-full bg-black/60 text-white hover:bg-emerald-600 transition backdrop-blur-md"
                    title={language === 'lo' ? 'ແກ້ໄຂໂປຣໂມຊັ່ນ' : 'Edit Promotion'}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </motion.button>
                )}

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => {
                    triggerHaptic('warning');
                    setIsConfirmDeleteOpen(true);
                  }}
                  className="p-1.5 rounded-full bg-black/60 text-rose-300 hover:bg-rose-600 hover:text-white transition backdrop-blur-md"
                  title={language === 'lo' ? 'ລົບໂປຣໂມຊັ່ນ' : 'Delete Promotion'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            )}
          </div>

          {/* Promotion Details over Banner */}
          <div className="mt-3 text-[var(--color-text-primary)]">
            <h2 className="text-lg sm:text-xl font-black leading-snug">
              {promotion.promotionName}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)] mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                {promotion.startDate} - {promotion.endDate}
              </span>
              <span className="text-[var(--color-primary)] font-bold">
                {summary.convRate}% {language === 'lo' ? 'ສັ່ງຊື້ແລ້ວ' : 'ordered'} ({summary.orderedCount}/{summary.total})
              </span>
            </div>
          </div>
        </div>

        {/* 2. Content Body - Scrollable */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
          
          <CampaignImage src={promotion.imageUrl} alt={promotion.promotionName} language={language} full className="campaign-modal-image rounded-2xl"/>
          {/* Description */}
          {promotion.description && (
            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface-secondary)] p-3 rounded-2xl">
              {promotion.description}
            </p>
          )}

          {/* 3. KPI Summary Cards */}
          {onMdeFilterChange&&<CampaignMdeFilter user={currentUser} mdes={salesReps} value={mdeFilter} language={language} onChange={value=>{onMdeFilterChange(value);setSubChannelFilter('all');setSearchQuery('');setActiveTab('All');}}/>}
          <div className="grid grid-cols-3 gap-2">
            {/* Total Stores */}
            <div className="calm-card p-3 rounded-2xl text-center">
              <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] block">
                {language === 'lo' ? 'ຮ້ານເຂົ້າຮ່ວມ' : 'Stores'}
              </span>
              <span className="text-base sm:text-lg font-black text-[var(--color-text-primary)]">
                {summary.total}
              </span>
            </div>

            {/* Ordered Stores */}
            <div className="calm-card p-3 rounded-2xl text-center border-emerald-500/40 bg-emerald-500/5">
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 block">
                {language === 'lo' ? 'ສັ່ງຊື້ແລ້ວ' : 'Ordered'}
              </span>
              <span className="text-base sm:text-lg font-black text-[var(--color-success)]">
                {summary.orderedCount}
              </span>
            </div>

            {/* Pending / Follow-up */}
            <div className="calm-card p-3 rounded-2xl text-center border-amber-500/30 bg-amber-500/5">
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 block">
                {language === 'lo' ? 'ຍັງບໍ່ສັ່ງ' : 'Pending'}
              </span>
              <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">
                {summary.pendingCount}
              </span>
            </div>
          </div>

          {/* Total Order Value Banner if any orders */}
          {summary.totalOrderValue > 0 && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600/10 to-teal-600/10 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center font-bold text-xs">
                  ₭
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)]">
                    {language === 'lo' ? 'ຍອດສັ່ງຊື້ລວມໂປຣໂມຊັ່ນນີ້' : 'Total Promotion Orders'}
                  </span>
                  <div className="text-sm font-extrabold text-[var(--color-primary)]">
                    ₭{summary.totalOrderValue.toLocaleString()} LAK
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                {summary.convRate}% Success
              </span>
            </div>
          )}

          {/* 4. Filter Tabs & Search Bar */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs sm:text-sm font-black text-[var(--color-text-primary)] flex items-center gap-1.5">
                <StoreIcon className="w-4 h-4 text-[var(--color-primary)]" />
                <span>
                  {language === 'lo'
                    ? 'ລາຍຊື່ຮ້ານຄ້າທີ່ສັ່ງຊື້ ແລະ ເຂົ້າຮ່ວມໂປຣນີ້'
                    : 'Stores Participating & Ordering'}
                </span>
              </h3>

              {/* Action buttons for admin */}
              {currentUser.role === 'admin' && (
                <div className="flex items-center gap-1">
                  {onEditPromotion && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onEditPromotion(promotion)}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold text-[var(--color-primary)] bg-[var(--color-surface-secondary)] hover:bg-[var(--color-primary)] hover:text-white transition flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{language === 'lo' ? 'ແກ້ໄຂ' : 'Edit'}</span>
                    </motion.button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsConfirmDeleteOpen(true)}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold text-rose-600 bg-rose-500/10 hover:bg-rose-600 hover:text-white transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{language === 'lo' ? 'ລົບ' : 'Delete'}</span>
                  </motion.button>
                </div>
              )}
            </div>

            {/* Filter Tabs: Ordered Stores (Primary) | Pending | All */}
            <div className="p-1 rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center gap-1 text-xs font-bold">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab('Ordered');
                }}
                className={`flex-1 py-1.5 px-2 rounded-xl transition text-center flex items-center justify-center gap-1.5 ${
                  activeTab === 'Ordered'
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {language === 'lo' ? 'ຮ້ານສັ່ງຊື້ແລ້ວ' : 'Ordered'} ({summary.orderedCount})
                </span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab('Pending');
                }}
                className={`flex-1 py-1.5 px-2 rounded-xl transition text-center flex items-center justify-center gap-1.5 ${
                  activeTab === 'Pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {language === 'lo' ? 'ຍັງບໍ່ທັນສັ່ງ' : 'Pending'} ({summary.pendingCount})
                </span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab('All');
                }}
                className={`flex-1 py-1.5 px-2 rounded-xl transition text-center ${
                  activeTab === 'All'
                    ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-xs border border-[var(--color-border)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {language === 'lo' ? 'ທັງໝົດ' : 'All'} ({summary.total})
              </motion.button>
            </div>

            {/* Search and Sub-Channel Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                <input
                  type="text"
                  placeholder={language === 'lo' ? 'ຄົ້ນຫາຊື່ຮ້ານ ຫຼື ລະຫັດ...' : 'Search store name or code...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] outline-none"
                />
              </div>

              {availableSubChannels.length > 0 && (
                <select
                  value={subChannelFilter}
                  onChange={(e) => setSubChannelFilter(e.target.value)}
                  className="text-xs font-semibold py-1.5 px-2.5 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none max-w-[140px] truncate"
                >
                  <option value="all">{language === 'lo' ? 'ທຸກ Sub-Channel' : 'All Sub-Channels'}</option>
                  {availableSubChannels.map((subCh) => (
                    <option key={subCh} value={subCh}>{subCh}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* 5. Store List */}
          <div className="space-y-2">
            {displayedRecords.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--color-text-secondary)] bg-[var(--color-surface-secondary)]/50 rounded-2xl">
                {language === 'lo'
                  ? 'ບໍ່ພົບຮ້ານຄ້າຕາມເງື່ອນໄຂທີ່ເລືອກ'
                  : 'No stores match the selected filter'}
              </div>
            ) : (
              displayedRecords.map((ps) => {
                const store = storeMap.get(ps.storeId);
                const salesRep = store ? salesRepMap.get(store.assignedSalesUser) : undefined;
                if (!store) return null;

                const isOrdered = ps.orderStatus === 'Ordered';
                const isFollowUp = ps.orderStatus === 'Follow-up Required';

                return (
                  <motion.div
                    key={ps.id}
                    whileTap={{ scale: 0.985 }}
                    className={`calm-card p-3 rounded-2xl transition border ${
                      isOrdered
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : isFollowUp
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-[var(--color-border)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-[var(--color-text-secondary)]">
                            {store.storeCode}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)]">
                            {store.subChannel}
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)] mt-0.5 truncate">
                          {store.storeName}
                        </h4>

                        {/* Sales Rep info */}
                        {salesRep && (
                          <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5 flex items-center gap-1">
                            <span>Sales:</span>
                            <span className="font-semibold text-[var(--color-text-primary)]">
                              {salesRep.fullName}
                            </span>
                          </p>
                        )}
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                          isOrdered
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : isFollowUp
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {isOrdered && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {isFollowUp && <Clock className="w-3 h-3 text-amber-600" />}
                        <span>{ps.orderStatus}</span>
                      </span>
                    </div>

                    {/* Order Details if ordered */}
                    {isOrdered && (
                      <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px]">
                        <span className="text-[var(--color-text-secondary)]">
                          {language === 'lo' ? 'ຍອດສັ່ງຊື້:' : 'Amount:'}{' '}
                          <strong className="text-[var(--color-primary)] font-mono font-bold">
                            ₭{(ps.orderAmount || 0).toLocaleString()} LAK
                          </strong>
                        </span>
                        {ps.orderDate && (
                          <span className="text-[10px] text-[var(--color-text-secondary)]">
                            {ps.orderDate.substring(0, 10)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Notes if any */}
                    {ps.remark && (
                      <div className="mt-1.5 text-[10px] text-[var(--color-text-secondary)] bg-[var(--color-surface)]/80 p-1.5 rounded-xl">
                        {ps.remark}
                      </div>
                    )}

                    {/* Quick action to update status */}
                    <div className="mt-2.5 flex items-center justify-end gap-1.5 pt-1.5 border-t border-[var(--color-border)]/60">
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleOpenUpdateOrder(ps, store)}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-[var(--color-surface-secondary)] hover:bg-[var(--color-primary)] hover:text-white text-[var(--color-text-primary)] transition"
                      >
                        {isOrdered
                          ? language === 'lo' ? 'ແກ້ໄຂຍອດ/ສະຖານະ' : 'Edit Order'
                          : language === 'lo' ? 'ບັນທຶກການສັ່ງຊື້' : 'Record Order'}
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* 6. Footer Navigation Button */}
        <div className="p-3 sm:p-4 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center justify-between gap-2 shrink-0">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              triggerHaptic('medium');
              onClose();
              onOpenTracking(promotion.id);
            }}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>{language === 'lo' ? 'ເປີດໜ້າຕິດຕາມຄົບຊຸດ (Full Order Tracking)' : 'Full Order Tracking Screen'}</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Quick Order Status Update Modal */}
        {updatingRecord && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 shadow-2xl space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                    {language === 'lo' ? 'ອັບເດດສະຖານະການສັ່ງຊື້' : 'Update Store Order'}
                  </h4>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    {updatingRecord.store.storeName} ({updatingRecord.store.storeCode})
                  </p>
                </div>
                <button
                  onClick={() => setUpdatingRecord(null)}
                  className="p-1 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveStatusUpdate} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-[var(--color-text-secondary)] block mb-1">
                    {language === 'lo' ? 'ສະຖານະການສັ່ງຊື້' : 'Order Status'}
                  </label>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value as OrderStatus)}
                    className="w-full p-2 rounded-xl text-xs bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none"
                  >
                    <option value="Ordered">{language === 'lo' ? 'ສັ່ງຊື້ແລ້ວ (Ordered)' : 'Ordered'}</option>
                    <option value="Follow-up Required">{language === 'lo' ? 'ຕ້ອງການຕິດຕາມ (Follow-up Required)' : 'Follow-up Required'}</option>
                    <option value="Not Ordered">{language === 'lo' ? 'ຍັງບໍ່ທັນສັ່ງ (Not Ordered)' : 'Not Ordered'}</option>
                  </select>
                </div>

                {updateStatus === 'Ordered' && (
                  <div>
                    <label className="text-[11px] font-bold text-[var(--color-text-secondary)] block mb-1">
                      {language === 'lo' ? 'ມູນຄ່າການສັ່ງຊື້ (LAK)' : 'Order Value (LAK)'}
                    </label>
                    <input
                      type="number"
                      value={updateOrderValue}
                      onChange={(e) => setUpdateOrderValue(Number(e.target.value))}
                      className="w-full p-2 rounded-xl text-xs bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none font-mono"
                      step={10000}
                      min={0}
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-[var(--color-text-secondary)] block mb-1">
                    {language === 'lo' ? 'ບັນທຶກຕິດຕາມ' : 'Follow-up Notes'}
                  </label>
                  <textarea
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    rows={2}
                    placeholder={language === 'lo' ? 'ລາຍລະອຽດການລົມ, ຈຳນວນລັງ, ຫຼື ເຫດຜົນ...' : 'Feedback, quantity ordered, next follow-up...'}
                    className="w-full p-2 rounded-xl text-xs bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setUpdatingRecord(null)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
                  >
                    {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-[var(--color-primary)] text-white"
                  >
                    {language === 'lo' ? 'ບັນທຶກ' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {isConfirmDeleteOpen && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h4 className="text-base font-extrabold text-[var(--color-text-primary)]">
                  {language === 'lo' ? 'ຢືນຢັນການລົບໂປຣໂມຊັ່ນ?' : 'Confirm Delete Promotion?'}
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  {language === 'lo'
                    ? `ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບໂປຣໂມຊັ່ນ "${promotion.promotionName}"? ຂໍ້ມູນການຕິດຕາມຮ້ານຄ້າຈະຖືກລຶບອອກນຳ.`
                    : `Are you sure you want to delete "${promotion.promotionName}"? Associated store tracking records will also be removed.`}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(false)}
                  className="flex-1 py-2.5 rounded-2xl text-xs font-semibold bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
                >
                  {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirmed}
                  className="flex-1 py-2.5 rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition"
                >
                  {language === 'lo' ? 'ລົບທັນທີ' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </motion.div>
    </div>
  );
};
