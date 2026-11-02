import {createClient} from '@supabase/supabase-js';import {NextResponse} from 'next/server';
export const admin=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
export const err=(m:string,s=400)=>NextResponse.json({error:m},{status:s});
/** Overí JWT a že používateľ nie je zabanovaný. Vráti null ak neplatný. */
export async function auth(req:Request){const t=req.headers.get('authorization')?.slice(7);if(!t)return null;const s=admin();
 const{data}=await s.auth.getUser(t);if(!data.user)return null;const{data:p}=await s.from('profiles').select('role,banned').eq('id',data.user.id).single();
 if(!p||p.banned)return null;return{s,id:data.user.id,role:p.role as string};}
export async function requireAdmin(req:Request){const a=await auth(req);return a?.role==='admin'?a:null;}
