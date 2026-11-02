export type Attrs=Record<string,boolean|undefined>;
export type Spot={id:string;name:string;description?:string;locality?:string;latitude:number;longitude:number;image?:string;attributes:Attrs;visibility:string;approved?:boolean;active?:boolean;status?:string;reject_reason?:string;submitted_by?:string;created_at?:string;notes?:string;approx?:boolean;distance?:number};
export const ATTRS:Record<string,string>={fireplace:'🔥 Ohnisko',water_stream:'💧 Potok',drinking_water:'🥤 Pitná voda',water_source:'🚰 Zdroj vody',benches:'🪑 Lavičky',shelter:'🏠 Prístrešok',electricity:'⚡ Elektrina',toilet:'🚽 WC',trash_bin:'🗑️ Kôš',shade:'🌳 Tieň',seating:'🛋️ Sedenie',swimming:'🏊 Kúpanie',food_nearby:'🍔 Občerstvenie',public_transport:'🚌 MHD',parking:'🚗 Parkovanie'};
export function km(a:number,b:number,c:number,d:number){const r=(x:number)=>x*Math.PI/180,h=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;return 12742*Math.asin(Math.sqrt(h));}

export const fuzz=(x:number)=>Math.round(x*50)/50; // ~2 km mriežka pre approximate_location
const s=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
/** Validácia + whitelist polí zo vstupu (proti mass-assignment, XSS payloadom v URL a pod.) */
export function clean(b:any,isAdmin:boolean){
 const name=s(b?.name,80);const lat=Number(b?.latitude),lng=Number(b?.longitude);
 if(name.length<2||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return null;
 let image=s(b.image,500);if(image&&!/^https:\/\//i.test(image))image='';
 const attributes:Record<string,boolean>={};for(const k of Object.keys(ATTRS))if(typeof b.attributes?.[k]==='boolean')attributes[k]=b.attributes[k];
 const vis=['public','approximate_location',...(isAdmin?['hidden']:[])].includes(b.visibility)?b.visibility:'public';
 return{name,description:s(b.description,1000),locality:s(b.locality,80),latitude:lat,longitude:lng,image:image||null,attributes,visibility:vis};}
