// Dependencies are supplied by the Edge runtime; passwords are never logged or stored in app tables.
export function accountHandler(createClient: any, env: (key: string) => string | undefined) {
  const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
  return async (req: Request): Promise<Response> => {
    const reply=(status:number,body:object)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    if(req.method!=='POST')return reply(405,{error:'POST required'});
    const authorization=req.headers.get('Authorization');
    if(!authorization?.startsWith('Bearer '))return reply(401,{error:'Sign in required'});
    try {
      const url=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY');
      if(!url||!key)return reply(503,{error:'Account service is not configured'});
      const server=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
      const {data:auth,error:authError}=await server.auth.getUser(authorization.slice(7));
      if(authError||!auth.user)return reply(401,{error:'Sign in required'});
      const {data:actor,error:actorError}=await server.from('profiles').select('role').eq('id',auth.user.id).single();
      if(actorError||actor?.role!=='admin')return reply(403,{error:'Administrator access required'});
      if(Number(req.headers.get('content-length')||0)>7500000)return reply(413,{error:'Image is too large'});
      const raw=await req.text();if(raw.length>7500000)return reply(413,{error:'Image is too large'});
      let body;try{body=JSON.parse(raw);}catch{return reply(400,{error:'Invalid request'});}
      const {operation,password}=body;
      if(typeof password!=='string'||password.length<8||password.length>128)return reply(400,{error:'Password must contain 8–128 characters'});
      if(operation==='password') {
        if(typeof body.user_id!=='string'||body.user_id===auth.user.id)return reply(400,{error:'Select an MDE account'});
        const {data:target,error}=await server.from('profiles').select('role').eq('id',body.user_id).single();
        if(error||target?.role!=='sales')return reply(403,{error:'Only MDE passwords can be set here'});
        const changed=await server.auth.admin.updateUserById(body.user_id,{password});
        if(changed.error)return reply(400,{error:changed.error.message});
        return reply(200,{success:true});
      }
      if(operation!=='create')return reply(400,{error:'Unknown operation'});
      const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
      const name=typeof body.name==='string'?body.name.trim():'';
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!name||name.length>120)return reply(400,{error:'A valid email and MDE name are required'});
      const {data:mde,error:mdeError}=await server.from('mdes').select('id').eq('id',body.mde_id).single();
      if(mdeError||!mde)return reply(400,{error:'Select an existing MDE outlet group'});
      const avatar=body.avatar_url||null;
      if(avatar!==null&&(typeof avatar!=='string'||avatar.length>7000000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar)))return reply(400,{error:'Use a PNG, JPEG or WebP photo up to 5 MB'});
      const created=await server.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name}});
      if(created.error||!created.data.user)return reply(400,{error:created.error?.message||'Could not create account'});
      const id=created.data.user.id;
      const saved=await server.rpc('app_provision_mde_account',{account_id:id,account_email:email,account_name:name,assigned_mde:mde.id,account_avatar:avatar});
      if(saved.error){
        const cleanup=await server.auth.admin.deleteUser(id);
        return reply(500,{error:cleanup.error?'Account setup incomplete. Contact the administrator before retrying.':'Account setup failed; the new sign-in was rolled back. Please retry.'});
      }
      return reply(200,{success:true,user_id:id});
    }catch{return reply(500,{error:'Account service failed. Please retry.'});}
  };
}
