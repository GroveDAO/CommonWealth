export function IconMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="icon-bg" x1="8" x2="56" y1="8" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#101612" />
          <stop offset="1" stopColor="#1f2b24" />
        </linearGradient>
        <linearGradient id="icon-accent" x1="18" x2="46" y1="14" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c8f060" />
          <stop offset="1" stopColor="#60d8c8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#icon-bg)" />
      <path
        d="M32 10 50 18v13c0 12.3-7.4 20.4-18 23-10.6-2.6-18-10.7-18-23V18l18-8Z"
        fill="url(#icon-accent)"
      />
      <path d="M24 24h5v18h-5zm11 0h5v18h-5zm-7 6h8v5h-8z" fill="#101612" />
      <circle cx="45" cy="45" r="7" fill="#101612" />
      <path
        d="m42.5 45 1.9 1.9 4.1-4.4"
        stroke="#c8f060"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}
