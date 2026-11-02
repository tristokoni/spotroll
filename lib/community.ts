'use client';
import {useCallback,useEffect,useState} from 'react';import {request} from './api-client';import {Spot} from './geo';
export type Trip={id:string;title:string;notes:string;trip_date:string|null;spot_ids:string[];shared:boolean;own:boolean};
export type Poll={id:string;title:string;spot_ids:string[];closed:boolean;own:boolean;counts:Record<string,number>;my_vote:string|null;total:number};
export type Visit={id:string;spot_id:string;visited_on:string;note:string;photo_url:string|null};
export type Tip={id:string;spot_id:string;category:string;body:string;hidden:boolean;created_at:string;own:boolean};
export const CATEGORIES:Record<string,string>={access:'Prístup a cesta',water:'Voda a pramene',condition:'Stav miesta',crowds:'Návštevnosť',other:'Iný tip'};
export function useCommunity<T>(resource?:string){const[spots,setSpots]=useState<Spot[]>([]),[items,setItems]=useState<T[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const refresh=useCallback(async()=>{setError('');try{const[s,d]=await Promise.all([request<{spots:Spot[]}>('/api/spots'),resource?request<{items:T[]}>('/api/community/'+resource):Promise.resolve({items:[] as T[]})]);setSpots(s.spots);setItems(d.items)}catch(e){setError(e instanceof Error?e.message:'Načítanie zlyhalo.')}finally{setLoading(false)}},[resource]);useEffect(()=>{void refresh()},[refresh]);return{spots,items,loading,error,setError,refresh};}
export const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Bratislava'});
export const dateLabel=(date:string)=>new Date(date.length===10?date+'T12:00:00':date).toLocaleDateString('sk-SK');
