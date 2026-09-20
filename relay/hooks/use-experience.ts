'use client';
import { useEffect, useRef, useState } from 'react';
import { configureSound, playCue } from '@/lib/sound';
export type TransitionStyle='wave'|'ember'|'fade';
export type ExperiencePreferences={sound:boolean;motion:boolean;transition:TransitionStyle};
const defaults:ExperiencePreferences={sound:false,motion:true,transition:'wave'};
export function useExperience<T extends string>(initial:T){
 const [view,setView]=useState(initial),[preferences,setPreferences]=useState(defaults),[layer,setLayer]=useState<{id:number;target:T;style:TransitionStyle;phase:'cover'|'reveal'}|null>(null);
 const timers=useRef<ReturnType<typeof setTimeout>[]>([]),inFlight=useRef(false);
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('relay-experience-v1')??'null');if(saved&&typeof saved.sound==='boolean'&&typeof saved.motion==='boolean'&&['wave','ember','fade'].includes(saved.transition)){setPreferences(saved);configureSound(saved.sound);}}catch{}return ()=>{timers.current.forEach(clearTimeout);configureSound(false);};},[]);
 function update(patch:Partial<ExperiencePreferences>){const next={...preferences,...patch};setPreferences(next);configureSound(next.sound);try{localStorage.setItem('relay-experience-v1',JSON.stringify(next));}catch{}if(patch.sound===true)playCue('success');}
 function go(target:T,preview=false){if(inFlight.current)return;const reduced=!preferences.motion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(target===view&&!preview){window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});return;}if(reduced){setView(target);window.scrollTo({top:0,behavior:'instant'});return;}
  inFlight.current=true;const id=performance.now();setLayer({id,target,style:preferences.transition,phase:'cover'});playCue('navigate');
  timers.current=[setTimeout(()=>{setView(target);if(!preview)window.scrollTo({top:0,behavior:'instant'});setLayer({id,target,style:preferences.transition,phase:'reveal'});},420),setTimeout(()=>{setLayer(null);inFlight.current=false;timers.current=[];},1080)];
 }
 return {view,go,preferences,update,layer};
}
