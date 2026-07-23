"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  Building2,
  CircleHelp,
  ClipboardList,
  ListChecks,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { fetchPropertyRulesCatalog } from "@/services/propertyRulesService";
import { RuleViolationRecorder } from "./_components/RuleViolationRecorder";

const CATEGORY_META = [
  {
    id: "general",
    title: "Quy định chung",
    prefixes: ["GENERAL_", "GEN_"],
    icon: ClipboardList,
    panel: "border-sky-100 bg-sky-50",
    iconBox: "bg-sky-600 text-white",
    badge: "bg-sky-100 text-sky-800",
    order: 1,
  },
  {
    id: "security",
    title: "An ninh",
    prefixes: ["SECURITY_", "SEC_"],
    icon: ShieldCheck,
    panel: "border-emerald-100 bg-emerald-50",
    iconBox: "bg-emerald-600 text-white",
    badge: "bg-emerald-100 text-emerald-800",
    order: 2,
  },
  {
    id: "hygiene",
    title: "Vệ sinh",
    prefixes: ["HYGIENE_", "HYG_"],
    icon: Sparkles,
    panel: "border-teal-100 bg-teal-50",
    iconBox: "bg-teal-600 text-white",
    badge: "bg-teal-100 text-teal-800",
    order: 3,
  },
  {
    id: "utility",
    title: "Tiện ích",
    prefixes: ["UTILITY_", "UTL_", "WIFI_"],
    exactCodes: ["WIFI_RESET"],
    icon: Zap,
    panel: "border-amber-100 bg-amber-50",
    iconBox: "bg-amber-500 text-slate-950",
    badge: "bg-amber-100 text-amber-900",
    order: 4,
  },
  {
    id: "fine",
    title: "Vi phạm",
    prefixes: ["FINE_", "PENALTY_", "VIOLATION_"],
    icon: AlertTriangle,
    panel: "border-rose-100 bg-rose-50",
    iconBox: "bg-rose-600 text-white",
    badge: "bg-rose-100 text-rose-800",
    order: 5,
  },
];

const OTHER_CATEGORY = {
  id: "other",
  title: "Khác",
  icon: CircleHelp,
  panel: "border-slate-200 bg-white",
  iconBox: "bg-slate-700 text-white",
  badge: "bg-slate-100 text-slate-700",
  order: 99,
};

function resolveCategory(ruleCode) {
  const code = String(ruleCode || "").trim().toUpperCase();
  return (
    CATEGORY_META.find((category) => {
      if (category.exactCodes?.includes(code)) return true;
      return category.prefixes.some((prefix) => code.startsWith(prefix));
    }) || OTHER_CATEGORY
  );
}

function groupRulesByCategory(rules) {
  const grouped = new Map();

  for (const rule of rules) {
    const category = resolveCategory(rule.ruleCode);
    if (!grouped.has(category.id)) {
      grouped.set(category.id, { ...category, rules: [] });
    }
    grouped.get(category.id).rules.push(rule);
  }

  return [...grouped.values()]
    .map((category) => ({
      ...category,
      rules: [...category.rules].sort((left, right) => left.sortOrder - right.sortOrder),
    }))
    .sort((left, right) => left.order - right.order);
}

function isFineRule(rule) {
  return Number(rule.defaultFineAmount) > 0;
}

function formatCurrency(value) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0))} VNĐ`;
}

export default function RulesClient({ variant = "public" }) {
  const searchParams = useSearchParams();
  const propertyIdParam = searchParams.get("propertyId") || "";
  const [properties, setProperties] = useState([]);
  const [property, setProperty] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [rules, setRules] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const applyCatalog = useCallback((catalog) => {
    setProperties(catalog.properties);
    setProperty(catalog.property);
    setRules(catalog.rules);
    setSelectedPropertyId(catalog.property?.id ? String(catalog.property.id) : "");
  }, []);

  const loadRules = useCallback(async (propertyId = "") => {
    setStatus("loading");
    setError("");
    try {
      const catalog = await fetchPropertyRulesCatalog({ propertyId });
      applyCatalog(catalog);
      setStatus("success");
    } catch (loadError) {
      setError(loadError?.message || "Không thể tải nội quy.");
      setStatus("error");
    }
  }, [applyCatalog]);

  useEffect(() => {
    let isCancelled = false;

    fetchPropertyRulesCatalog({ propertyId: propertyIdParam })
      .then((catalog) => {
        if (isCancelled) return;
        applyCatalog(catalog);
        setStatus("success");
      })
      .catch((loadError) => {
        if (isCancelled) return;
        setError(loadError?.message || "Không thể tải nội quy.");
        setStatus("error");
      });

    return () => {
      isCancelled = true;
    };
  }, [applyCatalog, propertyIdParam]);

  const categories = useMemo(() => groupRulesByCategory(rules), [rules]);
  const fineRules = useMemo(() => rules.filter(isFineRule), [rules]);

  const handlePropertyChange = (event) => {
    const nextPropertyId = event.target.value;
    setSelectedPropertyId(nextPropertyId);
    loadRules(nextPropertyId);
  };

  if (variant === "dashboard") {
    const isLoading = status === "loading";

    return (
      <div className="flex w-full min-w-0 flex-col gap-6 text-slate-900 dark:text-white">
        <DashboardPageHeader
          title="Quản lý nội quy"
          description="Theo dõi nội quy đang áp dụng, nhóm quy định và khoản phạt theo từng cơ sở."
          actions={
            <div className="flex flex-wrap gap-2">
              {properties.length > 1 ? (
                <select
                  value={selectedPropertyId}
                  onChange={handlePropertyChange}
                  className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-200"
                  aria-label="Chọn cơ sở"
                >
                  {properties.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                type="button"
                onClick={() => loadRules(selectedPropertyId || propertyIdParam)}
                disabled={isLoading}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1e40af] px-4 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60 dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8]"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Làm mới
              </button>
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-4">
          <DashboardStatCard
            icon={Building2}
            label="Cơ sở"
            value={property?.propertyCode || (property?.id ? `#${property.id}` : "Chưa chọn")}
            tone="blue"
            subtitle={property?.name || "Theo cơ sở đang chọn"}
          />
          <DashboardStatCard
            icon={ClipboardList}
            label="Nội quy"
            value={rules.length}
            tone="emerald"
            subtitle="Đang hoạt động"
          />
          <DashboardStatCard
            icon={ListChecks}
            label="Nhóm quy định"
            value={categories.length}
            tone="purple"
            subtitle="Đã phân nhóm"
          />
          <DashboardStatCard
            icon={Banknote}
            label="Khoản phạt"
            value={fineRules.length}
            tone="orange"
            subtitle="Có số tiền mặc định"
          />
        </section>

        {status === "error" ? (
          <section className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </section>
        ) : null}

        <RuleViolationRecorder
          key={selectedPropertyId || propertyIdParam || "no-property"}
          propertyId={selectedPropertyId || propertyIdParam}
          propertyName={property?.name || ""}
        />

        {isLoading ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <article
                key={index}
                className="h-56 animate-pulse rounded-lg border border-[#e2e8f0] bg-white dark:border-white/10 dark:bg-[#0f172a]"
              />
            ))}
          </section>
        ) : null}

        {status === "success" && rules.length === 0 ? (
          <section className="grid min-h-64 place-items-center rounded-lg border border-dashed border-[#cbd5e1] bg-white p-8 text-center dark:border-white/10 dark:bg-[#0f172a]">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Chưa có nội quy
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Cơ sở này chưa có nội quy đang hoạt động.
              </p>
            </div>
          </section>
        ) : null}

        {status === "success" && rules.length > 0 ? (
          <>
            <section className="rounded-lg border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
              <div className="flex flex-col gap-1 border-b border-[#e2e8f0] px-4 py-4 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">
                    Danh mục nội quy
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Nội quy được nhóm theo loại để quản lý và tra cứu nhanh.
                  </p>
                </div>
                <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  {rules.length} nội quy
                </span>
              </div>
              <div className="grid gap-4 p-4 lg:grid-cols-2">
                {categories.map((category) => (
                  <DashboardRuleCategoryCard key={category.id} category={category} />
                ))}
              </div>
            </section>

            <DashboardFineSection rules={fineRules} />
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950">
      <section className="border-b border-slate-800 bg-[#091426] px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-amber-300">Nội quy nhà trọ</p>
            <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Quy định sinh hoạt tại Hải Đăng
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              Danh sách nội quy được lấy trực tiếp từ hệ thống quản lý và tự động sắp xếp theo nhóm.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-72">
            {properties.length > 1 && (
              <label className="grid gap-2 text-sm font-semibold text-slate-200">
                Cơ sở
                <select
                  value={selectedPropertyId}
                  onChange={handlePropertyChange}
                  className="h-11 rounded-lg border border-white/15 bg-white px-3 text-sm font-semibold text-slate-950 outline-none"
                >
                  {properties.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {property?.name && (
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                Đang hiển thị: <span className="font-bold text-white">{property.name}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {status === "loading" && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-56 animate-pulse rounded-lg border border-slate-200 bg-white" />
              ))}
            </div>
          )}

          {status === "error" && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-rose-950">Không tải được nội quy</h2>
                  <p className="mt-1 text-sm text-rose-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {status === "success" && rules.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
              <h2 className="text-xl font-bold text-slate-950">Chưa có nội quy</h2>
              <p className="mt-2 text-sm text-slate-600">Cơ sở này chưa có nội quy đang hoạt động.</p>
            </div>
          )}

          {status === "success" && rules.length > 0 && (
            <div className="space-y-10">
              <div>
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Danh mục nội quy</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-950">Các nhóm quy định</h2>
                  </div>
                  <p className="text-sm font-semibold text-slate-500">{rules.length} nội quy đang hoạt động</p>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {categories.map((category) => (
                    <RuleCategoryCard key={category.id} category={category} />
                  ))}
                </div>
              </div>

              <FineSection rules={fineRules} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DashboardRuleCategoryCard({ category }) {
  const Icon = category.icon;

  return (
    <article className="rounded-lg border border-[#e2e8f0] bg-white p-4 dark:border-white/10 dark:bg-[#0f172a]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${category.iconBox}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 dark:text-white">{category.title}</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {category.rules.length} mục đang áp dụng
            </p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700 dark:bg-white/5 dark:text-slate-300">
          {category.id.toUpperCase()}
        </span>
      </div>

      <div className="mt-4 divide-y divide-[#e2e8f0] dark:divide-white/10">
        {category.rules.map((rule) => (
          <div key={rule.id || rule.ruleCode} className="py-3 first:pt-0 last:pb-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-bold leading-6 text-slate-900 dark:text-white">{rule.title}</p>
                <p className="mt-1 text-xs font-black uppercase text-slate-400 dark:text-slate-500">
                  {rule.ruleCode || "RULE"}
                </p>
              </div>
              {isFineRule(rule) ? (
                <span className="w-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                  {formatCurrency(rule.defaultFineAmount)}
                </span>
              ) : null}
            </div>
            {rule.description ? (
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {rule.description}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </article>
  );
}

function DashboardFineSection({ rules }) {
  return (
    <section className="rounded-lg border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
      <div className="flex flex-col gap-1 border-b border-[#e2e8f0] px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-black text-slate-900 dark:text-white">
            Điều khoản phạt
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Các nội quy có khoản phạt tiền mặc định.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 dark:bg-white/5 dark:text-slate-300">
          <Banknote className="h-4 w-4" />
          {rules.length} khoản phạt
        </span>
      </div>

      {rules.length === 0 ? (
        <p className="p-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
          Hiện chưa có nội quy nào đang áp dụng phạt tiền mặc định.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#f2f4f6] text-xs uppercase text-slate-500 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Mã nội quy</th>
                <th className="px-4 py-3">Nội dung</th>
                <th className="px-4 py-3 text-right">Mức phạt</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id || rule.ruleCode} className="border-t border-[#e2e8f0] dark:border-white/10">
                  <td className="px-4 py-3 font-black text-slate-700 dark:text-slate-200">
                    {rule.ruleCode || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900 dark:text-white">{rule.title}</p>
                    {rule.description ? (
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {rule.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-amber-700 dark:text-amber-300">
                    {formatCurrency(rule.defaultFineAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RuleCategoryCard({ category }) {
  const Icon = category.icon;

  return (
    <article className={`flex min-h-56 flex-col rounded-lg border p-5 shadow-sm ${category.panel}`}>
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${category.iconBox}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${category.badge}`}>
          {category.rules.length} mục
        </span>
      </div>
      <h3 className="mt-4 text-xl font-bold text-slate-950">{category.title}</h3>
      <div className="mt-4 flex flex-1 flex-col gap-3">
        {category.rules.map((rule) => (
          <div key={rule.id || rule.ruleCode} className="rounded-lg border border-white/70 bg-white/80 p-3">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-900" />
              <div className="min-w-0">
                <p className="font-bold leading-6 text-slate-950">{rule.title}</p>
                {rule.description && <p className="mt-1 text-sm leading-6 text-slate-600">{rule.description}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function FineSection({ rules }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Hướng dẫn chung</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">Điều khoản phạt</h2>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
          <Banknote className="h-4 w-4" />
          {rules.length} khoản phạt tiền
        </div>
      </div>

      {rules.length === 0 ? (
        <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Hiện chưa có nội quy nào đang áp dụng phạt tiền mặc định.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {rules.map((rule) => (
            <article key={rule.id || rule.ruleCode} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-slate-950">
                  <Banknote className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="font-bold leading-6 text-slate-950">{rule.title}</h3>
                    <span className="w-fit rounded-full bg-white px-3 py-1 text-sm font-extrabold text-amber-900">
                      {formatCurrency(rule.defaultFineAmount)}
                    </span>
                  </div>
                  {rule.description && <p className="mt-2 text-sm leading-6 text-slate-700">{rule.description}</p>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
