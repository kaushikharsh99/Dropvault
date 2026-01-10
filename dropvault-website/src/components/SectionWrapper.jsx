import React, { useRef, useEffect } from 'react';
import { useInView } from 'framer-motion';

const SectionWrapper = ({ id, children, setActiveSection, activeSection }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "-40% 0px -40% 0px" });

  useEffect(() => {
    if (isInView && setActiveSection) {
      setActiveSection(id);
    }
  }, [isInView, id, setActiveSection]);

  return (
    <div 
      ref={ref} 
      id={id}
      className="opacity-100"
    >
      {children}
    </div>
  );
};

export default SectionWrapper;
