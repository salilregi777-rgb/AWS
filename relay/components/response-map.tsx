'use client';
import { useMemo, useState } from 'react';
import { Crosshair, Plus, Minus, Layers } from 'lucide-react';
import { Incident, Team } from '@/lib/relay';
function project(lat:number,lng:number,z:number){const s=256*2**z;return {x:(lng+180)/360*s,y:(1-Math.log(Math.tan(lat*Math.PI/180)+1/Math.cos(lat*Math.PI/180))/Math.PI)/2*s};}
export default function ResponseMap({incidents,teams,selected,onSelect,route}:{incidents:Incident[];teams:Team[];selected:string;onSelect:(id:string)=>void;route?:{team:Team;incident:Incident}}){
 const [zoom,setZoom]=useState(12);const [showTeams,setShowTeams]=useState(true);const [tileError,setTileError]=useState(false);
 const center=project(12.946,77.634,zoom),width=1080,height=640;
 const point=(lat:number,lng:number)=>{const p=project(lat,lng,zoom);return {x:p.x-center.x+width/2,y:p.y-center.y+height/2};};
 const tiles=useMemo(()=>{const c=project(12.946,77.634,zoom);const tx=Math.floor((c.x-width/2)/256),ty=Math.floor((c.y-height/2)/256);return Array.from({length:30},(_,i)=>({x:tx+i%6,y:ty+Math.floor(i/6)}));},[zoom]);
 const from=route?point(route.team.lat,route.team.lng):null,to=route?point(route.incident.lat,route.incident.lng):null;
 return <div className="response-map"><svg className="map-canvas" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" aria-label="Bengaluru sample incident map">
 <defs><pattern id="mapgrid" width="38" height="38" patternUnits="userSpaceOnUse"><path d="M 38 0 L 0 0 0 38" fill="none" stroke="#ffffff09"/></pattern><radialGradient id="floodglow"><stop stopColor="#f87543" stopOpacity=".15"/><stop offset="1" stopColor="#f87543" stopOpacity="0"/></radialGradient></defs>
 <rect width={width} height={height} fill="#182223"/><rect width={width} height={height} fill="url(#mapgrid)"/>
 {tiles.map(t=><image className="map-tile" key={`${zoom}-${t.x}-${t.y}`} href={`https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`} x={t.x*256-center.x+width/2} y={t.y*256-center.y+height/2} width="256" height="256" opacity=".82" onError={()=>setTileError(true)}/>)}
 <circle cx={point(12.9348,77.676).x} cy={point(12.9348,77.676).y} r="170" fill="url(#floodglow)"/>
 {from&&to&&<g><path d={`M ${from.x} ${from.y} Q ${from.x-60} ${to.y-80} ${to.x} ${to.y}`} className="route-underlay"/><path d={`M ${from.x} ${from.y} Q ${from.x-60} ${to.y-80} ${to.x} ${to.y}`} className="route-line"/></g>}
 {showTeams&&teams.map(team=>{const p=point(team.lat,team.lng);return <g key={team.id} transform={`translate(${p.x},${p.y})`}><circle r="14" fill="#202e41" stroke="#7eaab6" strokeWidth="1.5"/><path d="M-5 0h10M0-5v10" stroke="#a5dceb" strokeWidth="2"/><title>{team.name}</title></g>;})}
 {incidents.filter(i=>i.status!=='resolved').map(i=>{const p=point(i.lat,i.lng),active=i.id===selected;return <g key={i.id} className={`map-marker ${active?'selected':''}`} transform={`translate(${p.x},${p.y})`} role="button" tabIndex={0} aria-label={`${i.title}, ${i.location}`} onClick={()=>onSelect(i.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(i.id);}}}>
 {active&&<><circle className="signal-ring" r="27"/><circle r="29" fill="#f5793b10" stroke="#f5793b45"/></>}
 <circle r={active?18:13} fill={i.status==='dispatched'?'#639bab':i.severity==='critical'?'#ff754c':i.severity==='high'?'#eeb45c':'#a9bcc3'} stroke="#1a2425" strokeWidth="3"/>
 <text y="5" textAnchor="middle" fontSize={active?17:13} fontWeight="700" fill="#162327">{i.category==='medical'?'+':i.category==='supplies'?'□':i.category==='rescue'?'!':'↗'}</text>
 {active&&<g transform="translate(-80,39)"><rect width="160" height="36" rx="8" fill="#fff"/><text x="80" y="23" fill="#253133" textAnchor="middle" fontSize="14" fontWeight="600">{i.location}<tspan fill="#e87148"> · {i.people} people</tspan></text></g>}</g>;})}</svg>
 <div className="map-top"><span className="map-badge"><span className="live-dot"/>Bengaluru response zone</span><span className="map-simulation">SAMPLE SCENARIO</span></div>
 <div className="map-controls"><button aria-label="Zoom in" onClick={()=>setZoom(Math.min(14,zoom+1))}><Plus size={17}/></button><button aria-label="Zoom out" onClick={()=>setZoom(Math.max(11,zoom-1))}><Minus size={17}/></button><button aria-label="Reset map view" onClick={()=>setZoom(12)}><Crosshair size={17}/></button><button aria-label="Toggle response teams" aria-pressed={showTeams} onClick={()=>setShowTeams(!showTeams)}><Layers size={17}/></button></div>
 <div className="map-legend"><span><i className="legend-critical"/>Critical</span><span><i className="legend-high"/>High priority</span><span><i className="legend-team"/>Response team</span></div>
 <div className="map-attribution">{tileError?'Map tiles unavailable · markers remain usable. ':''}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>{route&&' · Illustrative connection, not navigation'}</div></div>;
}
