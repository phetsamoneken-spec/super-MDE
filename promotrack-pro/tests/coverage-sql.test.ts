import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import data from '../src/data/outletDataset.json';
const scaffold=`CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id UUID PRIMARY KEY,email TEXT,email_confirmed_at TIMESTAMPTZ);
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE SCHEMA storage;CREATE TABLE storage.buckets(id TEXT PRIMARY KEY,name TEXT,public BOOLEAN,file_size_limit BIGINT,allowed_mime_types TEXT[]);
CREATE TABLE storage.objects(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id TEXT,name TEXT,owner UUID);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;GRANT USAGE ON SCHEMA auth,public TO authenticated,anon;`;
test('Visit RLS, immutable identity, distinct coverage, historical ownership and outlet cascades', {timeout:30000},async()=>{
  const db=new PGlite({extensions:{'uuid-ossp':uuid_ossp,pgcrypto}});
  try {
    await db.exec(scaffold);await db.exec(fs.readFileSync(new URL('../supabase/outlet-fresh-setup.sql',import.meta.url),'utf8'));
    const admin=crypto.randomUUID(),a=crypto.randomUUID(),sameMde=crypto.randomUUID(),b=crypto.randomUUID(),unassigned=crypto.randomUUID();
    const m1=data.mdes[0].id,m2=data.mdes[1].id;
    const own=data.outlets.find(row=>row.mdeId===m1)!.id,foreign=data.outlets.find(row=>row.mdeId===m2)!.id;
    for(const [id,mde,role] of [[admin,null,'admin'],[a,m1,'sales'],[sameMde,m1,'sales'],[b,m2,'sales'],[unassigned,null,'sales']]){
      await db.query('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,now())',[id,`${id}@example.test`]);
      await db.query('INSERT INTO public.profiles(id,email,full_name,role,mde_id) VALUES($1,$2,$3,$4,$5)',[id,`${id}@example.test`,'Fixture',role,mde]);
    }
    async function as(id:string){await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('SET ROLE authenticated');}
    const insert=(store:string,date='2025-02-01',note='visit')=>db.query<any>('INSERT INTO public.outlet_visits(store_id,visited_on,note) VALUES($1,$2,$3) RETURNING *',[store,date,note]);
    const report=async()=> (await db.query<{coverage:any[]}>('SELECT public.outlet_visit_coverage($1,$2) AS coverage',['2025-02-01','2025-02-28'])).rows[0].coverage;
    await as(a);const first=(await insert(own)).rows[0];assert.equal(first.mde_id,m1);assert.equal(first.visited_by,a);
    await insert(own,'2025-02-02');assert.equal((await report()).length,1);assert.equal((await report())[0].visit_count,2);
    await assert.rejects(insert(own),/unique|duplicate/);
    await assert.rejects(insert(foreign),/outside your active MDE/);
    await assert.rejects(db.query('INSERT INTO public.outlet_visits(store_id,visited_on,mde_id,visited_by) VALUES($1,$2,$3,$4)',[own,'2025-02-03',m2,b]),/permission denied/);
    await assert.rejects(insert(own,'2999-01-01'),/outlet_visit_not_future/);
    await assert.rejects(insert(own,'2025-02-03','x'.repeat(2001)),/check constraint/);
    await assert.rejects(db.query('UPDATE public.outlet_visits SET visited_on=$1 WHERE id=$2',['2025-02-04',first.id]),/permission denied/);
    await db.query('UPDATE public.outlet_visits SET note=$1 WHERE id=$2',['new note',first.id]);
    assert.equal((await db.query<any>('SELECT note FROM public.outlet_visits WHERE id=$1',[first.id])).rows[0].note,'new note');
    await as(sameMde);assert.equal((await report()).length,1);
    assert.equal((await db.query('UPDATE public.outlet_visits SET note=$1 WHERE id=$2 RETURNING id',['forged',first.id])).rows.length,0);
    assert.equal((await db.query('DELETE FROM public.outlet_visits WHERE id=$1 RETURNING id',[first.id])).rows.length,0);
    await as(b);assert.equal((await report()).length,0);assert.equal((await db.query('SELECT * FROM public.outlet_visits')).rows.length,0);await insert(foreign);
    await as(admin);assert.equal((await report()).length,2);assert.equal((await db.query('SELECT * FROM public.outlet_visits')).rows.length,3);await assert.rejects(insert(own,'2025-02-03'),/assigned MDE account/);
    await assert.rejects(db.query("SELECT public.outlet_visit_coverage('2020-01-01','2026-12-31')"),/at most one year/);
    await as(unassigned);assert.equal((await report()).length,0);await assert.rejects(insert(own,'2025-02-03'),/assigned MDE account/);
    const inactive=data.outlets.find(row=>row.mdeId===m1&&row.id!==own)!.id;
    await db.exec('RESET ROLE');await db.query('UPDATE public.stores SET is_active=false WHERE id=$1',[inactive]);
    await as(a);await assert.rejects(insert(inactive,'2025-02-03'),/outside your active MDE/);
    await db.exec('RESET ROLE');await db.query('UPDATE public.stores SET is_active=true WHERE id=$1',[inactive]);
    // A single scalar JSON response includes every outlet, above PostgREST's usual 1000-row cap.
    for(const mde of data.mdes){
      await db.exec('RESET ROLE');const actor=crypto.randomUUID();
      await db.query('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,now())',[actor,`${actor}@example.test`]);
      await db.query("INSERT INTO public.profiles(id,email,full_name,role,mde_id) VALUES($1,$2,'Coverage fixture','sales',$3)",[actor,`${actor}@example.test`,mde.id]);
      await as(actor);await db.query("INSERT INTO public.outlet_visits(store_id,visited_on) SELECT id,'2025-03-01' FROM public.stores WHERE mde_id=$1",[mde.id]);
    }
    await as(admin);const full=(await db.query<{coverage:any[];kind:string}>("SELECT public.outlet_visit_coverage('2025-03-01','2025-03-31') AS coverage,pg_typeof(public.outlet_visit_coverage('2025-03-01','2025-03-31'))::text AS kind")).rows[0];
    assert.equal(full.kind,'jsonb');assert.equal(full.coverage.length,1178);
    await db.exec('RESET ROLE; SET ROLE anon');await assert.rejects(db.query('SELECT * FROM public.outlet_visits'),/permission denied/);await assert.rejects(db.query("SELECT public.outlet_visit_coverage('2025-02-01','2025-02-28')"),/permission denied/);
    // A reassignment never credits the new MDE with the former MDE's visits.
    await db.exec('RESET ROLE');await db.query('UPDATE public.stores SET mde_id=$1 WHERE id=$2',[m2,own]);
    await as(a);assert.equal((await report()).length,0);
    await as(b);assert.equal((await db.query('SELECT * FROM public.outlet_visits WHERE store_id=$1',[own])).rows.length,0);await insert(own);
    await as(admin);const transferred=(await report()).filter(row=>row.store_id===own);assert.equal(transferred.length,2);
    // Account deletion preserves audit actors; normal own-store deletion still cascades.
    await db.exec('RESET ROLE');await db.query('DELETE FROM public.profiles WHERE id=$1',[a]);assert.equal((await db.query('SELECT * FROM public.outlet_visits WHERE visited_by=$1',[a])).rows.length,2);
    await db.query('UPDATE public.stores SET mde_id=$1 WHERE id=$2',[m1,own]);await as(sameMde);
    await db.query('SELECT public.app_apply_changes($1::jsonb)',[JSON.stringify([{table:'stores',operation:'delete',ids:[own],expected:{}}])]);
    await db.exec('RESET ROLE');assert.equal((await db.query('SELECT * FROM public.outlet_visits WHERE store_id=$1',[own])).rows.length,0);assert.equal((await db.query('SELECT * FROM public.outlet_visits WHERE store_id=$1',[foreign])).rows.length,2);
  } finally {await db.close();}
});
