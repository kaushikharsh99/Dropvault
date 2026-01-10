import { motion } from "framer-motion";
import { FolderOpen, FileStack, Search, Puzzle } from "lucide-react";
const painPoints = [
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
  return <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    className="text-center max-w-3xl mx-auto mb-16"
  >
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Stop organizing. Start remembering.
          </h2>
          <p className="text-lg text-muted-foreground">
            Traditional tools make you work for them. They demand structure, patience, and constant maintenance.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {painPoints.map((point, index) => <motion.div
    key={point.title}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="floating-card text-center group"
  >
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-destructive/20 transition-colors">
                <point.icon className="w-7 h-7 text-destructive/70" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{point.title}</h3>
              <p className="text-sm text-muted-foreground">{point.description}</p>
            </motion.div>)}
        </div>
      </div>
    </section>;
};
export default ProblemSection;
