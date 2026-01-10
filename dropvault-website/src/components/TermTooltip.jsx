import React from 'react';
import { motion } from 'framer-motion';

const TermTooltip = ({ term, explanation }) => {
  return (
    <span className="group relative inline-block cursor-help border-b border-dotted border-muted-foreground/50 hover:border-primary transition-colors">
      {term}
      <motion.span 
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 text-xs text-background bg-foreground rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl pointer-events-none z-50 text-center"
        initial={{ y: 10, opacity: 0 }}
        whileHover={{ y: 0, opacity: 1 }}
      >
        {explanation}
        {/* Little arrow */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-foreground" />
      </motion.span>
    </span>
  );
};

export default TermTooltip;
