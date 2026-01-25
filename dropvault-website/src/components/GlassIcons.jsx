import React from 'react';
import './GlassIcons.css';

const GlassIcons = ({ items, className }) => {
  return (
    <div className={`icon-btns ${className || ''}`}>
      {items.map((item, index) => (
        <button key={index} className={`icon-btn ${item.customClass || ''}`} aria-label={item.label} type="button">
          <span className="icon-btn__back"></span>
          <span className="icon-btn__front">
            <span className="icon-btn__icon" aria-hidden="true">
              {item.icon}
            </span>
          </span>
          <span className="icon-btn__label text-foreground">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default GlassIcons;
