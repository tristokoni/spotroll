import {NextResponse} from 'next/server';import {requireAdmin,err} from '@/lib/server';
export async function GET(req:Request){const a=await requireAdmin(req);if(!a)return err('Forbidden',403);
 const{data:pr}=await a.s.from('profiles').select('*').order('created_at',{ascending:false});const{data:u}=await a.s.auth.admin.listUsers({perPage:1000});
 const em=new Map(u?.users.map(x=>[x.id,x.email]));return NextResponse.json({users:(pr||[]).map(p=>({...p,email:em.get(p.id)}))});}
export async function PATCH(req:Request){const a=await requireAdmin(req);if(!a)return err('Forbidden',403);const{id,role,banned,reason}=await req.json().catch(()=>({}));
 if(!id||id===a.id)return err('Nemôžeš meniť sám seba.');
 const{data:t}=await a.s.from('profiles').select('role').eq('id',id).single();if(!t)return err('Používateľ neexistuje.',404);
 const p:any={};if(role==='user'||role==='admin')p.role=role;
 if(typeof banned==='boolean'){if(banned&&t.role==='admin')return err('Najprv odober admina.');p.banned=banned;p.ban_reason=banned?String(reason||'').slice(0,200):null;}
 if(!Object.keys(p).length)return err('Nič na zmenu.');
 await a.s.from('profiles').update(p).eq('id',id);
 if(typeof banned==='boolean')await a.s.auth.admin.updateUserById(id,{ban_duration:banned?'876000h':'none'}); // zruší aj refresh tokeny
 return NextResponse.json({ok:true});}
