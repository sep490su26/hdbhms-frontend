export function DashboardPageHeader({
  eyebrow = null,
  title,
  description,
  actions,
  className = "",
}) {
  return (
    <section
      className={`flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between ${className}`}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#3156b6] dark:text-[#93c5fd]">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={`${eyebrow ? "mt-2 " : ""}text-[1.625rem] font-black leading-tight tracking-[-0.02em] text-slate-900 dark:text-white md:text-3xl`}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </section>
  );
}
