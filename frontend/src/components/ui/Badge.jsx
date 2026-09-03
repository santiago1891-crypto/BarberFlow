const VARIANTS = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  primary: "text-primary",
  neutral: "text-[#9C9488]",
};

export default function Badge({ variant = "neutral", children, pulse = false }) {
  const color = VARIANTS[variant] || VARIANTS.neutral;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide ${color}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full bg-current ${pulse ? "animate-bf-pulse-dot" : ""}`}
      />
      {children}
    </span>
  );
}
