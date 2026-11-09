'use client';
import {useState} from 'react';import {useRouter} from 'next/navigation';import {sb,configured} from '@/lib/supabase';
export default function Login(){const r=useRouter();const[mode,setMode]=useState<'in'|'up'|'reset'>('in');const[em,setEm]=useState('');const[pw,setPw]=useState('');const[un,setUn]=useState('');const[msg,setMsg]=useState('');const[busy,setBusy]=useState(false);
 const destination=()=>{const next=new URLSearchParams(window.location.search).get('next');return next&&/^\/(?![\/\\])/.test(next)&&!next.includes('\\')?next:'/'};
 const go=async()=>{if(busy)return;if(!configured){setMsg('Prihlasovanie bude dostupné po pripojení Supabase.');return;}setBusy(true);setMsg('');try{
  if(mode==='reset'){const{error}=await sb.auth.resetPasswordForEmail(em.trim(),{redirectTo:window.location.origin+'/reset-password'});setMsg(error?(error.status===429?'Príliš veľa pokusov. Počkaj chvíľu a skús znova.':'E-mail sa nepodarilo odoslať. Skús neskôr; ak problém trvá, kontaktuj správcu.'): 'Ak je k tomuto e-mailu priradený účet, dostaneš odkaz na nastavenie nového hesla. Skontroluj aj spam.');}
  else if(mode==='in'){const{error}=await sb.auth.signInWithPassword({email:em.trim(),password:pw});error?setMsg(error.code==='email_not_confirmed'?'Najprv potvrď e-mail cez odkaz z registrácie.':error.status===429?'Príliš veľa pokusov. Počkaj chvíľu a skús znova.':error.code==='invalid_credentials'?'Nesprávny e-mail alebo heslo. Použi Zabudnuté heslo.':'Prihlásenie sa nepodarilo. Skús to znova o chvíľu.'):r.push(destination());}
  else{if(pw.length<10){setBusy(false);return setMsg('Heslo musí mať aspoň 10 znakov.');}
   const{error}=await sb.auth.signUp({email:em,password:pw,options:{data:{username:un.trim().replace(/^@+/,'').slice(0,30)}}});setMsg(error?error.message:'Hotovo! Ak je zapnuté potvrdenie emailu, pozri si schránku. Svoje používateľské meno nájdeš v profile; pri zhode mien dostane jedinečnú príponu.');}
  }catch{setMsg('Pripojenie zlyhalo. Skús to znova.')}finally{setBusy(false)}};
 return <form onSubmit={e=>{e.preventDefault();void go()}} className="max-w-sm mx-auto mt-8 space-y-3"><h1 className="font-display font-extrabold text-3xl">{mode==='reset'?'Obnoviť heslo':mode==='in'?'Vitaj späť':'Vytvor si účet'}</h1>
 {mode==='up'&&<input className="inp" aria-label="Používateľské meno" placeholder="Používateľské meno" maxLength={30} value={un} onChange={e=>setUn(e.target.value)}/>}
 <input className="inp" type="email" required aria-label="Email" placeholder="Email" autoComplete="email" value={em} onChange={e=>setEm(e.target.value)}/>
 {mode!=='reset'&&<input className="inp" type="password" required aria-label="Heslo" placeholder="Heslo" autoComplete={mode==='in'?'current-password':'new-password'} value={pw} onChange={e=>setPw(e.target.value)}/>}
 <button className="btn w-full" disabled={busy||!em||(mode!=='reset'&&!pw)||(mode==='up'&&un.trim().length<2)} type="submit">{busy?'Počkaj…':mode==='reset'?'Poslať odkaz na obnovu':mode==='in'?'Prihlásiť':'Registrovať'}</button>
 {mode==='in'&&<button type="button" className="text-sm underline block" disabled={busy} onClick={()=>{setMode('reset');setMsg('');setPw('')}}>Zabudnuté heslo?</button>}
 {mode==='reset'&&<p className="subtle">Zadaj e-mail svojho účtu. Pošleme ti odkaz na nastavenie nového hesla.</p>}
 {msg&&<p className="text-sm text-trail" role="alert">{msg}</p>}
 <button type="button" className="text-sm underline" disabled={busy} onClick={()=>{setMode(mode==='in'?'up':'in');setMsg('');}}>{mode==='in'?'Nemáš účet? Zaregistruj sa':'Už máš účet? Prihlás sa'}</button></form>;}
