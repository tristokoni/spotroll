'use client';
import {useMemo,useRef,useState} from 'react';import {Spot} from '@/lib/geo';
export default function Wheel({spots,onWin}:{spots:Spot[];onWin:(s:Spot)=>void}){
 const items=useMemo(()=>{const a=[...spots];for(let i=a.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,12);},[spots]);const n=items.length;const [rot,setRot]=useState(0);const [busy,setBusy]=useState(false);const [win,setWin]=useState(-1);const ref=useRef(0);
 const spin=()=>{if(busy||!n)return;setBusy(true);setWin(-1);const idx=crypto.getRandomValues(new Uint32Array(1))[0]%n;const seg=360/n;
  const target=ref.current+(5+Math.floor(Math.random()*4))*360+(360-(idx*seg+seg/2))-(ref.current%360);ref.current=target;setRot(target);
  setTimeout(()=>{setBusy(false);setWin(idx);navigator.vibrate?.(200);onWin(items[idx]);},4600);};
 const colors=['#1B2B27','#2C443D'];const grad=items.map((_,i)=>`${i===win?'#E8590C':colors[i%2]} ${i*360/n}deg ${(i+1)*360/n}deg`).join(',');
 return(<div className="flex flex-col items-center gap-4"><div className="relative w-72 h-72"><div className="absolute left-1/2 -top-2 -translate-x-1/2 z-10 text-3xl text-trail">▼</div>
  <div className="w-full h-full rounded-full border-4 border-trail relative" style={{background:`conic-gradient(${grad})`,transform:`rotate(${rot}deg)`,transition:busy?'transform 4.5s cubic-bezier(.12,.7,.1,1)':'none'}}>
   {items.map((s,i)=><div key={s.id} className="absolute left-1/2 top-1/2 origin-left text-[11px] font-bold text-white w-1/2 pl-8 truncate" style={{transform:`rotate(${(i+.5)*360/n-90}deg)`}}>{s.name}</div>)}</div></div>
  <button onClick={spin} disabled={busy||!n} className="px-8 py-4 rounded-2xl btn btn-trail !text-xl !px-8 !py-4 font-display">{busy?'TOČÍ SA…':'VYTOČIŤ SPOT'}</button></div>);}
