export type Category = 'rescue' | 'medical' | 'supplies' | 'infrastructure';
export type Severity = 'critical' | 'high' | 'moderate';
export type SupportingReport = { id:string; text:string; reportedAt:string; people:number; severity:Severity };
export type Incident = { id: string; title: string; location: string; lat: number; lng: number; category: Category; severity: Severity; people: number; description: string; source: string; status: 'open' | 'dispatched' | 'resolved'; createdAt: string; teamId?: string; district: string; reports?:SupportingReport[]; evidence?:string[]; originalReport?:{people:number;severity:Severity;evidence?:string[]} };
export type ReportInput = Pick<Incident,'title'|'location'|'lat'|'lng'|'category'|'severity'|'people'|'description'|'evidence'>;
export type Team = { id: string; name: string; initials: string; skill: Category; members: number; capacity: number; lat: number; lng: number; district: string; color: string };
export type Audit = { id: string; time: string; action: string; detail: string; outcome: 'Allow' | 'Deny' | 'Info'; policy?: string; incidentId?:string; kind?:'report'|'dispatch'|'resolve'|'fusion'|'denied' };
export const scenarioTime = '2026-09-19T04:30:00.000Z';
export const categoryLabels: Record<Category, string> = { rescue: 'Rescue', medical: 'Medical', supplies: 'Supplies', infrastructure: 'Infrastructure' };
export const initialIncidents: Incident[] = [
 { id:'RLY-1042', title:'Families stranded by rising water', location:'Bellandur', lat:12.9348, lng:77.676, category:'rescue', severity:'critical', people:12, description:'Water has entered the ground floor. Twelve residents, including three older adults, are waiting on the first floor. A boat team is needed. Location and headcount require on-site verification.', source:'Community report', status:'open', createdAt:scenarioTime, district:'bengaluru' },
 { id:'RLY-1041', title:'Medical support at relief centre', location:'HSR Layout', lat:12.9125, lng:77.639, category:'medical', severity:'critical', people:8, description:'The relief centre requests a trained medical team to assess eight residents. Bring first-aid supplies; no diagnosis has been confirmed.', source:'Relief centre', status:'open', createdAt:scenarioTime, district:'bengaluru' },
 { id:'RLY-1040', title:'Drinking water running low', location:'Koramangala', lat:12.9352, lng:77.6226, category:'supplies', severity:'high', people:35, description:'Thirty-five residents at the community hall need sealed drinking water and dry food. The hall entrance is accessible from the north.', source:'Volunteer report', status:'open', createdAt:scenarioTime, district:'bengaluru' },
 { id:'RLY-1039', title:'Underpass blocked by water', location:'Domlur', lat:12.9608, lng:77.6387, category:'infrastructure', severity:'high', people:0, description:'A flooded underpass has been reported. Request a trained infrastructure team to verify, place barriers, and coordinate with local authorities.', source:'Community report', status:'open', createdAt:scenarioTime, district:'bengaluru' },
 { id:'RLY-1038', title:'Assisted evacuation requested', location:'BTM Layout', lat:12.916, lng:77.609, category:'rescue', severity:'critical', people:6, description:'Six residents with mobility support needs request an assisted evacuation. A trained rescue crew and accessible transport are required.', source:'Community report', status:'open', createdAt:scenarioTime, district:'bengaluru' },
 { id:'RLY-1037', title:'Meal kits for temporary shelter', location:'Indiranagar', lat:12.9795, lng:77.645, category:'supplies', severity:'moderate', people:24, description:'A temporary shelter needs twenty-four meal kits for its evening distribution. Confirm dietary needs with the shelter coordinator.', source:'Shelter coordinator', status:'open', createdAt:scenarioTime, district:'bengaluru' },
 { id:'RLY-1036', title:'First-aid supplies requested', location:'Jayanagar', lat:12.9252, lng:77.583, category:'medical', severity:'high', people:10, description:'Ten residents are at a community aid post. The volunteer on site requests a trained medical team with replenishment supplies.', source:'Volunteer report', status:'open', createdAt:scenarioTime, district:'bengaluru' },
 { id:'RLY-1035', title:'Power line inspection needed', location:'Ejipura', lat:12.948, lng:77.628, category:'infrastructure', severity:'moderate', people:18, description:'A fallen line has been reported near eighteen homes. Keep the area clear and request an authorised infrastructure team to assess it.', source:'Community report', status:'open', createdAt:scenarioTime, district:'bengaluru' },
];
export const teams: Team[] = [
 {id:'t1',name:'Lake Rescue Unit',initials:'LR',skill:'rescue',members:6,capacity:16,lat:12.95,lng:77.658,district:'bengaluru',color:'#447f78'},
 {id:'t2',name:'Care Collective',initials:'CC',skill:'medical',members:4,capacity:12,lat:12.933,lng:77.643,district:'bengaluru',color:'#7b75ae'},
 {id:'t3',name:'Community Kitchen',initials:'CK',skill:'supplies',members:8,capacity:60,lat:12.946,lng:77.608,district:'bengaluru',color:'#c3894d'},
 {id:'t4',name:'City Response Crew',initials:'CR',skill:'infrastructure',members:5,capacity:30,lat:12.968,lng:77.616,district:'bengaluru',color:'#6284a1'},
 {id:'t5',name:'South Rescue Unit',initials:'SR',skill:'rescue',members:5,capacity:10,lat:12.904,lng:77.605,district:'bengaluru',color:'#738b55'},
];
export function distanceKm(a: {lat:number;lng:number}, b: {lat:number;lng:number}) {
 const r=Math.PI/180, dlat=(b.lat-a.lat)*r, dlng=(b.lng-a.lng)*r;
 const h=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlng/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
export function rankTeams(incident: Incident, incidents: Incident[]) {
 return teams.map(team=>{
 const busy=incidents.some(i=>i.status==='dispatched'&&i.teamId===team.id);
 const distance=distanceKm(incident,team);
 const reasons=[...(busy?['Already responding to another incident']:[]),...(team.skill!==incident.category?['Required skill does not match']:[]),...(team.capacity<incident.people?['Insufficient capacity']:[]),...(team.district!==incident.district?['Outside assigned district']:[])];
 return {team,distance,eligible:reasons.length===0,reasons,eta:Math.max(4,Math.ceil(distance/18*60+4))};
 }).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||a.distance-b.distance);
}
export const neighborhoods = initialIncidents.map(i=>({name:i.location,lat:i.lat,lng:i.lng}));
