"use client";

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface StepCardProps {
  step: number;
  title: string;
  description: string;
}

const StepCard: React.FC<StepCardProps> = ({ step, title, description }) => {
  return (
    <div className="p-6 flex flex-col items-center text-center">
      <div className="text-5xl mb-4 font-bold text-primary">{step}</div>
      <h3 className="text-2xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

const HowItWorksSection: React.FC = () => {
  const stepRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    stepRefs.current.forEach((el, index) => {
      gsap.fromTo(el,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 80%',
            end: 'bottom 20%',
            toggleActions: 'play none none none',
          },
          delay: index * 0.2,
        }
      );
    });
  }, []);

  const steps = [
    {
      step: 1,
      title: "Input Your Data",
      description: "Securely share your financial goals and current situation."
    },
    {
      step: 2,
      title: "AI Analyzes & Predicts",
      description: "Our AI creates and stress-tests various financial scenarios."
    },
    {
      step: 3,
      title: "Get Clear Insights",
      description: "Receive actionable advice to make informed financial decisions."
    }
  ];

  return (
    <section className={`py-20 px-4
bg-secondary
text-secondary-foreground text-center`}>
      <h2 className="text-4xl font-bold mb-12">How It Works</h2>
      <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
        {steps.map((step, index) => (
          <div ref={el => { if (el) stepRefs.current[index] = el; }} key={step.step}>
            <StepCard {...step} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorksSection;
