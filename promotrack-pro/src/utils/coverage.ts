import type { Store, UserProfile, PromotionStore, NewProductStoreOrder } from '../types';
import type { OutletCoverage, VisitPeriod } from '../types/coverage';

export function businessToday(now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part=(type:string)=>parts.find(item=>item.type===type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function validVisitDate(date:string) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
  const value=new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(value.getTime())&&value.toISOString().slice(0,10)===date;
}
export function visitPeriod(mode:'month'|'day',value:string):VisitPeriod {
  if(mode==='day') {if(!validVisitDate(value))throw new Error('Invalid reporting date');return {start:value,end:value};}
  if(!/^\d{4}-\d{2}$/.test(value)||!validVisitDate(value+'-01'))throw new Error('Invalid reporting month');
  const [year,month]=value.split('-').map(Number);
  return {start:value+'-01',end:`${value}-${String(new Date(Date.UTC(year,month,0)).getUTCDate()).padStart(2,'0')}`};
}
export function coverageStores(stores:Store[],user:UserProfile,mdeId='all') {
  return stores.filter(store=>store.isActive!==false&&!!store.mdeId
    &&(user.role==='admin'?(mdeId==='all'||store.mdeId===mdeId):!!user.mdeId&&store.mdeId===user.mdeId));
}
export function coverageSummary(stores:Store[],rows:OutletCoverage[]) {
  const scope=new Map(stores.map(store=>[store.id,store.mdeId]));
  const visited=new Set<string>();let visits=0;
  for(const row of rows)if(scope.has(row.storeId)&&scope.get(row.storeId)===row.mdeId&&row.visitCount>0){visited.add(row.storeId);visits+=row.visitCount;}
  return {total:stores.length,visited:visited.size,pending:stores.length-visited.size,visits,percent:stores.length?Math.round(visited.size/stores.length*1000)/10:0};
}
export function campaignSummary(stores:Store[],promos:PromotionStore[],products:NewProductStoreOrder[]) {
  const scope=new Set(stores.map(store=>store.id));
  const promotionRecords=promos.filter(row=>scope.has(row.storeId));
  const productRecords=products.filter(row=>scope.has(row.storeId));
  return {promotions:{total:promotionRecords.length,ordered:promotionRecords.filter(row=>row.orderStatus==='Ordered').length},
    products:{total:productRecords.length,ordered:productRecords.filter(row=>row.orderStatus==='Ordered').length}};
}
