import React, { useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Calendar,
  Image as ImageIcon,
  Users,
  CheckCircle2,
  Clock,
  Layers,
  Edit2,
  Trash2,
  UploadCloud,
  X,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Store
} from 'lucide-react';
import { Promotion, Store as StoreType, PromotionStore, UserProfile, Language, PromotionStatus } from '../types';
import { translations } from '../i18n/translations';
import { dataService } from '../services/dataService';
import { PromotionStoresDetailModal } from './PromotionStoresDetailModal';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface PromotionsViewProps {
  promotions: Promotion[];
  stores: StoreType[];
  promoStores: PromotionStore[];
  currentUser: UserProfile;
  language: Language;
  onRefreshData: () => void;
  onOpenTracking: (promotionId: string) => void;
}

export const PromotionsView: React.FC<PromotionsViewProps> = ({
  promotions,
  stores,
  promoStores,
  currentUser,
  language,
  onRefreshData,
  onOpenTracking
}) => {
  const t = translations[language];

  const [statusFilter, setStatusFilter] = useState<'All' | PromotionStatus>('All');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [selectedDetailPromotion, setSelectedDetailPromotion] = useState<Promotion | null>(null);
  const [deletingPromotion, setDeletingPromotion] = useState<Promotion | null>(null);

  // Store assignment modal
  const [assigningPromotion, setAssigningPromotion] = useState<Promotion | null>(null);
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());

  // Form states
  const [formData, setFormData] = useState({
    promotionName: '',
    description: '',
    startDate: new Date().toISOString().substring(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
    status: 'Active' as PromotionStatus,
    imageUrl: '',
    targetSubChannels: [] as string[]
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageError, setImageError] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Available Sub-Channels for multi-selection
  const availableSubChannels = useMemo(() => {
    return dataService.getSubChannels().map((sc) => sc.name);
  }, []);

  // Filter promotions
  const filteredPromotions = useMemo(() => {
    if (statusFilter === 'All') return promotions;
    return promotions.filter((p) => p.status === statusFilter);
  }, [promotions, statusFilter]);

  // Open create modal
  const openCreateModal = () => {
    triggerHaptic('medium');
    setFormData({
      promotionName: '',
      description: '',
      startDate: new Date().toISOString().substring(0, 10),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
      status: 'Active',
      imageUrl: '',
      targetSubChannels: []
    });
    setImagePreview('');
    setImageError('');
    setFormError('');
    setIsNewModalOpen(true);
  };

  const openEditModal = (promo: Promotion) => {
    triggerHaptic('light');
    setEditingPromotion(promo);
    setFormData({
      promotionName: promo.promotionName,
      description: promo.description,
      startDate: promo.startDate,
      endDate: promo.endDate,
      status: promo.status,
      imageUrl: promo.imageUrl || '',
      targetSubChannels: promo.targetSubChannels || []
    });
    setImagePreview(promo.imageUrl || '');
    setImageError('');
    setFormError('');
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      triggerHaptic('warning');
      setImageError('Invalid image type. Please select JPEG, PNG, or WebP.');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      triggerHaptic('warning');
      setImageError('File size exceeds 5MB limit. Please upload an image under 5MB.');
      return;
    }

    triggerHaptic('light');
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setFormData((prev) => ({ ...prev, imageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSavePromotion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.promotionName.trim()) {
      setFormError('Promotion Name is required.');
      return;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setFormError('End Date must be on or after Start Date.');
      return;
    }

    triggerHaptic('medium');
    if (editingPromotion) {
      const res = dataService.updatePromotion(editingPromotion.id, {
        promotionName: formData.promotionName,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status,
        imageUrl: formData.imageUrl,
        targetSubChannels: formData.targetSubChannels
      });
      if (!res.success) {
        setFormError(res.error || 'Failed to update promotion.');
        return;
      }
      setEditingPromotion(null);
    } else {
      const res = dataService.createPromotion({
        promotionName: formData.promotionName,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status,
        imageUrl: formData.imageUrl,
        targetSubChannels: formData.targetSubChannels
      });
      if (!res.success) {
        setFormError(res.error || 'Failed to create promotion.');
        return;
      }
      setIsNewModalOpen(false);
    }

    onRefreshData();
  };

  // Sub-Channel selection state in assign modal
  const [assignSubChannelFilter, setAssignSubChannelFilter] = useState<string>('all');
  const [assignSearchQuery, setAssignSearchQuery] = useState('');

  // Available sub-channels with live selected store counts
  const subChannelStats = useMemo(() => {
    const map = new Map<string, { channel: string; total: number; selected: number }>();
    stores.forEach((s) => {
      const current = map.get(s.subChannel) || { channel: s.channel, total: 0, selected: 0 };
      current.total += 1;
      if (selectedStoreIds.has(s.id)) {
        current.selected += 1;
      }
      map.set(s.subChannel, current);
    });

    return Array.from(map.entries()).map(([subCh, data]) => ({
      subChannel: subCh,
      channel: data.channel,
      total: data.total,
      selected: data.selected,
      isAllSelected: data.selected === data.total && data.total > 0
    })).sort((a, b) => b.total - a.total);
  }, [stores, selectedStoreIds]);

  const openAssignModal = (promo: Promotion) => {
    triggerHaptic('light');
    setAssigningPromotion(promo);
    const assignedStores = promoStores.filter((ps) => ps.promotionId === promo.id).map((ps) => ps.storeId);
    setSelectedStoreIds(new Set(assignedStores));
    setAssignSubChannelFilter('all');
    setAssignSearchQuery('');
  };

  const toggleStoreSelect = (storeId: string) => {
    triggerHaptic('light');
    const next = new Set(selectedStoreIds);
    if (next.has(storeId)) {
      next.delete(storeId);
    } else {
      next.add(storeId);
    }
    setSelectedStoreIds(next);
  };

  const toggleSubChannelSelection = (subChannelName: string) => {
    triggerHaptic('medium');
    const matchingStores = stores.filter((s) => s.subChannel === subChannelName);
    const matchingIds = matchingStores.map((s) => s.id);
    const next = new Set(selectedStoreIds);

    const isAllSelected = matchingIds.every((id) => next.has(id));

    if (isAllSelected) {
      matchingIds.forEach((id) => next.delete(id));
    } else {
      matchingIds.forEach((id) => next.add(id));
    }
    setSelectedStoreIds(next);
  };

  const handleSaveAssignments = () => {
    triggerHaptic('medium');
    if (!assigningPromotion) return;
    const storeIdsArray = Array.from(selectedStoreIds);
    dataService.assignStoresToPromotion(assigningPromotion.id, storeIdsArray);
    setAssigningPromotion(null);
    onRefreshData();
  };

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t.promotionsTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.promotionsSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Tabs with haptics */}
          <div className="glass-card p-1 rounded-2xl flex items-center gap-1 text-xs font-bold overflow-x-auto scrollbar-none">
            {(['All', 'Active', 'Draft', 'Completed'] as const).map((status) => (
              <motion.button
                key={status}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  triggerHaptic('light');
                  setStatusFilter(status);
                }}
                className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {status}
              </motion.button>
            ))}
          </div>

          {currentUser.role === 'admin' && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t.newPromotion}</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Promotion Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredPromotions.map((promo) => {
          const pStores = promoStores.filter((ps) => ps.promotionId === promo.id);
          const totalParticipating = pStores.length;
          const orderedStores = pStores.filter((ps) => ps.orderStatus === 'Ordered').length;
          const followUpStores = pStores.filter((ps) => ps.orderStatus === 'Follow-up Required').length;
          const convRate = totalParticipating > 0
            ? Math.round((orderedStores / totalParticipating) * 100)
            : 0;

          return (
            <motion.div
              key={promo.id}
              whileTap={{ scale: 0.985 }}
              onClick={() => {
                triggerHaptic('light');
                setSelectedDetailPromotion(promo);
              }}
              className="glass-panel rounded-3xl overflow-hidden border border-slate-200/70 dark:border-slate-800/80 shadow-sm hover:shadow-lg transition-all flex flex-col group cursor-pointer"
            >
              {/* Promotion Image / Header Banner */}
              <div className="relative h-36 sm:h-40 bg-slate-900 overflow-hidden">
                <img
                  src={promo.imageUrl || `${import.meta.env.BASE_URL}icons/image-placeholder.svg`}
                  alt={promo.promotionName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md ${
                    promo.status === 'Active'
                      ? 'bg-emerald-500/90 text-white shadow-sm'
                      : promo.status === 'Draft'
                      ? 'bg-amber-500/90 text-white'
                      : 'bg-slate-700/90 text-slate-200'
                  }`}>
                    {promo.status}
                  </span>
                </div>

                {/* Name & Dates on banner */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="text-sm sm:text-base font-black leading-tight drop-shadow-sm">
                    {promo.promotionName}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-200 mt-1">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    <span>{promo.startDate} - {promo.endDate}</span>
                  </div>
                </div>
              </div>

              {/* Promotion Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                  {promo.description}
                </p>

                {/* Tracking Progress Section */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800/70">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                      {language === 'lo' ? 'ອັດຕາການສັ່ງຊື້' : 'Order Conversion'}
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                      {convRate}% ({orderedStores}/{totalParticipating})
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex">
                    {totalParticipating > 0 ? (
                      <>
                        <div
                          style={{ width: `${(orderedStores / totalParticipating) * 100}%` }}
                          className="bg-emerald-500 h-full"
                          title="Ordered"
                        />
                        <div
                          style={{ width: `${(followUpStores / totalParticipating) * 100}%` }}
                          className="bg-amber-400 h-full"
                          title="Follow-up Required"
                        />
                      </>
                    ) : (
                      <div className="w-full bg-slate-300 dark:bg-slate-600 h-full" />
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('medium');
                      setSelectedDetailPromotion(promo);
                    }}
                    className="flex-1 py-2 px-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <span>{language === 'lo' ? 'ເບິ່ງຮ້ານຄ້າທີ່ສັ່ງຊື້' : t.viewStores}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.button>

                  {currentUser.role === 'admin' && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => openAssignModal(promo)}
                        className="p-2 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title={t.assignStores}
                      >
                        <Users className="w-4 h-4 text-emerald-600" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => openEditModal(promo)}
                        className="p-2 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title={t.editPromotion}
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => {
                          triggerHaptic('warning');
                          setDeletingPromotion(promo);
                        }}
                        className="p-2 rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title={language === 'lo' ? 'ລົບໂປຣໂມຊັ່ນ' : 'Delete Promotion'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Create / Edit Promotion Modal */}
      <AnimatePresence>
        {(isNewModalOpen || editingPromotion) && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 sm:p-6 shadow-2xl text-[var(--color-text-primary)] max-h-[92vh] overflow-y-auto"
            >
              <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-3 sm:hidden" />

              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                <div>
                  <h3 className="text-base font-extrabold text-[var(--color-text-primary)]">
                    {editingPromotion ? (language === 'lo' ? 'ແກ້ໄຂໂປຣໂມຊັ່ນ' : t.editPromotion) : (language === 'lo' ? 'ສ້າງໂປຣໂມຊັ່ນໃໝ່' : t.newPromotion)}
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                    {language === 'lo' ? 'ກຳນົດຊື່, ວັນທີ, ຮູບພາບ ແລະ ເລືອກ Sub-Channel ທີ່ເຂົ້າຮ່ວມ' : 'Name, dates, banner and participating Sub-Channels'}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => {
                    triggerHaptic('light');
                    setIsNewModalOpen(false);
                    setEditingPromotion(null);
                  }}
                  className="p-1 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {formError && (
                <div className="my-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSavePromotion} className="space-y-3.5 pt-3">
                {/* 1. Promotion Name */}
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                    {language === 'lo' ? 'ຊື່ໂປຣໂມຊັ່ນ *' : `${t.promoName} *`}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.promotionName}
                    onChange={(e) => setFormData({ ...formData, promotionName: e.target.value })}
                    placeholder={language === 'lo' ? 'ຕົວຢ່າງ: ເບຍກຣີມ 4+1 ຫຼື ໂປຣສົງການ 2026' : 'e.g. Songkran Special Sale 2026'}
                    className="w-full text-xs rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] p-2.5 outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors"
                  />
                </div>

                {/* 2. Description */}
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                    {language === 'lo' ? 'ລາຍລະອຽດ' : t.description}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={language === 'lo' ? 'ເງື່ອນໄຂການແຖມ, ສ່ວນຫຼຸດ, ລາຍລະອຽດການສັ່ງຊື້...' : 'Mechanics, discounts, bundle details...'}
                    className="w-full text-xs rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] p-2.5 outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none transition-colors"
                  />
                </div>

                {/* 3. Dates & Status Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--color-text-primary)] mb-1">
                      {language === 'lo' ? 'ວັນທີເລີ່ມຕົ້ນ' : t.startDate}
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full text-xs rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] p-2 outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--color-text-primary)] mb-1">
                      {language === 'lo' ? 'ວັນທີສິ້ນສຸດ' : t.endDate}
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full text-xs rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] p-2 outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--color-text-primary)] mb-1">
                      {language === 'lo' ? 'ສະຖານະ' : t.status}
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as PromotionStatus })}
                      className="w-full text-xs rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] p-2 outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-bold transition-colors"
                    >
                      <option value="Active">{language === 'lo' ? 'ເປີດໃຊ້ (Active)' : 'Active'}</option>
                      <option value="Draft">{language === 'lo' ? 'ສະບັບຮ່າງ (Draft)' : 'Draft'}</option>
                      <option value="Completed">{language === 'lo' ? 'ສິ້ນສຸດ (Completed)' : 'Completed'}</option>
                      <option value="Cancelled">{language === 'lo' ? 'ຍົກເລີກ (Cancelled)' : 'Cancelled'}</option>
                    </select>
                  </div>
                </div>

                {/* 4. Multiple Sub-Channel Selection */}
                <div className="space-y-2 pt-1 border-t border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-[var(--color-text-primary)] block">
                        {language === 'lo'
                          ? 'ເລືອກ Sub-Channel ທີ່ເຂົ້າຮ່ວມ (ເລືອກໄດ້ຫຼາຍຊ່ອງທາງ):'
                          : 'Target Sub-Channels (Multi-Select):'}
                      </label>
                      <span className="text-[10px] text-[var(--color-text-secondary)]">
                        {formData.targetSubChannels.length === 0
                          ? (language === 'lo' ? 'ກົດເລືອກ Sub-Channel ເພື່ອກຳນົດຮ້ານເຂົ້າຮ່ວມ' : 'Tap to select participating store channels')
                          : (language === 'lo'
                            ? `ເລືອກແລ້ວ ${formData.targetSubChannels.length} Sub-Channel (${stores.filter(s => formData.targetSubChannels.includes(s.subChannel)).length} ຮ້ານຄ້າ)`
                            : `${formData.targetSubChannels.length} Sub-Channels selected (${stores.filter(s => formData.targetSubChannels.includes(s.subChannel)).length} stores)`)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setFormData((prev) => ({ ...prev, targetSubChannels: availableSubChannels }));
                        }}
                        className="text-[10px] font-bold text-[var(--color-primary)] hover:underline"
                      >
                        {language === 'lo' ? 'ເລືອກທັງໝົດ' : 'Select All'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setFormData((prev) => ({ ...prev, targetSubChannels: [] }));
                        }}
                        className="text-[10px] font-bold text-[var(--color-text-secondary)] hover:underline"
                      >
                        {language === 'lo' ? 'ລ້າງອອກ' : 'Clear'}
                      </button>
                    </div>
                  </div>

                  {/* Multi-Select Pills */}
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                    {availableSubChannels.map((subCh) => {
                      const isSelected = formData.targetSubChannels.includes(subCh);
                      const matchingStoresCount = stores.filter((s) => s.subChannel === subCh).length;
                      return (
                        <motion.button
                          key={subCh}
                          type="button"
                          whileTap={{ scale: 0.92 }}
                          onClick={() => {
                            triggerHaptic('light');
                            setFormData((prev) => {
                              const current = prev.targetSubChannels;
                              const next = current.includes(subCh)
                                ? current.filter((c) => c !== subCh)
                                : [...current, subCh];
                              return { ...prev, targetSubChannels: next };
                            });
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-2xs'
                              : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                          }`}
                        >
                          <CheckCircle2
                            className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[var(--color-text-secondary)] opacity-40'}`}
                          />
                          <span>{subCh}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]'
                            }`}
                          >
                            {matchingStoresCount}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Image Upload Area with 5MB validation & preview */}
                <div className="space-y-2 pt-1 border-t border-[var(--color-border)]">
                  <label className="block text-xs font-bold text-[var(--color-text-primary)]">
                    {language === 'lo' ? 'ຮູບພາບໂປສເຕີ / ແບນເນີໂປຣໂມຊັ່ນ' : t.promoImage}
                  </label>

                  {imagePreview ? (
                    <div className="relative rounded-2xl overflow-hidden h-36 border border-[var(--color-border)] bg-slate-950">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setImagePreview('');
                          setFormData((prev) => ({ ...prev, imageUrl: '' }));
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] bg-[var(--color-surface-secondary)] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition">
                      <UploadCloud className="w-8 h-8 text-[var(--color-primary)] mb-1" />
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        {language === 'lo' ? 'ອັບໂຫຼດຮູບພາບໂປຣໂມຊັ່ນ' : t.uploadImage}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
                        JPEG, PNG, WebP (Max 5MB)
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                  )}

                  {imageError && (
                    <p className="text-[11px] text-rose-500 mt-1 font-semibold">{imageError}</p>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-[var(--color-border)]">
                  {editingPromotion ? (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => {
                        const promoToDelete = editingPromotion;
                        setEditingPromotion(null);
                        setDeletingPromotion(promoToDelete);
                      }}
                      className="px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-600 bg-rose-500/10 hover:bg-rose-600 hover:text-white transition flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{language === 'lo' ? 'ລົບໂປຣໂມຊັ່ນ' : 'Delete'}</span>
                    </motion.button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => {
                        triggerHaptic('light');
                        setIsNewModalOpen(false);
                        setEditingPromotion(null);
                      }}
                      className="px-4 py-2.5 rounded-2xl text-xs font-semibold bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition"
                    >
                      {t.cancel}
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileTap={{ scale: 0.94 }}
                      className="px-5 py-2.5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold shadow-sm transition"
                    >
                      {language === 'lo' ? 'ບັນທຶກ' : t.save}
                    </motion.button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Stores Modal */}
      <AnimatePresence>
        {assigningPromotion && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 sm:p-6 shadow-2xl text-[var(--color-text-primary)] flex flex-col max-h-[88vh]"
            >
              <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-3 sm:hidden" />

              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                <div>
                  <h3 className="text-base font-extrabold text-[var(--color-text-primary)]">
                    {t.assignStoresTitle}
                  </h3>
                  <p className="text-xs text-[var(--color-primary)] font-bold">
                    {assigningPromotion.promotionName}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setAssigningPromotion(null)}
                  className="p-1 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Quick 1-Tap Toggle by Sub-Channel (Multi-Select) */}
              <div className="py-2.5 border-b border-[var(--color-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    {language === 'lo' ? 'ເລືອກຮ້ານຄ້າຕາມ Sub-Channel (1-Tap Toggle ຫຼາຍຊ່ອງທາງ):' : 'Select Stores by Sub-Channel (Multi-Select):'}
                  </span>
                  <span className="text-[11px] font-bold text-[var(--color-primary)]">
                    {selectedStoreIds.size} {language === 'lo' ? 'ຮ້ານຖືກເລືອກ' : 'selected'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {subChannelStats.map((item) => (
                    <motion.button
                      key={item.subChannel}
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => toggleSubChannelSelection(item.subChannel)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                        item.isAllSelected
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-2xs'
                          : item.selected > 0
                          ? 'bg-emerald-500/10 text-[var(--color-primary)] border-emerald-500/30'
                          : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]'
                      }`}
                    >
                      {item.isAllSelected ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] opacity-40" />
                      )}
                      <span>{item.subChannel}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        item.isAllSelected ? 'bg-white/20 text-white' : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]'
                      }`}>
                        {item.selected}/{item.total}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Search & Sub-Channel Filter inside modal */}
              <div className="py-2.5 border-b border-[var(--color-border)] flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={assignSearchQuery}
                    onChange={(e) => setAssignSearchQuery(e.target.value)}
                    placeholder={language === 'lo' ? 'ຄົ້ນຫາຊື່ຮ້ານ ຫຼື ລະຫັດ...' : 'Filter store list...'}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] outline-none focus:border-[var(--color-primary)]"
                  />
                  {assignSearchQuery && (
                    <button
                      onClick={() => setAssignSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <select
                  value={assignSubChannelFilter}
                  onChange={(e) => setAssignSubChannelFilter(e.target.value)}
                  className="text-xs rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] p-1.5 outline-none text-[var(--color-text-primary)] font-semibold"
                >
                  <option value="all">{language === 'lo' ? 'ທຸກ Sub-Channel' : 'All Sub-Channels'}</option>
                  {subChannelStats.map((item) => (
                    <option key={item.subChannel} value={item.subChannel}>
                      {item.subChannel} ({item.total})
                    </option>
                  ))}
                </select>
              </div>

              {/* Store List Checklist */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
                {stores
                  .filter((s) => {
                    if (assignSubChannelFilter !== 'all' && s.subChannel !== assignSubChannelFilter) return false;
                    if (assignSearchQuery) {
                      const q = assignSearchQuery.toLowerCase();
                      const matchesName = s.storeName.toLowerCase().includes(q);
                      const matchesCode = s.storeCode.toLowerCase().includes(q);
                      if (!matchesName && !matchesCode) return false;
                    }
                    return true;
                  })
                  .map((store) => {
                    const isSelected = selectedStoreIds.has(store.id);
                    return (
                      <motion.div
                        key={store.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleStoreSelect(store.id)}
                        className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'border-[var(--color-primary)] bg-emerald-50/50 dark:bg-emerald-950/20'
                            : 'border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[var(--color-primary)]">
                              {store.storeCode}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] font-bold border border-[var(--color-border)]">
                              {store.subChannel}
                            </span>
                            <span className="text-[10px] text-[var(--color-text-secondary)]">
                              {store.channel}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-text-primary)] font-bold mt-1">
                            {store.storeName}
                          </p>
                        </div>

                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition ${
                          isSelected ? 'bg-[var(--color-primary)] text-white shadow-2xs' : 'border border-[var(--color-border)]'
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </motion.div>
                    );
                  })}
              </div>

              {/* Footer Summary & Save */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">
                  {selectedStoreIds.size} {language === 'lo' ? 'ຮ້ານຖືກເລືອກ' : 'stores selected'}
                </span>

                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setAssigningPromotion(null)}
                    className="px-3.5 py-2 rounded-2xl text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    {t.cancel}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={handleSaveAssignments}
                    className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
                  >
                    {language === 'lo' ? 'ຢືນຢັນ' : 'Confirm'}
                  </motion.button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Promotion Stores Detail Modal (Shows all stores that ordered this promotion) */}
      <PromotionStoresDetailModal
        promotion={selectedDetailPromotion}
        isOpen={Boolean(selectedDetailPromotion)}
        onClose={() => setSelectedDetailPromotion(null)}
        stores={stores}
        promoStores={promoStores}
        currentUser={currentUser}
        salesReps={dataService.getSalesReps()}
        language={language}
        onRefreshData={onRefreshData}
        onOpenTracking={(promoId) => {
          setSelectedDetailPromotion(null);
          onOpenTracking(promoId);
        }}
        onEditPromotion={(promo) => {
          setSelectedDetailPromotion(null);
          openEditModal(promo);
        }}
        onDeletePromotion={(promo) => {
          dataService.deletePromotion(promo.id);
          setSelectedDetailPromotion(null);
          onRefreshData();
        }}
      />

      {/* Delete Confirmation Modal */}
      {deletingPromotion && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
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
                {language === 'lo' ? 'ຢືນຢັນການລົບໂປຣໂມຊັ່ນ?' : 'Delete Promotion?'}
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                {language === 'lo'
                  ? `ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບໂປຣໂມຊັ່ນ "${deletingPromotion.promotionName}"? ຂໍ້ມູນການຕິດຕາມຮ້ານຄ້າທີ່ກ່ຽວຂ້ອງຈະຖືກລຶບອອກນຳ.`
                  : `Are you sure you want to delete "${deletingPromotion.promotionName}"? Associated store tracking records will also be removed.`}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPromotion(null)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-semibold bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
              >
                {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('warning');
                  dataService.deletePromotion(deletingPromotion.id);
                  setDeletingPromotion(null);
                  onRefreshData();
                }}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition"
              >
                {language === 'lo' ? 'ລົບທັນທີ' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};
