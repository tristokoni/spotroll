import {NextResponse} from 'next/server';import {auth,err} from '@/lib/server';
const ok=(data:unknown)=>NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
const name=(value:unknown)=>typeof value==='string'?value.trim().replace(/^@+/,''):'';
const pair=(a:string,b:string)=>`and(requester_id.eq.${a},recipient_id.eq.${b}),and(requester_id.eq.${b},recipient_id.eq.${a})`;
export async function GET(req:Request){
 const a=await auth(req);if(!a)return err('Prihlás sa.',401);
 const query=new URL(req.url).searchParams.get('username');
 if(query!==null){
  const username=name(query);if(username.length<2||username.length>30)return err('Zadaj celé používateľské meno (2 až 30 znakov).');
  const{data:p,error}=await a.s.from('profiles').select('id,username').eq('username_key',username.toLowerCase()).eq('banned',false).maybeSingle();if(error)return err('Hľadanie zlyhalo.',500);if(!p)return ok({person:null});
  if(p.id===a.id)return ok({person:p,self:true,relationship:null});
  const{data:r,error:re}=await a.s.from('friendships').select('id,requester_id,status,updated_at').or(pair(a.id,p.id)).maybeSingle();if(re)return err('Hľadanie zlyhalo.',500);
  return ok({person:p,self:false,relationship:r?{id:r.id,status:r.status,outgoing:r.requester_id===a.id,updated_at:r.updated_at}:null});
 }
 const{data:rows,error}=await a.s.from('friendships').select('*').or(`requester_id.eq.${a.id},recipient_id.eq.${a.id}`).in('status',['pending','accepted']).order('created_at',{ascending:false});if(error)return err('Kamarátov sa nepodarilo načítať.',500);
 const ids=[...new Set((rows||[]).map(r=>r.requester_id===a.id?r.recipient_id:r.requester_id))];
 const{data:profiles,error:pe}=ids.length?await a.s.from('profiles').select('id,username,banned').in('id',ids):{data:[],error:null};if(pe)return err('Profily sa nepodarilo načítať.',500);
 return ok({items:(rows||[]).map(r=>{const p=profiles?.find(p=>p.id===(r.requester_id===a.id?r.recipient_id:r.requester_id));return{id:r.id,status:r.status,outgoing:r.requester_id===a.id,username:p&&!p.banned?p.username:'Nedostupný používateľ',available:!!p&&!p.banned,created_at:r.created_at}})});
}
export async function POST(req:Request){
 const a=await auth(req);if(!a)return err('Prihlás sa.',401);const body=await req.json().catch(()=>null);const username=name(body?.username);if(username.length<2||username.length>30)return err('Zadaj celé používateľské meno.');
 const{data:p,error:pe}=await a.s.from('profiles').select('id').eq('username_key',username.toLowerCase()).eq('banned',false).maybeSingle();if(pe)return err('Hľadanie zlyhalo.',500);if(!p)return err('Používateľ sa nenašiel.',404);if(p.id===a.id)return err('Sám seba si pridať nemôžeš.');
 const{data:existing,error:ee}=await a.s.from('friendships').select('*').or(pair(a.id,p.id)).maybeSingle();if(ee)return err('Odoslanie zlyhalo.',500);
 if(existing?.status==='accepted')return err('Už ste kamaráti.',409);
 if(existing?.status==='pending')return err(existing.requester_id===a.id?'Žiadosť už čaká na prijatie.':'Tento používateľ ti už poslal žiadosť. Prijmi ju v prijatých žiadostiach.',409);
 if(existing&&Date.now()-Date.parse(existing.updated_at)<864e5)return err('Novú žiadosť tomuto používateľovi môžeš poslať po 24 hodinách.',429);
 const{count,error:ce}=await a.s.from('friendships').select('id',{count:'exact',head:true}).eq('requester_id',a.id).gte('updated_at',new Date(Date.now()-864e5).toISOString());if(ce)return err('Odoslanie zlyhalo.',500);if((count||0)>=20)return err('Denne môžeš poslať najviac 20 žiadostí.',429);
 if(existing){const{data,error}=await a.s.from('friendships').update({requester_id:a.id,recipient_id:p.id,status:'pending',created_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',existing.id).eq('status',existing.status).eq('updated_at',existing.updated_at).select('id').maybeSingle();if(error||!data)return err('Stav žiadosti sa zmenil. Obnov zoznam.',409);}else{const{error}=await a.s.from('friendships').insert({requester_id:a.id,recipient_id:p.id});if(error)return err(error.code==='23505'?'Medzi vami už existuje žiadosť. Obnov zoznam.':'Odoslanie zlyhalo.',error.code==='23505'?409:500);}
 return ok({ok:true});
}
export async function PATCH(req:Request){
 const a=await auth(req);if(!a)return err('Prihlás sa.',401);const b=await req.json().catch(()=>null);if(typeof b?.id!=='string'||!['accept','decline','cancel','remove'].includes(b.action))return err('Neplatná akcia.');
 const{data:r,error:re}=await a.s.from('friendships').select('*').eq('id',b.id).maybeSingle();if(re)return err('Neplatná žiadosť.');if(!r||![r.requester_id,r.recipient_id].includes(a.id))return err('Žiadosť nie je tvoja.',403);
 if(b.action==='remove'){
  if(r.status!=='accepted')return err('Nie ste kamaráti.',409);
  const{data,error}=await a.s.from('friendships').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('id',r.id).eq('status','accepted').select('id').maybeSingle();return error?err('Odstránenie zlyhalo.',500):data?ok({ok:true}):err('Stav sa zmenil. Obnov zoznam.',409);
 }
 if(r.status!=='pending')return err('Žiadosť už nie je aktuálna.',409);
 if((b.action==='cancel'&&r.requester_id!==a.id)||(b.action!=='cancel'&&r.recipient_id!==a.id))return err('Túto akciu nemôžeš vykonať.',403);
 if(b.action==='accept'){const{data:p}=await a.s.from('profiles').select('id').eq('id',r.requester_id).eq('banned',false).maybeSingle();if(!p)return err('Používateľ nie je dostupný.',409);}
 const status=b.action==='accept'?'accepted':b.action==='decline'?'declined':'cancelled';
 const{data,error}=await a.s.from('friendships').update({status,updated_at:new Date().toISOString()}).eq('id',r.id).eq('status','pending').select('id').maybeSingle();return error?err('Zmena zlyhala.',500):data?ok({ok:true}):err('Stav sa zmenil. Obnov zoznam.',409);
}
