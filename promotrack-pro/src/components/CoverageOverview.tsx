import React from 'react';
import { ArrowRight, ClipboardCheck } from 'lucide-react';
import type { Language, Store, UserProfile } from '../types';
import { businessToday, coverageStores, coverageSummary, visitPeriod } from '../utils/coverage';
import { useOutletCoverage } from '../hooks/useOutletCoverage';

export function CoverageOverview({stores,user,language,onOpen}:{stores:Store[];user:UserProfile;language:Language;onOpen:()=>void}) {
  const lao=language==='lo',month=businessToday().slice(0,7);
  const {rows,loading,error}=useOutletCoverage(visitPeriod('month',month),user);
  const summary=coverageSummary(coverageStores(stores,user),rows);
  return <button type="button" className="coverage-overview" onClick={onOpen} aria-label={lao?'ເບິ່ງ Coverage ການຢ້ຽມຢາມ':'Open visit coverage'}>
    <span className="coverage-overview-icon"><ClipboardCheck size={24}/></span>
    <span className="coverage-overview-copy"><strong>{lao?'Coverage ຢ້ຽມຢາມຮ້ານຄ້າ':'Outlet visit coverage'}</strong><span>{month} · {loading?(lao?'ກຳລັງໂຫຼດ…':'Loading…'):error?(lao?'ເປີດເພື່ອລອງໂຫຼດໃໝ່':'Open to retry loading'):`${summary.visited}/${summary.total} ${lao?'ຮ້ານທີ່ຢ້ຽມຢາມແລ້ວ':'outlets visited'}`}</span></span>
    <strong className="coverage-overview-percent">{loading?'…':error?'—':`${summary.percent}%`}</strong><ArrowRight size={18}/>
  </button>;
}
