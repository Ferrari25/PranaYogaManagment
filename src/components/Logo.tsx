/** Isotipo del estudio: flor de loto con trazo caligráfico. */
export function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <g fill="#A3D9A5" stroke="#7CB380" strokeWidth="2" opacity="0.9">
        <path d="M100 30 C80 60 40 80 20 100 C50 110 80 120 100 150 C120 120 150 110 180 100 C160 80 120 60 100 30 Z" />
        <path
          d="M100 45 C85 70 55 85 35 100 C60 110 85 115 100 140 C115 115 140 110 165 100 C145 85 115 70 100 45 Z"
          fill="#C2EABD"
        />
        <path
          d="M100 60 C90 80 70 90 50 100 C70 110 90 112 100 130 C110 112 130 110 150 100 C130 90 110 80 100 60 Z"
          fill="#E2F5E1"
        />
      </g>
      <path
        d="M30 115 C 60 130, 90 90, 100 100 C 110 110, 80 125, 75 110 C 70 95, 120 70, 170 100"
        fill="none"
        stroke="#111111"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
