import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppData } from './appState';
import type { UserProfile } from '../types';
import { dataService } from './dataService';
import { remoteCache, type RemoteCache } from './remoteCache';
import { entities, decodeRow, buildChanges, type Versions } from './supabaseCodec';

export type SyncState = { status: 'loading' | 'ready' | 'saving' | 'offline' | 'error'; message?: string; user?: UserProfile };
interface Snapshot { data: AppData; versions: Versions; mdes: UserProfile[]; }

export async function readAll(client: SupabaseClient, table: string) {
  const rows: Record<string, any>[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await client.from(table).select('*').order('id').range(offset, offset + 499);
    if (result.error) throw new Error(result.error.message);
    rows.push(...result.data);
    if (result.data.length < 500) return rows;
  }
}

export async function readSnapshot(client: SupabaseClient): Promise<Snapshot> {
  const data = {} as AppData;
  const versions: Versions = {};
  await Promise.all(entities.map(async (entity) => {
    const rows = await readAll(client, entity.table);
    (data[entity.key] as unknown[]) = rows.map((row) => decodeRow(entity, row));
    versions[entity.table] = Object.fromEntries(rows.filter((row) => row.updated_at).map((row) => [row.id, row.updated_at]));
  }));
  const mdes = (await readAll(client, 'mdes')).map((row) => ({ id: row.id, mdeId: row.id, fullName: row.name, email: '', role: 'sales' as const }));
  return { data, versions, mdes };
}

export class SupabaseSync {
  private stopped = false;
  private importing = false;
  private scheduled = false;
  private saving = false;
  private requiresReload = false;
  private unsubscribe?: () => void;
  private baseline?: Snapshot;
  private user?: UserProfile;
  private readonly cacheKey: string;
  private readonly pendingKey: string;
  constructor(private client: SupabaseClient, private project: string, private userId: string, private report: (state: SyncState) => void, private cache: RemoteCache = remoteCache) {
    this.cacheKey = `promotrack_remote_baseline_${project}_${userId}`;
    this.pendingKey = this.cacheKey + '_pending';
  }

  private async install(snapshot: Snapshot) {
    if (this.stopped) return;
    const user = snapshot.data.users.find((profile) => profile.id === this.userId);
    if (!user) throw new Error('Your account profile is not available. Sign in again.');
    this.user = user;
    this.baseline = snapshot;
    this.importing = true;
    try { dataService.replaceRemoteState(snapshot.data, user, snapshot.mdes); } finally { this.importing = false; }
    await this.cache.put(this.cacheKey, snapshot);
    this.requiresReload = false;
  }

  public async start() {
    dataService.bindRemote(this.project, this.userId);
    this.report({ status: 'loading' });
    try {
      const cached = await this.cache.get<Snapshot>(this.cacheKey);
      const pending = await this.cache.get<AppData>(this.pendingKey);
      if (cached && (pending || !navigator.onLine)) {
        const snapshot = cached;
        await this.install(snapshot);
        if (this.stopped) return;
        if (pending && this.user) {
          this.importing = true;
          try { dataService.replaceRemoteState(pending, this.user, snapshot.mdes); } finally { this.importing = false; }
        }
      } else {
        const profile = await this.client.rpc('ensure_my_profile');
        if (profile.error) throw new Error(profile.error.message);
        const snapshot = await readSnapshot(this.client);
        await this.install(snapshot);
      }
      if (this.stopped) return;
      this.unsubscribe = dataService.subscribe(() => this.changed());
      window.addEventListener('online', this.onOnline);
      window.addEventListener('offline', this.onOffline);
      this.report({ status: navigator.onLine ? 'ready' : 'offline', user: this.user });
      if (pending) await this.flush();
    } catch (error) { if (!this.stopped) this.report({ status: 'error', message: message(error), user: this.user }); }
  }

  private onOnline = () => { void this.flush(); };
  private onOffline = () => { this.report({ status: 'offline', user: this.user }); };
  private changed() {
    if (this.importing || this.stopped || !this.baseline) return;
    if (!this.scheduled) {
      this.scheduled = true;
      queueMicrotask(async () => {
        this.scheduled = false;
        if (this.stopped || !this.baseline) return;
        try {
          const next = dataService.exportState();
          if (!buildChanges(this.baseline.data, next, this.baseline.versions, this.baseline.mdes).length) return;
          await this.cache.put(this.pendingKey, next);
          await this.flush();
        } catch (error) { if (!this.stopped) this.report({ status: 'error', message: message(error), user: this.user }); }
      });
    }
  }

  public async flush() {
    if (this.stopped || this.saving || !this.baseline || !this.user) return;
    if (this.requiresReload) { await this.reload(); return; }
    if (!navigator.onLine) { this.onOffline(); return; }
    this.saving = true;
    try {
    const pending = await this.cache.get<AppData>(this.pendingKey);
    if (this.stopped) return;
    if (!pending) { this.report({ status: 'ready', user: this.user }); return; }
    const next = pending;
    let changes = buildChanges(this.baseline.data, next, this.baseline.versions, this.baseline.mdes);
    if (!changes.length) { await this.cache.remove(this.pendingKey); this.report({ status: 'ready', user: this.user }); return; }
    this.report({ status: 'saving', user: this.user });
      // Store uploaded images in Supabase Storage, not in oversized SQL rows.
      for (const collection of ['promotions', 'newProducts', 'users'] as const) {
        for (const record of next[collection]) {
          const image = 'avatarUrl' in record ? record.avatarUrl : 'imageUrl' in record ? record.imageUrl : undefined;
          if (!image?.startsWith('data:image/')) continue;
          const file = await (await fetch(image)).blob();
          const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
          const path = `${this.userId}/${record.id}/${crypto.randomUUID()}.${extension}`;
          const uploaded = await this.client.storage.from('promotion-images').upload(path, file, { contentType: file.type });
          if (uploaded.error) throw new Error(uploaded.error.message);
          const url = this.client.storage.from('promotion-images').getPublicUrl(path).data.publicUrl;
          if (collection === 'users') (record as UserProfile).avatarUrl = url;
          else (record as { imageUrl?: string }).imageUrl = url;
        }
      }
      await this.cache.put(this.pendingKey, next);
      changes = buildChanges(this.baseline.data, next, this.baseline.versions, this.baseline.mdes);
      if (this.stopped) return;
      const result = await this.client.rpc('app_apply_changes', { changes });
      if (result.error) throw new Error(result.error.message);
      // Persist the applied baseline before refreshing, so retrying a failed read
      // never replays a committed write with an obsolete version expectation.
      this.requiresReload = true;
      await this.cache.remove(this.pendingKey);
      const snapshot = await readSnapshot(this.client);
      await this.install(snapshot);
      if (!this.stopped) this.report({ status: 'ready', user: this.user });
    } catch (error) { if (!this.stopped) this.report({ status: 'error', message: this.requiresReload ? 'Changes were saved, but refreshing failed. Retry to refresh. ' + message(error) : message(error), user: this.user }); }
    finally { this.saving = false; }
  }

  public async reload() {
    if (this.saving || this.stopped) return;
    this.report({ status: 'loading', user: this.user });
    try {
      const pending = await this.cache.get<AppData>(this.pendingKey);
      if (pending) await this.cache.put(this.pendingKey + '_backup', pending);
      const snapshot = await readSnapshot(this.client);
      await this.install(snapshot);
      if (!this.stopped) { await this.cache.remove(this.pendingKey); this.report({ status: 'ready', user: this.user }); }
    } catch (error) { if (!this.stopped) this.report({ status: 'error', message: message(error), user: this.user }); }
  }

  public stop() {
    this.stopped = true; this.unsubscribe?.();
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }
}
function message(error: unknown) { return error instanceof Error ? error.message : 'Supabase connection failed.'; }
