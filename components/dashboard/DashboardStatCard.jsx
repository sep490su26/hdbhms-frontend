const toneClasses = {
  amber: "bg-amber-50 text-amber-700",
  blue: "bg-blue-50 text-blue-700",
  dark: "bg-[#eef3fb] text-[#091426]",
  emerald: "bg-emerald-50 text-emerald-700",
  green: "bg-emerald-50 text-emerald-700",
  indigo: "bg-indigo-50 text-indigo-700",
  orange: "bg-orange-50 text-orange-700",
  purple: "bg-purple-50 text-purple-700",
  red: "bg-red-50 text-red-700",
  rose: "bg-rose-50 text-rose-700",
  slate: "bg-slate-100 text-slate-700",
};

export function DashboardStatCard({
  label,
  value,
  icon: Icon,
  tone = "slate",
  suffix = "",
  subtitle,
}) {
  const iconTone = toneClasses[tone] || toneClasses.slate;

  return (
    <article className="flex min-h-20 items-center gap-3 rounded-lg border border-[#dbe1ea] bg-white p-3 shadow-[0_1px_2px_rgba(9,20,38,0.06)] sm:p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconTone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[#647089]">{label}</p>
        <p className="mt-1 text-xl font-black text-[#091426] leading-none sm:text-2xl">
          {value}
          {suffix}
        </p>
        {subtitle ? (
          <p className="mt-1.5 truncate text-[11px] text-[#8490a3]">{subtitle}</p>
        ) : (
          <div className="mt-1.5 h-[16px]"></div>
        )}
      </div>
    </article>
  );
}
