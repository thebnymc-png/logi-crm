// LogiCRM brand assets.
// Shares the visual language of its sister product (forward "double chevron"
// mark + two-tone wordmark + navy/teal palette) so it reads as part of the same
// family, while carrying its own product name.
//   primary #1763E6 · navy #0A1F3C · accent teal #16B8C4
export function LogoMark({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="7" fill="#1763E6" />
      <path d="M9.5 9l6.3 7-6.3 7" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 9l6.3 7-6.3 7" stroke="#7FE3EC" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Two-tone wordmark: "Logi" adapts to the surface, "CRM" carries the accent.
export function Wordmark({ className = '', light = true }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span className={light ? 'text-white' : 'text-[#0A1F3C]'}>Logi</span>
      <span className="text-[#16B8C4]">CRM</span>
    </span>
  );
}
