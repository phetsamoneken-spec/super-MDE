import dataset from '../data/outletDataset.json';
import type { UserProfile, Channel, SubChannel, Store, Promotion, PromotionStore, FollowUpTask, OrderStatusHistory, NewProductLaunch, NewProductStoreOrder } from '../types';

export const OUTLET_DATASET = dataset;
export const DATASET_VERSION = dataset.source.sha256.slice(0, 12);
// This is a local management persona, not a fabricated person or a Supabase Auth account.
export const INITIAL_USERS: UserProfile[] = [
  { id: dataset.localAdminId, fullName: 'Admin', email: '', role: 'admin' },
  ...dataset.mdes.map((mde) => ({ id: mde.id, mdeId: mde.id, fullName: mde.name, email: '', role: 'sales' as const }))
];
export const INITIAL_CHANNELS: Channel[] = dataset.channels;
export const INITIAL_SUB_CHANNELS: SubChannel[] = dataset.subChannels;
export const INITIAL_STORES: Store[] = dataset.outlets.map((outlet) => ({
  ...outlet, assignedSalesUser: outlet.mdeId, city: outlet.province, isActive: true,
  // The workbook contains no business timestamps, phone numbers, or email addresses.
  createdAt: '', updatedAt: ''
}));
export const INITIAL_PROMOTIONS: Promotion[] = [];
export const INITIAL_PROMOTION_STORES: PromotionStore[] = [];
export const INITIAL_TASKS: FollowUpTask[] = [];
export const INITIAL_AUDIT_LOGS: OrderStatusHistory[] = [];
export const INITIAL_NEW_PRODUCTS: NewProductLaunch[] = [];
export const INITIAL_NEW_PRODUCT_STORE_ORDERS: NewProductStoreOrder[] = [];
