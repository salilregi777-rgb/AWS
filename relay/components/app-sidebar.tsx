'use client';

import { useEffect, useRef, useState } from 'react';
import { Home, LayoutDashboard, Radio, Users, History, FlaskConical, Plus, Play, SlidersHorizontal, CircleHelp, ChevronRight, X, ShieldCheck } from 'lucide-react';
import RelayLogo from './relay-logo';
import styles from './app-sidebar.module.css';

export type AppView = 'Home'|'Mission control'|'Signals'|'Responders'|'Decisions'|'Operations';
type Props={view:AppView;onNavigate:(view:AppView)=>void;pendingCount:number;open:boolean;onOpenChange:(open:boolean)=>void;onReport:()=>void;onRehearsal:()=>void;onSettings:()=>void;onHelp:()=>void;ready:boolean};
const navigation:{view:AppView;label:string;icon:typeof Home}[]=[{view:'Home',label:'Home',icon:Home},{view:'Mission control',label:'Overview',icon:LayoutDashboard},{view:'Signals',label:'Incidents',icon:Radio},{view:'Responders',label:'Teams',icon:Users},{view:'Decisions',label:'Activity log',icon:History}];

export default function AppSidebar({view,onNavigate,pendingCount,open,onOpenChange,onReport,onRehearsal,onSettings,onHelp,ready}:Props){
 const panel=useRef<HTMLElement>(null);
 const closeRef=useRef(onOpenChange);closeRef.current=onOpenChange;
 const [mobile,setMobile]=useState(false);
 useEffect(()=>{const media=window.matchMedia('(max-width:999px)');const sync=()=>{setMobile(media.matches);if(!media.matches)closeRef.current(false);};sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
 useEffect(()=>{
  if(!open||!mobile)return;
  const previous=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;
  const content=document.querySelector<HTMLElement>('.app-content');const previousInert=content?.inert??false;
  if(content)content.inert=true;
  document.body.style.overflow='hidden';
  panel.current?.querySelector<HTMLElement>('button')?.focus();
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();closeRef.current(false);return;}
   if(event.key!=='Tab')return;
   const focusable=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]')??[]).filter(el=>el.getClientRects().length);
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  };
  document.addEventListener('keydown',onKey);
  return()=>{document.body.style.overflow=overflow;if(content)content.inert=previousInert;document.removeEventListener('keydown',onKey);previous?.focus();};
 },[open,mobile]);
 const act=(callback:()=>void)=>{onOpenChange(false);callback();};
 return <>
  {open&&mobile&&<button className={styles.backdrop} tabIndex={-1} aria-label="Close navigation backdrop" onClick={()=>onOpenChange(false)}/>}
  <aside ref={panel} id="relay-sidebar" className={`${styles.sidebar} ${open?styles.open:''}`} aria-label="Relay navigation" aria-hidden={mobile&&!open?true:undefined} role={mobile&&open?'dialog':undefined} aria-modal={mobile&&open?true:undefined}>
   <div className={styles.brandRow}><button className={styles.brand} aria-label="Relay home" onClick={()=>act(()=>onNavigate('Home'))}><RelayLogo/></button><button className={styles.close} aria-label="Close navigation" onClick={()=>onOpenChange(false)}><X size={20}/></button></div>
   <div className={styles.workspace}><span className={styles.workspaceIcon}><Radio size={17}/></span><span>Community response<small>Personal workspace</small></span><ChevronRight size={13}/></div>
   <nav aria-label="Main navigation" className={styles.navigation}><p>WORKSPACE</p>{navigation.map(item=><button key={item.view} className={`${styles.item} glow-button ${view===item.view?styles.active:''}`} aria-current={view===item.view?'page':undefined} onClick={()=>act(()=>onNavigate(item.view))}><item.icon size={17}/><span>{item.label}</span>{item.view==='Signals'&&<small>{pendingCount}</small>}{view===item.view&&<i/>}</button>)}
    <p className={styles.toolsLabel}>TOOLS</p>
    <button className={`${styles.item} glow-button ${view==='Operations'?styles.active:''}`} aria-current={view==='Operations'?'page':undefined} onClick={()=>act(()=>onNavigate('Operations'))}><FlaskConical size={17}/><span>Operations lab</span></button>
    <button className={`${styles.item} glow-button`} onClick={()=>act(onReport)} disabled={!ready}><Plus size={17}/><span>Report incident</span></button>
    <button className={`${styles.item} glow-button`} onClick={()=>act(onRehearsal)}><Play size={16}/><span>Play rehearsal</span></button>
   </nav>
   <div className={styles.bottom}><button className={`${styles.item} glow-button`} onClick={()=>act(onSettings)}><SlidersHorizontal size={17}/><span>Experience</span></button><button className={`${styles.item} glow-button`} onClick={()=>act(onHelp)}><CircleHelp size={17}/><span>Help & getting started</span></button><div className={styles.local}><ShieldCheck size={17}/><span>Local-first. Human-led.<small>Powered by AWS Cedar</small></span></div><div className={styles.version}><span>RELAY</span><span>DEMO / 01</span></div></div>
  </aside>
 </>;
}
