import {NextResponse} from 'next/server';import {requireAdmin,err} from '@/lib/server';import {clean} from '@/lib/geo';
export async function GET(req:Request){const a=await requireAdmin(req);if(!a)return err('Forbidden',403);
 const{data,error}=await a.s.from('spots').select('*').order('created_at',{ascending:false});return error?err('Načítanie zlyhalo.',500):NextResponse.json({spots:data});}
export async function PATCH(req:Request){const a=await requireAdmin(req);if(!a)return err('Forbidden',403);const b=await req.json().catch(()=>null);if(!b?.id)return err('id');
 const p:any={updated_at:new Date().toISOString()};
 if(b.action==='approve')Object.assign(p,{approved:true,status:'approved',reject_reason:null});
 else if(b.action==='reject')Object.assign(p,{approved:false,status:'rejected',reject_reason:String(b.reason||'').slice(0,300)});
 else if(b.action==='toggle')p.active=!!b.active;
 else if(b.action==='edit'){const c=clean(b.data,true);if(!c)return err('Neplatné údaje.');Object.assign(p,c);}
 else return err('Neznáma akcia'); // whitelist akcií: žiadne slepé ...patch
 const{error}=await a.s.from('spots').update(p).eq('id',b.id);return error?err('Chyba'):NextResponse.json({ok:true});}
export async function DELETE(req:Request){const a=await requireAdmin(req);if(!a)return err('Forbidden',403);const{id}=await req.json().catch(()=>({}));if(!id)return err('id');
 const{error}=await a.s.from('spots').delete().eq('id',id);return error?err('Odstránenie zlyhalo.',500):NextResponse.json({ok:true});}
