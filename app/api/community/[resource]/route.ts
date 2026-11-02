import {NextResponse} from 'next/server';
import {auth,err} from '@/lib/server';
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const text=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
const ok=(d:unknown)=>NextResponse.json(d,{headers:{'Cache-Control':'private, no-store'}});
const kinds=['access','water','condition','crowds','other'];
type Context={params:Promise<{resource:string}>};
export async function GET(req:Request,ctx:Context){
 const a=await auth(req);if(!a)return err('Prihlás sa.',401);
 const{resource}=await ctx.params;const id=new URL(req.url).searchParams.get('id');
 if(id&&!uuid(id))return err('Neplatný odkaz.');
 if(resource==='trips'||resource==='polls'){
  let q=a.s.from(resource).select('*');if(id)q=q.eq('id',id);else q=q.eq('owner_id',a.id);
  const{data,error}=await q.order('created_at',{ascending:false}).limit(100);if(error)return err('Načítanie zlyhalo.',500);
  const items=[];for(const row of data||[]){
   if(resource==='trips'&&row.owner_id!==a.id&&!row.shared)return err('Plán nie je zdieľaný.',403);
   const item:any={...row,own:row.owner_id===a.id};delete item.owner_id;
   if(resource==='polls'){
    const{data:v,error:ve}=await a.s.from('poll_votes').select('spot_id,user_id').eq('poll_id',row.id);if(ve)return err('Hlasy sa nepodarilo načítať.',500);
    item.counts=Object.fromEntries(row.spot_ids.map((s:string)=>[s,(v||[]).filter(x=>x.spot_id===s).length]));item.my_vote=v?.find(x=>x.user_id===a.id)?.spot_id||null;item.total=v?.length||0;
   }items.push(item);
  }if(id&&!items.length)return err('Odkaz už nie je dostupný.',404);return ok({items});
 }
 if(resource==='visits'){
  const{data,error}=await a.s.from('visits').select('*').eq('user_id',a.id).order('visited_on',{ascending:false}).limit(1000);if(error)return err('Denník sa nepodarilo načítať.',500);
  const items=await Promise.all((data||[]).map(async row=>{let photo_url=null;if(row.photo_path){const{data}=await a.s.storage.from('visit-photos').createSignedUrl(row.photo_path,3600);photo_url=data?.signedUrl||null;}const{user_id,photo_path,...rest}=row;return{...rest,photo_url};}));return ok({items});
 }
 if(resource==='tips'){
  let q=a.s.from('spot_tips').select('id,user_id,spot_id,category,body,hidden,created_at').order('created_at',{ascending:false}).limit(200);
  if(a.role!=='admin'){
   const{data:available,error:spotError}=await a.s.from('spots').select('id').eq('approved',true).eq('active',true).neq('visibility','hidden');if(spotError)return err('Načítanie miest zlyhalo.',500);if(!available?.length)return ok({items:[],can_moderate:false});
   q=q.in('spot_id',available.map(s=>s.id)).eq('hidden',false).gte('created_at',new Date(Date.now()-30*864e5).toISOString());
  }
  const{data,error}=await q;if(error)return err('Tipy sa nepodarilo načítať.',500);
  return ok({items:(data||[]).map(({user_id,...r})=>({...r,own:user_id===a.id})),can_moderate:a.role==='admin'});
 }return err('Neznáma sekcia.',404);
}
export async function POST(req:Request,ctx:Context){
 const a=await auth(req);if(!a)return err('Prihlás sa.',401);const{resource}=await ctx.params;
 const b=await req.json().catch(()=>null);if(!b||typeof b!=='object')return err('Neplatné údaje.');
 if(resource==='trips'||resource==='polls'){
  const title=text(b.title,80);const ids=Array.isArray(b.spot_ids)?[...new Set(b.spot_ids)]:[];
  if(title.length<2||ids.length<(resource==='polls'?2:1)||ids.length>(resource==='polls'?8:10)||!ids.every(uuid))return err('Vyplň názov a vyber platné miesta.');
  const{data:spots,error:se}=await a.s.from('spots').select('id').in('id',ids).eq('approved',true).eq('active',true).neq('visibility','hidden');if(se)return err('Overenie miest zlyhalo.',500);if(spots?.length!==ids.length)return err('Niektoré miesta už nie sú dostupné.');
  const row:any={title,spot_ids:ids};if(resource==='trips'){
   if(b.trip_date&&(!/^\d{4}-\d{2}-\d{2}$/.test(b.trip_date)||!Number.isFinite(Date.parse(b.trip_date))))return err('Neplatný dátum.');
   Object.assign(row,{notes:text(b.notes,2000),trip_date:b.trip_date||null,shared:b.shared===true});
  }
  if(b.id){if(resource!=='trips'||!uuid(b.id))return err('Neplatná úprava.');const{data,error}=await a.s.from('trips').update(row).eq('id',b.id).eq('owner_id',a.id).select('id').maybeSingle();return error?err('Uloženie zlyhalo.',500):data?ok(data):err('Plán neexistuje alebo nie je tvoj.',403);}
  const{data,error}=await a.s.from(resource).insert({...row,owner_id:a.id}).select('id').single();return error?err('Vytvorenie zlyhalo.',500):ok(data);
 }
 if(resource==='vote'){
  if(!uuid(b.poll_id)||!uuid(b.spot_id))return err('Neplatný hlas.');
  const{data:p}=await a.s.from('polls').select('closed,spot_ids').eq('id',b.poll_id).maybeSingle();if(!p)return err('Hlasovanie neexistuje.',404);if(p.closed)return err('Hlasovanie je uzavreté.',409);if(!p.spot_ids.includes(b.spot_id))return err('Neplatná možnosť.');
  const{data:s}=await a.s.from('spots').select('id').eq('id',b.spot_id).eq('approved',true).eq('active',true).neq('visibility','hidden').maybeSingle();if(!s)return err('Miesto už nie je dostupné.');
  const{error}=await a.s.from('poll_votes').upsert({poll_id:b.poll_id,user_id:a.id,spot_id:b.spot_id});return error?err('Hlas sa neuložil. Hlasovanie mohlo byť uzavreté.',409):ok({ok:true});
 }
 if(resource==='visits'||resource==='tips'){
  if(!uuid(b.spot_id))return err('Vyber miesto.');
  const{data:s}=await a.s.from('spots').select('id').eq('id',b.spot_id).eq('approved',true).eq('active',true).neq('visibility','hidden').maybeSingle();if(!s)return err('Miesto nie je dostupné.',404);
  if(resource==='visits'){
   if(typeof b.visited_on!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.visited_on)||!Number.isFinite(Date.parse(b.visited_on))||b.visited_on>new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Bratislava'}))return err('Vyber dátum návštevy, ktorý nie je v budúcnosti.');
   const{data,error}=await a.s.from('visits').upsert({user_id:a.id,spot_id:b.spot_id,visited_on:b.visited_on,note:text(b.note,2000)},{onConflict:'user_id,spot_id,visited_on'}).select('id').single();return error?err('Zápis sa nepodarilo uložiť.',500):ok(data);
  }
  const body=text(b.body,700);if(body.length<5||!kinds.includes(b.category))return err('Vyber kategóriu a napíš aspoň 5 znakov.');
  const{count}=await a.s.from('spot_tips').select('id',{count:'exact',head:true}).eq('user_id',a.id).gte('created_at',new Date(Date.now()-864e5).toISOString());if((count||0)>=10)return err('Denne môžeš pridať najviac 10 tipov.',429);
  const{data,error}=await a.s.from('spot_tips').insert({user_id:a.id,spot_id:b.spot_id,category:b.category,body}).select('id').single();return error?err('Tip sa neuložil.',500):ok(data);
 }return err('Neznáma akcia.',404);
}
export async function PATCH(req:Request,ctx:Context){
 const a=await auth(req);if(!a)return err('Prihlás sa.',401);const{resource}=await ctx.params;const b=await req.json().catch(()=>null);if(!uuid(b?.id))return err('Neplatný odkaz.');
 if(resource==='polls'&&typeof b.closed==='boolean'){
  const{data,error}=await a.s.from('polls').update({closed:b.closed}).eq('id',b.id).eq('owner_id',a.id).select('id').maybeSingle();return error?err('Zmena zlyhala.',500):data?ok({ok:true}):err('Hlasovanie nie je tvoje.',403);
 }
 if(resource==='tips'&&a.role==='admin'&&typeof b.hidden==='boolean'){
  const{data,error}=await a.s.from('spot_tips').update({hidden:b.hidden}).eq('id',b.id).select('id').maybeSingle();return error?err('Zmena zlyhala.',500):data?ok({ok:true}):err('Tip neexistuje.',404);
 }return err('Akcia nie je povolená.',403);
}
export async function DELETE(req:Request,ctx:Context){
 const a=await auth(req);if(!a)return err('Prihlás sa.',401);const{resource}=await ctx.params;const b=await req.json().catch(()=>null);if(!uuid(b?.id))return err('Neplatný odkaz.');
 if(!['trips','polls','visits','tips'].includes(resource))return err('Neznáma sekcia.',404);
 const table=resource==='tips'?'spot_tips':resource,owner=['trips','polls'].includes(resource)?'owner_id':'user_id';
 let q=a.s.from(table).delete().eq('id',b.id);if(!(resource==='tips'&&a.role==='admin'))q=q.eq(owner,a.id);
 const{data,error}=await q.select('*').maybeSingle();if(error)return err('Odstránenie zlyhalo.',500);if(!data)return err('Záznam neexistuje alebo nie je tvoj.',403);
 if(resource==='visits'&&data.photo_path)await a.s.storage.from('visit-photos').remove([data.photo_path]);return ok({ok:true});
}
