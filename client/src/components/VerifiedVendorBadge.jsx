export const VerifiedVendorBadge = ({ label = false, className = "" }) => (
  <span
    title="Verified vendor"
    aria-label="Verified vendor"
    className={`inline-flex items-center gap-1.5 rounded-full border border-[#78a8ff]/45 bg-[#eef5ff]/95 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#4d79dd] ${className}`.trim()}
  >
    <span className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#4d79dd] text-white">
      <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 fill-current" aria-hidden="true">
        <path d="M6.6 11.4 3.5 8.3l1.1-1.1 2 2 4.8-4.8 1.1 1.1-5.9 5.9Z" />
      </svg>
    </span>
    {label ? <span>Verified</span> : null}
  </span>
);
