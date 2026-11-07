/**
 * Data Service with Local Storage persistence & Supabase-compatible schema
 */

import {
  UserProfile,
  Store,
  Promotion,
  PromotionStore,
  FollowUpTask,
  OrderStatusHistory,
  Channel,
  SubChannel,
  OrderStatus,
  ExcelImportRow,
  OfflineDraft,
  AppBranding,
  NewProductLaunch,
  NewProductStoreOrder,
  NewProductOrderStatus
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_CHANNELS,
  INITIAL_SUB_CHANNELS,
  INITIAL_STORES,
  INITIAL_PROMOTIONS,
  INITIAL_PROMOTION_STORES,
  INITIAL_TASKS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NEW_PRODUCTS,
  INITIAL_NEW_PRODUCT_STORE_ORDERS
} from './mockData';
import * as XLSX from 'xlsx';

const STORAGE_KEYS = {
  CURRENT_USER: 'promotrack_current_user',
  USERS: 'promotrack_users',
  CHANNELS: 'promotrack_channels',
  SUB_CHANNELS: 'promotrack_sub_channels',
  STORES: 'promotrack_stores',
  PROMOTIONS: 'promotrack_promotions',
  PROMOTION_STORES: 'promotrack_promo_stores',
  NEW_PRODUCTS: 'promotrack_new_products',
  NEW_PRODUCT_STORE_ORDERS: 'promotrack_np_store_orders',
  TASKS: 'promotrack_tasks',
  AUDIT_LOGS: 'promotrack_audit_logs',
  OFFLINE_DRAFTS: 'promotrack_offline_drafts',
  LANGUAGE: 'promotrack_lang',
  THEME: 'promotrack_theme',
  THEME_COLOR: 'promotrack_theme_color',
  APP_BRANDING: 'promotrack_app_branding'
};

const DEFAULT_BRANDING: AppBranding = {
  appName: 'PromoTrack',
  tagline: 'Sales Promotion & Store Execution PWA',
  logoType: 'icon',
  logoIcon: 'Sparkles',
  logoColor: '#248A60',
  customLogoUrl: ''
};

class DataService {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initStorage();
  }

  private initStorage() {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      // Default persona: Admin
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CHANNELS)) {
      localStorage.setItem(STORAGE_KEYS.CHANNELS, JSON.stringify(INITIAL_CHANNELS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUB_CHANNELS)) {
      localStorage.setItem(STORAGE_KEYS.SUB_CHANNELS, JSON.stringify(INITIAL_SUB_CHANNELS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.STORES)) {
      localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(INITIAL_STORES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PROMOTIONS)) {
      localStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(INITIAL_PROMOTIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PROMOTION_STORES)) {
      localStorage.setItem(STORAGE_KEYS.PROMOTION_STORES, JSON.stringify(INITIAL_PROMOTION_STORES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.NEW_PRODUCTS)) {
      localStorage.setItem(STORAGE_KEYS.NEW_PRODUCTS, JSON.stringify(INITIAL_NEW_PRODUCTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.NEW_PRODUCT_STORE_ORDERS)) {
      localStorage.setItem(STORAGE_KEYS.NEW_PRODUCT_STORE_ORDERS, JSON.stringify(INITIAL_NEW_PRODUCT_STORE_ORDERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.OFFLINE_DRAFTS)) {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_DRAFTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.APP_BRANDING)) {
      localStorage.setItem(STORAGE_KEYS.APP_BRANDING, JSON.stringify(DEFAULT_BRANDING));
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error notifying data service listener:', err);
      }
    });
  }

  // --- App Branding & Logo Customization ---
  public getAppBranding(): AppBranding {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.APP_BRANDING);
      if (stored) return { ...DEFAULT_BRANDING, ...JSON.parse(stored) };
    } catch {
      // fallback
    }
    return DEFAULT_BRANDING;
  }

  public updateAppBranding(updates: Partial<AppBranding>): AppBranding {
    const current = this.getAppBranding();
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.APP_BRANDING, JSON.stringify(updated));
    this.notify();
    return updated;
  }

  public resetAppBranding(): AppBranding {
    localStorage.setItem(STORAGE_KEYS.APP_BRANDING, JSON.stringify(DEFAULT_BRANDING));
    this.notify();
    return DEFAULT_BRANDING;
  }

  // --- Auth & Users ---
  public getCurrentUser(): UserProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return INITIAL_USERS[0];
  }

  public setCurrentUser(user: UserProfile) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    this.notify();
  }

  public getAllUsers(): UserProfile[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERS);
      return stored ? JSON.parse(stored) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  }

  public getSalesReps(): UserProfile[] {
    return this.getAllUsers().filter((u) => u.role === 'sales');
  }

  public logout() {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch {
      // ignore
    }
    this.notify();
  }

  public addUser(userData: Omit<UserProfile, 'id'>): { success: boolean; error?: string; user?: UserProfile } {
    const allUsers = this.getAllUsers();
    const cleanEmail = userData.email.trim().toLowerCase();

    if (allUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Email already exists. Please choose a unique email address.' };
    }

    const newUser: UserProfile = {
      ...userData,
      email: cleanEmail,
      id: `u-${userData.role}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      avatarUrl: userData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };

    allUsers.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));
    this.notify();
    return { success: true, user: newUser };
  }

  public updateUser(userId: string, updates: Partial<UserProfile>): { success: boolean; error?: string } {
    const allUsers = this.getAllUsers();
    const index = allUsers.findIndex((u) => u.id === userId);
    if (index === -1) {
      return { success: false, error: 'User not found.' };
    }

    if (updates.email) {
      const cleanEmail = updates.email.trim().toLowerCase();
      if (allUsers.some((u) => u.id !== userId && u.email.toLowerCase() === cleanEmail)) {
        return { success: false, error: 'Email address already in use by another account.' };
      }
      updates.email = cleanEmail;
    }

    allUsers[index] = {
      ...allUsers[index],
      ...updates
    };

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));

    // If updating currently logged in user, keep session in sync
    const currentUser = this.getCurrentUser();
    if (currentUser.id === userId) {
      this.setCurrentUser(allUsers[index]);
    }

    this.notify();
    return { success: true };
  }

  public deleteUser(userId: string): { success: boolean; error?: string } {
    const currentUser = this.getCurrentUser();
    if (currentUser.id === userId) {
      return { success: false, error: 'Cannot delete the account you are currently logged in with.' };
    }

    const allUsers = this.getAllUsers();
    const userToDelete = allUsers.find((u) => u.id === userId);
    if (!userToDelete) {
      return { success: false, error: 'User not found.' };
    }

    const filtered = allUsers.filter((u) => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filtered));

    // Reassign any stores assigned to this deleted user to the current admin
    try {
      const allStores = this.getAllStoresUnfiltered();
      let storesChanged = false;
      allStores.forEach((store) => {
        if (store.assignedSalesUser === userId) {
          store.assignedSalesUser = currentUser.id;
          storesChanged = true;
        }
      });
      if (storesChanged) {
        localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(allStores));
      }
    } catch {
      // ignore
    }

    this.notify();
    return { success: true };
  }

  // --- Theme Color Customization ---
  public getThemeColor(): string {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME_COLOR);
      if (saved) return saved;
    } catch {
      // fallback
    }
    return 'sage';
  }

  public setThemeColor(colorId: string) {
    localStorage.setItem(STORAGE_KEYS.THEME_COLOR, colorId);
    this.notify();
  }

  // --- Channels ---
  public getChannels(): Channel[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CHANNELS);
      return stored ? JSON.parse(stored) : INITIAL_CHANNELS;
    } catch {
      return INITIAL_CHANNELS;
    }
  }

  public getSubChannels(): SubChannel[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SUB_CHANNELS);
      return stored ? JSON.parse(stored) : INITIAL_SUB_CHANNELS;
    } catch {
      return INITIAL_SUB_CHANNELS;
    }
  }

  public addSubChannel(input: Omit<SubChannel, 'id'>): { success: boolean; error?: string; subChannel?: SubChannel } {
    if (this.getCurrentUser().role !== 'admin') return { success: false, error: 'admin_only' };
    const name = input.name.trim();
    if (!name) return { success: false, error: 'name_required' };
    if (!this.getChannels().some((channel) => channel.id === input.channelId)) return { success: false, error: 'channel_required' };
    const list = this.getSubChannels();
    if (list.some((item) => item.channelId === input.channelId && item.name.normalize().toLowerCase() === name.normalize().toLowerCase())) {
      return { success: false, error: 'duplicate_name' };
    }
    const subChannel: SubChannel = { ...input, name, description: input.description?.trim(), id: crypto.randomUUID() };
    localStorage.setItem(STORAGE_KEYS.SUB_CHANNELS, JSON.stringify([...list, subChannel]));
    this.notify();
    return { success: true, subChannel };
  }

  public getSubChannelUsage(id: string) {
    const item = this.getSubChannels().find((subChannel) => subChannel.id === id);
    if (!item) return { stores: 0, promotions: 0, products: 0 };
    return {
      stores: this.getAllStoresUnfiltered().filter((store) => store.subChannel === item.name).length,
      promotions: this.getAllPromotionsUnfiltered().filter((promo) => promo.targetSubChannels?.includes(item.name)).length,
      products: this.getAllNewProductsUnfiltered().filter((product) => product.targetSubChannels?.includes(item.name)).length
    };
  }

  public deleteSubChannel(id: string): { success: boolean; error?: string } {
    if (this.getCurrentUser().role !== 'admin') return { success: false, error: 'admin_only' };
    const list = this.getSubChannels();
    if (!list.some((item) => item.id === id)) return { success: false, error: 'not_found' };
    const usage = this.getSubChannelUsage(id);
    if (usage.stores || usage.promotions || usage.products) return { success: false, error: 'in_use' };
    localStorage.setItem(STORAGE_KEYS.SUB_CHANNELS, JSON.stringify(list.filter((item) => item.id !== id)));
    this.notify();
    return { success: true };
  }

  // --- Stores ---
  public getStores(): Store[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STORES);
      const allStores: Store[] = stored ? JSON.parse(stored) : INITIAL_STORES;
      const currentUser = this.getCurrentUser();

      // Enforce RLS: Sales Rep only views stores assigned to them
      if (currentUser.role === 'sales') {
        return allStores.filter((s) => s.assignedSalesUser === currentUser.id);
      }
      return allStores;
    } catch {
      return INITIAL_STORES;
    }
  }

  public getAllStoresUnfiltered(): Store[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STORES);
      return stored ? JSON.parse(stored) : INITIAL_STORES;
    } catch {
      return INITIAL_STORES;
    }
  }

  public addStore(storeData: Omit<Store, 'id' | 'createdAt' | 'updatedAt'>): { success: boolean; error?: string; store?: Store } {
    const allStores = this.getAllStoresUnfiltered();
    const cleanCode = storeData.storeCode.trim().toUpperCase();

    // Check unique constraint
    if (allStores.some((s) => s.storeCode.toUpperCase() === cleanCode)) {
      return { success: false, error: `Store Code "${cleanCode}" already exists. Please choose a unique code.` };
    }

    const newStore: Store = {
      ...storeData,
      storeCode: cleanCode,
      id: `str-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    allStores.unshift(newStore);
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(allStores));
    this.recordDraft('store', 'create', newStore);
    this.notify();

    return { success: true, store: newStore };
  }

  public updateStore(storeId: string, updates: Partial<Store>): { success: boolean; error?: string } {
    const allStores = this.getAllStoresUnfiltered();
    const index = allStores.findIndex((s) => s.id === storeId);
    if (index === -1) {
      return { success: false, error: 'Store not found.' };
    }

    // Check duplicate code if code was changed
    if (updates.storeCode) {
      const cleanCode = updates.storeCode.trim().toUpperCase();
      if (allStores.some((s) => s.id !== storeId && s.storeCode.toUpperCase() === cleanCode)) {
        return { success: false, error: `Store Code "${cleanCode}" already exists for another store.` };
      }
      updates.storeCode = cleanCode;
    }

    allStores[index] = {
      ...allStores[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(allStores));
    this.recordDraft('store', 'update', allStores[index]);
    this.notify();

    return { success: true };
  }

  public deleteStore(storeId: string): { success: boolean; error?: string } {
    const allStores = this.getAllStoresUnfiltered();
    const storeToDelete = allStores.find((s) => s.id === storeId);
    if (!storeToDelete) {
      return { success: false, error: 'Store not found.' };
    }

    // Filter store out
    const filtered = allStores.filter((s) => s.id !== storeId);
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(filtered));

    // Clean up associated promotion_stores records
    try {
      const promoStores = this.getAllPromotionStoresUnfiltered().filter((ps) => ps.storeId !== storeId);
      localStorage.setItem(STORAGE_KEYS.PROMOTION_STORES, JSON.stringify(promoStores));
    } catch {
      // ignore
    }

    // Clean up associated new product store orders
    try {
      const npOrders = this.getAllNewProductStoreOrdersUnfiltered().filter((o) => o.storeId !== storeId);
      localStorage.setItem(STORAGE_KEYS.NEW_PRODUCT_STORE_ORDERS, JSON.stringify(npOrders));
    } catch {
      // ignore
    }

    // Clean up associated tasks
    try {
      const tasks = this.getAllTasksUnfiltered().filter((t) => t.storeId !== storeId);
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch {
      // ignore
    }

    this.recordDraft('store', 'delete', { id: storeId, name: storeToDelete.storeName });
    this.notify();

    return { success: true };
  }

  // --- Promotions ---
  public getPromotions(): Promotion[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROMOTIONS);
      const allPromos: Promotion[] = stored ? JSON.parse(stored) : INITIAL_PROMOTIONS;
      const currentUser = this.getCurrentUser();

      // Sales users see only Active or Completed promotions (or promotions they are assigned to)
      if (currentUser.role === 'sales') {
        return allPromos.filter((p) => p.status === 'Active' || p.status === 'Completed');
      }
      return allPromos;
    } catch {
      return INITIAL_PROMOTIONS;
    }
  }

  public getAllPromotionsUnfiltered(): Promotion[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROMOTIONS);
      return stored ? JSON.parse(stored) : INITIAL_PROMOTIONS;
    } catch {
      return INITIAL_PROMOTIONS;
    }
  }

  public createPromotion(promoData: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): { success: boolean; error?: string; promotion?: Promotion } {
    const currentUser = this.getCurrentUser();
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only Admin users can create promotions.' };
    }

    const allPromos = this.getAllPromotionsUnfiltered();
    const newPromo: Promotion = {
      ...promoData,
      id: `prm-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    allPromos.unshift(newPromo);
    localStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(allPromos));
    this.recordDraft('promotion', 'create', newPromo);

    // Auto-assign stores for selected target Sub-Channels if provided
    if (newPromo.targetSubChannels && newPromo.targetSubChannels.length > 0) {
      const targetSubChannelsSet = new Set(newPromo.targetSubChannels);
      const matchingStoreIds = this.getAllStoresUnfiltered()
        .filter((s) => targetSubChannelsSet.has(s.subChannel))
        .map((s) => s.id);
      if (matchingStoreIds.length > 0) {
        this.assignStoresToPromotion(newPromo.id, matchingStoreIds);
      }
    }

    this.notify();

    return { success: true, promotion: newPromo };
  }

  public updatePromotion(promoId: string, updates: Partial<Promotion>): { success: boolean; error?: string } {
    const currentUser = this.getCurrentUser();
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only Admin users can update promotions.' };
    }

    const allPromos = this.getAllPromotionsUnfiltered();
    const index = allPromos.findIndex((p) => p.id === promoId);
    if (index === -1) {
      return { success: false, error: 'Promotion not found.' };
    }

    allPromos[index] = {
      ...allPromos[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(allPromos));
    this.recordDraft('promotion', 'update', allPromos[index]);

    // Auto-assign stores if targetSubChannels were updated
    if (updates.targetSubChannels && updates.targetSubChannels.length > 0) {
      const targetSubChannelsSet = new Set(updates.targetSubChannels);
      const matchingStoreIds = this.getAllStoresUnfiltered()
        .filter((s) => targetSubChannelsSet.has(s.subChannel))
        .map((s) => s.id);
      if (matchingStoreIds.length > 0) {
        this.assignStoresToPromotion(promoId, matchingStoreIds);
      }
    }

    this.notify();

    return { success: true };
  }

  public deletePromotion(promoId: string): { success: boolean; error?: string } {
    const currentUser = this.getCurrentUser();
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only Admin users can delete promotions.' };
    }

    const allPromos = this.getAllPromotionsUnfiltered();
    const index = allPromos.findIndex((p) => p.id === promoId);
    if (index === -1) {
      return { success: false, error: 'Promotion not found.' };
    }

    const deleted = allPromos.splice(index, 1)[0];
    localStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(allPromos));

    // Also remove promotion stores associated with this promotion
    try {
      const storedPS = localStorage.getItem(STORAGE_KEYS.PROMOTION_STORES);
      if (storedPS) {
        const pStores: PromotionStore[] = JSON.parse(storedPS);
        const filteredPS = pStores.filter((ps) => ps.promotionId !== promoId);
        localStorage.setItem(STORAGE_KEYS.PROMOTION_STORES, JSON.stringify(filteredPS));
      }
    } catch {
      // ignore
    }

    this.recordDraft('promotion', 'delete', deleted);
    this.notify();

    return { success: true };
  }

  // --- Promotion Stores (Order Tracking) ---
  public getPromotionStores(promotionId?: string): PromotionStore[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROMOTION_STORES);
      let list: PromotionStore[] = stored ? JSON.parse(stored) : INITIAL_PROMOTION_STORES;

      if (promotionId) {
        list = list.filter((ps) => ps.promotionId === promotionId);
      }

      const currentUser = this.getCurrentUser();
      // Sales user only sees records for stores assigned to them
      if (currentUser.role === 'sales') {
        const myStoreIds = new Set(this.getStores().map((s) => s.id));
        return list.filter((ps) => myStoreIds.has(ps.storeId));
      }

      return list;
    } catch {
      return INITIAL_PROMOTION_STORES;
    }
  }

  public getAllPromotionStoresUnfiltered(): PromotionStore[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROMOTION_STORES);
      return stored ? JSON.parse(stored) : INITIAL_PROMOTION_STORES;
    } catch {
      return INITIAL_PROMOTION_STORES;
    }
  }

  public assignStoresToPromotion(promotionId: string, storeIds: string[]): { success: boolean; addedCount: number } {
    const currentUser = this.getCurrentUser();
    if (currentUser.role !== 'admin') {
      return { success: false, addedCount: 0 };
    }

    const allList = this.getAllPromotionStoresUnfiltered();
    const existingStoreIds = new Set(allList.filter((ps) => ps.promotionId === promotionId).map((ps) => ps.storeId));

    let addedCount = 0;
    storeIds.forEach((sid) => {
      if (!existingStoreIds.has(sid)) {
        const newRecord: PromotionStore = {
          id: `ps-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          storeId: sid,
          promotionId,
          orderStatus: 'Not Ordered',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        allList.push(newRecord);
        addedCount++;
      }
    });

    localStorage.setItem(STORAGE_KEYS.PROMOTION_STORES, JSON.stringify(allList));
    this.notify();
    return { success: true, addedCount };
  }

  public updateOrderStatus(params: {
    promotionStoreId: string;
    newStatus: OrderStatus;
    orderDate?: string;
    orderAmount?: number;
    lastFollowUpDate?: string;
    nextFollowUpDate?: string;
    remark?: string;
    createAutoTask?: boolean;
    taskDueDate?: string;
    taskPriority?: 'Low' | 'Medium' | 'High';
  }): { success: boolean; error?: string } {
    const currentUser = this.getCurrentUser();
    const allList = this.getAllPromotionStoresUnfiltered();
    const index = allList.findIndex((ps) => ps.id === params.promotionStoreId);

    if (index === -1) {
      return { success: false, error: 'Tracking record not found.' };
    }

    const record = allList[index];
    const allStores = this.getAllStoresUnfiltered();
    const store = allStores.find((s) => s.id === record.storeId);

    // RLS Permission check: Admin or assigned Sales user
    if (currentUser.role === 'sales') {
      if (!store || store.assignedSalesUser !== currentUser.id) {
        return { success: false, error: 'Unauthorized: You can only update orders for stores assigned to you.' };
      }
    }

    const oldStatus = record.orderStatus;
    const nowIso = new Date().toISOString();

    allList[index] = {
      ...record,
      orderStatus: params.newStatus,
      orderDate: params.newStatus === 'Ordered' ? (params.orderDate || nowIso) : record.orderDate,
      orderAmount: params.orderAmount !== undefined ? params.orderAmount : record.orderAmount,
      lastFollowUpDate: params.lastFollowUpDate !== undefined ? params.lastFollowUpDate : record.lastFollowUpDate,
      nextFollowUpDate: params.nextFollowUpDate !== undefined ? params.nextFollowUpDate : record.nextFollowUpDate,
      remark: params.remark !== undefined ? params.remark : record.remark,
      updatedBy: currentUser.id,
      updatedAt: nowIso
    };

    localStorage.setItem(STORAGE_KEYS.PROMOTION_STORES, JSON.stringify(allList));

    // Append to Audit History
    this.appendAuditLog({
      promotionStoreId: record.id,
      storeId: record.storeId,
      promotionId: record.promotionId,
      oldStatus,
      newStatus: params.newStatus,
      changedBy: currentUser.id,
      notes: params.remark || `Status changed from ${oldStatus} to ${params.newStatus}`
    });

    // Auto-create To-Do task if Follow-up Required
    if (params.newStatus === 'Follow-up Required' && params.createAutoTask && store) {
      this.ensureFollowUpTask({
        storeId: store.id,
        promotionId: record.promotionId,
        assignedUser: store.assignedSalesUser || currentUser.id,
        taskTitle: `Follow up: ${store.storeName} (${store.storeCode})`,
        dueDate: params.nextFollowUpDate || params.taskDueDate || new Date(Date.now() + 86400000 * 3).toISOString(),
        priority: params.taskPriority || 'High',
        remark: params.remark || 'Auto-generated follow-up task from order tracking'
      });
    }

    this.recordDraft('order_status', 'update', allList[index]);
    this.notify();
    return { success: true };
  }

  // --- Audit Logs ---
  public getAuditLogs(storeId?: string, promotionId?: string): OrderStatusHistory[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      let list: OrderStatusHistory[] = stored ? JSON.parse(stored) : INITIAL_AUDIT_LOGS;

      if (storeId) list = list.filter((l) => l.storeId === storeId);
      if (promotionId) list = list.filter((l) => l.promotionId === promotionId);

      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  }

  private appendAuditLog(entry: Omit<OrderStatusHistory, 'id' | 'createdAt'>) {
    const list = this.getAuditLogs();
    const newLog: OrderStatusHistory = {
      ...entry,
      id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    list.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(list));
  }

  // --- Sub-Channel Helper for batch store selection ---
  public getSubChannelsWithStoreCounts(): { subChannel: string; channel: string; storeCount: number }[] {
    const stores = this.getAllStoresUnfiltered();
    const map = new Map<string, { channel: string; count: number }>();
    stores.forEach((s) => {
      const current = map.get(s.subChannel) || { channel: s.channel, count: 0 };
      current.count += 1;
      map.set(s.subChannel, current);
    });

    const result: { subChannel: string; channel: string; storeCount: number }[] = [];
    map.forEach((val, subCh) => {
      result.push({ subChannel: subCh, channel: val.channel, storeCount: val.count });
    });
    return result.sort((a, b) => b.storeCount - a.storeCount);
  }

  // --- New Product Launches (NPD) & Orders ---
  public getNewProducts(): NewProductLaunch[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NEW_PRODUCTS);
      const all: NewProductLaunch[] = stored ? JSON.parse(stored) : INITIAL_NEW_PRODUCTS;
      const currentUser = this.getCurrentUser();
      if (currentUser.role === 'sales') {
        return all.filter((p) => p.status === 'Active' || p.status === 'Completed');
      }
      return all;
    } catch {
      return INITIAL_NEW_PRODUCTS;
    }
  }

  public getAllNewProductsUnfiltered(): NewProductLaunch[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NEW_PRODUCTS);
      return stored ? JSON.parse(stored) : INITIAL_NEW_PRODUCTS;
    } catch {
      return INITIAL_NEW_PRODUCTS;
    }
  }

  public createNewProduct(productData: Omit<NewProductLaunch, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): { success: boolean; error?: string; product?: NewProductLaunch } {
    const currentUser = this.getCurrentUser();
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only Admin users can create new products.' };
    }

    const all = this.getAllNewProductsUnfiltered();
    const newProduct: NewProductLaunch = {
      ...productData,
      id: `np-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    all.unshift(newProduct);
    localStorage.setItem(STORAGE_KEYS.NEW_PRODUCTS, JSON.stringify(all));
    this.recordDraft('promotion', 'create', newProduct);
    this.notify();

    return { success: true, product: newProduct };
  }

  public updateNewProduct(productId: string, updates: Partial<NewProductLaunch>): { success: boolean; error?: string } {
    const currentUser = this.getCurrentUser();
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only Admin users can update new products.' };
    }

    const all = this.getAllNewProductsUnfiltered();
    const index = all.findIndex((p) => p.id === productId);
    if (index === -1) {
      return { success: false, error: 'New product not found.' };
    }

    all[index] = {
      ...all[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.NEW_PRODUCTS, JSON.stringify(all));
    this.recordDraft('promotion', 'update', all[index]);
    this.notify();

    return { success: true };
  }

  public deleteNewProduct(productId: string): { success: boolean; error?: string } {
    const currentUser = this.getCurrentUser();
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only Admin users can delete new products.' };
    }

    const products = this.getAllNewProductsUnfiltered();
    if (!products.some((product) => product.id === productId)) return { success: false, error: 'Product not found.' };
    const all = products.filter((p) => p.id !== productId);
    localStorage.setItem(STORAGE_KEYS.NEW_PRODUCTS, JSON.stringify(all));

    // Also remove associated store orders
    const orders = this.getAllNewProductStoreOrdersUnfiltered().filter((o) => o.productId !== productId);
    localStorage.setItem(STORAGE_KEYS.NEW_PRODUCT_STORE_ORDERS, JSON.stringify(orders));

    this.notify();
    return { success: true };
  }

  public getNewProductStoreOrders(productId?: string): NewProductStoreOrder[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NEW_PRODUCT_STORE_ORDERS);
      let list: NewProductStoreOrder[] = stored ? JSON.parse(stored) : INITIAL_NEW_PRODUCT_STORE_ORDERS;

      if (productId) {
        list = list.filter((o) => o.productId === productId);
      }

      const currentUser = this.getCurrentUser();
      if (currentUser.role === 'sales') {
        const myStoreIds = new Set(this.getStores().map((s) => s.id));
        return list.filter((o) => myStoreIds.has(o.storeId));
      }

      return list;
    } catch {
      return INITIAL_NEW_PRODUCT_STORE_ORDERS;
    }
  }

  public getAllNewProductStoreOrdersUnfiltered(): NewProductStoreOrder[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NEW_PRODUCT_STORE_ORDERS);
      return stored ? JSON.parse(stored) : INITIAL_NEW_PRODUCT_STORE_ORDERS;
    } catch {
      return INITIAL_NEW_PRODUCT_STORE_ORDERS;
    }
  }

  public assignStoresToNewProduct(productId: string, storeIds: string[]): { success: boolean; addedCount: number } {
    const currentUser = this.getCurrentUser();
    if (currentUser.role !== 'admin') {
      return { success: false, addedCount: 0 };
    }

    const allList = this.getAllNewProductStoreOrdersUnfiltered();
    const existingStoreIds = new Set(allList.filter((o) => o.productId === productId).map((o) => o.storeId));

    let addedCount = 0;
    storeIds.forEach((sid) => {
      if (!existingStoreIds.has(sid)) {
        const newRecord: NewProductStoreOrder = {
          id: `npo-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          storeId: sid,
          productId,
          orderStatus: 'Not Ordered',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        allList.push(newRecord);
        addedCount++;
      }
    });

    localStorage.setItem(STORAGE_KEYS.NEW_PRODUCT_STORE_ORDERS, JSON.stringify(allList));
    this.notify();
    return { success: true, addedCount };
  }

  public updateNewProductOrderStatus(params: {
    orderId?: string;
    productId: string;
    storeId: string;
    newStatus: NewProductOrderStatus;
    orderQuantity?: number;
    orderAmount?: number;
    orderDate?: string;
    invoiceNumber?: string;
    sampleQty?: number;
    sampleGivenDate?: string;
    customerFeedback?: string;
    nextFollowUpDate?: string;
    createAutoTask?: boolean;
  }): { success: boolean; error?: string } {
    const allList = this.getAllNewProductStoreOrdersUnfiltered();
    let index = -1;
    if (params.orderId) {
      index = allList.findIndex((o) => o.id === params.orderId);
    } else {
      index = allList.findIndex((o) => o.productId === params.productId && o.storeId === params.storeId);
    }

    const currentUser = this.getCurrentUser();

    if (index === -1) {
      const newRecord: NewProductStoreOrder = {
        id: `npo-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        productId: params.productId,
        storeId: params.storeId,
        orderStatus: params.newStatus,
        orderQuantity: params.orderQuantity,
        orderAmount: params.orderAmount,
        orderDate: params.orderDate,
        invoiceNumber: params.invoiceNumber,
        sampleQty: params.sampleQty,
        sampleGivenDate: params.sampleGivenDate,
        customerFeedback: params.customerFeedback,
        nextFollowUpDate: params.nextFollowUpDate,
        updatedBy: currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      allList.unshift(newRecord);
    } else {
      allList[index] = {
        ...allList[index],
        orderStatus: params.newStatus,
        orderQuantity: params.orderQuantity !== undefined ? params.orderQuantity : allList[index].orderQuantity,
        orderAmount: params.orderAmount !== undefined ? params.orderAmount : allList[index].orderAmount,
        orderDate: params.orderDate !== undefined ? params.orderDate : allList[index].orderDate,
        invoiceNumber: params.invoiceNumber !== undefined ? params.invoiceNumber : allList[index].invoiceNumber,
        sampleQty: params.sampleQty !== undefined ? params.sampleQty : allList[index].sampleQty,
        sampleGivenDate: params.sampleGivenDate !== undefined ? params.sampleGivenDate : allList[index].sampleGivenDate,
        customerFeedback: params.customerFeedback !== undefined ? params.customerFeedback : allList[index].customerFeedback,
        nextFollowUpDate: params.nextFollowUpDate !== undefined ? params.nextFollowUpDate : allList[index].nextFollowUpDate,
        updatedBy: currentUser.id,
        updatedAt: new Date().toISOString()
      };
    }

    localStorage.setItem(STORAGE_KEYS.NEW_PRODUCT_STORE_ORDERS, JSON.stringify(allList));

    if (params.createAutoTask && (params.newStatus === 'Follow-up Required' || params.newStatus === 'Sample Provided')) {
      const store = this.getAllStoresUnfiltered().find((s) => s.id === params.storeId);
      const product = this.getAllNewProductsUnfiltered().find((p) => p.id === params.productId);
      const storeName = store ? store.storeName : 'Store';
      const prodName = product ? product.productName : 'New Product';

      this.createTask({
        storeId: params.storeId,
        assignedUser: store ? store.assignedSalesUser : currentUser.id,
        taskTitle: `Follow-up on New Product: ${prodName} at ${storeName}`,
        dueDate: params.nextFollowUpDate || new Date(Date.now() + 86400000 * 3).toISOString(),
        priority: 'High',
        taskStatus: 'Pending',
        remark: params.customerFeedback || 'Follow-up regarding new product order status'
      });
    }

    this.notify();
    return { success: true };
  }

  // --- To-Do List (Tasks) ---
  public getTasks(): FollowUpTask[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TASKS);
      const allTasks: FollowUpTask[] = stored ? JSON.parse(stored) : INITIAL_TASKS;
      const currentUser = this.getCurrentUser();

      // Sales user only views tasks assigned to them
      if (currentUser.role === 'sales') {
        return allTasks.filter((t) => t.assignedUser === currentUser.id);
      }
      return allTasks;
    } catch {
      return INITIAL_TASKS;
    }
  }

  public getAllTasksUnfiltered(): FollowUpTask[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TASKS);
      return stored ? JSON.parse(stored) : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  }

  public createTask(taskData: Omit<FollowUpTask, 'id' | 'createdAt' | 'updatedAt'>): { success: boolean; task?: FollowUpTask } {
    const allTasks = this.getAllTasksUnfiltered();
    const newTask: FollowUpTask = {
      ...taskData,
      id: `tsk-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    allTasks.unshift(newTask);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(allTasks));
    this.recordDraft('task', 'create', newTask);
    this.notify();

    return { success: true, task: newTask };
  }

  public ensureFollowUpTask(taskData: Omit<FollowUpTask, 'id' | 'createdAt' | 'updatedAt' | 'taskStatus'> & { taskStatus?: FollowUpTask['taskStatus'] }) {
    const allTasks = this.getAllTasksUnfiltered();
    // Prevent duplicate pending tasks for the exact same store and promotion
    const exists = allTasks.some(
      (t) =>
        t.storeId === taskData.storeId &&
        t.promotionId === taskData.promotionId &&
        (t.taskStatus === 'Pending' || t.taskStatus === 'In Progress')
    );

    if (exists) return; // avoid duplicate

    this.createTask({
      ...taskData,
      taskStatus: taskData.taskStatus || 'Pending'
    });
  }

  public updateTask(taskId: string, updates: Partial<FollowUpTask>): { success: boolean; error?: string } {
    const currentUser = this.getCurrentUser();
    const allTasks = this.getAllTasksUnfiltered();
    const index = allTasks.findIndex((t) => t.id === taskId);

    if (index === -1) {
      return { success: false, error: 'Task not found.' };
    }

    if (currentUser.role === 'sales' && allTasks[index].assignedUser !== currentUser.id) {
      return { success: false, error: 'Unauthorized: You can only update tasks assigned to you.' };
    }

    allTasks[index] = {
      ...allTasks[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(allTasks));
    this.recordDraft('task', 'update', allTasks[index]);
    this.notify();

    return { success: true };
  }

  public deleteTask(taskId: string): { success: boolean; error?: string } {
    const currentUser = this.getCurrentUser();
    const allTasks = this.getAllTasksUnfiltered();
    const task = allTasks.find((t) => t.id === taskId);

    if (!task) return { success: false, error: 'Task not found.' };

    if (currentUser.role === 'sales' && task.assignedUser !== currentUser.id) {
      return { success: false, error: 'Unauthorized: You can only delete tasks assigned to you.' };
    }

    const filtered = allTasks.filter((t) => t.id !== taskId);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(filtered));
    this.recordDraft('task', 'delete', { id: taskId });
    this.notify();

    return { success: true };
  }

  // --- Offline Drafts Queue ---
  public getOfflineDrafts(): OfflineDraft[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.OFFLINE_DRAFTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private recordDraft(entityType: OfflineDraft['entityType'], action: OfflineDraft['action'], payload: any) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const drafts = this.getOfflineDrafts();
      drafts.push({
        id: `drf-${Date.now()}`,
        entityType,
        action,
        payload,
        timestamp: new Date().toISOString(),
        synced: false
      });
      localStorage.setItem(STORAGE_KEYS.OFFLINE_DRAFTS, JSON.stringify(drafts));
    }
  }

  public clearSyncedDrafts() {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_DRAFTS, JSON.stringify([]));
    this.notify();
  }

  // --- SheetJS Excel Import & Export ---
  public async parseExcelFile(file: File): Promise<{
    rows: ExcelImportRow[];
    headers: string[];
    errors: string[];
    warnings: string[];
  }> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return { rows: [], headers: [], errors: ['No sheet found in workbook.'], warnings: [] };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawJson = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });

    if (rawJson.length < 2) {
      return { rows: [], headers: [], errors: ['Excel file has no data rows (empty or header only).'], warnings: [] };
    }

    const rawHeaders: string[] = (rawJson[0] as string[]).map((h) => String(h || '').trim());
    const dataRows = rawJson.slice(1);

    // Map column indices
    const findIndex = (candidates: string[]) =>
      rawHeaders.findIndex((h) => candidates.some((c) => h.toLowerCase().includes(c.toLowerCase())));

    const codeIdx = findIndex(['code', 'store code', 'store_code']);
    const nameIdx = findIndex(['name', 'store name', 'store_name']);
    const channelIdx = findIndex(['channel', 'trade channel']);
    const subChannelIdx = findIndex(['sub channel', 'sub_channel', 'subchannel']);
    const salesIdx = findIndex(['sales', 'assigned sales', 'rep', 'representative']);

    const errors: string[] = [];
    const warnings: string[] = [];

    if (codeIdx === -1) errors.push('Missing required column: "Store Code"');
    if (nameIdx === -1) errors.push('Missing required column: "Store Name"');
    if (channelIdx === -1) warnings.push('Column "Channel" not detected, will use default "General Trade"');

    if (errors.length > 0) {
      return { rows: [], headers: rawHeaders, errors, warnings };
    }

    const allStores = this.getAllStoresUnfiltered();
    const existingCodes = new Set(allStores.map((s) => s.storeCode.toUpperCase()));
    const fileCodesSeen = new Set<string>();

    const parsedRows: ExcelImportRow[] = [];

    dataRows.forEach((row, rowIndex) => {
      if (!row || row.length === 0) return;

      const rawCode = String(row[codeIdx] || '').trim();
      const rawName = String(row[nameIdx] || '').trim();
      const rawChannel = channelIdx !== -1 ? String(row[channelIdx] || '').trim() : 'General Trade';
      const rawSubChannel = subChannelIdx !== -1 ? String(row[subChannelIdx] || '').trim() : 'Medium Grocery';
      const rawSales = salesIdx !== -1 ? String(row[salesIdx] || '').trim() : '';

      if (!rawCode && !rawName) return; // skip blank trailing row

      const rowErrors: string[] = [];
      if (!rawCode) rowErrors.push('Store Code is required');
      if (!rawName) rowErrors.push('Store Name is required');

      const upperCode = rawCode.toUpperCase();
      let isDuplicate = false;

      if (existingCodes.has(upperCode)) {
        isDuplicate = true;
      }
      if (fileCodesSeen.has(upperCode)) {
        rowErrors.push('Duplicate Store Code inside file');
        isDuplicate = true;
      }
      if (upperCode) {
        fileCodesSeen.add(upperCode);
      }

      parsedRows.push({
        storeCode: rawCode,
        storeName: rawName,
        channel: rawChannel || 'General Trade',
        subChannel: rawSubChannel || 'Medium Grocery',
        assignedSales: rawSales,
        isValid: rowErrors.length === 0,
        errors: rowErrors,
        isDuplicate
      });
    });

    return {
      rows: parsedRows,
      headers: rawHeaders,
      errors,
      warnings
    };
  }

  public batchImportStores(
    rows: ExcelImportRow[],
    duplicateAction: 'skip' | 'update'
  ): {
    success: boolean;
    importedCount: number;
    updatedCount: number;
    skippedCount: number;
  } {
    const currentUser = this.getCurrentUser();
    if (currentUser.role !== 'admin') {
      return { success: false, importedCount: 0, updatedCount: 0, skippedCount: 0 };
    }

    const allStores = this.getAllStoresUnfiltered();
    const salesReps = this.getSalesReps();
    const defaultSalesUser = salesReps[0]?.id || currentUser.id;

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    rows.forEach((row) => {
      if (!row.isValid && row.errors && row.errors.length > 0) {
        skippedCount++;
        return;
      }

      const cleanCode = row.storeCode.trim().toUpperCase();
      const existingIndex = allStores.findIndex((s) => s.storeCode.toUpperCase() === cleanCode);

      // Resolve sales rep ID from text name
      let salesUserId = defaultSalesUser;
      if (row.assignedSales) {
        const matchedRep = salesReps.find(
          (r) =>
            r.fullName.toLowerCase().includes(row.assignedSales.toLowerCase()) ||
            r.email.toLowerCase().includes(row.assignedSales.toLowerCase())
        );
        if (matchedRep) salesUserId = matchedRep.id;
      }

      if (existingIndex !== -1) {
        if (duplicateAction === 'skip') {
          skippedCount++;
        } else {
          // Update existing
          allStores[existingIndex] = {
            ...allStores[existingIndex],
            storeName: row.storeName || allStores[existingIndex].storeName,
            channel: row.channel || allStores[existingIndex].channel,
            subChannel: row.subChannel || allStores[existingIndex].subChannel,
            assignedSalesUser: salesUserId,
            updatedAt: new Date().toISOString()
          };
          updatedCount++;
        }
      } else {
        // Insert new store
        allStores.push({
          id: `str-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          storeCode: cleanCode,
          storeName: row.storeName,
          channel: row.channel || 'General Trade',
          subChannel: row.subChannel || 'Medium Grocery',
          assignedSalesUser: salesUserId,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        importedCount++;
      }
    });

    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(allStores));
    this.notify();

    return { success: true, importedCount, updatedCount, skippedCount };
  }

  public exportStoresToExcel(storesToExport?: Store[]) {
    const list = storesToExport || this.getStores();
    const salesMap = new Map(this.getAllUsers().map((u) => [u.id, u.fullName]));

    const data = list.map((s) => ({
      'Store Code': s.storeCode,
      'Store Name': s.storeName,
      'Channel': s.channel,
      'Sub Channel': s.subChannel,
      'Assigned Sales': salesMap.get(s.assignedSalesUser) || 'Unassigned',
      'City / Province': s.city || 'Vientiane',
      'Phone': s.phone || '',
      'Status': s.isActive ? 'Active' : 'Inactive',
      'Created Date': s.createdAt.substring(0, 10)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 15 },
      { wch: 35 },
      { wch: 20 },
      { wch: 20 },
      { wch: 25 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Retail Stores');
    XLSX.writeFile(wb, `Stores_Export_${new Date().toISOString().substring(0, 10)}.xlsx`);
  }

  public exportPromotionResultsToExcel(promotionId?: string) {
    const pStores = this.getPromotionStores(promotionId);
    const allStores = new Map(this.getAllStoresUnfiltered().map((s) => [s.id, s]));
    const allPromos = new Map(this.getAllPromotionsUnfiltered().map((p) => [p.id, p]));
    const allUsers = new Map(this.getAllUsers().map((u) => [u.id, u.fullName]));

    const data = pStores.map((ps) => {
      const store = allStores.get(ps.storeId);
      const promo = allPromos.get(ps.promotionId);
      return {
        'Promotion Name': promo?.promotionName || ps.promotionId,
        'Store Code': store?.storeCode || 'N/A',
        'Store Name': store?.storeName || 'N/A',
        'Channel': store?.channel || 'N/A',
        'Assigned Sales': store ? allUsers.get(store.assignedSalesUser) || 'N/A' : 'N/A',
        'Order Status': ps.orderStatus,
        'Order Date': ps.orderDate ? ps.orderDate.substring(0, 10) : '',
        'Order Amount (LAK)': ps.orderAmount || 0,
        'Last Follow-up': ps.lastFollowUpDate ? ps.lastFollowUpDate.substring(0, 10) : '',
        'Next Follow-up': ps.nextFollowUpDate ? ps.nextFollowUpDate.substring(0, 10) : '',
        'Remarks': ps.remark || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 32 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Promotion Orders');
    XLSX.writeFile(wb, `Promotion_Tracking_Results_${new Date().toISOString().substring(0, 10)}.xlsx`);
  }

  public exportTasksToExcel() {
    const tasks = this.getTasks();
    const allStores = new Map(this.getAllStoresUnfiltered().map((s) => [s.id, s]));
    const allPromos = new Map(this.getAllPromotionsUnfiltered().map((p) => [p.id, p]));
    const allUsers = new Map(this.getAllUsers().map((u) => [u.id, u.fullName]));

    const data = tasks.map((t) => {
      const store = allStores.get(t.storeId);
      const promo = t.promotionId ? allPromos.get(t.promotionId) : undefined;
      return {
        'Task Title': t.taskTitle,
        'Store Code': store?.storeCode || '',
        'Store Name': store?.storeName || '',
        'Promotion': promo?.promotionName || 'General Follow-up',
        'Assigned Sales': allUsers.get(t.assignedUser) || '',
        'Due Date': t.dueDate ? t.dueDate.substring(0, 10) : '',
        'Priority': t.priority,
        'Status': t.taskStatus,
        'Remarks': t.remark || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Follow Up Tasks');
    XLSX.writeFile(wb, `Sales_Tasks_${new Date().toISOString().substring(0, 10)}.xlsx`);
  }

  public exportPerformanceReportToExcel() {
    const pStores = this.getAllPromotionStoresUnfiltered();
    const allStores = this.getAllStoresUnfiltered();
    const storeMap = new Map(allStores.map((s) => [s.id, s]));
    const salesReps = this.getSalesReps();

    const data = salesReps.map((rep) => {
      const repStores = allStores.filter((s) => s.assignedSalesUser === rep.id);
      const repStoreIds = new Set(repStores.map((s) => s.id));
      const repPromoStores = pStores.filter((ps) => repStoreIds.has(ps.storeId));

      const totalParticipating = repPromoStores.length;
      const orderedCount = repPromoStores.filter((ps) => ps.orderStatus === 'Ordered').length;
      const followUpCount = repPromoStores.filter((ps) => ps.orderStatus === 'Follow-up Required').length;
      const notOrderedCount = repPromoStores.filter((ps) => ps.orderStatus === 'Not Ordered').length;
      const conversionRate = totalParticipating > 0 ? ((orderedCount / totalParticipating) * 100).toFixed(1) + '%' : '0.0%';
      const totalRevenue = repPromoStores.reduce((acc, curr) => acc + (curr.orderAmount || 0), 0);

      return {
        'Sales Representative': rep.fullName,
        'Email': rep.email,
        'Assigned Stores': repStores.length,
        'Participating In Promos': totalParticipating,
        'Ordered Stores': orderedCount,
        'Follow-up Required': followUpCount,
        'Not Ordered Stores': notOrderedCount,
        'Conversion Rate': conversionRate,
        'Total Order Value (LAK)': totalRevenue
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Rep Performance');
    XLSX.writeFile(wb, `Sales_Performance_Report_${new Date().toISOString().substring(0, 10)}.xlsx`);
  }
}

export const dataService = new DataService();
