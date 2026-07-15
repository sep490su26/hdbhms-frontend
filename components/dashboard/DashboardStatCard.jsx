const toneClasses = {
  amber: "bg-amber-50 text-amber-700 dark:bg-yellow-500/10 dark:text-yellow-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  dark: "bg-[#eef3fb] text-slate-900 dark:bg-white/5 dark:text-slate-300",
  emerald:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  green:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-blue-500/10 dark:text-blue-300",
  orange: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  purple: "bg-purple-50 text-purple-700 dark:bg-blue-500/10 dark:text-blue-300",
  red: "bg-red-50 text-red-700 dark:bg-rose-500/10 dark:text-rose-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  slate: "bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300",
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
    <article className="flex min-h-20 items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a] sm:p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconTone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 text-xl font-black leading-none text-slate-900 dark:text-white sm:text-2xl">
          {value}
          {suffix}
        </p>
        {subtitle ? (
          <p className="mt-1.5 truncate text-[11px] text-slate-400 dark:text-slate-500">{subtitle}</p>
        ) : (
          <div className="mt-1.5 h-[16px]"></div>
        )}
      </div>
    </article>
  );
}
