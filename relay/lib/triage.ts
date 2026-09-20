import { neighborhoods, type Category, type Severity, type Incident, type ReportInput } from './relay.ts';

export type TriageDraft = { category:Category|null; severity:Severity; location:string|null; people:number|null; title:string; evidence:string[]; needs:string[]; missing:string[] };
const rules:Record<Category,RegExp>={rescue:/\b(stranded|trapped|evacuat\w*|rescue|boat|rising water)\b/gi,medical:/\b(injur\w*|bleeding|unconscious|medical|first[- ]aid|ambulance)\b/gi,supplies:/\b(drinking water|food|meal\w*|supplies|blanket\w*|ration\w*|sealed water)\b/gi,infrastructure:/\b(power line|underpass|fallen line|electric\w*|road blocked|barrier\w*|bridge)\b/gi};
const wordNumbers:Record<string,number>={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
const numericPhrase='(?:\\d[\\d,]*|(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)';
function parseNumber(s:string){if(/^\d/.test(s))return /^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(s)?Number(s.replaceAll(',','')):null;const values=s.toLowerCase().split(/[ -]/).map(w=>wordNumbers[w]);return values.every(v=>v!==undefined)?values.reduce((a,b)=>a+b,0):null;}
export function triageReport(raw:string):TriageDraft {
 const text=raw.trim().slice(0,2000),evidence:string[]=[];
 // Suggestions are deliberately conservative. They are never diagnoses or verified facts.
 const positive=text.split(/[.;!\n]|\b(?:but|however|while)\b/i).filter(clause=>! /\b(?:no|not|without)\b/i.test(clause)).join('. ');
 const hits=Object.entries(rules).map(([category,regex])=>({category:category as Category,hits:[...positive.matchAll(new RegExp(regex))].map(m=>m[0])}));
 const categories=hits.filter(h=>h.hits.length);const category=categories.length===1?categories[0].category:null;
 const places=neighborhoods.filter(n=>text.toLowerCase().includes(n.name.toLowerCase()));const location=places.length===1?places[0].name:null;
 const counts=[...text.matchAll(new RegExp(`(?<![\\w,.-])(${numericPhrase})\\s+(?:people|residents|persons|patients)\\b`,'gi'))].filter(m=>! /\b(?:hundred(?:\s+and)?|thousand(?:\s+and)?|million(?:\s+and)?|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s*$/i.test(text.slice(0,m.index))).map(m=>({value:parseNumber(m[1]),quote:m[0]})).filter((c):c is {value:number;quote:string}=>c.value!==null);
 const total=text.match(new RegExp(`(?<![\\w,.-])(${numericPhrase})\\s+(?:people\\s+)?(?:in total|total)(?=\\s*(?:[.,;!]|$|\\b(?:in|at|from)\\b))`,'i'));
 const unique=[...new Set(counts.map(c=>c.value))];const people=total?parseNumber(total[1]):unique.length===1?unique[0]:null;
 const urgent=positive.match(/\b(trapped|stranded|unconscious|rising water|bleeding)\b/i);const severity:Severity=urgent?'critical':'high';
 if(location)evidence.push(`Location mentioned: “${location}”`);
 if(people!==null)evidence.push(`Headcount mentioned: “${total?.[0]??counts[0]?.quote}”`);
 categories.forEach(c=>evidence.push(`Support cue: “${[...new Set(c.hits)].join(', ')}”`));
 if(urgent)evidence.push(`Urgency cue: “${urgent[0]}”`);
 const missing=[...(!location?['Confirm one supported neighbourhood']:[]),...(!category?['Choose the primary support needed']:[]),...(people===null||people>10000?['Confirm the number of people']:[])];
 if(categories.length>1)missing.push('Multiple support types mentioned; coordinate additional needs separately');
 if(/\b(?:no|not|without)\b/i.test(text))missing.push('Negated clauses were excluded from support and urgency suggestions; review the full report');
 const titles:Record<Category,string>={rescue:'Rescue assistance requested',medical:'Medical team requested',supplies:'Essential supplies requested',infrastructure:'Infrastructure support requested'};
 return {category,severity,location,people:people!==null&&people<=10000?people:null,title:category?`${titles[category]}${location?' in '+location:''}`:'Community assistance requested',evidence,needs:[...new Set(categories.flatMap(c=>c.hits))],missing};
}
function tokens(text:string){return new Set(text.toLowerCase().replace(/families/g,'family').replace(/residents|people|persons/g,'resident').match(/[a-z]{4,}/g)?.filter(t=>!['with','from','this','that','need','needed','have','been','report','reported','request','requested'].includes(t))??[]);}
export function duplicateCandidates(input:Pick<ReportInput,'description'|'title'|'category'|'location'>,incidents:Incident[]){
 const a=tokens(input.title+' '+input.description);
 return incidents.filter(i=>i.status==='open'&&i.district==='bengaluru'&&i.location===input.location&&i.category===input.category).map(incident=>{const b=tokens(incident.title+' '+incident.description);const common=[...a].filter(t=>b.has(t));return {incident,overlap:common,score:common.length/Math.max(1,Math.min(a.size,b.size))};}).filter(c=>c.overlap.length>=2&&c.score>=.2).sort((a,b)=>b.score-a.score);
}
export function fuseReport(target:Incident,incoming:ReportInput,id:string,time:string):Incident{
 if(target.status!=='open'||target.location!==incoming.location||target.category!==incoming.category||target.district!=='bengaluru')throw new Error('Only open signals in the same neighbourhood and category can be combined.');
 if((target.reports?.length??0)>=30)throw new Error('This signal already has 30 supporting reports.');
 if(target.description.trim().toLowerCase()===incoming.description.trim().toLowerCase()||target.reports?.some(r=>r.text.trim().toLowerCase()===incoming.description.trim().toLowerCase()))throw new Error('This exact report is already recorded.');
 const weight={moderate:0,high:1,critical:2};
 return {...target,originalReport:target.originalReport??{people:target.people,severity:target.severity,...(target.evidence?{evidence:target.evidence}:{})},people:Math.max(target.people,incoming.people),severity:weight[incoming.severity]>weight[target.severity]?incoming.severity:target.severity,reports:[...(target.reports??[]),{id,text:incoming.description,reportedAt:time,people:incoming.people,severity:incoming.severity}]};
}
export const reportExamples=[
 {label:'Flood rescue',text:'12 residents are stranded by rising water in Bellandur. Three older adults are waiting on the first floor. A boat is needed to reach the building.'},
 {label:'Medical support',text:'8 people at the HSR Layout relief centre need a medical team and first-aid supplies. Access is clear from the main entrance.'},
 {label:'Supply request',text:'35 residents in Koramangala need drinking water and food at the community hall. Volunteers can receive supplies at the north entrance.'},
];
