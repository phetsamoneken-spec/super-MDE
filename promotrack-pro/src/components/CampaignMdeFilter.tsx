import { useId } from 'react';
import { Users } from 'lucide-react';
import type { Language, UserProfile } from '../types';

export function CampaignMdeFilter({user,mdes,value,onChange,language}:{user:UserProfile;mdes:UserProfile[];value:string;onChange:(value:string)=>void;language:Language}){
  const id=useId(),lao=language==='lo';if(user.role!=='admin')return null;
  return <div className="campaign-mde-filter"><div className="campaign-mde-copy"><span className="campaign-mde-icon"><Users size={20}/></span><div><strong>{lao?'ເບິ່ງຜົນຕາມ MDE':'Results by MDE'}</strong><p>{lao?'ເລືອກ MDE ເພື່ອເບິ່ງຮ້ານ ແລະຜົນການສັ່ງຊື້':'Choose an MDE to view their outlets and orders.'}</p></div></div><label htmlFor={id}>{lao?'ເລືອກ MDE':'Filter by MDE'}<select id={id} aria-label="MDE" value={value} onChange={event=>onChange(event.target.value)}><option value="all">{lao?'MDE ທັງໝົດ':'All MDEs'}</option>{mdes.map(mde=><option key={mde.id} value={mde.id}>{mde.fullName}</option>)}</select></label></div>;
}

export function CampaignTrackingSummary({records,language}:{records:{orderStatus:string;orderAmount?:number}[];language:Language}){
  const lao=language==='lo',ordered=records.filter(record=>record.orderStatus==='Ordered'),followup=records.filter(record=>record.orderStatus==='Follow-up Required');
  return <section className="campaign-tracking-summary" aria-label={lao?'ສະຫຼຸບການຕິດຕາມ':'Tracking summary'}>{[
    [lao?'ລາຍການເຂົ້າຮ່ວມ':'Assignments',records.length],
    [lao?'ສັ່ງຊື້ແລ້ວ':'Ordered',ordered.length],
    [lao?'ຕ້ອງຕິດຕາມ':'Follow-up',followup.length],
    [lao?'ມູນຄ່າສັ່ງຊື້':'Order value',`₭${ordered.reduce((sum,record)=>sum+(record.orderAmount||0),0).toLocaleString()}`]
  ].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>;
}
