'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {sb,configured} from '@/lib/supabase';
export default function ResetPassword(){
 const[state,setState]=useState<'loading'|'ready'|'invalid'|'done'>('loading');
 const[pw,setPw]=useState(''),[again,setAgain]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{
  if(!configured){setState('invalid');return}
  let active=true;
  const hash=new URLSearchParams(window.location.hash.slice(1));
  const recovery=hash.get('type')==='recovery'&&!hash.has('error');
  const{data}=sb.auth.onAuthStateChange((event,session)=>{if(active&&event==='PASSWORD_RECOVERY'&&session)setState('ready')});
  sb.auth.getSession().then(({data,error})=>{if(active)setState(current=>current==='ready'?current:recovery&&data.session&&!error?'ready':'invalid')}).catch(()=>{if(active)setState('invalid')});
  return()=>{active=false;data.subscription.unsubscribe()};
 },[]);
 async function save(e:React.FormEvent){
  e.preventDefault();if(busy||state!=='ready')return;
  if(pw.length<10){setMessage('Heslo musí mať aspoň 10 znakov.');return}
  if(pw!==again){setMessage('Heslá sa nezhodujú.');return}
  setBusy(true);setMessage('');
  try{const{error}=await sb.auth.updateUser({password:pw});if(error){setMessage(error.code==='same_password'?'Vyber iné heslo než doteraz.':error.code==='weak_password'?'Zvoľ silnejšie heslo.':'Heslo sa nepodarilo uložiť. Skús nový odkaz na obnovu.');return}
   setPw('');setAgain('');setState('done');await sb.auth.signOut({scope:'local'});
  }catch{setMessage('Pripojenie zlyhalo. Skús to znova.')}finally{setBusy(false)}
 }
 return <div className="max-w-sm mx-auto mt-8 space-y-4"><h1 className="font-display text-3xl">Nové heslo</h1>{state==='loading'?<p role="status">Overujem odkaz…</p>:state==='invalid'?<><p role="alert">Odkaz na obnovu je neplatný alebo už vypršal. Vyžiadaj si nový na prihlasovacej stránke.</p><Link className="btn" href="/login">Späť na prihlásenie</Link></>:state==='done'?<><p role="status">Heslo je zmenené. Teraz sa prihlás novým heslom.</p><Link className="btn" href="/login">Prihlásiť sa</Link></>:<form onSubmit={save} className="space-y-4"><p className="subtle">Použi aspoň 10 znakov a heslo, ktoré nepoužívaš inde.</p><label className="field">Nové heslo<input className="inp" type="password" autoComplete="new-password" required minLength={10} value={pw} disabled={busy} onChange={e=>setPw(e.target.value)}/></label><label className="field">Zopakuj nové heslo<input className="inp" type="password" autoComplete="new-password" required minLength={10} value={again} disabled={busy} onChange={e=>setAgain(e.target.value)}/></label>{message&&<p role="alert">{message}</p>}<button className="btn w-full" disabled={busy}>{busy?'Ukladám…':'Uložiť nové heslo'}</button></form>}</div>;
}
