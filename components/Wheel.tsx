'use client';
import {useEffect,useRef,useState} from 'react';
import {Spot} from '@/lib/geo';

/** One spin per mount. Unmounting cancels both the animation start and the result. */
export default function Wheel({spots,onWin}:{spots:Spot[];onWin:(s:Spot)=>void}){
 const[items]=useState(()=>{const a=[...spots];for(let i=a.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,12)});
 const[rotation,setRotation]=useState(0),[duration,setDuration]=useState(4500),[winner,setWinner]=useState(-1);
 const callback=useRef(onWin);callback.current=onWin;
 useEffect(()=>{
  if(!items.length)return;
  let nextFrame=0,timer:ReturnType<typeof setTimeout>|undefined;
  // Paint the starting position before applying the transition, including in Strict Mode.
  const firstFrame=requestAnimationFrame(()=>{nextFrame=requestAnimationFrame(()=>{
   const index=crypto.getRandomValues(new Uint32Array(1))[0]%items.length;
   const ms=matchMedia('(prefers-reduced-motion: reduce)').matches?150:4500;
   setDuration(ms);setRotation(6*360+360-(index+.5)*360/items.length);
   timer=setTimeout(()=>{setWinner(index);callback.current(items[index])},ms+100);
  })});
  return()=>{cancelAnimationFrame(firstFrame);cancelAnimationFrame(nextFrame);if(timer)clearTimeout(timer)};
 },[items]);
 const colors=['#1B2B27','#365548'];
 const background=items.map((_,i)=>`${i===winner?'#B74C2B':colors[i%2]} ${i*360/items.length}deg ${(i+1)*360/items.length}deg`).join(',');
 return <div className="wheel-stage"><div className="wheel-pointer" aria-hidden="true"/><div className="wheel-crop"><div className="wheel-disc" aria-hidden="true" style={{background:`conic-gradient(${background})`,transform:`rotate(${rotation}deg)`,transition:`transform ${duration}ms cubic-bezier(.12,.7,.1,1)`}}>{items.map((spot,i)=><div className="wheel-label" key={spot.id} style={{transform:`rotate(${(i+.5)*360/items.length-90}deg)`}}>{spot.name}</div>)}</div></div><p role="status" className="subtle mt-5">{winner<0?'Koleso sa točí…':'Tvoj ďalší výlet je vybraný.'}</p></div>;
}
