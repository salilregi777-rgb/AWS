import { z } from 'zod';
import { initialIncidents, teams, type Incident, type Audit } from './relay';
const incidentSchema=z.object({id:z.string().max(80),title:z.string().min(4).max(100),location:z.string().max(80),lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180),category:z.enum(['rescue','medical','supplies','infrastructure']),severity:z.enum(['critical','high','moderate']),people:z.number().int().min(0).max(10000),description:z.string().min(10).max(2000),source:z.string().max(80),status:z.enum(['open','dispatched','resolved']),createdAt:z.string().datetime(),teamId:z.string().optional(),district:z.string().max(80)});
const auditSchema=z.object({id:z.string(),time:z.string().datetime(),action:z.string(),detail:z.string(),outcome:z.enum(['Allow','Deny','Info']),policy:z.string().optional()});
const snapshotSchema=z.object({version:z.literal(1),incidents:z.array(incidentSchema).min(1).max(500),audit:z.array(auditSchema).max(1000)}).superRefine((data,ctx)=>{
 const ids=new Set<string>(),assigned=new Set<string>();
 data.incidents.forEach((i,index)=>{
  const invalid=(message:string)=>ctx.addIssue({code:z.ZodIssueCode.custom,message,path:['incidents',index]});
  if(ids.has(i.id))invalid('Duplicate signal ID');ids.add(i.id);
  if(i.teamId&&!teams.some(t=>t.id===i.teamId))invalid('Unknown team');
  if(i.status==='dispatched'){if(!i.teamId)invalid('Dispatched signal has no team');else{if(assigned.has(i.teamId))invalid('Team assigned more than once');assigned.add(i.teamId);}}
 });
});
export const STORAGE_KEY='relay-workspace-v1';
export type Snapshot={version:1;incidents:Incident[];audit:Audit[]};
export function freshSnapshot():Snapshot{return {version:1,incidents:structuredClone(initialIncidents),audit:[]};}
export function parseSnapshot(raw:string):Snapshot{return snapshotSchema.parse(JSON.parse(raw));}
