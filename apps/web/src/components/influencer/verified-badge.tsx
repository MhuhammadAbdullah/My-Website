// Verified tick: blue scalloped badge with a white check (the familiar "verified" look).
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <svg role="img" aria-label="Verified" viewBox="0 0 24 24" className={className ?? "size-5"} fill="none">
      <path d="M12.00 1.40 L14.23 3.69 L17.30 2.82 L18.08 5.92 L21.18 6.70 L20.31 9.77 L22.60 12.00 L20.31 14.23 L21.18 17.30 L18.08 18.08 L17.30 21.18 L14.23 20.31 L12.00 22.60 L9.77 20.31 L6.70 21.18 L5.92 18.08 L2.82 17.30 L3.69 14.23 L1.40 12.00 L3.69 9.77 L2.82 6.70 L5.92 5.92 L6.70 2.82 L9.77 3.69Z" fill="#1d6bf3" stroke="#1d6bf3" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7.6 12.4l2.9 2.9 5.9-6.2" stroke="#ffffff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
