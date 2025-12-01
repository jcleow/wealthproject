"use client";

import React from 'react';
import HeroSection from '@/components/landing-page/HeroSection';
import FeaturesSection from '@/components/landing-page/FeaturesSection';
import HowItWorksSection from '@/components/landing-page/HowItWorksSection';
import CallToActionSection from '@/components/landing-page/CallToActionSection'; // Import the CallToActionSection component

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeroSection />

      <FeaturesSection />

      <HowItWorksSection />

      <CallToActionSection /> {/* Use the CallToActionSection component */}

      {/* Footer */}
      <footer className="py-8 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Assetra3. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;



