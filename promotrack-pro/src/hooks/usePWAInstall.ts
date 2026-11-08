import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Navbar and dashboard share one consumable browser install prompt. Capture it
// before sign-in too, so navigating to the dashboard cannot lose the event.
const listeners = new Set<() => void>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const inBrowser = typeof window !== 'undefined';
const standalone = () => inBrowser && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?:boolean}).standalone === true);
const isIOS = inBrowser && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
let state = { isInstallable: false, isInstalled: standalone(), isIOS };
const serverState = { isInstallable: false, isInstalled: false, isIOS: false };
const emit = (patch: Partial<typeof state>) => { state = {...state, ...patch}; listeners.forEach(listener => listener()); };
if (inBrowser) {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit({isInstallable: true});
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit({isInstalled: true, isInstallable: false});
  });
  window.matchMedia('(display-mode: standalone)').addEventListener('change', () => emit({isInstalled: standalone()}));
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const install = async () => {
  const prompt = deferredPrompt;
  if (!prompt) return false;
  // An event may be used only once, even if the user dismisses its prompt.
  deferredPrompt = null;
  emit({isInstallable: false});
  try {
    await prompt.prompt();
    return (await prompt.userChoice).outcome === 'accepted';
  } catch {
    return false;
  }
};
export function usePWAInstall() {
  return {...useSyncExternalStore(subscribe, () => state, () => serverState), install};
}
