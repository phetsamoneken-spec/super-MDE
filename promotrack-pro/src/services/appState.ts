import type { UserProfile, Channel, SubChannel, Store, Promotion, PromotionStore, NewProductLaunch, NewProductStoreOrder, FollowUpTask, OrderStatusHistory } from '../types';

export interface AppData {
  users: UserProfile[];
  channels: Channel[];
  subChannels: SubChannel[];
  stores: Store[];
  promotions: Promotion[];
  promoStores: PromotionStore[];
  newProducts: NewProductLaunch[];
  newProductStoreOrders: NewProductStoreOrder[];
  tasks: FollowUpTask[];
  auditLogs: OrderStatusHistory[];
}
export const stateStorageKeys = {
  users: 'USERS', channels: 'CHANNELS', subChannels: 'SUB_CHANNELS', stores: 'STORES',
  promotions: 'PROMOTIONS', promoStores: 'PROMOTION_STORES', newProducts: 'NEW_PRODUCTS',
  newProductStoreOrders: 'NEW_PRODUCT_STORE_ORDERS', tasks: 'TASKS', auditLogs: 'AUDIT_LOGS'
} as const;
