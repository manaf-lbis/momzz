import React from 'react';

interface WavePatternProps {
  variant?: 'topographic' | 'fluid' | 'contour' | 'mesh';
  className?: string;
  opacity?: number;
}

/**
 * Organic vector SVG background patterns matching modern fluid/topographic design.
 * Pure SVG vectors with high precision bezier curves.
 */
export const OrganicWavePattern: React.FC<WavePatternProps> = ({
  variant = 'topographic',
  className = '',
  opacity = 0.18,
}) => {
  if (variant === 'fluid') {
    return (
      <svg
        aria-hidden="true"
        className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
        viewBox="0 0 600 400"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity }}
      >
        <path
          d="M-50,180 C80,60 220,280 360,140 C480,20 540,160 650,100"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M-40,240 C100,120 200,340 380,200 C500,80 560,220 650,160"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M-30,300 C120,180 220,380 400,260 C520,140 580,280 650,220"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M120,-30 C180,120 80,260 240,320 C380,380 420,240 500,430"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M260,-40 C340,100 240,220 380,290 C490,340 460,180 580,440"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (variant === 'contour') {
    return (
      <svg
        aria-hidden="true"
        className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
        viewBox="0 0 600 400"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity }}
      >
        {/* Closed organic loops & contours like topographic maps */}
        <path
          d="M180,80 C260,30 380,60 420,140 C460,220 380,320 280,300 C180,280 120,200 140,130 C150,95 165,85 180,80 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M140,60 C250,0 420,30 470,130 C520,230 430,350 300,340 C170,330 80,230 100,130 C110,90 125,75 140,60 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M100,40 C240,-30 460,0 520,120 C580,240 480,390 320,380 C160,370 40,260 60,130 C70,80 85,60 100,40 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M220,110 C270,80 340,90 370,140 C400,190 350,260 280,250 C210,240 170,180 190,140 C200,120 210,115 220,110 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M-20,100 Q150,250 320,80 T620,220"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M-30,220 Q180,380 360,180 T640,320"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      </svg>
    );
  }

  // Default: topographic vector curves (matches reference image closely)
  return (
    <svg
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
      viewBox="0 0 600 360"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
    >
      <path
        d="M-30,280 C60,200 160,180 250,240 C340,300 420,310 510,220 C560,170 590,200 630,190"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M-30,220 C60,140 160,120 250,180 C340,240 420,250 510,160 C560,110 590,140 630,130"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M-30,160 C60,80 160,60 250,120 C340,180 420,190 510,100 C560,50 590,80 630,70"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M-30,100 C60,20 160,0 250,60 C340,120 420,130 510,40 C560,-10 590,20 630,10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M-30,340 C60,260 160,240 250,300 C340,360 420,370 510,280 C560,230 590,260 630,250"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M80,-30 C140,90 110,200 230,260 C330,310 390,190 460,400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M200,-30 C270,80 230,180 340,250 C440,300 480,180 570,390"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
};