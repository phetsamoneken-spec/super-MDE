import {
  UserProfile,
  Store,
  Promotion,
  PromotionStore,
  FollowUpTask,
  OrderStatusHistory,
  Channel,
  SubChannel,
  NewProductLaunch,
  NewProductStoreOrder
} from '../types';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'u-admin-1',
    email: 'admin@promotrack.la',
    fullName: 'Sengdavanh Phommasone',
    role: 'admin',
    phone: '+856 20 5551 2345',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'u-sales-1',
    email: 'khamphanh@promotrack.la',
    fullName: 'Khamphanh Keomany',
    role: 'sales',
    phone: '+856 20 5552 3456',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'u-sales-2',
    email: 'soulinthone@promotrack.la',
    fullName: 'Soulinthone Vongsa',
    role: 'sales',
    phone: '+856 20 5553 4567',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'u-sales-3',
    email: 'bounmy@promotrack.la',
    fullName: 'Bounmy Sisoulath',
    role: 'sales',
    phone: '+856 20 5554 5678',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_CHANNELS: Channel[] = [
  { id: 'ch-1', name: 'Modern Trade', description: 'Supermarkets, Hypermarkets, Department Stores' },
  { id: 'ch-2', name: 'General Trade', description: 'Traditional grocery stores, Mom & Pop shops' },
  { id: 'ch-3', name: 'Convenience Store (CVS)', description: 'Mini-marts and 24/7 chain stores' },
  { id: 'ch-4', name: 'Wholesale', description: 'Bulk distributors and large trade centers' },
  { id: 'ch-5', name: 'HORECA', description: 'Hotels, Restaurants, and Cafes' }
];

export const INITIAL_SUB_CHANNELS: SubChannel[] = [
  { id: 'sub-1', channelId: 'ch-1', name: 'Hypermarket' },
  { id: 'sub-2', channelId: 'ch-1', name: 'Supermarket' },
  { id: 'sub-3', channelId: 'ch-2', name: 'Large Grocery' },
  { id: 'sub-4', channelId: 'ch-2', name: 'Medium Grocery' },
  { id: 'sub-5', channelId: 'ch-3', name: 'Chain CVS' },
  { id: 'sub-6', channelId: 'ch-3', name: 'Gas Station CVS' },
  { id: 'sub-7', channelId: 'ch-4', name: 'Cash & Carry' },
  { id: 'sub-8', channelId: 'ch-5', name: 'Hotel & Resort' },
  { id: 'sub-9', channelId: 'ch-5', name: 'Restaurant/Cafe' }
];

export const INITIAL_STORES: Store[] = [
  {
    id: 'str-01',
    storeCode: 'STR-VTE-001',
    storeName: 'Vientiane Center Supermarket',
    channel: 'Modern Trade',
    subChannel: 'Supermarket',
    assignedSalesUser: 'u-sales-1',
    phone: '+856 21 213456',
    address: 'Khouvieng Road, Nongchan',
    city: 'Vientiane Capital',
    isActive: true,
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z'
  },
  {
    id: 'str-02',
    storeCode: 'STR-VTE-002',
    storeName: 'Sokxay Plus Minimart Dongpalan',
    channel: 'Convenience Store (CVS)',
    subChannel: 'Chain CVS',
    assignedSalesUser: 'u-sales-1',
    phone: '+856 20 99887766',
    address: 'Dongpalan Road, Sisattanak',
    city: 'Vientiane Capital',
    isActive: true,
    createdAt: '2026-01-12T08:00:00Z',
    updatedAt: '2026-01-12T08:00:00Z'
  },
  {
    id: 'str-03',
    storeCode: 'STR-VTE-003',
    storeName: 'Friendship Hypermarket Nongbone',
    channel: 'Modern Trade',
    subChannel: 'Hypermarket',
    assignedSalesUser: 'u-sales-1',
    phone: '+856 21 415500',
    address: 'Nongbone Village, Saysettha',
    city: 'Vientiane Capital',
    isActive: true,
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-01-15T08:00:00Z'
  },
  {
    id: 'str-04',
    storeCode: 'STR-VTE-004',
    storeName: 'M-Point Mart Sihom Branch',
    channel: 'Convenience Store (CVS)',
    subChannel: 'Chain CVS',
    assignedSalesUser: 'u-sales-1',
    phone: '+856 20 54123890',
    address: 'Sihom Village, Chanthabouly',
    city: 'Vientiane Capital',
    isActive: true,
    createdAt: '2026-01-20T08:00:00Z',
    updatedAt: '2026-01-20T08:00:00Z'
  },
  {
    id: 'str-05',
    storeCode: 'STR-VTE-005',
    storeName: 'Xang Jieng Chinese Wholesale Depot',
    channel: 'Wholesale',
    subChannel: 'Cash & Carry',
    assignedSalesUser: 'u-sales-1',
    phone: '+856 20 77123987',
    address: 'Asean Road, Sikhottabong',
    city: 'Vientiane Capital',
    isActive: true,
    createdAt: '2026-01-22T08:00:00Z',
    updatedAt: '2026-01-22T08:00:00Z'
  },
  {
    id: 'str-06',
    storeCode: 'STR-LPQ-006',
    storeName: 'Luang Prabang Heritage Supermarket',
    channel: 'Modern Trade',
    subChannel: 'Supermarket',
    assignedSalesUser: 'u-sales-2',
    phone: '+856 71 254123',
    address: 'Sisavangvong Road',
    city: 'Luang Prabang',
    isActive: true,
    createdAt: '2026-01-25T08:00:00Z',
    updatedAt: '2026-01-25T08:00:00Z'
  },
  {
    id: 'str-07',
    storeCode: 'STR-LPQ-007',
    storeName: 'Thavisouk Grocery & Wholesale',
    channel: 'Wholesale',
    subChannel: 'Cash & Carry',
    assignedSalesUser: 'u-sales-2',
    phone: '+856 71 212890',
    address: 'Phousi Market Area',
    city: 'Luang Prabang',
    isActive: true,
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-02-01T08:00:00Z'
  },
  {
    id: 'str-08',
    storeCode: 'STR-LPQ-008',
    storeName: 'Namkhan Riverfront Boutique Resort',
    channel: 'HORECA',
    subChannel: 'Hotel & Resort',
    assignedSalesUser: 'u-sales-2',
    phone: '+856 71 260555',
    address: 'Ban Wat That',
    city: 'Luang Prabang',
    isActive: true,
    createdAt: '2026-02-03T08:00:00Z',
    updatedAt: '2026-02-03T08:00:00Z'
  },
  {
    id: 'str-09',
    storeCode: 'STR-LPQ-009',
    storeName: 'Mano Mom & Pop Grocery',
    channel: 'General Trade',
    subChannel: 'Medium Grocery',
    assignedSalesUser: 'u-sales-2',
    phone: '+856 20 58899112',
    address: 'Ban Mano',
    city: 'Luang Prabang',
    isActive: true,
    createdAt: '2026-02-05T08:00:00Z',
    updatedAt: '2026-02-05T08:00:00Z'
  },
  {
    id: 'str-10',
    storeCode: 'STR-PKZ-010',
    storeName: 'Pakse Dao-Heuang Market Super Depot',
    channel: 'Wholesale',
    subChannel: 'Cash & Carry',
    assignedSalesUser: 'u-sales-3',
    phone: '+856 31 212345',
    address: 'Dao-Heuang Wholesale Market',
    city: 'Pakse, Champasak',
    isActive: true,
    createdAt: '2026-02-10T08:00:00Z',
    updatedAt: '2026-02-10T08:00:00Z'
  },
  {
    id: 'str-11',
    storeCode: 'STR-PKZ-011',
    storeName: 'Champasak Grand Hotel & Dining',
    channel: 'HORECA',
    subChannel: 'Hotel & Resort',
    assignedSalesUser: 'u-sales-3',
    phone: '+856 31 214567',
    address: 'Mekong River Road',
    city: 'Pakse, Champasak',
    isActive: true,
    createdAt: '2026-02-12T08:00:00Z',
    updatedAt: '2026-02-12T08:00:00Z'
  },
  {
    id: 'str-12',
    storeCode: 'STR-PKZ-012',
    storeName: 'Phonsavanh Mini Mart Pakse',
    channel: 'Convenience Store (CVS)',
    subChannel: 'Chain CVS',
    assignedSalesUser: 'u-sales-3',
    phone: '+856 20 95432109',
    address: '13 South Road',
    city: 'Pakse, Champasak',
    isActive: true,
    createdAt: '2026-02-15T08:00:00Z',
    updatedAt: '2026-02-15T08:00:00Z'
  },
  {
    id: 'str-13',
    storeCode: 'STR-VTE-013',
    storeName: 'Parkson Supermarket Vientiane',
    channel: 'Modern Trade',
    subChannel: 'Supermarket',
    assignedSalesUser: 'u-sales-1',
    phone: '+856 21 887766',
    address: 'Lanxang Avenue',
    city: 'Vientiane Capital',
    isActive: true,
    createdAt: '2026-02-18T08:00:00Z',
    updatedAt: '2026-02-18T08:00:00Z'
  },
  {
    id: 'str-14',
    storeCode: 'STR-VTE-014',
    storeName: 'Thongkhanhkham Traditional Food Mart',
    channel: 'General Trade',
    subChannel: 'Large Grocery',
    assignedSalesUser: 'u-sales-1',
    phone: '+856 20 52345678',
    address: 'Thongkhanhkham Market',
    city: 'Vientiane Capital',
    isActive: true,
    createdAt: '2026-02-20T08:00:00Z',
    updatedAt: '2026-02-20T08:00:00Z'
  },
  {
    id: 'str-15',
    storeCode: 'STR-PKZ-015',
    storeName: 'Khong District Riverside Trader',
    channel: 'General Trade',
    subChannel: 'Medium Grocery',
    assignedSalesUser: 'u-sales-3',
    phone: '+856 20 56781234',
    address: 'Si Phan Don Island',
    city: 'Champasak',
    isActive: true,
    createdAt: '2026-02-22T08:00:00Z',
    updatedAt: '2026-02-22T08:00:00Z'
  }
];

export const INITIAL_PROMOTIONS: Promotion[] = [
  {
    id: 'prm-01',
    promotionName: 'Songkran Lao Pi Mai Mega Sale 2026',
    description: 'Buy 10 cartons get 1 carton free across beverage & snack lines with branded point-of-sale display stand.',
    startDate: '2026-03-15',
    endDate: '2026-04-30',
    imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80',
    imagePath: 'promotions/songkran_2026.jpg',
    status: 'Active',
    createdBy: 'u-admin-1',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z'
  },
  {
    id: 'prm-02',
    promotionName: 'Energy & Refreshment Q2 Drive',
    description: 'Special 8% volume rebate for CVS and Supermarkets on premium cold beverages with chiller priority.',
    startDate: '2026-04-01',
    endDate: '2026-05-31',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
    imagePath: 'promotions/energy_q2.jpg',
    status: 'Active',
    createdBy: 'u-admin-1',
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-02-15T10:00:00Z'
  },
  {
    id: 'prm-03',
    promotionName: 'Dry Season Wholesale Pallet Clearance',
    description: 'Bulk pallet order 50+ cases with free direct logistics delivery to northern provincial hubs.',
    startDate: '2026-01-05',
    endDate: '2026-02-28',
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
    imagePath: 'promotions/wholesale_clearance.jpg',
    status: 'Completed',
    createdBy: 'u-admin-1',
    createdAt: '2026-01-02T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'prm-04',
    promotionName: 'Rainy Season HORECA Hospitality Pack',
    description: 'Complimentary branded glassware and premium syrup samples with every order above 5,000,000 LAK.',
    startDate: '2026-06-01',
    endDate: '2026-07-31',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
    imagePath: 'promotions/horeca_pack.jpg',
    status: 'Draft',
    createdBy: 'u-admin-1',
    createdAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-02-20T10:00:00Z'
  }
];

export const INITIAL_PROMOTION_STORES: PromotionStore[] = [
  // Promo 01: Songkran Pi Mai (10 stores assigned)
  {
    id: 'ps-01',
    storeId: 'str-01',
    promotionId: 'prm-01',
    orderStatus: 'Ordered',
    orderDate: '2026-03-18T14:30:00Z',
    orderAmount: 12500000,
    lastFollowUpDate: '2026-03-18T14:30:00Z',
    nextFollowUpDate: '2026-04-10T10:00:00Z',
    remark: 'Ordered 25 cases, requested front end-cap display placement.',
    updatedBy: 'u-sales-1',
    createdAt: '2026-02-05T09:00:00Z',
    updatedAt: '2026-03-18T14:30:00Z'
  },
  {
    id: 'ps-02',
    storeId: 'str-02',
    promotionId: 'prm-01',
    orderStatus: 'Follow-up Required',
    orderDate: undefined,
    orderAmount: 0,
    lastFollowUpDate: '2026-04-02T11:00:00Z',
    nextFollowUpDate: '2026-04-06T09:30:00Z',
    remark: 'Store manager was busy doing stock count; asked rep to return on Monday morning.',
    updatedBy: 'u-sales-1',
    createdAt: '2026-02-05T09:00:00Z',
    updatedAt: '2026-04-02T11:00:00Z'
  },
  {
    id: 'ps-03',
    storeId: 'str-03',
    promotionId: 'prm-01',
    orderStatus: 'Ordered',
    orderDate: '2026-03-22T16:00:00Z',
    orderAmount: 28000000,
    lastFollowUpDate: '2026-03-22T16:00:00Z',
    nextFollowUpDate: '2026-04-15T11:00:00Z',
    remark: 'Bulk order confirmed with commercial department. Invoice sent.',
    updatedBy: 'u-sales-1',
    createdAt: '2026-02-05T09:00:00Z',
    updatedAt: '2026-03-22T16:00:00Z'
  },
  {
    id: 'ps-04',
    storeId: 'str-04',
    promotionId: 'prm-01',
    orderStatus: 'Not Ordered',
    orderDate: undefined,
    orderAmount: 0,
    lastFollowUpDate: '2026-03-20T10:00:00Z',
    nextFollowUpDate: '2026-04-08T14:00:00Z',
    remark: 'Pending head office approval for promotional flyer distribution.',
    updatedBy: 'u-sales-1',
    createdAt: '2026-02-05T09:00:00Z',
    updatedAt: '2026-03-20T10:00:00Z'
  },
  {
    id: 'ps-05',
    storeId: 'str-05',
    promotionId: 'prm-01',
    orderStatus: 'Ordered',
    orderDate: '2026-03-25T11:00:00Z',
    orderAmount: 45000000,
    lastFollowUpDate: '2026-03-25T11:00:00Z',
    nextFollowUpDate: '2026-04-18T10:00:00Z',
    remark: 'Wholesale distributor took 2 full pallets for regional sub-dealers.',
    updatedBy: 'u-sales-1',
    createdAt: '2026-02-05T09:00:00Z',
    updatedAt: '2026-03-25T11:00:00Z'
  },
  {
    id: 'ps-06',
    storeId: 'str-06',
    promotionId: 'prm-01',
    orderStatus: 'Ordered',
    orderDate: '2026-03-28T10:00:00Z',
    orderAmount: 9500000,
    lastFollowUpDate: '2026-03-28T10:00:00Z',
    nextFollowUpDate: '2026-04-20T10:00:00Z',
    remark: 'Tourist season preparation order confirmed.',
    updatedBy: 'u-sales-2',
    createdAt: '2026-02-05T09:00:00Z',
    updatedAt: '2026-03-28T10:00:00Z'
  },
  {
    id: 'ps-07',
    storeId: 'str-07',
    promotionId: 'prm-01',
    orderStatus: 'Follow-up Required',
    orderDate: undefined,
    orderAmount: 0,
    lastFollowUpDate: '2026-04-01T15:00:00Z',
    nextFollowUpDate: '2026-04-05T14:00:00Z',
    remark: 'Owner waiting for payment from their downstream customers before ordering.',
    updatedBy: 'u-sales-2',
    createdAt: '2026-02-05T09:00:00Z',
    updatedAt: '2026-04-01T15:00:00Z'
  },
  {
    id: 'ps-08',
    storeId: 'str-08',
    promotionId: 'prm-01',
    orderStatus: 'Not Ordered',
    orderDate: undefined,
    orderAmount: 0,
    lastFollowUpDate: undefined,
    nextFollowUpDate: '2026-04-10T10:00:00Z',
    remark: 'Initial brochure handed to purchasing manager.',
    updatedBy: 'u-sales-2',
    createdAt: '2026-02-05T09:00:00Z',
    updatedAt: '2026-02-05T09:00:00Z'
  },
  {
    id: 'ps-09',
    storeId: 'str-10',
    promotionId: 'prm-01',
    orderStatus: 'Ordered',
    orderDate: '2026-03-30T13:30:00Z',
    orderAmount: 38000000,
    lastFollowUpDate: '2026-03-30T13:30:00Z',
    nextFollowUpDate: '2026-04-22T09:00:00Z',
    remark: 'Pakse depot received consignment on schedule.',
    updatedBy: 'u-sales-3',
    createdAt: '2026-02-05T09:00:00Z',
    updatedAt: '2026-03-30T13:30:00Z'
  },
  {
    id: 'ps-10',
    storeId: 'str-11',
    promotionId: 'prm-01',
    orderStatus: 'Follow-up Required',
    orderDate: undefined,
    orderAmount: 0,
    lastFollowUpDate: '2026-04-03T10:00:00Z',
    nextFollowUpDate: '2026-04-07T11:00:00Z',
    remark: 'F&B director requested custom banquet pricing before signing purchase order.',
    updatedBy: 'u-sales-3',
    createdAt: '2026-02-05T09:00:00Z',
    updatedAt: '2026-04-03T10:00:00Z'
  },

  // Promo 02: Energy & Refreshment Q2 Drive (6 stores assigned)
  {
    id: 'ps-11',
    storeId: 'str-02',
    promotionId: 'prm-02',
    orderStatus: 'Ordered',
    orderDate: '2026-04-03T09:00:00Z',
    orderAmount: 4800000,
    lastFollowUpDate: '2026-04-03T09:00:00Z',
    nextFollowUpDate: '2026-04-25T14:00:00Z',
    remark: 'Restocked display chiller with new flavours.',
    updatedBy: 'u-sales-1',
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-04-03T09:00:00Z'
  },
  {
    id: 'ps-12',
    storeId: 'str-04',
    promotionId: 'prm-02',
    orderStatus: 'Follow-up Required',
    orderDate: undefined,
    orderAmount: 0,
    lastFollowUpDate: '2026-04-04T16:00:00Z',
    nextFollowUpDate: '2026-04-07T15:00:00Z',
    remark: 'Check space in refrigerator unit; meeting with branch supervisor.',
    updatedBy: 'u-sales-1',
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-04-04T16:00:00Z'
  },
  {
    id: 'ps-13',
    storeId: 'str-01',
    promotionId: 'prm-02',
    orderStatus: 'Not Ordered',
    orderDate: undefined,
    orderAmount: 0,
    lastFollowUpDate: undefined,
    nextFollowUpDate: '2026-04-09T10:00:00Z',
    remark: 'Targeted for next week review.',
    updatedBy: 'u-sales-1',
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-03-20T10:00:00Z'
  },
  {
    id: 'ps-14',
    storeId: 'str-12',
    promotionId: 'prm-02',
    orderStatus: 'Ordered',
    orderDate: '2026-04-02T15:30:00Z',
    orderAmount: 3200000,
    lastFollowUpDate: '2026-04-02T15:30:00Z',
    nextFollowUpDate: '2026-04-26T10:00:00Z',
    remark: 'Initial stocking confirmed.',
    updatedBy: 'u-sales-3',
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-04-02T15:30:00Z'
  }
];

export const INITIAL_TASKS: FollowUpTask[] = [
  {
    id: 'tsk-01',
    storeId: 'str-02',
    promotionId: 'prm-01',
    assignedUser: 'u-sales-1',
    taskTitle: 'Follow up Songkran Pi Mai order with Store Manager Phoutthaphone',
    dueDate: '2026-04-06T09:30:00Z',
    priority: 'High',
    taskStatus: 'Pending',
    remark: 'Store was busy during last visit; bring refreshed price list & display mockup.',
    createdAt: '2026-04-02T11:00:00Z',
    updatedAt: '2026-04-02T11:00:00Z'
  },
  {
    id: 'tsk-02',
    storeId: 'str-07',
    promotionId: 'prm-01',
    assignedUser: 'u-sales-2',
    taskTitle: 'Check receivable collection & secure 5-pallet promo order',
    dueDate: '2026-04-05T14:00:00Z',
    priority: 'High',
    taskStatus: 'In Progress',
    remark: 'Owner promised to settle after receiving wholesale payment.',
    createdAt: '2026-04-01T15:00:00Z',
    updatedAt: '2026-04-01T15:00:00Z'
  },
  {
    id: 'tsk-03',
    storeId: 'str-11',
    promotionId: 'prm-01',
    assignedUser: 'u-sales-3',
    taskTitle: 'Deliver customized banquet pricing proposal to F&B Manager',
    dueDate: '2026-04-07T11:00:00Z',
    priority: 'Medium',
    taskStatus: 'Pending',
    remark: 'Include free tasting kits and banquet table tent cards.',
    createdAt: '2026-04-03T10:00:00Z',
    updatedAt: '2026-04-03T10:00:00Z'
  },
  {
    id: 'tsk-04',
    storeId: 'str-04',
    promotionId: 'prm-02',
    assignedUser: 'u-sales-1',
    taskTitle: 'Inspect chiller shelf space for Energy Q2 can placement',
    dueDate: '2026-04-07T15:00:00Z',
    priority: 'Medium',
    taskStatus: 'Pending',
    remark: 'Negotiate eye-level middle shelf placement with shift supervisor.',
    createdAt: '2026-04-04T16:00:00Z',
    updatedAt: '2026-04-04T16:00:00Z'
  },
  {
    id: 'tsk-05',
    storeId: 'str-01',
    promotionId: 'prm-01',
    assignedUser: 'u-sales-1',
    taskTitle: 'Deliver POSM standee and verify end-cap merchandise setup',
    dueDate: '2026-03-24T10:00:00Z', // Overdue task demonstration
    priority: 'Low',
    taskStatus: 'Pending',
    remark: 'Marketing sent 2 floor standees to warehouse.',
    createdAt: '2026-03-19T09:00:00Z',
    updatedAt: '2026-03-19T09:00:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: OrderStatusHistory[] = [
  {
    id: 'aud-01',
    promotionStoreId: 'ps-01',
    storeId: 'str-01',
    promotionId: 'prm-01',
    oldStatus: 'Not Ordered',
    newStatus: 'Ordered',
    changedBy: 'u-sales-1',
    notes: 'Order PO #VTE-2026-889 signed by supermarket buyer.',
    createdAt: '2026-03-18T14:30:00Z'
  },
  {
    id: 'aud-02',
    promotionStoreId: 'ps-02',
    storeId: 'str-02',
    promotionId: 'prm-01',
    oldStatus: 'Not Ordered',
    newStatus: 'Follow-up Required',
    changedBy: 'u-sales-1',
    notes: 'Shift manager requested revisit Monday 9:30 AM.',
    createdAt: '2026-04-02T11:00:00Z'
  },
  {
    id: 'aud-03',
    promotionStoreId: 'ps-05',
    storeId: 'str-05',
    promotionId: 'prm-01',
    oldStatus: 'Not Ordered',
    newStatus: 'Ordered',
    changedBy: 'u-sales-1',
    notes: 'Wholesale order 45,000,000 LAK placed with direct warehouse delivery.',
    createdAt: '2026-03-25T11:00:00Z'
  }
];

export const INITIAL_NEW_PRODUCTS: NewProductLaunch[] = [
  {
    id: 'np-01',
    productName: 'Oishi Sparkling Yuzu Green Tea 320ml (ຊາຂຽວ ໂອອິຊິ ສະປາກກິ້ງ ຢູຊຸ)',
    sku: 'NPD-OIS-320Y',
    category: 'Beverages',
    launchDate: '2026-03-15',
    endDate: '2026-05-15',
    packSize: '24 cans / carton',
    unitPrice: 9500,
    targetDistributionRate: 80,
    targetUnitsPerStore: 48,
    description: 'New carbonated Japanese green tea with real Yuzu citrus juice. Comes with promotional mini chiller displays for convenience store checkouts.',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    status: 'Active',
    targetSubChannels: ['Hypermarket', 'Supermarket', 'Chain CVS', 'Gas Station CVS'],
    createdBy: 'u-admin-1',
    createdAt: '2026-03-10T08:00:00Z',
    updatedAt: '2026-03-10T08:00:00Z'
  },
  {
    id: 'np-02',
    productName: 'Dao Coffee Premium Gold Roast 3-in-1 (ກາເຟດາວ ໂກລ ໂຣສ 3in1)',
    sku: 'NPD-DAO-3IN1G',
    category: 'Coffee & Tea',
    launchDate: '2026-03-20',
    endDate: '2026-06-20',
    packSize: '30 sachets / bag',
    unitPrice: 38000,
    targetDistributionRate: 85,
    targetUnitsPerStore: 24,
    description: 'Special roast premium Arabica beans harvested from Bolaven Plateau. Packaged in modern gold foil packaging for high retail visibility.',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    status: 'Active',
    targetSubChannels: ['Hypermarket', 'Supermarket', 'Chain CVS', 'Large Grocery', 'Cash & Carry'],
    createdBy: 'u-admin-1',
    createdAt: '2026-03-15T08:00:00Z',
    updatedAt: '2026-03-15T08:00:00Z'
  },
  {
    id: 'np-03',
    productName: 'Lay Truffle Wavy Potato Chips 75g (ມັນຝຣັ່ງ ເລຍ໌ ລົດທຣັຟເຟິລ)',
    sku: 'NPD-LAY-75TRF',
    category: 'Snacks',
    launchDate: '2026-04-01',
    endDate: '2026-05-30',
    packSize: '24 bags / carton',
    unitPrice: 16500,
    targetDistributionRate: 75,
    targetUnitsPerStore: 24,
    description: 'Gourmet black truffle flavored wavy potato chips. High-margin snack targeted at urban CVS shoppers and millennials.',
    imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80',
    status: 'Active',
    targetSubChannels: ['Supermarket', 'Chain CVS', 'Gas Station CVS'],
    createdBy: 'u-admin-1',
    createdAt: '2026-03-28T08:00:00Z',
    updatedAt: '2026-03-28T08:00:00Z'
  }
];

export const INITIAL_NEW_PRODUCT_STORE_ORDERS: NewProductStoreOrder[] = [
  // np-01 orders
  {
    id: 'npo-01',
    productId: 'np-01',
    storeId: 'str-01', // Vientiane Center Supermarket
    orderStatus: 'Ordered',
    orderQuantity: 48,
    orderAmount: 456000,
    orderDate: '2026-03-18T10:00:00Z',
    invoiceNumber: 'INV-NPD-0101',
    sampleGivenDate: '2026-03-16T09:00:00Z',
    sampleQty: 6,
    customerFeedback: 'Placed order for 2 cartons immediately after tasting yuzu sample. High customer curiosity.',
    updatedBy: 'u-sales-1',
    createdAt: '2026-03-18T10:00:00Z',
    updatedAt: '2026-03-18T10:00:00Z'
  },
  {
    id: 'npo-02',
    productId: 'np-01',
    storeId: 'str-02', // Sokxay Plus Minimart Dongpalan
    orderStatus: 'Ordered',
    orderQuantity: 24,
    orderAmount: 228000,
    orderDate: '2026-03-22T14:00:00Z',
    invoiceNumber: 'INV-NPD-0102',
    sampleGivenDate: '2026-03-20T11:00:00Z',
    sampleQty: 4,
    customerFeedback: 'Placed in checkout front chiller. Restocked 1 carton already.',
    updatedBy: 'u-sales-1',
    createdAt: '2026-03-22T14:00:00Z',
    updatedAt: '2026-03-22T14:00:00Z'
  },
  {
    id: 'npo-03',
    productId: 'np-01',
    storeId: 'str-03', // Friendship Hypermarket
    orderStatus: 'Ordered',
    orderQuantity: 96,
    orderAmount: 912000,
    orderDate: '2026-03-25T09:30:00Z',
    invoiceNumber: 'INV-NPD-0103',
    sampleGivenDate: '2026-03-17T15:00:00Z',
    sampleQty: 12,
    customerFeedback: 'Promotional end-cap display approved. Placed 4 cartons initial stocking.',
    updatedBy: 'u-sales-1',
    createdAt: '2026-03-25T09:30:00Z',
    updatedAt: '2026-03-25T09:30:00Z'
  },
  {
    id: 'npo-04',
    productId: 'np-01',
    storeId: 'str-04', // M-Point Mart Sihom
    orderStatus: 'Sample Provided',
    sampleGivenDate: '2026-04-02T10:30:00Z',
    sampleQty: 6,
    customerFeedback: 'Store manager tried the sample and liked it. Needs approval from chain purchasing officer.',
    nextFollowUpDate: '2026-04-09T10:00:00Z',
    updatedBy: 'u-sales-1',
    createdAt: '2026-04-02T10:30:00Z',
    updatedAt: '2026-04-02T10:30:00Z'
  },
  {
    id: 'npo-05',
    productId: 'np-01',
    storeId: 'str-06', // PTT Gas Station Jiffy
    orderStatus: 'Follow-up Required',
    customerFeedback: 'Chiller space currently rented out to energy drink promotion. Will revisit when contract expires.',
    nextFollowUpDate: '2026-04-10T14:00:00Z',
    updatedBy: 'u-sales-2',
    createdAt: '2026-04-03T11:00:00Z',
    updatedAt: '2026-04-03T11:00:00Z'
  },
  {
    id: 'npo-06',
    productId: 'np-01',
    storeId: 'str-07', // K-Mart Korean Grocery
    orderStatus: 'Not Ordered',
    customerFeedback: 'Owner was not available during sales visit; staff told to return Friday morning.',
    nextFollowUpDate: '2026-04-11T09:00:00Z',
    updatedBy: 'u-sales-2',
    createdAt: '2026-04-04T13:00:00Z',
    updatedAt: '2026-04-04T13:00:00Z'
  },
  // np-02 orders
  {
    id: 'npo-07',
    productId: 'np-02',
    storeId: 'str-01', // Vientiane Center
    orderStatus: 'Ordered',
    orderQuantity: 36,
    orderAmount: 1368000,
    orderDate: '2026-03-24T11:00:00Z',
    invoiceNumber: 'INV-DAO-001',
    sampleGivenDate: '2026-03-21T10:00:00Z',
    sampleQty: 10,
    customerFeedback: 'Dao brand has strong loyalty. Placed on eye-level coffee shelf.',
    updatedBy: 'u-sales-1',
    createdAt: '2026-03-24T11:00:00Z',
    updatedAt: '2026-03-24T11:00:00Z'
  },
  {
    id: 'npo-08',
    productId: 'np-02',
    storeId: 'str-05', // Xang Jieng Wholesale
    orderStatus: 'Ordered',
    orderQuantity: 120,
    orderAmount: 4560000,
    orderDate: '2026-03-26T15:00:00Z',
    invoiceNumber: 'INV-DAO-002',
    customerFeedback: 'Bulk wholesale order for provincial reselling.',
    updatedBy: 'u-sales-1',
    createdAt: '2026-03-26T15:00:00Z',
    updatedAt: '2026-03-26T15:00:00Z'
  },
  {
    id: 'npo-09',
    productId: 'np-02',
    storeId: 'str-08', // Phontong Traditional Grocery
    orderStatus: 'Sample Provided',
    sampleGivenDate: '2026-04-01T14:00:00Z',
    sampleQty: 5,
    customerFeedback: 'Offered sample to regular morning shoppers. Owner said looks promising.',
    nextFollowUpDate: '2026-04-08T11:00:00Z',
    updatedBy: 'u-sales-2',
    createdAt: '2026-04-01T14:00:00Z',
    updatedAt: '2026-04-01T14:00:00Z'
  },
  {
    id: 'npo-10',
    productId: 'np-02',
    storeId: 'str-09', // Saysettha Neighborhood Minimart
    orderStatus: 'Not Ordered',
    customerFeedback: 'Has remaining stock of original Dao 3in1; will order gold blend on next replenishment cycle.',
    nextFollowUpDate: '2026-04-12T16:00:00Z',
    updatedBy: 'u-sales-3',
    createdAt: '2026-04-03T10:00:00Z',
    updatedAt: '2026-04-03T10:00:00Z'
  }
];

