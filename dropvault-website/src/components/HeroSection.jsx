import { useState } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import heroVisual from "@/assets/hero-visual.png";
import DotGrid from './DotGrid';

const HeroSection = ({ onLogin, onSignUp }) => {
  const [isHovered, setIsHovered] = useState(false);

  return <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background Dot Grid */}
      <div className="absolute inset-0 z-0 opacity-50">
        <DotGrid
          dotSize={5}
          gap={25}
          baseColor="#271E37"
          activeColor="#5227FF"
          proximity={80}
          shockRadius={150}
          shockStrength={2}
          resistance={750}
          returnDuration={1.5}
        />
      </div>

      {
    /* Background gradient overlay to soften the grid */
  }
      <div className="absolute inset-0 hero-glow z-[1]" />
      
      {
    /* Floating orbs */
  }
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float z-[1]" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float z-[1]" style={{ animationDelay: "2s" }} />

      {/* Fade out transition to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent z-[2]" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8 }}
  >
            <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay: 0.2 }}
    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 mb-8"
  >
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-sm text-muted-foreground">AI-Powered Personal Knowledge</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-foreground">
              Say No to Organizing.{" "}
              <span className="gradient-text">Start Finding.</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              A zero-friction personal knowledge vault that automatically understands and organizes your information — no setup, no templates, no learning curve.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <Button variant="hero" size="xl" className="min-w-[220px] transition-all duration-300" onClick={onSignUp}>
                  {isHovered ? "Create Your Vault" : "Get Started for Free"}
                </Button>
              </div>
              <Button variant="heroOutline" size="xl" className="min-w-[220px]" onClick={onLogin}>
                Sign In to Vault
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>;
};
export default HeroSection;
