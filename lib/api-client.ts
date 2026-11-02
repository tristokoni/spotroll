'use client';
import {configured,sb} from './supabase';
export async function apiFetch(url:string,init:RequestInit={}){
 const headers=new Headers(init.headers);
 if(configured){const{data}=await sb.auth.getSession();if(data.session)headers.set('authorization','Bearer '+data.session.access_token);}
 return fetch(url,{...init,headers,cache:'no-store'});
}
export async function request<T=any>(url:string,body?:unknown,method?:string):Promise<T>{
 const r=await apiFetch(url,{method:method||(body===undefined?'GET':'POST'),...(body===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})});
 const d=await r.json();if(!r.ok)throw Error(d.error||'Požiadavka zlyhala.');return d;
}
