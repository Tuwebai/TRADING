/**
 * Logo Component
 * Three candlesticks in a golden circle
 */

export const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={className}>
      <svg 
        viewBox="0 0 120 120" 
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Golden circle glow effect */}
        <defs>
          <radialGradient id="goldenGlow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#FFA500" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Outer golden glow */}
        <circle 
          cx="60" 
          cy="60" 
          r="55" 
          fill="url(#goldenGlow)" 
          filter="url(#glow)"
          opacity="0.6"
        />
        
        {/* Golden circle ring */}
        <circle 
          cx="60" 
          cy="60" 
          r="50" 
          fill="none" 
          stroke="#FFD700" 
          strokeWidth="2"
          opacity="0.9"
        />
        <circle 
          cx="60" 
          cy="60" 
          r="48" 
          fill="none" 
          stroke="#FFA500" 
          strokeWidth="1"
          opacity="0.6"
        />

        {/* Candlestick 1 (shortest) */}
        <g transform="translate(25, 50)">
          {/* Body */}
          <rect x="2" y="8" width="6" height="8" fill="#2C2C2C" stroke="#3A3A3A" strokeWidth="0.5"/>
          {/* Upper wick */}
          <line x1="5" y1="0" x2="5" y2="8" stroke="#2C2C2C" strokeWidth="1"/>
          {/* Lower wick */}
          <line x1="5" y1="16" x2="5" y2="24" stroke="#2C2C2C" strokeWidth="1"/>
        </g>

        {/* Candlestick 2 (medium) */}
        <g transform="translate(50, 42)">
          {/* Body */}
          <rect x="2" y="6" width="6" height="16" fill="#2C2C2C" stroke="#3A3A3A" strokeWidth="0.5"/>
          {/* Upper wick */}
          <line x1="5" y1="0" x2="5" y2="6" stroke="#2C2C2C" strokeWidth="1"/>
          {/* Lower wick */}
          <line x1="5" y1="22" x2="5" y2="28" stroke="#2C2C2C" strokeWidth="1"/>
        </g>

        {/* Candlestick 3 (tallest) */}
        <g transform="translate(75, 34)">
          {/* Body */}
          <rect x="2" y="4" width="6" height="24" fill="#2C2C2C" stroke="#3A3A3A" strokeWidth="0.5"/>
          {/* Upper wick */}
          <line x1="5" y1="0" x2="5" y2="4" stroke="#2C2C2C" strokeWidth="1"/>
          {/* Lower wick */}
          <line x1="5" y1="28" x2="5" y2="34" stroke="#2C2C2C" strokeWidth="1"/>
        </g>
      </svg>
    </div>
  );
};

