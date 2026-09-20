'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { playCue } from '@/lib/sound';
import { authorize, loadCedar, type PolicyDecision } from '@/lib/cedar';
import { createAuthorizationRequest, type Role } from '@/lib/policy';
import { neighborhoods, teams, type Incident, type Audit, type ReportInput } from '@/lib/relay';
import { STORAGE_KEY, freshSnapshot, parseSnapshot, reportInputSchema, type Snapshot } from '@/lib/storage';
import { fuseReport } from '@/lib/triage';

export function useRelay(){
 const [snapshot,setSnapshot]=useState<Snapshot>(freshSnapshot),[ready,setReady]=useState(false),[engine,setEngine]=useState('Loading Cedar'),[busy,setBusy]=useState(false);
 const current=useRef(snapshot),lock=useRef(false);
 const commit=(value:Snapshot)=>{current.current=value;setSnapshot(value);try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));}catch{toast.warning('Changes are in memory only. Browser storage is unavailable.');}};
 useEffect(()=>{try{const saved=localStorage.getItem(STORAGE_KEY);if(saved){const data=parseSnapshot(saved);current.current=data;setSnapshot(data);}}catch{toast.warning('Saved workspace could not be read. A fresh scenario is shown.');}setReady(true);loadCedar().then(c=>setEngine(`Cedar ${c.getCedarVersion()}`)).catch(()=>setEngine('Cedar unavailable'));},[]);
 function record(action:string,detail:string,result?:PolicyDecision,incidentId?:string,kind?:Audit['kind']){const event:Audit={id:crypto.randomUUID(),time:new Date().toISOString(),action,detail,outcome:result?.decision??'Info',policy:result?.reasons.join(', '),incidentId,kind};return [event,...current.current.audit].slice(0,1000);}
 async function transition(id:string,action:'dispatch'|'resolve',role:Role,confirmed:boolean,teamId?:string):Promise<PolicyDecision|undefined>{
  if(lock.current||!ready)return; lock.current=true;setBusy(true);
  try{
   const incident=current.current.incidents.find(i=>i.id===id);if(!incident)throw new Error('Signal no longer exists.');
   const team=teams.find(t=>t.id===(action==='resolve'?incident.teamId:teamId));
   const result=await authorize(createAuthorizationRequest({action,role,incident,team,incidents:current.current.incidents,confirmed}));
   if(result.allowed){const incidents=current.current.incidents.map(i=>i.id===id?{...i,status:action==='dispatch'?'dispatched' as const:'resolved' as const,...(action==='dispatch'?{teamId:team!.id}:{})}:i);commit({...current.current,incidents,audit:record(action==='dispatch'?'Team dispatched':'Signal resolved',`${incident.id} · ${incident.location}${team?' · '+team.name:''}`,result,id,action)});playCue('success');toast.success(action==='dispatch'?`${team!.name} assigned to ${incident.location}`:'Response resolved. The team is available again.');}
   else{commit({...current.current,audit:record('Action blocked',`${incident.id} · ${action} as ${role}`,result,id,'denied')});playCue('blocked');toast.error('Cedar denied this action. No assignment changed.');}
   return result;
  }catch(e){playCue('blocked');toast.error(e instanceof Error?e.message:'Could not load Cedar. No changes were made.');return undefined;}finally{lock.current=false;setBusy(false);}
 }
 async function report(raw:ReportInput,fusion?:{targetId:string;confirmed:boolean}){
  if(lock.current||!ready)return false;lock.current=true;setBusy(true);
  try{const input=reportInputSchema.parse({...raw,title:raw.title.trim(),description:raw.description.trim()});
   const place=neighborhoods.find(p=>p.name===input.location);if(!place)throw new Error('Choose a supported neighbourhood.');input.lat=place.lat;input.lng=place.lng;
   if(fusion){const target=current.current.incidents.find(i=>i.id===fusion.targetId);if(!target)throw new Error('The original signal no longer exists.');
    const combined=fuseReport(target,input,crypto.randomUUID(),new Date().toISOString());
    const result=await authorize(createAuthorizationRequest({action:'fuse',role:'coordinator',incident:target,incidents:current.current.incidents,confirmed:fusion.confirmed}));
    if(!result.allowed){commit({...current.current,audit:record('Fusion blocked',`${target.id} · Human confirmation required`,result,target.id,'denied')});throw new Error('Cedar denied the fusion. No reports changed.');}
    commit({...current.current,incidents:current.current.incidents.map(i=>i.id===target.id?combined:i),audit:record('Supporting report combined',`${target.id} · Original reports retained · Headcount kept at the higher estimate: ${combined.people}`,result,target.id,'fusion')});playCue('success');toast.success('Reports combined. One incident, a clearer picture.');return target.id;
   }
   if(current.current.incidents.length>=500)throw new Error('This local workspace supports up to 500 signals.');
   const duplicate=current.current.incidents.find(i=>i.status!=='resolved'&&i.location===input.location&&i.description.trim().toLowerCase()===input.description.trim().toLowerCase());if(duplicate)throw new Error(`This signal already exists: ${duplicate.id}. Review it from Signals.`);
   const incident:Incident={...input,title:input.title.trim(),description:input.description.trim(),id:`RLY-${crypto.randomUUID().slice(0,8).toUpperCase()}`,createdAt:new Date().toISOString(),status:'open',source:'Local report',district:'bengaluru'};
   const result=await authorize(createAuthorizationRequest({action:'report',role:'volunteer',incident,incidents:current.current.incidents,confirmed:true}));
   if(!result.allowed)throw new Error('Cedar denied the report. No changes were made.');
   commit({...current.current,incidents:[incident,...current.current.incidents],audit:record('Signal reported',`${incident.id} · ${incident.title}`,result,incident.id,'report')});playCue('success');toast.success('Signal added to the response workspace.');return incident.id;
  }catch(e){playCue('blocked');toast.error(e instanceof Error?e.message:'Report could not be saved.');return false;}finally{lock.current=false;setBusy(false);}
 }
 function reset(){if(lock.current)return;const backup=current.current;const resetState=freshSnapshot();commit(resetState);playCue('success');toast.success('Sample scenario restored.',{action:{label:'Undo',onClick:()=>{if(lock.current||current.current!==resetState){toast.info('Undo expired because the workspace changed.');return;}commit(backup);}}});}
 function exportSnapshot(){const file={...current.current,exportedAt:new Date().toISOString(),mode:'local-demo',notice:'Synthetic scenario and locally entered reports. Cedar runs in the browser; this is not a production security boundary.'};const url=URL.createObjectURL(new Blob([JSON.stringify(file,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`relay-response-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);playCue('success');toast.success('Workspace and decision log exported.');}
 return {...snapshot,ready,engine,busy,transition,report,reset,exportSnapshot};
}
