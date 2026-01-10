import { motion } from "framer-motion";
import { FolderOpen, FileStack, Search, Puzzle, ArrowRight } from "lucide-react";

const timeline = [
  {
    icon: FolderOpen,
    title: "Manual folders",
    description: "Endless hierarchies that break as your knowledge grows"
  },
  {
    icon: FileStack,
    title: "Forced templates",
    description: "Rigid structures that don't match how you actually think"
  },
  {
    icon: Search,
    title: "Broken search",
    description: "Keywords fail when you can't remember exact terms"
  },
  {
    icon: Puzzle,
    title: "Scattered knowledge",
    description: "Notes, bookmarks, files spread across a dozen apps"
  }
];

const ProblemSection = () => {
  return (
    <section className="py-24 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            The Pain Story
          </h2>
          <p className="text-lg text-muted-foreground">
            We've all been there. It starts with a folder and ends in chaos.
          </p>
        </motion.div>

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-8 max-w-6xl mx-auto">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-destructive/10 via-destructive/20 to-destructive/10 -translate-y-1/2 z-0" />

          {timeline.map((point, index) => (
            <div key={point.title} className="relative z-10 flex flex-col items-center w-full md:w-1/4">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="w-full"
              >
                <div className="floating-card p-6 flex flex-col items-center text-center h-full min-h-[220px] bg-background border-destructive/10 hover:border-destructive/30 transition-colors">
                  <div className="w-16 h-16 rounded-full bg-destructive/5 border border-destructive/10 flex items-center justify-center mb-4 text-destructive shadow-sm">
                    <point.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{point.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{point.description}</p>
                </div>
              </motion.div>
              
              {/* Mobile Connector Arrow */}
              {index < timeline.length - 1 && (
                <div className="md:hidden py-4">
                  <ArrowRight className="w-6 h-6 text-muted-foreground/30 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
