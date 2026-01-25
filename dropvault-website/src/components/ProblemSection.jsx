import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { FolderOpen, FileStack, Search, Puzzle } from "lucide-react";

const timeline = [
  {
    icon: FolderOpen,
    title: "Manual folders",
    description: "Endless hierarchies that break as your knowledge grows. You spend more time managing structure than doing work."
  },
  {
    icon: FileStack,
    title: "Forced templates",
    description: "Rigid structures that don't match how you actually think. Your brain isn't a database, why treat it like one?"
  },
  {
    icon: Search,
    title: "Broken search",
    description: "Keywords fail when you can't remember exact terms. 'Project X' is useless if you named it 'New Strategy'."
  },
  {
    icon: Puzzle,
    title: "Scattered knowledge",
    description: "Notes in Notion, files in Drive, links in Slack. Your digital brain is fragmented across a dozen apps."
  }
];

const Card = ({ item, index, total, progress }) => {
  const step = 1 / total;
  const start = index * step;
  const end = (index + 1) * step;
  
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
      className="absolute top-0 left-0 w-full h-full flex items-center p-6"
    >
      <div className="w-full bg-background border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden group hover:border-destructive/30 transition-colors">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <item.icon className="w-32 h-32 text-destructive" />
        </div>
        
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-6 text-destructive">
            <item.icon className="w-8 h-8" />
          </div>
          
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            {item.title}
          </h3>
          
          <p className="text-lg text-muted-foreground leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const ProblemSection = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <section ref={containerRef} className="relative h-[300vh] bg-muted/10">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="container mx-auto h-full px-6 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24">
          
          {/* Static Left Side */}
          <div className="lg:w-1/3 text-center lg:text-left z-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
                The Pain <span className="text-destructive">Story.</span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                We've all been there. It starts with a folder and ends in chaos. The traditional file system wasn't built for the age of AI.
              </p>
              
              {/* Progress Bar for Desktop */}
              <div className="hidden lg:flex gap-2 mt-12">
                {timeline.map((_, i) => {
                  const start = i / timeline.length;
                  const end = (i + 1) / timeline.length;
                  const isActive = useTransform(scrollYProgress, (v) => v >= start && v < end ? 1 : 0.2);
                  return (
                    <motion.div 
                      key={i} 
                      style={{ opacity: isActive }}
                      className="h-1 flex-1 bg-destructive rounded-full"
                    />
                  )
                })}
              </div>
            </motion.div>
          </div>

          {/* Scrolling Right Side (Cards) */}
          <div className="lg:w-1/2 w-full h-[400px] relative">
            {timeline.map((item, index) => (
              <Card 
                key={index} 
                item={item} 
                index={index} 
                total={timeline.length} 
                progress={scrollYProgress} 
              />
            ))}
          </div>
          
          {/* Mobile Progress Indicator */}
          <div className="lg:hidden absolute bottom-8 left-0 right-0 flex justify-center gap-2">
             {timeline.map((_, i) => {
                  const start = i / timeline.length;
                  const end = (i + 1) / timeline.length;
                  const isActive = useTransform(scrollYProgress, (v) => v >= start && v < end ? 1 : 0.2);
                  return (
                    <motion.div 
                      key={i} 
                      style={{ opacity: isActive }}
                      className="w-2 h-2 bg-destructive rounded-full"
                    />
                  )
                })}
          </div>

        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
