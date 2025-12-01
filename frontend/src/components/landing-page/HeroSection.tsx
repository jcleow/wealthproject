"use client";

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const HeroSection: React.FC = () => {
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(titleRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
    );
    gsap.fromTo(subtitleRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, delay: 0.3, ease: 'power3.out' }
    );
    gsap.fromTo(buttonRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, delay: 0.6, ease: 'power3.out' }
    );
  }, []);

  return (
    <section className="relative h-screen flex items-center justify-center text-center bg-background text-foreground overflow-hidden">
      <div className="z-10 p-4 max-w-4xl mx-auto">
        <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
          Gain Clarity. Take Control. Your Financial AI.
        </h1>
        <p ref={subtitleRef} className="text-xl md:text-2xl mb-8 text-muted-foreground">
          Understand Your Money, Plan Your Life. Beta Access Available.
        </p>
        <button
          ref={buttonRef}
          className="bg-primary text-primary-foreground px-8 py-3 rounded-full text-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg"
        >
          Request Beta Access
        </button>
      </div>
      {/* Placeholder for animated background/visuals */}
      <div className="absolute inset-0 z-0 opacity-10">
        {/* This div will contain more complex GSAP animations later */}
      </div>
    </section>
  );
};

export default HeroSection;
