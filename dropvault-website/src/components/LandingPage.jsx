import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import Header from "./Header";
import HeroSection from "./HeroSection";
import ProblemSection from "./ProblemSection";
import SolutionSection from "./SolutionSection";
import HowItWorksSection from "./HowItWorksSection";
import ExtensionSection from "./ExtensionSection";
import WhatYouCanSaveSection from "./WhatYouCanSaveSection";
import ComparisonSection from "./ComparisonSection";
import BuiltForSection from "./BuiltForSection";
import FinalCTASection from "./FinalCTASection";
import Footer from "./Footer";
import AuthModal from "./AuthModal";

// Precision Polish Components
import useScrollMemory from '../hooks/useScrollMemory';
import SectionWrapper from './SectionWrapper';
import SectionAnchors from './SectionAnchors';
import CTAEcho from './CTAEcho';

const LandingPage = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState("signin");
  const [activeSection, setActiveSection] = useState("hero");

  // 5. Scroll Memory
  useScrollMemory();

  const openAuthModal = (tab = "signin") => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLogin={() => openAuthModal("signin")} />
      
      {/* 2. Smart Section Anchors */}
      <SectionAnchors activeSection={activeSection} />

      <main>
        {/* 1. Section Entry Focus (Applied via SectionWrapper) */}
        <SectionWrapper id="hero" setActiveSection={setActiveSection} activeSection={activeSection}>
          <HeroSection 
            onLogin={() => openAuthModal("signin")} 
            onSignUp={() => openAuthModal("signup")} 
          />
        </SectionWrapper>

        <SectionWrapper id="problem" setActiveSection={setActiveSection} activeSection={activeSection}>
          <ProblemSection />
        </SectionWrapper>

        <SectionWrapper id="solution" setActiveSection={setActiveSection} activeSection={activeSection}>
          <SolutionSection />
        </SectionWrapper>

        <SectionWrapper id="how-it-works" setActiveSection={setActiveSection} activeSection={activeSection}>
          <HowItWorksSection />
        </SectionWrapper>

        <SectionWrapper id="extension" setActiveSection={setActiveSection} activeSection={activeSection}>
          <ExtensionSection />
        </SectionWrapper>

        <SectionWrapper id="features" setActiveSection={setActiveSection} activeSection={activeSection}>
          <WhatYouCanSaveSection />
        </SectionWrapper>

        <SectionWrapper id="comparison" setActiveSection={setActiveSection} activeSection={activeSection}>
          <ComparisonSection />
        </SectionWrapper>

        <SectionWrapper id="built-for" setActiveSection={setActiveSection} activeSection={activeSection}>
          <BuiltForSection />
        </SectionWrapper>

        <SectionWrapper id="cta" setActiveSection={setActiveSection} activeSection={activeSection}>
          <FinalCTASection onLogin={() => openAuthModal("signup")} />
        </SectionWrapper>
      </main>
      
      {/* 7. CTA Echo */}
      <CTAEcho onAction={() => openAuthModal("signup")} />

      <Footer />
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        defaultTab={authModalTab}
      />
    </div>
  );
};

export default LandingPage;
