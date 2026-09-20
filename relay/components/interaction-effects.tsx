'use client';
import { useEffect, useState } from 'react';
import { playCue } from '@/lib/sound';
export default function InteractionEffects(){
 const [pulse,setPulse]=useState<{x:number;y:number;id:number}|null>(null);
 useEffect(()=>{let timer:ReturnType<typeof setTimeout>;const click=(event:MouseEvent)=>{const button=(event.target as Element)?.closest('button,summary,[role="tab"],input[type="radio"]');if(!button||button.hasAttribute('disabled'))return;playCue('tap');const rect=button.getBoundingClientRect();setPulse({x:event.detail?event.clientX:rect.x+rect.width/2,y:event.detail?event.clientY:rect.y+rect.height/2,id:performance.now()});clearTimeout(timer);timer=setTimeout(()=>setPulse(null),650);};document.addEventListener('click',click);return ()=>{document.removeEventListener('click',click);clearTimeout(timer);};},[]);
 return pulse?<span key={pulse.id} className="interaction-pulse" style={{left:pulse.x,top:pulse.y}} aria-hidden="true"/>:null;
}
