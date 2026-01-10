import { motion } from "framer-motion";
import { GraduationCap, Microscope, BookOpen, Briefcase } from "lucide-react";
const audiences = [
  { icon: GraduationCap, label: "Students" },
  { icon: Microscope, label: "Researchers" },
  { icon: BookOpen, label: "Lifelong learners" },
  { icon: Briefcase, label: "Professionals who hate organizing" }
];
const BuiltForSection = () => {
  return <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    className="text-center max-w-3xl mx-auto mb-12"
  >
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Built For
          </h2>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
          {audiences.map((audience, index) => <motion.div
    key={audience.label}
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay: index * 0.1 }}
    className="flex items-center gap-3 px-6 py-4 rounded-full bg-card border border-border/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
  >
              <audience.icon className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">{audience.label}</span>
            </motion.div>)}
        </div>
      </div>
    </section>;
};
export default BuiltForSection;
