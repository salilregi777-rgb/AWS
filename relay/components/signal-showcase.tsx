'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, MapPin } from 'lucide-react';
import FlyingPosters from './flying-posters';
import FlowingMenu from './flowing-menu';
import { categoryLabels, type Incident } from '@/lib/relay';
import './signal-showcase.css';

const escapeXml = (value: string) => value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!);

function makePoster(incident: Incident) {
  const titleWords = incident.title.split(' ');
  const lines: string[] = [];
  let line = '';
  titleWords.forEach(word => {
    if (`${line} ${word}`.trim().length > 23 && line) { lines.push(line); line = word; }
    else line = `${line} ${word}`.trim();
  });
  if (line) lines.push(line);
  const title = lines.slice(0, 4).map((text, index) => `<tspan x="38" y="${264 + index * 36}">${escapeXml(text)}</tspan>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="560" viewBox="0 0 480 560"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#152d55"/><stop offset="1" stop-color="#060b16"/></linearGradient><radialGradient id="halo"><stop stop-color="#338bff" stop-opacity=".3"/><stop offset="1" stop-color="#338bff" stop-opacity="0"/></radialGradient></defs><rect x="1" y="1" width="478" height="558" rx="22" fill="url(#bg)" stroke="#3779cd"/><circle cx="330" cy="145" r="190" fill="url(#halo)"/><g stroke="#4c9aff" fill="none" opacity=".6"><circle cx="325" cy="125" r="65"/><circle cx="325" cy="125" r="95" opacity=".5"/><circle cx="325" cy="125" r="125" opacity=".25"/><path d="M180 125h290M325 0v220" opacity=".2"/></g><circle cx="325" cy="125" r="7" fill="#91c9ff"/><g font-family="Arial,sans-serif"><text x="38" y="49" fill="#92baff" font-size="12" letter-spacing="2">RELAY / ${escapeXml(incident.id)}</text><text x="38" y="218" fill="#68aaff" font-size="13" letter-spacing="2">${escapeXml(categoryLabels[incident.category].toUpperCase())}</text><text fill="#eef5ff" font-size="29" font-weight="600">${title}</text><path d="M38 444h404" stroke="#446a9a" opacity=".5"/><text x="38" y="476" fill="#a4b9d6" font-size="16">${escapeXml(incident.location)}</text><text x="38" y="511" fill="#67a9ff" font-size="13">${incident.people} people · ${escapeXml(incident.severity)} priority</text><text x="442" y="532" text-anchor="end" fill="#617d9f" font-size="10">SAMPLE INCIDENT</text></g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function SignalPosters({ incidents, paused = false, onSelect }: { incidents: Incident[]; paused?: boolean; onSelect?: (id: string) => void }) {
  const [selected, setSelected] = useState(0);
  const stories = incidents.filter(incident => incident.status !== 'resolved');
  const incident = stories[selected % Math.max(1, stories.length)];
  const artwork = useMemo(() => incident ? [makePoster(incident)] : [], [incident]);
  if (!incident) return null;
  const step = (direction: number) => setSelected(index => (index + direction + stories.length) % stories.length);
  return <section className="signal-showcase" aria-label="Incident stories">
    <div className="showcase-copy">
      <span className="section-index">THE PEOPLE BEHIND THE SIGNAL</span>
      <h2>A closer look.<br/><em>A clearer response.</em></h2>
      <p>Explore the sample incidents, then open a report to review the people and resources involved.</p>
      <div className="showcase-current" aria-live="polite"><span className={`severity ${incident.severity}`}><i/>{incident.severity} priority</span><h3>{incident.title}</h3><span><MapPin size={14}/>{incident.location} · {incident.people} people</span></div>
      <div className="showcase-actions"><button className="glow-button" aria-label="Previous incident story" onClick={()=>step(-1)}><ArrowLeft size={17}/></button><span>{String(selected % stories.length + 1).padStart(2, '0')} / {String(stories.length).padStart(2, '0')}</span><button className="glow-button" aria-label="Next incident story" onClick={()=>step(1)}><ArrowRight size={17}/></button>{onSelect&&<button className="showcase-review glow-button" onClick={()=>onSelect(incident.id)}>Review incident<ArrowUpRight size={16}/></button>}</div>
    </div>
    <div className="showcase-posters"><FlyingPosters key={incident.id} items={artwork} paused={paused} planeWidth={380} planeHeight={443} distortion={3} scrollEase={0.04}/></div>
  </section>;
}

export function ExploreMenu({ items, paused = false }: { items: { text: string; onSelect: () => void }[]; paused?: boolean }) {
  return <section className={`explore-menu ${paused ? 'explore-paused' : ''}`} aria-label="Response workflow"><FlowingMenu paused={paused} items={items.map(item=>({...item,link:'#',image:'/relay-city-night.webp'}))} speed={18} textColor="#bbceec" bgColor="#080d16" marqueeBgColor="#267fff" marqueeTextColor="#ffffff" borderColor="#5188d42e"/></section>;
}
