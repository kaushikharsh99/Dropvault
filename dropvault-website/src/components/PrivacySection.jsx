import { motion } from "framer-motion";
import { ShieldCheck, Server, Lock, Eye } from "lucide-react";
const privacyFeatures = [
  {
    icon: Server,
    title: "Runs on local AI models",
    description: "Processing happens on your device, not in the cloud"
  },
  {
    icon: Lock,
    title: "No cloud sharing",
    description: "Your data never leaves your control"
  },
  {
    icon: Eye,
    title: "Your data stays yours",
    description: "We can't see, access, or monetize your information"
  }
];
const PrivacySection = () => {
  return <section id="privacy" className="py-24">
      <div className="container mx-auto px-6">
        <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    className="max-w-4xl mx-auto"
  >
          <div className="glass-card rounded-3xl p-8 md:p-12 relative overflow-hidden">
            {
    /* Background gradient */
  }
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-primary/5" />

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-secondary" />
                </div>
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground">Privacy First</h2>
                  <p className="text-muted-foreground">Your knowledge belongs to you.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {privacyFeatures.map((feature, index) => <motion.div
    key={feature.title}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="p-6 rounded-2xl bg-card/50 border border-border/50"
  >
                    <feature.icon className="w-8 h-8 text-secondary mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </motion.div>)}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>;
};
export default PrivacySection;
