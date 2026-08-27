import React from 'react';

interface AntamLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AntamLogo: React.FC<AntamLogoProps> = ({ className = '', showText = true, size = 'md' }) => {
  const heightClass = {
    sm: 'h-8',
    md: 'h-11',
    lg: 'h-16',
  }[size];

  return (
    <div className={`flex items-center select-none ${className}`}>
      <img
        src="/Logo%20Antam%20SVG.svg"
        alt="PT ANTAM Tbk"
        className={`${heightClass} w-auto object-contain shrink-0`}
      />
    </div>
  );
};

