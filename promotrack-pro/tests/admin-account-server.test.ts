import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountHandler } from '../supabase/functions/admin-mde-account/handler';
function setup(role='admin',failedSave=false) {
  const calls:string[]=[];
  const client={
    auth:{getUser:async(token:string)=>({data:{user:token==='valid'?{id:'admin'}:null},error:null}),admin:{
      createUser:async(input:any)=>{calls.push('create');assert.equal(input.email_confirm,true);return {data:{user:{id:'new-user'}},error:null};},
      deleteUser:async()=>{calls.push('rollback');return {error:null};},
      updateUserById:async()=>{calls.push('password');return {error:null};}}},
    from:(table:string)=>({select:()=>({eq:(_:string,id:string)=>({single:async()=>({data:table==='mdes'?{id}:id==='admin'?{role}:{role:id==='other-admin'?'admin':'sales'},error:null})})})}),
    rpc:async()=>{calls.push('provision');return {error:failedSave?{message:'db failure'}:null};}
  };
  const handler=accountHandler(()=>client,()=> 'configured');
  const request=(body:any,token='valid')=>handler(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)}));
  return {calls,request};
}
const create={operation:'create',email:'mde@example.invalid',name:'B1 colleague',password:'test-only-strong-password',mde_id:'b1'};
test('account server rejects expired sessions and Sales before any Auth mutation',async()=>{
  let s=setup();assert.equal((await s.request(create,'expired')).status,401);assert.deepEqual(s.calls,[]);
  s=setup('sales');assert.equal((await s.request(create)).status,403);assert.deepEqual(s.calls,[]);
});
test('Admin creates verified sign-in then profile; failed provisioning rolls Auth back',async()=>{
  let s=setup();const response=await s.request(create);assert.equal(response.status,200);assert.deepEqual(s.calls,['create','provision']);assert(!JSON.stringify(await response.json()).includes(create.password));
  s=setup('admin',true);assert.equal((await s.request(create)).status,500);assert.deepEqual(s.calls,['create','provision','rollback']);
});
test('server validates password/photo and protects Admin credentials from MDE reset',async()=>{
  const s=setup();assert.equal((await s.request({...create,password:'short'})).status,400);
  assert.equal((await s.request({...create,avatar_url:'https://example.test/photo.svg'})).status,400);
  assert.equal((await s.request({operation:'password',user_id:'other-admin',password:create.password})).status,403);
  assert.equal((await s.request({operation:'password',user_id:'admin',password:create.password})).status,400);
  assert.deepEqual(s.calls,[]);
  assert.equal((await s.request({operation:'password',user_id:'sales-user',password:create.password})).status,200);assert.deepEqual(s.calls,['password']);
});
