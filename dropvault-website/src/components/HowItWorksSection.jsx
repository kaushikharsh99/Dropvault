import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Download, Brain, MessageSquareText } from "lucide-react";
import TermTooltip from "./TermTooltip";

const steps = [
  {
    icon: Download,
    title: "Drop Anything",
    subtitle: "No structure required. Ever.",
    description: "Paste text, upload files, save links. No categorization needed.",
    examples: ["📝 Meeting notes", "🔗 Article bookmarks", "📄 PDF documents"],
    color: "from-blue-500/20 to-cyan-500/20"
  },
  {
    icon: Brain,
    title: "AI Understands",
    subtitle: "It connects the dots for you.",
    description: "AI extracts meaning, creates tags, and builds connections.",
    examples: ["🏷️ Smart tagging", "🔗 Auto-linking", "📊 Topic extraction"],
    color: "from-purple-500/20 to-pink-500/20"
  },
  {
    icon: MessageSquareText,
    title: "Find Instantly",
    subtitle: "Find things even if you forgot the words.",
    description: "Search in plain English. Ask questions, get answers.",
    examples: ['"What did I save about React hooks?"', `"Notes from last week's meeting"`, '"Articles about productivity"'],
    color: "from-green-500/20 to-emerald-500/20"
  }
];

const StepCard = ({ step, progress, index, total }) => {
  // Calculate range for this specific card
  const start = index / total;
  const end = (index + 1) / total;
  const fadeOutStart = (index + 0.8) / total; // Start fading out slightly before next one

  // Transform hooks
  const opacity = useTransform(progress, 
    [start, start + 0.1, fadeOutStart, end], 
    [0, 1, 1, 0]
  );
  
  const scale = useTransform(progress,
    [start, start + 0.1, fadeOutStart, end],
    [0.8, 1, 1, 0.9]
  );
  
  const y = useTransform(progress,
    [start, start + 0.1, fadeOutStart, end],
    [100, 0, 0, -100]
  );

  return (
    <motion.div 
      style={{ opacity, scale, y }}
      className="absolute top-0 left-0 w-full h-full flex items-center justify-center p-6"
    >
      <div className="w-full max-w-xl bg-background/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
        {/* Background Gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-30 pointer-events-none`} />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-lg">
            <step.icon className="w-10 h-10 text-foreground" />
          </div>

          <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            {step.title === "AI Understands" ? (
              <TermTooltip term={step.title} explanation="Our local AI analyzes your content privately to generate tags and links." />
            ) : step.title === "Find Instantly" ? (
              <TermTooltip term={step.title} explanation="Semantic search understands the meaning behind your query, not just keywords." />
            ) : (
              step.title
            )}
          </h3>

          <p className="text-sm font-bold text-primary/80 uppercase tracking-widest mb-6">
            {step.subtitle}
          </p>

          <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-md">
            {step.description}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {step.examples.map((example, i) => (
              <span key={i} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-foreground/80">
                {example}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const HowItWorksSection = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <section ref={containerRef} id="how-it-works" className="relative h-[300vh] bg-background">
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col items-center justify-center">
        
        {/* Section Title (Fades out as scroll begins) */}
        <motion.div 
          style={{ opacity: useTransform(scrollYProgress, [0, 0.1], [1, 0]) }}
          className="absolute top-20 text-center z-10 w-full px-6"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground">
            Scroll to explore the flow
          </p>
        </motion.div>

        {/* Cards Container */}
        <div className="relative w-full h-[600px] flex items-center justify-center">
          {steps.map((step, index) => (
            <StepCard 
              key={step.title} 
              step={step} 
              progress={scrollYProgress} 
              index={index} 
              total={steps.length} 
            />
          ))}
        </div>

        {/* Progress Indicator */}
        <div className="absolute bottom-12 flex gap-3">
          {steps.map((_, index) => {
             // Basic active indicator logic based on raw scroll ranges
             const start = index / steps.length;
             const end = (index + 1) / steps.length;
             const isActive = useTransform(scrollYProgress, (v) => v >= start && v < end ? 1 : 0.3);
             
             return (
               <motion.div 
                 key={index}
                 style={{ opacity: isActive }}
                 className="w-2 h-2 rounded-full bg-foreground"
               />
             )
          })}
        </div>

      </div>
    </section>
  );
};

export default HowItWorksSection;
