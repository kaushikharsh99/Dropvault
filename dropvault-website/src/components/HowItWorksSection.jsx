import { motion } from "framer-motion";
import { Download, Brain, MessageSquareText } from "lucide-react";
const steps = [
  {
    icon: Download,
    title: "Drop Anything",
    description: "Paste text, upload files, save links. No categorization needed.",
    examples: ["\u{1F4DD} Meeting notes", "\u{1F517} Article bookmarks", "\u{1F4C4} PDF documents"]
  },
  {
    icon: Brain,
    title: "Automatic Understanding",
    description: "AI extracts meaning, creates tags, and builds connections.",
    examples: ["\u{1F3F7}\uFE0F Smart tagging", "\u{1F517} Auto-linking", "\u{1F4CA} Topic extraction"]
  },
  {
    icon: MessageSquareText,
    title: "AI Semantic Search",
    description: "Search in plain English. Ask questions, get answers.",
    examples: ['"What did I save about React hooks?"', `"Notes from last week's meeting"`, '"Articles about productivity"']
  }
];
const HowItWorksSection = () => {
  return <section id="how-it-works" className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    className="text-center max-w-3xl mx-auto mb-16"
  >
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Three simple steps to a perfectly organized knowledge base.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {steps.map((step, index) => <motion.div
    key={step.title}
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay: index * 0.15 }}
    className="relative"
  >
              {
    /* Connector line */
  }
              {index < steps.length - 1 && <div className="hidden lg:block absolute top-16 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/20 to-transparent" />}

              <div className="floating-card h-full">
                {
    /* Step number */
  }
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>

                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground mb-6">{step.description}</p>

                <div className="space-y-2">
                  {step.examples.map((example, i) => <div
    key={i}
    className="text-sm px-3 py-2 rounded-lg bg-muted/50 text-muted-foreground"
  >
                      {example}
                    </div>)}
                </div>
              </div>
            </motion.div>)}
        </div>
      </div>
    </section>;
};
export default HowItWorksSection;
