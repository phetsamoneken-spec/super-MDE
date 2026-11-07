export interface RemoteCache {
  get<T>(key: string): Promise<T | null>;
  put(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}
let opening: Promise<IDBDatabase> | undefined;
function database() {
  return opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('promotrack-supabase-cache', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('snapshots');
    request.onerror = () => { opening = undefined; reject(request.error); };
    request.onblocked = () => { opening = undefined; reject(new Error('Close other app tabs to open the offline cache.')); };
    request.onsuccess = () => resolve(request.result);
  });
}
async function operation<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('snapshots', mode);
    const request = run(transaction.objectStore('snapshots'));
    transaction.oncomplete = () => resolve(request.result as T);
    transaction.onerror = () => reject(transaction.error || request.error);
    transaction.onabort = () => reject(transaction.error || new Error('Offline cache could not be saved.'));
  });
}
export const remoteCache: RemoteCache = {
  get: async <T>(key: string) => (await operation<T | undefined>('readonly', (store) => store.get(key))) ?? null,
  put: async (key, value) => { await operation('readwrite', (store) => store.put(value, key)); },
  remove: async (key) => { await operation('readwrite', (store) => store.delete(key)); }
};
