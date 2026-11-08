import { LaoDatePicker } from './LaoDatePicker';
import { purchaseTone } from '../utils/purchaseTone';
import { CampaignImage } from './CampaignImage';
import React, { useState, useMemo, useRef } from 'react';
import {
  Sparkles,
  PackagePlus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
  DollarSign,
  Layers,
  Edit2,
  Trash2,
  UploadCloud,
  X,
  AlertTriangle,
  ArrowRight,
  Store,
  FileText,
  Calendar,
  Gift,
  Check,
  Building2,
  CheckSquare
} from 'lucide-react';
import {
  NewProductLaunch,
  NewProductStoreOrder,
  NewProductStatus,
  NewProductOrderStatus,
  Store as StoreType,
  UserProfile,
  Language
} from '../types';
import { translations } from '../i18n/translations';
import { dataService } from '../services/dataService';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface NewProductsViewProps {
  initialProductId?: string;
  initialStoreId?: string;
  onManageSubChannels: () => void;
  newProducts: NewProductLaunch[];
  storeOrders: NewProductStoreOrder[];
  stores: StoreType[];
  currentUser: UserProfile;
  language: Language;
  onRefreshData: () => void;
  onNavigateTab: (tab: string) => void;
}

const PRESET_PRODUCT_IMAGES = [''];

export const NewProductsView: React.FC<NewProductsViewProps> = ({
  initialProductId,
  initialStoreId,
  onManageSubChannels,
  newProducts,
  storeOrders,
  stores,
  currentUser,
  language,
  onRefreshData,
  onNavigateTab
}) => {
  const t = translations[language];
  const isAdmin = currentUser.role === 'admin';

  // Primary view tabs: 'catalog' (ລາຍການສິນຄ້າໃໝ່) vs 'tracking' (ຕິດຕາມການສັ່ງຊື້)
  const [activeViewTab, setActiveViewTab] = useState<'catalog' | 'tracking'>(initialProductId ? 'tracking' : 'catalog');

  // Filters for Catalog
  const [productStatusFilter, setProductStatusFilter] = useState<'All' | NewProductStatus>('All');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Filters for Order Tracking
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || 'all');
  const [focusedStoreId, setFocusedStoreId] = useState(initialStoreId || 'all');
  const [subChannelFilter, setSubChannelFilter] = useState<string>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [trackingSearch, setTrackingSearch] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<NewProductLaunch | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<NewProductLaunch | null>(null);

  // Sub-Channel Assign Stores Modal
  const [assigningProduct, setAssigningProduct] = useState<NewProductLaunch | null>(null);
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [assignSubChannelFilter, setAssignSubChannelFilter] = useState<string>('all');
  const [assignSearchQuery, setAssignSearchQuery] = useState('');

  // Status Update Modal
  const [updatingOrder, setUpdatingOrder] = useState<NewProductStoreOrder | null>(null);
  const [updatingStore, setUpdatingStore] = useState<StoreType | null>(null);
  const [updatingProductItem, setUpdatingProductItem] = useState<NewProductLaunch | null>(null);

  const [orderFormStatus, setOrderFormStatus] = useState<NewProductOrderStatus>('Not Ordered');
  const [orderFormQuantity, setOrderFormQuantity] = useState<number>(0);
  const [orderFormAmount, setOrderFormAmount] = useState<number>(0);
  const [orderFormDate, setOrderFormDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [orderFormInvoice, setOrderFormInvoice] = useState<string>('');
  const [sampleQty, setSampleQty] = useState<number>(4);
  const [sampleGivenDate, setSampleGivenDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [customerFeedback, setCustomerFeedback] = useState<string>('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>(
    new Date(Date.now() + 3 * 86400000).toISOString().substring(0, 10)
  );
  const [autoCreateTask, setAutoCreateTask] = useState<boolean>(true);
  const [orderError, setOrderError] = useState('');

  // Create/Edit Product Form
  const [formData, setFormData] = useState({
    productName: '',
    sku: '',
    category: 'Beverages',
    launchDate: new Date().toISOString().substring(0, 10),
    endDate: new Date(Date.now() + 60 * 86400000).toISOString().substring(0, 10),
    packSize: '24 units / carton',
    unitPrice: 12000,
    targetDistributionRate: 80,
    targetUnitsPerStore: 24,
    description: '',
    imageUrl: PRESET_PRODUCT_IMAGES[0],
    status: 'Active' as NewProductStatus,
    targetSubChannels: [] as string[]
  });
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Maps
  const storeMap = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const productMap = useMemo(() => new Map(newProducts.map((p) => [p.id, p])), [newProducts]);

  // Include registered Sub-channels even before their first store is assigned.
  const allSubChannels = (() => {
    const set = new Set(dataService.getSubChannels().map((item) => item.name));
    stores.forEach((s) => {
      if (s.subChannel) set.add(s.subChannel);
    });
    return Array.from(set).sort();
  })();

  // Sub-Channel stats for batch assignment
  const subChannelAssignStats = useMemo(() => {
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

  // Filtered Products Catalog
  const filteredProducts = useMemo(() => {
    return newProducts.filter((p) => {
      if (productStatusFilter !== 'All' && p.status !== productStatusFilter) return false;
      if (catalogSearch) {
        const q = catalogSearch.toLowerCase();
        const matchesName = p.productName.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesCat = p.category.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesCat) return false;
      }
      return true;
    });
  }, [newProducts, productStatusFilter, catalogSearch]);

  // Filtered Store Orders for Tracking
  const filteredOrders = useMemo(() => {
    return storeOrders.filter((order) => {
      const store = storeMap.get(order.storeId);
      if (!store) return false;

      if (focusedStoreId !== 'all' && order.storeId !== focusedStoreId) return false;
      if (selectedProductId !== 'all' && order.productId !== selectedProductId) return false;
      if (subChannelFilter !== 'all' && store.subChannel !== subChannelFilter) return false;
      if (orderStatusFilter !== 'all' && order.orderStatus !== orderStatusFilter) return false;

      if (trackingSearch) {
        const q = trackingSearch.toLowerCase();
        const matchesStoreName = store.storeName.toLowerCase().includes(q);
        const matchesStoreCode = store.storeCode.toLowerCase().includes(q);
        const matchesFeedback = (order.customerFeedback || '').toLowerCase().includes(q);
        if (!matchesStoreName && !matchesStoreCode && !matchesFeedback) return false;
      }

      return true;
    });
  }, [storeOrders, storeMap, focusedStoreId, selectedProductId, subChannelFilter, orderStatusFilter, trackingSearch]);

  // Aggregate stats for New Products
  const overallStats = useMemo(() => {
    const totalOrdered = storeOrders.filter((o) => o.orderStatus === 'Ordered');
    const totalSamples = storeOrders.filter((o) => o.orderStatus === 'Sample Provided');
    const totalFollowUp = storeOrders.filter((o) => o.orderStatus === 'Follow-up Required');
    const totalUnits = totalOrdered.reduce((acc, o) => acc + (o.orderQuantity || 0), 0);
    const totalAmount = totalOrdered.reduce((acc, o) => acc + (o.orderAmount || 0), 0);

    const penetrationRate = storeOrders.length > 0
      ? Math.round((totalOrdered.length / storeOrders.length) * 100)
      : 0;

    return {
      activeProductsCount: newProducts.filter((p) => p.status === 'Active').length,
      totalStoreAssignments: storeOrders.length,
      orderedCount: totalOrdered.length,
      samplesCount: totalSamples.length,
      followUpCount: totalFollowUp,
      totalUnits,
      totalAmount,
      penetrationRate
    };
  }, [newProducts, storeOrders]);

  // Handle open create modal
  const openCreateModal = () => {
    triggerHaptic('medium');
    setFormData({
      productName: '',
      sku: `NPD-${Date.now().toString(36).substring(3, 7).toUpperCase()}`,
      category: 'Beverages',
      launchDate: new Date().toISOString().substring(0, 10),
      endDate: new Date(Date.now() + 60 * 86400000).toISOString().substring(0, 10),
      packSize: '24 units / carton',
      unitPrice: 12000,
      targetDistributionRate: 80,
      targetUnitsPerStore: 24,
      description: '',
      imageUrl: PRESET_PRODUCT_IMAGES[0],
      status: 'Active',
      targetSubChannels: []
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Handle open edit modal
  const openEditModal = (product: NewProductLaunch) => {
    triggerHaptic('light');
    setEditingProduct(product);
    setFormData({
      productName: product.productName,
      sku: product.sku,
      category: product.category,
      launchDate: product.launchDate,
      endDate: product.endDate || new Date(Date.now() + 60 * 86400000).toISOString().substring(0, 10),
      packSize: product.packSize,
      unitPrice: product.unitPrice,
      targetDistributionRate: product.targetDistributionRate,
      targetUnitsPerStore: product.targetUnitsPerStore,
      description: product.description,
      imageUrl: product.imageUrl || PRESET_PRODUCT_IMAGES[0],
      status: product.status,
      targetSubChannels: product.targetSubChannels || []
    });
    setFormError('');
  };

  // Save Product (Create / Update)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (!formData.sku.trim()) {
      setFormError('SKU code is required.');
      return;
    }

    triggerHaptic('medium');

    if (editingProduct) {
      const res = dataService.updateNewProduct(editingProduct.id, {
        productName: formData.productName.trim(),
        sku: formData.sku.trim(),
        category: formData.category,
        launchDate: formData.launchDate,
        endDate: formData.endDate,
        packSize: formData.packSize,
        unitPrice: Number(formData.unitPrice),
        targetDistributionRate: Number(formData.targetDistributionRate),
        targetUnitsPerStore: Number(formData.targetUnitsPerStore),
        description: formData.description,
        imageUrl: formData.imageUrl,
        status: formData.status,
        targetSubChannels: formData.targetSubChannels
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to update product.');
        return;
      }
      setEditingProduct(null);
    } else {
      const res = dataService.createNewProduct({
        productName: formData.productName.trim(),
        sku: formData.sku.trim(),
        category: formData.category,
        launchDate: formData.launchDate,
        endDate: formData.endDate,
        packSize: formData.packSize,
        unitPrice: Number(formData.unitPrice),
        targetDistributionRate: Number(formData.targetDistributionRate),
        targetUnitsPerStore: Number(formData.targetUnitsPerStore),
        description: formData.description,
        imageUrl: formData.imageUrl,
        status: formData.status,
        targetSubChannels: formData.targetSubChannels
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to create product.');
        return;
      }

      // Automatically enroll stores from selected target sub-channels if selected
      if (res.product && formData.targetSubChannels.length > 0) {
        const targetSubSet = new Set(formData.targetSubChannels);
        const matchingStoreIds = stores
          .filter((s) => targetSubSet.has(s.subChannel))
          .map((s) => s.id);
        if (matchingStoreIds.length > 0) {
          dataService.assignStoresToNewProduct(res.product.id, matchingStoreIds);
        }
      }

      setIsCreateModalOpen(false);
    }

    onRefreshData();
  };

  // Open Sub-Channel Store Assignment Modal
  const openAssignModal = (product: NewProductLaunch) => {
    triggerHaptic('light');
    setAssigningProduct(product);
    const assignedStores = storeOrders
      .filter((o) => o.productId === product.id)
      .map((o) => o.storeId);
    setSelectedStoreIds(new Set(assignedStores));
    setAssignSubChannelFilter('all');
    setAssignSearchQuery('');
  };

  // Toggle selection for all stores in a Sub-Channel
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

  // Toggle single store in assignment modal
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

  // Save Store Assignments
  const handleSaveAssignments = () => {
    triggerHaptic('medium');
    if (!assigningProduct) return;
    const storeIdsArray = Array.from(selectedStoreIds);
    dataService.assignStoresToNewProduct(assigningProduct.id, storeIdsArray);
    setAssigningProduct(null);
    onRefreshData();
  };

  // Open Update Order Modal
  const openUpdateOrderModal = (order: NewProductStoreOrder) => {
    triggerHaptic('medium');
    const store = storeMap.get(order.storeId) || null;
    const product = productMap.get(order.productId) || null;

    setOrderError('');
    setUpdatingOrder(order);
    setUpdatingStore(store);
    setUpdatingProductItem(product);

    setOrderFormStatus(order.orderStatus);
    setOrderFormQuantity(order.orderQuantity || (product?.targetUnitsPerStore || 24));
    setOrderFormAmount(
      order.orderAmount ||
        (order.orderQuantity || (product?.targetUnitsPerStore || 24)) * (product?.unitPrice || 10000)
    );
    setOrderFormDate(order.orderDate ? order.orderDate.substring(0, 10) : new Date().toISOString().substring(0, 10));
    setOrderFormInvoice(order.invoiceNumber || `INV-${Date.now().toString(36).substring(3, 7).toUpperCase()}`);
    setSampleQty(order.sampleQty || 4);
    setSampleGivenDate(
      order.sampleGivenDate ? order.sampleGivenDate.substring(0, 10) : new Date().toISOString().substring(0, 10)
    );
    setCustomerFeedback(order.customerFeedback || '');
    setNextFollowUpDate(
      order.nextFollowUpDate
        ? order.nextFollowUpDate.substring(0, 10)
        : new Date(Date.now() + 3 * 86400000).toISOString().substring(0, 10)
    );
    setAutoCreateTask(true);
  };

  // Save Updated Order Status
  const handleSaveOrderStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingOrder) return;

    triggerHaptic('medium');

    const res = dataService.updateNewProductOrderStatus({
      orderId: updatingOrder.id,
      productId: updatingOrder.productId,
      storeId: updatingOrder.storeId,
      newStatus: orderFormStatus,
      orderQuantity: orderFormStatus === 'Ordered' ? Number(orderFormQuantity) : undefined,
      orderAmount: orderFormStatus === 'Ordered' ? Number(orderFormAmount) : undefined,
      orderDate: orderFormStatus === 'Ordered' ? new Date(orderFormDate).toISOString() : undefined,
      invoiceNumber: orderFormStatus === 'Ordered' ? orderFormInvoice : undefined,
      sampleQty: orderFormStatus === 'Sample Provided' ? Number(sampleQty) : undefined,
      sampleGivenDate: orderFormStatus === 'Sample Provided' ? new Date(sampleGivenDate).toISOString() : undefined,
      customerFeedback: customerFeedback.trim() || undefined,
      nextFollowUpDate:
        orderFormStatus === 'Follow-up Required' || orderFormStatus === 'Sample Provided'
          ? new Date(nextFollowUpDate).toISOString()
          : undefined,
      createAutoTask: currentUser.role==='admin'&&autoCreateTask
    });

    if (!res.success) { setOrderError(res.error || (language==='lo'?'ບັນທຶກບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່.':'Could not save this order. Please retry.')); return; }
    if (orderFormStatus === 'Ordered') {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch {
        // ignore
      }
    }

    setUpdatingOrder(null);
    onRefreshData();
  };

  // Image Upload handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert(language === 'lo' ? 'ໄຟລ໌ຮູບພາບໃຫຍ່ເກີນໄປ (ສູງສຸດ 3MB)' : 'Image is too large (max 3MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormData((prev) => ({ ...prev, imageUrl: dataUrl }));
      triggerHaptic('success');
    };
    reader.readAsDataURL(file);
  };

  // Filtered stores inside Assignment Modal
  const filteredStoresForAssign = useMemo(() => {
    return stores.filter((s) => {
      if (assignSubChannelFilter !== 'all' && s.subChannel !== assignSubChannelFilter) return false;
      if (assignSearchQuery) {
        const q = assignSearchQuery.toLowerCase();
        const matchesName = s.storeName.toLowerCase().includes(q);
        const matchesCode = s.storeCode.toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }
      return true;
    });
  }, [stores, assignSubChannelFilter, assignSearchQuery]);

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
              {language === 'lo' ? 'ຕິດຕາມການສັ່ງຊື້ສິນຄ້າໃໝ່' : 'New Product Launch Orders'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-[var(--color-primary)] border border-emerald-500/20">
              NPD Tracker
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            {language === 'lo'
              ? 'ຕິດຕາມການກະຈາຍສິນຄ້າໃໝ່, ລົງຕົວຢ່າງ ແລະ ການສັ່ງຊື້ຕາມ Sub-Channel'
              : 'Track store distribution, sampling, and orders by Sub-Channel'}
          </p>
        </div>

        {/* View Switcher Tabs (Catalog vs Order Tracking) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-[var(--color-surface-secondary)] p-1 rounded-2xl flex items-center gap-1 border border-[var(--color-border)]">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                triggerHaptic('light');
                setActiveViewTab('catalog');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeViewTab === 'catalog'
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>{language === 'lo' ? 'ສິນຄ້າໃໝ່' : 'Products'}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                triggerHaptic('light');
                setActiveViewTab('tracking');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeViewTab === 'tracking'
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{language === 'lo' ? 'ຕິດຕາມການສັ່ງຊື້' : 'Track Orders'}</span>
              {storeOrders.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeViewTab === 'tracking' ? 'bg-white text-[var(--color-primary-dark)]' : 'bg-[var(--color-primary)] text-white'
                }`}>
                  {storeOrders.length}
                </span>
              )}
            </motion.button>
          </div>

          {isAdmin && (
            <button type="button" onClick={onManageSubChannels} className="px-3 py-2 rounded-2xl border border-[var(--color-border)] text-xs font-bold">
              {language === 'lo' ? 'ຈັດການ Sub-channel' : 'Manage Sub-channels'}
            </button>
          )}

          {isAdmin && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold shadow-xs transition shrink-0"
            >
              <PackagePlus className="w-4 h-4" />
              <span>{language === 'lo' ? 'ເພີ່ມສິນຄ້າໃໝ່' : 'New Product'}</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* KPI Performance Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="calm-card p-3 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] block">
            {language === 'lo' ? 'ສິນຄ້າເປີດຕົວ' : 'Active Launches'}
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-[var(--color-text-primary)]">
              {overallStats.activeProductsCount}
            </span>
            <span className="text-[11px] text-[var(--color-text-secondary)]">SKUs</span>
          </div>
        </div>

        <div className="calm-card p-3 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] block">
            {language === 'lo' ? 'ເປີເຊັນຮ້ານສັ່ງຊື້ (Penetration)' : 'Penetration Rate'}
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {overallStats.penetrationRate}%
            </span>
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              ({overallStats.orderedCount}/{overallStats.totalStoreAssignments})
            </span>
          </div>
        </div>

        <div className="calm-card p-3 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] block">
            {language === 'lo' ? 'ລົງຕົວຢ່າງແລ້ວ' : 'Samples Given'}
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-purple-600 dark:text-purple-400">
              {overallStats.samplesCount}
            </span>
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              {language === 'lo' ? 'ຮ້ານ' : 'stores'}
            </span>
          </div>
        </div>

        <div className="calm-card p-3 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] block">
            {language === 'lo' ? 'ຈຳນວນສັ່ງຊື້ລວມ' : 'Total Units Ordered'}
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-[var(--color-primary)]">
              {overallStats.totalUnits.toLocaleString()}
            </span>
            <span className="text-[11px] text-[var(--color-text-secondary)]">units</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW TAB 1: NEW PRODUCTS CATALOG                         */}
      {/* ======================================================== */}
      {activeViewTab === 'catalog' && (
        <div className="space-y-4">
          
          {/* Search & Filter Bar */}
          <div className="calm-card p-3 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder={language === 'lo' ? 'ຄົ້ນຫາຊື່ສິນຄ້າ, SKU, ໝວດໝູ່...' : 'Search new product name, SKU, or category...'}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
              />
              {catalogSearch && (
                <button
                  onClick={() => setCatalogSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-[var(--color-surface-secondary)] p-1 rounded-xl">
              {(['All', 'Active', 'Completed', 'Draft'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    triggerHaptic('light');
                    setProductStatusFilter(status);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    productStatusFilter === status
                      ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredProducts.map((product) => {
              const productOrders = storeOrders.filter((o) => o.productId === product.id);
              const orderedStores = productOrders.filter((o) => o.orderStatus === 'Ordered');
              const sampleStores = productOrders.filter((o) => o.orderStatus === 'Sample Provided');
              const pendingStores = productOrders.filter((o) => o.orderStatus === 'Not Ordered' || o.orderStatus === 'Follow-up Required');

              const actualRate = productOrders.length > 0
                ? Math.round((orderedStores.length / productOrders.length) * 100)
                : 0;

              return (
                <motion.div
                  key={product.id}
                  whileTap={{ scale: 0.99 }}
                  className="calm-card rounded-3xl overflow-hidden border border-[var(--color-border)] flex flex-col justify-between hover:border-[var(--color-primary)]/40 transition shadow-2xs"
                >
                  <div>
                    {/* Keep the poster unobstructed; metadata belongs below it. */}
                    <CampaignImage src={product.imageUrl} alt={product.productName} language={language} full/>
                    <div className="px-4 pt-3 flex flex-wrap items-center gap-2">
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] font-mono">{product.sku}</span>
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]">{product.category}</span>
                      <span className={`ml-auto px-2 py-1 rounded-full text-[10px] font-bold ${product.status==='Active'?'bg-emerald-500 text-white':'bg-slate-500 text-white'}`}>{product.status}</span>
                    </div>

                    {/* Product Details */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--color-text-primary)] line-clamp-1">
                          {product.productName}
                        </h3>
                        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mt-0.5">
                          {product.description}
                        </p>
                      </div>

                      {/* Pricing & Pack info */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-[var(--color-surface-secondary)] text-xs">
                        <div>
                          <span className="text-[10px] text-[var(--color-text-secondary)] block">
                            {language === 'lo' ? 'ລາຄາຕໍ່ໜ່ວຍ' : 'Wholesale Price'}
                          </span>
                          <span className="font-bold text-[var(--color-text-primary)]">
                            {product.unitPrice.toLocaleString()} LAK
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--color-text-secondary)] block">
                            {language === 'lo' ? 'ຂະໜາດບັນຈຸ' : 'Pack Size'}
                          </span>
                          <span className="font-bold text-[var(--color-text-primary)] truncate block">
                            {product.packSize}
                          </span>
                        </div>
                      </div>

                      {/* Target Sub-Channels pills */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] block mb-1">
                          {language === 'lo' ? 'Sub-Channel ເປົ້າໝາຍ:' : 'Target Sub-Channels:'}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {product.targetSubChannels && product.targetSubChannels.length > 0 ? (
                            product.targetSubChannels.map((subCh) => (
                              <span
                                key={subCh}
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
                              >
                                {subCh}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-[var(--color-text-secondary)] italic">
                              {language === 'lo' ? 'ທຸກ Sub-Channel' : 'All Sub-Channels'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Distribution Penetration Progress Bar */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">
                            {language === 'lo' ? 'ເປີເຊັນຮ້ານສັ່ງຊື້ (Distribution)' : 'Distribution Rate'}
                          </span>
                          <span className="font-bold text-[var(--color-primary)]">
                            {actualRate}% / {product.targetDistributionRate}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            style={{ width: `${Math.min(actualRate, 100)}%` }}
                            className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[var(--color-text-secondary)] pt-0.5">
                          <span>{orderedStores.length} {language === 'lo' ? 'ຮ້ານສັ່ງແລ້ວ' : 'ordered'}</span>
                          <span>{sampleStores.length} {language === 'lo' ? 'ລົງຕົວຢ່າງ' : 'samples'}</span>
                          <span>{pendingStores.length} {language === 'lo' ? 'ຍັງບໍ່ສັ່ງ' : 'pending'}</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3 pt-0 border-t border-[var(--color-border)] mt-2 flex items-center justify-between gap-1.5 pt-3">
                    <div className="flex items-center gap-1">
                      {isAdmin && (
                        <>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openAssignModal(product)}
                            className="px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition flex items-center gap-1"
                            title="Assign Participating Stores by Sub-Channel"
                          >
                            <Building2 className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                            <span>{language === 'lo' ? 'ເລືອກຕາມ Sub-Channel' : 'Select by Sub-Channel'}</span>
                          </motion.button>

                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openEditModal(product)}
                            title={language === 'lo' ? 'ແກ້ໄຂສິນຄ້າ' : 'Edit Product'}
                            className="p-1.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </motion.button>
                          <button type="button" onClick={() => { setDeletingProduct(product); setFormError(''); }}
                            aria-label={`${language === 'lo' ? 'ລົບສິນຄ້າ' : 'Delete Product'} ${product.productName}`}
                            className="p-1.5 rounded-xl border border-[var(--color-border)] text-[var(--color-error)]">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedProductId(product.id);
                        setActiveViewTab('tracking');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                    >
                      <span>{language === 'lo' ? 'ຕິດຕາມການສັ່ງຊື້' : 'Track Orders'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>

                </motion.div>
              );
            })}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW TAB 2: LAUNCH ORDER TRACKING BY SUB-CHANNEL         */}
      {/* ======================================================== */}
      {activeViewTab === 'tracking' && focusedStoreId !== 'all' && <div className="calm-card rounded-2xl p-3 flex items-center justify-between gap-3 text-xs"><span>{language === 'lo' ? 'ຮ້ານຄ້າ:' : 'Outlet:'} {storeMap.get(focusedStoreId)?.storeName}</span><button onClick={()=>setFocusedStoreId('all')} className="font-bold text-[var(--color-primary)]">{language === 'lo' ? 'ເບິ່ງທຸກຮ້ານ' : 'Show all outlets'}</button></div>}
      {activeViewTab === 'tracking' && (
        <div className="space-y-4">
          
          {/* Filter Bar with Sub-Channel Dropdown */}
          <div className="calm-card p-3 sm:p-4 rounded-3xl space-y-3">
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              
              {/* Product Selector */}
              <div className="flex-1">
                <label className="block text-[10px] uppercase font-bold text-[var(--color-text-secondary)] mb-1">
                  {language === 'lo' ? 'ເລືອກສິນຄ້າໃໝ່:' : 'Filter by Product:'}
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2 outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                >
                  <option value="all">{language === 'lo' ? '— ທຸກສິນຄ້າໃໝ່ (All New Products) —' : '— All New Products —'}</option>
                  {newProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-Channel Selector (Requested specifically by user) */}
              <div className="flex-1">
                <label className="block text-[10px] uppercase font-bold text-[var(--color-text-secondary)] mb-1">
                  {language === 'lo' ? 'ກອງຕາມ Sub-Channel:' : 'Filter by Sub-Channel:'}
                </label>
                <select
                  value={subChannelFilter}
                  onChange={(e) => setSubChannelFilter(e.target.value)}
                  className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2 outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                >
                  <option value="all">{language === 'lo' ? '— ທຸກ Sub-Channels (All) —' : '— All Sub-Channels —'}</option>
                  {allSubChannels.map((subCh) => (
                    <option key={subCh} value={subCh}>
                      {subCh}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search input */}
              <div className="flex-1">
                <label className="block text-[10px] uppercase font-bold text-[var(--color-text-secondary)] mb-1">
                  {language === 'lo' ? 'ຄົ້ນຫາຮ້ານຄ້າ:' : 'Search Store:'}
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={trackingSearch}
                    onChange={(e) => setTrackingSearch(e.target.value)}
                    placeholder={language === 'lo' ? 'ຊື່ຮ້ານ ຫຼື ລະຫັດ...' : 'Store name or code...'}
                    className="w-full pl-8 pr-7 py-2 text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                  />
                  {trackingSearch && (
                    <button
                      onClick={() => setTrackingSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] shrink-0">
                {language === 'lo' ? 'ສະຖານະ:' : 'Status:'}
              </span>
              {(['all', 'Ordered', 'Sample Provided', 'Follow-up Required', 'Not Ordered'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    triggerHaptic('light');
                    setOrderStatusFilter(st);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    orderStatusFilter === st
                      ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                      : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {st === 'all'
                    ? language === 'lo' ? 'ທັງໝົດ' : 'All'
                    : st === 'Ordered'
                    ? language === 'lo' ? 'ສັ່ງຊື້ແລ້ວ' : 'Ordered'
                    : st === 'Sample Provided'
                    ? language === 'lo' ? 'ລົງຕົວຢ່າງແລ້ວ' : 'Sample Given'
                    : st === 'Follow-up Required'
                    ? language === 'lo' ? 'ຕ້ອງຕິດຕາມ' : 'Follow-up'
                    : language === 'lo' ? 'ຍັງບໍ່ສັ່ງ' : 'Not Ordered'}
                </button>
              ))}
            </div>

          </div>

          {/* Store Orders List */}
          <div className="space-y-2.5">
            {filteredOrders.length === 0 ? (
              <div className="calm-card p-8 rounded-3xl text-center space-y-2">
                <Store className="w-8 h-8 text-[var(--color-text-secondary)] mx-auto opacity-50" />
                <p className="text-xs font-bold text-[var(--color-text-primary)]">
                  {language === 'lo' ? 'ບໍ່ພົບລາຍການສັ່ງຊື້ທີ່ກົງກັບເງື່ອນໄຂ' : 'No store order records found matching criteria'}
                </p>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  {language === 'lo'
                    ? 'ກະລຸນາກວດສອບການເລືອກສິນຄ້າ ຫຼື Sub-Channel'
                    : 'Try selecting a different product or clearing the Sub-Channel filter'}
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const store = storeMap.get(order.storeId);
                const product = productMap.get(order.productId);
                if (!store) return null;

                return (
                  <motion.div
                    key={order.id}
                    layout
                    whileTap={{ scale: 0.99 }}
                    data-order-id={order.id} data-order-status={order.orderStatus}
                    className={`purchase-outlet-card ${purchaseTone(order.orderStatus)} calm-card p-3.5 sm:p-4 rounded-3xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      
                      {/* Store code, name, and Sub-Channel chip */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="purchase-store-code font-mono text-xs font-extrabold">
                          {store.storeCode}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)] truncate">
                          {store.storeName}
                        </h4>
                        
                        {/* Sub-Channel Highlight */}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          {store.subChannel}
                        </span>

                        <span className="text-[10px] text-[var(--color-text-secondary)]">
                          • {store.channel}
                        </span>
                      </div>

                      {/* Product Name if view is "All" */}
                      {product && (
                        <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-[var(--color-text-primary)]">{product.productName}</span>
                          <span className="font-mono text-[10px]">({product.sku})</span>
                        </p>
                      )}

                      {/* Feedback / Notes */}
                      {order.customerFeedback && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-[var(--color-surface-secondary)] p-2 rounded-xl border border-[var(--color-border)] italic">
                          "{order.customerFeedback}"
                        </p>
                      )}

                      {/* Order / Sample details */}
                      <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                        {order.orderStatus === 'Ordered' && (
                          <>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              Qty: {order.orderQuantity || 0} units
                            </span>
                            {order.orderAmount && (
                              <span className="text-[var(--color-text-secondary)]">
                                Amount: {order.orderAmount.toLocaleString()} LAK
                              </span>
                            )}
                            {order.invoiceNumber && (
                              <span className="font-mono text-[10px] text-slate-400">
                                #{order.invoiceNumber}
                              </span>
                            )}
                          </>
                        )}

                        {order.orderStatus === 'Sample Provided' && (
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            Sample: {order.sampleQty || 4} units given
                          </span>
                        )}

                        {order.nextFollowUpDate && (
                          <span className="text-amber-600 dark:text-amber-400 text-[11px]">
                            Next follow-up: {order.nextFollowUpDate.substring(0, 10)}
                          </span>
                        )}
                      </div>

                    </div>

                    {/* Right side: Status Badge & Update CTA */}
                    <div className="order-card-actions flex flex-wrap items-center sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border)]">
                      <span
                        className={`purchase-status-badge ${purchaseTone(order.orderStatus)}`}
                        data-order-status={order.orderStatus}
                      >
                        {order.orderStatus === 'Ordered' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {order.orderStatus === 'Not Ordered' && <Clock className="w-3.5 h-3.5" />}
                        {order.orderStatus === 'Sample Provided' && <Gift className="w-3.5 h-3.5" />}
                        {order.orderStatus === 'Follow-up Required' && <Clock className="w-3.5 h-3.5" />}
                        <span>
                          {order.orderStatus === 'Ordered'
                            ? language === 'lo' ? 'ສັ່ງຊື້ແລ້ວ' : 'Ordered'
                            : order.orderStatus === 'Sample Provided'
                            ? language === 'lo' ? 'ລົງຕົວຢ່າງແລ້ວ' : 'Sample Given'
                            : order.orderStatus === 'Follow-up Required'
                            ? language === 'lo' ? 'ຕ້ອງຕິດຕາມ' : 'Follow-up'
                            : order.orderStatus==='Declined'?(language==='lo'?'ປະຕິເສດ':'Declined'):language === 'lo' ? 'ຍັງບໍ່ສັ່ງ' : 'Not Ordered'}
                        </span>
                      </span>

                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => openUpdateOrderModal(order)}
                        className={`order-confirm-button ${purchaseTone(order.orderStatus)}`}
                      >
                        <CheckCircle2 size={18} aria-hidden="true"/>{order.orderStatus==='Ordered'?(language==='lo'?'ແກ້ໄຂການສັ່ງຊື້':'Edit order'):(language==='lo'?'ຢືນຢັນ / ອັບເດດການສັ່ງຊື້':'Confirm / update order')}
                      </motion.button>
                    </div>

                  </motion.div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: BATCH SELECT STORES BY SUB-CHANNEL              */}
      {/* ======================================================== */}
      <AnimatePresence>
        {assigningProduct && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl calm-card p-5 sm:p-6 shadow-2xl border border-[var(--color-border)] flex flex-col max-h-[88vh]"
            >
              <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-2 sm:hidden" />

              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                <div>
                  <h3 className="text-base font-black text-[var(--color-text-primary)]">
                    {language === 'lo' ? 'ເລືອກຮ້ານຄ້າທີ່ເຂົ້າຮ່ວມຕາມ Sub-Channel' : 'Select Participating Stores by Sub-Channel'}
                  </h3>
                  <p className="text-xs text-[var(--color-primary)] font-bold mt-0.5">
                    {assigningProduct.productName} ({assigningProduct.sku})
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setAssigningProduct(null)}
                  className="p-1 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Quick Sub-Channel Toggle Bar (User Request Highlight) */}
              <div className="py-3 border-b border-[var(--color-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    {language === 'lo' ? 'ກົດເລືອກ/ຍົກເລີກທັງໝົດຕາມ Sub-Channel:' : '1-Tap Toggle by Sub-Channel:'}
                  </span>
                  <span className="text-[11px] font-bold text-[var(--color-primary)]">
                    {selectedStoreIds.size} {language === 'lo' ? 'ຮ້ານຖືກເລືອກແລ້ວ' : 'selected'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {subChannelAssignStats.map((item) => (
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
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
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
                  <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={assignSearchQuery}
                    onChange={(e) => setAssignSearchQuery(e.target.value)}
                    placeholder={language === 'lo' ? 'ຄົ້ນຫາຊື່ຮ້ານ ຫຼື ລະຫັດ...' : 'Filter store list...'}
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
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
                  className="text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-1.5 outline-none text-[var(--color-text-primary)] font-semibold"
                >
                  <option value="all">{language === 'lo' ? 'ທຸກ Sub-Channel' : 'All Sub-Channels'}</option>
                  {allSubChannels.map((subCh) => (
                    <option key={subCh} value={subCh}>{subCh}</option>
                  ))}
                </select>
              </div>

              {/* Store List */}
              <div className="flex-1 overflow-y-auto py-2.5 space-y-2 pr-1">
                {filteredStoresForAssign.map((store) => {
                  const isSelected = selectedStoreIds.has(store.id);
                  return (
                    <motion.div
                      key={store.id}
                      whileTap={{ scale: 0.985 }}
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
                        isSelected
                          ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                          : 'border border-[var(--color-border)]'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)] font-bold">
                  {selectedStoreIds.size} / {stores.length} {language === 'lo' ? 'ຮ້ານຖືກເລືອກ' : 'stores selected'}
                </span>

                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setAssigningProduct(null)}
                    className="px-3.5 py-2 rounded-2xl text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] transition"
                  >
                    {t.cancel}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={handleSaveAssignments}
                    className="px-4 py-2 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold shadow-xs transition"
                  >
                    {language === 'lo' ? 'ບັນທຶກຮ້ານຄ້າ' : 'Save Assignments'}
                  </motion.button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 2: UPDATE ORDER STATUS BOTTOM SHEET / MODAL        */}
      {/* ======================================================== */}
      <AnimatePresence>
        {updatingOrder && updatingStore && (
          <div role="dialog" aria-modal="true" aria-labelledby="launch-order-status-title" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl calm-card p-5 sm:p-6 shadow-2xl border border-[var(--color-border)] max-h-[92vh] overflow-y-auto space-y-4"
            >
              <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-2 sm:hidden" />

              <div className="flex items-start justify-between pb-3 border-b border-[var(--color-border)]">
                <div>
                  <h3 id="launch-order-status-title" className="text-base font-black text-[var(--color-text-primary)]">
                    {language === 'lo' ? 'ອັບເດດການສັ່ງຊື້ສິນຄ້າໃໝ່' : 'Update Launch Order Status'}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-bold text-[var(--color-primary)]">{updatingStore.storeName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold">
                      {updatingStore.subChannel}
                    </span>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setUpdatingOrder(null)}
                  className="p-1 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <form onSubmit={handleSaveOrderStatus} className="space-y-3.5">
                
                {/* Status Selection Chips */}
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1.5">
                    {language === 'lo' ? 'ເລືອກສະຖານະການສັ່ງຊື້ *' : 'Select Order Status *'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Ordered', 'Sample Provided', 'Follow-up Required', 'Not Ordered'] as const).map((st) => (
                      <motion.button
                        key={st}
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => {
                          triggerHaptic('light');
                          setOrderFormStatus(st);
                        }}
                        className={`p-2.5 rounded-2xl border text-xs font-bold text-center transition flex items-center justify-center gap-1.5 ${
                          orderFormStatus === st
                            ? st === 'Ordered'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : st === 'Sample Provided'
                              ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                              : st === 'Follow-up Required'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                              : 'bg-orange-700 text-white border-orange-700 shadow-2xs'
                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]'
                        }`}
                      >
                        {st === 'Ordered' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {st === 'Sample Provided' && <Gift className="w-3.5 h-3.5" />}
                        {st === 'Follow-up Required' && <Clock className="w-3.5 h-3.5" />}
                        <span>
                          {st === 'Ordered'
                            ? language === 'lo' ? 'ສັ່ງຊື້ແລ້ວ (Ordered)' : 'Ordered'
                            : st === 'Sample Provided'
                            ? language === 'lo' ? 'ລົງຕົວຢ່າງ (Sample)' : 'Sample Given'
                            : st === 'Follow-up Required'
                            ? language === 'lo' ? 'ຕ້ອງຕິດຕາມ (Follow-up)' : 'Follow-up'
                            : language === 'lo' ? 'ຍັງບໍ່ສັ່ງ' : 'Not Ordered'}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Conditional Fields: If Ordered */}
                {orderFormStatus === 'Ordered' && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--color-text-primary)] mb-1">
                          {language === 'lo' ? 'ຈຳນວນສັ່ງ (Units) *' : 'Order Qty (Units) *'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={orderFormQuantity}
                          onChange={(e) => {
                            const qty = Number(e.target.value);
                            setOrderFormQuantity(qty);
                            if (updatingProductItem) {
                              setOrderFormAmount(qty * updatingProductItem.unitPrice);
                            }
                          }}
                          className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2 outline-none text-[var(--color-text-primary)] font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[var(--color-text-primary)] mb-1">
                          {language === 'lo' ? 'ມູນຄ່າລວມ (LAK)' : 'Total Amount (LAK)'}
                        </label>
                        <input
                          type="number"
                          value={orderFormAmount}
                          onChange={(e) => setOrderFormAmount(Number(e.target.value))}
                          className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2 outline-none text-[var(--color-text-primary)] font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--color-text-primary)] mb-1">
                          {language === 'lo' ? 'ວັນທີສັ່ງ' : 'Order Date'}
                        </label>
                        <LaoDatePicker aria-label={language === 'lo' ? 'ວັນທີສັ່ງ' : 'Order Date'}
                          type="date"
                          value={orderFormDate}
                          onChange={(e) => setOrderFormDate(e.target.value)}
                          className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2 outline-none text-[var(--color-text-primary)]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[var(--color-text-primary)] mb-1">
                          {language === 'lo' ? 'ເລກທີ Invoice / PO' : 'Invoice / PO #'}
                        </label>
                        <input
                          type="text"
                          value={orderFormInvoice}
                          onChange={(e) => setOrderFormInvoice(e.target.value)}
                          placeholder="e.g. INV-1002"
                          className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2 outline-none text-[var(--color-text-primary)] font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditional Fields: If Sample Provided */}
                {orderFormStatus === 'Sample Provided' && (
                  <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--color-text-primary)] mb-1">
                          {language === 'lo' ? 'ຈຳນວນຕົວຢ່າງທີ່ໃຫ້' : 'Sample Qty Given'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={sampleQty}
                          onChange={(e) => setSampleQty(Number(e.target.value))}
                          className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2 outline-none text-[var(--color-text-primary)] font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[var(--color-text-primary)] mb-1">
                          {language === 'lo' ? 'ວັນທີແຈກຕົວຢ່າງ' : 'Sample Given Date'}
                        </label>
                        <LaoDatePicker aria-label={language === 'lo' ? 'ວັນທີແຈກຕົວຢ່າງ' : 'Sample Given Date'}
                          type="date"
                          value={sampleGivenDate}
                          onChange={(e) => setSampleGivenDate(e.target.value)}
                          className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2 outline-none text-[var(--color-text-primary)]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Follow-up date (if Follow-up or Sample) */}
                {(orderFormStatus === 'Follow-up Required' || orderFormStatus === 'Sample Provided') && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-1">
                        {language === 'lo' ? 'ວັນທີນັດຕິດຕາມຄັ້ງຕໍ່ໄປ *' : 'Next Follow-up Date *'}
                      </label>
                      <LaoDatePicker aria-label={language === 'lo' ? 'ວັນທີນັດຕິດຕາມຄັ້ງຕໍ່ໄປ *' : 'Next Follow-up Date *'}
                        type="date"
                        required
                        value={nextFollowUpDate}
                        onChange={(e) => setNextFollowUpDate(e.target.value)}
                        className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2 outline-none text-[var(--color-text-primary)]"
                      />
                    </div>

                    {currentUser.role==='admin'&&(<label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={autoCreateTask}
                        onChange={(e) => setAutoCreateTask(e.target.checked)}
                        className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                      <span className="text-xs text-[var(--color-text-primary)] font-semibold">
                        {language === 'lo' ? 'ສ້າງວຽກຕິດຕາມ (Task) ອັດຕະໂນມັດ' : 'Auto-create follow-up task in To-Do List'}
                      </span>
                    </label>)}
                  </div>
                )}

                {/* Customer Feedback & Notes */}
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                    {language === 'lo' ? 'ຄວາມຄິດເຫັນລູກຄ້າ / ເຫດຜົນ (Feedback & Notes)' : 'Customer Feedback & Objections'}
                  </label>
                  <textarea
                    rows={2}
                    value={customerFeedback}
                    onChange={(e) => setCustomerFeedback(e.target.value)}
                    placeholder={language === 'lo' ? 'ປ້ອນຄວາມຄິດເຫັນຂອງຮ້ານ, ເຫດຜົນທີ່ຍັງບໍ່ສັ່ງ ຫຼື ແຜນການລົງສິນຄ້າ...' : 'e.g. Manager liked the taste, waiting for owner approval next Monday...'}
                    className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                  />
                </div>

                {orderError&&<p role="alert" className="account-message account-message-error">{orderError}</p>}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setUpdatingOrder(null)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] transition"
                  >
                    {t.cancel}
                  </motion.button>

                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.94 }}
                    className={`order-confirm-button order-submit-button ${purchaseTone(orderFormStatus)}`}
                  >
                    <CheckCircle2 size={19} aria-hidden="true"/>{orderFormStatus==='Ordered'?(language==='lo'?'ຢືນຢັນການສັ່ງຊື້':'Confirm purchase'):(language === 'lo' ? 'ບັນທຶກສະຖານະ' : 'Save status')}
                  </motion.button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 3: CREATE / EDIT PRODUCT (ADMIN ONLY)              */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isAdmin && (isCreateModalOpen || editingProduct) && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl calm-card p-5 sm:p-6 shadow-2xl border border-[var(--color-border)] max-h-[92vh] overflow-y-auto space-y-4"
            >
              <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-2 sm:hidden" />

              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                <h3 className="text-base font-black text-[var(--color-text-primary)]">
                  {editingProduct
                    ? (language === 'lo' ? 'ແກ້ໄຂສິນຄ້າໃໝ່' : 'Edit New Product')
                    : (language === 'lo' ? 'ເພີ່ມສິນຄ້າໃໝ່ (New Product Launch)' : 'Create New Product Launch')}
                </h3>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="p-1 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProduct} className="space-y-3.5">
                
                {/* Product Name */}
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                    {language === 'lo' ? 'ຊື່ຜະລິດຕະພັນໃໝ່ *' : 'Product Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    placeholder="e.g. Oishi Sparkling Yuzu Tea 320ml"
                    className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)] font-bold"
                  />
                </div>

                {/* SKU & Category */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                      SKU Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="e.g. NPD-OIS-320Y"
                      className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none font-mono text-[var(--color-text-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                      {language === 'lo' ? 'ໝວດໝູ່' : 'Category'}
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none text-[var(--color-text-primary)]"
                    >
                      <option value="Beverages">Beverages (ເຄື່ອງດື່ມ)</option>
                      <option value="Coffee & Tea">Coffee & Tea (ກາເຟ ແລະ ຊາ)</option>
                      <option value="Snacks">Snacks (ຂະໜົມຂົບຄຽວ)</option>
                      <option value="Food & Dairy">Food & Dairy (ອາຫານ & ນົມ)</option>
                      <option value="Personal Care">Personal Care (ສິນຄ້າສ່ວນຕົວ)</option>
                      <option value="Household">Household (ເຄື່ອງໃຊ້ໃນເຮືອນ)</option>
                    </select>
                  </div>
                </div>

                {/* Pack Size & Price */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                      {language === 'lo' ? 'ຂະໜາດບັນຈຸ' : 'Pack Size'}
                    </label>
                    <input
                      type="text"
                      value={formData.packSize}
                      onChange={(e) => setFormData({ ...formData, packSize: e.target.value })}
                      placeholder="e.g. 24 cans / carton"
                      className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none text-[var(--color-text-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                      {language === 'lo' ? 'ລາຄາສົ່ງ (LAK)' : 'Wholesale Price'}
                    </label>
                    <input
                      type="number"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                      className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none text-[var(--color-text-primary)] font-bold"
                    />
                  </div>
                </div>

                {/* Target Distribution Rate & Target Units */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                      {language === 'lo' ? 'ເປົ້າໝາຍຮ້ານຄ້າ (%)' : 'Target Distribution (%)'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.targetDistributionRate}
                      onChange={(e) => setFormData({ ...formData, targetDistributionRate: Number(e.target.value) })}
                      className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none text-[var(--color-text-primary)] font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                      {language === 'lo' ? 'ເປົ້າໝາຍຕໍ່ຮ້ານ (Units)' : 'Target Units / Store'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.targetUnitsPerStore}
                      onChange={(e) => setFormData({ ...formData, targetUnitsPerStore: Number(e.target.value) })}
                      className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none text-[var(--color-text-primary)] font-bold"
                    />
                  </div>
                </div>

                {/* Target Sub-Channels Multi-Select (User Request Focus) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[var(--color-text-primary)]">
                      {language === 'lo' ? 'ເລືອກ Sub-Channel ເປົ້າໝາຍສຳລັບສິນຄ້ານີ້:' : 'Target Sub-Channels for this Launch:'}
                    </label>
                    <span className="text-[10px] text-[var(--color-text-secondary)]">
                      {formData.targetSubChannels.length} {language === 'lo' ? 'ເລືອກແລ້ວ' : 'selected'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 p-2 rounded-2xl bg-[var(--color-surface-secondary)] max-h-36 overflow-y-auto">
                    {allSubChannels.map((subCh) => {
                      const isChecked = formData.targetSubChannels.includes(subCh);
                      return (
                        <button
                          key={subCh}
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            const next = isChecked
                              ? formData.targetSubChannels.filter((c) => c !== subCh)
                              : [...formData.targetSubChannels, subCh];
                            setFormData({ ...formData, targetSubChannels: next });
                          }}
                          className={`p-2 rounded-xl text-left text-xs font-bold transition flex items-center justify-between border ${
                            isChecked
                              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-2xs'
                              : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]'
                          }`}
                        >
                          <span className="truncate">{subCh}</span>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-[var(--color-text-secondary)] block mt-1">
                    {language === 'lo'
                      ? '* ລະບົບຈະເຊີນຮ້ານຄ້າທີ່ຢູ່ໃນ Sub-Channel ເຫຼົ່ານີ້ເຂົ້າຮ່ວມອັດຕະໂນມັດ'
                      : '* Stores matching these Sub-Channels will be auto-enrolled'}
                  </span>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                    {language === 'lo' ? 'ລາຍລະອຽດສິນຄ້າ' : 'Product Description'}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Key selling points, promotional chilling racks, display incentives..."
                    className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                  />
                </div>

                {/* Product Image */}
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                    {language === 'lo' ? 'ຮູບພາບຜະລິດຕະພັນ' : 'Product Image'}
                  </label>
                  <div className="flex items-center gap-3">
                    <img
                      src={formData.imageUrl || `${import.meta.env.BASE_URL}icons/image-placeholder.svg`}
                      alt="Product Preview"
                      className="w-16 h-16 rounded-2xl object-contain ring-2 ring-[var(--color-primary)] shrink-0"
                    />
                    <div className="space-y-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition flex items-center gap-1.5"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                        <span>{language === 'lo' ? 'ອັບໂຫຼດຮູບຈາກເຄື່ອງ' : 'Upload Image'}</span>
                      </motion.button>
                      <span className="text-[10px] text-[var(--color-text-secondary)] block">
                        PNG, JPG, WebP (Max 3MB)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setEditingProduct(null);
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
                    {editingProduct
                      ? (language === 'lo' ? 'ບັນທຶກການແກ້ໄຂ' : 'Save Changes')
                      : (language === 'lo' ? 'ສ້າງສິນຄ້າໃໝ່' : 'Launch Product')}
                  </motion.button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isAdmin && deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-product-title" className="calm-card w-full max-w-md rounded-3xl p-5 space-y-4">
            <h3 id="delete-product-title" className="font-bold">{language === 'lo' ? 'ລົບສິນຄ້າໃໝ່' : 'Delete New Product'}?</h3>
            <p className="text-sm font-bold break-words">{deletingProduct.productName}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {language === 'lo' ? 'ຈະລົບສິນຄ້ານີ້ ແລະ ລາຍການສັ່ງຊື້ຂອງສິນຄ້ານີ້. ບໍ່ລົບຮ້ານຄ້າ ຫຼື ສິນຄ້າອື່ນ.' : 'This deletes this product and its store order records. Stores and other products are kept.'}
            </p>
            {formError && <p role="alert" className="text-xs text-[var(--color-error)]">{formError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs" onClick={() => setDeletingProduct(null)}>{t.cancel}</button>
              <button type="button" className="rounded-xl bg-[var(--color-error)] text-white px-3 py-2 text-xs font-bold" onClick={() => {
                const result = dataService.deleteNewProduct(deletingProduct.id);
                if (!result.success) { setFormError(result.error || 'Failed to delete product.'); return; }
                if (selectedProductId === deletingProduct.id) setSelectedProductId('all');
                setDeletingProduct(null);
                onRefreshData();
              }}>{language === 'lo' ? 'ຢືນຢັນລົບ' : 'Confirm Delete'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
