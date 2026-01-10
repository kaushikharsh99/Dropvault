import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import heroVisual from "@/assets/hero-visual.png";
const HeroSection = ({ onLogin, onSignUp }) => {
  return <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {
    /* Background gradient */
  }
      <div className="absolute inset-0 hero-glow" />
      
      {
    /* Hero Visual Background (Merged & Faded) */
  }
      <div className="absolute inset-0 z-0 opacity-25 pointer-events-none select-none">
        <img 
          src={heroVisual} 
          alt="Background Visual" 
          className="w-full h-full object-cover filter blur-[1px] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background" />
      </div>

      {
    /* Floating orbs */
  }
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />

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
              <Button variant="hero" size="xl" className="min-w-[220px]" onClick={onSignUp}>
                Get Started for Free
              </Button>
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
