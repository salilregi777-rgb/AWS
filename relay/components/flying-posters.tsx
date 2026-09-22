'use client';
import { useEffect, useRef, type HTMLAttributes } from 'react';
import { Renderer, Camera, Transform, Plane, Program, Mesh, Texture } from 'ogl';
import './flying-posters.css';
const vertexShader = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;
attribute vec3 normal;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

uniform float uPosition;
uniform float uTime;
uniform float uSpeed;
uniform vec3 distortionAxis;
uniform vec3 rotationAxis;
uniform float uDistortion;

varying vec2 vUv;
varying vec3 vNormal;

float PI = 3.141592653589793238;
mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat4(
      oc * axis.x * axis.x + c,         oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
      oc * axis.x * axis.y + axis.z * s,oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
      oc * axis.z * axis.x - axis.y * s,oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
      0.0,                              0.0,                                0.0,                                1.0
    );
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
  mat4 m = rotationMatrix(axis, angle);
  return (m * vec4(v, 1.0)).xyz;
}

float qinticInOut(float t) {
  return t < 0.5
    ? 16.0 * pow(t, 5.0)
    : -0.5 * abs(pow(2.0 * t - 2.0, 5.0)) + 1.0;
}

void main() {
  vUv = uv;
  
  float norm = 0.5;
  vec3 newpos = position;
  float offset = (dot(distortionAxis, position) + norm / 2.) / norm;
  float localprogress = clamp(
    (fract(uPosition * 5.0 * 0.01) - 0.01 * uDistortion * offset) / (1. - 0.01 * uDistortion),
    0.,
    2.
  );
  localprogress = qinticInOut(localprogress) * PI;
  newpos = rotate(newpos, rotationAxis, localprogress);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newpos, 1.0);
}
`;
const fragmentShader = `
precision highp float;

uniform vec2 uImageSize;
uniform vec2 uPlaneSize;
uniform sampler2D tMap;

varying vec2 vUv;

void main() {
  vec2 imageSize = uImageSize;
  vec2 planeSize = uPlaneSize;

  float imageAspect = imageSize.x / imageSize.y;
  float planeAspect = planeSize.x / planeSize.y;
  vec2 scale = vec2(1.0, 1.0);

  if (planeAspect > imageAspect) {
      scale.y = imageAspect / planeAspect;
  } else {
      scale.x = planeAspect / imageAspect;
  }

  vec2 uv = vUv * scale + (1.0 - scale) * 0.5;

  gl_FragColor = texture2D(tMap, uv);
}
`;

interface FlyingPostersProps extends HTMLAttributes<HTMLDivElement>{items?:string[];paused?:boolean;planeWidth?:number;planeHeight?:number;distortion?:number;scrollEase?:number;cameraFov?:number;cameraZ?:number;}
export default function FlyingPosters({items=[],paused=false,planeWidth=320,planeHeight=320,distortion=3,scrollEase=.04,cameraFov=45,cameraZ=20,className='',...props}:FlyingPostersProps){
 const containerRef=useRef<HTMLDivElement>(null),pausedRef=useRef(paused),syncRef=useRef<(()=>void)|null>(null);
 useEffect(()=>{pausedRef.current=paused;syncRef.current?.();},[paused]);
 const sources=JSON.stringify(items);
 useEffect(()=>{
  const container=containerRef.current;if(!container)return;
  const imageSources=JSON.parse(sources) as string[];if(!imageSources.length)return;
  const mediaQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
  let renderer:Renderer;
  try{renderer=new Renderer({alpha:true,antialias:true,dpr:Math.min(window.devicePixelRatio||1,1.5)});}catch{return;}
  const gl=renderer.gl,canvas=gl.canvas as HTMLCanvasElement;
  const camera=new Camera(gl,{fov:cameraFov});camera.position.z=cameraZ;
  const scene=new Transform(),geometry=new Plane(gl,{widthSegments:60,heightSegments:1});
  let frame=0,visible=true,disposed=false,failed=false,lastTime=0,current=0,target=0,width=1,height=1,viewportHeight=1,spacing=1,pointer:number|null=null,start=0,dragStart=0,loaded=0;
  const gallery=imageSources.length===1?[imageSources[0],imageSources[0],imageSources[0]]:imageSources;
  const medias=gallery.map((src,index)=>{
   const texture=new Texture(gl,{generateMipmaps:false}),program=new Program(gl,{vertex:vertexShader,fragment:fragmentShader,depthTest:false,depthWrite:false,cullFace:false,uniforms:{tMap:{value:texture},uPosition:{value:20},uPlaneSize:{value:[1,1]},uImageSize:{value:[1,1]},uSpeed:{value:0},rotationAxis:{value:[0,1,0]},distortionAxis:{value:[1,1,0]},uDistortion:{value:Math.min(50,Math.max(0,distortion))},uViewportSize:{value:[1,1]},uTime:{value:0}}});
   const mesh=new Mesh(gl,{geometry,program});mesh.setParent(scene);
   const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{if(disposed)return;texture.image=image;program.uniforms.uImageSize.value=[image.naturalWidth,image.naturalHeight];loaded++;draw();};image.src=src;
   return {texture,program,mesh,image,index};
  });
  const canAnimate=()=>!disposed&&!failed&&visible&&!document.hidden&&!pausedRef.current&&!mediaQuery.matches;
  function draw(){
   if(disposed||failed||!loaded)return;
   medias.forEach(({mesh,program,index})=>{const total=spacing*medias.length;const y=((index*spacing-current+total/2)%total+total)%total-total/2;mesh.position.y=y;program.uniforms.uPosition.value=20+Math.min(Math.abs(y)/viewportHeight,1)*9;});
   try{renderer.render({scene,camera});container!.dataset.ready='true';}catch{failed=true;delete container!.dataset.ready;}
  }
  function resize(){const rect=container!.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);renderer.setSize(width,height);camera.perspective({aspect:width/height});viewportHeight=2*Math.tan(camera.fov*Math.PI/360)*camera.position.z;const scale=Math.min(1,width*.88/planeWidth,height*.88/planeHeight);const x=viewportHeight*planeWidth*scale/height,y=viewportHeight*planeHeight*scale/height;const old=spacing;spacing=y+viewportHeight*.2;current=current/old*spacing;target=target/old*spacing;medias.forEach(({mesh,program})=>{mesh.scale.set(x,y,1);program.uniforms.uPlaneSize.value=[x,y];});draw();}
  function animate(time:number){frame=0;if(!canAnimate())return;const dt=lastTime?Math.min((time-lastTime)/1000,.05):0;lastTime=time;if(pointer===null)target+=dt*.16;current+=(target-current)*(1-Math.pow(1-Math.max(.001,Math.min(1,scrollEase)),dt*60));draw();frame=requestAnimationFrame(animate);}
  function sync(){cancelAnimationFrame(frame);frame=0;lastTime=0;if(mediaQuery.matches)delete container!.dataset.ready;else if(visible&&!document.hidden)draw();if(canAnimate())frame=requestAnimationFrame(animate);}
  function down(e:PointerEvent){if(!canAnimate()||e.button!==0)return;pointer=e.pointerId;start=e.pointerType==='touch'?e.clientX:e.clientY;dragStart=target;container!.setPointerCapture(pointer);}
  function move(e:PointerEvent){if(pointer!==e.pointerId||!canAnimate())return;const pos=e.pointerType==='touch'?e.clientX:e.clientY;target=dragStart+(start-pos)*viewportHeight/height;}
  function up(e:PointerEvent){if(e.pointerId!==pointer)return;if(container!.hasPointerCapture(e.pointerId))container!.releasePointerCapture(e.pointerId);pointer=null;}
  function key(e:KeyboardEvent){if(!canAnimate()||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();target+=(e.key==='ArrowDown'?1:-1)*spacing;}
  const lost=()=>{failed=true;delete container!.dataset.ready;sync();};
  canvas.setAttribute('aria-hidden','true');canvas.className='posters-canvas';container.appendChild(canvas);
  const ro=new ResizeObserver(resize);ro.observe(container);const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});io.observe(container);
  container.addEventListener('pointerdown',down);container.addEventListener('pointermove',move);container.addEventListener('pointerup',up);container.addEventListener('pointercancel',up);container.addEventListener('lostpointercapture',up);container.addEventListener('keydown',key);canvas.addEventListener('webglcontextlost',lost);mediaQuery.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);syncRef.current=sync;resize();sync();
  return()=>{disposed=true;cancelAnimationFrame(frame);syncRef.current=null;ro.disconnect();io.disconnect();container.removeEventListener('pointerdown',down);container.removeEventListener('pointermove',move);container.removeEventListener('pointerup',up);container.removeEventListener('pointercancel',up);container.removeEventListener('lostpointercapture',up);container.removeEventListener('keydown',key);canvas.removeEventListener('webglcontextlost',lost);mediaQuery.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);medias.forEach(({image,texture,program})=>{image.onload=null;gl.deleteTexture(texture.texture);program.remove();});geometry.remove();canvas.remove();delete container.dataset.ready;gl.getExtension('WEBGL_lose_context')?.loseContext();};
 },[sources,planeWidth,planeHeight,distortion,scrollEase,cameraFov,cameraZ]);
 return <div {...props} ref={containerRef} className={'posters-container '+className} role='region' aria-label='Incident artwork. Drag or use up and down arrow keys to explore.' tabIndex={paused?-1:0}>{items[0]&&<img className='posters-fallback' src={items[0]} alt='Illustrated sample incident card' draggable={false}/>}<span className='posters-hint' aria-hidden='true'>Drag to explore · ↑ ↓</span></div>;
}
