import { motion } from "framer-motion";
import { FileText, Link2, FileUp, Image, Video, Files } from "lucide-react";
import GlassIcons from './GlassIcons';

const saveTypes = [
  { icon: <FileText />, label: "Notes" },
  { icon: <Link2 />, label: "Articles & Links" },
  { icon: <FileUp />, label: "PDFs" },
  { icon: <Image />, label: "Images" },
  { icon: <Video />, label: "Videos" },
  { icon: <Files />, label: "Any File" }
];

const WhatYouCanSaveSection = () => {
  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            What You Can Save
          </h2>
          <p className="text-lg text-muted-foreground">
            Drop anything. DropVault understands it all.
          </p>
        </motion.div>

        <div className="flex justify-center">
            <div className="w-full max-w-4xl">
                 <GlassIcons items={saveTypes} />
            </div>
        </div>
      </div>
    </section>
  );
};
export default WhatYouCanSaveSection;
