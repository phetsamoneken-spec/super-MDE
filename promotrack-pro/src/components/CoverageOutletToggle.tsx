import { CheckCircle2, Circle, LoaderCircle, MapPin } from 'lucide-react';
import type { Store } from '../types';

type Props={store:Store;visited:boolean;pending:boolean;disabled:boolean;admin:boolean;mdeName?:string;lao:boolean;onToggle:()=>void};

export function CoverageOutletToggle({store,visited,pending,disabled,admin,mdeName,lao,onToggle}:Props) {
  const status=visited?(lao?'ຢ້ຽມແລ້ວ':'Visited'):(lao?'ຍັງບໍ່ຢ້ຽມ':'Not visited');
  const content=<>
    <span className="coverage-toggle-icon" aria-hidden="true">{pending?<LoaderCircle className="coverage-toggle-spinner" size={28}/>:visited?<CheckCircle2 size={28}/>:<Circle size={28}/>}</span>
    <span className="coverage-toggle-copy"><span className="coverage-store-code">{store.storeCode}</span><span className="coverage-store-title">{store.storeName}</span><span className="coverage-toggle-location"><MapPin size={13}/>{[store.village,store.district,store.province].filter(Boolean).join(' · ')||store.subChannel}</span>{admin&&<span className="coverage-toggle-location">{mdeName||store.mdeName}</span>}</span>
    <span className="coverage-toggle-status"><strong>{pending?(lao?'ກຳລັງບັນທຶກ…':'Saving…'):status}</strong><span>{admin?(lao?'ເບິ່ງສະຖານະ':'View status'):visited?(lao?'ກົດອີກຄັ້ງເພື່ອຍົກເລີກ':'Tap again to undo'):(lao?'ກົດເພື່ອໝາຍວ່າຢ້ຽມແລ້ວ':'Tap to mark visited')}</span></span>
  </>;
  const className=`coverage-visit-toggle ${visited?'is-visited':'is-pending'}`;
  return admin?<div className={className}>{content}</div>:<button type="button" className={className} disabled={disabled} aria-busy={pending} aria-pressed={visited} aria-label={`${visited?(lao?'ຍົກເລີກຢ້ຽມຢາມ':'Mark not visited'):(lao?'ໝາຍວ່າຢ້ຽມແລ້ວ':'Mark visited')}: ${store.storeName}`} onClick={onToggle}>{content}</button>;
}
