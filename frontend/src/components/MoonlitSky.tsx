'use client';

import React from 'react';

const STARS = [
  { top: '8%', left: '12%', size: 2, delay: 0 },
  { top: '14%', left: '25%', size: 1.5, delay: 1.2 },
  { top: '6%', left: '38%', size: 2.5, delay: 2.5 },
  { top: '19%', left: '48%', size: 1, delay: 0.8 },
  { top: '11%', left: '62%', size: 3, delay: 3.1 },
  { top: '24%', left: '72%', size: 1.5, delay: 1.9 },
  { top: '9%', left: '88%', size: 2, delay: 2.2 },
  { top: '28%', left: '15%', size: 1.5, delay: 3.5 },
  { top: '34%', left: '32%', size: 2, delay: 0.4 },
  { top: '22%', left: '42%', size: 1, delay: 2.8 },
  { top: '38%', left: '58%', size: 2.5, delay: 1.5 },
  { top: '31%', left: '80%', size: 1.5, delay: 0.2 },
  { top: '45%', left: '8%', size: 2, delay: 2.1 },
  { top: '52%', left: '22%', size: 1, delay: 3.8 },
  { top: '48%', left: '46%', size: 1.5, delay: 1.1 },
  { top: '56%', left: '68%', size: 2, delay: 2.9 },
  { top: '42%', left: '92%', size: 2.5, delay: 0.6 },
  { top: '65%', left: '18%', size: 1.5, delay: 1.7 },
  { top: '72%', left: '36%', size: 2, delay: 3.2 },
  { top: '68%', left: '54%', size: 1, delay: 0.9 },
  { top: '78%', left: '76%', size: 2.5, delay: 2.4 },
  { top: '62%', left: '86%', size: 1.5, delay: 1.3 },
  { top: '85%', left: '10%', size: 2, delay: 0.5 },
  { top: '88%', left: '28%', size: 1, delay: 2.7 },
  { top: '82%', left: '62%', size: 1.5, delay: 3.6 },
  { top: '92%', left: '82%', size: 2, delay: 1.8 },
  { top: '16%', left: '82%', size: 3, delay: 0.7 },
  { top: '5%', left: '70%', size: 1.5, delay: 2.3 },
];

export const MoonlitSky: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* 1. Deep Midnight & Dark Ocean Gradient Base */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 120% 90% at 75% 18%, #0C2A4D 0%, #081D35 32%, #061426 65%, #030A14 100%)',
        }}
      />

      {/* 2. Soft Atmospheric Moonlight Haze Cone */}
      <div 
        className="absolute w-[800px] h-[800px] -top-32 -right-24 rounded-full opacity-35 blur-[120px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(66, 217, 255, 0.45) 0%, rgba(22, 139, 255, 0.25) 45%, rgba(6, 20, 38, 0) 75%)',
        }}
      />

      {/* 3. Subtle Cyan Celestial Drift in Background */}
      <div 
        className="absolute w-[600px] h-[500px] top-[30%] -left-32 rounded-full opacity-20 blur-[140px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(22, 139, 255, 0.35) 0%, rgba(66, 217, 255, 0.15) 50%, transparent 80%)',
        }}
      />

      {/* 4. Organic Glowing Stars Field */}
      {STARS.map((star, idx) => (
        <div
          key={idx}
          className="absolute rounded-full animate-twinkle"
          style={{
            top: star.top,
            left: star.left,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: idx % 3 === 0 ? '#42D9FF' : '#DCEEFF',
            boxShadow: `0 0 ${star.size * 3}px ${idx % 3 === 0 ? 'rgba(66, 217, 255, 0.8)' : 'rgba(220, 238, 255, 0.8)'}`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}

      {/* 5. Deep Background Layer Clouds (Drifting behind the moon) */}
      <div className="absolute top-2 sm:top-6 right-0 sm:right-6 w-[550px] sm:w-[720px] h-[340px] sm:h-[420px] opacity-40 animate-drift-slow pointer-events-none">
        <svg viewBox="0 0 600 300" className="w-full h-full filter blur-[14px]">
          <defs>
            <linearGradient id="cloudBackGrad" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#1E3E66" stopOpacity="0.7" />
              <stop offset="40%" stopColor="#122A47" stopOpacity="0.85" />
              <stop offset="75%" stopColor="#0B1A2E" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#061426" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 120,180 Q 150,110 240,120 Q 310,80 390,110 Q 470,90 510,140 Q 560,170 540,220 Q 480,260 380,250 Q 260,260 170,230 Z"
            fill="url(#cloudBackGrad)"
          />
        </svg>
      </div>

      {/* 6. The Luminous Moon */}
      <div className="absolute top-12 sm:top-16 right-8 sm:right-24 md:right-32 flex items-center justify-center pointer-events-none select-none">
        {/* Outer Lunar Halo Diffusion */}
        <div 
          className="absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full pointer-events-none animate-moon-glow"
          style={{
            background: 'radial-gradient(circle, rgba(220, 238, 255, 0.28) 0%, rgba(66, 217, 255, 0.15) 45%, rgba(22, 139, 255, 0.05) 70%, transparent 100%)',
          }}
        />

        {/* Realistic Moon Surface Disk */}
        <div className="relative w-28 h-28 sm:w-40 sm:h-40 rounded-full overflow-hidden shadow-[0_0_50px_rgba(220,238,255,0.4),_0_0_100px_rgba(66,217,255,0.25)]">
          {/* Base Lunar Gradient */}
          <div 
            className="w-full h-full rounded-full"
            style={{
              background: 'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #E8F3FF 35%, #CBE3FB 70%, #A2C8EE 100%)',
            }}
          />

          {/* Lunar Mare / Crater Shading Details (Soft and realistic) */}
          <div 
            className="absolute inset-0 rounded-full opacity-45 mix-blend-multiply pointer-events-none"
            style={{
              background: `
                radial-gradient(circle at 62% 28%, #85A7CE 0%, transparent 22%),
                radial-gradient(circle at 74% 54%, #7D9DC3 0%, transparent 28%),
                radial-gradient(circle at 45% 72%, #86A4C9 0%, transparent 25%),
                radial-gradient(circle at 25% 48%, #93B3D9 0%, transparent 18%),
                radial-gradient(circle at 58% 68%, #7897BD 0%, transparent 20%),
                radial-gradient(circle at 36% 22%, #95B4D8 0%, transparent 14%)
              `,
            }}
          />

          {/* Moonlight Edge Illumination Rim */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: 'inset -6px -6px 14px rgba(30, 68, 110, 0.4), inset 3px 3px 8px rgba(255, 255, 255, 0.9)',
            }}
          />
        </div>
      </div>

      {/* 7. Foreground Layer Clouds (Soft wisps drifting directly across & wrapping around the moon) */}
      <div className="absolute top-20 sm:top-24 right-0 sm:right-8 w-[580px] sm:w-[780px] h-[340px] sm:h-[400px] opacity-75 animate-drift-reverse pointer-events-none">
        <svg viewBox="0 0 650 320" className="w-full h-full filter blur-[10px]">
          <defs>
            <linearGradient id="cloudFrontGrad" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#0B1A2E" stopOpacity="0" />
              <stop offset="25%" stopColor="#1B3B60" stopOpacity="0.7" />
              <stop offset="55%" stopColor="#255182" stopOpacity="0.82" />
              <stop offset="80%" stopColor="#1C3D65" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#071526" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="cloudEdgeHighlight" x1="40%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#DCEEFF" stopOpacity="0.45" />
              <stop offset="45%" stopColor="#42D9FF" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#061426" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Cloud body partially covering moon's lower edge */}
          <path
            d="M 60,170 Q 120,95 210,120 Q 280,65 370,85 Q 460,50 540,95 Q 610,135 630,190 Q 580,240 470,225 Q 360,250 240,220 Q 140,240 60,170 Z"
            fill="url(#cloudFrontGrad)"
          />

          {/* Moonlight rim reflection along upper cloud ridge */}
          <path
            d="M 180,125 Q 270,75 360,95 Q 440,65 520,105 Q 580,135 600,175 Q 530,150 440,125 Q 330,125 180,150 Z"
            fill="url(#cloudEdgeHighlight)"
          />
        </svg>
      </div>

      {/* 8. Lower Atmosphere Soft Horizontal Cloud Drift across Middle */}
      <div className="absolute top-[42%] left-0 sm:left-[10%] w-[800px] sm:w-[1100px] h-[300px] opacity-30 animate-drift-slow pointer-events-none">
        <svg viewBox="0 0 900 240" className="w-full h-full filter blur-[18px]">
          <path
            d="M 50,140 Q 180,70 340,95 Q 520,60 700,90 Q 820,120 850,160 Q 750,200 580,185 Q 400,210 220,185 Z"
            fill="url(#cloudBackGrad)"
          />
        </svg>
      </div>
    </div>
  );
};