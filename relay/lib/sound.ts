type Cue='tap'|'navigate'|'success'|'blocked';
let enabled=false,context:AudioContext|undefined,master:GainNode|undefined,lastTap=0;
const activeSources=new Set<AudioScheduledSourceNode>();
export function configureSound(value:boolean){enabled=value;if(!value){for(const source of activeSources){try{source.stop();}catch{}}activeSources.clear();}if(context&&master){master.gain.cancelScheduledValues(context.currentTime);master.gain.setValueAtTime(value?1:0,context.currentTime);if(!value)void context.suspend().catch(()=>{});}}
export function playCue(cue:Cue){
 if(!enabled||typeof window==='undefined'||!window.AudioContext)return;
 if(cue==='tap'&&performance.now()-lastTap<90)return;lastTap=performance.now();
 try{
  if(!context||context.state==='closed'){context=new AudioContext();master=context.createGain();master.gain.value=enabled?1:0;master.connect(context.destination);}const ctx=context,bus=master!;
  void ctx.resume().then(()=>{if(!enabled){bus.gain.setValueAtTime(0,ctx.currentTime);void ctx.suspend().catch(()=>{});}}).catch(()=>{});
  const now=ctx.currentTime;
  const tone=(frequency:number,at:number,duration:number,volume:number)=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,at);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);oscillator.connect(gain);gain.connect(bus);activeSources.add(oscillator);oscillator.start(at);oscillator.stop(at+duration+.02);oscillator.onended=()=>{activeSources.delete(oscillator);oscillator.disconnect();gain.disconnect();};};
  if(cue==='tap'){tone(740,now,.065,.021);return;}
  if(cue==='success'){tone(523.25,now,.22,.035);tone(783.99,now+.11,.34,.027);return;}
  if(cue==='blocked'){tone(293.66,now,.18,.025);tone(261.63,now+.1,.24,.018);return;}
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.52),ctx.sampleRate),samples=buffer.getChannelData(0);
  for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1);
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(350,now);filter.frequency.exponentialRampToValueAtTime(1700,now+.21);filter.frequency.exponentialRampToValueAtTime(260,now+.5);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.024,now+.17);gain.gain.exponentialRampToValueAtTime(.0001,now+.5);source.connect(filter);filter.connect(gain);gain.connect(bus);activeSources.add(source);source.start();source.onended=()=>{activeSources.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};
 }catch{/* Sound is optional; unsupported audio never interrupts the response workflow. */}
}
