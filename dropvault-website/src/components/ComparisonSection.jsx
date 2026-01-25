import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { X, Check } from "lucide-react";

const comparisons = [
  { traditional: "Manual folder organization", dropvault: "Automatic AI organization" },
  { traditional: "Keyword-based search", dropvault: "Meaning-based semantic search" },
  { traditional: "Complex setup required", dropvault: "Zero learning curve" },
  { traditional: "Templates and structures", dropvault: "Freeform knowledge capture" }
];

const ComparisonRow = ({ row, index, total, progress }) => {
  const step = 1 / total;
  const start = index * step;
  const end = (index + 1) * step; // Keep it visible until the end of the section or fade out if desired
  
  const opacity = useTransform(progress, [start, start + 0.1], [0, 1]);
  const x = useTransform(progress, [start, start + 0.1], [50, 0]);
  const highlightOpacity = useTransform(progress, [start + 0.1, start + 0.2], [0, 1]);

  return (
    <motion.div 
      style={{ opacity, x }}
      className="grid grid-cols-2 border-b border-border/50 relative overflow-hidden"
    >
      {/* DropVault Highlight Background */}
      <motion.div 
        style={{ opacity: highlightOpacity }}
        className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-primary/5 to-primary/10 -z-10"
      />

      <div className="p-8 md:p-10 flex items-center gap-4 border-r border-border/50 text-muted-foreground">
        <X className="w-6 h-6 text-destructive/50 flex-shrink-0" />
        <span className="text-lg md:text-xl font-medium">{row.traditional}</span>
      </div>
      
      <div className="p-8 md:p-10 flex items-center gap-4 text-foreground">
        <Check className="w-6 h-6 text-primary flex-shrink-0" />
        <span className="text-lg md:text-xl font-bold">{row.dropvault}</span>
      </div>
    </motion.div>
  );
};

const ComparisonSection = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <section ref={containerRef} className="relative h-[250vh] bg-background">
      <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden">
        
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
                The Difference
              </h2>
              <p className="text-xl text-muted-foreground">
                See why users are switching to DropVault.
              </p>
            </motion.div>

            {/* Comparison Table */}
            <div className="glass-card rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-background/50 backdrop-blur-xl">
              {/* Table Header */}
              <div className="grid grid-cols-2 bg-muted/30 border-b border-border">
                <div className="p-6 text-center text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Traditional Tools
                </div>
                <div className="p-6 text-center text-sm font-bold uppercase tracking-widest text-primary">
                  DropVault
                </div>
              </div>

              {/* Rows */}
              <div>
                {comparisons.map((row, index) => (
                  <ComparisonRow 
                    key={index} 
                    row={row} 
                    index={index} 
                    total={comparisons.length} 
                    progress={scrollYProgress} 
                  />
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default ComparisonSection;
