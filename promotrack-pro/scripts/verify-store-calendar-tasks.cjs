// Local browser regression checks. All signed-in business requests and media are fixtures.
// No real credentials or production business writes are used.
// npm run preview -- --host 0.0.0.0 --port 4176 --strictPort --base=/super-MDE/
// NODE_PATH=/path/to/playwright/node_modules node scripts/verify-store-calendar-tasks.cjs
const {chromium}=require('playwright-core');
const fs=require('fs'),assert=require('assert/strict');
const screenshots=process.env.SCREENSHOT_DIR||'/tmp/super-mde-calendar';fs.mkdirSync(screenshots,{recursive:true});
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],...((process.env.HTTPS_PROXY||process.env.HTTP_PROXY)?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY,bypass:'127.0.0.1,localhost'}}:{})});
try{
const page=await browser.newPage({locale:'th-TH',timezoneId:'Asia/Bangkok',viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto(process.env.BASE_URL||'http://localhost:4176/super-MDE/');await page.locator('input[type=email]').waitFor();
assert.equal(await page.locator('input[type=email]').count(),1);
assert.equal(await page.locator('aside').count(),0);
await page.screenshot({path:screenshots+'/supabase-signin.png'});
console.log('PASS real app unsigned session shows email/password form, no demo access');
const fixture={"mdes": [{"id": "77777777-7777-4777-8777-777777777777", "name": "B1 Test MDE"}], "channels": [], "sub_channels": [], "stores": [{"id": "88888888-8888-4888-8888-888888888881", "store_code": "TEST-001", "store_name": "Browser fixture outlet 1", "channel": "ON TRADE", "sub_channel": "Local Restaurant", "mde_id": "77777777-7777-4777-8777-777777777777", "is_active": true, "province": "Test province"}, {"id": "88888888-8888-4888-8888-888888888882", "store_code": "TEST-002", "store_name": "Browser fixture outlet 2", "channel": "ON TRADE", "sub_channel": "Local Restaurant", "mde_id": "77777777-7777-4777-8777-777777777777", "is_active": true, "province": "Test province"}]};
const id='11111111-1111-4111-8111-111111111111';const profile={id,email:'browser-test@example.invalid',full_name:'Browser Test Admin',role:'admin',mde_id:null,avatar_url:'https://media.example.invalid/profile.svg',updated_at:new Date().toISOString()};
fixture.profiles=[profile];for(const t of ['promotions','new_products','promotion_stores','new_product_store_orders','follow_up_tasks','order_status_history'])fixture[t]=[];
const a='22222222-2222-4222-8222-222222222222', b='44444444-4444-4444-8444-444444444444', promo='99999999-9999-4999-8999-999999999999';
const store1=fixture.stores[0],store2=fixture.stores.find(s=>s.mde_id===store1.mde_id&&s.id!==store1.id);
const baseProduct={sku:'TEST',category:'Test',launch_date:'2026-11-01',pack_size:'12 units',unit_price:10000,target_distribution_rate:50,target_units_per_store:12,description:'',status:'Active',target_sub_channels:[],created_by:id,created_at:'2026-11-07T00:00:00Z'};
fixture.new_products=[{...baseProduct,id:a,product_name:'Tea launch',image_url:'https://media.example.invalid/tea.svg'},{...baseProduct,id:b,product_name:'Juice launch',image_url:''}];
fixture.promotions=[{id:promo,promotion_name:'November promotion',description:'Test only',start_date:'2026-11-01',end_date:'2026-11-30',image_url:'https://media.example.invalid/promo.svg',status:'Active',created_by:id,created_at:'2026-11-07T00:00:00Z'}];
fixture.new_product_store_orders=[{id:'33333333-3333-4333-8333-333333333331',product_id:a,store_id:store1.id,order_status:'Not Ordered',order_quantity:12,order_amount:120000,order_date:'2026-11-07T00:00:00Z'}, {id:'33333333-3333-4333-8333-333333333332',product_id:b,store_id:store1.id,order_status:'Not Ordered'}, {id:'33333333-3333-4333-8333-333333333333',product_id:a,store_id:store2.id,order_status:'Ordered',order_quantity:99,order_amount:990000}];
const baseTask={store_id:store1.id,assigned_user:id,due_date:'2026-11-10T00:00:00Z',priority:'High',task_status:'Pending'};
fixture.follow_up_tasks=[{...baseTask,id:'55555555-5555-4555-8555-555555555551',task_title:'Linked tea follow-up',product_id:a},{...baseTask,id:'55555555-5555-4555-8555-555555555552',task_title:'General store visit'}];
await page.route('https://media.example.invalid/profile.svg',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="400"><rect width="200" height="400" fill="#e1c373"/><rect width="200" height="30" fill="#cc3311"/><rect y="370" width="200" height="30" fill="#1144bb"/><text x="16" y="205" font-size="24">FULL PHOTO</text></svg>'}));
await page.route('https://media.example.invalid/**',route=>route.request().url().includes('profile.svg')?route.fallback():route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="400" height="240" fill="#90cfb1"/><text x="100" y="130" font-size="32">Test image</text></svg>'}));
const user={id,email:profile.email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};
const token={access_token:'mock-browser-session',refresh_token:'mock-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user};
const writes=[];
await page.route('https://olvteqslbxwzifdfueug.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url());let result;
 if(url.pathname==='/auth/v1/user')result=user;
 else if(url.pathname==='/rest/v1/rpc/ensure_my_profile')result=profile;
 else if(url.pathname==='/rest/v1/rpc/app_apply_changes'){
 const {changes}=req.postDataJSON();writes.push(changes);
 for(const c of changes){if(c.operation==='delete')fixture[c.table]=fixture[c.table].filter(r=>!c.ids.includes(r.id));else for(const row of c.rows){const i=fixture[c.table].findIndex(r=>r.id===row.id);const updated={...row,updated_at:new Date().toISOString()};if(i<0)fixture[c.table].push(updated);else fixture[c.table][i]={...fixture[c.table][i],...updated};}}
 result={applied:changes.reduce((n,c)=>n+(c.rows||c.ids).length,0)};
 }else if(url.pathname.startsWith('/rest/v1/')){const table=url.pathname.split('/').pop();const start=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||500);result=(fixture[table]||[]).slice().sort((a,b)=>a.id.localeCompare(b.id)).slice(start,start+limit);}
 else if(url.pathname.startsWith('/storage/v1/object/public/')) return route.continue();
 else throw Error('Unexpected mock request '+url.pathname);
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
});

const secondMde='77777777-7777-4777-8777-777777777778';fixture.mdes.push({id:secondMde,name:'B2 Test MDE'});
const foreignStore={...store1,id:'88888888-8888-4888-8888-888888888883',store_code:'TEST-003',store_name:'Foreign outlet',mde_id:secondMde};fixture.stores.push(foreignStore);
fixture.promotion_stores=[{id:'66666666-6666-4666-8666-666666666661',store_id:store1.id,promotion_id:promo,order_status:'Ordered'},{id:'66666666-6666-4666-8666-666666666662',store_id:foreignStore.id,promotion_id:promo,order_status:'Not Ordered'}];
fixture.new_product_store_orders.push({id:'33333333-3333-4333-8333-333333333334',product_id:b,store_id:foreignStore.id,order_status:'Ordered'});
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const firstDay=today.slice(0,7)+'-01';
let visits=[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',store_id:store1.id,mde_id:store1.mde_id,visited_by:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',visited_on:today,note:'Existing visit',created_at:new Date().toISOString(),updated_at:new Date().toISOString()}];
if(today!==firstDay)visits.push({...visits[0],id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',visited_on:firstDay,note:'Earlier visit'});
let visitWrites=0,rpcFails=false,forceConflict=false,failVisitWrite=false;
const allowed=()=>visits.filter(v=>profile.role==='admin'||(v.mde_id===profile.mde_id&&fixture.stores.find(s=>s.id===v.store_id)?.mde_id===profile.mde_id));
await page.route('https://olvteqslbxwzifdfueug.supabase.co/rest/v1/rpc/outlet_visit_coverage',async route=>{
 if(rpcFails)return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({code:'XX000',message:'Temporary test outage'})});
 const {p_start,p_end}=route.request().postDataJSON();const grouped=new Map();for(const v of allowed().filter(v=>v.visited_on>=p_start&&v.visited_on<=p_end)){const key=v.store_id+v.mde_id;const old=grouped.get(key);grouped.set(key,{store_id:v.store_id,mde_id:v.mde_id,visit_count:(old?.visit_count||0)+1,last_visited_on:old&&old.last_visited_on>v.visited_on?old.last_visited_on:v.visited_on});}
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([...grouped.values()])});
});
await page.route('https://olvteqslbxwzifdfueug.supabase.co/rest/v1/outlet_visits*',async route=>{
 const request=route.request(),url=new URL(request.url()),method=request.method();let result=allowed();
 for(const name of ['store_id','mde_id','visited_by','id','updated_at']){const eq=url.searchParams.get(name);if(eq?.startsWith('eq.'))result=result.filter(v=>v[name]===eq.slice(3));}
 const lower=url.searchParams.getAll('visited_on').find(v=>v.startsWith('gte.'))?.slice(4),upper=url.searchParams.getAll('visited_on').find(v=>v.startsWith('lte.'))?.slice(4);if(lower)result=result.filter(v=>v.visited_on>=lower);if(upper)result=result.filter(v=>v.visited_on<=upper);
 if(method==='GET'){const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||20);result=result.slice().sort((a,b)=>b.visited_on.localeCompare(a.visited_on)||a.id.localeCompare(b.id)).slice(offset,offset+limit);}
 if(method==='POST'){
  if(failVisitWrite)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Temporary test write outage'})});
  const payload=request.postDataJSON(),body=Array.isArray(payload)?payload[0]:payload;const store=fixture.stores.find(s=>s.id===body.store_id);
  assert.equal(profile.role,'sales');assert.equal(store.mde_id,profile.mde_id);assert.equal(body.mde_id,undefined);assert.equal(body.visited_by,undefined);
  if(visits.some(v=>v.store_id===body.store_id&&v.mde_id===profile.mde_id&&v.visited_on===body.visited_on))return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({code:'23505',message:'Duplicate visit'})});
  result={...body,id:'cccccccc-cccc-4ccc-8ccc-'+String(visitWrites+1).padStart(12,'0'),mde_id:profile.mde_id,visited_by:id,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};visits.push(result);visitWrites++;
 }
 if(method==='PATCH'){
  const body=request.postDataJSON();assert.deepEqual(Object.keys(body),['note']);result=result.filter(v=>v.visited_by===id);
  if(forceConflict||!result.length)result=null;else{result[0].note=body.note;result[0].updated_at=new Date().toISOString();result=result[0];visitWrites++;}
 }
 if(method==='DELETE'){result=result.filter(v=>v.visited_by===id);visits=visits.filter(v=>!result.some(row=>row.id===v.id));visitWrites++;result=result.map(v=>({id:v.id}));}
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
});

const chanA='dddddddd-dddd-4ddd-8ddd-ddddddddddd1',chanB='dddddddd-dddd-4ddd-8ddd-ddddddddddd2';
fixture.channels=[{id:chanA,name:'Traditional On Trade'},{id:chanB,name:'Modern Trade'}];fixture.sub_channels=[{id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',channel_id:chanA,name:'Grill'},{id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',channel_id:chanA,name:'Local Restaurant'},{id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3',channel_id:chanB,name:'Supermarket'}];
fixture.stores.forEach(store=>{store.channel='Traditional On Trade';store.sub_channel='Grill';});
await page.evaluate(t=>{localStorage.setItem('sb-olvteqslbxwzifdfueug-auth-token',JSON.stringify(t));localStorage.setItem('promotrack_lang','en');},token);await page.reload();await page.locator('aside').waitFor();
assert.equal(await page.getByRole('button',{name:'Add Task',exact:true}).count(),1);
await page.locator('aside').getByRole('button',{name:'Stores',exact:true}).click();await page.getByRole('button',{name:'Add New Store',exact:true}).click();
const sub=page.getByRole('combobox',{name:'Sub Channel',exact:true}),channel=page.getByRole('combobox',{name:'Channel',exact:true});assert.equal(await sub.evaluate(el=>el.tagName),'SELECT');assert.deepEqual(await sub.locator('option').allTextContents(),['Select Sub-channel','Grill','Local Restaurant']);await channel.selectOption('Modern Trade');assert.deepEqual(await sub.locator('option').allTextContents(),['Select Sub-channel','Supermarket']);assert.equal(await sub.inputValue(),'Supermarket');await channel.selectOption('Traditional On Trade');await sub.selectOption('Local Restaurant');
await page.setViewportSize({width:390,height:844});await page.screenshot({path:screenshots+'/subchannel-dropdown-mobile.png',fullPage:true});await page.getByPlaceholder('e.g. STR-VTE-099').fill('DROPDOWN-TEST');await page.getByPlaceholder('Outlet name',{exact:true}).fill('Dropdown fixture');await page.locator('form').getByRole('button',{name:'Save Store',exact:true}).click();await page.locator('.sync-activity').waitFor({state:'hidden'});await page.waitForFunction(()=>!document.querySelector('form'));assert(fixture.stores.some(store=>store.store_code==='DROPDOWN-TEST'&&store.sub_channel==='Local Restaurant'));
await page.setViewportSize({width:1440,height:1000});await page.locator('aside').getByRole('button',{name:'To-Do List',exact:true}).click();await page.getByRole('button',{name:'New Task',exact:true}).click();await page.getByPlaceholder('e.g. Bring promo POSM materials & check stock').fill('Admin assigned calendar task');await page.getByRole('combobox',{name:'Retail Store',exact:true}).selectOption(store1.id);
await page.getByRole('button',{name:'Due Date',exact:true}).click();let picker=page.getByRole('dialog',{name:'ເລືອກວັນທີ',exact:true});await picker.waitFor();assert.equal(await page.locator('input[type=date],input[type=month]').count(),0);assert.equal(await picker.getByRole('button',{name:'ລ້າງ',exact:true}).count(),0);
const months=['ມັງກອນ','ກຸມພາ','ມີນາ','ເມສາ','ພຶດສະພາ','ມິຖຸນາ','ກໍລະກົດ','ສິງຫາ','ກັນຍາ','ຕຸລາ','ພະຈິກ','ທັນວາ'];const [year,month,day]=today.split('-').map(Number);
await picker.getByRole('combobox',{name:'ປີ',exact:true}).selectOption(String(year));await picker.getByRole('combobox',{name:'ເດືອນ',exact:true}).selectOption(String(month-1));await page.setViewportSize({width:390,height:844});await page.screenshot({path:screenshots+'/lao-calendar-task-mobile.png'});assert(!/ตั้งเดือน|ยกเลิก|พฤศจิกายน/.test(await picker.textContent()));await picker.getByRole('button',{name:`${day} ${months[month-1]} ${year}`,exact:true}).click();assert.equal(await page.locator('form .app-date-validation').inputValue(),today);
await page.locator('form').getByRole('button',{name:'Save task',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('form'));await page.locator('.sync-activity').waitFor({state:'hidden'});const created=fixture.follow_up_tasks.find(task=>task.task_title==='Admin assigned calendar task');assert(created);assert.equal(created.mde_id,store1.mde_id);assert.equal(created.due_date.slice(0,10),today);
profile.role='sales';profile.mde_id=store1.mde_id;profile.full_name='MDE B1';await page.reload();await page.getByRole('button',{name:'Open visit coverage',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Add Task',exact:true}).count(),0);
await page.setViewportSize({width:1440,height:1000});await page.locator('aside').getByRole('button',{name:'To-Do List',exact:true}).click();assert.equal(await page.getByRole('button',{name:'New Task',exact:true}).count(),0);const taskCard=page.locator('.calm-card').filter({has:page.getByText('Admin assigned calendar task',{exact:true})}).last();await taskCard.getByTitle('Mark Done',{exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.sync-activity'));assert.equal(fixture.follow_up_tasks.find(task=>task.id===created.id).task_status,'Completed');
await page.locator('aside').getByRole('button',{name:'Visit Coverage',exact:true}).click();await page.getByText('Loading coverage…',{exact:true}).waitFor({state:'hidden'});await page.getByRole('button',{name:'Period',exact:true}).click();const monthPicker=page.getByRole('dialog',{name:'ເລືອກເດືອນ',exact:true});await monthPicker.waitFor();assert.equal(await monthPicker.getByRole('button',{name:months[month-1],exact:true}).getAttribute('aria-pressed'),'true');await page.setViewportSize({width:390,height:844});await page.screenshot({path:screenshots+'/lao-month-picker-mobile.png'});
const previous=new Date(Date.UTC(year,month-2,1));await monthPicker.getByRole('combobox',{name:'ປີ',exact:true}).selectOption(String(previous.getUTCFullYear()));await monthPicker.getByRole('button',{name:months[previous.getUTCMonth()],exact:true}).click();assert.equal(await page.locator('.coverage-filters .app-date-validation').inputValue(),`${previous.getUTCFullYear()}-${String(previous.getUTCMonth()+1).padStart(2,'0')}`);
await page.getByRole('button',{name:'Period',exact:true}).click();await monthPicker.getByRole('combobox',{name:'ປີ',exact:true}).selectOption(String(year));await monthPicker.getByRole('button',{name:months[month-1],exact:true}).click();await page.getByRole('button',{name:'Daily',exact:true}).click();await page.getByRole('button',{name:'Period',exact:true}).click();await picker.waitFor();assert(await picker.getByRole('button',{name:'ເດືອນຖັດໄປ',exact:true}).isDisabled());for(const button of await picker.locator('.app-calendar-days button').all()){const date=await button.getAttribute('data-date');if(date>today)assert(await button.isDisabled());}
await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);await page.getByRole('button',{name:'Monthly',exact:true}).click();await page.getByText('Loading coverage…',{exact:true}).waitFor({state:'hidden'});
await page.locator(`[data-store-id="${store2.id}"]`).getByRole('button',{name:'Visit date / note',exact:true}).click();const visit=page.getByRole('dialog',{name:'Record outlet visit',exact:true});await visit.waitFor();await visit.getByRole('button',{name:'Visit date',exact:true}).click();await picker.waitFor();await page.setViewportSize({width:320,height:568});await page.screenshot({path:screenshots+'/lao-calendar-nested-320.png'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.keyboard.press('Escape');await visit.waitFor();assert.equal(await page.locator('dialog[open]').count(),0,'Escape closes only the calendar');await visit.getByRole('button',{name:'Cancel',exact:true}).click();
await page.getByRole('button',{name:'Toggle Theme',exact:true}).click();await page.getByRole('button',{name:'Period',exact:true}).click();await monthPicker.waitFor();await page.screenshot({path:screenshots+'/lao-calendar-dark-320.png'});await page.keyboard.press('Escape');
const unexpected=errors.filter(message=>!/Failed to load resource.*(?:409|500|503)/.test(message));assert.deepEqual(unexpected,[]);console.log('PASS Sub-channel select and channel filtering/persistence; calendar stays Lao under Thai browser locale, ISO values, months/days, max limits, required fields, 320/390 and dark/nested dialogs; Admin creates assigned work, MDE has no creation buttons and can complete assigned work. All backend writes isolated fixtures.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
