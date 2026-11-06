import React, { useState, useMemo } from 'react';
import {
  Store as StoreIcon,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  User,
  Phone,
  MapPin,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Building,
  CheckCircle,
  X,
  Tag,
  Clock,
  Sparkles,
  CheckSquare,
  CheckCircle2,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Store, UserProfile, Language, Channel, SubChannel, Promotion, PromotionStore, OrderStatus } from '../types';
import { translations } from '../i18n/translations';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';
import confetti from 'canvas-confetti';

interface StoresViewProps {
  stores: Store[];
  promotions?: Promotion[];
  promoStores?: PromotionStore[];
  salesReps: UserProfile[];
  channels: Channel[];
  subChannels: SubChannel[];
  currentUser: UserProfile;
  language: Language;
  onRefreshData: () => void;
  onNavigateTab?: (tab: 'dashboard' | 'stores' | 'promotions' | 'tracking' | 'tasks' | 'excel' | 'more') => void;
}

export const StoresView: React.FC<StoresViewProps> = ({
  stores,
  promotions = [],
  promoStores = [],
  salesReps,
  channels,
  subChannels,
  currentUser,
  language,
  onRefreshData,
  onNavigateTab
}) => {
  const t = translations[language];

  // Active campaign for contextual order status
  const [selectedPromoId, setSelectedPromoId] = useState<string>(() => {
    const active = promotions.find((p) => p.status === 'Active');
    return active ? active.id : (promotions[0]?.id || '');
  });

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [subChannelFilter, setSubChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [salesFilter, setSalesFilter] = useState(currentUser.role === 'sales' ? currentUser.id : 'all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [deletingStore, setDeletingStore] = useState<Store | null>(null);
  const [detailStore, setDetailStore] = useState<Store | null>(null);

  // Quick order update form inside Store Detail Bottom Sheet
  const [orderStatusVal, setOrderStatusVal] = useState<OrderStatus>('Not Ordered');
  const [orderAmountVal, setOrderAmountVal] = useState<number>(0);
  const [nextFollowUpVal, setNextFollowUpVal] = useState<string>('');
  const [remarkVal, setRemarkVal] = useState<string>('');
  const [autoTaskVal, setAutoTaskVal] = useState<boolean>(true);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState<boolean>(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string>('');

  // Add / Edit Store Form
  const [formData, setFormData] = useState({
    storeCode: '',
    storeName: '',
    channel: 'Modern Trade',
    subChannel: 'Supermarket',
    assignedSalesUser: salesReps[0]?.id || currentUser.id,
    phone: '',
    address: '',
    city: 'Vientiane Capital'
  });
  const [formError, setFormError] = useState('');

  // Maps for efficient lookup
  const salesMap = useMemo(() => new Map(salesReps.map((r) => [r.id, r])), [salesReps]);
  const activePromo = useMemo(() => promotions.find((p) => p.id === selectedPromoId), [promotions, selectedPromoId]);

  // Map of storeId -> PromotionStore record for active promo
  const storePromoMap = useMemo(() => {
    const map = new Map<string, PromotionStore>();
    if (selectedPromoId) {
      promoStores.filter((ps) => ps.promotionId === selectedPromoId).forEach((ps) => {
        map.set(ps.storeId, ps);
      });
    }
    return map;
  }, [promoStores, selectedPromoId]);

  // Filtered stores
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      // Search term
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesCode = store.storeCode.toLowerCase().includes(query);
        const matchesName = store.storeName.toLowerCase().includes(query);
        const matchesCity = (store.city || '').toLowerCase().includes(query);
        if (!matchesCode && !matchesName && !matchesCity) return false;
      }

      // Channel
      if (channelFilter !== 'all' && store.channel !== channelFilter) return false;
      // Sub Channel
      if (subChannelFilter !== 'all' && store.subChannel !== subChannelFilter) return false;
      // Sales
      if (salesFilter !== 'all' && store.assignedSalesUser !== salesFilter) return false;

      // Status in current promotion
      if (statusFilter !== 'all') {
        const ps = storePromoMap.get(store.id);
        const currentStatus = ps ? ps.orderStatus : 'Not Participating';
        if (currentStatus !== statusFilter) return false;
      }

      return true;
    });
  }, [stores, searchTerm, channelFilter, subChannelFilter, salesFilter, statusFilter, storePromoMap]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredStores.length / itemsPerPage));
  const paginatedStores = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStores.slice(start, start + itemsPerPage);
  }, [filteredStores, currentPage]);

  const openAddModal = () => {
    triggerHaptic('medium');
    setFormData({
      storeCode: `STR-${Math.floor(100 + Math.random() * 900)}`,
      storeName: '',
      channel: channels[0]?.name || 'Modern Trade',
      subChannel: 'Supermarket',
      assignedSalesUser: salesReps[0]?.id || currentUser.id,
      phone: '',
      address: '',
      city: 'Vientiane Capital'
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (store: Store) => {
    triggerHaptic('light');
    setEditingStore(store);
    setFormData({
      storeCode: store.storeCode,
      storeName: store.storeName,
      channel: store.channel,
      subChannel: store.subChannel,
      assignedSalesUser: store.assignedSalesUser,
      phone: store.phone || '',
      address: store.address || '',
      city: store.city || 'Vientiane Capital'
    });
    setFormError('');
  };

  const openDetailSheet = (store: Store) => {
    triggerHaptic('light');
    setDetailStore(store);
    setOrderSuccessMsg('');

    // Prepopulate order status
    const ps = storePromoMap.get(store.id);
    if (ps) {
      setOrderStatusVal(ps.orderStatus);
      setOrderAmountVal(ps.orderAmount || 0);
      setNextFollowUpVal(ps.nextFollowUpDate ? ps.nextFollowUpDate.substring(0, 10) : '');
      setRemarkVal(ps.remark || '');
    } else {
      setOrderStatusVal('Not Ordered');
      setOrderAmountVal(0);
      setNextFollowUpVal('');
      setRemarkVal('');
    }
  };

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.storeCode.trim()) {
      setFormError('Store Code is required.');
      return;
    }
    if (!formData.storeName.trim()) {
      setFormError('Store Name is required.');
      return;
    }

    triggerHaptic('medium');
    if (editingStore) {
      const res = dataService.updateStore(editingStore.id, {
        storeCode: formData.storeCode,
        storeName: formData.storeName,
        channel: formData.channel,
        subChannel: formData.subChannel,
        assignedSalesUser: formData.assignedSalesUser,
        phone: formData.phone,
        address: formData.address,
        city: formData.city
      });
      if (!res.success) {
        setFormError(res.error || 'Failed to update store.');
        return;
      }
      setEditingStore(null);
    } else {
      const res = dataService.addStore({
        storeCode: formData.storeCode,
        storeName: formData.storeName,
        channel: formData.channel,
        subChannel: formData.subChannel,
        assignedSalesUser: formData.assignedSalesUser,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        isActive: true
      });
      if (!res.success) {
        setFormError(res.error || 'Failed to add store.');
        return;
      }
      setIsAddModalOpen(false);
    }

    onRefreshData();
  };

  const handleDeleteStore = () => {
    if (!deletingStore) return;
    triggerHaptic('warning');
    const res = dataService.deleteStore(deletingStore.id);
    if (!res.success) {
      alert(res.error);
    } else {
      setDeletingStore(null);
      if (detailStore?.id === deletingStore.id) setDetailStore(null);
      onRefreshData();
    }
  };

  const handleSaveOrderStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailStore || !selectedPromoId) return;

    triggerHaptic('medium');
    setIsUpdatingOrder(true);

    let ps = storePromoMap.get(detailStore.id);

    // If not yet enrolled in this promotion, enroll automatically
    if (!ps) {
      dataService.assignStoresToPromotion(selectedPromoId, [detailStore.id]);
      const refreshed = dataService.getPromotionStores(selectedPromoId);
      ps = refreshed.find((item) => item.storeId === detailStore.id);
    }

    if (ps) {
      const res = dataService.updateOrderStatus({
        promotionStoreId: ps.id,
        newStatus: orderStatusVal,
        orderAmount: orderStatusVal === 'Ordered' ? Number(orderAmountVal) || 0 : undefined,
        nextFollowUpDate: nextFollowUpVal ? new Date(nextFollowUpVal).toISOString() : undefined,
        remark: remarkVal,
        createAutoTask: autoTaskVal,
        taskDueDate: nextFollowUpVal ? new Date(nextFollowUpVal).toISOString() : undefined,
        taskPriority: 'High'
      });

      if (res.success) {
        if (orderStatusVal === 'Ordered') {
          triggerHaptic('success');
          try {
            confetti({
              particleCount: 70,
              spread: 75,
              origin: { y: 0.6 }
            });
          } catch {
            // fallback
          }
        }
        setOrderSuccessMsg(
          language === 'lo' ? 'ອັບເດດສະຖານະການສັ່ງຊື້ສຳເລັດແລ້ວ' : 'Order status updated successfully!'
        );
        onRefreshData();
      }
    }

    setIsUpdatingOrder(false);
  };

  const handleQuickAddTaskForStore = () => {
    if (!detailStore) return;
    triggerHaptic('light');
    dataService.createTask({
      taskTitle: `Follow up: ${detailStore.storeName} (${detailStore.storeCode})`,
      storeId: detailStore.id,
      promotionId: selectedPromoId || undefined,
      assignedUser: detailStore.assignedSalesUser || currentUser.id,
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      priority: 'High',
      taskStatus: 'Pending',
      remark: 'Follow-up task created directly from store details'
    });
    setOrderSuccessMsg(language === 'lo' ? 'ສ້າງວຽກຕິດຕາມຮຽບຮ້ອຍແລ້ວ' : 'Task added to To-Do List!');
    onRefreshData();
  };

  const getStatusBadge = (status?: OrderStatus | 'Not Participating') => {
    switch (status) {
      case 'Ordered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            {t.statusOrdered}
          </span>
        );
      case 'Follow-up Required':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            {t.statusFollowUp}
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            {t.statusCancelled}
          </span>
        );
      case 'Not Ordered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            {t.statusNotOrdered}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            {language === 'lo' ? 'ບໍ່ໄດ້ເຂົ້າຮ່ວມ' : 'Not Enrolled'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
            {t.storesTitle}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            {t.storesSubtitle} ({filteredStores.length} {language === 'lo' ? 'ຮ້ານຄ້າ' : 'stores'})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              triggerHaptic('light');
              dataService.exportStoresToExcel(filteredStores);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] text-xs font-bold hover:bg-[var(--color-surface-secondary)] transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>{language === 'lo' ? 'ສົ່ງອອກ Excel' : 'Export Excel'}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addStore}</span>
          </motion.button>
        </div>
      </div>

      {/* Active Promotion Context Selector Bar */}
      {promotions.length > 0 && (
        <div className="calm-card p-3 rounded-2xl border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <Tag className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] block leading-tight">
                {language === 'lo' ? 'ສະຖານະການສັ່ງຊື້ຕາມໂປຣໂມຊັ່ນ' : 'Order Status Campaign Scoping:'}
              </span>
              <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                {activePromo?.promotionName || 'Select Campaign'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {promotions.map((p) => {
              const isSelected = p.id === selectedPromoId;
              return (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedPromoId(p.id);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition ${
                    isSelected
                      ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                      : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {p.promotionName.length > 20 ? p.promotionName.substring(0, 18) + '...' : p.promotionName}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="calm-card p-3.5 sm:p-4 rounded-3xl space-y-2.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={t.searchStores}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] outline-none focus:border-[var(--color-primary)] transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select
              value={channelFilter}
              onChange={(e) => {
                triggerHaptic('light');
                setChannelFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] py-2 px-2 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
            >
              <option value="all">{t.allChannels}</option>
              <option value="Modern Trade">Modern Trade</option>
              <option value="General Trade">General Trade</option>
              <option value="Convenience Store (CVS)">CVS</option>
              <option value="Wholesale">Wholesale</option>
              <option value="HORECA">HORECA</option>
            </select>

            <select
              value={subChannelFilter}
              onChange={(e) => {
                triggerHaptic('light');
                setSubChannelFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] py-2 px-2 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
            >
              <option value="all">{t.allSubChannels}</option>
              <option value="Hypermarket">Hypermarket</option>
              <option value="Supermarket">Supermarket</option>
              <option value="Medium Grocery">Medium Grocery</option>
              <option value="Chain CVS">Chain CVS</option>
              <option value="Cash & Carry">Cash & Carry</option>
              <option value="Hotel & Resort">Hotel & Resort</option>
              <option value="Restaurant/Cafe">Restaurant/Cafe</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                triggerHaptic('light');
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] py-2 px-2 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
            >
              <option value="all">{t.allStatuses}</option>
              <option value="Ordered">{t.statusOrdered}</option>
              <option value="Not Ordered">{t.statusNotOrdered}</option>
              <option value="Follow-up Required">{t.statusFollowUp}</option>
              <option value="Cancelled">{t.statusCancelled}</option>
            </select>

            <select
              value={salesFilter}
              disabled={currentUser.role === 'sales'}
              onChange={(e) => {
                triggerHaptic('light');
                setSalesFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] py-2 px-2 text-[var(--color-text-primary)] outline-none disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {currentUser.role !== 'sales' && <option value="all">{t.allSalesReps}</option>}
              {salesReps.map((rep) => (
                <option key={rep.id} value={rep.id}>{rep.fullName}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Stores Content View */}
      <div className="calm-card rounded-3xl overflow-hidden border border-[var(--color-border)]">
        
        {paginatedStores.length === 0 ? (
          <div className="py-12 text-center text-[var(--color-text-secondary)]">
            <StoreIcon className="w-12 h-12 mx-auto mb-3 opacity-30 text-[var(--color-primary)]" />
            <p className="text-sm font-semibold">{t.noStoresFound}</p>
          </div>
        ) : (
          <>
            {/* Mobile Store Cards formatted as `ST001 — ຮ້ານ ສົມໃຈ` */}
            <div className="md:hidden divide-y divide-[var(--color-border)]">
              {paginatedStores.map((store) => {
                const rep = salesMap.get(store.assignedSalesUser);
                const ps = storePromoMap.get(store.id);

                return (
                  <motion.div
                    key={store.id}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => openDetailSheet(store)}
                    className="p-4 space-y-2 bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)]/50 transition cursor-pointer"
                  >
                    {/* Header: ST001 — ຮ້ານ ສົມໃຈ */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--color-text-primary)] leading-tight truncate">
                          <span className="font-mono text-xs font-black text-[var(--color-primary)] mr-1.5">
                            {store.storeCode}
                          </span>
                          — {store.storeName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--color-text-secondary)]">
                          <span className="font-medium">{store.channel}</span>
                          <span>•</span>
                          <span>{store.subChannel}</span>
                        </div>
                      </div>

                      {/* Status Chip for active promotion */}
                      <div className="shrink-0">
                        {getStatusBadge(ps?.orderStatus)}
                      </div>
                    </div>

                    {/* Sales Rep & Quick Actions */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="text-[var(--color-text-secondary)] flex items-center gap-1.5">
                        <img
                          src={rep?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                          alt={rep?.fullName}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        <span className="truncate max-w-[130px]">{rep?.fullName || 'Unassigned'}</span>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {store.phone && (
                          <a
                            href={`tel:${store.phone}`}
                            onClick={() => triggerHaptic('light')}
                            className="p-1.5 rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition"
                            title="Call Store"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => openEditModal(store)}
                          className="p-1.5 rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition"
                          title="Edit Store"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => {
                            triggerHaptic('warning');
                            setDeletingStore(store);
                          }}
                          className="p-1.5 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition"
                          title="Delete Store"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => openDetailSheet(store)}
                          className="px-2.5 py-1 rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] text-[11px] font-bold hover:bg-[var(--color-border)] transition"
                        >
                          {language === 'lo' ? 'ເບິ່ງ / ອັບເດດ' : 'View'}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--color-surface-secondary)]/70 border-b border-[var(--color-border)] text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">{t.storeCode}</th>
                    <th className="py-3 px-4">{t.storeName}</th>
                    <th className="py-3 px-4">{t.channel}</th>
                    <th className="py-3 px-4">Order Status (Current Promo)</th>
                    <th className="py-3 px-4">{t.assignedSales}</th>
                    <th className="py-3 px-4">{t.city}</th>
                    <th className="py-3 px-4 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {paginatedStores.map((store) => {
                    const rep = salesMap.get(store.assignedSalesUser);
                    const ps = storePromoMap.get(store.id);

                    return (
                      <tr
                        key={store.id}
                        onClick={() => openDetailSheet(store)}
                        className="hover:bg-[var(--color-surface-secondary)]/50 transition cursor-pointer group"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-[var(--color-text-primary)]">
                          <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                            {store.storeCode}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">
                          {store.storeName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                            {store.channel}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(ps?.orderStatus)}
                        </td>
                        <td className="py-3 px-4">
                          {rep ? (
                            <div className="flex items-center gap-1.5">
                              <img
                                src={rep.avatarUrl}
                                alt={rep.fullName}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                              <span className="text-[var(--color-text-primary)] font-medium">
                                {rep.fullName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                          {store.city || 'Vientiane'}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {store.phone && (
                              <a
                                href={`tel:${store.phone}`}
                                onClick={() => triggerHaptic('light')}
                                className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-secondary)] transition"
                                title="Call Store"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => openDetailSheet(store)}
                              className="px-2 py-1 rounded-lg text-xs font-bold text-[var(--color-primary)] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                            >
                              Details
                            </motion.button>
                            {currentUser.role === 'admin' && (
                              <>
                                <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() => openEditModal(store)}
                                  className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-secondary)] transition"
                                  title="Edit Store"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </motion.button>
                                <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() => {
                                    triggerHaptic('warning');
                                    setDeletingStore(store);
                                  }}
                                  className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                                  title="Delete Store"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </motion.button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-3.5 bg-[var(--color-surface-secondary)]/50 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
              <span className="text-[11px]">
                {Math.min(filteredStores.length, (currentPage - 1) * itemsPerPage + 1)} -{' '}
                {Math.min(filteredStores.length, currentPage * itemsPerPage)} of {filteredStores.length}
              </span>

              <div className="flex items-center gap-1">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  disabled={currentPage <= 1}
                  onClick={() => {
                    triggerHaptic('light');
                    setCurrentPage((p) => Math.max(1, p - 1));
                  }}
                  className="p-1.5 rounded-lg border border-[var(--color-border)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-surface-secondary)] transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>
                <span className="px-2 font-bold text-[var(--color-text-primary)]">
                  {currentPage} / {totalPages}
                </span>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  disabled={currentPage >= totalPages}
                  onClick={() => {
                    triggerHaptic('light');
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                  }}
                  className="p-1.5 rounded-lg border border-[var(--color-border)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-surface-secondary)] transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </>
        )}

      </div>

      {/* Store Detail Bottom Sheet Modal */}
      <AnimatePresence>
        {detailStore && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl calm-card p-5 sm:p-6 shadow-2xl border border-[var(--color-border)] max-h-[92vh] overflow-y-auto space-y-4"
            >
              {/* Mobile grab handle */}
              <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-2 sm:hidden" />

              {/* Title & Close */}
              <div className="flex items-start justify-between pb-3 border-b border-[var(--color-border)]">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[var(--color-text-primary)] leading-tight">
                    <span className="font-mono text-sm font-black text-[var(--color-primary)] mr-2">
                      {detailStore.storeCode}
                    </span>
                    — {detailStore.storeName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-secondary)]">
                    <span>{detailStore.channel}</span>
                    <span>•</span>
                    <span>{detailStore.subChannel}</span>
                    <span>•</span>
                    <span>{detailStore.city || 'Vientiane Capital'}</span>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setDetailStore(null)}
                  className="p-1.5 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Quick Contact & Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {detailStore.phone && (
                  <a
                    href={`tel:${detailStore.phone}`}
                    onClick={() => triggerHaptic('light')}
                    className="p-2.5 rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center gap-2 font-bold text-[var(--color-primary)] hover:border-[var(--color-primary)] transition"
                  >
                    <Phone className="w-4 h-4 shrink-0" />
                    <span className="truncate">{detailStore.phone}</span>
                  </a>
                )}

                <div className="p-2.5 rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <User className="w-4 h-4 shrink-0 text-slate-400" />
                  <span className="truncate font-semibold text-[var(--color-text-primary)]">
                    {salesMap.get(detailStore.assignedSalesUser)?.fullName || 'Sales Rep'}
                  </span>
                </div>
              </div>

              {detailStore.address && (
                <div className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1.5 px-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{detailStore.address}</span>
                </div>
              )}

              {/* Order Tracking Section for Active Promotion */}
              <div className="p-4 rounded-3xl bg-[var(--color-surface-secondary)]/80 border border-[var(--color-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-[var(--color-primary)]" />
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">
                      {activePromo?.promotionName || 'Promotion Campaign'}
                    </span>
                  </div>
                  {getStatusBadge(orderStatusVal)}
                </div>

                {orderSuccessMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{orderSuccessMsg}</span>
                  </motion.div>
                )}

                <form onSubmit={handleSaveOrderStatus} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5">
                      {t.updateStatus}:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['Not Ordered', 'Follow-up Required', 'Ordered', 'Cancelled'] as OrderStatus[]).map((st) => (
                        <motion.button
                          key={st}
                          type="button"
                          whileTap={{ scale: 0.94 }}
                          onClick={() => {
                            triggerHaptic('light');
                            setOrderStatusVal(st);
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                            orderStatusVal === st
                              ? st === 'Ordered'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : st === 'Follow-up Required'
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                : 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs'
                              : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                          }`}
                        >
                          {st === 'Ordered'
                            ? t.statusOrdered
                            : st === 'Follow-up Required'
                            ? t.statusFollowUp
                            : st === 'Cancelled'
                            ? t.statusCancelled
                            : t.statusNotOrdered}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {orderStatusVal === 'Ordered' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
                        {t.orderAmount}
                      </label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="number"
                          value={orderAmountVal || ''}
                          onChange={(e) => setOrderAmountVal(Number(e.target.value))}
                          placeholder="e.g. 1,500,000 LAK"
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                        />
                      </div>
                    </motion.div>
                  )}

                  {orderStatusVal === 'Follow-up Required' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                          {t.nextFollowUpDate}
                        </label>
                        <input
                          type="date"
                          value={nextFollowUpVal}
                          onChange={(e) => setNextFollowUpVal(e.target.value)}
                          className="w-full p-2 text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] font-medium cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={autoTaskVal}
                          onChange={(e) => setAutoTaskVal(e.target.checked)}
                          className="rounded text-[var(--color-primary)] focus:ring-0"
                        />
                        <span>{t.autoCreateTask}</span>
                      </label>
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                      {t.remark}
                    </label>
                    <textarea
                      rows={2}
                      value={remarkVal}
                      onChange={(e) => setRemarkVal(e.target.value)}
                      placeholder="Sales notes, promo package interested, manager contacts..."
                      className="w-full p-2 text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      type="submit"
                      disabled={isUpdatingOrder}
                      className="flex-1 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{language === 'lo' ? 'ບັນທຶກສະຖານະການສັ່ງຊື້' : 'Save Order Status'}</span>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      type="button"
                      onClick={handleQuickAddTaskForStore}
                      className="py-2 px-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs font-bold hover:bg-[var(--color-surface-secondary)] transition flex items-center gap-1"
                      title="Add To-Do Task"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      <span className="hidden xs:inline">+ Task</span>
                    </motion.button>
                  </div>
                </form>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    triggerHaptic('warning');
                    setDeletingStore(detailStore);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-rose-500/30 text-xs font-bold text-rose-600 bg-rose-500/5 hover:bg-rose-500/10 transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.deleteStore}</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    openEditModal(detailStore);
                    setDetailStore(null);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t.editStore}</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Store Sheet */}
      <AnimatePresence>
        {(isAddModalOpen || editingStore) && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl calm-card p-5 sm:p-6 shadow-2xl border border-[var(--color-border)] max-h-[90vh] overflow-y-auto"
            >
              <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-3 sm:hidden" />

              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  {editingStore ? t.editStore : t.addStore}
                </h3>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingStore(null);
                  }}
                  className="p-1 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
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

              <form onSubmit={handleSaveStore} className="space-y-3.5 pt-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                      {t.storeCode} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.storeCode}
                      onChange={(e) => setFormData({ ...formData, storeCode: e.target.value })}
                      placeholder="e.g. STR-VTE-099"
                      className="w-full text-xs font-mono uppercase rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                      {t.channel}
                    </label>
                    <select
                      value={formData.channel}
                      onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                      className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                    >
                      <option value="Modern Trade">Modern Trade</option>
                      <option value="General Trade">General Trade</option>
                      <option value="Convenience Store (CVS)">CVS</option>
                      <option value="Wholesale">Wholesale</option>
                      <option value="HORECA">HORECA</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    {t.storeName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    placeholder="e.g. Vientiane Mart Dongdok"
                    className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                      {t.subChannel}
                    </label>
                    <input
                      type="text"
                      value={formData.subChannel}
                      onChange={(e) => setFormData({ ...formData, subChannel: e.target.value })}
                      placeholder="e.g. Supermarket"
                      className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                      {t.assignedSales}
                    </label>
                    <select
                      value={formData.assignedSalesUser}
                      onChange={(e) => setFormData({ ...formData, assignedSalesUser: e.target.value })}
                      className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                    >
                      {salesReps.map((r) => (
                        <option key={r.id} value={r.id}>{r.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                      {t.phone}
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+856 20 ..."
                      className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                      {t.city}
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Vientiane Capital"
                      className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    {t.address}
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Village, District"
                    className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingStore(null);
                    }}
                    className="px-4 py-2.5 rounded-2xl text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] transition"
                  >
                    {t.cancel}
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.94 }}
                    className="px-5 py-2.5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold shadow-xs transition"
                  >
                    {t.save}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingStore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl calm-card p-6 shadow-2xl border border-rose-500/30"
            >
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 mx-auto mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <h3 className="text-sm font-bold text-[var(--color-text-primary)] text-center">
                {t.deleteStore}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] text-center mt-1">
                {t.confirmDeleteStore} <strong className="text-[var(--color-text-primary)]">{deletingStore.storeName}</strong> ({deletingStore.storeCode})?
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-xl mt-3 text-center">
                {t.deleteWarning}
              </p>

              <div className="flex items-center gap-2 mt-5">
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setDeletingStore(null)}
                  className="flex-1 py-2.5 rounded-2xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition"
                >
                  {t.cancel}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={handleDeleteStore}
                  className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition"
                >
                  {t.delete}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Floating Action Button (FAB) for adding new store */}
      <div className="lg:hidden fixed bottom-20 right-4 z-30 pointer-events-auto">
        <motion.button
          whileTap={{ scale: 0.86 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          onClick={openAddModal}
          className="w-13 h-13 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white shadow-lg shadow-emerald-950/25 flex items-center justify-center border-2 border-white/20 active:shadow-sm"
          aria-label="Add new retail store"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </motion.button>
      </div>

    </div>
  );
};
