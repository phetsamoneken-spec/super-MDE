/**
 * Core Type Definitions for Promotion Tracking & To-Do List PWA
 */

export type UserRole = 'admin' | 'sales';

export interface UserProfile {
  mdeId?: string;
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
}

export type OrderStatus = 'Not Ordered' | 'Follow-up Required' | 'Ordered' | 'Cancelled';

export type PromotionStatus = 'Draft' | 'Active' | 'Completed' | 'Cancelled';

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Channel {
  mainChannelId?: string;
  id: string;
  name: string;
  description?: string;
}

export interface SubChannel {
  id: string;
  channelId: string;
  name: string;
  description?: string;
}

export interface Store {
  mdeId?: string;
  mdeName?: string;
  mainChannel?: string;
  mainChannelId?: string;
  channelId?: string;
  subChannelId?: string;
  village?: string;
  district?: string;
  province?: string;
  id: string;
  storeCode: string;
  storeName: string;
  channel: string;
  subChannel: string;
  assignedSalesUser: string; // UserProfile id
  phone?: string;
  address?: string;
  city?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Promotion {
  id: string;
  promotionName: string;
  description: string;
  startDate: string;
  endDate: string;
  imageUrl?: string;
  imagePath?: string;
  status: PromotionStatus;
  targetSubChannels?: string[];
  createdBy: string; // UserProfile id
  createdAt: string;
  updatedAt: string;
}

export interface PromotionStore {
  id: string;
  storeId: string;
  promotionId: string;
  orderStatus: OrderStatus;
  orderDate?: string;
  orderAmount?: number;
  lastFollowUpDate?: string;
  nextFollowUpDate?: string;
  remark?: string;
  updatedBy?: string; // UserProfile id
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpTask {
  productId?: string;
  id: string;
  storeId: string;
  promotionId?: string;
  assignedUser: string; // UserProfile id
  taskTitle: string;
  dueDate: string;
  priority: TaskPriority;
  taskStatus: TaskStatus;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusHistory {
  id: string;
  promotionStoreId: string;
  storeId: string;
  promotionId: string;
  oldStatus?: OrderStatus;
  newStatus: OrderStatus;
  changedBy: string; // UserProfile id
  notes?: string;
  createdAt: string;
}

export interface ExcelImportRow {
  mainChannel?: string;
  village?: string;
  district?: string;
  province?: string;
  storeCode: string;
  storeName: string;
  channel: string;
  subChannel: string;
  assignedSales: string;
  isValid?: boolean;
  errors?: string[];
  isDuplicate?: boolean;
}

export interface OfflineDraft {
  id: string;
  entityType: 'store' | 'promotion' | 'order_status' | 'task';
  action: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: string;
  synced: boolean;
}

export type Language = 'en' | 'lo';

export interface AppBranding {
  appName: string;
  tagline: string;
  logoType: 'icon' | 'custom';
  logoIcon: 'Sparkles' | 'Store' | 'ShoppingBag' | 'TrendingUp' | 'Compass' | 'Award';
  logoColor: string;
  customLogoUrl?: string;
}

export type NewProductStatus = 'Draft' | 'Active' | 'Completed' | 'Cancelled';

export type NewProductOrderStatus = 'Ordered' | 'Not Ordered' | 'Sample Provided' | 'Follow-up Required' | 'Declined';

export interface NewProductLaunch {
  id: string;
  productName: string;
  sku: string;
  category: string;
  launchDate: string;
  endDate?: string;
  packSize: string;
  unitPrice: number;
  targetDistributionRate: number; // e.g. 80 (%)
  targetUnitsPerStore: number;    // e.g. 24 units/store
  description: string;
  imageUrl?: string;
  status: NewProductStatus;
  targetSubChannels: string[];    // Target sub-channels
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewProductStoreOrder {
  id: string;
  productId: string;
  storeId: string;
  orderStatus: NewProductOrderStatus;
  orderQuantity?: number;
  orderAmount?: number;
  orderDate?: string;
  invoiceNumber?: string;
  sampleGivenDate?: string;
  sampleQty?: number;
  customerFeedback?: string;
  nextFollowUpDate?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

