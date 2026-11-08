import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campaignMdeStores, storeMdeId } from '../src/utils/campaignMde';
import type { Store,UserProfile } from '../src/types';
test('Campaign MDE scopes use current outlet ownership and cannot widen a Sales account',()=>{
  const admin={id:'admin',role:'admin'} as UserProfile,sales={id:'sales',role:'sales',mdeId:'b1'} as UserProfile;
  const stores=[{id:'one',mdeId:'b1',assignedSalesUser:'old'},{id:'two',mdeId:'b2',assignedSalesUser:'sales'},{id:'legacy',assignedSalesUser:'sales'},{id:'unassigned',assignedSalesUser:''}] as Store[];
  assert.equal(storeMdeId(stores[0],[sales]),'b1');assert.equal(storeMdeId(stores[2],[sales]),'b1');
  assert.deepEqual(campaignMdeStores(stores,admin,'b1',[sales]).map(s=>s.id),['one','legacy']);
  assert.deepEqual(campaignMdeStores(stores,admin,'b2',[sales]).map(s=>s.id),['two']);
  assert.deepEqual(campaignMdeStores(stores,admin,'b7',[sales]),[]);assert.equal(campaignMdeStores(stores,admin,'all',[sales]).length,4);
  assert.deepEqual(campaignMdeStores(stores,sales,'b2',[sales]).map(s=>s.id),['one','legacy']);
  assert.deepEqual(campaignMdeStores(stores,sales,'all',[sales]).map(s=>s.id),['one','legacy']);
  assert.equal(stores[1].mdeId,'b2');
});
