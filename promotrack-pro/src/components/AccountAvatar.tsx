import React from 'react';
import { avatarFor } from '../utils/avatar';

export function AccountAvatar({name,url,large=false}:{name:string;url?:string;large?:boolean}) {
  const fallback=avatarFor({fullName:name});
  return <img src={url||fallback} alt={name} className={`account-avatar ${large?'account-avatar-large':''}`} onError={event=>{if(event.currentTarget.src!==fallback)event.currentTarget.src=fallback;}}/>;
}
