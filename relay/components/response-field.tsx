'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Crosshair, Pause, Play, Plus, Minus } from 'lucide-react';
import type { Incident } from '@/lib/relay';
import { teams } from '@/lib/relay';
import ResponseMap from './response-map';
import type * as Three from 'three';

export default function ResponseField({incidents,selected,onSelect}:{incidents:Incident[];selected:string;onSelect:(id:string)=>void}){
 const host=useRef<HTMLDivElement>(null),labels=useRef<Record<string,HTMLButtonElement|null>>({}),selection=useRef(selected),zoom=useRef(1),motion=useRef(true),invalidate=useRef<()=>void>(()=>{});
 const [failed,setFailed]=useState(false),[ready,setReady]=useState(false),[paused,setPaused]=useState(false);
 selection.current=selected;
 useEffect(()=>{invalidate.current();},[selected,paused]);
 useEffect(()=>{
  const el=host.current;if(!el)return;let cancelled=false,cleanup=()=>{};
  import('three').then(T=>{
   if(cancelled)return;
   let renderer:Three.WebGLRenderer;try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}catch{setFailed(true);return;}
   renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.setClearColor(0x080a0b,0);renderer.outputColorSpace=T.SRGBColorSpace;el.appendChild(renderer.domElement);
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,1,.1,150),world=new T.Group();scene.add(world);world.rotation.y=-.24;
   cleanup=()=>{scene.traverse(obj=>{const o=obj as Three.Mesh;o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});renderer.dispose();renderer.domElement.remove();};
   camera.position.set(2,16,23);camera.lookAt(0,0,0);
   const visible=incidents.filter(i=>i.status!=='resolved');
   const coordinate=(lat:number,lng:number)=>({x:(lng-77.63)*180*Math.cos(12.945*Math.PI/180),z:(12.945-lat)*180});
   const signalPoints=visible.map(i=>({...coordinate(i.lat,i.lng),incident:i,power:i.severity==='critical'?3.7:i.severity==='high'?2.5:1.6}));
   const elevation=(x:number,z:number)=>{let h=.07;for(const p of signalPoints){const d=(x-p.x)**2+(z-p.z)**2;h+=Math.exp(-d/7.5)*p.power*(p.incident.status==='dispatched'?.48:1);}return h+.12*Math.sin(x*.9)*Math.cos(z*.65);};
   const geometry=new T.BufferGeometry(),positions:number[]=[],colors:number[]=[];
   for(let a=0;a<180;a++)for(let b=0;b<132;b++){const x=(a/179-.5)*29,z=(b/131-.5)*21,h=elevation(x,z),edge=Math.max(Math.abs(x)/14.5,Math.abs(z)/10.5);positions.push(x,h,z);const hot=Math.min(h/5,1),c=new T.Color().lerpColors(new T.Color('#647b71'),new T.Color('#eaaa70'),hot);const fade=Math.max(.15,1-edge**5);colors.push(c.r*fade,c.g*fade,c.b*fade);}
   geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
   const pointMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,blending:T.AdditiveBlending,uniforms:{uTime:{value:0},uDpr:{value:renderer.getPixelRatio()}},vertexShader:'uniform float uTime; uniform float uDpr; varying vec3 vColor; varying float vAlpha; void main(){vColor=color; vec3 p=position; p.y+=sin(p.x*.55+p.z*.65+uTime*.45)*.08; vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(36./-mv.z,1.,3.4)*uDpr; vAlpha=.52+.24*sin(p.x*.8+uTime*.2);}',fragmentShader:'varying vec3 vColor; varying float vAlpha; void main(){float d=length(gl_PointCoord-.5); if(d>.5)discard; float a=pow(1.-d*2.,.5); gl_FragColor=vec4(vColor,a*vAlpha);}'});
   world.add(new T.Points(geometry,pointMaterial));
   // Isolines encode a priority field derived from sample incidents, not elevation.
   const gridPositions:number[]=[];
   for(let row=-10;row<=10;row+=.65)for(let x=-14;x<14;x+=.2){gridPositions.push(x,elevation(x,row)-.02,row,x+.2,elevation(x+.2,row)-.02,row);}
   const linesGeometry=new T.BufferGeometry();linesGeometry.setAttribute('position',new T.Float32BufferAttribute(gridPositions,3));world.add(new T.LineSegments(linesGeometry,new T.LineBasicMaterial({color:'#97b39b',transparent:true,opacity:.12})));
   const grid=new T.GridHelper(44,44,0x26342d,0x1a2420);grid.position.y=-.6;const gm=grid.material as Three.Material;gm.transparent=true;gm.opacity=.45;world.add(grid);
   const rings:Three.Mesh[]=[];const markers:{id:string;point:Three.Vector3}[]=[];
   const torus=new T.RingGeometry(.27,.3,48),small=new T.SphereGeometry(.09,12,12);
   for(const p of signalPoints){
    const y=elevation(p.x,p.z),color=p.incident.status==='dispatched'?0xd1eaa2:p.incident.severity==='critical'?0xff8452:0xe8c897;
    const base=new T.Mesh(torus,new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.8}));base.rotation.x=-Math.PI/2;base.position.set(p.x,y+.13,p.z);base.userData={id:p.incident.id};world.add(base);rings.push(base);
    const glow=new T.Mesh(new T.RingGeometry(.32,.35,48),new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.2}));glow.rotation.x=-Math.PI/2;glow.position.copy(base.position);glow.userData={id:p.incident.id,pulse:true};world.add(glow);rings.push(glow);
    const stem=new T.BufferGeometry().setFromPoints([new T.Vector3(p.x,y,p.z),new T.Vector3(p.x,y+1.25,p.z)]);world.add(new T.Line(stem,new T.LineBasicMaterial({color,transparent:true,opacity:.55})));
    const tip=new T.Mesh(small,new T.MeshBasicMaterial({color}));tip.position.set(p.x,y+1.28,p.z);world.add(tip);markers.push({id:p.incident.id,point:tip.position.clone()});
   }
   const couriers:{mesh:Three.Mesh;curve:Three.QuadraticBezierCurve3}[]=[];
   for(const p of signalPoints.filter(p=>p.incident.status==='dispatched')){const team=teams.find(t=>t.id===p.incident.teamId);if(!team)continue;const t=coordinate(team.lat,team.lng),start=new T.Vector3(t.x,elevation(t.x,t.z)+.1,t.z),end=new T.Vector3(p.x,elevation(p.x,p.z)+.2,p.z),mid=start.clone().add(end).multiplyScalar(.5);mid.y+=4;const curve=new T.QuadraticBezierCurve3(start,mid,end);world.add(new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(80)),new T.LineBasicMaterial({color:0xc9f29a,transparent:true,opacity:.6})));const mesh=new T.Mesh(new T.SphereGeometry(.12,12,12),new T.MeshBasicMaterial({color:0xe2ffb9}));world.add(mesh);couriers.push({mesh,curve});}
   const dustGeo=new T.BufferGeometry(),dust:number[]=[];for(let i=0;i<180;i++){const rand=(n:number)=>{const a=Math.sin(n*127.1)*43758.5453;return a-Math.floor(a);};dust.push((rand(i+1)-.5)*45,rand(i+31)*13,(rand(i+80)-.5)*30);}dustGeo.setAttribute('position',new T.Float32BufferAttribute(dust,3));const dustCloud=new T.Points(dustGeo,new T.PointsMaterial({color:'#9baf94',size:.025,transparent:true,opacity:.45,depthWrite:false}));scene.add(dustCloud);
   let width=1,height=1,frame=0,time=0,last=0;let targetX=0,targetY=0;let schedule=()=>{};const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
   const resize=()=>{width=el.clientWidth;height=el.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();schedule();};
   const observer=new ResizeObserver(resize);observer.observe(el);resize();
   const pointer=(e:PointerEvent)=>{if(!motion.current||reduced.matches)return;const r=el.getBoundingClientRect();targetX=Math.max(-.5,Math.min(.5,(e.clientX-r.left)/r.width-.5));targetY=Math.max(-.5,Math.min(.5,(e.clientY-r.top)/r.height-.5));schedule();};window.addEventListener('pointermove',pointer,{passive:true});
   const projected=new T.Vector3();
   const render=(now:number)=>{frame=0;if(cancelled||document.hidden)return;const moving=motion.current&&!reduced.matches;if(moving&&now-last<30){schedule();return;}const dt=Math.min((now-last)/1000,.05);last=now;if(moving)time+=dt;
    pointMaterial.uniforms.uTime.value=time;if(moving){world.rotation.y=T.MathUtils.damp(world.rotation.y,-.24+targetX*.12,2,dt);world.rotation.x=T.MathUtils.damp(world.rotation.x,targetY*.045,2,dt);camera.position.z=T.MathUtils.damp(camera.position.z,23/zoom.current,3,dt);camera.position.y=T.MathUtils.damp(camera.position.y,16/zoom.current,3,dt);}else{camera.position.z=23/zoom.current;camera.position.y=16/zoom.current;if(reduced.matches){world.rotation.y=-.24;world.rotation.x=0;}}camera.lookAt(0,1,0);world.updateMatrixWorld(true);
    for(const r of rings){const active=r.userData.id===selection.current;const scale=r.userData.pulse?1+(time*.4%1)*4:active?1.3:1;r.scale.setScalar(scale);(r.material as Three.MeshBasicMaterial).opacity=r.userData.pulse?(1-time*.4%1)*(active?.5:.18):active?1:.5;}
    couriers.forEach(c=>c.mesh.position.copy(c.curve.getPoint(time*.13%1)));dustCloud.rotation.y=time*.007;
    renderer.render(scene,camera);
    for(const marker of markers){const label=labels.current[marker.id];if(!label)continue;projected.copy(marker.point).applyMatrix4(world.matrixWorld).project(camera);const x=(projected.x*.5+.5)*width,y=(-projected.y*.5+.5)*height;label.style.transform=`translate3d(${x}px,${y}px,0)`;label.style.visibility=projected.z<1&&x>0&&x<width&&y>0&&y<height?'visible':'hidden';}
    if(moving)schedule();
   };schedule=()=>{if(!frame&&!cancelled&&!document.hidden)frame=requestAnimationFrame(render);};invalidate.current=schedule;schedule();setReady(true);
   const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{last=performance.now();schedule();}};
   document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',schedule);
   const lost=(event:Event)=>{event.preventDefault();cleanup();setFailed(true);};renderer.domElement.addEventListener('webglcontextlost',lost);
   let disposed=false;cleanup=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(frame);frame=0;invalidate.current=()=>{};observer.disconnect();window.removeEventListener('pointermove',pointer);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',schedule);renderer.domElement.removeEventListener('webglcontextlost',lost);const geometries=new Set<Three.BufferGeometry>(),materials=new Set<Three.Material>();scene.traverse(obj=>{const o=obj as Three.Mesh;if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
  }).catch(()=>{cleanup();if(!cancelled)setFailed(true);});
  return ()=>{cancelled=true;cleanup();};
 },[incidents]);
 if(failed)return <div className="field-fallback"><ResponseMap incidents={incidents} teams={teams} selected={selected} onSelect={onSelect}/><span>3D unavailable · geographic view active</span></div>;
 return <div className={`response-field ${ready?'field-ready':''}`}><div ref={host} className="webgl-host" aria-hidden="true"/>
 <div className="field-labels">{incidents.filter(i=>i.status!=='resolved').map(i=><button key={i.id} ref={e=>{labels.current[i.id]=e;}} className={`field-marker ${i.id===selected?'focused':''} ${i.status==='dispatched'?'assigned':''}`} onClick={()=>onSelect(i.id)} aria-label={`Review ${i.title}, ${i.location}`}><span className="beacon-target"><i/><i/></span><span className="beacon-label"><span>{i.location}</span><small>{i.people} people <ArrowUpRight size={12}/></small></span></button>)}</div>
 <div className="field-controls"><button aria-label="Zoom into response field" onClick={()=>{zoom.current=Math.min(1.35,zoom.current+.1);invalidate.current();}}><Plus size={16}/></button><button aria-label="Zoom out of response field" onClick={()=>{zoom.current=Math.max(.8,zoom.current-.1);invalidate.current();}}><Minus size={16}/></button><button aria-label="Reset field view" onClick={()=>{zoom.current=1;invalidate.current();}}><Crosshair size={16}/></button><button aria-label={paused?'Resume ambient motion':'Pause ambient motion'} onClick={()=>{motion.current=!motion.current;setPaused(!motion.current);}}>{paused?<Play size={15}/>:<Pause size={15}/>}</button></div>
 </div>;
}
