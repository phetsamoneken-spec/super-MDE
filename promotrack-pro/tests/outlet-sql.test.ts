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
const scaffold = `CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
CREATE SCHEMA auth; CREATE TABLE auth.users(id UUID PRIMARY KEY, email TEXT, email_confirmed_at TIMESTAMPTZ);
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
// The actual browser RPC must persist, enforce versions, and roll back batches.
const category = crypto.randomUUID();
const apply = (changes: unknown[]) => db.query('SELECT public.app_apply_changes($1::jsonb)', [JSON.stringify(changes)]);
await apply([{table:'sub_channels',operation:'upsert',rows:[{id:category,name:'RPC verification',channel_id:existingChannelId}]}]);
const version=(await db.query<{updated_at:string}>('SELECT updated_at::text FROM public.sub_channels WHERE id=$1',[category])).rows[0].updated_at;
await apply([{table:'sub_channels',operation:'upsert',rows:[{id:category,name:'RPC updated',channel_id:existingChannelId}],expected:{[category]:version}}]);
await assert.rejects(()=>apply([{table:'sub_channels',operation:'delete',ids:[category],expected:{[category]:'2000-01-01T00:00:00Z'}}]), /changed on another device/);
await assert.rejects(()=>apply([{table:'sub_channels',operation:'upsert',rows:[{id:category,name:'Must roll back',channel_id:existingChannelId}]},{table:'app_admin_allowlist',operation:'delete',ids:[category]}]), /Unsupported table/);
assert.equal((await db.query<{name:string}>('SELECT name FROM public.sub_channels WHERE id=$1',[category])).rows[0].name,'RPC updated');
await apply([{table:'sub_channels',operation:'delete',ids:[category]}]);
const launchId=crypto.randomUUID(), orderId=crypto.randomUUID(), taskId=crypto.randomUUID();
const ownOutlet=data.outlets.find(o=>o.mdeId===data.mdes[0].id)!;
await apply([{table:'new_products',operation:'upsert',rows:[{id:launchId,product_name:'Test launch',sku:'test',category:'test',launch_date:'2026-11-07',pack_size:'1',unit_price:1,target_distribution_rate:50,target_units_per_store:1,status:'Active',created_by:ids[0]}]},
{table:'new_product_store_orders',operation:'upsert',rows:[{id:orderId,product_id:launchId,store_id:ownOutlet.id,order_status:'Not Ordered'}]},
{table:'follow_up_tasks',operation:'upsert',rows:[{id:taskId,product_id:launchId,store_id:ownOutlet.id,mde_id:data.mdes[0].id,task_title:'Test task',due_date:'2026-11-07',priority:'Medium',task_status:'Pending'}]}]);
await asUser(ids[1]);
await apply([{table:'new_product_store_orders',operation:'upsert',rows:[{id:orderId,product_id:launchId,store_id:ownOutlet.id,order_status:'Ordered',updated_by:ids[1]}]},
{table:'follow_up_tasks',operation:'upsert',rows:[{id:taskId,product_id:launchId,store_id:ownOutlet.id,mde_id:data.mdes[0].id,task_title:'Test task',due_date:'2026-11-07',priority:'Medium',task_status:'Completed'}]}]);
assert.equal((await db.query<{order_status:string}>('SELECT order_status FROM public.new_product_store_orders WHERE id=$1',[orderId])).rows[0].order_status,'Ordered');
assert.equal((await db.query<{task_status:string}>('SELECT task_status FROM public.follow_up_tasks WHERE id=$1',[taskId])).rows[0].task_status,'Completed');
const forbiddenTask={id:crypto.randomUUID(),store_id:ownOutlet.id,mde_id:data.mdes[0].id,task_title:'Must not be created by MDE',due_date:'2026-11-09',priority:'Medium',task_status:'Pending'};
await assert.rejects(()=>apply([{table:'follow_up_tasks',operation:'upsert',rows:[forbiddenTask]}]),/row-level security/);
await assert.rejects(()=>db.query("INSERT INTO public.follow_up_tasks(id,store_id,mde_id,task_title,due_date,priority,task_status) VALUES($1,$2,$3,'Forbidden direct insert','2026-11-09','Medium','Pending')",[forbiddenTask.id,ownOutlet.id,data.mdes[0].id]),/row-level security/);
await assert.rejects(()=>apply([{table:'new_product_store_orders',operation:'upsert',rows:[{id:orderId,order_status:'Declined'}]},{table:'follow_up_tasks',operation:'upsert',rows:[forbiddenTask]}]),/row-level security/);
assert.equal((await db.query<{order_status:string}>('SELECT order_status FROM public.new_product_store_orders WHERE id=$1',[orderId])).rows[0].order_status,'Ordered','forbidden task creation rolls back the entire batch');
assert.equal((await db.query('SELECT id FROM public.follow_up_tasks WHERE id=$1',[forbiddenTask.id])).rows.length,0);
await assert.rejects(()=>apply([{table:'sub_channels',operation:'upsert',rows:[{id:category,name:'Forbidden',channel_id:existingChannelId}]}]), /row-level security/);
const count=data.outlets.filter(o=>o.mdeId===data.mdes[0].id).length;assert.equal((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM public.outlet_directory')).rows[0].n,count);
assert.equal((await db.query("UPDATE public.stores SET store_name='not allowed' RETURNING id")).rows.length,0);
await assert.rejects(() => db.query('UPDATE public.profiles SET mde_id=$1 WHERE id=$2', [data.mdes[1].id, ids[1]]), /row-level security/);
await assert.rejects(() => db.query("UPDATE public.profiles SET role='admin' WHERE id=$1", [ids[1]]), /row-level security/);
assert.equal((await db.query("UPDATE public.profiles SET full_name='Own profile edit' WHERE id=$1 RETURNING id", [ids[1]])).rows.length, 1);
await assert.rejects(()=>db.query("INSERT INTO public.mdes(name) VALUES ('not allowed')"),/row-level security/);
await asUser(ids[2]);assert.equal((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM public.outlet_directory')).rows[0].n,0);
await db.exec('RESET ROLE; SET ROLE anon;');assert.equal((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM public.outlet_directory')).rows[0].n,0);
console.log('PASS: Admin sees all; assigned MDE sees '+count+'; unassigned and anonymous see zero; sales cannot modify outlets or MDEs');
await db.exec('RESET ROLE;');
await db.query('INSERT INTO public.app_admin_allowlist(email) VALUES ($1)', ['test-2@example.test']);
await asUser(ids[2]);
await assert.rejects(()=>db.query('SELECT public.ensure_my_profile()'), /verified account/);
await db.exec('RESET ROLE');
await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[ids[2]]);
await asUser(ids[2]); await db.query('SELECT public.ensure_my_profile()');
assert.equal((await db.query<{role:string}>('SELECT role FROM public.profiles WHERE id=$1',[ids[2]])).rows[0].role,'admin');
await asUser(ids[0]);
assert.equal((await db.query<{product_id:string}>('SELECT product_id FROM public.follow_up_tasks WHERE id=$1',[taskId])).rows[0].product_id,launchId);
await apply([{table:'new_products',operation:'delete',ids:[launchId]}]);
assert.equal((await db.query<{product_id:null}>('SELECT product_id FROM public.follow_up_tasks WHERE id=$1',[taskId])).rows[0].product_id,null);
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

test('Admin prepares B1–B7 access; only verified matching emails claim it and each sees its own outlets', { timeout:30000 }, async () => {
 const db=new PGlite({extensions:{'uuid-ossp':uuid_ossp,pgcrypto}});
 try {
  await db.exec(scaffold);await db.exec(fs.readFileSync(root+'/supabase/outlet-fresh-setup.sql','utf8'));
  const admin=crypto.randomUUID();
  await db.query("INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,'owner@example.test',now())",[admin]);
  await db.query("INSERT INTO public.profiles(id,email,full_name,role) VALUES($1,'owner@example.test','Owner','admin')",[admin]);
  async function asUser(id:string){await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('SET ROLE authenticated');}
  for(let i=0;i<7;i++){
   const user=crypto.randomUUID(), email=`b${i+1}@example.test`, mde=data.mdes[i];
   await asUser(admin);
   const result=await db.query<{status:string}>('SELECT public.admin_assign_user($1,$2,$3) AS status',[` ${email.toUpperCase()} `,`B${i+1}`,mde.id]);
   assert.equal(result.rows[0].status,'pending');
   await db.exec('RESET ROLE');await db.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[user,email]);
   await asUser(user);await assert.rejects(()=>db.query('SELECT public.ensure_my_profile()'),/verified account/);
   await db.exec('RESET ROLE');await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[user]);
   await asUser(user);await db.query('SELECT public.ensure_my_profile()');
   const profile=(await db.query<{role:string;mde_id:string}>('SELECT role,mde_id FROM public.profiles WHERE id=$1',[user])).rows[0];
   assert.equal(profile.role,'sales');assert.equal(profile.mde_id,mde.id);
   const visible=await db.query<{mde_id:string}>('SELECT mde_id FROM public.stores');
   assert.equal(visible.rows.length,data.outlets.filter(o=>o.mdeId===mde.id).length);assert(visible.rows.every(row=>row.mde_id===mde.id));
   assert.equal((await db.query('SELECT * FROM public.app_user_assignments')).rows.length,0);
   await assert.rejects(()=>db.query('SELECT public.admin_assign_user($1,$2,$3)',[email,'Hacked',data.mdes[(i+1)%7].id]),/Administrator access/);
   await assert.rejects(()=>db.query('UPDATE public.app_user_assignments SET mde_id=$1',[data.mdes[(i+1)%7].id]),/permission denied/);
   await db.query('SELECT public.ensure_my_profile()');
   assert.equal((await db.query<{mde_id:string}>('SELECT mde_id FROM public.profiles WHERE id=$1',[user])).rows[0].mde_id,mde.id);
   await asUser(admin);
   assert.equal((await db.query<{status:string}>('SELECT public.admin_assign_user($1,$2,$3) AS status',[email,'Updated name',mde.id])).rows[0].status,'assigned');
  }
  await asUser(admin);
  await assert.rejects(()=>db.query('SELECT public.admin_assign_user($1,$2,$3)',['owner@example.test','Downgrade',data.mdes[0].id]),/Admin account/);
  await assert.rejects(()=>db.query('SELECT public.admin_assign_user($1,$2,$3)',['invalid','Name',data.mdes[0].id]),/valid email/);
  await db.exec('RESET ROLE;SET ROLE anon');
  await assert.rejects(()=>db.query('SELECT public.admin_assign_user($1,$2,$3)',['anon@example.test','Anon',data.mdes[0].id]),/permission denied/);
 } finally {await db.close();}
});


test('only service role can provision Admin-created MDE profiles; pending assignment is consumed atomically', {timeout:30000}, async()=>{
 const db=new PGlite({extensions:{'uuid-ossp':uuid_ossp,pgcrypto}});
 try {
  await db.exec(scaffold);await db.exec(fs.readFileSync(root+'/supabase/outlet-fresh-setup.sql','utf8'));
  const id=crypto.randomUUID();const mde=data.mdes[0].id;
  await db.query("INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,'new-mde@example.test',now())",[id]);
  const signature='public.app_provision_mde_account(uuid,text,text,uuid,text)';
  for(const role of ['anon','authenticated'])assert.equal((await db.query<{ok:boolean}>("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,signature])).rows[0].ok,false);
  assert.equal((await db.query<{ok:boolean}>("SELECT has_function_privilege('service_role',$1,'EXECUTE') AS ok",[signature])).rows[0].ok,true);
  await db.query("SELECT public.app_provision_mde_account($1,'new-mde@example.test','MDE name',$2,'data:image/png;base64,AAAA')",[id,mde]);
  const profile=(await db.query<any>('SELECT * FROM public.profiles WHERE id=$1',[id])).rows[0];
  assert.equal(profile.role,'sales');assert.equal(profile.mde_id,mde);assert.equal(profile.full_name,'MDE name');assert.equal(profile.avatar_url,'data:image/png;base64,AAAA');
  await db.query("INSERT INTO public.app_user_assignments(email,full_name,mde_id,created_by) VALUES('new-mde@example.test','Old pending',$1,$2)",[mde,id]);
  await db.query("SELECT public.app_provision_mde_account($1,'new-mde@example.test','MDE name',$2,NULL)",[id,mde]);
  assert.equal((await db.query<{n:number}>("SELECT count(*)::int AS n FROM public.app_user_assignments WHERE email='new-mde@example.test'")).rows[0].n,0);
  await db.query("UPDATE public.profiles SET role='admin' WHERE id=$1",[id]);
  await assert.rejects(db.query("SELECT public.app_provision_mde_account($1,'new-mde@example.test','Changed',$2,NULL)",[id,mde]),/Admin/);
 }finally{await db.close();}
});

test('Sales outlet writes stay in their MDE and store deletion cascades without granting order deletion', {timeout:30000},async()=>{
 const db=new PGlite({extensions:{'uuid-ossp':uuid_ossp,pgcrypto}});
 try{
  await db.exec(scaffold);await db.exec(fs.readFileSync(root+'/supabase/outlet-fresh-setup.sql','utf8'));
  const admin=crypto.randomUUID(),a=crypto.randomUUID(),b=crypto.randomUUID(),unassigned=crypto.randomUUID();
  const m1=data.mdes[0].id,m2=data.mdes[1].id;
  for(const [id,mde,role] of [[admin,null,'admin'],[a,m1,'sales'],[b,m2,'sales'],[unassigned,null,'sales']]){
   await db.query('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,now())',[id,`${id}@example.test`]);
   await db.query('INSERT INTO public.profiles(id,email,full_name,role,mde_id) VALUES($1,$2,$3,$4,$5)',[id,`${id}@example.test`,'Fixture',role,mde]);
  }
  async function as(id:string){await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('SET ROLE authenticated');}
  const store=crypto.randomUUID(),foreign=crypto.randomUUID();
  const row=(id:string,mde:string)=>({id,store_code:id,store_name:'Test own outlet',channel:'On Trade',sub_channel:'Local Restaurant',mde_id:mde,assigned_sales_user:null});
  async function upsert(rows:any[]){return db.query('SELECT public.app_apply_changes($1::jsonb)',[JSON.stringify([{table:'stores',operation:'upsert',rows,expected:{}}])]);}
  await as(a);await upsert([row(store,m1)]);
  await assert.rejects(upsert([row(crypto.randomUUID(),m2)]),/row-level security/);
  await assert.rejects(upsert([{...row(crypto.randomUUID(),m2),assigned_sales_user:a}]),/row-level security/);
  await assert.rejects(upsert([{...row(store,m2)}]));
  await as(b);await upsert([row(foreign,m2)]);
  await as(a);
  await assert.rejects(db.query('SELECT public.app_apply_changes($1::jsonb)',[JSON.stringify([{table:'stores',operation:'delete',ids:[foreign],expected:{}}])]),/could not be saved/);
  await as(unassigned);await assert.rejects(upsert([row(crypto.randomUUID(),m1)]),/row-level security/);
  await as(admin);
  const product=crypto.randomUUID(),order=crypto.randomUUID();
  await db.query("INSERT INTO public.new_products(id,product_name,sku,category,launch_date,pack_size,unit_price,target_distribution_rate,target_units_per_store,created_by,status) VALUES($1,'Test','TEST','Test',current_date,'12',1,1,1,$2,'Active')",[product,admin]);
  await db.query("INSERT INTO public.new_product_store_orders(id,product_id,store_id,order_status) VALUES($1,$2,$3,'Ordered')",[order,product,store]);
  await as(a);
  assert.equal((await db.query('DELETE FROM public.new_product_store_orders WHERE id=$1 RETURNING id',[order])).rows.length,0);
  await db.query('SELECT public.app_apply_changes($1::jsonb)',[JSON.stringify([{table:'stores',operation:'delete',ids:[store],expected:{}}])]);
  await db.exec('RESET ROLE');
  assert.equal((await db.query('SELECT id FROM public.new_product_store_orders WHERE id=$1',[order])).rows.length,0);
  assert.equal((await db.query('SELECT id FROM public.stores WHERE id=$1',[foreign])).rows.length,1);
 }finally{await db.close();}
});
