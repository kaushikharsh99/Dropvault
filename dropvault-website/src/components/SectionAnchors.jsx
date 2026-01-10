import React from 'react';
import { motion } from 'framer-motion';

const sections = [
  { id: 'hero', label: 'Hero' },
  { id: 'problem', label: 'Problem' },
  { id: 'solution', label: 'Solution' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'extension', label: 'Extension' },
  { id: 'features', label: 'Features' },
  { id: 'comparison', label: 'Comparison' },
  { id: 'cta', label: 'Start Now' },
];

const SectionAnchors = ({ activeSection }) => {
  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-4">
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="group relative flex items-center justify-end"
        >
          {/* Label (Tooltip) */}
          <span 
            className={`absolute right-6 px-2 py-1 text-xs font-medium rounded-md bg-foreground/90 text-background opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap pointer-events-none ${
              activeSection === section.id ? 'opacity-0' : ''
            }`}
          >
            {section.label}
          </span>

          {/* Dot */}
          <motion.div
            animate={{
              scale: activeSection === section.id ? 1.5 : 1,
              backgroundColor: activeSection === section.id ? 'var(--primary)' : 'var(--muted-foreground)',
              opacity: activeSection === section.id ? 1 : 0.3,
            }}
            className="w-2 h-2 rounded-full transition-colors duration-300"
          />
        </a>
      ))}
    </div>
  );
};

export default SectionAnchors;
