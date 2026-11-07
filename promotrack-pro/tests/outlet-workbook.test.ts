import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import XLSX from 'xlsx';
import { INITIAL_STORES, INITIAL_USERS, INITIAL_CHANNELS, INITIAL_SUB_CHANNELS, INITIAL_PROMOTIONS, INITIAL_TASKS, INITIAL_NEW_PRODUCTS, OUTLET_DATASET } from '../src/services/workbookData';

const storage = new Map<string, string>([['promotrack_stores', '[{"id":"legacy","storeName":"previous data"}]']]);
const legacy = storage.get('promotrack_stores');
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) }, configurable: true });
Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
let dataService: typeof import('../src/services/dataService')['dataService'];
let keys: typeof import('../src/services/dataService')['STORAGE_KEYS'];
before(async () => { ({ dataService, STORAGE_KEYS: keys } = await import('../src/services/dataService')); });
const workbookBytes = fs.readFileSync(new URL('../data/outlet.xlsx', import.meta.url));
const workbook = XLSX.read(workbookBytes, { type: 'buffer' });
const sourceRows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }).slice(1);
const columns = (store: typeof INITIAL_STORES[number]) => [store.mdeName, store.storeCode, store.storeName, store.mainChannel, store.channel, store.subChannel, store.village, store.district, store.province];

test('every source cell survives exactly, including repeated outlet names with distinct codes', () => {
  assert.equal(INITIAL_STORES.length, 1178);
  assert.deepEqual(INITIAL_STORES.map(columns), sourceRows);
  assert.equal(new Set(INITIAL_STORES.map((store) => store.storeCode)).size, 1178);
  assert.equal(new Set(INITIAL_STORES.map((store) => store.storeName)).size, 1176);
  assert(INITIAL_STORES.every((store) => /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(store.id)));
});

test('only source categories and MDEs are seeded, with a separate non-person Admin', () => {
  assert.equal(INITIAL_USERS.filter((user) => user.mdeId).length, 7);
  assert.equal(INITIAL_USERS.filter((user) => user.role === 'admin').length, 1);
  assert(INITIAL_USERS.every((user) => !user.email && !user.phone && !user.avatarUrl));
  assert.equal(INITIAL_CHANNELS.length, 2);
  assert.equal(INITIAL_SUB_CHANNELS.length, 15);
  assert.equal(OUTLET_DATASET.mainChannels.length, 1);
  assert.deepEqual([INITIAL_PROMOTIONS, INITIAL_TASKS, INITIAL_NEW_PRODUCTS], [[], [], []]);
  assert(INITIAL_STORES.every((store) => INITIAL_USERS.some((user) => user.mdeId === store.mdeId && user.id === store.assignedSalesUser)));
});

test('activating the supplied dataset excludes legacy data without deleting the old keys', () => {
  assert.equal(dataService.getStores().length, 1178);
  assert.equal(storage.get('promotrack_stores'), legacy);
  assert.notEqual(keys.STORES, 'promotrack_stores');
  assert.equal(dataService.getCurrentUser().fullName, 'Admin');
});

test('the original workbook imports with all nine fields and no guessed channel or MDE', async () => {
  const file = new File([workbookBytes], 'outlet.xlsx');
  const result = await dataService.parseExcelFile(file);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.rows.length, 1178);
  assert(result.rows.every((row) => row.isValid && row.isDuplicate));
  assert.deepEqual(result.rows.map((row) => [row.assignedSales, row.storeCode, row.storeName, row.mainChannel, row.channel, row.subChannel, row.village, row.district, row.province]), sourceRows);
  assert.deepEqual(dataService.batchImportStores(result.rows, 'skip'), { success: true, importedCount: 0, updatedCount: 0, skippedCount: 1178 });
});

test('unknown MDEs are rejected rather than assigned to the first salesperson', async () => {
  const sheet = XLSX.utils.aoa_to_sheet([OUTLET_DATASET.source.headers, ['UNKNOWN MDE', ...sourceRows[0].slice(1)]]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, sheet, 'Outlets');
  const file = new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], 'invalid.xlsx');
  const parsed = await dataService.parseExcelFile(file);
  assert.equal(parsed.rows[0].isValid, false);
  assert(parsed.rows[0].errors?.some((error) => error.includes('Unknown MDE')));
  assert.equal(dataService.batchImportStores(parsed.rows, 'update').updatedCount, 0);
});

test('each MDE persona sees exactly its workbook-assigned outlets', () => {
  for (const user of dataService.getSalesReps()) {
    dataService.setCurrentUser(user);
    assert.deepEqual(dataService.getStores().map((store) => store.storeCode), INITIAL_STORES.filter((store) => store.mdeId === user.mdeId).map((store) => store.storeCode));
  }
  dataService.setCurrentUser(INITIAL_USERS[0]);
});
