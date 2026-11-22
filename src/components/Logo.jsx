export default function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="drop-shadow-[0_4px_10px_rgba(232,192,136,0.35)]">
      <defs>
        <linearGradient id="iep-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6dcae" />
          <stop offset="0.55" stopColor="#e8c088" />
          <stop offset="1" stopColor="#b98544" />
        </linearGradient>
        <linearGradient id="iep-maroon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a82545" />
          <stop offset="1" stopColor="#3d0010" />
        </linearGradient>
      </defs>
      <path
        d="M32 4 8 13v17c0 15 10.3 26.6 24 30 13.7-3.4 24-15 24-30V13L32 4Z"
        fill="url(#iep-maroon)"
        stroke="url(#iep-gold)"
        strokeWidth="3.5"
      />
      <path d="M20 40 28 30l6 6 11-14" fill="none" stroke="url(#iep-gold)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M39 22h6v6" fill="none" stroke="url(#iep-gold)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
