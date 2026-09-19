'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { authorize, loadCedar, type PolicyDecision } from '@/lib/cedar';
import { createAuthorizationRequest, type Role } from '@/lib/policy';
import { teams, type Incident, type Audit } from '@/lib/relay';
import { STORAGE_KEY, freshSnapshot, parseSnapshot, type Snapshot } from '@/lib/storage';

export function useRelay(){
 const [snapshot,setSnapshot]=useState<Snapshot>(freshSnapshot),[ready,setReady]=useState(false),[engine,setEngine]=useState('Loading Cedar'),[busy,setBusy]=useState(false);
 const current=useRef(snapshot),lock=useRef(false);
 const commit=(value:Snapshot)=>{current.current=value;setSnapshot(value);try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));}catch{toast.warning('Changes are in memory only. Browser storage is unavailable.');}};
 useEffect(()=>{try{const saved=localStorage.getItem(STORAGE_KEY);if(saved){const data=parseSnapshot(saved);current.current=data;setSnapshot(data);}}catch{toast.warning('Saved workspace could not be read. A fresh scenario is shown.');}setReady(true);loadCedar().then(c=>setEngine(`Cedar ${c.getCedarVersion()}`)).catch(()=>setEngine('Cedar unavailable'));},[]);
 function record(action:string,detail:string,result?:PolicyDecision){const event:Audit={id:crypto.randomUUID(),time:new Date().toISOString(),action,detail,outcome:result?.decision??'Info',policy:result?.reasons.join(', ')};return [event,...current.current.audit].slice(0,1000);}
 async function transition(id:string,action:'dispatch'|'resolve',role:Role,confirmed:boolean,teamId?:string):Promise<PolicyDecision|undefined>{
  if(lock.current||!ready)return; lock.current=true;setBusy(true);
  try{
   const incident=current.current.incidents.find(i=>i.id===id);if(!incident)throw new Error('Signal no longer exists.');
   const team=teams.find(t=>t.id===(action==='resolve'?incident.teamId:teamId));
   const result=await authorize(createAuthorizationRequest({action,role,incident,team,incidents:current.current.incidents,confirmed}));
   if(result.allowed){const incidents=current.current.incidents.map(i=>i.id===id?{...i,status:action==='dispatch'?'dispatched' as const:'resolved' as const,...(action==='dispatch'?{teamId:team!.id}:{})}:i);commit({...current.current,incidents,audit:record(action==='dispatch'?'Team dispatched':'Signal resolved',`${incident.id} · ${incident.location}${team?' · '+team.name:''}`,result)});toast.success(action==='dispatch'?`${team!.name} assigned to ${incident.location}`:'Response resolved. The team is available again.');}
   else{commit({...current.current,audit:record('Action blocked',`${incident.id} · ${action} as ${role}`,result)});toast.error('Cedar denied this action. No assignment changed.');}
   return result;
  }catch(e){toast.error(e instanceof Error?e.message:'Could not load Cedar. No changes were made.');return undefined;}finally{lock.current=false;setBusy(false);}
 }
 async function report(input:Omit<Incident,'id'|'createdAt'|'status'|'source'|'district'>){
  if(lock.current||!ready)return false;lock.current=true;setBusy(true);
  try{if(current.current.incidents.length>=500)throw new Error('This local workspace supports up to 500 signals.');
   const duplicate=current.current.incidents.find(i=>i.status!=='resolved'&&i.location===input.location&&i.title.trim().toLowerCase()===input.title.trim().toLowerCase());if(duplicate)throw new Error(`This signal already exists: ${duplicate.id}. Review it from Signals.`);
   const incident:Incident={...input,title:input.title.trim(),description:input.description.trim(),id:`RLY-${crypto.randomUUID().slice(0,8).toUpperCase()}`,createdAt:new Date().toISOString(),status:'open',source:'Local report',district:'bengaluru'};
   const result=await authorize(createAuthorizationRequest({action:'report',role:'volunteer',incident,incidents:current.current.incidents,confirmed:true}));
   if(!result.allowed)throw new Error('Cedar denied the report. No changes were made.');
   commit({...current.current,incidents:[incident,...current.current.incidents],audit:record('Signal reported',`${incident.id} · ${incident.title}`,result)});toast.success('Signal added to the response workspace.');return incident.id;
  }catch(e){toast.error(e instanceof Error?e.message:'Report could not be saved.');return false;}finally{lock.current=false;setBusy(false);}
 }
 function reset(){if(lock.current)return;const backup=current.current;const resetState=freshSnapshot();commit(resetState);toast.success('Sample scenario restored.',{action:{label:'Undo',onClick:()=>{if(lock.current||current.current!==resetState){toast.info('Undo expired because the workspace changed.');return;}commit(backup);}}});}
 function exportSnapshot(){const file={...current.current,exportedAt:new Date().toISOString(),mode:'local-demo',notice:'Synthetic scenario and locally entered reports. Cedar runs in the browser; this is not a production security boundary.'};const url=URL.createObjectURL(new Blob([JSON.stringify(file,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`relay-response-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast.success('Workspace and decision log exported.');}
 return {...snapshot,ready,engine,busy,transition,report,reset,exportSnapshot};
}
