import { motion } from "framer-motion";
import { Download, Brain, MessageSquareText, ArrowDown } from "lucide-react";
import TermTooltip from "./TermTooltip";

const steps = [
  {
    icon: Download,
    title: "Drop Anything",
    subtitle: "No structure required. Ever.",
    description: "Paste text, upload files, save links. No categorization needed.",
    examples: ["📝 Meeting notes", "🔗 Article bookmarks", "📄 PDF documents"]
  },
  {
    icon: Brain,
    title: "AI Understands",
    subtitle: "It connects the dots for you.",
    description: "AI extracts meaning, creates tags, and builds connections.",
    examples: ["🏷️ Smart tagging", "🔗 Auto-linking", "📊 Topic extraction"]
  },
  {
    icon: MessageSquareText,
    title: "Find Instantly",
    subtitle: "Find things even if you forgot the words.",
    description: "Search in plain English. Ask questions, get answers.",
    examples: ['"What did I save about React hooks?"', `"Notes from last week's meeting"`, '"Articles about productivity"']
  }
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            The Flow
          </h2>
          <p className="text-lg text-muted-foreground">
            From chaos to clarity in three simple steps.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto relative">
          {/* Vertical Connecting Line */}
          <div className="absolute top-0 left-8 md:left-1/2 bottom-0 w-1 bg-gradient-to-b from-primary/20 via-primary/50 to-primary/20 -translate-x-1/2 rounded-full" />

          <div className="space-y-16">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, type: "spring", bounce: 0.4 }}
                className="relative flex flex-col md:flex-row items-center md:even:flex-row-reverse gap-8"
              >
                {/* Icon Marker */}
                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 z-10 w-16 h-16 rounded-full bg-background border-4 border-primary flex items-center justify-center shadow-lg">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>

                {/* Content Card */}
                <div className="w-full md:w-[calc(50%-40px)] ml-20 md:ml-0 p-6 glass-card rounded-2xl border border-primary/10 hover:border-primary/30 transition-all bg-card/50 backdrop-blur-sm">
                  <h3 className="text-2xl font-bold text-foreground mb-1">
                    {step.title === "AI Understands" ? (
                      <TermTooltip term={step.title} explanation="Our local AI analyzes your content privately to generate tags and links." />
                    ) : step.title === "Find Instantly" ? (
                      <TermTooltip term={step.title} explanation="Semantic search understands the meaning behind your query, not just keywords." />
                    ) : (
                      step.title
                    )}
                  </h3>
                  
                  {/* Context Micro-Label */}
                  <p className="text-xs font-semibold text-primary/80 uppercase tracking-wide mb-3">
                    {step.subtitle}
                  </p>

                  <p className="text-muted-foreground mb-6">{step.description}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {step.examples.map((example, i) => (
                      <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
                        {example}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Empty space for the other side of the timeline on desktop */}
                <div className="hidden md:block w-[calc(50%-40px)]" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
