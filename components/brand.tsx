/** Marca OpenGym: placa inclinada en oro (eco del trazo del logo original). */
export function BrandMark({ className = 'h-8 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 30" className={className} aria-hidden>
      <defs>
        <linearGradient id="og-grad" x1="0" x2="1">
          <stop offset="0" stopColor="#F7CF56" />
          <stop offset=".5" stopColor="#E0A93B" />
          <stop offset="1" stopColor="#AA5A18" />
        </linearGradient>
      </defs>
      <path d="M9 0h35l-9 30H0z" fill="url(#og-grad)" />
      <path d="M19 8.5h11l-1.7 5.5H17.3zM15.6 16h11l-1.7 5.5h-11z" fill="#1a1814" />
    </svg>
  );
}

export function Wordmark({ className = 'text-3xl' }: { className?: string }) {
  return <span className={`display ${className}`}>Open<span className="text-gold-hi">Gym</span></span>;
}
