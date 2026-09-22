'use client';

import { ArrowRight, ArrowUpRight, Play, Radio, ShieldCheck, Users, Activity } from 'lucide-react';
import { WaveLayer } from './line-waves';
import BorderGlow from './border-glow';
import styles from './relay-home.module.css';

type Props = {
  paused: boolean; urgentCount: number; pendingCount: number; availableCount: number; ready: boolean;
  onOpenWorkspace: () => void; onReport: () => void; onRehearsal: () => void; onSignals: () => void; onTeams: () => void;
};

export default function RelayHome({paused,urgentCount,pendingCount,availableCount,ready,onOpenWorkspace,onReport,onRehearsal,onSignals,onTeams}:Props) {
  const cards = [
    {label:'Open incidents',value:pendingCount,note:'Every report, in one place.',icon:Radio,action:onSignals},
    {label:'Urgent incidents',value:urgentCount,note:'See where help is needed first.',icon:Activity,action:onSignals},
    {label:'Available teams',value:availableCount,note:'Find the right people for the task.',icon:Users,action:onTeams},
  ];
  return <div className={styles.home}>
    <section className={styles.hero} aria-labelledby="home-title">
      <WaveLayer className={styles.waves} paused={paused} speed={0.3} innerLineCount={32} outerLineCount={36} warpIntensity={1} rotation={-45} edgeFadeWidth={0} colorCycleSpeed={1} brightness={0.2} color1="#1679ff" color2="#449cff" color3="#9acaff" enableMouseInteraction mouseInfluence={2}/>
      <div className={styles.shade} aria-hidden="true"/>
      <div className={styles.copy}>
        <span className={styles.eyebrow}><span/>COMMUNITY RESPONSE, CONNECTED</span>
        <h1 id="home-title">Every signal.<br/><span>A coordinated<br/>response.</span></h1>
        <p>A clear picture when it matters most. Connect community reports with the people ready to help.</p>
        <div className={styles.actions}>
          <button className={`${styles.primary} glow-button`} onClick={onOpenWorkspace}>Open workspace<ArrowUpRight size={18}/></button>
          <button className={`${styles.secondary} glow-button`} onClick={onReport} disabled={!ready}>Report an incident<ArrowRight size={17}/></button>
        </div>
        <button className={styles.rehearsal} onClick={onRehearsal}><span><Play size={10} fill="currentColor"/></span>See a response in action<ArrowRight size={14}/></button>
      </div>
      <div className={styles.waveCaption} aria-hidden="true"><span/>SIGNALS INTO ACTION</div>
    </section>
    <section className={styles.snapshot} aria-labelledby="snapshot-title">
      <div className={styles.snapshotHeading}><h2 id="snapshot-title">Your workspace, at a glance</h2><span>Sample scenario · Bengaluru</span></div>
      <div className={styles.cards}>{cards.map(card=><BorderGlow key={card.label} className={styles.cardGlow} backgroundColor="#090f1b" borderRadius={12} edgeSensitivity={55} glowColor="215 100 65" glowRadius={22} glowIntensity={0.8} fillOpacity={0.12} paused={paused}>
        <button className={styles.card} onClick={card.action} aria-label={`${card.value} ${card.label.toLowerCase()}. ${card.note}`}><div className={styles.cardTop}><card.icon size={17}/><span>{card.label}</span><ArrowUpRight size={16}/></div><strong>{String(card.value).padStart(2,'0')}</strong><p>{card.note}</p></button>
      </BorderGlow>)}</div>
      <div className={styles.note}><ShieldCheck size={14}/><span>Human-led decisions. Every action checked with AWS Cedar.</span></div>
    </section>
  </div>;
}
