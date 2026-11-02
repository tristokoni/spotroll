'use client';
import {createClient,User,SupabaseClient} from '@supabase/supabase-js';import {useEffect,useState} from 'react';
export const configured=!!(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
let client:SupabaseClient;
export const sb=new Proxy({} as SupabaseClient,{get(_target,key){if(!configured)throw new Error('Supabase nie je nakonfigurovaný.');client??=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);return Reflect.get(client,key);}});
const empty={ready:false,user:null as User|null,token:'',role:'user',banned:false,name:''};
export function useAuth(){const[st,setSt]=useState(empty);
 useEffect(()=>{if(!configured){setSt({...empty,ready:true});return;}const load=async(s:any)=>{if(!s)return setSt({...empty,ready:true});const{data:p}=await sb.from('profiles').select('role,banned,username').eq('id',s.user.id).single();
  setSt({ready:true,user:s.user,token:s.access_token,role:p?.role||'user',banned:!!p?.banned,name:p?.username||''});};
  sb.auth.getSession().then(({data})=>load(data.session));
  const{data:l}=sb.auth.onAuthStateChange((_e,s)=>{setTimeout(()=>load(s),0);}); // setTimeout: vyhne sa deadlocku supabase-js
  return()=>l.subscription.unsubscribe();},[]);return st;}
export const hdr=(t:string)=>({'content-type':'application/json',authorization:`Bearer ${t}`});
