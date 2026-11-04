export type Coordinates={latitude:number;longitude:number};
export type CacheDrop=Coordinates&{
 id:string;kind:'gift'|'request';title:string;description:string;hint:string;
 status:'requested'|'ready'|'collected'|'cancelled';pickup_note:string;
 created_at:string;updated_at:string;ready_at:string|null;collected_at:string|null;cancelled_at:string|null;
 sender_name:string;recipient_name:string;is_sender:boolean;is_recipient:boolean;is_creator:boolean;
};
export const DROP_STATUS={requested:'Čaká na prípravu',ready:'Pripravené na vyzdvihnutie',collected:'Vyzdvihnuté',cancelled:'Zrušené'};
export const validCoordinates=(value:unknown):boolean=>{
 if(!value||typeof value!=='object')return false;
 const{latitude,longitude}=value as Coordinates;
 return typeof latitude==='number'&&typeof longitude==='number'&&Number.isFinite(latitude)&&Number.isFinite(longitude)&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180;
};
