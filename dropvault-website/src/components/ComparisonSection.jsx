import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
const comparisons = [
  { traditional: "Manual folder organization", dropvault: "Automatic AI organization" },
  { traditional: "Keyword-based search", dropvault: "Meaning-based semantic search" },
  { traditional: "Complex setup required", dropvault: "Zero learning curve" },
  { traditional: "Templates and structures", dropvault: "Freeform knowledge capture" }
];
const ComparisonSection = () => {
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
            The Difference
          </h2>
          <p className="text-lg text-muted-foreground">
            See how DropVault compares to traditional knowledge tools.
          </p>
        </motion.div>

        <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    className="max-w-3xl mx-auto"
  >
          <div className="glass-card rounded-2xl overflow-hidden">
            {
    /* Header */
  }
            <div className="grid grid-cols-2 bg-muted/50">
              <div className="p-6 text-center border-r border-border/50">
                <span className="font-semibold text-muted-foreground">Traditional Tools</span>
              </div>
              <div className="p-6 text-center">
                <span className="font-semibold gradient-text">DropVault</span>
              </div>
            </div>

            {
    /* Rows */
  }
            {comparisons.map((row, index) => <div
    key={index}
    className="grid grid-cols-2 border-t border-border/50"
  >
                <div className="p-6 flex items-center gap-3 border-r border-border/50">
                  <X className="w-5 h-5 text-destructive/70 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{row.traditional}</span>
                </div>
                <div className="p-6 flex items-center gap-3 bg-primary/[0.02]">
                  <Check className="w-5 h-5 text-secondary flex-shrink-0" />
                  <span className="text-sm text-foreground font-medium">{row.dropvault}</span>
                </div>
              </div>)}
          </div>
        </motion.div>
      </div>
    </section>;
};
export default ComparisonSection;
