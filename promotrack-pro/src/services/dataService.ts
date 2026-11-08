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
} from './workbookData';
import { DATASET_VERSION, OUTLET_DATASET } from './workbookData';
import * as XLSX from 'xlsx';
import { APP_LOGO_URL, LOGO_REVISION } from './branding';
import { stateStorageKeys, type AppData } from './appState';

// A separate namespace activates only the supplied workbook. Old browser data
// remains recoverable under its old keys and is never mixed into this dataset.
const datasetKey = (name: string) => `promotrack_outlet_${DATASET_VERSION}_${name}`;
export const STORAGE_KEYS = {
  CURRENT_USER: datasetKey('current_user'),
  USERS: datasetKey('users'),
  CHANNELS: datasetKey('channels'),
  SUB_CHANNELS: datasetKey('sub_channels'),
  STORES: datasetKey('stores'),
  PROMOTIONS: datasetKey('promotions'),
  PROMOTION_STORES: datasetKey('promo_stores'),
  NEW_PRODUCTS: datasetKey('new_products'),
  NEW_PRODUCT_STORE_ORDERS: datasetKey('np_store_orders'),
  TASKS: datasetKey('tasks'),
  AUDIT_LOGS: datasetKey('audit_logs'),
  OFFLINE_DRAFTS: datasetKey('offline_drafts'),
  LANGUAGE: 'promotrack_lang',
  THEME: 'promotrack_theme',
  THEME_COLOR: 'promotrack_theme_color',
  APP_BRANDING: 'promotrack_app_branding'
};

const DEFAULT_BRANDING: AppBranding = {
  appName: 'Super MDE',
  tagline: 'Sales Promotion & Store Execution PWA',
  logoType: 'custom',
  logoIcon: 'Sparkles',
  logoColor: '#248A60',
  customLogoUrl: APP_LOGO_URL
};

class DataService {
  private listeners: Set<() => void> = new Set();
  private remoteContext: { userId: string; mdes: UserProfile[] } | null = null;

  public bindRemote(project: string, userId: string) {
    this.remoteContext = { userId, mdes: [] };
    this.remoteMemory.clear();
    for (const key of [...Object.values(stateStorageKeys), 'CURRENT_USER', 'OFFLINE_DRAFTS'] as const) {
      STORAGE_KEYS[key] = `promotrack_supabase_${project}_${userId}_${key.toLowerCase()}`;
    }
    try { this.remoteContext.mdes = JSON.parse(this.readStored(STORAGE_KEYS.USERS + '_mdes') || '[]'); } catch { /* no cached references */ }
  }

  public exportState(): AppData {
    return Object.fromEntries(Object.entries(stateStorageKeys).map(([name, key]) => [name, JSON.parse(this.readStored(STORAGE_KEYS[key]) || '[]')])) as unknown as AppData;
  }

  public replaceRemoteState(state: AppData, user: UserProfile, mdes: UserProfile[]) {
    if (!this.remoteContext || user.id !== this.remoteContext.userId) throw new Error('Account mismatch');
    for (const [name, key] of Object.entries(stateStorageKeys)) this.writeStored(STORAGE_KEYS[key], JSON.stringify(state[name as keyof AppData]));
    this.writeStored(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    this.writeStored(STORAGE_KEYS.USERS + '_mdes', JSON.stringify(mdes));
    this.remoteContext.mdes = mdes;
    this.notify();
  }

  public getAccountProfiles(): UserProfile[] {
    if (this.remoteContext) return JSON.parse(this.readStored(STORAGE_KEYS.USERS) || '[]');
    return this.getAllUsers();
  }

  private isOwnAssignment(id: string) {
    const user = this.getCurrentUser();
    return id === user.id || (!!user.mdeId && id === user.mdeId);
  }

  private remoteMemory = new Map<string, string>();
  private isRemoteDataKey(key: string) {
    return !!this.remoteContext && (key === STORAGE_KEYS.CURRENT_USER || Object.values(stateStorageKeys).some((name) => STORAGE_KEYS[name] === key));
  }
  private readStored(key: string) {
    if (this.isRemoteDataKey(key)) return this.remoteMemory.get(key) ?? (key === STORAGE_KEYS.CURRENT_USER ? null : '[]');
    return localStorage.getItem(key);
  }
  private writeStored(key: string, value: string) {
    if (this.isRemoteDataKey(key)) this.remoteMemory.set(key, value);
    else localStorage.setItem(key, value);
  }

  constructor() {
    this.initStorage();
  }

  private initStorage() {
    if (typeof window === 'undefined') return;

    if (!this.readStored(STORAGE_KEYS.USERS)) {
      this.writeStored(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!this.readStored(STORAGE_KEYS.CURRENT_USER)) {
      // Default persona: Admin
      this.writeStored(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
    }
    if (!this.readStored(STORAGE_KEYS.CHANNELS)) {
      this.writeStored(STORAGE_KEYS.CHANNELS, JSON.stringify(INITIAL_CHANNELS));
    }
    if (!this.readStored(STORAGE_KEYS.SUB_CHANNELS)) {
      this.writeStored(STORAGE_KEYS.SUB_CHANNELS, JSON.stringify(INITIAL_SUB_CHANNELS));
    }
    if (!this.readStored(STORAGE_KEYS.STORES)) {
      this.writeStored(STORAGE_KEYS.STORES, JSON.stringify(INITIAL_STORES));
    }
    if (!this.readStored(STORAGE_KEYS.PROMOTIONS)) {
      this.writeStored(STORAGE_KEYS.PROMOTIONS, JSON.stringify(INITIAL_PROMOTIONS));
    }
    if (!this.readStored(STORAGE_KEYS.PROMOTION_STORES)) {
      this.writeStored(STORAGE_KEYS.PROMOTION_STORES, JSON.stringify(INITIAL_PROMOTION_STORES));
    }
    if (!this.readStored(STORAGE_KEYS.NEW_PRODUCTS)) {
      this.writeStored(STORAGE_KEYS.NEW_PRODUCTS, JSON.stringify(INITIAL_NEW_PRODUCTS));
    }
    if (!this.readStored(STORAGE_KEYS.NEW_PRODUCT_STORE_ORDERS)) {
      this.writeStored(STORAGE_KEYS.NEW_PRODUCT_STORE_ORDERS, JSON.stringify(INITIAL_NEW_PRODUCT_STORE_ORDERS));
    }
    if (!this.readStored(STORAGE_KEYS.TASKS)) {
      this.writeStored(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
    }
    if (!this.readStored(STORAGE_KEYS.AUDIT_LOGS)) {
      this.writeStored(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    }
    if (!this.readStored(STORAGE_KEYS.OFFLINE_DRAFTS)) {
      this.writeStored(STORAGE_KEYS.OFFLINE_DRAFTS, JSON.stringify([]));
    }
    if (!this.readStored(STORAGE_KEYS.APP_BRANDING)) {
      this.writeStored(STORAGE_KEYS.APP_BRANDING, JSON.stringify(DEFAULT_BRANDING));
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
      const stored = this.readStored(STORAGE_KEYS.APP_BRANDING);
      const branding = { ...DEFAULT_BRANDING, ...(stored ? JSON.parse(stored) : {}) } as AppBranding;
      // Apply the owner's new logo once to existing devices; keep their app name,
      // tagline and theme. Later explicit customizations remain supported.
      if (this.readStored('promotrack_logo_revision') !== LOGO_REVISION) {
        branding.logoType = 'custom';
        branding.customLogoUrl = APP_LOGO_URL;
        if (branding.appName === 'PromoTrack') branding.appName = DEFAULT_BRANDING.appName;
        this.writeStored(STORAGE_KEYS.APP_BRANDING, JSON.stringify(branding));
        this.writeStored('promotrack_logo_revision', LOGO_REVISION);
      }
      return branding;
    } catch {
      // fallback
    }
    return DEFAULT_BRANDING;
  }

  public updateAppBranding(updates: Partial<AppBranding>): AppBranding {
    const current = this.getAppBranding();
    const updated = { ...current, ...updates };
    this.writeStored(STORAGE_KEYS.APP_BRANDING, JSON.stringify(updated));
    this.notify();
    return updated;
  }

  public resetAppBranding(): AppBranding {
    this.writeStored(STORAGE_KEYS.APP_BRANDING, JSON.stringify(DEFAULT_BRANDING));
    this.notify();
    return DEFAULT_BRANDING;
  }

  // --- Auth & Users ---
  public getCurrentUser(): UserProfile {
    try {
      const stored = this.readStored(STORAGE_KEYS.CURRENT_USER);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return INITIAL_USERS[0];
  }

  public setCurrentUser(user: UserProfile) {
    if (this.remoteContext && user.id !== this.remoteContext.userId) throw new Error('Sign in to change accounts.');
    this.writeStored(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    this.notify();
  }

  public getAllUsers(): UserProfile[] {
    if (this.remoteContext) return [...this.getAccountProfiles(), ...this.remoteContext.mdes];
    try {
      const stored = this.readStored(STORAGE_KEYS.USERS);
      return stored ? JSON.parse(stored) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  }

  public getSalesReps(): UserProfile[] {
    if (this.remoteContext) return this.remoteContext.mdes;
    return this.getAllUsers().filter((u) => u.role === 'sales' || u.mdeId);
  }

  public getMainChannelName(channelName: string) {
    const channel = this.getChannels().find((item) => item.name === channelName);
    return OUTLET_DATASET.mainChannels.find((item) => item.id === channel?.mainChannelId)?.name || '';
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
    if (this.remoteContext) return { success: false, error: 'New users must register through Supabase sign-in.' };
    const allUsers = this.getAllUsers();
    const cleanEmail = userData.email.trim().toLowerCase();

    if (cleanEmail && allUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Email already exists. Please choose a unique email address.' };
    }

    const newUser: UserProfile = {
      ...userData,
      email: cleanEmail,
      id: crypto.randomUUID(),
      avatarUrl: userData.avatarUrl || ''
    };

    allUsers.push(newUser);
    this.writeStored(STORAGE_KEYS.USERS, JSON.stringify(allUsers));
    this.notify();
    return { success: true, user: newUser };
  }

  public updateUser(userId: string, updates: Partial<UserProfile>): { success: boolean; error?: string } {
    const allUsers = this.getAccountProfiles();
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

    this.writeStored(STORAGE_KEYS.USERS, JSON.stringify(allUsers));

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

    const allUsers = this.getAccountProfiles();
    const userToDelete = allUsers.find((u) => u.id === userId);
    if (!userToDelete) {
      return { success: false, error: 'User not found.' };
    }

    const filtered = allUsers.filter((u) => u.id !== userId);
    this.writeStored(STORAGE_KEYS.USERS, JSON.stringify(filtered));

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
        this.writeStored(STORAGE_KEYS.STORES, JSON.stringify(allStores));
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
      const saved = this.readStored(STORAGE_KEYS.THEME_COLOR);
      if (saved) return saved;
    } catch {
      // fallback
    }
    return 'sage';
  }

  public setThemeColor(colorId: string) {
    this.writeStored(STORAGE_KEYS.THEME_COLOR, colorId);
    this.notify();
  }

  // --- Channels ---
  public getChannels(): Channel[] {
    try {
      const stored = this.readStored(STORAGE_KEYS.CHANNELS);
      return stored ? JSON.parse(stored) : INITIAL_CHANNELS;
    } catch {
      return INITIAL_CHANNELS;
    }
  }

  public getSubChannels(): SubChannel[] {
    try {
      const stored = this.readStored(STORAGE_KEYS.SUB_CHANNELS);
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
    this.writeStored(STORAGE_KEYS.SUB_CHANNELS, JSON.stringify([...list, subChannel]));
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
    this.writeStored(STORAGE_KEYS.SUB_CHANNELS, JSON.stringify(list.filter((item) => item.id !== id)));
    this.notify();
    return { success: true };
  }

  // --- Stores ---
  public getStores(): Store[] {
    try {
      const stored = this.readStored(STORAGE_KEYS.STORES);
      const allStores: Store[] = stored ? JSON.parse(stored) : INITIAL_STORES;
      const currentUser = this.getCurrentUser();

      // Enforce RLS: Sales Rep only views stores assigned to them
      if (currentUser.role === 'sales') {
        return allStores.filter((s) => this.isOwnAssignment(s.assignedSalesUser));
      }
      return allStores;
    } catch {
      return INITIAL_STORES;
    }
  }

  public getAllStoresUnfiltered(): Store[] {
    try {
      const stored = this.readStored(STORAGE_KEYS.STORES);
      return stored ? JSON.parse(stored) : INITIAL_STORES;
    } catch {
      return INITIAL_STORES;
    }
  }

  private withOutletMetadata(store: Store): Store {
    const rep = this.getAllUsers().find((user) => user.id === store.assignedSalesUser);
    const channel = this.getChannels().find((item) => item.name === store.channel);
    const subChannel = this.getSubChannels().find((item) => item.channelId === channel?.id && item.name === store.subChannel);
    return {
      ...store, mdeName: rep?.mdeId ? rep.fullName : '', mdeId: rep?.mdeId,
      channelId: channel?.id, subChannelId: subChannel?.id, mainChannelId: channel?.mainChannelId,
      mainChannel: this.getMainChannelName(store.channel) || store.mainChannel || ''
    };
  }

  public addStore(storeData: Omit<Store, 'id' | 'createdAt' | 'updatedAt'>): { success: boolean; error?: string; store?: Store } {
    const actor = this.getCurrentUser();
    if (actor.role === 'sales' && ((!actor.mdeId && this.remoteContext) || storeData.assignedSalesUser !== (actor.mdeId || actor.id))) {
      return {success:false,error:'You can only add outlets to your own MDE group.'};
    }
    const allStores = this.getAllStoresUnfiltered();
    const cleanCode = storeData.storeCode.trim().toUpperCase();

    // Check unique constraint
    if (allStores.some((s) => s.storeCode.toUpperCase() === cleanCode)) {
      return { success: false, error: `Store Code "${cleanCode}" already exists. Please choose a unique code.` };
    }

    const newStore: Store = this.withOutletMetadata({
      ...storeData,
      storeCode: cleanCode,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    allStores.unshift(newStore);
    this.writeStored(STORAGE_KEYS.STORES, JSON.stringify(allStores));
    this.recordDraft('store', 'create', newStore);
    this.notify();

    return { success: true, store: newStore };
  }

  public updateStore(storeId: string, updates: Partial<Store>): { success: boolean; error?: string } {
    if(this.getCurrentUser().role !== 'admin') return {success:false,error:'Only Admin can edit outlet details.'};
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

    allStores[index] = this.withOutletMetadata({
      ...allStores[index],
      ...updates,
      updatedAt: new Date().toISOString()
    });

    this.writeStored(STORAGE_KEYS.STORES, JSON.stringify(allStores));
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

    const actor = this.getCurrentUser();
    if (actor.role === 'sales' && ((!actor.mdeId && this.remoteContext) || !this.isOwnAssignment(storeToDelete.assignedSalesUser))) {
      return {success:false,error:'You can only delete outlets in your own MDE group.'};
    }
    // Filter store out
    const filtered = allStores.filter((s) => s.id !== storeId);
    this.writeStored(STORAGE_KEYS.STORES, JSON.stringify(filtered));

    // Clean up associated promotion_stores records
    try {
      const promoStores = this.getAllPromotionStoresUnfiltered().filter((ps) => ps.storeId !== storeId);
      this.writeStored(STORAGE_KEYS.PROMOTION_STORES, JSON.stringify(promoStores));
    } catch {
      // ignore
    }

    // Clean up associated new product store orders
    try {
      const npOrders = this.getAllNewProductStoreOrdersUnfiltered().filter((o) => o.storeId !== storeId);
      this.writeStored(STORAGE_KEYS.NEW_PRODUCT_STORE_ORDERS, JSON.stringify(npOrders));
    } catch {
      // ignore
    }

    // Clean up associated tasks
    try {
      const tasks = this.getAllTasksUnfiltered().filter((t) => t.storeId !== storeId);
      this.writeStored(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
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
      const stored = this.readStored(STORAGE_KEYS.PROMOTIONS);
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
      const stored = this.readStored(STORAGE_KEYS.PROMOTIONS);
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
      id: crypto.randomUUID(),
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    allPromos.unshift(newPromo);
    this.writeStored(STORAGE_KEYS.PROMOTIONS, JSON.stringify(allPromos));
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

    this.writeStored(STORAGE_KEYS.PROMOTIONS, JSON.stringify(allPromos));
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
    this.writeStored(STORAGE_KEYS.PROMOTIONS, JSON.stringify(allPromos));

    // Also remove promotion stores associated with this promotion
    try {
      const storedPS = this.readStored(STORAGE_KEYS.PROMOTION_STORES);
      if (storedPS) {
        const pStores: PromotionStore[] = JSON.parse(storedPS);
        const filteredPS = pStores.filter((ps) => ps.promotionId !== promoId);
        this.writeStored(STORAGE_KEYS.PROMOTION_STORES, JSON.stringify(filteredPS));
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
      const stored = this.readStored(STORAGE_KEYS.PROMOTION_STORES);
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
      const stored = this.readStored(STORAGE_KEYS.PROMOTION_STORES);
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
          id: crypto.randomUUID(),
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

    this.writeStored(STORAGE_KEYS.PROMOTION_STORES, JSON.stringify(allList));
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
      if (!store || !this.isOwnAssignment(store.assignedSalesUser)) {
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

    this.writeStored(STORAGE_KEYS.PROMOTION_STORES, JSON.stringify(allList));

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
    if (currentUser.role==='admin' && params.newStatus === 'Follow-up Required' && params.createAutoTask && store) {
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
      const stored = this.readStored(STORAGE_KEYS.AUDIT_LOGS);
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
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    list.unshift(newLog);
    this.writeStored(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(list));
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
      const stored = this.readStored(STORAGE_KEYS.NEW_PRODUCTS);
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
      const stored = this.readStored(STORAGE_KEYS.NEW_PRODUCTS);
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
      id: crypto.randomUUID(),
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    all.unshift(newProduct);
    this.writeStored(STORAGE_KEYS.NEW_PRODUCTS, JSON.stringify(all));
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

    this.writeStored(STORAGE_KEYS.NEW_PRODUCTS, JSON.stringify(all));
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
    this.writeStored(STORAGE_KEYS.NEW_PRODUCTS, JSON.stringify(all));

    // Also remove associated store orders
    const orders = this.getAllNewProductStoreOrdersUnfiltered().filter((o) => o.productId !== productId);
    this.writeStored(STORAGE_KEYS.NEW_PRODUCT_STORE_ORDERS, JSON.stringify(orders));

    this.notify();
    return { success: true };
  }

  public getNewProductStoreOrders(productId?: string): NewProductStoreOrder[] {
    try {
      const stored = this.readStored(STORAGE_KEYS.NEW_PRODUCT_STORE_ORDERS);
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
      const stored = this.readStored(STORAGE_KEYS.NEW_PRODUCT_STORE_ORDERS);
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
          id: crypto.randomUUID(),
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

    this.writeStored(STORAGE_KEYS.NEW_PRODUCT_STORE_ORDERS, JSON.stringify(allList));
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
        id: crypto.randomUUID(),
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

    this.writeStored(STORAGE_KEYS.NEW_PRODUCT_STORE_ORDERS, JSON.stringify(allList));

    if (currentUser.role==='admin' && params.createAutoTask && (params.newStatus === 'Follow-up Required' || params.newStatus === 'Sample Provided')) {
      const store = this.getAllStoresUnfiltered().find((s) => s.id === params.storeId);
      const product = this.getAllNewProductsUnfiltered().find((p) => p.id === params.productId);
      const storeName = store ? store.storeName : 'Store';
      const prodName = product ? product.productName : 'New Product';

      this.createTask({
        productId: params.productId,
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
      const stored = this.readStored(STORAGE_KEYS.TASKS);
      const allTasks: FollowUpTask[] = stored ? JSON.parse(stored) : INITIAL_TASKS;
      const currentUser = this.getCurrentUser();

      // Sales user only views tasks assigned to them
      if (currentUser.role === 'sales') {
        return allTasks.filter((t) => this.isOwnAssignment(t.assignedUser));
      }
      return allTasks;
    } catch {
      return INITIAL_TASKS;
    }
  }

  public getAllTasksUnfiltered(): FollowUpTask[] {
    try {
      const stored = this.readStored(STORAGE_KEYS.TASKS);
      return stored ? JSON.parse(stored) : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  }

  public createTask(taskData: Omit<FollowUpTask, 'id' | 'createdAt' | 'updatedAt'>): { success: boolean; task?: FollowUpTask; error?:string } {
    if(this.getCurrentUser().role!=='admin')return {success:false,error:'Only Admin can create tasks.'};
    const allTasks = this.getAllTasksUnfiltered();
    const newTask: FollowUpTask = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    allTasks.unshift(newTask);
    this.writeStored(STORAGE_KEYS.TASKS, JSON.stringify(allTasks));
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

    if (currentUser.role === 'sales' && !this.isOwnAssignment(allTasks[index].assignedUser)) {
      return { success: false, error: 'Unauthorized: You can only update tasks assigned to you.' };
    }

    allTasks[index] = {
      ...allTasks[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.writeStored(STORAGE_KEYS.TASKS, JSON.stringify(allTasks));
    this.recordDraft('task', 'update', allTasks[index]);
    this.notify();

    return { success: true };
  }

  public deleteTask(taskId: string): { success: boolean; error?: string } {
    const currentUser = this.getCurrentUser();
    const allTasks = this.getAllTasksUnfiltered();
    const task = allTasks.find((t) => t.id === taskId);

    if (!task) return { success: false, error: 'Task not found.' };

    if (currentUser.role === 'sales' && !this.isOwnAssignment(task.assignedUser)) {
      return { success: false, error: 'Unauthorized: You can only delete tasks assigned to you.' };
    }

    const filtered = allTasks.filter((t) => t.id !== taskId);
    this.writeStored(STORAGE_KEYS.TASKS, JSON.stringify(filtered));
    this.recordDraft('task', 'delete', { id: taskId });
    this.notify();

    return { success: true };
  }

  // --- Offline Drafts Queue ---
  public getOfflineDrafts(): OfflineDraft[] {
    try {
      const stored = this.readStored(STORAGE_KEYS.OFFLINE_DRAFTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private recordDraft(entityType: OfflineDraft['entityType'], action: OfflineDraft['action'], payload: any) {
    if (this.remoteContext) return; // SupabaseSync persists recoverable offline snapshots.
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
      this.writeStored(STORAGE_KEYS.OFFLINE_DRAFTS, JSON.stringify(drafts));
    }
  }

  public clearSyncedDrafts() {
    this.writeStored(STORAGE_KEYS.OFFLINE_DRAFTS, JSON.stringify([]));
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

    // Match exact normalized aliases: "MDE NAME" must never become the outlet name,
    // and "MIAN CHANEL" must never become the secondary channel.
    const normalize = (value: string) => value.toLowerCase().replace(/[\s_-]+/g, '');
    const findIndex = (candidates: string[]) => rawHeaders.findIndex((header) => candidates.some((candidate) => normalize(header) === normalize(candidate)));
    const codeIdx = findIndex(['code', 'store code', 'outlet code']);
    const nameIdx = findIndex(['name', 'store name', 'outlet']);
    const channelIdx = findIndex(['channel', 'trade channel', 'chenel']);
    const subChannelIdx = findIndex(['sub channel', 'sub-chanel']);
    const salesIdx = findIndex(['sales', 'assigned sales', 'rep', 'representative', 'mde name']);
    const mainIdx = findIndex(['main channel', 'mian chanel']);
    const villageIdx = findIndex(['village', 'villag']);
    const districtIdx = findIndex(['district']);
    const provinceIdx = findIndex(['province', 'city / province']);
    const outletFormat = rawHeaders.some((header) => normalize(header) === 'outletcode');

    const errors: string[] = [];
    const warnings: string[] = [];

    if (codeIdx === -1) errors.push('Missing required column: "Store Code"');
    if (nameIdx === -1) errors.push('Missing required column: "Store Name"');
    if (channelIdx === -1) warnings.push('Channel is missing; no channel will be invented.');
    if (outletFormat && [channelIdx, subChannelIdx, salesIdx, mainIdx, villageIdx, districtIdx, provinceIdx].some((index) => index === -1)) {
      errors.push('Outlet imports require all nine columns from outlet.xlsx.');
    }

    if (errors.length > 0) {
      return { rows: [], headers: rawHeaders, errors, warnings };
    }

    const allStores = this.getAllStoresUnfiltered();
    const existingCodes = new Set(allStores.map((s) => s.storeCode.toUpperCase()));
    const fileCodesSeen = new Set<string>();

    const parsedRows: ExcelImportRow[] = [];

    dataRows.forEach((row, rowIndex) => {
      if (!row || row.length === 0) return;

      const cell = (index: number) => index !== -1 ? String(row[index] ?? '').trim() : '';
      const rawCode = cell(codeIdx);
      const rawName = cell(nameIdx);
      const rawChannel = cell(channelIdx);
      const rawSubChannel = cell(subChannelIdx);
      const rawSales = cell(salesIdx);

      if (!rawCode && !rawName) return; // skip blank trailing row

      const rowErrors: string[] = [];
      if (!rawCode) rowErrors.push('Store Code is required');
      if (!rawName) rowErrors.push('Store Name is required');
      if (outletFormat && [rawChannel, rawSubChannel, rawSales, cell(mainIdx), cell(villageIdx), cell(districtIdx), cell(provinceIdx)].some((value) => !value)) rowErrors.push('All nine outlet values are required.');
      if (rawSales && !this.getSalesReps().some((rep) => rep.fullName.toLowerCase() === rawSales.toLowerCase() || (rep.email && rep.email.toLowerCase() === rawSales.toLowerCase()))) rowErrors.push(`Unknown MDE: ${rawSales}`);

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
        channel: rawChannel,
        subChannel: rawSubChannel,
        assignedSales: rawSales,
        mainChannel: mainIdx !== -1 ? cell(mainIdx) : undefined,
        village: villageIdx !== -1 ? cell(villageIdx) : undefined,
        district: districtIdx !== -1 ? cell(districtIdx) : undefined,
        province: provinceIdx !== -1 ? cell(provinceIdx) : undefined,
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

      const matchedRep = row.assignedSales ? salesReps.find((rep) => rep.fullName.toLowerCase() === row.assignedSales.toLowerCase() || (rep.email && rep.email.toLowerCase() === row.assignedSales.toLowerCase())) : undefined;
      if (row.assignedSales && !matchedRep) { skippedCount++; return; }
      const previous = allStores[existingIndex];
      const salesUserId = matchedRep?.id || previous?.assignedSalesUser || '';
      const metadata = {
        mdeId: matchedRep?.mdeId || previous?.mdeId,
        mdeName: matchedRep?.fullName || previous?.mdeName || '',
        mainChannel: row.mainChannel ?? previous?.mainChannel ?? this.getMainChannelName(row.channel),
        village: row.village ?? previous?.village ?? '',
        district: row.district ?? previous?.district ?? '',
        province: row.province ?? previous?.province ?? '',
        city: row.province ?? previous?.city ?? ''
      };

      if (existingIndex !== -1) {
        if (duplicateAction === 'skip') {
          skippedCount++;
        } else {
          // Update existing
          allStores[existingIndex] = this.withOutletMetadata({
            ...allStores[existingIndex],
            ...metadata,
            storeName: row.storeName || allStores[existingIndex].storeName,
            channel: row.channel || allStores[existingIndex].channel,
            subChannel: row.subChannel || allStores[existingIndex].subChannel,
            assignedSalesUser: salesUserId,
            updatedAt: new Date().toISOString()
          });
          updatedCount++;
        }
      } else {
        // Insert new store
        allStores.push(this.withOutletMetadata({
          ...metadata,
          id: crypto.randomUUID(),
          storeCode: cleanCode,
          storeName: row.storeName,
          channel: row.channel,
          subChannel: row.subChannel,
          assignedSalesUser: salesUserId,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        importedCount++;
      }
    });

    this.writeStored(STORAGE_KEYS.STORES, JSON.stringify(allStores));
    this.notify();

    return { success: true, importedCount, updatedCount, skippedCount };
  }

  public exportStoresToExcel(storesToExport?: Store[]) {
    const list = storesToExport || this.getStores();
    const salesMap = new Map(this.getAllUsers().map((u) => [u.id, u.fullName]));

    const data = list.map((s) => ({
      'MDE NAME': salesMap.get(s.assignedSalesUser) || s.mdeName || '',
      'OUTLET CODE': s.storeCode,
      'OUTLET': s.storeName,
      'MIAN CHANEL': s.mainChannel || this.getMainChannelName(s.channel),
      'CHENEL': s.channel,
      'SUB-CHANEL': s.subChannel,
      'VILLAG': s.village || '',
      'DISTRICT': s.district || '',
      'PROVINCE': s.province || s.city || ''
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
