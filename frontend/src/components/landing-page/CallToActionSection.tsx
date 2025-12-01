"use client";

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CallToActionSection: React.FC = () => {
  const sectionRef = useRef(null);
  const headlineRef = useRef(null);
  const subheadlineRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 80%',
        toggleActions: 'play none none none',
      }
    });

    tl.fromTo(headlineRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    )
    .fromTo(subheadlineRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
      "-=0.4" // Start this animation 0.4 seconds before the previous one ends
    )
    .fromTo(buttonRef.current,
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)' },
      "-=0.4"
    );
  }, []);

  return (
    <section ref={sectionRef} className="py-20 px-4 text-center bg-background text-foreground">
      <h2 ref={headlineRef} className="text-4xl font-bold mb-8">Ready to Take Control?</h2>
      <p ref={subheadlineRef} className="text-xl mb-8">Join our beta program and start building a clearer financial future today.</p>
      <button
        ref={buttonRef}
        className="bg-primary text-primary-foreground px-10 py-4 rounded-full text-xl font-semibold hover:bg-primary/90 transition-colors shadow-lg"
      >
        Join the Beta
      </button>
    </section>
  );
};

export default CallToActionSection;
