/**
 * Promotion Tracking & To-Do List PWA
 * 2026 Minimalist + Calm UI Mobile-First Web Application
 */

import React, { useState, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseEnabled, projectRef } from './services/supabaseClient';
import { SupabaseSync, type SyncState } from './services/supabaseSync';
import { SupabaseSignIn } from './components/SupabaseSignIn';
import { AccountDialog } from './components/AccountDialog';
import { RemoteAccountsView } from './components/RemoteAccountsView';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { StoresView } from './components/StoresView';
import { PromotionsView } from './components/PromotionsView';
import { OrderTrackingView } from './components/OrderTrackingView';
import { TodoListView } from './components/TodoListView';
import { ExcelModuleView } from './components/ExcelModuleView';
import { MoreScreen } from './components/MoreScreen';
import { LoginScreen } from './components/LoginScreen';
import { DatabaseReviewModal } from './components/DatabaseReviewModal';
import { SwitchUserModal } from './components/SwitchUserModal';
import { AppBrandingModal } from './components/AppBrandingModal';
import { ThemeColorModal } from './components/ThemeColorModal';
import { UserManagementView } from './components/UserManagementView';
import { NewProductsView } from './components/NewProductsView';
import { SubChannelManager } from './components/SubChannelManager';
import { applyThemeColor } from './utils/themeColors';
import { dataService } from './services/dataService';
import { UserProfile, Language, Store, Promotion, PromotionStore, FollowUpTask, AppBranding, NewProductLaunch, NewProductStoreOrder } from './types';
import { registerServiceWorker } from './pwaRegister';
import { CoverageView } from './components/CoverageView';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<UserProfile>(dataService.getCurrentUser());
  const [appBranding, setAppBranding] = useState<AppBranding>(dataService.getAppBranding());
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('promotrack_lang');
      return (saved as Language) || 'lo';
    } catch {
      return 'lo';
    }
  });
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('promotrack_theme');
      return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Data collections
  const [stores, setStores] = useState<Store[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promoStores, setPromoStores] = useState<PromotionStore[]>([]);
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [salesReps, setSalesReps] = useState<UserProfile[]>([]);
  const [newProducts, setNewProducts] = useState<NewProductLaunch[]>([]);
  const [newProductStoreOrders, setNewProductStoreOrders] = useState<NewProductStoreOrder[]>([]);

  // Navigation & Modal triggers
  const [isOpenMobileMenu, setIsOpenMobileMenu] = useState(false);
  const [isSwitchUserOpen, setIsSwitchUserOpen] = useState(false);
  const [isDbReviewOpen, setIsDbReviewOpen] = useState(false);
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isSubChannelManagerOpen, setIsSubChannelManagerOpen] = useState(false);
  const [selectedPromotionForTracking, setSelectedPromotionForTracking] = useState<string | undefined>();

  const isOnline = useOnlineStatus();
  const [authReady, setAuthReady] = useState(!supabaseEnabled);
  const [session, setSession] = useState<Session | null>(null);
  const [syncState, setSyncState] = useState<SyncState>({ status: 'loading' });
  const sync = useRef<SupabaseSync | null>(null);

  useEffect(() => {
    if (!supabaseEnabled) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => { if (active) { setSession(data.session); setAuthReady(true); } });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { if (active) { setSession(next); setAuthReady(true); } });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabaseEnabled || !session?.user.id) return;
    setSyncState({ status: 'loading' });
    const connection = new SupabaseSync(supabase, projectRef, session.user.id, (state) => {
      setSyncState(state); if (state.user) setCurrentUser(state.user);
    });
    sync.current = connection;
    void connection.start();
    return () => { connection.stop(); if (sync.current === connection) sync.current = null; };
  }, [session?.user.id]);

  const signOut = () => supabase.auth.signOut({ scope: 'local' }).then(({ error }) => {
    if (error) setSyncState((state) => ({ ...state, status: 'error', message: error.message }));
  });

  // Initialize and register PWA service worker
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Sync Dark mode class on html/body & active theme color
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('promotrack_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('promotrack_theme', 'light');
    }
    applyThemeColor(dataService.getThemeColor(), isDark);
  }, [isDark]);

  // Save language preference
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('promotrack_lang', lang);
  };

  // Load and refresh state from dataService
  const loadData = () => {
    setCurrentUser(dataService.getCurrentUser());
    setAppBranding(dataService.getAppBranding());
    setStores(dataService.getStores());
    setPromotions(dataService.getPromotions());
    setPromoStores(dataService.getPromotionStores());
    setTasks(dataService.getTasks());
    setSalesReps(dataService.getSalesReps());
    setNewProducts(dataService.getNewProducts());
    setNewProductStoreOrders(dataService.getNewProductStoreOrders());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = dataService.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  // Overdue tasks count for notification badges
  const overdueTasksCount = tasks.filter((task) => {
    if (task.taskStatus === 'Completed' || task.taskStatus === 'Cancelled') return false;
    const due = new Date(task.dueDate).getTime();
    return due < Date.now();
  }).length;

  const [selectedNewProduct, setSelectedNewProduct] = useState<{productId:string;storeId?:string}>();
  useEffect(() => { if(currentTab !== 'newProducts') setSelectedNewProduct(undefined); }, [currentTab]);
  const handleOpenNewProductOrders = (productId:string, storeId?:string) => {
    setSelectedNewProduct({productId,storeId});setCurrentTab('newProducts');
  };

  const handleOpenTrackingForPromo = (promoId: string) => {
    setSelectedPromotionForTracking(promoId);
    setCurrentTab('tracking');
  };

  if (supabaseEnabled) {
    if (!authReady) return <main className="min-h-screen flex items-center justify-center p-6">{language === 'lo' ? 'ກຳລັງໂຫຼດ…' : 'Loading…'}</main>;
    if (!session) return <SupabaseSignIn language={language} />;
    if (!syncState.user) return <main className="min-h-screen flex items-center justify-center p-6"><section className="calm-card rounded-3xl p-6 space-y-4 max-w-lg">
      <h1 className="font-bold">{language === 'lo' ? 'ກຳລັງເຊື່ອມຂໍ້ມູນ…' : 'Connecting your account…'}</h1>
      {syncState.status === 'error' && <><p role="alert">{syncState.message}</p><button onClick={() => { sync.current?.stop(); const connection = new SupabaseSync(supabase, projectRef, session.user.id, (state) => { setSyncState(state); if (state.user) setCurrentUser(state.user); }); sync.current = connection; void connection.start(); }} className="rounded-xl border p-3">{language === 'lo' ? 'ລອງໃໝ່' : 'Retry'}</button></>}
      <button onClick={signOut} className="block underline">{language === 'lo' ? 'ອອກຈາກລະບົບ' : 'Sign out'}</button>
    </section></main>;
    if (syncState.user.role === 'sales' && !syncState.user.mdeId) return <main className="min-h-screen flex items-center justify-center p-6"><section className="calm-card rounded-3xl p-6 max-w-md space-y-4">
      <h1 className="font-bold">{language === 'lo' ? 'ລໍຖ້າ Admin ມອບໝາຍ MDE' : 'Waiting for an MDE assignment'}</h1>
      <p className="text-sm break-all">{syncState.user.email}</p><p className="text-sm">{language === 'lo' ? 'ໃຫ້ Admin ເລືອກ MDE ໃຫ້ບັນຊີນີ້ໃນໜ້າຈັດການຜູ້ໃຊ້.' : 'Ask Admin to assign your MDE in User Management.'}</p>
      <button onClick={() => void sync.current?.reload()} className="rounded-xl border p-3">{language === 'lo' ? 'ໂຫຼດໃໝ່' : 'Refresh'}</button><button onClick={signOut} className="block underline">{language === 'lo' ? 'ອອກຈາກລະບົບ' : 'Sign out'}</button>
    </section></main>;
  }

  // Local mode remains available only when Supabase is explicitly disabled.
  if (!isAuthenticated && !supabaseEnabled) {
    return (
      <LoginScreen
        language={language}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          loadData();
        }}
      />
    );
  }

  return (
    <div className="app-shell min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] flex flex-col font-sans transition-colors duration-200">
      {supabaseEnabled && <div role="status" className={`connection-status ${syncState.status === 'offline' ? 'connection-status-offline' : 'connection-status-online'} px-4 py-2 text-xs text-center bg-[var(--color-surface-secondary)]`}>
        {syncState.status === 'offline' ? (language === 'lo' ? 'Offline: ການແກ້ໄຂເກັບໃນເຄື່ອງ ຈົນກວ່າຈະເຊື່ອມຕໍ່.' : 'Offline: edits stay on this device until reconnected.') : (language === 'lo' ? 'ເຊື່ອມຕໍ່ Supabase' : 'Connected to Supabase')}
      </div>}
      {supabaseEnabled && (syncState.status === 'saving' || syncState.status === 'loading' || syncState.status === 'error') && <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4"><section role={syncState.status === 'error' ? 'alertdialog' : 'status'} aria-modal="true" className="calm-card rounded-3xl max-w-lg p-5 space-y-4">
        <h2 className="font-bold">{syncState.status === 'loading' ? (language === 'lo' ? 'ກຳລັງໂຫຼດ…' : 'Refreshing…') : syncState.status === 'saving' ? (language === 'lo' ? 'ກຳລັງບັນທຶກ…' : 'Saving…') : (language === 'lo' ? 'ກວດການບັນທຶກຂໍ້ມູນ' : 'Changes need attention')}</h2>
        {syncState.status === 'error' && <><p className="text-sm">{syncState.message}</p><p className="text-xs">{language === 'lo' ? 'ການແກ້ໄຂທີ່ຍັງບໍ່ໄດ້ບັນທຶກ ຍັງເກັບໃນເຄື່ອງ. ການໂຫຼດຈາກຖານຂໍ້ມູນຈະເກັບ draft ສຳຮອງໄວ້.' : 'Unsaved edits are retained on this device. Reloading the database keeps a draft backup.'}</p><div className="flex gap-2 flex-wrap">
          <button className="rounded-xl border p-3" onClick={() => void sync.current?.flush()}>{language === 'lo' ? 'ລອງບັນທຶກໃໝ່' : 'Retry save'}</button><button className="rounded-xl border p-3" onClick={() => void sync.current?.reload()}>{language === 'lo' ? 'ໂຫຼດຈາກຖານຂໍ້ມູນ' : 'Reload database'}</button>
        </div></>}
      </section></div>}
      
      {/* Top Navbar with App Branding */}
      <Navbar
        currentUser={currentUser}
        appBranding={appBranding}
        language={language}
        onLanguageChange={handleLanguageChange}
        isDark={isDark}
        onThemeToggle={() => setIsDark((prev) => !prev)}
        onToggleMobileMenu={() => setIsOpenMobileMenu((prev) => !prev)}
        onOpenSwitchUser={() => setIsSwitchUserOpen(true)}
        onOpenDbReview={() => setIsDbReviewOpen(true)}
        onOpenBrandingModal={() => setIsBrandingModalOpen(true)}
      />

      {/* Main Body with Sidebar + Content View */}
      <div className="app-body flex-1 flex w-full lg:pb-8">
        
        {/* Desktop Sidebar / Mobile Drawer */}
        <Sidebar
          connected={supabaseEnabled}
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'dbReview') {
              setIsDbReviewOpen(true);
            } else {
              setCurrentTab(tab);
            }
          }}
          currentUser={currentUser}
          language={language}
          overdueTasksCount={overdueTasksCount}
          isOpenMobile={isOpenMobileMenu}
          onCloseMobile={() => setIsOpenMobileMenu(false)}
          onOpenSwitchUser={() => setIsSwitchUserOpen(true)}
        />

        {/* View Content Area */}
        <main key={currentTab} className="app-content flex-1 lg:pl-68 p-4 sm:p-6 lg:p-8 min-w-0">
          
          {/* Offline floating indicator banner */}
          {!isOnline && (
            <div className="mb-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 animate-pulse text-amber-600" />
                <span>Offline Mode: You can continue drafting updates and tasks. Changes are saved in this browser.</span>
              </div>
            </div>
          )}

          {/* Tab 1: Dashboard */}
          {currentTab === 'dashboard' && (
            <DashboardView
              newProducts={newProducts}
              newProductOrders={newProductStoreOrders}
              onOpenNewProductOrders={handleOpenNewProductOrders}
              stores={stores}
              promotions={promotions}
              promoStores={promoStores}
              tasks={tasks}
              salesReps={salesReps}
              currentUser={currentUser}
              language={language}
              onNavigateTab={(tab) => setCurrentTab(tab as NavTab)}
              onRefreshData={loadData}
            />
          )}

          {currentTab==='coverage'&&<CoverageView stores={stores} mdes={salesReps} user={currentUser} language={language}
            promotions={promotions} promoStores={promoStores} products={newProducts} productOrders={newProductStoreOrders}
            onOpenPromotion={handleOpenTrackingForPromo} onOpenProduct={handleOpenNewProductOrders}/>}

          {/* Tab 2: Store Management */}
          {currentTab === 'stores' && (
            <StoresView
              onManageSubChannels={() => setIsSubChannelManagerOpen(true)}
              stores={stores}
              promotions={promotions}
              promoStores={promoStores}
              salesReps={salesReps}
              channels={dataService.getChannels()}
              subChannels={dataService.getSubChannels()}
              currentUser={currentUser}
              language={language}
              onRefreshData={loadData}
              onNavigateTab={(tab) => setCurrentTab(tab as NavTab)}
            />
          )}

          {/* Tab 3: Promotions Management */}
          {currentTab === 'promotions' && (
            <PromotionsView
              promotions={promotions}
              stores={stores}
              promoStores={promoStores}
              currentUser={currentUser}
              language={language}
              onRefreshData={loadData}
              onOpenTracking={handleOpenTrackingForPromo}
            />
          )}

          {/* Tab: New Product Launches & Order Tracking */}
          {currentTab === 'newProducts' && (
            <NewProductsView
              initialProductId={selectedNewProduct?.productId}
              initialStoreId={selectedNewProduct?.storeId}
              onManageSubChannels={() => setIsSubChannelManagerOpen(true)}
              newProducts={newProducts}
              storeOrders={newProductStoreOrders}
              stores={stores}
              currentUser={currentUser}
              language={language}
              onRefreshData={loadData}
              onNavigateTab={(tab) => setCurrentTab(tab as NavTab)}
            />
          )}

          {/* Tab 4: Order Tracking */}
          {currentTab === 'tracking' && (
            <OrderTrackingView
              promotions={promotions}
              stores={stores}
              promoStores={promoStores}
              salesReps={salesReps}
              currentUser={currentUser}
              language={language}
              initialPromotionId={selectedPromotionForTracking}
              onRefreshData={loadData}
              onNavigateTab={(tab) => setCurrentTab(tab as NavTab)}
            />
          )}

          {/* Tab 5: To-Do List */}
          {currentTab === 'tasks' && (
            <TodoListView
              newProducts={newProducts}
              newProductOrders={newProductStoreOrders}
              onOpenNewProductOrders={handleOpenNewProductOrders}
              tasks={tasks}
              stores={stores}
              promotions={promotions}
              salesReps={salesReps}
              currentUser={currentUser}
              language={language}
              onRefreshData={loadData}
              onNavigateTab={(tab) => setCurrentTab(tab as NavTab)}
            />
          )}

          {/* Tab 6: Excel Import & Export Center */}
          {currentTab === 'excel' && (
            <ExcelModuleView
              stores={stores}
              currentUser={currentUser}
              language={language}
              onRefreshData={loadData}
              onNavigateTab={(tab) => setCurrentTab(tab as NavTab)}
            />
          )}

          {/* Tab 7: User Management System (Admin Only) */}
          {currentTab === 'users' && currentUser.role === 'admin' && (
            supabaseEnabled ? <RemoteAccountsView currentUser={currentUser} language={language} onRefresh={async () => { await sync.current?.reload(); }} /> :
            <UserManagementView
              currentUser={currentUser}
              language={language}
              stores={stores}
              onRefreshData={loadData}
              onNavigateTab={(tab) => setCurrentTab(tab as NavTab)}
              onOpenSwitchUser={() => setIsSwitchUserOpen(true)}
            />
          )}

          {/* Tab 8: More Settings Screen (5th Bottom Nav Tab) */}
          {currentTab === 'more' && currentUser.role === 'admin' && (
            <MoreScreen
              connected={supabaseEnabled}
              currentUser={currentUser}
              appBranding={appBranding}
              language={language}
              onLanguageChange={handleLanguageChange}
              isDark={isDark}
              onThemeToggle={() => setIsDark((prev) => !prev)}
              onOpenSwitchUser={() => setIsSwitchUserOpen(true)}
              onOpenDbReview={() => setIsDbReviewOpen(true)}
              onOpenExcelCenter={() => setCurrentTab('excel')}
              onOpenBrandingModal={() => setIsBrandingModalOpen(true)}
              onOpenThemeColorModal={() => setIsThemeModalOpen(true)}
              onNavigateTab={(tab) => setCurrentTab(tab as NavTab)}
              onLogout={() => {
                if (supabaseEnabled) { signOut(); return; }
                dataService.logout();
                setIsAuthenticated(false);
              }}
            />
          )}

        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (5 tabs) */}
      <BottomNav
        isAdmin={currentUser.role === 'admin'}
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'dbReview') {
            setIsDbReviewOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        language={language}
        overdueTasksCount={overdueTasksCount}
      />

      {/* Admin Sub-channel management */}
      {isSubChannelManagerOpen && currentUser.role === 'admin' && (
        <SubChannelManager language={language} onClose={() => setIsSubChannelManagerOpen(false)} onRefreshData={loadData} />
      )}

      {/* App Branding & Logo Customization Modal */}
      <AppBrandingModal
        isOpen={isBrandingModalOpen && currentUser.role === 'admin'}
        onClose={() => setIsBrandingModalOpen(false)}
        language={language}
        onBrandingUpdated={(b) => {
          setAppBranding(b);
          loadData();
        }}
      />

      {/* Theme Color Customizer Modal */}
      <ThemeColorModal
        isOpen={isThemeModalOpen && currentUser.role === 'admin'}
        onClose={() => setIsThemeModalOpen(false)}
        language={language}
        isDark={isDark}
        onThemeColorChanged={(colorId) => {
          applyThemeColor(colorId, isDark);
        }}
      />

      {/* Switch Demo User Modal */}
      {supabaseEnabled && isSwitchUserOpen && <AccountDialog user={currentUser} language={language} onClose={()=>setIsSwitchUserOpen(false)} onSignOut={signOut}/>}
      {!supabaseEnabled && <SwitchUserModal
        isOpen={isSwitchUserOpen}
        onClose={() => setIsSwitchUserOpen(false)}
        currentUser={currentUser}
        onSelectUser={(user) => {
          dataService.setCurrentUser(user);
          loadData();
        }}
        language={language}
      />}

      {/* Supabase Architecture Review Modal */}
      <DatabaseReviewModal
        isOpen={isDbReviewOpen && currentUser.role === 'admin'}
        onClose={() => setIsDbReviewOpen(false)}
        language={language}
      />

    </div>
  );
}
