'use client';
import {useState} from 'react';import {useRouter} from 'next/navigation';import {sb,configured} from '@/lib/supabase';
export default function Login(){const r=useRouter();const[mode,setMode]=useState<'in'|'up'>('in');const[em,setEm]=useState('');const[pw,setPw]=useState('');const[un,setUn]=useState('');const[msg,setMsg]=useState('');const[busy,setBusy]=useState(false);
 const destination=()=>{const next=new URLSearchParams(window.location.search).get('next');return next&&/^\/(?![\/\\])/.test(next)&&!next.includes('\\')?next:'/'};
 const go=async()=>{if(!configured){setMsg('Prihlasovanie bude dostupné po pripojení Supabase.');return;}setBusy(true);setMsg('');try{
  if(mode==='in'){const{error}=await sb.auth.signInWithPassword({email:em,password:pw});error?setMsg('Nesprávny email alebo heslo.'):r.push(destination());}
  else{if(pw.length<10){setBusy(false);return setMsg('Heslo musí mať aspoň 10 znakov.');}
   const{error}=await sb.auth.signUp({email:em,password:pw,options:{data:{username:un.trim().replace(/^@+/,'').slice(0,30)}}});setMsg(error?error.message:'Hotovo! Ak je zapnuté potvrdenie emailu, pozri si schránku. Svoje používateľské meno nájdeš v profile; pri zhode mien dostane jedinečnú príponu.');}
  }catch{setMsg('Pripojenie zlyhalo. Skús to znova.')}finally{setBusy(false)}};
 return <div className="max-w-sm mx-auto mt-8 space-y-3"><h1 className="font-display font-extrabold text-3xl">{mode==='in'?'Vitaj späť':'Vytvor si účet'}</h1>
 {mode==='up'&&<input className="inp" aria-label="Používateľské meno" placeholder="Používateľské meno" maxLength={30} value={un} onChange={e=>setUn(e.target.value)}/>}
 <input className="inp" type="email" aria-label="Email" placeholder="Email" autoComplete="email" value={em} onChange={e=>setEm(e.target.value)}/>
 <input className="inp" type="password" aria-label="Heslo" placeholder="Heslo" autoComplete={mode==='in'?'current-password':'new-password'} value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go()}/>
 <button className="btn w-full" disabled={busy||!em||!pw||(mode==='up'&&un.trim().length<2)} onClick={go}>{mode==='in'?'Prihlásiť':'Registrovať'}</button>
 {msg&&<p className="text-sm text-trail" role="alert">{msg}</p>}
 <button className="text-sm underline" onClick={()=>{setMode(mode==='in'?'up':'in');setMsg('');}}>{mode==='in'?'Nemáš účet? Zaregistruj sa':'Už máš účet? Prihlás sa'}</button></div>;}
