import { avatarFor } from '../utils/avatar';
import React, { useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Store,
  Tag,
  CheckSquare,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Settings,
  X,
  PackagePlus,
  ClipboardCheck
} from 'lucide-react';
import { UserProfile, Language, AppBranding } from '../types';
import { BrandLogo } from './BrandLogo';
import { translations } from '../i18n/translations';
import { triggerHaptic } from '../utils/haptics';

export type NavTab = 'dashboard' | 'coverage' | 'stores' | 'tasks' | 'promotions' | 'newProducts' | 'tracking' | 'excel' | 'dbReview' | 'more' | 'users';

interface SidebarProps {
  connected?: boolean;
  branding: AppBranding;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: UserProfile;
  language: Language;
  overdueTasksCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenSwitchUser: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  connected,
  branding,
  currentTab,
  onSelectTab,
  currentUser,
  language,
  overdueTasksCount,
  isOpenMobile,
  onCloseMobile,
  onOpenSwitchUser
}) => {
  const t = translations[language];
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const header = document.querySelector('.app-topbar');
    if (!header) return;
    const measure = () => document.documentElement.style.setProperty('--app-sidebar-top', `${Math.max(0, header.getBoundingClientRect().bottom)}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(header); measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('scroll', measure); window.removeEventListener('resize', measure); };
  }, []);

  useEffect(() => {
    if (!isOpenMobile) return;
    const desktop = window.matchMedia('(min-width: 1024px)');
    if (desktop.matches) { onCloseMobile(); return; }
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseMobile(); }
      if (event.key !== 'Tab') return;
      const controls = panel.current?.querySelectorAll<HTMLElement>('button, a[href], input, select, [tabindex="0"]');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const resize = () => { if (desktop.matches) onCloseMobile(); };
    document.addEventListener('keydown', keydown); desktop.addEventListener('change', resize);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); desktop.removeEventListener('change', resize); previous?.focus(); };
  }, [isOpenMobile, onCloseMobile]);


  const navItems = [
    { id: 'dashboard' as NavTab, label: language === 'lo' ? 'ໜ້າຫຼັກ (Home)' : 'Home Dashboard', icon: LayoutDashboard },
    { id: 'stores' as NavTab, label: t.navStores, icon: Store },
    { id: 'coverage' as NavTab, label: language==='lo'?'Coverage ຢ້ຽມຢາມຮ້ານ':'Visit Coverage', icon: ClipboardCheck },
    {
      id: 'tasks' as NavTab,
      label: t.navTasks,
      icon: CheckSquare,
      badge: overdueTasksCount > 0 ? overdueTasksCount : undefined
    },
    { id: 'promotions' as NavTab, label: t.navPromotions, icon: Tag },
    {
      id: 'newProducts' as NavTab,
      label: language === 'lo' ? 'ຕິດຕາມສິນຄ້າໃໝ່' : 'New Products',
      icon: PackagePlus,
      badge: 'NPD'
    },
    { id: 'tracking' as NavTab, label: t.navTracking, icon: TrendingUp },
    {
      id: 'users' as NavTab,
      label: language === 'lo' ? 'ຈັດການຜູ້ໃຊ້' : 'User Management',
      icon: Users,
      badge: currentUser.role === 'admin' ? 'Admin' : undefined
    },
    { id: 'excel' as NavTab, label: t.navExcel, icon: FileSpreadsheet },
    { id: 'more' as NavTab, label: language === 'lo' ? 'ຕັ້ງຄ່າ' : 'Settings', icon: Settings }
  ];

  const handleSelect = (id: NavTab) => {
    triggerHaptic('light');
    onSelectTab(id);
    onCloseMobile();
  };

  const lao=language==='lo';
  const visibleItems=navItems.filter(item=>currentUser.role==='admin'||!['users','more','dbReview','excel'].includes(item.id));
  const groups=[
    {title:lao?'ວຽກປະຈຳວັນ':'YOUR WORKDAY',ids:['dashboard','stores','coverage','tasks']},
    {title:lao?'ໂປຣໂມຊັ່ນ ແລະ ການຂາຍ':'CAMPAIGNS & SALES',ids:['promotions','newProducts','tracking']},
    {title:lao?'ການຈັດການ':'ADMINISTRATION',ids:['users','excel','more']}
  ];
  const accountLabel=connected?(lao?'ບັນຊີ':'Account'):t.switchAccount;
  const openAccount=()=>{triggerHaptic('light');onCloseMobile();onOpenSwitchUser();};
  return <>
    {isOpenMobile&&<button type="button" aria-label={lao?'ປິດເມນູ':'Close navigation backdrop'} onClick={onCloseMobile} className="sidebar-backdrop fixed inset-0 z-50 lg:hidden"/>}
    <aside ref={panel} id="app-navigation" role={isOpenMobile?'dialog':undefined} aria-modal={isOpenMobile||undefined} aria-label={lao?'ເມນູນຳທາງ':'Navigation'}
      className={`app-sidebar premium-sidebar fixed bottom-0 left-0 transition-transform duration-300 lg:translate-x-0 lg:visible ${isOpenMobile?'translate-x-0 visible':'-translate-x-full invisible'}`}>
      <header className="sidebar-brand-header">
        <div className="sidebar-brand-line">
          <BrandLogo branding={branding} size="lg" className="sidebar-brand-logo"/>
          <div className="sidebar-brand-copy"><span>{currentUser.role==='admin'?'ADMIN WORKSPACE':'MDE WORKSPACE'}</span><strong>{branding.appName}</strong></div>
          <button ref={closeButton} type="button" aria-label={lao?'ປິດເມນູ':'Close navigation'} onClick={onCloseMobile} className="sidebar-close lg:hidden"><X size={20}/></button>
        </div>
        <div className="sidebar-header-caption"><span className="sidebar-caption-line"/>{lao?'ເມນູນຳທາງ':'Your workspace, one tap away'}</div>
      </header>
      <nav className="sidebar-navigation" aria-label={lao?'ລາຍການເມນູ':'Workspace menu'}>
        {groups.map(group=>{
          const items=visibleItems.filter(item=>group.ids.includes(item.id));
          if(!items.length)return null;
          return <section key={group.ids[0]} className="sidebar-nav-group"><h2>{group.title}</h2><div className="sidebar-nav-links">{items.map(item=>{
            const Icon=item.icon,active=currentTab===item.id;
            return <button type="button" key={item.id} onClick={()=>handleSelect(item.id)} aria-current={active?'page':undefined} className={`sidebar-nav-link ${active?'is-active':''}`}>
              <span className="sidebar-nav-icon"><Icon size={19} strokeWidth={1.8}/></span><span className="sidebar-nav-label">{item.label}</span>
              {item.badge!==undefined&&<span className={`sidebar-nav-badge ${item.badge==='NPD'?'is-npd':''}`}>{item.badge}</span>}
              {active&&<ChevronRight size={16} className="sidebar-nav-chevron" aria-hidden="true"/>}
            </button>;
          })}</div></section>;
        })}
      </nav>
      <footer className="sidebar-account-footer">
        <div className="sidebar-account-card">
          <button type="button" className="sidebar-account-photo" aria-label={lao?'ເບິ່ງຮູບບັນຊີ':'View account photo'} onClick={openAccount}><img src={avatarFor(currentUser)} alt={currentUser.fullName}/></button>
          <button type="button" className="sidebar-account-open" aria-label={accountLabel} onClick={openAccount}>
            <span className="sidebar-account-copy"><strong>{currentUser.fullName}</strong><span><ShieldCheck size={12}/>{currentUser.role==='admin'?'Admin':'MDE'}<span className="sidebar-account-separator">·</span>{accountLabel}</span></span><ChevronRight size={18}/>
          </button>
        </div>
      </footer>
    </aside>
  </>;
};
