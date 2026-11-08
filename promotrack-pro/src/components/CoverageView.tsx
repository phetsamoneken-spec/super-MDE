import { LaoDatePicker } from './LaoDatePicker';
import * as XLSX from 'xlsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarCheck, ClipboardCheck, Download, History, RefreshCw, Search, Tag, PackagePlus } from 'lucide-react';
import type { Language, Store, UserProfile, Promotion, PromotionStore, NewProductLaunch, NewProductStoreOrder } from '../types';
import { businessToday, campaignSummary, coverageStores, coverageSummary, validVisitDate, visitPeriod } from '../utils/coverage';
import { useOutletCoverage } from '../hooks/useOutletCoverage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { outletVisits } from '../services/outletVisits';
import { AccountModalShell } from './AccountModalShell';
import { OutletVisitHistory } from './OutletVisitHistory';
import { CoverageOutletToggle } from './CoverageOutletToggle';

type Props={stores:Store[];mdes:UserProfile[];user:UserProfile;language:Language;promotions:Promotion[];promoStores:PromotionStore[];products:NewProductLaunch[];productOrders:NewProductStoreOrder[];onOpenPromotion:(id:string,storeId?:string)=>void;onOpenProduct:(id:string,storeId:string)=>void};
const statusLabels:Record<string,string>={'Ordered':'ສັ່ງຊື້ແລ້ວ','Not Ordered':'ຍັງບໍ່ສັ່ງ','Follow-up Required':'ຕ້ອງຕິດຕາມ','Cancelled':'ຍົກເລີກ','Sample Provided':'ໃຫ້ຕົວຢ່າງແລ້ວ','Declined':'ປະຕິເສດ'};

export function CoverageView({stores,mdes,user,language,promotions,promoStores,products,productOrders,onOpenPromotion,onOpenProduct}:Props) {
  const lao=language==='lo',admin=user.role==='admin',today=businessToday(),online=useOnlineStatus();
  useEffect(()=>{window.scrollTo(0,0);},[]);
  const [mode,setMode]=useState<'month'|'day'>('month'),[month,setMonth]=useState(today.slice(0,7)),[day,setDay]=useState(today);
  const [mde,setMde]=useState('all'),[search,setSearch]=useState(''),[filter,setFilter]=useState<'all'|'pending'|'visited'>('all'),[page,setPage]=useState(1);
  const period=visitPeriod(mode,mode==='month'?month:day);
  const {rows,loading,error,refresh,replaceRows}=useOutletCoverage(period,user);
  const [toggling,setToggling]=useState(''),[toggleError,setToggleError]=useState(''),[toggleMessage,setToggleMessage]=useState('');
  const toggleLock=useRef(false);
  const [recording,setRecording]=useState<Store>(),[history,setHistory]=useState<Store>(),[expanded,setExpanded]=useState<string>();
  const [date,setDate]=useState(''),[note,setNote]=useState(''),[saveError,setSaveError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[exporting,setExporting]=useState(false);
  const scope=useMemo(()=>coverageStores(stores,user,mde),[stores,user.id,user.mdeId,user.role,mde]);
  const summary=useMemo(()=>coverageSummary(scope,rows),[scope,rows]);
  const rowMap=useMemo(()=>new Map(rows.map(row=>[`${row.storeId}:${row.mdeId}`,row])),[rows]);
  const promoMap=useMemo(()=>new Map(promotions.map(promo=>[promo.id,promo])),[promotions]);
  const productMap=useMemo(()=>new Map(products.map(product=>[product.id,product])),[products]);
  const campaigns=useMemo(()=>{
    const map=new Map<string,{promos:PromotionStore[];products:NewProductStoreOrder[]}>();
    for(const store of scope)map.set(store.id,{promos:[],products:[]});
    for(const row of promoStores)if(promoMap.has(row.promotionId))map.get(row.storeId)?.promos.push(row);
    for(const row of productOrders)if(productMap.has(row.productId))map.get(row.storeId)?.products.push(row);
    return map;
  },[scope,promoStores,productOrders,promoMap,productMap]);
  const selected=useMemo(()=>{
    const query=search.trim().toLocaleLowerCase();
    return scope.filter(store=>{
      const visited=!!rowMap.get(`${store.id}:${store.mdeId}`)?.visitCount;
      return (filter==='all'||(filter==='visited'?visited:!visited))&&(!query||[store.storeName,store.storeCode,store.village,store.district,store.subChannel].some(value=>value?.toLocaleLowerCase().includes(query)));
    }).sort((a,b)=>a.storeName.localeCompare(b.storeName,'lo'));
  },[scope,rowMap,search,filter]);
  const totalPages=Math.max(1,Math.ceil(selected.length/50)),currentPage=Math.min(page,totalPages),visible=selected.slice((currentPage-1)*50,currentPage*50);
  const mdeSummaries=useMemo(()=>admin?mdes.map(rep=>{
    const assigned=coverageStores(stores,user,rep.id);
    return {rep,...coverageSummary(assigned,rows),campaigns:campaignSummary(assigned,promoStores,productOrders)};
  }):[],[mdes,stores,user.id,user.role,rows,promoStores,productOrders]);
  const directory=useRef<HTMLElement>(null),noticeElement=useRef<HTMLParagraphElement>(null);
  const goPage=(value:number)=>{setPage(value);directory.current?.scrollIntoView({block:'start'});};
  const reset=()=>{setPage(1);setNotice('');};
  const openRecord=(store:Store)=>{setRecording(store);setDate(mode==='day'?day:month===today.slice(0,7)?today:'');setNote('');setSaveError('');};
  const toggleVisit=async(store:Store,visited:boolean)=>{
    if(toggleLock.current||loading||!online||admin)return;
    if(!visited&&mode==='month'&&month!==today.slice(0,7)){openRecord(store);return;}
    toggleLock.current=true;setToggling(store.id);setToggleError('');setToggleMessage('');setNotice('');
    try{
      const next=await outletVisits.setVisited(store.id,store.mdeId!,user.id,period,!visited,mode==='day'?day:today);
      replaceRows(next);
      const stillVisited=next.some(row=>row.storeId===store.id&&row.mdeId===store.mdeId&&row.visitCount>0);
      if(visited&&stillVisited)setToggleError(lao?'ຍັງມີບັນທຶກຢ້ຽມຢາມໃນໄລຍະນີ້. ກະລຸນາເບິ່ງປະຫວັດ.':'A visit remains in this period. Check its history.');
      else setToggleMessage(visited?(lao?'ປັບເປັນຍັງບໍ່ຢ້ຽມຢາມແລ້ວ':'Marked not visited for this period.'):(lao?'ໝາຍວ່າຢ້ຽມຢາມແລ້ວ':'Marked visited.'));
    }catch(cause){const message=cause instanceof Error?cause.message:'Could not update visit status.';setToggleError(lao&&message.startsWith('Another account')?'ບັນຊີອື່ນເປັນຜູ້ບັນທຶກການຢ້ຽມຢາມນີ້. ມີພຽງບັນຊີນັ້ນທີ່ຍົກເລີກໄດ້.':message);}
    finally{toggleLock.current=false;setToggling('');}
  };
  return <div className="coverage-page">
    <span className="sr-only" role="status">{toggleMessage}</span>
    <header className="coverage-heading"><div><span className="coverage-kicker">SUPER MDE · COVERAGE</span><h2><ClipboardCheck size={27}/>{lao?'ຕິດຕາມການຢ້ຽມຢາມຮ້ານຄ້າ':'Outlet visit coverage'}</h2><p>{lao?'ຮ້ານບໍ່ຊ້ຳທີ່ຢ້ຽມຢາມແລ້ວ ÷ ຮ້ານທີ່ຮັບຜິດຊອບ × 100':'Unique visited outlets ÷ assigned outlets × 100'}</p></div>
      <div className="coverage-header-actions"><button type="button" className="coverage-secondary" onClick={refresh} disabled={loading||!!toggling}><RefreshCw size={16}/>{lao?'ໂຫຼດໃໝ່':'Refresh'}</button><button type="button" className="coverage-secondary" disabled={loading||!!error||exporting||!selected.length} onClick={async()=>{
        setExporting(true);try{const data=selected.map(store=>{const coverage=rowMap.get(`${store.id}:${store.mdeId}`),orders=campaigns.get(store.id);return {'OUTLET CODE':store.storeCode,'OUTLET NAME':store.storeName,'MDE':mdes.find(rep=>rep.id===store.mdeId)?.fullName||store.mdeName,'PERIOD START':period.start,'PERIOD END':period.end,'VISITED':coverage?.visitCount?'DONE':'NONE','VISITS':coverage?.visitCount||0,'LAST VISIT':coverage?.lastVisitedOn||'','PROMOTIONS ORDERED':orders?.promos.filter(row=>row.orderStatus==='Ordered').length||0,'PROMOTIONS ASSIGNED':orders?.promos.length||0,'NEW PRODUCTS ORDERED':orders?.products.filter(row=>row.orderStatus==='Ordered').length||0,'NEW PRODUCTS ASSIGNED':orders?.products.length||0};});const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(data),'Coverage');XLSX.writeFile(book,`coverage-${period.start}-${period.end}.xlsx`);}catch{setNotice(lao?'ສົ່ງອອກບໍ່ສຳເລັດ':'Export failed. Please retry.');}finally{setExporting(false);}
      }}><Download size={16}/>{exporting?'…':'Excel'}</button></div>
    </header>

    <div className="coverage-filters">
      <div className="coverage-period-mode" role="group" aria-label={lao?'ຮູບແບບລາຍງານ':'Reporting period'}>{(['month','day'] as const).map(value=><button type="button" key={value} disabled={!!toggling} aria-pressed={mode===value} onClick={()=>{setMode(value);reset();}}>{value==='month'?(lao?'ລາຍເດືອນ':'Monthly'):(lao?'ລາຍວັນ':'Daily')}</button>)}</div>
      <label>{lao?'ໄລຍະເວລາ':'Period'}{mode==='month'?<LaoDatePicker required disabled={!!toggling} aria-label={lao?'ໄລຍະເວລາ':'Period'} type="month" value={month} max={today.slice(0,7)} onChange={event=>{const value=event.target.value;if(validVisitDate(value+'-01')&&value.slice(0,7)===value&&value<=today.slice(0,7)){setMonth(value);reset();}}}/>:<LaoDatePicker required disabled={!!toggling} aria-label={lao?'ໄລຍະເວລາ':'Period'} type="date" value={day} max={today} onChange={event=>{if(validVisitDate(event.target.value)&&event.target.value<=today){setDay(event.target.value);reset();}}}/>}</label>
      {admin&&<label>MDE<select aria-label="MDE" value={mde} onChange={event=>{setMde(event.target.value);reset();}}><option value="all">{lao?'MDE ທັງໝົດ':'All MDEs'}</option>{mdes.map(rep=><option key={rep.id} value={rep.id}>{rep.fullName}</option>)}</select></label>}
      <p>{lao?'ນັບສະເພາະຮ້ານທີ່ເປີດໃຊ້ ແລະ ມອບໝາຍ MDE ຢູ່ປັດຈຸບັນ.':'Coverage uses currently active outlets with an MDE assignment.'}</p>
    </div>

    <section className="coverage-metrics" aria-label={lao?'ສະຫຼຸບ Coverage':'Coverage summary'}>
      <div><span>{lao?'ຮ້ານຮັບຜິດຊອບ':'Assigned outlets'}</span><strong>{summary.total}</strong></div>
      <div className="coverage-metric-pending"><span>{lao?'ຍັງບໍ່ຢ້ຽມຢາມ':'Not visited'}</span><strong>{loading?'…':error?'—':summary.pending}</strong></div>
      <div className="coverage-metric-done"><span>{lao?'ຢ້ຽມຢາມແລ້ວ':'Visited'}</span><strong>{loading?'…':error?'—':summary.visited}</strong></div>
      <div className="coverage-metric-percent"><span>Coverage</span><strong>{loading?'…':error?'—':`${summary.percent}%`}</strong>{!loading&&!error&&<span>{summary.visits} {lao?'ຄັ້ງ':'visits'}</span>}</div>
    </section>
    {notice&&<p ref={noticeElement} tabIndex={-1} className="coverage-notice" role="status">{notice}</p>}
    {toggleError&&<p role="alert" className="account-message account-message-error">{toggleError}</p>}
    {!online&&<p className="coverage-notice">{lao?'ຕ້ອງເຊື່ອມເນັດເພື່ອບັນທຶກ ຫຼື ໂຫຼດການຢ້ຽມຢາມ.':'Connect to the internet to record or refresh visits.'}</p>}
    {error&&<div role="alert" className="account-message account-message-error"><p>{lao?'ໂຫຼດ Coverage ບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່ ຫຼື ຕິດຕໍ່ Admin.':'Could not load coverage. Retry or contact your administrator.'}</p><p>{error}</p><button type="button" className="coverage-secondary" onClick={refresh}>{lao?'ລອງໃໝ່':'Retry'}</button></div>}

    {admin&&!loading&&!error&&<section className="coverage-mde-section" aria-label={lao?'ສະຫຼຸບແຕ່ລະ MDE':'MDE overview'}><h3>{lao?'ສະຫຼຸບແຕ່ລະ MDE':'Coverage by MDE'}</h3><p>{lao?'ໂປຣໂມຊັ່ນ/ສິນຄ້າໃໝ່ ສະແດງສະຖານະສັ່ງຊື້ປັດຈຸບັນ.':'Promotion and new-product figures show current order status.'}</p><div className="coverage-mde-grid">{mdeSummaries.map(item=><button type="button" key={item.rep.id} className="coverage-mde-card" aria-pressed={mde===item.rep.id} onClick={()=>{setMde(item.rep.id);reset();}}><strong>{item.rep.fullName}</strong><span>{item.visited}/{item.total} · <b>{item.percent}%</b></span><span>{lao?'ໂປຣໂມຊັ່ນ':'Promotions'}: {item.campaigns.promotions.ordered}/{item.campaigns.promotions.total}</span><span>{lao?'ສິນຄ້າໃໝ່':'New products'}: {item.campaigns.products.ordered}/{item.campaigns.products.total}</span></button>)}</div></section>}

    <section ref={directory} className="coverage-directory" aria-label={lao?'ລາຍຊື່ຮ້ານ Coverage':'Coverage outlets'}>
      <div className="coverage-directory-controls"><label className="coverage-search"><Search size={17}/><input type="search" value={search} onChange={event=>{setSearch(event.target.value);reset();}} placeholder={lao?'ຄົ້ນຫາຮ້ານ, ລະຫັດ, ບ້ານ…':'Search outlet, code, village…'} aria-label={lao?'ຄົ້ນຫາຮ້ານ Coverage':'Search coverage outlets'}/></label><div className="coverage-status-filters" role="group" aria-label={lao?'ສະຖານະຢ້ຽມຢາມ':'Visit status'}>{(['all','pending','visited'] as const).map(value=><button type="button" disabled={loading||!!error} aria-pressed={filter===value} key={value} onClick={()=>{setFilter(value);reset();}}>{value==='all'?(lao?'ທັງໝົດ':'All'):value==='pending'?(lao?'ຍັງບໍ່ຢ້ຽມ':'Not visited'):(lao?'ຢ້ຽມແລ້ວ':'Visited')}</button>)}</div></div>
      {loading?<p role="status" className="coverage-empty">{lao?'ກຳລັງໂຫຼດ Coverage…':'Loading coverage…'}</p>:!error&&<>
        <p className="coverage-list-count">{selected.length} {lao?'ຮ້ານ · ຄົ້ນຫາມີຜົນສະເພາະລາຍຊື່ ບໍ່ປ່ຽນເປີເຊັນ Coverage':'outlets · Search filters the list, not the coverage denominator'}</p>
        {!selected.length&&<p className="coverage-empty">{lao?'ບໍ່ພົບຮ້ານທີ່ກົງກັບຕົວກອງ':'No outlets match these filters.'}</p>}
        {!admin&&<p className="coverage-muted">{lao?'ກົດແຖບຊື່ຮ້ານເພື່ອສະຫຼັບສະຖານະ. ການຍົກເລີກຈະລົບບັນທຶກຂອງຕົນໃນໄລຍະທີ່ເລືອກເທົ່ານັ້ນ.':'Tap the outlet name panel to toggle its status. Undo clears your visits in the selected period only.'}</p>}<div className="coverage-store-list">{visible.map(store=>{
          const record=rowMap.get(`${store.id}:${store.mdeId}`),visited=!!record?.visitCount,orders=campaigns.get(store.id)!;
          return <article key={store.id} className={`coverage-store-card ${visited?'is-visited':'is-pending'}`} data-store-id={store.id}>
            <CoverageOutletToggle store={store} visited={visited} pending={toggling===store.id} disabled={!online||!!toggling||loading} admin={admin} mdeName={mdes.find(rep=>rep.id===store.mdeId)?.fullName} lao={lao} onToggle={()=>void toggleVisit(store,visited)}/>
            {visited&&<p className="coverage-last-visit">{lao?'ຄັ້ງຫຼ້າສຸດ':'Latest in period'}: {record.lastVisitedOn} · {record.visitCount} {lao?'ຄັ້ງ':'visits'}</p>}
            <div className="coverage-campaign-counts"><span><Tag size={14}/>{lao?'ໂປຣໂມຊັ່ນ':'Promotions'}: {orders.promos.filter(row=>row.orderStatus==='Ordered').length}/{orders.promos.length}</span><span><PackagePlus size={14}/>{lao?'ສິນຄ້າໃໝ່':'New products'}: {orders.products.filter(row=>row.orderStatus==='Ordered').length}/{orders.products.length}</span></div>
            <div className="coverage-store-actions">{!admin&&<button type="button" className="coverage-secondary" disabled={!online||!!toggling} onClick={()=>openRecord(store)}><CalendarCheck size={16}/>{lao?'ວັນທີ / ໝາຍເຫດ':'Visit date / note'}</button>}<button type="button" className="coverage-secondary" disabled={!!toggling} onClick={()=>setHistory(store)}><History size={15}/>{lao?'ປະຫວັດ':'History'}</button><button type="button" className="coverage-secondary" aria-expanded={expanded===store.id} onClick={()=>setExpanded(expanded===store.id?undefined:store.id)}>{lao?'ໂປ / ສິນຄ້າໃໝ່':'Campaign details'}</button></div>
            {expanded===store.id&&<div className="coverage-campaign-details"><p>{lao?'ສະຖານະສັ່ງຊື້ປັດຈຸບັນ':'Current order status'}</p>{!orders.promos.length&&!orders.products.length&&<p>{lao?'ຮ້ານນີ້ຍັງບໍ່ມີໂປຣໂມຊັ່ນ ຫຼື ສິນຄ້າໃໝ່ທີ່ມອບໝາຍ.':'No promotions or new products are assigned to this outlet.'}</p>}{orders.promos.map(row=><button type="button" key={row.id} onClick={()=>onOpenPromotion(row.promotionId,store.id)}><Tag size={15}/><span>{promoMap.get(row.promotionId)!.promotionName}</span><b data-ordered={row.orderStatus==='Ordered'}>{lao?statusLabels[row.orderStatus]:row.orderStatus}</b></button>)}{orders.products.map(row=><button type="button" key={row.id} onClick={()=>onOpenProduct(row.productId,store.id)}><PackagePlus size={15}/><span>{productMap.get(row.productId)!.productName}</span><b data-ordered={row.orderStatus==='Ordered'}>{lao?statusLabels[row.orderStatus]:row.orderStatus}</b></button>)}</div>}
          </article>;
        })}</div>
        {totalPages>1&&<nav className="coverage-pagination" aria-label={lao?'ໜ້າລາຍຊື່ຮ້ານ':'Outlet pages'}><button type="button" className="coverage-secondary" disabled={currentPage===1} onClick={()=>goPage(currentPage-1)}>{lao?'ກ່ອນໜ້າ':'Previous'}</button><span>{currentPage}/{totalPages}</span><button type="button" className="coverage-secondary" disabled={currentPage===totalPages} onClick={()=>goPage(currentPage+1)}>{lao?'ຕໍ່ໄປ':'Next'}</button></nav>}
      </>}
    </section>

    {recording&&<AccountModalShell title={lao?'ບັນທຶກຢ້ຽມຢາມຮ້ານ':'Record outlet visit'} description={`${recording.storeCode} · ${recording.storeName}`} icon={CalendarCheck} language={language} onClose={()=>setRecording(undefined)} busy={busy}>
      <form className="account-form coverage-visit-form" onSubmit={async event=>{
        event.preventDefault();if(!validVisitDate(date)||date>today||date<period.start||date>period.end){setSaveError(lao?'ເລືອກວັນທີຢ້ຽມຢາມທີ່ຖືກຕ້ອງໃນໄລຍະນີ້.':'Choose a valid visit date in this reporting period.');return;}
        setBusy(true);setSaveError('');try{await outletVisits.record(recording.id,date,note);setRecording(undefined);setNotice(lao?'ບັນທຶກການຢ້ຽມຢາມແລ້ວ':'Visit saved.');refresh();requestAnimationFrame(()=>noticeElement.current?.focus());}catch(cause){const message=cause instanceof Error?cause.message:'Could not save this visit.';setSaveError(lao&&message.startsWith('A visit is already recorded')?'ຮ້ານນີ້ມີບັນທຶກໃນວັນທີນີ້ແລ້ວ. ກະລຸນາເບິ່ງປະຫວັດ.':message);}finally{setBusy(false);}
      }}><label>{lao?'ວັນທີຢ້ຽມຢາມ':'Visit date'}<LaoDatePicker aria-label={lao?'ວັນທີຢ້ຽມຢາມ':'Visit date'} type="date" value={date} min={period.start} max={period.end<today?period.end:today} required disabled={busy} onChange={event=>setDate(event.target.value)}/></label><label>{lao?'ໝາຍເຫດ (ບໍ່ບັງຄັບ)':'Note (optional)'}<textarea aria-label={lao?'ໝາຍເຫດ (ບໍ່ບັງຄັບ)':'Note (optional)'} rows={3} maxLength={2000} value={note} disabled={busy} onChange={event=>setNote(event.target.value)}/></label><p className="coverage-muted">{lao?'ບັນທຶກໄດ້ 1 ຄັ້ງຕໍ່ຮ້ານຕໍ່ວັນ. ການໄປຊ້ຳຈະບໍ່ເພີ່ມຈຳນວນຮ້ານ Coverage ໃນເດືອນ.':'One record per outlet per day. Repeat visits do not inflate monthly outlet coverage.'}</p>{saveError&&<p role="alert" className="account-message account-message-error">{saveError}</p>}<div className="account-modal-actions"><button type="button" className="account-button account-button-secondary" disabled={busy} onClick={()=>setRecording(undefined)}>{lao?'ຍົກເລີກ':'Cancel'}</button><button type="submit" disabled={busy||!online} className="account-button account-button-primary">{busy?(lao?'ກຳລັງບັນທຶກ…':'Saving…'):(lao?'ຢືນຢັນຢ້ຽມຢາມ':'Confirm visit')}</button></div></form>
    </AccountModalShell>}
    {history&&<OutletVisitHistory key={history.id} store={history} user={user} mdes={mdes} language={language} onClose={()=>setHistory(undefined)} onChanged={refresh}/>}
  </div>;
}
