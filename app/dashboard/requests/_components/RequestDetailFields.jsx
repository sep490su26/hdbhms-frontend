export function InfoField({ label, value, icon }) {
    if (!value) return null;

    return (
        <div className="rounded-xl bg-gray-50 p-3 dark:border dark:border-white/10 dark:bg-white/5">
            {icon && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1 dark:text-slate-400">
                    {icon}
                    {label}
                </div>
            )}
            {!icon && <p className="text-xs font-semibold text-gray-500 mb-1 dark:text-slate-400">{label}</p>}
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
    );
}

export function formatMoney(val) {
    if (val == null) return "--";
    return `${new Intl.NumberFormat("vi-VN").format(val)} VNĐ`;
}
