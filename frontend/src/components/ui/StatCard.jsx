export default function StatCard({ icon: Icon, label, value, sublabel, accent = "primary" }) {
  const accentClasses = {
    primary: "bg-primary text-neutral",
    success: "bg-success text-neutral",
    secondary: "bg-secondary text-[#F2EDE3]",
  };

  return (
    <div className="rounded-2xl bg-card border border-primary/[0.12] p-5 flex items-start gap-4">
      {Icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accentClasses[accent]}`}>
          <Icon size={18} strokeWidth={2.25} />
        </div>
      )}
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#9C9488] mb-1.5 truncate">
          {label}
        </p>
        <p className="font-display text-2xl text-[#F2EDE3] leading-none">{value}</p>
        {sublabel && <p className="text-xs text-[#9C9488] mt-1.5">{sublabel}</p>}
      </div>
    </div>
  );
}
