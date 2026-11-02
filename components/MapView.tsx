'use client';
import {useEffect,useRef} from 'react';import L from 'leaflet';import 'leaflet/dist/leaflet.css';import {Spot,ATTRS} from '@/lib/geo';
type P={spots?:Spot[];user?:[number,number]|null;target?:Spot|null;route?:[number,number][];onPick?:(lat:number,lng:number)=>void;picked?:[number,number]|null};
// XSS fix: obsah popupu sa skladá cez textContent, nie cez HTML string
function pop(s:Spot){const d=document.createElement('div'),b=document.createElement('b'),p=document.createElement('p');b.textContent=s.name;p.textContent=(s.description||'')+' '+Object.keys(s.attributes||{}).filter(k=>s.attributes[k]).map(k=>ATTRS[k]?.split(' ')[0]).join(' ');d.append(b,p);return d;}
export default function MapView({spots=[],user,target,route,onPick,picked}:P){
 const el=useRef<HTMLDivElement>(null);const map=useRef<L.Map|null>(null);const layer=useRef<L.LayerGroup|null>(null);const cb=useRef(onPick);cb.current=onPick;
 useEffect(()=>{if(!el.current||map.current)return;const m=L.map(el.current).setView([49.21,19.3],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(m);layer.current=L.layerGroup().addTo(m);
  m.on('click',e=>cb.current?.(e.latlng.lat,e.latlng.lng));map.current=m;return()=>{m.remove();map.current=null;};},[]);
 useEffect(()=>{const g=layer.current,m=map.current;if(!g||!m)return;g.clearLayers();const pts:L.LatLngExpression[]=[];
  const dot=(c:string)=>L.divIcon({html:`<div style="width:16px;height:16px;border-radius:50%;background:${c};border:2px solid #fff"></div>`,className:''});
  spots.forEach(s=>{L.marker([s.latitude,s.longitude],{icon:dot('#E8590C')}).bindPopup(pop(s)).addTo(g);pts.push([s.latitude,s.longitude]);});
  if(user){L.marker(user,{icon:dot('#2A6F8F')}).addTo(g);pts.push(user);}
  if(target){L.marker([target.latitude,target.longitude],{icon:dot('#1B2B27')}).addTo(g);pts.push([target.latitude,target.longitude]);}
  if(picked){L.marker(picked,{icon:dot('#facc15')}).addTo(g);}
  if(route?.length){L.polyline(route,{color:'#E8590C',weight:5}).addTo(g);}
  if(pts.length&&(target||!picked))m.fitBounds(L.latLngBounds(pts),{padding:[30,30],maxZoom:15});},[spots,user,target,route,picked]);
 return <div ref={el} className="h-full w-full rounded-2xl"/>;}
