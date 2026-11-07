// @ts-ignore Deno resolves the pinned package in the server runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.119.0';
import { accountHandler } from './handler.ts';
// @ts-ignore Deno is supplied by Supabase Edge Functions.
Deno.serve(accountHandler(createClient, key => Deno.env.get(key)));
