import React from 'react';
import { ArrowUpRight, PackagePlus } from 'lucide-react';
import type { FollowUpTask, Language, NewProductLaunch, NewProductStoreOrder } from '../types';
import { CampaignImage } from './CampaignImage';

export function TaskProductOrders({task, products, orders, language, onOpen}: {
  task:Pick<FollowUpTask,'storeId'|'productId'>; products:Map<string,NewProductLaunch>; orders:NewProductStoreOrder[];
  language:Language; onOpen:(productId:string,storeId:string)=>void;
}) {
  const lao=language==='lo';
  // Only actual enrolments for this outlet; a linked task shows its exact product.
  const relevant=orders.filter(order=>order.storeId===task.storeId && (!task.productId || order.productId===task.productId) && products.has(order.productId));
  const linked=task.productId ? products.get(task.productId) : undefined;
  if(!relevant.length && !linked) return null;
  const labels:Record<NewProductStoreOrder['orderStatus'],string>={
    'Ordered':lao?'ສັ່ງຊື້ແລ້ວ':'Ordered', 'Not Ordered':lao?'ຍັງບໍ່ສັ່ງຊື້':'Not Ordered',
    'Sample Provided':lao?'ໃຫ້ຕົວຢ່າງແລ້ວ':'Sample Provided', 'Follow-up Required':lao?'ຕ້ອງຕິດຕາມ':'Follow-up Required', 'Declined':lao?'ປະຕິເສດ':'Declined'
  };
  const number=(value:number)=>value.toLocaleString(lao?'lo-LA':'en-US');
  return <section aria-label={lao?'ການສັ່ງຊື້ສິນຄ້າໃໝ່ຂອງຮ້ານ':'New product orders for this outlet'} className="mt-3 space-y-2">
    <h5 className="text-[11px] font-bold flex items-center gap-1 text-[var(--color-primary)]"><PackagePlus size={13}/>{lao?'ການສັ່ງຊື້ສິນຄ້າໃໝ່':'New product orders'}</h5>
    {!relevant.length && linked && <p className="text-xs text-[var(--color-text-secondary)]">{linked.productName} · {lao?'ຍັງບໍ່ມີລາຍການສັ່ງຊື້ຂອງຮ້ານນີ້':'No order record for this outlet'}</p>}
    {relevant.map(order=>{
      const product=products.get(order.productId)!;
      return <div key={order.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3 flex gap-3 min-w-0">
        <CampaignImage src={product.imageUrl} alt={product.productName} language={language} contain className="w-14 h-16 rounded-xl shrink-0"/>
        <div className="min-w-0 flex-1 space-y-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold break-words">{product.productName}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${order.orderStatus==='Ordered'?'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200':'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'}`}>{labels[order.orderStatus]}</span></div>
          {order.orderStatus==='Ordered' && <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-secondary)]"><span>{lao?'ຈຳນວນ':'Qty'}: {order.orderQuantity!=null?number(order.orderQuantity):'—'}</span><span>{lao?'ມູນຄ່າ':'Amount'}: {order.orderAmount!=null?`${number(order.orderAmount)} LAK`:'—'}</span>{order.orderDate&&<span>{order.orderDate.substring(0,10)}</span>}</div>}
          {order.orderStatus==='Sample Provided' && <p className="text-[11px] text-[var(--color-text-secondary)]">{lao?'ຈຳນວນຕົວຢ່າງ':'Sample qty'}: {order.sampleQty??'—'} {order.sampleGivenDate?.substring(0,10)}</p>}
          {order.nextFollowUpDate && order.orderStatus!=='Ordered' && <p className="text-[11px] text-[var(--color-text-secondary)]">{lao?'ຕິດຕາມຄັ້ງຕໍ່ໄປ':'Next follow-up'}: {order.nextFollowUpDate.substring(0,10)}</p>}
          <button type="button" onClick={()=>onOpen(product.id,task.storeId)} className="text-[11px] text-[var(--color-primary)] font-bold inline-flex items-center gap-1 py-1">{lao?'ເບິ່ງ / ອັບເດດການສັ່ງຊື້':'View / update order'}<ArrowUpRight size={13}/></button>
        </div>
      </div>;
    })}
  </section>;
}
