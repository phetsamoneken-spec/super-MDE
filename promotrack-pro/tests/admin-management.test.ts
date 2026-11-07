import { before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage implements Storage {
  data = new Map<string, string>();
  get length() { return this.data.size; }
  key(index: number) { return Array.from(this.data.keys())[index] ?? null; }
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
let dataService: typeof import('../src/services/dataService')['dataService'];
let seed: [string, string][];
before(async () => {
  ({ dataService } = await import('../src/services/dataService'));
  seed = [...storage.data];
});
beforeEach(() => { storage.clear(); seed.forEach(([key, value]) => storage.setItem(key, value)); });

const addChannel = () => dataService.addSubChannel({ name: 'Audit outlets', channelId: 'ch-1' });
const addProduct = (targetSubChannels: string[] = []) => dataService.createNewProduct({
  productName: 'Audit launch', sku: 'AUDIT-1', category: 'Beverages', launchDate: '2026-11-07',
  packSize: '24 units', unitPrice: 10000, targetDistributionRate: 80, targetUnitsPerStore: 24,
  description: '', status: 'Active', targetSubChannels
});

test('admin can add and delete a persisted unused Sub-channel', () => {
  const result = addChannel();
  assert.equal(result.success, true);
  assert(dataService.getSubChannels().some((item) => item.id === result.subChannel!.id));
  assert.equal(dataService.deleteSubChannel(result.subChannel!.id).success, true);
  assert(!dataService.getSubChannels().some((item) => item.id === result.subChannel!.id));
});

test('Sub-channel creation validates names, parents, and duplicates', () => {
  assert.equal(dataService.addSubChannel({ name: '   ', channelId: 'ch-1' }).error, 'name_required');
  assert.equal(dataService.addSubChannel({ name: 'Test', channelId: 'missing' }).error, 'channel_required');
  assert.equal(addChannel().success, true);
  assert.equal(dataService.addSubChannel({ name: ' audit OUTLETS ', channelId: 'ch-1' }).error, 'duplicate_name');
});

test('used Sub-channels cannot be deleted and stores are preserved', () => {
  const before = dataService.getAllStoresUnfiltered();
  assert(dataService.getSubChannelUsage('sub-2').stores > 0);
  assert.equal(dataService.deleteSubChannel('sub-2').error, 'in_use');
  assert.deepEqual(dataService.getAllStoresUnfiltered(), before);
  assert.equal(dataService.deleteSubChannel('missing').error, 'not_found');
});

test('product targets prevent Sub-channel deletion until their reference is removed', () => {
  const channel = addChannel().subChannel!;
  const product = addProduct([channel.name]).product!;
  assert.equal(dataService.getSubChannelUsage(channel.id).products, 1);
  assert.equal(dataService.deleteSubChannel(channel.id).error, 'in_use');
  assert.equal(dataService.deleteNewProduct(product.id).success, true);
  assert.equal(dataService.deleteSubChannel(channel.id).success, true);
});

test('deleting a new product removes its orders but preserves stores and unrelated records', () => {
  const product = addProduct().product!;
  const stores = dataService.getAllStoresUnfiltered();
  const otherOrders = dataService.getAllNewProductStoreOrdersUnfiltered();
  assert.equal(dataService.assignStoresToNewProduct(product.id, [stores[0].id]).addedCount, 1);
  assert.equal(dataService.deleteNewProduct(product.id).success, true);
  assert(!dataService.getAllNewProductsUnfiltered().some((item) => item.id === product.id));
  assert.deepEqual(dataService.getAllNewProductStoreOrdersUnfiltered(), otherOrders);
  assert.deepEqual(dataService.getAllStoresUnfiltered(), stores);
  const snapshot = [...storage.data];
  assert.equal(dataService.deleteNewProduct('missing').success, false);
  assert.deepEqual([...storage.data], snapshot);
});

test('sales cannot add or delete Sub-channels or new products through the service', () => {
  dataService.setCurrentUser(dataService.getSalesReps()[0]);
  const snapshot = [...storage.data];
  assert.equal(addChannel().error, 'admin_only');
  assert.equal(dataService.deleteSubChannel('sub-1').error, 'admin_only');
  assert.equal(addProduct().success, false);
  assert.equal(dataService.deleteNewProduct(dataService.getAllNewProductsUnfiltered()[0].id).success, false);
  assert.deepEqual([...storage.data], snapshot);
});
