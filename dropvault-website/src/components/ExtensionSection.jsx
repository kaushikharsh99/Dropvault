import React from 'react';
import { motion } from 'framer-motion';
import { MousePointerClick, Zap, WifiOff, Ghost, Layers, ArrowRight, Chrome } from 'lucide-react';

const actions = [
  { action: "Click icon", result: "The current page is instantly saved" },
  { action: "Right-click image", result: "Save with full web context" },
  { action: "Select text", result: "Save highlight as knowledge snippet" },
  { action: "Ctrl + Shift + S", result: "Instant capture — no popup" },
];

const contentTypes = [
  { type: "Articles", method: "Click extension icon" },
  { type: "Images", method: "Right-click context menu" },
  { type: "PDFs", method: "Right-click link" },
  { type: "Highlights", method: "Select text" },
  { type: "YouTube", method: "Save exact timestamp" },
];

const ExtensionSection = () => {
  return (
    <section id="extension" className="py-32 bg-muted/20 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        
        {/* Header */}
        <div className="max-w-4xl mx-auto text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
          >
            <Chrome className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">The DropVault Chrome Extension</span>
          </motion.div>
          
          <h2 className="text-4xl md:text-6xl font-bold text-foreground leading-tight mb-6">
            Capture Knowledge at the <br />
            <span className="gradient-text">Moment It Matters.</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your vault shouldn’t wait for you to visit it. It should be one click away — anywhere on the web.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start max-w-6xl mx-auto">
          
          {/* Left Column: Interactions */}
          <div className="space-y-12">
            <div>
              <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <MousePointerClick className="text-primary" /> One Click. Zero Friction.
              </h3>
              <div className="space-y-4">
                {actions.map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-background border border-border shadow-sm group hover:border-primary/30 transition-colors"
                  >
                    <span className="font-bold text-foreground">{item.action}</span>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="text-sm">{item.result}</span>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                <Layers className="text-primary w-5 h-5" /> Context-Aware Saving
              </h3>
              <p className="text-muted-foreground text-sm mb-6">Every item includes title, URL, source domain, timestamp, and visual snapshot. This is memory-level capture.</p>
              <div className="flex flex-wrap gap-2">
                {["Page Title", "URL", "Visual Snapshot", "Source Domain", "Timestamp"].map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-background border border-border text-xs font-medium">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Features */}
          <div className="space-y-12">
            <div className="glass-card p-8 rounded-3xl border-primary/10">
              <h3 className="text-2xl font-bold mb-8">Save More Than Pages</h3>
              <div className="space-y-6">
                {contentTypes.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div className="flex-1">
                      <p className="font-bold text-foreground leading-none">{item.type}</p>
                      <p className="text-sm text-muted-foreground">{item.method}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="p-6 rounded-2xl border border-border bg-background">
                <Ghost className="w-8 h-8 text-primary mb-4" />
                <h4 className="font-bold mb-2">Invisible UI</h4>
                <p className="text-xs text-muted-foreground">Designed to disappear. Capture and get out of the way.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Why This Changes Everything */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="mt-32 max-w-3xl mx-auto text-center p-12 rounded-[3rem] bg-foreground text-background relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Zap className="w-32 h-32" />
          </div>
          <h3 className="text-3xl font-bold mb-6">Why This Changes Everything</h3>
          <p className="text-xl opacity-80 leading-relaxed mb-8">
            Other tools ask you to <span className="italic">organize</span>. <br />
            DropVault lets you <span className="text-primary font-bold">remember</span>.
          </p>
          <button className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold hover:scale-105 transition-transform shadow-xl">
            <Chrome className="w-5 h-5" />
            Add the DropVault Extension
          </button>
        </motion.div>

      </div>
    </section>
  );
};

export default ExtensionSection;
