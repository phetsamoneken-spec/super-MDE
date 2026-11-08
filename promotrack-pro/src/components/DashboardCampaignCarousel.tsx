import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ImageIcon } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import type { Language, NewProductLaunch, Promotion } from '../types';
import { CampaignImage } from './CampaignImage';

type Slide = { key:string; title:string; image:string; date:string; kind:'product'; product:NewProductLaunch } |
  { key:string; title:string; image:string; date:string; kind:'promotion'; promotion:Promotion };

export function DashboardCampaignCarousel({products, promotions, language, onOpenProduct, onOpenPromotion}:{
  products:NewProductLaunch[]; promotions:Promotion[]; language:Language;
  onOpenProduct:(productId:string)=>void; onOpenPromotion:(promotion:Promotion)=>void;
}) {
  const lao=language==='lo';
  const slides=useMemo<Slide[]>(()=>[
    ...products.filter(p=>p.imageUrl?.trim()).map(product=>({key:`product:${product.id}`,title:product.productName,image:product.imageUrl!,date:product.createdAt||product.launchDate,kind:'product' as const,product})),
    ...promotions.filter(p=>p.imageUrl?.trim()).map(promotion=>({key:`promotion:${promotion.id}`,title:promotion.promotionName,image:promotion.imageUrl!,date:promotion.createdAt||promotion.startDate,kind:'promotion' as const,promotion}))
  ].sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0)),[products,promotions]);
  const [index,setIndex]=useState(0);
  const track=useRef<HTMLDivElement>(null);
  const active=useRef(0);
  const measuredWidth=useRef(0);
  const reducedMotion=useReducedMotion();
  const signature=JSON.stringify(slides.map(s=>[s.key,s.image]));
  const count=slides.length;
  const selected=Math.min(index,Math.max(0,count-1));
  const current=slides[selected];

  useEffect(()=>{
    active.current=0;setIndex(0);
    const element=track.current;
    if(!element) return;
    measuredWidth.current=element.clientWidth;
    element.scrollLeft=0;
    // Keep the selected photo aligned when the screen rotates or resizes.
    const observer=new ResizeObserver(()=>{
      const width=element.clientWidth;
      if(width && width!==measuredWidth.current){measuredWidth.current=width;element.scrollLeft=active.current*width;}
    });
    observer.observe(element);
    return ()=>observer.disconnect();
  },[signature]);

  const goTo=(target:number)=>{
    if(!count||!track.current)return;
    const next=(target+count)%count;
    const wrapping=target<0||target>=count;
    track.current.scrollTo({left:next*track.current.clientWidth,behavior:reducedMotion||wrapping?'auto':'smooth'});
  };
  const open=()=>{
    if(!current)return;
    if(current.kind==='product')onOpenProduct(current.product.id);
    else onOpenPromotion(current.promotion);
  };

  return <section className="hero-campaign-carousel" role="region" aria-roledescription="carousel" aria-label={lao?'ຮູບສິນຄ້າໃໝ່ ແລະ ໂປຣໂມຊັ່ນ':'New product and promotion images'}>
    {count===0 ? <div className="hero-campaign-empty"><ImageIcon size={32}/><p>{lao?'ຍັງບໍ່ມີຮູບສິນຄ້າ ຫຼື ໂປຣໂມຊັ່ນ':'No product or promotion images yet'}</p></div> : <>
      <div ref={track} className="hero-campaign-track" tabIndex={count>1?0:undefined} aria-label={lao?'ປັດຊ້າຍ–ຂວາເພື່ອເບິ່ງຮູບ':'Swipe left or right to browse images'}
        onScroll={event=>{const el=event.currentTarget;if(!el.clientWidth)return;if(el.clientWidth!==measuredWidth.current){measuredWidth.current=el.clientWidth;el.scrollLeft=active.current*el.clientWidth;return;}const next=Math.max(0,Math.min(count-1,Math.round(el.scrollLeft/el.clientWidth)));active.current=next;setIndex(next);}}
        onKeyDown={event=>{if(event.target!==event.currentTarget)return;if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();goTo(event.key==='Home'?0:event.key==='End'?count-1:selected+(event.key==='ArrowRight'?1:-1));}}}>
        {slides.map((slide,i)=><div key={slide.key} className="hero-campaign-slide" role="group" aria-roledescription="slide" aria-label={`${i+1}/${count}: ${slide.title}`} aria-hidden={i!==selected}>
          <CampaignImage src={slide.image} alt={slide.title} language={language} contain className="hero-campaign-photo"/>
        </div>)}
      </div>
      <button type="button" className="hero-campaign-caption" onClick={open}>
        <span className="min-w-0"><span className="hero-campaign-kind">{current.kind==='product'?(lao?'ສິນຄ້າໃໝ່':'NEW PRODUCT'):(lao?'ໂປຣໂມຊັ່ນ':'PROMOTION')}</span><span className="hero-campaign-title">{current.title}</span></span>
        <ArrowUpRight size={19} aria-hidden="true"/>
      </button>
      <span className="sr-only" role="status" aria-live="polite">{selected+1} / {count}: {current.title}</span>
    </>}
  </section>;
}
