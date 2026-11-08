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

const firstChannel = () => dataService.getChannels()[0].id;
const addChannel = () => dataService.addSubChannel({ name: 'Audit outlets', channelId: firstChannel() });
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
  assert.equal(dataService.addSubChannel({ name: '   ', channelId: firstChannel() }).error, 'name_required');
  assert.equal(dataService.addSubChannel({ name: 'Test', channelId: 'missing' }).error, 'channel_required');
  assert.equal(addChannel().success, true);
  assert.equal(dataService.addSubChannel({ name: ' audit OUTLETS ', channelId: firstChannel() }).error, 'duplicate_name');
});

test('used Sub-channels cannot be deleted and stores are preserved', () => {
  const before = dataService.getAllStoresUnfiltered();
  const usedId = dataService.getSubChannels()[0].id;
  assert(dataService.getSubChannelUsage(usedId).stores > 0);
  assert.equal(dataService.deleteSubChannel(usedId).error, 'in_use');
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
  assert.equal(dataService.deleteSubChannel(dataService.getSubChannels()[0].id).error, 'admin_only');
  assert.equal(addProduct().success, false);
  assert.equal(dataService.deleteNewProduct('any-product').success, false);
  assert.deepEqual([...storage.data], snapshot);
});

test('Admin creates tasks; MDE cannot create tasks or automatic follow-ups but can complete assigned work',()=>{
  const admin=dataService.getCurrentUser(),rep=dataService.getSalesReps()[0],store=dataService.getAllStoresUnfiltered().find(item=>item.assignedSalesUser===rep.id||item.mdeId===rep.id)!;
  const task={storeId:store.id,assignedUser:rep.id,taskTitle:'Assigned by Admin',dueDate:'2026-11-09',priority:'High' as const,taskStatus:'Pending' as const};
  const created=dataService.createTask(task);assert.equal(created.success,true);
  dataService.setCurrentUser(rep);const before=JSON.stringify(dataService.getAllTasksUnfiltered());
  assert.equal(dataService.createTask({...task,taskTitle:'Blocked'}).success,false);
  dataService.ensureFollowUpTask({...task,storeId:'different-store',taskTitle:'Blocked automatic follow-up'});
  assert.equal(JSON.stringify(dataService.getAllTasksUnfiltered()),before);
  assert.equal(dataService.updateTask(created.task!.id,{taskStatus:'Completed'}).success,true);
  assert.equal(dataService.getTasks().find(item=>item.id===created.task!.id)?.taskStatus,'Completed');
  dataService.setCurrentUser(admin);
});

test('NPD follow-up keeps the exact product and outlet across persisted task reads', () => {
  const a=addProduct().product!, b=addProduct().product!;
  const store=dataService.getStores()[0];
  dataService.assignStoresToNewProduct(a.id,[store.id]);
  dataService.assignStoresToNewProduct(b.id,[store.id]);
  const order=dataService.getNewProductStoreOrders(a.id)[0];
  const result=dataService.updateNewProductOrderStatus({orderId:order.id,productId:a.id,storeId:store.id,newStatus:'Sample Provided',sampleQty:2,sampleGivenDate:'2026-11-07T00:00:00Z',nextFollowUpDate:'2026-11-10T00:00:00Z',createAutoTask:true});
  assert.equal(result.success,true);
  const task=dataService.getTasks().find(t=>t.productId===a.id)!;
  assert(task);assert.equal(task.storeId,store.id);assert.notEqual(task.productId,b.id);
  dataService.updateNewProductOrderStatus({orderId:order.id,productId:a.id,storeId:store.id,newStatus:'Ordered',orderQuantity:12,orderAmount:120000});
  assert.equal(dataService.getNewProductStoreOrders(a.id)[0].orderStatus,'Ordered');
  assert.equal(dataService.getTasks().find(t=>t.id===task.id)!.productId,a.id);
});

test('Sales adds and deletes own outlets but cannot write another MDE or edit store details', () => {
  const rep=dataService.getSalesReps()[0];
  const other=dataService.getAllStoresUnfiltered().find(s=>s.assignedSalesUser!==rep.id)!;
  dataService.setCurrentUser(rep);
  const own=dataService.getStores()[0];
  assert.equal(dataService.addStore({...own,storeCode:'SALES-OWN-TEST',assignedSalesUser:other.assignedSalesUser}).success,false);
  assert.equal(dataService.deleteStore(other.id).success,false);
  assert.equal(dataService.updateStore(other.id,{assignedSalesUser:rep.id}).success,false);
  assert(dataService.getAllStoresUnfiltered().some(s=>s.id===other.id));
  const added=dataService.addStore({...own,storeCode:'SALES-OWN-TEST',storeName:'Own new outlet'});
  assert.equal(added.success,true);
  assert(dataService.getStores().some(s=>s.id===added.store!.id));
  assert.equal(dataService.deleteStore(added.store!.id).success,true);
  assert(!dataService.getAllStoresUnfiltered().some(s=>s.id===added.store!.id));
});
