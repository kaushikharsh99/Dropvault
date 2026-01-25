import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MousePointerClick, Layers, Ghost, Chrome } from 'lucide-react';

const steps = [
  {
    icon: MousePointerClick,
    title: "One Click Capture",
    description: "Click the extension icon to save the current page instantly. No menus, no dialogs, just saved.",
    color: "from-blue-500/20 to-cyan-500/20"
  },
  {
    icon: Layers,
    title: "Rich Context",
    description: "We don't just save the URL. We capture the page title, full content, and visual snapshot automatically.",
    color: "from-purple-500/20 to-pink-500/20"
  },
  {
    icon: Ghost,
    title: "Invisible Workflow",
    description: "Designed to disappear. Capture knowledge without breaking your flow or leaving your current tab.",
    color: "from-orange-500/20 to-red-500/20"
  }
];

const Card = ({ step, progress, index, total }) => {
  const start = index / total;
  const end = (index + 1) / total;
  
  const opacity = useTransform(progress, 
    [start, start + 0.1, end - 0.1, end], 
    [0, 1, 1, 0]
  );
  
  const y = useTransform(progress,
    [start, start + 0.1, end - 0.1, end],
    [50, 0, 0, -50]
  );
  
  const scale = useTransform(progress,
    [start, start + 0.1, end],
    [0.9, 1, 0.95]
  );

  return (
    <motion.div
      style={{ opacity, y, scale }}
      className="absolute inset-0 flex items-center justify-center p-6"
    >
      <div className="w-full max-w-2xl bg-background border border-border rounded-3xl p-12 shadow-2xl relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-10 pointer-events-none`} />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
            <step.icon className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-4xl font-bold text-foreground mb-6">{step.title}</h3>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
            {step.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const ExtensionSection = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <section ref={containerRef} id="extension" className="relative h-[300vh] bg-background">
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col">
        
        {/* Header - Fades out on scroll */}
        <motion.div 
          style={{ opacity: useTransform(scrollYProgress, [0, 0.15], [1, 0]) }}
          className="pt-20 pb-10 text-center px-6 relative z-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Chrome className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Chrome Extension</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
            Capture Knowledge at the <br />
            <span className="gradient-text">Moment It Matters.</span>
          </h2>
        </motion.div>

        {/* Scrolling Cards Area */}
        <div className="flex-1 relative w-full max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <Card 
              key={index} 
              step={step} 
              index={index} 
              total={steps.length} 
              progress={scrollYProgress} 
            />
          ))}
        </div>

        {/* CTA Footer - Fades in at end */}
        <motion.div 
          style={{ opacity: useTransform(scrollYProgress, [0.8, 1], [0, 1]) }}
          className="absolute bottom-20 left-0 right-0 text-center z-20"
        >
          <button className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-foreground text-background font-bold hover:scale-105 transition-transform shadow-xl">
            <Chrome className="w-5 h-5" />
            Add to Chrome
          </button>
        </motion.div>

      </div>
    </section>
  );
};

export default ExtensionSection;
