import { PGlite } from '@electric-sql/pglite';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const root = fileURLToPath(new URL('../', import.meta.url));
import data from '../src/data/outletDataset.json';
const scaffold = `CREATE ROLE authenticated; CREATE ROLE anon;
CREATE SCHEMA auth; CREATE TABLE auth.users(id UUID PRIMARY KEY, email TEXT);
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE SCHEMA storage; CREATE TABLE storage.buckets(id TEXT PRIMARY KEY,name TEXT,public BOOLEAN,file_size_limit BIGINT,allowed_mime_types TEXT[]);
CREATE TABLE storage.objects(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id TEXT,name TEXT,owner UUID);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; GRANT USAGE ON SCHEMA auth,public TO authenticated,anon;`;
test('PostgreSQL schema, exact workbook import, repeatability, and MDE access policies', { timeout: 30000 }, async () => { const db=new PGlite({extensions:{'uuid-ossp':uuid_ossp,pgcrypto}});try{
await db.exec(scaffold);
for(const name of fs.readdirSync(root+'/supabase/migrations').sort()){await db.exec(fs.readFileSync(root+'/supabase/migrations/'+name,'utf8'));console.log('Applied migration',name);}
// Existing matching reference names must retain their real IDs on a repeated import.
const existingChannelId=crypto.randomUUID();await db.query('INSERT INTO public.channels(id,name) VALUES ($1,$2)',[existingChannelId,data.channels[0].name]);
const seed=fs.readFileSync(root+'/supabase/seed.sql','utf8');await db.exec(seed);await db.exec(seed);
assert.equal((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM public.stores')).rows[0].n,1178);
assert.equal((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM public.mdes')).rows[0].n,7);
assert.equal((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM public.sub_channels')).rows[0].n,15);
assert.equal((await db.query<{ id: string }>('SELECT id FROM public.channels WHERE name=$1',[data.channels[0].name])).rows[0].id,existingChannelId);
const actual=(await db.query('SELECT * FROM public.outlet_directory ORDER BY "OUTLET CODE"')).rows;
const expected=data.outlets.map(o=>Object.fromEntries(data.source.headers.map((h,i)=>[h,[o.mdeName,o.storeCode,o.storeName,o.mainChannel,o.channel,o.subChannel,o.village,o.district,o.province][i]]))).sort((a,b)=>a['OUTLET CODE']<b['OUTLET CODE']?-1:1);
assert.deepEqual(actual,expected);console.log('PASS: all 1178 database records match all nine workbook columns; seed repeats without duplicates');
const ids=[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()];for(let i=0;i<3;i++)await db.query('INSERT INTO auth.users(id,email) VALUES ($1,$2)',[ids[i],`test-${i}@example.test`]);
await db.query("INSERT INTO public.profiles(id,email,full_name,role,mde_id) VALUES ($1,'test-0@example.test','Test Admin','admin',NULL),($2,'test-1@example.test','Test Sales','sales',$4),($3,'test-2@example.test','Unassigned','sales',NULL)",[...ids,data.mdes[0].id]);
await db.exec('GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;');
async function asUser(user: string){await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('SET ROLE authenticated');}
await asUser(ids[0]);assert.equal((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM public.outlet_directory')).rows[0].n,1178);
await asUser(ids[1]);const count=data.outlets.filter(o=>o.mdeId===data.mdes[0].id).length;assert.equal((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM public.outlet_directory')).rows[0].n,count);
assert.equal((await db.query("UPDATE public.stores SET store_name='not allowed' RETURNING id")).rows.length,0);
await assert.rejects(() => db.query('UPDATE public.profiles SET mde_id=$1 WHERE id=$2', [data.mdes[1].id, ids[1]]), /row-level security/);
await assert.rejects(() => db.query("UPDATE public.profiles SET role='admin' WHERE id=$1", [ids[1]]), /row-level security/);
assert.equal((await db.query("UPDATE public.profiles SET full_name='Own profile edit' WHERE id=$1 RETURNING id", [ids[1]])).rows.length, 1);
await assert.rejects(()=>db.query("INSERT INTO public.mdes(name) VALUES ('not allowed')"),/row-level security/);
await asUser(ids[2]);assert.equal((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM public.outlet_directory')).rows[0].n,0);
await db.exec('RESET ROLE; SET ROLE anon;');assert.equal((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM public.outlet_directory')).rows[0].n,0);
console.log('PASS: Admin sees all; assigned MDE sees '+count+'; unassigned and anonymous see zero; sales cannot modify outlets or MDEs');
await db.exec('RESET ROLE;');
await assert.rejects(()=>db.query('DELETE FROM public.sub_channels WHERE id=$1',[data.outlets[0].subChannelId]),/foreign key/);
console.log('PASS: referenced Sub-channel cannot be deleted');
}finally{await db.close();}});

test('fresh-project SQL executes as a single transaction and imports exactly 1178 outlets', { timeout: 30000 }, async () => {
  const db = new PGlite({ extensions: { 'uuid-ossp': uuid_ossp, pgcrypto } });
  try {
    await db.exec(scaffold);
    await db.exec(fs.readFileSync(root + '/supabase/outlet-fresh-setup.sql', 'utf8'));
    assert.equal((await db.query<{ n: number }>('select count(*)::int as n from public.outlet_directory')).rows[0].n, 1178);
    assert.equal((await db.query<{ n: number }>('select count(*)::int as n from public.profiles')).rows[0].n, 0);
  } finally { await db.close(); }
});
