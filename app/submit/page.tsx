'use client';
import {useEffect,useState} from 'react';import dynamic from 'next/dynamic';import Link from 'next/link';import {ATTRS} from '@/lib/geo';import {useAuth,hdr} from '@/lib/supabase';
const MapView=dynamic(()=>import('@/components/MapView'),{ssr:false});
const BADGE:Record<string,string>={pending:'⏳ čaká na schválenie',approved:'✅ schválený',rejected:'❌ zamietnutý'};
export default function Submit(){const a=useAuth();const[pt,setPt]=useState<[number,number]|null>(null);const[f,setF]=useState({name:'',description:'',locality:'',image:'',visibility:'public'});const[at,setAt]=useState<Record<string,boolean>>({});const[msg,setMsg]=useState('');const[mine,setMine]=useState<any[]>([]);
 const load=()=>a.token&&fetch('/api/spots',{method:'PUT',headers:hdr(a.token)}).then(r=>r.json()).then(d=>setMine(d.spots||[]));useEffect(()=>{load();},[a.token]); // eslint-disable-line
 const send=async()=>{if(!pt)return setMsg('Klikni do mapy, kde spot je.');const r=await fetch('/api/spots',{method:'POST',headers:hdr(a.token),body:JSON.stringify({...f,latitude:pt[0],longitude:pt[1],attributes:at})});const j=await r.json();
  setMsg(r.ok?(j.pending?'Díky! Spot čaká na schválenie adminom.':'Spot pridaný.'):j.error);if(r.ok){setF({...f,name:'',description:''});setPt(null);load();}};
 if(!a.ready)return null;if(!a.user)return <p>Na navrhnutie spotu sa musíš <Link className="underline" href="/login">prihlásiť</Link>.</p>;
 if(a.banned)return <p>Tvoj účet je zablokovaný.</p>;
 return <div className="space-y-3"><h1 className="font-display font-extrabold text-3xl">Navrhni spot</h1><p className="text-sm text-ink/70">Spot sa zobrazí ostatným až po schválení adminom.</p>
 <div className="h-60"><MapView onPick={(x,y)=>setPt([x,y])} picked={pt}/></div><p className="text-xs">{pt?`${pt[0].toFixed(5)}, ${pt[1].toFixed(5)}`:'Klikni do mapy'}</p>
 <input className="inp" placeholder="Názov" maxLength={80} value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><textarea className="inp" placeholder="Popis" maxLength={1000} value={f.description} onChange={e=>setF({...f,description:e.target.value})}/>
 <input className="inp" placeholder="Lokalita (obec)" maxLength={80} value={f.locality} onChange={e=>setF({...f,locality:e.target.value})}/><input className="inp" placeholder="URL fotky (https://…)" value={f.image} onChange={e=>setF({...f,image:e.target.value})}/>
 <select className="inp" value={f.visibility} onChange={e=>setF({...f,visibility:e.target.value})}><option value="public">Presná poloha</option><option value="approximate_location">Približná poloha (~2 km)</option></select>
 <div className="flex flex-wrap gap-2">{Object.entries(ATTRS).map(([k,l])=><button type="button" key={k} onClick={()=>setAt({...at,[k]:!at[k]})} className={`chip ${at[k]?'chip-on':''}`}>{l}</button>)}</div>
 <button className="btn btn-trail w-full" onClick={send} disabled={f.name.length<2}>Odoslať na schválenie</button>{msg&&<p className="text-sm font-semibold" role="status">{msg}</p>}
 {mine.length>0&&<><h2 className="font-display font-bold text-xl pt-4">Moje návrhy</h2>{mine.map(s=><div key={s.id} className="card text-sm"><b>{s.name}</b> · {BADGE[s.status]}{s.reject_reason&&<p className="text-ink/60">Dôvod: {s.reject_reason}</p>}</div>)}</>}</div>;}
