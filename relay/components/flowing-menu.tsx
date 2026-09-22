'use client';
import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';

import './flowing-menu.css';

interface MenuItemData {
  onSelect?: () => void;
  link: string;
  text: string;
  image: string;
}

interface FlowingMenuProps {
  paused?: boolean;
  items?: MenuItemData[];
  speed?: number;
  textColor?: string;
  bgColor?: string;
  marqueeBgColor?: string;
  marqueeTextColor?: string;
  borderColor?: string;
}

interface MenuItemProps extends MenuItemData {
  paused: boolean;
  speed: number;
  textColor: string;
  marqueeBgColor: string;
  marqueeTextColor: string;
  borderColor: string;
  isFirst: boolean;
}

const FlowingMenu: React.FC<FlowingMenuProps> = ({
  items = [],
  speed = 15,
  paused = false,
  textColor = '#fff',
  bgColor = '#080d16',
  marqueeBgColor = '#fff',
  marqueeTextColor = '#080d16',
  borderColor = '#fff'
}) => {
  return (
    <div className="menu-wrap" style={{ backgroundColor: bgColor }}>
      <nav className="menu">
        {items.map((item, idx) => (
          <MenuItem
            key={idx}
            {...item}
            speed={speed}
            paused={paused}
            textColor={textColor}
            marqueeBgColor={marqueeBgColor}
            marqueeTextColor={marqueeTextColor}
            borderColor={borderColor}
            isFirst={idx === 0}
          />
        ))}
      </nav>
    </div>
  );
};

const MenuItem: React.FC<MenuItemProps> = ({
  onSelect,
  link,
  text,
  image,
  speed,
  textColor,
  marqueeBgColor,
  marqueeTextColor,
  borderColor,
  isFirst,
  paused
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const marqueeInnerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<gsap.core.Tween | null>(null);
  const [repetitions, setRepetitions] = useState(4);
  const active = useRef(false);
  const transition = useRef<gsap.core.Timeline | null>(null);
  const reduceMotion = () => paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const animationDefaults: gsap.TweenVars = { duration: 0.6, ease: 'expo' };

  const distMetric = (x: number, y: number, x2: number, y2: number): number => {
    const xDiff = x - x2;
    const yDiff = y - y2;
    return xDiff * xDiff + yDiff * yDiff;
  };

  const findClosestEdge = (mouseX: number, mouseY: number, width: number, height: number): 'top' | 'bottom' => {
    const topEdgeDist = distMetric(mouseX, mouseY, width / 2, 0);
    const bottomEdgeDist = distMetric(mouseX, mouseY, width / 2, height);
    return topEdgeDist < bottomEdgeDist ? 'top' : 'bottom';
  };

  useEffect(() => {
    const calculateRepetitions = () => {
      if (!marqueeInnerRef.current) return;
      const marqueeContent = marqueeInnerRef.current.querySelector('.marquee__part') as HTMLElement;
      if (!marqueeContent) return;
      const contentWidth = marqueeContent.offsetWidth;
      const viewportWidth = window.innerWidth;
      if (!Number.isFinite(contentWidth) || contentWidth <= 0) return;
      const needed = Math.min(20, Math.ceil(viewportWidth / contentWidth) + 2);
      setRepetitions(Math.max(4, needed));
    };

    calculateRepetitions();
    window.addEventListener('resize', calculateRepetitions);
    return () => window.removeEventListener('resize', calculateRepetitions);
  }, [text, image]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const setupMarquee = () => {
      animationRef.current?.kill();
      animationRef.current = null;
      transition.current?.kill();
      if (!marqueeInnerRef.current) return;
      gsap.set(marqueeInnerRef.current, { x: 0 });
      if (paused || media.matches) { gsap.set(marqueeRef.current, { y: '-101%' }); return; }
      const part = marqueeInnerRef.current.querySelector<HTMLElement>('.marquee__part');
      if (!part?.offsetWidth) return;
      animationRef.current = gsap.to(marqueeInnerRef.current, { x: -part.offsetWidth, duration: Math.max(1,speed), ease: 'none', repeat: -1, paused: !active.current || document.hidden });
    };
    const visibility = () => { if (document.hidden) animationRef.current?.pause(); else if (active.current && !paused && !media.matches) animationRef.current?.play(); };
    const resize = new ResizeObserver(setupMarquee);
    if (itemRef.current) resize.observe(itemRef.current);
    media.addEventListener('change', setupMarquee);
    document.addEventListener('visibilitychange', visibility);
    setupMarquee();
    return () => { resize.disconnect(); media.removeEventListener('change', setupMarquee); document.removeEventListener('visibilitychange', visibility); animationRef.current?.kill(); animationRef.current=null; transition.current?.kill(); };
  }, [text, image, repetitions, speed, paused]);

  const handleMouseEnter = (ev: React.MouseEvent<HTMLAnchorElement>) => {
    active.current = true;
    if (reduceMotion()) return;
    animationRef.current?.play();
    transition.current?.kill();
    if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const edge = findClosestEdge(x, y, rect.width, rect.height);

    transition.current = gsap
      .timeline({ defaults: animationDefaults })
      .set(marqueeRef.current, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .set(marqueeInnerRef.current, { y: edge === 'top' ? '101%' : '-101%' }, 0)
      .to([marqueeRef.current, marqueeInnerRef.current], { y: '0%' }, 0);
  };

  const handleMouseLeave = (ev: React.MouseEvent<HTMLAnchorElement>) => {
    if (document.activeElement === ev.currentTarget) return;
    active.current = false;
    animationRef.current?.pause();
    transition.current?.kill();
    if (reduceMotion()) return;
    if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const edge = findClosestEdge(x, y, rect.width, rect.height);

    transition.current = gsap
      .timeline({ defaults: animationDefaults })
      .to(marqueeRef.current, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .to(marqueeInnerRef.current, { y: edge === 'top' ? '101%' : '-101%' }, 0);
  };

  return (
    <div className="menu__item" ref={itemRef} style={{ borderColor, borderTop: isFirst ? 'none' : undefined }}>
      <a
        className="menu__item-link"
        href={link}
        onClick={e => { if (onSelect) { e.preventDefault(); onSelect(); } }}
        onFocus={()=>{active.current=true;if(reduceMotion())return;transition.current?.kill();gsap.set([marqueeRef.current,marqueeInnerRef.current],{y:'0%'});animationRef.current?.play();}}
        onBlur={()=>{active.current=false;transition.current?.kill();gsap.set(marqueeRef.current,{y:'-101%'});animationRef.current?.pause();}}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ color: textColor }}
      >
        {text}
      </a>
      <div className="marquee" aria-hidden="true" ref={marqueeRef} style={{ backgroundColor: marqueeBgColor }}>
        <div className="marquee__inner-wrap">
          <div className="marquee__inner" ref={marqueeInnerRef} aria-hidden="true">
            {[...Array(repetitions)].map((_, idx) => (
              <div className="marquee__part" key={idx} style={{ color: marqueeTextColor }}>
                <span>{text}</span>
                <div className="marquee__img" style={{ backgroundImage: `url(${image})` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlowingMenu;
