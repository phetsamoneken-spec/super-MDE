import { useId, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import type { AppBranding, Language } from '../types';
import { BrandLogo } from './BrandLogo';

type Props={branding:AppBranding;language:Language;stage:'opening'|'connecting'|'error';children?:ReactNode};

export function AppLoadingScreen({branding,language,stage,children}:Props) {
  const lao=language==='lo',failed=stage==='error',titleId=useId();
  const title=failed?(lao?'ໂຫຼດໜ້າວຽກບໍ່ສຳເລັດ':'Could not load your workspace'):stage==='opening'?(lao?'ກຳລັງເປີດແອັບ…':'Opening your workspace…'):(lao?'ກຳລັງກຽມໜ້າວຽກ…':'Getting your workspace ready…');
  const description=failed?(lao?'ກະລຸນາລອງໃໝ່ ຫຼື ເຂົ້າລະບົບອີກຄັ້ງ.':'Please retry, or sign in again.'):stage==='opening'?(lao?'ກຳລັງກຽມແອັບໃຫ້ພ້ອມໃຊ້ງານ.':'Preparing your daily workspace.'):(lao?'ກຳລັງໂຫຼດຮ້ານຄ້າ, ໂປຣໂມຊັ່ນ ແລະລາຍການວຽກຂອງທ່ານ.':'Loading your stores, promotions and tasks.');
  return <main className={`startup-screen ${failed?'has-error':''}`} aria-busy={!failed}>
    <section className="startup-panel" aria-labelledby={titleId}>
      <div className="startup-brand">
        <div className="startup-logo-halo"><BrandLogo branding={branding} size="xl" className="startup-logo"/></div>
        <div className="startup-brand-name"><strong>{branding.appName}</strong><span>PWA</span></div>
        <span className="startup-eyebrow">YOUR DAILY WORKSPACE</span>
      </div>
      <div className="startup-copy" role={failed?undefined:'status'} aria-live="polite">
        {failed&&<AlertCircle size={24} className="startup-warning" aria-hidden="true"/>}
        <h1 id={titleId}>{title}</h1><p>{description}</p>
      </div>
      {!failed&&<>
        <div className="startup-progress" aria-hidden="true"><span/></div>
        <div className="startup-skeleton" aria-hidden="true">
          <div className="startup-skeleton-heading"><i/><div><span/><span/></div></div>
          <div className="startup-skeleton-metrics"><i/><i/><i/></div>
          <div className="startup-skeleton-row"><i/><span/><b/></div>
          <div className="startup-skeleton-row"><i/><span/><b/></div>
        </div>
      </>}
      {children&&<div className="startup-actions">{children}</div>}
    </section>
    <p className="startup-footer">{branding.appName}<span>·</span>{lao?'ພ້ອມສຳລັບທຸກຮ້ານຄ້າ':'Made for every store visit'}</p>
  </main>;
}

export function SyncActivity({branding,language,saving}:{branding:AppBranding;language:Language;saving:boolean}) {
  const lao=language==='lo';
  return <div className="sync-activity-backdrop"><section className="sync-activity" role="status" aria-live="polite" aria-busy="true">
    <div className="sync-activity-heading"><BrandLogo branding={branding} size="lg"/><div><h2>{saving?(lao?'ກຳລັງບັນທຶກ…':'Saving your changes…'):(lao?'ກຳລັງໂຫຼດຂໍ້ມູນໃໝ່…':'Refreshing your workspace…')}</h2><p>{lao?'ກະລຸນາລໍຖ້າສັກຄູ່':'Please wait a moment.'}</p></div></div>
    <div className="startup-progress" aria-hidden="true"><span/></div>
  </section></div>;
}
