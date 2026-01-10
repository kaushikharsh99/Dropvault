import { motion } from "framer-motion";
import { FileText, Link2, FileUp, Image, Video, Files } from "lucide-react";
const saveTypes = [
  { icon: FileText, label: "Notes", color: "bg-primary/10 text-primary" },
  { icon: Link2, label: "Articles & Links", color: "bg-secondary/10 text-secondary" },
  { icon: FileUp, label: "PDFs", color: "bg-accent/10 text-accent" },
  { icon: Image, label: "Images", color: "bg-primary/10 text-primary" },
  { icon: Video, label: "Videos", color: "bg-secondary/10 text-secondary" },
  { icon: Files, label: "Any File", color: "bg-accent/10 text-accent" }
];
const WhatYouCanSaveSection = () => {
  return <section id="features" className="py-24">
      <div className="container mx-auto px-6">
        <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    className="text-center max-w-3xl mx-auto mb-16"
  >
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            What You Can Save
          </h2>
          <p className="text-lg text-muted-foreground">
            Drop anything. DropVault understands it all.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-4xl mx-auto">
          {saveTypes.map((type, index) => <motion.div
    key={type.label}
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay: index * 0.08 }}
    className="floating-card flex flex-col items-center text-center p-6 group"
  >
              <div className={`w-14 h-14 rounded-2xl ${type.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <type.icon className="w-7 h-7" />
              </div>
              <span className="text-sm font-medium text-foreground">{type.label}</span>
            </motion.div>)}
        </div>
      </div>
    </section>;
};
export default WhatYouCanSaveSection;
