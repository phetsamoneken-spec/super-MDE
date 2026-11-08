import React, { useState } from 'react';
import { CheckCircle2, Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { dataService } from '../services/dataService';
import { BrandLogo } from './BrandLogo';
import { AccountModalShell } from './AccountModalShell';
import type { Language } from '../types';

export function PWAInstallCard({language}:{language:Language}) {
  const lao=language==='lo';
  const {isInstallable,isInstalled,isIOS,install}=usePWAInstall();
  const [guide,setGuide]=useState(false),[busy,setBusy]=useState(false);
  const branding=dataService.getAppBranding();
  return <>
    <section className="pwa-install-card" aria-label={lao?'ຕິດຕັ້ງແອັບ PWA':'Install PWA app'}>
      <BrandLogo branding={branding} size="xl"/>
      <div className="pwa-install-copy"><span className="pwa-install-eyebrow">{branding.appName} · PWA</span><h3>{lao?'ພ້ອມໃຊ້ງານຈາກໜ້າຈໍຂອງທ່ານ':'Your workspace, one tap away'}</h3><p>{lao?'ເພີ່ມໄວ້ໃນໜ້າຈໍຫຼັກ ເພື່ອເຂົ້າໃຊ້ແອັບໄດ້ສະດວກ.':'Add the app to your home screen for quick access.'}</p></div>
      <button type="button" className="pwa-install-button" disabled={busy||isInstalled} onClick={async()=>{
        if(!isInstallable){setGuide(true);return;}
        setBusy(true);try{await install();}finally{setBusy(false);}
      }}>{isInstalled?<CheckCircle2 size={18}/>:<Download size={18}/>}<span>{isInstalled?(lao?'ຕິດຕັ້ງແລ້ວ':'Installed'):busy?(lao?'ກຳລັງເປີດ…':'Opening…'):(lao?'ຕິດຕັ້ງແອັບ':'Install app')}</span></button>
    </section>
    {guide&&<AccountModalShell title={lao?'ຕິດຕັ້ງແອັບ':'Install app'} description={branding.appName} icon={Smartphone} language={language} onClose={()=>setGuide(false)}>
      <ol className="pwa-install-steps">{(isIOS?(lao?['ເປີດລິ້ງແອັບນີ້ໃນ Safari.','ກົດ Share (ແບ່ງປັນ) ແລ້ວເລືອກ Add to Home Screen.','ກົດ Add ເພື່ອເພີ່ມແອັບໃນໜ້າຈໍຫຼັກ.']:['Open this app link in Safari.','Tap Share, then Add to Home Screen.','Tap Add to place the app on your home screen.']):(lao?['ເປີດລິ້ງແອັບນີ້ໃນ Chrome ຫຼື Edge.','ເປີດເມນູ ⋮ ຫຼື ⋯ ແລ້ວຊອກຫາ Install app ຫຼື Add to Home Screen.','ຖ້າບໍ່ມີເມນູຕິດຕັ້ງ ໃຫ້ເປີດຈາກ browser ໂດຍກົງ ແທນໜ້າຕ່າງໃນແອັບອື່ນ.']:['Open this app link in Chrome or Edge.','Open the ⋮ or ⋯ menu and look for Install app or Add to Home Screen.','If installation is unavailable, open the link in a full browser instead of an in-app browser.'])).map(step=><li key={step}>{step}</li>)}</ol>
      <div className="account-modal-actions"><button type="button" className="account-button account-button-primary" onClick={()=>setGuide(false)}>{lao?'ເຂົ້າໃຈແລ້ວ':'Got it'}</button></div>
    </AccountModalShell>}
  </>;
}
