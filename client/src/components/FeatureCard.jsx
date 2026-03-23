const toneStyles = {
  emerald: {
    card:
      "border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/80",
    icon:
      "border-emerald-200/70 bg-emerald-500/10 text-emerald-700 shadow-[0_12px_30px_rgba(16,185,129,0.18)]",
    eyebrow: "text-emerald-700/80",
    glow: "bg-emerald-300/35",
  },
  blue: {
    card:
      "border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-blue-100/80",
    icon:
      "border-sky-200/70 bg-sky-500/10 text-sky-700 shadow-[0_12px_30px_rgba(59,130,246,0.18)]",
    eyebrow: "text-sky-700/80",
    glow: "bg-sky-300/35",
  },
  violet: {
    card:
      "border-violet-200/80 bg-gradient-to-br from-orange-50 via-white to-violet-100/80",
    icon:
      "border-violet-200/70 bg-violet-500/10 text-violet-700 shadow-[0_12px_30px_rgba(139,92,246,0.18)]",
    eyebrow: "text-violet-700/80",
    glow: "bg-violet-300/35",
  },
  amber: {
    card:
      "border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-yellow-100/80",
    icon:
      "border-amber-200/70 bg-amber-500/10 text-amber-700 shadow-[0_12px_30px_rgba(245,158,11,0.18)]",
    eyebrow: "text-amber-700/80",
    glow: "bg-amber-300/35",
  },
};

export const FeatureCard = ({
  icon: Icon,
  title,
  description,
  highlight = false,
  tone = "emerald",
  className = "",
}) => {
  const styles = toneStyles[tone] || toneStyles.emerald;

  return (
    <article
      className={[
        "group relative w-full max-w-none overflow-hidden rounded-[1.45rem] border p-3.5 text-left shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg sm:aspect-square md:rounded-[2.2rem] md:p-4 md:hover:scale-105",
        styles.card,
        className,
      ].join(" ")}
    >
      <div
        className={`absolute -right-10 -top-10 h-24 w-24 rounded-full blur-3xl transition-transform duration-300 group-hover:scale-110 ${styles.glow}`}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.75),transparent_48%,rgba(255,255,255,0.12))]" />

      <div className="relative flex h-full flex-col">
        <div
          className={[
            "inline-flex h-9 w-9 items-center justify-center rounded-[1rem] border transition-transform duration-300 group-hover:-translate-y-0.5 md:h-10 md:w-10 md:rounded-[1.1rem]",
            styles.icon,
          ].join(" ")}
        >
          <Icon className="h-[1.05rem] w-[1.05rem] md:h-5 md:w-5" />
        </div>

        <div className="mt-2.5 space-y-1.5 md:mt-3">
          <p className={`text-[0.58rem] font-bold uppercase tracking-[0.22em] md:text-[0.62rem] md:tracking-[0.24em] ${styles.eyebrow}`}>
            {highlight ? "Escrow protection" : "Marketplace benefit"}
          </p>
          <h3
            className={`font-display font-bold leading-tight text-staps-ink ${
              highlight ? "text-[0.96rem] md:text-[1.16rem]" : "text-[0.88rem] md:text-[1.02rem]"
            }`}
          >
            {title}
          </h3>
          <p
            className={`max-w-[30ch] text-staps-ink/68 ${
              highlight ? "text-[0.7rem] leading-5 md:text-[0.72rem]" : "text-[0.68rem] leading-5 md:text-[0.7rem]"
            }`}
          >
            {description}
          </p>
        </div>

      </div>
    </article>
  );
};
