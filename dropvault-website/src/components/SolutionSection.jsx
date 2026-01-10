import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
const SolutionSection = () => {
  return <section className="py-32 relative overflow-hidden">
      {
    /* Background accent */
  }
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.02] to-background" />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8 }}
    className="max-w-4xl mx-auto text-center"
  >
          <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay: 0.2 }}
    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 mb-8"
  >
            <Sparkles className="w-4 h-4 text-secondary" />
            <span className="text-sm text-secondary">The DropVault Way</span>
          </motion.div>

          <h2 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
            You don't organize your knowledge.{" "}
            <span className="gradient-text">It organizes itself.</span>
          </h2>

          <motion.p
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay: 0.4 }}
    className="mt-8 text-xl text-muted-foreground max-w-2xl mx-auto"
  >
            Just drop anything into your vault. Our AI understands context, extracts meaning, and creates connections you never knew existed.
          </motion.p>
        </motion.div>
      </div>
    </section>;
};
export default SolutionSection;
