import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import Header from "./Header";
import HeroSection from "./HeroSection";
import ProblemSection from "./ProblemSection";
import SolutionSection from "./SolutionSection";
import HowItWorksSection from "./HowItWorksSection";
import WhatYouCanSaveSection from "./WhatYouCanSaveSection";
import ComparisonSection from "./ComparisonSection";
import BuiltForSection from "./BuiltForSection";
import FinalCTASection from "./FinalCTASection";
import Footer from "./Footer";
import AuthModal from "./AuthModal";

const LandingPage = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState("signin");

  const openAuthModal = (tab = "signin") => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLogin={() => openAuthModal("signin")} />
      <main>
        <HeroSection 
          onLogin={() => openAuthModal("signin")} 
          onSignUp={() => openAuthModal("signup")} 
        />
        <ProblemSection />
        <SolutionSection />
        <HowItWorksSection />
        <WhatYouCanSaveSection />
        <ComparisonSection />
        <BuiltForSection />
        <FinalCTASection onLogin={() => openAuthModal("signup")} />
      </main>
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
