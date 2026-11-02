import {NextResponse} from 'next/server';import {admin,auth,err} from '@/lib/server';import {km,fuzz,clean,Spot} from '@/lib/geo';
const COLS='id,name,description,locality,latitude,longitude,image,attributes,visibility'; // bez notes/submitted_by
export async function GET(req:Request){
 const a=await auth(req);if(!a)return err("Prihlás sa.",401);
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)return err("Databáza miest zatiaľ nie je pripojená. Správca musí nastaviť Supabase.",503);
 const q=new URL(req.url).searchParams;const lat=parseFloat(q.get('lat')||''),lng=parseFloat(q.get('lng')||''),rad=parseFloat(q.get('radius')||'0');
 const attrs=(q.get('attrs')||'').split(',').filter(Boolean).slice(0,15);
 const{data,error}=await a.s.from('spots').select(COLS).eq('approved',true).eq('active',true).neq('visibility','hidden').limit(2000);
 if(error)return err('DB error',500);const has=!isNaN(lat)&&!isNaN(lng);
 let out=(data as Spot[]).filter(s=>attrs.every(a=>s.attributes?.[a]===true)).map(s=>{const approx=s.visibility==='approximate_location';
  const la=approx?fuzz(s.latitude):s.latitude,lo=approx?fuzz(s.longitude):s.longitude;
  // vzdialenosť sa počíta z ROZMAZANEJ polohy, inak by sa dala presná poloha vytriangulovať
  return{...s,approx,latitude:la,longitude:lo,distance:has?km(lat,lng,la,lo):undefined};});
 if(has&&rad>0)out=out.filter(s=>(s.distance??0)<=rad);
 return NextResponse.json({spots:out});}
/** Používateľ navrhne spot -> vždy pending. Admin ho môže pridať rovno schválený. */
export async function POST(req:Request){
 const a=await auth(req);if(!a)return err('Prihlás sa.',401);const isA=a.role==='admin';
 const row=clean(await req.json().catch(()=>null),isA);if(!row)return err('Neplatné údaje.');
 if(!isA){const since=new Date(Date.now()-864e5).toISOString();
  const{count:pend}=await a.s.from('spots').select('id',{count:'exact',head:true}).eq('submitted_by',a.id).eq('status','pending');
  const{count:day}=await a.s.from('spots').select('id',{count:'exact',head:true}).eq('submitted_by',a.id).gte('created_at',since);
  if((pend??0)>=5||(day??0)>=10)return err('Príliš veľa návrhov, skús neskôr.',429);}
 const{error}=await a.s.from('spots').insert({...row,submitted_by:a.id,approved:isA,status:isA?'approved':'pending',active:true});
 return error?err('Uloženie zlyhalo.'):NextResponse.json({ok:true,pending:!isA});}
/** Moje návrhy */
export async function PUT(req:Request){const a=await auth(req);if(!a)return err('Prihlás sa.',401);
 const{data}=await a.s.from('spots').select('id,name,status,reject_reason,created_at').eq('submitted_by',a.id).order('created_at',{ascending:false});return NextResponse.json({spots:data});}
