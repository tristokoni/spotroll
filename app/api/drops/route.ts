import {NextResponse} from 'next/server';
import {auth,err} from '@/lib/server';
import {validCoordinates} from '@/lib/drops';
const uuid=(s:unknown):s is string=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const text=(s:unknown,max:number)=>typeof s==='string'?s.trim().slice(0,max):'';
const ok=(data:unknown)=>NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
const fields='id,creator_id,sender_id,recipient_id,kind,title,description,hint,latitude,longitude,status,pickup_note,created_at,updated_at,ready_at,collected_at,cancelled_at';
export async function GET(req:Request){
 const a=await auth(req);if(!a)return err('Prihlás sa.',401);
 const id=new URL(req.url).searchParams.get('id');if(id&&!uuid(id))return err('Neplatný odkaz.');
 let q=a.s.from('cache_drops').select(fields).or(`sender_id.eq.${a.id},recipient_id.eq.${a.id}`).order('created_at',{ascending:false});if(id)q=q.eq('id',id);
 const{data,error}=await q.limit(200);if(error)return err('Skrýše sa nepodarilo načítať.',500);if(id&&!data?.length)return err('Skrýša neexistuje alebo do nej nie si pozvaný.',404);
 const ids=[...new Set((data||[]).flatMap(d=>[d.sender_id,d.recipient_id]))];
 const{data:profiles,error:pe}=ids.length?await a.s.from('profiles').select('id,username').in('id',ids):{data:[],error:null};if(pe)return err('Používateľov sa nepodarilo načítať.',500);
 return ok({items:(data||[]).map(({creator_id,sender_id,recipient_id,...drop})=>({...drop,is_sender:sender_id===a.id,is_recipient:recipient_id===a.id,is_creator:creator_id===a.id,sender_name:profiles?.find(p=>p.id===sender_id)?.username||'Používateľ',recipient_name:profiles?.find(p=>p.id===recipient_id)?.username||'Používateľ'}))});
}
export async function POST(req:Request){
 const a=await auth(req);if(!a)return err('Prihlás sa.',401);const b=await req.json().catch(()=>null);
 if(!b||!['gift','request'].includes(b.kind))return err('Vyber vytvorenie skrýše alebo žiadosť.');
 const title=text(b.title,80),username=text(b.username,31).replace(/^@+/,'');
 if(title.length<2)return err('Názov musí mať aspoň 2 znaky.');if(username.length<2||username.length>30)return err('Zadaj celé používateľské meno.');if(!validCoordinates(b))return err('Zadaj platnú GPS polohu: šírka −90 až 90, dĺžka −180 až 180.');
 const{data:person,error:pe}=await a.s.from('profiles').select('id').eq('username_key',username.toLowerCase()).eq('banned',false).maybeSingle();if(pe)return err('Overenie používateľa zlyhalo.',500);if(!person)return err('Používateľ sa nenašiel.',404);if(person.id===a.id)return err('Pozvi iného používateľa.');
 const{count,error:ce}=await a.s.from('cache_drops').select('id',{count:'exact',head:true}).eq('creator_id',a.id).gte('created_at',new Date(Date.now()-864e5).toISOString());if(ce)return err('Vytvorenie zlyhalo.',500);if((count||0)>=20)return err('Denne môžeš vytvoriť najviac 20 skrýš alebo žiadostí.',429);
 const ready=b.kind==='gift';
 const{data,error}=await a.s.from('cache_drops').insert({creator_id:a.id,sender_id:ready?a.id:person.id,recipient_id:ready?person.id:a.id,kind:b.kind,title,description:text(b.description,1500),hint:text(b.hint,700),latitude:b.latitude,longitude:b.longitude,status:ready?'ready':'requested',ready_at:ready?new Date().toISOString():null}).select('id').single();
 return error?err('Skrýšu sa nepodarilo uložiť.',500):ok(data);
}
export async function PATCH(req:Request){
 const a=await auth(req);if(!a)return err('Prihlás sa.',401);const b=await req.json().catch(()=>null);
 if(!uuid(b?.id)||!['ready','collect','cancel'].includes(b?.action))return err('Neplatná akcia.');
 const{data:drop,error:de}=await a.s.from('cache_drops').select('id,sender_id,recipient_id,status').eq('id',b.id).or(`sender_id.eq.${a.id},recipient_id.eq.${a.id}`).maybeSingle();if(de)return err('Načítanie skrýše zlyhalo.',500);if(!drop)return err('Skrýša neexistuje alebo do nej nie si pozvaný.',404);
 if(['collected','cancelled'].includes(drop.status))return err('Táto odovzdávka je už ukončená.',409);
 const now=new Date().toISOString();let update:Record<string,unknown>={updated_at:now};
 if(b.action==='ready'){
  if(drop.sender_id!==a.id)return err('Skrýšu môže pripraviť iba určený používateľ.',403);if(drop.status!=='requested')return err('Skrýša je už pripravená.',409);if(!validCoordinates(b))return err('Zadaj platnú GPS polohu.');
  update={...update,status:'ready',latitude:b.latitude,longitude:b.longitude,hint:text(b.hint,700),ready_at:now};
 }else if(b.action==='collect'){
  if(drop.recipient_id!==a.id)return err('Vyzdvihnutie môže potvrdiť iba príjemca.',403);if(drop.status!=='ready')return err('Skrýša ešte nie je pripravená.',409);
  update={...update,status:'collected',collected_at:now,pickup_note:text(b.pickup_note,500)};
 }else update={...update,status:'cancelled',cancelled_at:now,cancelled_by:a.id};
 // Compare-and-set: simultaneous pickup/cancellation can never both succeed.
 const{data,error}=await a.s.from('cache_drops').update(update).eq('id',drop.id).eq('status',drop.status).select('id').maybeSingle();
 return error?err('Zmenu sa nepodarilo uložiť.',500):data?ok(data):err('Stav sa práve zmenil. Obnov skrýšu.',409);
}
