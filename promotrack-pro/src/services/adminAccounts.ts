import { supabase } from './supabaseClient';
export async function manageMdeAccount(body: {operation:'create';email:string;name:string;password:string;mde_id:string;avatar_url?:string}|{operation:'password';user_id:string;password:string}) {
  const {data,error}=await supabase.functions.invoke('admin-mde-account',{body});
  if(error){
    let detail='';
    try{detail=(await error.context?.json())?.error||'';}catch{/* Network or unavailable function. */}
    throw new Error(detail||'Account server unavailable. Ask the administrator to deploy admin-mde-account in Supabase.');
  }
  if(!data?.success)throw new Error(data?.error||'Could not save the account.');
}
