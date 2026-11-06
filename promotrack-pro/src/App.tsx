/**
 * Promotion Tracking & To-Do List PWA
 * 2026 Minimalist + Calm UI Mobile-First Web Application
 */

import React, { useState, useEffect } from 'react';
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
import { applyThemeColor } from './utils/themeColors';
import { dataService } from './services/dataService';
import { UserProfile, Language, Store, Promotion, PromotionStore, FollowUpTask, AppBranding, NewProductLaunch, NewProductStoreOrder } from './types';
import { registerServiceWorker } from './pwaRegister';
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
  const [selectedPromotionForTracking, setSelectedPromotionForTracking] = useState<string | undefined>();

  const isOnline = useOnlineStatus();

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

  const handleOpenTrackingForPromo = (promoId: string) => {
    setSelectedPromotionForTracking(promoId);
    setCurrentTab('tracking');
  };

  // Render Login Screen if user logged out
  if (!isAuthenticated) {
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
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] flex flex-col font-sans transition-colors duration-200">
      
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
      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-36 lg:pb-8">
        
        {/* Desktop Sidebar / Mobile Drawer */}
        <Sidebar
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
        <main className="flex-1 lg:pl-68 p-4 sm:p-6 lg:p-8 min-w-0">
          
          {/* Offline floating indicator banner */}
          {!isOnline && (
            <div className="mb-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 animate-pulse text-amber-600" />
                <span>Offline Mode: You can continue drafting updates and tasks. Changes are safely saved locally and will synchronize.</span>
              </div>
            </div>
          )}

          {/* Tab 1: Dashboard */}
          {currentTab === 'dashboard' && (
            <DashboardView
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

          {/* Tab 2: Store Management */}
          {currentTab === 'stores' && (
            <StoresView
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
          {currentTab === 'users' && (
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
          {currentTab === 'more' && (
            <MoreScreen
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
                dataService.logout();
                setIsAuthenticated(false);
              }}
            />
          )}

        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (5 tabs) */}
      <BottomNav
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

      {/* App Branding & Logo Customization Modal */}
      <AppBrandingModal
        isOpen={isBrandingModalOpen}
        onClose={() => setIsBrandingModalOpen(false)}
        language={language}
        onBrandingUpdated={(b) => {
          setAppBranding(b);
          loadData();
        }}
      />

      {/* Theme Color Customizer Modal */}
      <ThemeColorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        language={language}
        isDark={isDark}
        onThemeColorChanged={(colorId) => {
          applyThemeColor(colorId, isDark);
        }}
      />

      {/* Switch Demo User Modal */}
      <SwitchUserModal
        isOpen={isSwitchUserOpen}
        onClose={() => setIsSwitchUserOpen(false)}
        currentUser={currentUser}
        onSelectUser={(user) => {
          dataService.setCurrentUser(user);
          loadData();
        }}
        language={language}
      />

      {/* Supabase Architecture Review Modal */}
      <DatabaseReviewModal
        isOpen={isDbReviewOpen}
        onClose={() => setIsDbReviewOpen(false)}
        language={language}
      />

    </div>
  );
}
