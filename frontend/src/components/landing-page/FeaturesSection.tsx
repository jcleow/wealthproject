"use client";

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string; // Placeholder for an icon, could be a component or a string for now
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon }) => {
  return (
    <div className={`flex flex-col items-center
p-6
rounded-lg
bg-card
text-center
shadow-lg`}>
      <div className="text-4xl mb-4 text-primary">{icon}</div> {/* Icon placeholder */}
      <h3 className="text-2xl font-semibold mb-4">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

const FeaturesSection: React.FC = () => {
  const featureRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    featureRefs.current.forEach((el, index) => {
      gsap.fromTo(el,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 80%', // Animation starts when 80% of the element is in view
            end: 'bottom 20%',
            toggleActions: 'play none none none', // Play animation once
          },
          delay: index * 0.2, // Stagger the animation
        }
      );
    });
  }, []);

  const features = [
    {
      title: "Effortless Planning",
      description: "Easily input your financial goals and data. Our AI simplifies complex planning.",
      icon: "💡"
    },
    {
      title: "Predictive Scenarios",
      description: "Visualize the impact of your financial decisions with AI-powered predictions.",
      icon: "🔮"
    },
    {
      title: "Personalized Guidance",
      description: "Receive tailored advice and insights from your personal financial AI.",
      icon: "🤝"
    }
  ];

  return (
    <section className="py-20 px-4 text-center bg-background text-foreground">
      <h2 className="text-4xl font-bold mb-12">Features That Empower You</h2>
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {features.map((feature, index) => (
          <div ref={el => { if (el) featureRefs.current[index] = el; }} key={feature.title}>
            <FeatureCard {...feature} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
