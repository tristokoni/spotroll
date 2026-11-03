'use client';
import {useEffect,useRef,useState} from 'react';
import {Spot} from '@/lib/geo';
import Wheel from './Wheel';

export default function WheelModal({spots,onWin,onClose,onView}:{spots:Spot[];onWin:(spot:Spot)=>void;onClose:()=>void;onView:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const[winner,setWinner]=useState<Spot|null>(null),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const el=dialog.current,previousFocus=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;
  el?.showModal();document.body.style.overflow='hidden';
  return()=>{el?.close();document.body.style.overflow=overflow;previousFocus?.focus({preventScroll:true})};
 },[]);
 return <dialog ref={dialog} className="wheel-modal" aria-labelledby="wheel-title" aria-describedby="wheel-description" onCancel={e=>{e.preventDefault();onClose()}} onKeyDown={e=>{
   if(e.key!=='Tab')return;
   const controls=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],[tabindex="0"]')).filter(el=>el.getClientRects().length>0);
   const first=controls[0],last=controls.at(-1);if(!first||!last)return;
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }} onClick={e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose()}}>
  <div className="wheel-modal-content"><button autoFocus type="button" className="wheel-close" aria-label="Zatvoriť losovanie" onClick={onClose}>×</button><p className="overline">Nechaj sa prekvapiť</p><h2 id="wheel-title">{winner?'Tak kam dnes?':'Tvoj výlet sa už točí.'}</h2><p id="wheel-description" className="subtle">{winner?'Miesto sme vybrali z tvojho aktuálneho výberu.':'Stačí chvíľka. Ďalší klik už netreba.'}</p>
  <Wheel key={attempt} spots={spots} onWin={spot=>{setWinner(spot);onWin(spot)}}/>
  {winner&&<div className="wheel-result" aria-live="polite"><h3>{winner.name}</h3>{winner.locality&&<p className="subtle">{winner.locality}</p>}<button className="btn btn-trail w-full" onClick={onView}>Zobraziť vybrané miesto</button><button className="btn btn-line w-full" onClick={()=>{setWinner(null);setAttempt(n=>n+1)}}>Roztočiť znova</button></div>}
  </div>
 </dialog>;
}
