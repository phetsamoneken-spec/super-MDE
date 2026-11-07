import type { AppData } from './appState';
import type { UserProfile } from '../types';

type Row = Record<string, any>;
export const entities = [
  { key: 'users', table: 'profiles', fields: 'email fullName phone role avatarUrl mdeId' },
  { key: 'channels', table: 'channels', fields: 'name description mainChannelId' },
  { key: 'subChannels', table: 'sub_channels', fields: 'name description channelId' },
  { key: 'stores', table: 'stores', fields: 'storeCode storeName channel subChannel mainChannel mainChannelId channelId subChannelId mdeId mdeName village district province phone address city isActive' },
  { key: 'promotions', table: 'promotions', fields: 'promotionName description startDate endDate imageUrl imagePath status targetSubChannels createdBy' },
  { key: 'newProducts', table: 'new_products', fields: 'productName sku category launchDate endDate packSize unitPrice targetDistributionRate targetUnitsPerStore description imageUrl status targetSubChannels createdBy' },
  { key: 'promoStores', table: 'promotion_stores', fields: 'storeId promotionId orderStatus orderDate orderAmount lastFollowUpDate nextFollowUpDate remark updatedBy' },
  { key: 'newProductStoreOrders', table: 'new_product_store_orders', fields: 'productId storeId orderStatus orderQuantity orderAmount orderDate invoiceNumber sampleGivenDate sampleQty customerFeedback nextFollowUpDate updatedBy' },
  { key: 'tasks', table: 'follow_up_tasks', fields: 'storeId promotionId taskTitle dueDate priority taskStatus remark' },
  { key: 'auditLogs', table: 'order_status_history', fields: 'promotionStoreId storeId promotionId oldStatus newStatus changedBy notes' }
] as const;
type Entity = typeof entities[number];
export type Versions = Record<string, Record<string, string>>;
export interface Change { table: string; operation: 'delete' | 'upsert'; ids?: string[]; rows?: Row[]; expected: Record<string, string>; }
const snake = (key: string) => key.replace(/[A-Z]/g, (letter) => '_' + letter.toLowerCase());
const camel = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

export function encodeRow(entity: Entity, record: Row, mdeIds: Set<string>): Row {
  const row: Row = { id: record.id };
  for (const key of entity.fields.split(' ')) row[snake(key)] = record[key] === '' && /Date$/.test(key) ? null : record[key] ?? null;
  if (entity.key === 'stores') row.assigned_sales_user = mdeIds.has(record.assignedSalesUser) ? null : record.assignedSalesUser || null;
  if (entity.key === 'tasks') {
    row.assigned_user = mdeIds.has(record.assignedUser) ? null : record.assignedUser || null;
    row.mde_id = mdeIds.has(record.assignedUser) ? record.assignedUser : null;
  }
  if (entity.key === 'users' && !row.mde_id) row.mde_id = null;
  return row;
}

export function decodeRow(entity: Entity, row: Row): Row {
  const result: Row = {};
  for (const [key, value] of Object.entries(row)) result[camel(key)] = value ?? undefined;
  if (entity.key === 'stores') { result.assignedSalesUser = row.mde_id || row.assigned_sales_user || ''; result.city = row.province || row.city || ''; }
  if (entity.key === 'tasks') result.assignedUser = row.mde_id || row.assigned_user || '';
  if (entity.key === 'users') result.email = row.email || '';
  return result;
}

export function buildChanges(before: AppData, after: AppData, versions: Versions, mdes: UserProfile[]): Change[] {
  const ids = new Set(mdes.map((mde) => mde.id));
  const deletions: Change[] = [];
  const upserts: Change[] = [];
  for (const entity of entities) {
    const old = new Map<string, Row>((before[entity.key] as Row[]).map((record) => [record.id, encodeRow(entity, record, ids)]));
    const next = new Map<string, Row>((after[entity.key] as Row[]).map((record) => [record.id, encodeRow(entity, record, ids)]));
    const removed = [...old.keys()].filter((id) => !next.has(id));
    const changed = [...next.values()].filter((record) => JSON.stringify(record) !== JSON.stringify(old.get(record.id)));
    const expected = (keys: string[]) => Object.fromEntries(keys.filter((id) => versions[entity.table]?.[id]).map((id) => [id, versions[entity.table][id]]));
    if (removed.length) deletions.unshift({ table: entity.table, operation: 'delete', ids: removed, expected: expected(removed) });
    if (changed.length) upserts.push({ table: entity.table, operation: 'upsert', rows: changed, expected: expected(changed.map((row) => row.id)) });
  }
  return [...deletions, ...upserts];
}
