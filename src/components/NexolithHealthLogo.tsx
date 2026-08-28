import React from 'react';

interface NexolithHealthLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function NexolithHealthLogo({ size = 'lg', className = '' }: NexolithHealthLogoProps) {
  const sizeMap = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-36 h-36',
    xl: 'w-44 h-44',
  };

  return (
    <div className={`relative flex items-center justify-center ${sizeMap[size]} ${className}`}>
      {/* Soft Ambient Glow */}
      <div className="absolute inset-0 rounded-full bg-[#55BFC2]/15 blur-xl animate-pulse" />

      {/* Layer 1: Outer Soft Mint Ring with subtle float */}
      <div className="absolute inset-0 rounded-full border border-[#B8DEDE]/70 bg-[#DDF2F1]/40 backdrop-blur-xs flex items-center justify-center p-2.5 shadow-2xs transition-transform duration-700">
        
        {/* Layer 2: Inner White Card Surface Ring */}
        <div className="w-full h-full rounded-full border border-[#55BFC2]/40 bg-white/90 p-3.5 shadow-inner relative flex items-center justify-center">
          
          {/* Subtle Outer Ring Orbiting Nodes */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#3AAFA9] shadow-[0_0_6px_#3AAFA9] animate-pulse" />
          <div className="absolute bottom-2.5 right-4 w-1.5 h-1.5 rounded-full bg-[#E8B86A] shadow-[0_0_6px_#E8B86A]" />
          <div className="absolute top-1/2 left-2.5 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#55BFC2]" />

          {/* Layer 3: Central SVG Emblem Graphic */}
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#55BFC2" />
                <stop offset="100%" stopColor="#1C696D" />
              </linearGradient>
              <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#55BFC2" />
                <stop offset="100%" stopColor="#3AAFA9" />
              </linearGradient>
            </defs>

            {/* Dashed Concentric Orbit Ring */}
            <circle cx="50" cy="50" r="42" stroke="#B8DEDE" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

            {/* Subtle Family Symbolism: People Curves */}
            <path d="M34 68 C34 58 41 54 50 54 C59 54 66 58 66 68" stroke="#B8DEDE" strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
            <circle cx="50" cy="47" r="4" fill="#B8DEDE" opacity="0.6" />

            {/* Medical Heart Outline */}
            <path
              d="M50 24 C42 15 29 21 29 33 C29 46 47 59 50 62 C53 59 71 46 71 33 C71 21 58 15 50 24 Z"
              fill="url(#heartGradient)"
              fillOpacity="0.12"
              stroke="url(#logoGradient)"
              strokeWidth="2.8"
              strokeLinejoin="round"
            />

            {/* Continuous Heartbeat / ECG Trace across the Emblem */}
            <path
              d="M 23 40 L 36 40 L 40 33 L 44 47 L 49 27 L 54 48 L 58 40 L 77 40"
              stroke="#1C696D"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* AI Medical Intelligence Sparkle Badge (Top Right) */}
            <circle cx="68" cy="24" r="5.5" fill="#DDF2F1" stroke="#3AAFA9" strokeWidth="1.2" />
            <path d="M68 20.5 L68.8 23 L71.5 24 L68.8 25 L68 27.5 L67.2 25 L64.5 24 L67.2 23 Z" fill="#3AAFA9" />
          </svg>
        </div>
      </div>
    </div>
  );
}
