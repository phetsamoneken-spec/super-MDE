import { supabase, supabaseEnabled } from './supabaseClient';
import type { OutletCoverage, OutletVisit, VisitPeriod } from '../types/coverage';

const decode=(row:Record<string,any>):OutletVisit=>({id:row.id,storeId:row.store_id,mdeId:row.mde_id,visitedBy:row.visited_by,visitedOn:row.visited_on,note:row.note||'',createdAt:row.created_at,updatedAt:row.updated_at});
export function visitError(error:any) {
  if(error?.code==='23505')return 'A visit is already recorded for this outlet and day.';
  if(['42P01','PGRST202','PGRST205'].includes(error?.code))return 'Visit coverage is not enabled yet. Contact your administrator.';
  return error?.message||'Could not connect. Please try again.';
}
function requireConnection() {
  if(!supabaseEnabled)throw new Error('Visit coverage requires the connected application.');
  if(!navigator.onLine)throw new Error('Connect to the internet to record or refresh visits.');
}
export const outletVisits={
  async coverage(period:VisitPeriod,signal?:AbortSignal):Promise<OutletCoverage[]> {
    requireConnection();
    let query=supabase.rpc('outlet_visit_coverage',{p_start:period.start,p_end:period.end});
    if(signal)query=query.abortSignal(signal);
    const {data,error}=await query;if(error)throw new Error(visitError(error));
    return (data||[]).map((row:any)=>({storeId:row.store_id,mdeId:row.mde_id,visitCount:Number(row.visit_count),lastVisitedOn:row.last_visited_on}));
  },
  async history(storeId:string,page=0,signal?:AbortSignal):Promise<OutletVisit[]> {
    requireConnection();
    let query=supabase.from('outlet_visits').select('*').eq('store_id',storeId).order('visited_on',{ascending:false}).order('id').range(page*20,page*20+19);
    if(signal)query=query.abortSignal(signal);
    const {data,error}=await query;if(error)throw new Error(visitError(error));return (data||[]).map(decode);
  },
  async record(storeId:string,visitedOn:string,note:string):Promise<OutletVisit> {
    requireConnection();
    const {data,error}=await supabase.from('outlet_visits').insert({store_id:storeId,visited_on:visitedOn,note:note.trim()}).select().single();
    if(error)throw new Error(visitError(error));return decode(data);
  },
  async update(visit:OutletVisit,note:string):Promise<OutletVisit> {
    requireConnection();
    const {data,error}=await supabase.from('outlet_visits').update({note:note.trim()}).eq('id',visit.id).eq('updated_at',visit.updatedAt).select().maybeSingle();
    if(error)throw new Error(visitError(error));if(!data)throw new Error('This visit changed or is no longer available. Refresh its history.');return decode(data);
  },
  async remove(visit:OutletVisit) {
    requireConnection();
    const {data,error}=await supabase.from('outlet_visits').delete().eq('id',visit.id).eq('updated_at',visit.updatedAt).select('id');
    if(error)throw new Error(visitError(error));if(!data?.length)throw new Error('This visit changed or is no longer available. Refresh its history.');
  }
};
