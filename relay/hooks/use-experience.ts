'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { configureSound, playCue } from '@/lib/sound';
export type TransitionStyle = 'wave'|'ember'|'fade';
export type ExperiencePreferences = { sound:boolean; motion:boolean; transition:TransitionStyle };
const defaults:ExperiencePreferences = {sound:false,motion:true,transition:'fade'};
type Layer<T> = {id:number;target:T;style:TransitionStyle;phase:'cover'|'reveal'};
export function useExperience<T extends string>(initial:T,routes?:Record<T,string>){
 const [view,setView]=useState(initial),[preferences,setPreferences]=useState(defaults),[layer,setLayer]=useState<Layer<T>|null>(null);
 const state=useRef({view:initial,preferences:defaults,routes,initial,target:initial});state.current.routes=routes;
 const timers=useRef<ReturnType<typeof setTimeout>[]>([]);
 const clear=useCallback(()=>{timers.current.forEach(clearTimeout);timers.current=[];},[]);
 const reveal=useCallback((target:T)=>{state.current.view=target;setView(target);window.scrollTo({top:0,behavior:'instant'});},[]);
 const navigate=useCallback((target:T,push:boolean,preview=false)=>{
  const current=state.current;
  if(push&&current.routes){const slug=current.routes[target];if(slug&&window.location.hash!==`#${slug}`)window.history.pushState(null,'',`#${slug}`);}
  if(target===current.view&&!preview){clear();setLayer(null);current.target=target;window.scrollTo({top:0,behavior:current.preferences.motion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});return;}
  clear();current.target=target;
  if(!current.preferences.motion||window.matchMedia('(prefers-reduced-motion: reduce)').matches){reveal(target);setLayer(null);return;}
  const id=performance.now(),style=current.preferences.transition;setLayer({id,target,style,phase:'cover'});playCue('navigate');
  timers.current=[setTimeout(()=>{if(!preview)reveal(target);setLayer({id,target,style,phase:'reveal'});},180),setTimeout(()=>{setLayer(null);timers.current=[];if(!preview)document.getElementById('main-content')?.focus({preventScroll:true});},620)];
 },[clear,reveal]);
 useEffect(()=>{
  try{const saved=JSON.parse(localStorage.getItem('relay-experience-v1')??'null');if(saved&&typeof saved.sound==='boolean'&&typeof saved.motion==='boolean'&&['wave','ember','fade'].includes(saved.transition)){state.current.preferences=saved;setPreferences(saved);configureSound(saved.sound);}}catch{}
  const readHash=()=>{let slug='';try{slug=decodeURIComponent(window.location.hash.slice(1));}catch{}const entries=Object.entries(state.current.routes??{}) as [T,string][];return entries.find(([,value])=>value===slug)?.[0]??state.current.initial;};
  const first=readHash();state.current.target=first;reveal(first);
  const onHistory=()=>{const target=readHash();if(target!==state.current.target)navigate(target,false);};
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');const onMotion=()=>{if(reduced.matches){clear();reveal(state.current.target);setLayer(null);}};
  window.addEventListener('popstate',onHistory);window.addEventListener('hashchange',onHistory);reduced.addEventListener('change',onMotion);
  return()=>{clear();configureSound(false);window.removeEventListener('popstate',onHistory);window.removeEventListener('hashchange',onHistory);reduced.removeEventListener('change',onMotion);};
 },[clear,navigate,reveal]);
 const update=useCallback((patch:Partial<ExperiencePreferences>)=>{
  const next={...state.current.preferences,...patch};state.current.preferences=next;setPreferences(next);configureSound(next.sound);try{localStorage.setItem('relay-experience-v1',JSON.stringify(next));}catch{}
  if(patch.motion===false){clear();reveal(state.current.target);setLayer(null);}if(patch.sound===true)playCue('success');
 },[clear,reveal]);
 const go=useCallback((target:T,preview=false)=>navigate(target,true,preview),[navigate]);
 return {view,go,preferences,update,layer};
}
