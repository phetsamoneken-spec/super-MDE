import type { Store, UserProfile } from '../types';

export function storeMdeId(store:Store,users:UserProfile[]=[]){
  return store.mdeId||users.find(user=>user.id===store.assignedSalesUser)?.mdeId||store.assignedSalesUser||'';
}
export function campaignMdeStores(stores:Store[],user:UserProfile,selected='all',users:UserProfile[]=[]){
  const target=user.role==='admin'?selected:user.mdeId||user.id;
  if(target==='all')return stores;
  const assignments=new Map(users.map(profile=>[profile.id,profile.mdeId||profile.id]));
  return stores.filter(store=>(store.mdeId||assignments.get(store.assignedSalesUser)||store.assignedSalesUser)===target);
}
