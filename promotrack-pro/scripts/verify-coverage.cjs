// Local browser regression checks. All signed-in business requests and media are fixtures.
// No real credentials or production business writes are used.
// npm run preview -- --host 0.0.0.0 --port 4176 --strictPort --base=/super-MDE/
// NODE_PATH=/path/to/playwright/node_modules node scripts/verify-coverage.cjs
const {chromium}=require('playwright-core');
const fs=require('fs'),assert=require('assert/strict');
const screenshots=process.env.SCREENSHOT_DIR||'/tmp/super-mde-coverage';fs.mkdirSync(screenshots,{recursive:true});
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],...((process.env.HTTPS_PROXY||process.env.HTTP_PROXY)?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY,bypass:'127.0.0.1,localhost'}}:{})});
try{
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
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
await page.evaluate(t=>{localStorage.setItem('sb-olvteqslbxwzifdfueug-auth-token',JSON.stringify(t));localStorage.setItem('promotrack_lang','en');},token);
await page.reload();await page.locator('aside').waitFor();await page.getByText('Connected to Supabase',{exact:true}).waitFor();



const coverage=()=>page.locator('.coverage-page');
const metric=index=>page.locator('.coverage-metrics > div').nth(index).locator('strong');
await page.getByRole('button',{name:'Open visit coverage',exact:true}).click();await coverage().getByRole('heading',{name:'Outlet visit coverage',exact:true}).waitFor();await page.getByText('Loading coverage…',{exact:true}).waitFor({state:'hidden'});
assert.equal(await page.getByRole('button',{name:'Monthly',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await metric(0).textContent(),'3');assert.equal(await metric(2).textContent(),'1');assert.equal(await metric(3).textContent(),'33.3%');
assert.equal(await page.getByRole('button',{name:'Visit date / note',exact:true}).count(),0,'Admin reads all MDEs without impersonating a visiting MDE');
assert.equal(await page.getByRole('region',{name:'MDE overview',exact:true}).locator('.coverage-mde-card').count(),2);
await page.screenshot({path:screenshots+'/coverage-admin-desktop.png',fullPage:true});for(const width of [390,320]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:screenshots+`/coverage-admin-${width}.png`,fullPage:true});}await page.setViewportSize({width:1440,height:1000});
await page.getByLabel('MDE',{exact:true}).selectOption(secondMde);assert.equal(await metric(0).textContent(),'1');assert.equal(await metric(2).textContent(),'0');assert.equal(await page.locator('.coverage-store-card').count(),1);
await page.getByLabel('MDE',{exact:true}).selectOption('all');await page.getByRole('searchbox',{name:'Search coverage outlets',exact:true}).fill('TEST-001');assert.equal(await page.locator('.coverage-store-card').count(),1);assert.equal(await metric(3).textContent(),'33.3%');await page.getByRole('searchbox',{name:'Search coverage outlets',exact:true}).fill('');
const first=page.locator(`[data-store-id="${store1.id}"]`);await first.getByRole('button',{name:'Campaign details',exact:true}).click();await first.getByRole('button',{name:/November promotion/}).waitFor();await first.getByRole('button',{name:/Tea launch/}).click();await page.locator('.purchase-outlet-card').first().waitFor();assert.equal(await page.locator('.purchase-outlet-card').count(),1,'product link focuses the original outlet and product');
// Switch to an MDE profile; only its current active outlets and visits are visible.
profile.role='sales';profile.mde_id=store1.mde_id;profile.full_name='MDE B1';await page.reload();await page.getByRole('button',{name:'Open visit coverage',exact:true}).click();await page.getByText('Loading coverage…',{exact:true}).waitFor({state:'hidden'});
assert.equal(await metric(0).textContent(),'2');assert.equal(await metric(3).textContent(),'50%');assert.equal(await page.locator(`[data-store-id="${foreignStore.id}"]`).count(),0);assert.equal(await page.getByLabel('MDE',{exact:true}).count(),0);
const own=()=>page.locator(`[data-store-id="${store2.id}"]`);await own().getByRole('button',{name:'Visit date / note',exact:true}).click();const form=page.getByRole('dialog',{name:'Record outlet visit',exact:true});await form.waitFor();assert.equal(await form.locator('.app-date-validation').inputValue(),today);await form.getByLabel('Note (optional)',{exact:true}).fill('Checked display and promotion materials');await form.getByRole('button',{name:'Confirm visit',exact:true}).click();await form.waitFor({state:'hidden'});await page.getByText('Loading coverage…',{exact:true}).waitFor({state:'hidden'});assert.equal(await metric(3).textContent(),'100%');assert(await own().evaluate(e=>e.classList.contains('is-visited')));
await page.reload();await page.getByRole('button',{name:'Open visit coverage',exact:true}).click();await page.getByText('Loading coverage…',{exact:true}).waitFor({state:'hidden'});assert.equal(await metric(3).textContent(),'100%','visit persists after reload');
await own().getByRole('button',{name:'Visit date / note',exact:true}).click();await form.getByRole('button',{name:'Confirm visit',exact:true}).click();await form.getByRole('alert').waitFor();assert((await form.getByRole('alert').textContent()).includes('already recorded'));await form.getByRole('button',{name:'Cancel',exact:true}).click();
await own().getByRole('button',{name:'History',exact:true}).click();const history=page.getByRole('dialog',{name:'Visit history',exact:true});await history.getByText('Checked display and promotion materials',{exact:true}).waitFor();await history.getByRole('button',{name:'Edit note',exact:true}).click();await history.getByLabel('Note',{exact:true}).fill('Verified stock');await history.getByRole('button',{name:'Save note',exact:true}).click();await history.getByText('Verified stock',{exact:true}).waitFor();
await history.getByRole('button',{name:'Edit note',exact:true}).click();await history.getByLabel('Note',{exact:true}).fill('Must not overwrite newer note');forceConflict=true;await history.getByRole('button',{name:'Save note',exact:true}).click();await history.getByRole('alert').waitFor();assert.equal(visits.find(v=>v.store_id===store2.id).note,'Verified stock');forceConflict=false;await history.getByRole('button',{name:'Cancel',exact:true}).click();
await history.getByRole('button',{name:'Delete visit',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),1);await history.getByRole('button',{name:'Confirm delete',exact:true}).click();await history.getByText('No visits have been recorded.',{exact:true}).waitFor();await history.getByRole('button',{name:'Close',exact:true}).click();await page.getByText('Loading coverage…',{exact:true}).waitFor({state:'hidden'});assert.equal(await metric(3).textContent(),'50%');
// Toggle preserves past months, uses server-confirmed color, and protects other actors.
const priorDate=new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7))-1,0)).toISOString().slice(0,10);
visits.push({...visits[0],id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9',store_id:store2.id,visited_by:id,visited_on:priorDate,note:'Preserve previous month'});
const beforeOrder=await page.locator('.coverage-store-card').evaluateAll(cards=>cards.map(card=>card.dataset.storeId));
const beforeToggleWrites=visitWrites;
await own().getByRole('button',{name:'Mark visited: Browser fixture outlet 2',exact:true}).evaluate(button=>{button.click();button.click();});
await page.waitForFunction(()=>document.querySelectorAll('.coverage-metrics strong')[3]?.textContent==='100%');
assert.equal(visitWrites,beforeToggleWrites+1,'rapid double click must make one write');assert.equal(await page.getByRole('dialog').count(),0);
assert.deepEqual(await page.locator('.coverage-store-card').evaluateAll(cards=>cards.map(card=>card.dataset.storeId)),beforeOrder,'toggling must not move outlet rows');
await page.setViewportSize({width:390,height:844});await page.screenshot({path:screenshots+'/coverage-toggle-visited.png',fullPage:true});
await own().getByRole('button',{name:'Mark not visited: Browser fixture outlet 2',exact:true}).press('Enter');
await page.waitForFunction(()=>document.querySelectorAll('.coverage-metrics strong')[3]?.textContent==='50%');
assert(visits.some(v=>v.store_id===store2.id&&v.visited_on===priorDate));assert(!visits.some(v=>v.store_id===store2.id&&v.visited_on>=firstDay));
await page.screenshot({path:screenshots+'/coverage-toggle-pending.png',fullPage:true});
const beforeProtected=visitWrites;
await page.locator(`[data-store-id="${store1.id}"]`).getByRole('button',{name:'Mark not visited: Browser fixture outlet 1',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(visitWrites,beforeProtected);assert.equal(await metric(3).textContent(),'50%');
failVisitWrite=true;await own().getByRole('button',{name:'Mark visited: Browser fixture outlet 2',exact:true}).click();await page.getByText('Temporary test write outage',{exact:true}).waitFor();assert(await own().evaluate(el=>el.classList.contains('is-pending')));assert.equal(await metric(3).textContent(),'50%');
failVisitWrite=false;await own().getByRole('button',{name:'Mark visited: Browser fixture outlet 2',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.coverage-metrics strong')[3]?.textContent==='100%');
if(today!==firstDay)visits.push({...visits.find(v=>v.store_id===store2.id&&v.visited_on===today),id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8',visited_on:firstDay});
await own().getByRole('button',{name:'Mark not visited: Browser fixture outlet 2',exact:true}).press('Space');await page.waitForFunction(()=>document.querySelectorAll('.coverage-metrics strong')[3]?.textContent==='50%');assert(!visits.some(v=>v.store_id===store2.id&&v.visited_on>=firstDay));
console.log('PASS outlet-name toggle: one click green, second click orange, keyboard, rapid-click guard, stable row position, previous-month preservation, clear all own period visits, other-actor protection and failed-write recovery');
const periodResponse=mode=>page.waitForResponse(response=>{if(!response.url().endsWith('/rpc/outlet_visit_coverage'))return false;const body=response.request().postDataJSON();return mode==='day'?body.p_start===today&&body.p_end===today:body.p_start===firstDay&&body.p_end!==body.p_start;});
await Promise.all([periodResponse('day'),page.getByRole('button',{name:'Daily',exact:true}).click()]);await page.waitForFunction(()=>document.querySelectorAll('.coverage-metrics strong')[2]?.textContent==='1');assert.equal(await metric(2).textContent(),'1');
await Promise.all([periodResponse('month'),page.getByRole('button',{name:'Monthly',exact:true}).click()]);await page.waitForFunction(()=>document.querySelectorAll('.coverage-metrics strong')[3]?.textContent==='50%');
const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Excel',exact:true}).click();const download=await downloadPromise;assert(download.suggestedFilename().endsWith('.xlsx'));await download.saveAs(screenshots+'/coverage-export-test.xlsx');const XLSX=require('xlsx');const exported=XLSX.utils.sheet_to_json(XLSX.readFile(screenshots+'/coverage-export-test.xlsx').Sheets.Coverage);assert.equal(exported.length,2);assert.deepEqual(exported.map(row=>row['OUTLET CODE']).sort(),['TEST-001','TEST-002']);assert.equal(exported.find(row=>row['OUTLET CODE']==='TEST-001').VISITS,today===firstDay?1:2);assert.equal(exported.find(row=>row['OUTLET CODE']==='TEST-002').VISITED,'NONE');
for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.evaluate(()=>scrollTo(0,0));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:screenshots+`/coverage-sales-${width}.png`,fullPage:true});}
await page.getByTitle('Switch Language (ພາສາລາວ / English)').click();await page.getByRole('button',{name:'Toggle Theme',exact:true}).click();await page.waitForTimeout(300);assert.equal(await page.locator('.coverage-visit-toggle.is-visited .coverage-store-title').first().evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');await page.screenshot({path:screenshots+'/coverage-lao-dark.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.context().setOffline(true);await page.waitForTimeout(100);assert(await page.getByRole('button',{name:'ວັນທີ / ໝາຍເຫດ',exact:true}).first().isDisabled());await page.context().setOffline(false);await page.waitForTimeout(200);
await page.getByTitle('Switch Language (ພາສາລາວ / English)').click();rpcFails=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await metric(3).textContent(),'—','network failure must not show false zero coverage');rpcFails=false;await page.getByRole('button',{name:'Retry',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.coverage-metrics strong')[3]?.textContent==='50%');assert.equal(await page.getByRole('alert').count(),0);
const unexpected=errors.filter(message=>!/Failed to load resource.*(?:409|500|503)/.test(message));assert.deepEqual(unexpected,[]);assert.equal(writes.length,0);assert(visitWrites>=3);
console.log('PASS Admin all/MDE filtering and campaign details; Sales own stores; monthly distinct denominator independent of search; record/reload/duplicate rejection; history/note concurrency/delete; daily/monthly; Excel download; mobile 320/390 Lao/dark; offline disables writes; failed read shows unknown and retries. All backend writes isolated fixtures.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});