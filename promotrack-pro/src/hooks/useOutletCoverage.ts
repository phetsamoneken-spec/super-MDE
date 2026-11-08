import { useCallback, useEffect, useRef, useState } from 'react';
import type { UserProfile } from '../types';
import type { OutletCoverage, VisitPeriod } from '../types/coverage';
import { outletVisits } from '../services/outletVisits';

export function useOutletCoverage(period:VisitPeriod,user:UserProfile) {
  const [rows,setRows]=useState<OutletCoverage[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const refresh=useCallback(()=>setRevision(value=>value+1),[]);
  const version=useRef(0),request=useRef<AbortController|undefined>(undefined);
  const replaceRows=useCallback((next:OutletCoverage[])=>{version.current++;request.current?.abort();setRows(next);setError('');setLoading(false);},[]);
  useEffect(()=>{
    const controller=new AbortController();request.current=controller;const current=++version.current;const active=()=>current===version.current;
    setLoading(true);setError('');const timeout=window.setTimeout(()=>controller.abort(),20000);
    outletVisits.coverage(period,controller.signal).then(next=>{if(active())setRows(next);}).catch(cause=>{if(active())setError(cause instanceof Error?cause.message:'Could not load coverage.');}).finally(()=>{window.clearTimeout(timeout);if(active())setLoading(false);});
    return ()=>{version.current++;window.clearTimeout(timeout);controller.abort();};
  },[period.start,period.end,user.id,user.mdeId,user.role,revision]);
  useEffect(()=>{window.addEventListener('online',refresh);return()=>window.removeEventListener('online',refresh);},[refresh]);
  return {rows,loading,error,refresh,replaceRows};
}
