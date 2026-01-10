import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
const FinalCTASection = ({ onLogin }) => {
  return <section className="py-32 relative overflow-hidden">
      {
    /* Background gradient */
  }
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.03] to-background" />
      
      {
    /* Decorative elements */
  }
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8 }}
    className="max-w-3xl mx-auto text-center"
  >
          <h2 className="text-4xl md:text-6xl font-bold text-foreground leading-tight mb-8">
            This is not a note app.{" "}
            <span className="gradient-text">It’s your second brain.</span>
          </h2>

          <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
            Start capturing knowledge the effortless way. No credit card required.
          </p>

          <Button variant="hero" size="xl" className="animate-pulse-glow" onClick={onLogin}>
            Start Using DropVault
            <ArrowRight className="w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    </section>;
};
export default FinalCTASection;
