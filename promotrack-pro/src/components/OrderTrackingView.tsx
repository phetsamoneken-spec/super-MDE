import { LaoDatePicker } from './LaoDatePicker';
import { purchaseTone } from '../utils/purchaseTone';
import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Calendar,
  DollarSign,
  History,
  FileText,
  User,
  ArrowRight,
  Download,
  X,
  Sparkles,
  Phone
} from 'lucide-react';
import { Promotion, Store, PromotionStore, OrderStatusHistory, UserProfile, Language, OrderStatus } from '../types';
import { translations } from '../i18n/translations';
import { dataService } from '../services/dataService';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface OrderTrackingViewProps {
  promotions: Promotion[];
  stores: Store[];
  promoStores: PromotionStore[];
  salesReps: UserProfile[];
  currentUser: UserProfile;
  language: Language;
  initialPromotionId?: string;
  onRefreshData: () => void;
  onNavigateTab: (tab: 'dashboard' | 'stores' | 'promotions' | 'tasks' | 'excel') => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  promotions,
  stores,
  promoStores,
  salesReps,
  currentUser,
  language,
  initialPromotionId,
  onRefreshData,
  onNavigateTab
}) => {
  const t = translations[language];

  // Filters
  const [selectedPromoId, setSelectedPromoId] = useState<string>(
    initialPromotionId || promotions[0]?.id || 'all'
  );
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSubChannel, setSelectedSubChannel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Status update modal
  const [updatingRecord, setUpdatingRecord] = useState<PromotionStore | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>('Not Ordered');
  const [orderAmount, setOrderAmount] = useState<number>(0);
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [lastFollowUpDate, setLastFollowUpDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>(
    new Date(Date.now() + 3 * 86400000).toISOString().substring(0, 10)
  );
  const [remark, setRemark] = useState('');
  const [autoCreateTask, setAutoCreateTask] = useState(true);

  // Audit history modal
  const [viewingAuditStoreId, setViewingAuditStoreId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<OrderStatusHistory[]>([]);

  // Maps
  const storeMap = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const promoMap = useMemo(() => new Map(promotions.map((p) => [p.id, p])), [promotions]);
  const userMap = useMemo(() => new Map(dataService.getAllUsers().map((u) => [u.id, u.fullName])), []);

  // Unique Sub-Channels from stores
  const allSubChannels = useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s) => {
      if (s.subChannel) set.add(s.subChannel);
    });
    return Array.from(set).sort();
  }, [stores]);

  // Filtered tracking list
  const filteredRecords = useMemo(() => {
    return promoStores.filter((ps) => {
      const store = storeMap.get(ps.storeId);
      if (!store) return false;

      // Promotion Filter
      if (selectedPromoId !== 'all' && ps.promotionId !== selectedPromoId) return false;
      // Sub-Channel Filter
      if (selectedSubChannel !== 'all' && store.subChannel !== selectedSubChannel) return false;
      // Status Filter
      if (selectedStatus !== 'all' && ps.orderStatus !== selectedStatus) return false;
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const codeMatch = store.storeCode.toLowerCase().includes(q);
        const nameMatch = store.storeName.toLowerCase().includes(q);
        const remarkMatch = (ps.remark || '').toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !remarkMatch) return false;
      }

      return true;
    });
  }, [promoStores, storeMap, selectedPromoId, selectedSubChannel, selectedStatus, searchQuery]);

  // Open status modal
  const openStatusModal = (record: PromotionStore) => {
    triggerHaptic('medium');
    setUpdatingRecord(record);
    setNewStatus(record.orderStatus);
    setOrderAmount(record.orderAmount || 0);
    setOrderDate(record.orderDate ? record.orderDate.substring(0, 10) : new Date().toISOString().substring(0, 10));
    setLastFollowUpDate(
      record.lastFollowUpDate ? record.lastFollowUpDate.substring(0, 10) : new Date().toISOString().substring(0, 10)
    );
    setNextFollowUpDate(
      record.nextFollowUpDate
        ? record.nextFollowUpDate.substring(0, 10)
        : new Date(Date.now() + 3 * 86400000).toISOString().substring(0, 10)
    );
    setRemark(record.remark || '');
    setAutoCreateTask(true);
  };

  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingRecord) return;

    const res = dataService.updateOrderStatus({
      promotionStoreId: updatingRecord.id,
      newStatus,
      orderDate: newStatus === 'Ordered' ? new Date(orderDate).toISOString() : undefined,
      orderAmount: newStatus === 'Ordered' ? Number(orderAmount) : 0,
      lastFollowUpDate: newStatus === 'Follow-up Required' ? new Date(lastFollowUpDate).toISOString() : undefined,
      nextFollowUpDate: newStatus === 'Follow-up Required' ? new Date(nextFollowUpDate).toISOString() : undefined,
      remark,
      createAutoTask: currentUser.role==='admin'&&autoCreateTask,
      taskDueDate: new Date(nextFollowUpDate).toISOString(),
      taskPriority: 'High'
    });

    if (!res.success) {
      triggerHaptic('warning');
      alert(res.error);
      return;
    }

    if (newStatus === 'Ordered') {
      triggerHaptic('success');
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {
        // safe
      }
    } else {
      triggerHaptic('light');
    }

    setUpdatingRecord(null);
    onRefreshData();
  };

  // Open audit history drawer
  const openAuditHistory = (storeId: string, promotionId: string) => {
    triggerHaptic('light');
    setViewingAuditStoreId(storeId);
    const logs = dataService.getAuditLogs(storeId, promotionId);
    setAuditLogs(logs);
  };

  const currentPromo = selectedPromoId !== 'all' ? promoMap.get(selectedPromoId) : undefined;

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t.orderTrackingTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {currentPromo ? currentPromo.promotionName : t.orderTrackingSubtitle}
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            triggerHaptic('light');
            dataService.exportPromotionResultsToExcel(selectedPromoId !== 'all' ? selectedPromoId : undefined);
          }}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 transition shadow-xs"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600" />
          <span>{language === 'lo' ? 'ສົ່ງອອກ Excel' : 'Export Tracking (.xlsx)'}</span>
        </motion.button>
      </div>

      {/* Filters */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-3xl shadow-sm space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          
          {/* Promotion Selector */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
              {language === 'lo' ? 'ເລືອກໂປຣໂມຊັ່ນ' : 'Select Promotion'}
            </label>
            <select
              value={selectedPromoId}
              onChange={(e) => {
                triggerHaptic('light');
                setSelectedPromoId(e.target.value);
              }}
              className="w-full text-xs font-semibold rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">{language === 'lo' ? 'ທຸກໂປຣໂມຊັ່ນ' : 'All Promotions'}</option>
              {promotions.map((p) => (
                <option key={p.id} value={p.id}>{p.promotionName}</option>
              ))}
            </select>
          </div>

          {/* Sub-Channel Filter (Specific Request) */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
              {language === 'lo' ? 'ເລືອກ Sub-Channel' : 'Sub-Channel'}
            </label>
            <select
              value={selectedSubChannel}
              onChange={(e) => {
                triggerHaptic('light');
                setSelectedSubChannel(e.target.value);
              }}
              className="w-full text-xs font-semibold rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">{language === 'lo' ? '— ທຸກ Sub-Channels —' : '— All Sub-Channels —'}</option>
              {allSubChannels.map((subCh) => (
                <option key={subCh} value={subCh}>{subCh}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
              {language === 'lo' ? 'ສະຖານະການສັ່ງຊື້' : 'Order Status'}
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                triggerHaptic('light');
                setSelectedStatus(e.target.value);
              }}
              className="w-full text-xs font-semibold rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">{t.allStatuses}</option>
              <option value="Not Ordered">{t.statusNotOrdered}</option>
              <option value="Follow-up Required">{t.statusFollowUp}</option>
              <option value="Ordered">{t.statusOrdered}</option>
              <option value="Cancelled">{t.statusCancelled}</option>
            </select>
          </div>

          {/* Search Store */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
              {language === 'lo' ? 'ຄົ້ນຫາຮ້ານຄ້າ' : 'Search Outlet'}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'lo' ? 'ຄົ້ນຫາລະຫັດ, ຊື່, ໝາຍເຫດ...' : 'Search code, name, remark...'}
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Tracking Table / Mobile Cards */}
      <div className="glass-panel rounded-3xl shadow-sm overflow-hidden border border-slate-200/60 dark:border-slate-800/80">
        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-600" />
            <p className="text-sm font-semibold">{language === 'lo' ? 'ບໍ່ພົບລາຍການຕິດຕາມ' : 'No order tracking records found.'}</p>
          </div>
        ) : (
          <>
            {/* Mobile Touch Cards View (Ergonomic for phones) */}
            <div className="md:hidden divide-y divide-slate-200/70 dark:divide-slate-800/70">
              {filteredRecords.map((record) => {
                const store = storeMap.get(record.storeId);
                const promo = promoMap.get(record.promotionId);
                if (!store) return null;

                return (
                  <motion.div
                    key={record.id}
                    whileTap={{ scale: 0.985 }}
                    className="p-4 space-y-2.5 transition bg-white/40 dark:bg-slate-900/40"
                  >
                    {/* Top Row: Store Code & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {store.storeCode}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                          {store.storeName}
                        </h4>
                      </div>

                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 ${
                        record.orderStatus === 'Ordered'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40'
                          : record.orderStatus === 'Follow-up Required'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40 animate-pulse'
                          : record.orderStatus === 'Cancelled'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200 border border-orange-400'
                      }`}>
                        {record.orderStatus === 'Ordered' && <CheckCircle2 className="w-3 h-3" />}
                        {record.orderStatus === 'Follow-up Required' && <AlertCircle className="w-3 h-3" />}
                        {record.orderStatus === 'Not Ordered' && <Clock className="w-3 h-3" />}
                        <span>{record.orderStatus}</span>
                      </span>
                    </div>

                    {/* Promo name & channel tag */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-medium truncate max-w-[200px]">
                        {promo?.promotionName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold">
                        {store.channel}
                      </span>
                    </div>

                    {/* Order Info or Follow-up Dates */}
                    {record.orderStatus === 'Ordered' ? (
                      <div className="p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                          {language === 'lo' ? 'ມູນຄ່າສັ່ງຊື້:' : 'Amount:'}
                        </span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {(record.orderAmount || 0).toLocaleString()} LAK
                        </span>
                      </div>
                    ) : record.orderStatus === 'Follow-up Required' ? (
                      <div className="p-2.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs">
                        <span className="font-semibold text-amber-800 dark:text-amber-300">
                          {language === 'lo' ? 'ນັດຕິດຕາມຕໍ່ໄປ:' : 'Next follow-up:'}
                        </span>
                        <span className="font-bold text-amber-700 dark:text-amber-300">
                          {record.nextFollowUpDate ? record.nextFollowUpDate.substring(0, 10) : 'Pending'}
                        </span>
                      </div>
                    ) : null}

                    {record.remark && (
                      <p className="text-[11px] text-slate-500 italic">
                        "{record.remark}"
                      </p>
                    )}

                    {/* Mobile Bottom Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      {store.phone && (
                        <a
                          href={`tel:${store.phone}`}
                          onClick={() => triggerHaptic('light')}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 flex items-center justify-center transition"
                          title="Call Outlet"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}

                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => openStatusModal(record)}
                        className="flex-1 py-2 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t.updateStatus}</span>
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => openAuditHistory(record.storeId, record.promotionId)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
                      >
                        <History className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/60 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Store</th>
                    <th className="py-3 px-4">Promotion</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Order / Follow-up</th>
                    <th className="py-3 px-4">Notes & Remarks</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {filteredRecords.map((record) => {
                    const store = storeMap.get(record.storeId);
                    const promo = promoMap.get(record.promotionId);
                    if (!store) return null;

                    return (
                      <tr
                        key={record.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {store.storeCode}
                          </div>
                          <div className="font-semibold text-slate-700 dark:text-slate-300">
                            {store.storeName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {store.channel} • {store.city}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {promo?.promotionName || 'Promotion'}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            record.orderStatus === 'Ordered'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40'
                              : record.orderStatus === 'Follow-up Required'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40 animate-pulse'
                              : record.orderStatus === 'Cancelled'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200 border border-orange-400'
                          }`}>
                            {record.orderStatus === 'Ordered' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {record.orderStatus === 'Follow-up Required' && <AlertCircle className="w-3.5 h-3.5" />}
                            {record.orderStatus === 'Not Ordered' && <Clock className="w-3.5 h-3.5" />}
                            <span>{record.orderStatus}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {record.orderStatus === 'Ordered' ? (
                            <div>
                              <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {(record.orderAmount || 0).toLocaleString()} LAK
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Ordered: {record.orderDate ? record.orderDate.substring(0, 10) : 'Recent'}
                              </div>
                            </div>
                          ) : record.orderStatus === 'Follow-up Required' ? (
                            <div>
                              <div className="text-amber-600 font-semibold">
                                Next: {record.nextFollowUpDate ? record.nextFollowUpDate.substring(0, 10) : 'Pending'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Last visit: {record.lastFollowUpDate ? record.lastFollowUpDate.substring(0, 10) : 'N/A'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">No order placed</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs">
                          <p className="line-clamp-2 italic text-[11px]">
                            {record.remark || '—'}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              onClick={() => openStatusModal(record)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-xs"
                            >
                              {t.updateStatus}
                            </motion.button>

                            <motion.button
                              whileTap={{ scale: 0.88 }}
                              onClick={() => openAuditHistory(record.storeId, record.promotionId)}
                              title={t.auditHistory}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              <History className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Update Order Status Bottom Sheet Modal on mobile / Dialog on desktop */}
      <AnimatePresence>
        {updatingRecord && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl glass-panel p-5 sm:p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              {/* Drag bar for mobile visual */}
              <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />

              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t.updateStatus}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {storeMap.get(updatingRecord.storeId)?.storeName} ({storeMap.get(updatingRecord.storeId)?.storeCode})
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setUpdatingRecord(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <form onSubmit={handleSaveStatus} className="space-y-4 pt-4">
                
                {/* Status Radio options with tactile motion */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {language === 'lo' ? 'ເລືອກສະຖານະການສັ່ງຊື້ *' : 'Order Status *'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Not Ordered', 'Follow-up Required', 'Ordered', 'Cancelled'] as OrderStatus[]).map((st) => (
                      <motion.button
                        key={st}
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => {
                          triggerHaptic('light');
                          setNewStatus(st);
                        }}
                        className={`p-2.5 rounded-2xl text-xs font-bold border text-left transition flex items-center justify-between ${
                          newStatus === st
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{st}</span>
                        {newStatus === st && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Dynamic Inputs when status is Ordered */}
                {newStatus === 'Ordered' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-3"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {t.orderAmount} *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        value={orderAmount}
                        onChange={(e) => setOrderAmount(Number(e.target.value))}
                        placeholder="e.g. 15000000"
                        className="w-full text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {t.orderDate}
                      </label>
                      <LaoDatePicker aria-label={t.orderDate}
                        type="date"
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                        className="w-full text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Dynamic Inputs when status is Follow-up Required */}
                {newStatus === 'Follow-up Required' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t.lastFollowUpDate}
                        </label>
                        <LaoDatePicker aria-label={t.lastFollowUpDate}
                          type="date"
                          value={lastFollowUpDate}
                          onChange={(e) => setLastFollowUpDate(e.target.value)}
                          className="w-full text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2 outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t.nextFollowUpDate} *
                        </label>
                        <LaoDatePicker aria-label={t.nextFollowUpDate}
                          type="date"
                          required
                          value={nextFollowUpDate}
                          onChange={(e) => setNextFollowUpDate(e.target.value)}
                          className="w-full text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2 outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    {currentUser.role==='admin'&&(<label className="flex items-start gap-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoCreateTask}
                        onChange={(e) => setAutoCreateTask(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-tight">
                        {t.autoCreateTask}
                      </span>
                    </label>)}
                  </motion.div>
                )}

                {/* Remark */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.remark}
                  </label>
                  <textarea
                    rows={3}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="Sales notes, feedback from store buyer..."
                    className="w-full text-xs rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setUpdatingRecord(null)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    {t.cancel}
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.94 }}
                    className={`order-confirm-button order-submit-button ${purchaseTone(newStatus)}`}
                  >
                    <CheckCircle2 size={18}/>{newStatus==='Ordered'?(language==='lo'?'ຢືນຢັນການສັ່ງຊື້':'Confirm purchase'):(language === 'lo' ? 'ຢືນຢັນອັບເດດ' : 'Confirm update')}
                  </motion.button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Audit History Drawer / Modal */}
      <AnimatePresence>
        {viewingAuditStoreId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-3xl glass-panel p-6 shadow-2xl dark:bg-slate-900 flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t.auditHistoryTitle}
                  </h3>
                </div>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setViewingAuditStoreId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-1">
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">{t.noHistory}</p>
                ) : (
                  auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {log.oldStatus ? `${log.oldStatus} → ` : ''}{log.newStatus}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                        {log.notes || 'Status updated'}
                      </p>

                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        By: {userMap.get(log.changedBy) || 'System Admin'}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewingAuditStoreId(null)}
                  className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
                >
                  Close Log
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
