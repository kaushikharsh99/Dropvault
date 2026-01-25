import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MousePointerClick, Layers, Ghost, Chrome, Command, Image as ImageIcon, FileText, Highlighter, Youtube, Globe, Clock, Camera } from 'lucide-react';

// Data Constants
const actions = [
  { icon: MousePointerClick, title: "Click Icon", desc: "Instantly save current page" },
  { icon: ImageIcon, title: "Right-Click Image", desc: "Save with context & source" },
  { icon: Highlighter, title: "Select Text", desc: "Save as knowledge snippet" },
  { icon: Command, title: "Ctrl + Shift + S", desc: "Speed capture (No popup)" },
];

const contextTags = [
  { icon: FileText, label: "Page Title" },
  { icon: Globe, label: "Source URL" },
  { icon: Camera, label: "Visual Snapshot" },
  { icon: Globe, label: "Domain Info" },
  { icon: Clock, label: "Timestamp" },
];

const contentTypes = [
  { type: "Articles", desc: "Full text & metadata" },
  { type: "Images", desc: "With alt text & context" },
  { type: "PDFs", desc: "Indexed & searchable" },
  { type: "Highlights", desc: "Key snippets only" },
  { type: "YouTube", desc: "With exact timestamps" },
];

const ExtensionSection = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Timeline Segments
  // 0.0 - 0.33: Actions (Slide In)
  // 0.33 - 0.66: Context (Assembly)
  // 0.66 - 1.0: Types (Grid Reveal)

  // Opacity Transitions for Sections
  const section1Opacity = useTransform(scrollYProgress, [0, 0.1, 0.28, 0.33], [0, 1, 1, 0]);
  const section2Opacity = useTransform(scrollYProgress, [0.33, 0.38, 0.61, 0.66], [0, 1, 1, 0]);
  const section3Opacity = useTransform(scrollYProgress, [0.66, 0.71, 0.95, 1], [0, 1, 1, 0]);

  // Section 1 Animations (Staggered Entry)
  const action1X = useTransform(scrollYProgress, [0.05, 0.1], [-50, 0]);
  const action1Op = useTransform(scrollYProgress, [0.05, 0.1], [0, 1]);
  
  const action2X = useTransform(scrollYProgress, [0.1, 0.15], [-50, 0]);
  const action2Op = useTransform(scrollYProgress, [0.1, 0.15], [0, 1]);
  
  const action3X = useTransform(scrollYProgress, [0.15, 0.2], [-50, 0]);
  const action3Op = useTransform(scrollYProgress, [0.15, 0.2], [0, 1]);
  
  const action4X = useTransform(scrollYProgress, [0.2, 0.25], [-50, 0]);
  const action4Op = useTransform(scrollYProgress, [0.2, 0.25], [0, 1]);

  // Section 2 Animations (Implosion/Assembly)
  const cardScale = useTransform(scrollYProgress, [0.33, 0.4], [0.8, 1]);
  // Tags flying in from different directions
  const tag1Y = useTransform(scrollYProgress, [0.4, 0.5], [-100, 0]); 
  const tag1Op = useTransform(scrollYProgress, [0.4, 0.5], [0, 1]);
  
  const tag2X = useTransform(scrollYProgress, [0.42, 0.52], [100, 0]);
  const tag2Op = useTransform(scrollYProgress, [0.42, 0.52], [0, 1]);
  
  const tag3Y = useTransform(scrollYProgress, [0.44, 0.54], [100, 0]);
  const tag3Op = useTransform(scrollYProgress, [0.44, 0.54], [0, 1]);

  const tag4X = useTransform(scrollYProgress, [0.46, 0.56], [-100, 0]);
  const tag4Op = useTransform(scrollYProgress, [0.46, 0.56], [0, 1]);

  // Section 3 Animations (Grid Reveal)
  // Simple stagger based on scroll
  const gridY = useTransform(scrollYProgress, [0.66, 0.75], [50, 0]);

  return (
    <section ref={containerRef} id="extension" className="relative h-[400vh] bg-background">
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col items-center justify-center p-6">
        
        {/* Persistent Title (changes based on section) */}
        <div className="absolute top-10 md:top-20 text-center z-50 w-full">
           <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4 backdrop-blur-md">
            <Chrome className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Chrome Extension</span>
          </div>
        </div>

        {/* --- STAGE 1: ACTIONS --- */}
        <motion.div 
          style={{ opacity: section1Opacity }} 
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-16 text-center">
            One Click. <span className="text-primary">Zero Friction.</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full px-6">
            {[
              { x: action1X, op: action1Op, ...actions[0] },
              { x: action2X, op: action2Op, ...actions[1] },
              { x: action3X, op: action3Op, ...actions[2] },
              { x: action4X, op: action4Op, ...actions[3] },
            ].map((item, i) => (
              <motion.div 
                key={i}
                style={{ x: item.x, opacity: item.op }}
                className="flex items-center gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-foreground">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* --- STAGE 2: CONTEXT ASSEMBLY --- */}
        <motion.div 
          style={{ opacity: section2Opacity }}
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-12 text-center">
            Total <span className="text-purple-400">Context.</span>
          </h2>
          
          <div className="relative w-full max-w-md aspect-[3/4] md:aspect-video md:h-[400px]">
            {/* Central Card */}
            <motion.div 
              style={{ scale: cardScale }}
              className="absolute inset-0 bg-background border border-border rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 z-10"
            >
              <div className="w-20 h-20 bg-muted rounded-full mb-6 animate-pulse" />
              <div className="h-6 w-3/4 bg-muted rounded mb-4" />
              <div className="h-4 w-1/2 bg-muted rounded" />
            </motion.div>

            {/* Flying Tags */}
            <motion.div style={{ y: tag1Y, opacity: tag1Op, x: '-50%' }} className="absolute -top-12 left-1/2 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-md z-20 whitespace-nowrap">
              {React.createElement(contextTags[0].icon, { className: "w-4 h-4" })} {contextTags[0].label}
            </motion.div>

            <motion.div style={{ x: tag2X, opacity: tag2Op, y: '-50%' }} className="absolute top-1/4 -right-12 bg-green-500/10 text-green-400 border border-green-500/20 px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-md z-20 whitespace-nowrap">
              {React.createElement(contextTags[1].icon, { className: "w-4 h-4" })} {contextTags[1].label}
            </motion.div>

            <motion.div style={{ y: tag3Y, opacity: tag3Op, x: '-50%' }} className="absolute -bottom-12 left-1/2 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-md z-20 whitespace-nowrap">
              {React.createElement(contextTags[2].icon, { className: "w-4 h-4" })} {contextTags[2].label}
            </motion.div>

            <motion.div style={{ x: tag4X, opacity: tag4Op, y: '-50%' }} className="absolute top-1/2 -left-12 bg-orange-500/10 text-orange-400 border border-orange-500/20 px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-md z-20 whitespace-nowrap">
              {React.createElement(contextTags[4].icon, { className: "w-4 h-4" })} {contextTags[4].label}
            </motion.div>
          </div>
        </motion.div>

        {/* --- STAGE 3: UNIVERSAL SUPPORT --- */}
        <motion.div 
          style={{ opacity: section3Opacity, y: gridY }}
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-16 text-center">
            Save <span className="text-orange-400">Everything.</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl px-6">
            {contentTypes.map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-muted/10 border border-white/5 hover:bg-muted/20 transition-colors text-center">
                <h4 className="text-lg font-bold text-foreground mb-1">{item.type}</h4>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
            <div className="p-6 rounded-2xl bg-primary text-primary-foreground border border-primary flex flex-col items-center justify-center col-span-2 md:col-span-1 shadow-glow cursor-pointer pointer-events-auto hover:scale-105 transition-transform">
              <span className="font-bold">Add to Chrome</span>
            </div>
          </div>
        </motion.div>

        {/* Progress Dots */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50">
          {[0, 1, 2].map(i => {
             const ranges = [[0, 0.33], [0.33, 0.66], [0.66, 1]];
             const isActive = useTransform(scrollYProgress, (v) => v >= ranges[i][0] && v < ranges[i][1] ? 1 : 0.2);
             return <motion.div key={i} style={{ opacity: isActive }} className="w-2 h-2 rounded-full bg-foreground" />
          })}
        </div>

      </div>
    </section>
  );
};

export default ExtensionSection;
