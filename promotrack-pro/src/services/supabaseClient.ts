import { createClient } from '@supabase/supabase-js';

// Browser publishable key supplied by the project owner. No management token or
// service-role credential belongs in this file or in a frontend build.
const projectUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://olvteqslbxwzifdfueug.supabase.co';
const publishableKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5UOeJzl8fE3XaWKQ7gvmsA_Qkj4O7Xx';
export const supabaseEnabled = import.meta.env?.VITE_SUPABASE_ENABLED !== 'false';
export const projectRef = new URL(projectUrl).hostname.split('.')[0];
if (publishableKey.startsWith('sb_secret_')) throw new Error('Use a publishable key in the browser.');
export const supabase = createClient(projectUrl, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal || AbortSignal.timeout(20000) }) }
});
