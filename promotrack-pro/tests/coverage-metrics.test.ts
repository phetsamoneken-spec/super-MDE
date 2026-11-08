import { test } from 'node:test';
import assert from 'node:assert/strict';
import { businessToday, campaignSummary, coverageStores, coverageSummary, validVisitDate, visitPeriod } from '../src/utils/coverage';
import type { Store, UserProfile, PromotionStore, NewProductStoreOrder } from '../src/types';
const store=(id:string,mdeId?:string,isActive=true)=>({id,mdeId,isActive,storeName:id,storeCode:id} as Store);
const admin={id:'admin',role:'admin'} as UserProfile;
const sales={id:'sales',role:'sales',mdeId:'B1'} as UserProfile;
test('Coverage is unique current assigned active outlets, not visit count or former assignments',()=>{
  const stores=[store('a','B1'),store('b','B1'),store('c','B2'),store('inactive','B1',false),store('unassigned')];
  const rows=[{storeId:'a',mdeId:'B1',visitCount:5,lastVisitedOn:'2026-11-03'},{storeId:'c',mdeId:'B1',visitCount:1,lastVisitedOn:'2026-11-02'},
    {storeId:'inactive',mdeId:'B1',visitCount:3,lastVisitedOn:'2026-11-02'},{storeId:'unknown',mdeId:'B1',visitCount:1,lastVisitedOn:'2026-11-02'}];
  assert.deepEqual(coverageStores(stores,sales).map(row=>row.id),['a','b']);
  assert.deepEqual(coverageSummary(coverageStores(stores,sales),rows),{total:2,visited:1,pending:1,visits:5,percent:50});
  assert.equal(coverageStores(stores,admin).length,3);
  assert.equal(coverageStores(stores,admin,'B2')[0].id,'c');
  assert.equal(coverageStores(stores,{...sales,mdeId:undefined}).length,0);
  assert.equal(coverageSummary([],rows).percent,0);
});
test('Monthly and daily boundaries are inclusive, calendar-correct, and use Bangkok business days',()=>{
  assert.deepEqual(visitPeriod('month','2024-02'),{start:'2024-02-01',end:'2024-02-29'});
  assert.deepEqual(visitPeriod('month','2025-02'),{start:'2025-02-01',end:'2025-02-28'});
  assert.deepEqual(visitPeriod('day','2026-11-08'),{start:'2026-11-08',end:'2026-11-08'});
  assert.equal(validVisitDate('2025-02-29'),false);assert.equal(validVisitDate('invalid'),false);
  assert.throws(()=>visitPeriod('month','2026-13'));
  assert.equal(businessToday(new Date('2026-11-08T16:59:59Z')),'2026-11-08');
  assert.equal(businessToday(new Date('2026-11-08T17:00:00Z')),'2026-11-09');
});
test('Promotion and new-product numbers stay inside the selected outlet/MDE scope',()=>{
  const promos=[{storeId:'a',orderStatus:'Ordered'},{storeId:'b',orderStatus:'Not Ordered'},{storeId:'foreign',orderStatus:'Ordered'}] as PromotionStore[];
  const products=[{storeId:'a',orderStatus:'Sample Provided'},{storeId:'a',orderStatus:'Ordered'},{storeId:'foreign',orderStatus:'Ordered'}] as NewProductStoreOrder[];
  assert.deepEqual(campaignSummary([store('a','B1'),store('b','B1')],promos,products),{promotions:{total:2,ordered:1},products:{total:2,ordered:1}});
});
