"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BadgeAlert,
  Banknote,
  BookOpenText,
  Bubbles,
  Building2,
  ChevronDown,
  CircleHelp,
  GripVertical,
  HousePlug,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VietnameseMoneyInput } from "@/components/ui/vietnamese-money-input";
import {
  createPropertyRule,
  deletePropertyRule,
  fetchPropertyRulesCatalog,
  updatePropertyRule,
} from "@/services/propertyRulesService";
import { RuleViolationRecorder } from "./_components/RuleViolationRecorder";

const CATEGORY_META = [
  {
    id: "general",
    title: "Quy định chung",
    badgeLabel: "Chung",
    codePrefix: "GENERAL",
    prefixes: ["GENERAL_", "GEN_"],
    icon: BookOpenText,
    panel: "border-sky-100 bg-sky-50",
    iconBox: "bg-sky-600 text-white",
    badge: "bg-sky-100 text-sky-800",
    order: 1,
  },
  {
    id: "security",
    title: "An ninh",
    badgeLabel: "An ninh",
    codePrefix: "SECURITY",
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
    badgeLabel: "Vệ sinh",
    codePrefix: "HYGIENE",
    prefixes: ["HYGIENE_", "HYG_"],
    icon: Bubbles,
    panel: "border-teal-100 bg-teal-50",
    iconBox: "bg-teal-600 text-white",
    badge: "bg-teal-100 text-teal-800",
    order: 3,
  },
  {
    id: "utility",
    title: "Tiện ích",
    badgeLabel: "Tiện ích",
    codePrefix: "UTILITY",
    prefixes: ["UTILITY_", "UTL_", "WIFI_"],
    exactCodes: ["WIFI_RESET", "FINE_UNAUTHORIZED_REPAIR"],
    icon: HousePlug,
    panel: "border-amber-100 bg-amber-50",
    iconBox: "bg-amber-500 text-slate-950",
    badge: "bg-amber-100 text-amber-900",
    order: 4,
  },
  {
    id: "fine",
    title: "Vi phạm",
    badgeLabel: "Vi phạm",
    codePrefix: "FINE",
    prefixes: ["FINE_", "PENALTY_", "VIOLATION_"],
    icon: BadgeAlert,
    panel: "border-rose-100 bg-rose-50",
    iconBox: "bg-rose-600 text-white",
    badge: "bg-rose-100 text-rose-800",
    order: 5,
  },
];

const OTHER_CATEGORY = {
  id: "other",
  title: "Khác",
  badgeLabel: "Khác",
  codePrefix: "RULE",
  icon: CircleHelp,
  panel: "border-slate-200 bg-white",
  iconBox: "bg-slate-700 text-white",
  badge: "bg-slate-100 text-slate-700",
  order: 99,
};

const EMPTY_RULE_FORM = {
  ruleCode: "",
  title: "",
  description: "",
  defaultFineAmount: "",
  sortOrder: 9999,
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

function groupRulesByCategory(rules, { includeEmpty = false } = {}) {
  const grouped = new Map();

  if (includeEmpty) {
    CATEGORY_META.forEach((category) => {
      grouped.set(category.id, { ...category, rules: [] });
    });
  }

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
  const [ruleForm, setRuleForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState(null);
  const [draggingRuleId, setDraggingRuleId] = useState(null);
  const [orderingRuleId, setOrderingRuleId] = useState(null);
  const [showViolationDialog, setShowViolationDialog] = useState(false);
  const [activePublicCategoryId, setActivePublicCategoryId] = useState("");

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
  const dashboardCategories = useMemo(
    () =>
      groupRulesByCategory(rules, { includeEmpty: true }).filter(
        (category) => category.id !== "fine" || category.rules.length > 0,
      ),
    [rules],
  );
  const fineRules = useMemo(() => rules.filter(isFineRule), [rules]);
  const activePublicCategory = useMemo(
    () => categories.find((category) => category.id === activePublicCategoryId) || categories[0] || null,
    [activePublicCategoryId, categories],
  );

  const handlePropertyChange = (event) => {
    const nextPropertyId = event.target.value;
    setSelectedPropertyId(nextPropertyId);
    loadRules(nextPropertyId);
  };

  const openCreateForm = (category) => {
    const targetCategory = category || CATEGORY_META[0];
    setFormError("");
    setRuleForm({
      mode: "create",
      categoryTitle: targetCategory.title,
      values: {
        ...EMPTY_RULE_FORM,
        ruleCode: generateRuleCode(targetCategory, rules),
        sortOrder: targetCategory.rules.length + 1,
      },
    });
  };

  const openEditForm = (rule) => {
    setFormError("");
    setRuleForm({
      mode: "edit",
      id: rule.id,
      categoryTitle: resolveCategory(rule.ruleCode).title,
      values: {
        ruleCode: rule.ruleCode || "",
        title: rule.title || "",
        description: rule.description || "",
        defaultFineAmount: rule.defaultFineAmount ?? "",
        sortOrder: rule.sortOrder ?? 9999,
      },
    });
  };

  const updateFormValue = (field, value) => {
    setRuleForm((current) =>
      current
        ? { ...current, values: { ...current.values, [field]: value } }
        : current,
    );
  };

  const saveRuleForm = async (event) => {
    event.preventDefault();
    if (!ruleForm) return;
    setFormSaving(true);
    setFormError("");
    try {
      const propertyId = selectedPropertyId || propertyIdParam;
      if (ruleForm.mode === "edit") {
        await updatePropertyRule(propertyId, ruleForm.id, ruleForm.values);
      } else {
        await createPropertyRule(propertyId, ruleForm.values);
      }
      setRuleForm(null);
      await loadRules(propertyId);
    } catch (saveError) {
      setFormError(saveError?.message || "Không lưu được nội quy.");
    } finally {
      setFormSaving(false);
    }
  };

  const handleRuleDragStart = (rule, event) => {
    if (!rule?.id || orderingRuleId) return;
    setDraggingRuleId(rule.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(rule.id));
  };

  const handleRuleDragEnd = () => {
    setDraggingRuleId(null);
  };

  const handleRuleDrop = async (category, targetRule, event) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData("text/plain") || draggingRuleId;
    if (!draggedId || !targetRule?.id || String(draggedId) === String(targetRule.id)) return;

    const currentIndex = category.rules.findIndex((rule) => String(rule.id) === String(draggedId));
    const targetIndex = category.rules.findIndex((rule) => String(rule.id) === String(targetRule.id));
    if (currentIndex < 0 || targetIndex < 0) return;

    const nextRules = [...category.rules];
    const [draggedRule] = nextRules.splice(currentIndex, 1);
    nextRules.splice(targetIndex, 0, draggedRule);

    const orderedRules = nextRules.map((rule, index) => ({
      ...rule,
      sortOrder: index + 1,
    }));
    const changedRules = orderedRules.filter((rule) => {
      const current = category.rules.find((item) => String(item.id) === String(rule.id));
      return current && Number(current.sortOrder) !== rule.sortOrder;
    });
    if (changedRules.length === 0) return;

    const propertyId = selectedPropertyId || propertyIdParam;
    if (!propertyId) return;

    const previousRules = rules;
    setOrderingRuleId(draggedRule.id);
    setRules((current) =>
      current.map((rule) => {
        const nextRule = orderedRules.find((item) => String(item.id) === String(rule.id));
        return nextRule ? { ...rule, sortOrder: nextRule.sortOrder } : rule;
      }),
    );

    try {
      await Promise.all(
        changedRules.map((rule) => updatePropertyRule(propertyId, rule.id, rule)),
      );
      await loadRules(propertyId);
    } catch (orderError) {
      setRules(previousRules);
      window.alert(orderError?.message || "Không cập nhật được thứ tự nội quy.");
    } finally {
      setOrderingRuleId(null);
      setDraggingRuleId(null);
    }
  };

  const handleDeleteRule = async (rule) => {
    if (!rule?.id) return;
    const ok = window.confirm(`Xóa nội quy "${rule.title || rule.ruleCode}"?`);
    if (!ok) return;
    setDeletingRuleId(rule.id);
    try {
      const propertyId = selectedPropertyId || propertyIdParam;
      await deletePropertyRule(propertyId, rule.id);
      await loadRules(propertyId);
    } catch (deleteError) {
      window.alert(deleteError?.message || "Không xóa được nội quy.");
    } finally {
      setDeletingRuleId(null);
    }
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
                onClick={() => setShowViolationDialog(true)}
                disabled={isLoading || !selectedPropertyId || fineRules.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                title={fineRules.length === 0 ? "Chưa có nội quy có mức phạt" : "Ghi nhận vi phạm"}
              >
                <AlertTriangle className="h-4 w-4" />
                Ghi nhận vi phạm
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
            icon={BookOpenText}
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

        {status === "success" ? (
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
              <div className="space-y-3 p-4">
                {dashboardCategories.map((category) => (
                  <DashboardRuleCategoryAccordion
                    key={category.id}
                    category={category}
                    canManage={Boolean(selectedPropertyId || propertyIdParam)}
                    deletingRuleId={deletingRuleId}
                    draggingRuleId={draggingRuleId}
                    orderingRuleId={orderingRuleId}
                    onAdd={openCreateForm}
                    onEdit={openEditForm}
                    onDelete={handleDeleteRule}
                    onDragStart={handleRuleDragStart}
                    onDragEnd={handleRuleDragEnd}
                    onDrop={handleRuleDrop}
                  />
                ))}
              </div>
            </section>

          </>
        ) : null}

        {ruleForm ? (
          <RuleFormModal
            mode={ruleForm.mode}
            categoryTitle={ruleForm.categoryTitle}
            values={ruleForm.values}
            error={formError}
            saving={formSaving}
            onChange={updateFormValue}
            onSubmit={saveRuleForm}
            onClose={() => (formSaving ? null : setRuleForm(null))}
          />
        ) : null}

        <Dialog open={showViolationDialog} onOpenChange={setShowViolationDialog}>
          <DialogContent
            lockScroll={false}
            overlayProps={{
              "aria-hidden": true,
              onClick: () => setShowViolationDialog(false),
              onTouchMove: (event) => event.preventDefault(),
              onWheel: (event) => event.preventDefault(),
            }}
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
          >
            <DialogHeader className="border-b border-[#e2e8f0] px-5 py-4 pr-12 text-left dark:border-white/10">
              <DialogTitle className="text-base font-black text-slate-900 dark:text-white">
                Ghi nhận vi phạm nội quy
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto">
              <RuleViolationRecorder
                key={selectedPropertyId || propertyIdParam || "no-property"}
                propertyId={selectedPropertyId || propertyIdParam}
                propertyName={property?.name || ""}
                rules={fineRules}
                embedded
                showHeader={false}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#0B1C30]">
      <section className="relative min-h-[390px] overflow-hidden bg-[#0B1C30] text-white sm:min-h-[450px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/image_desk.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,28,48,0.88)_0%,rgba(11,28,48,0.48)_58%,rgba(11,28,48,0.28)_100%)]" />
        <div className="relative mx-auto flex min-h-[390px] max-w-[1280px] items-end px-8 pb-12 sm:min-h-[450px] sm:pb-16 lg:px-12">
          <div className="w-full max-w-[760px]">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-amber-300">NỘI QUY HẢI ĐĂNG</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[52px]">
              Quy định sinh hoạt rõ ràng, cuộc sống thoải mái hơn.
            </h1>
            <p className="mt-5 max-w-[680px] text-base leading-relaxed text-white/90 sm:text-lg">
              Cùng giữ Hải Đăng là một nơi ở tiện nghi, an toàn và dễ chịu cho tất cả mọi người.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-white/85">
              <span>{rules.length} nội quy đang áp dụng</span>
              <span className="hidden h-1 w-1 rounded-full bg-amber-300 sm:block" />
              <span>{categories.length} nhóm quy định</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 md:py-20">
        <div className="mx-auto max-w-[1280px] px-8 lg:px-12">
          <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.1em] text-brand-primary">TRA CỨU NỘI QUY</p>
              <h2 className="mt-2 text-2xl font-semibold leading-[1.3] tracking-[0.01em] text-[#0B1C30] md:text-[32px]">
                Các nhóm quy định tại Hải Đăng
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#44474D] sm:text-base">
                Nội dung được sắp xếp theo từng nhóm để bạn dễ đọc và tìm đúng thông tin cần thiết.
              </p>
            </div>
            <div className="w-full sm:w-auto sm:min-w-[240px]">
              {properties.length > 1 ? (
                <label className="grid gap-2 text-sm font-semibold text-[#0B1C30]">
                  Chọn cơ sở
                  <select
                    value={selectedPropertyId}
                    onChange={handlePropertyChange}
                    className="h-11 rounded-xl border border-[#cfd5de] bg-white px-3 text-sm font-semibold text-[#0B1C30] shadow-sm outline-none transition focus:border-[#232946] focus:ring-4 focus:ring-[#232946]/10"
                  >
                    {properties.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : property?.name ? (
                <div className="border-l-2 border-[#D6E3FF] pl-4 text-sm text-[#44474D]">
                  <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-[#7A8494]">Đang xem</span>
                  <span className="mt-1 block font-bold text-[#0B1C30]">{property.name}</span>
                </div>
              ) : null}
            </div>
          </div>

          {status === "loading" && (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-64 animate-pulse rounded-3xl bg-[#F8F9FF]" />
              ))}
            </div>
          )}

          {status === "error" && (
            <div className="rounded-2xl bg-rose-50 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-rose-950">Không tải được nội quy</h2>
                  <p className="mt-1 text-sm text-rose-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {status === "success" && rules.length === 0 && (
            <div className="rounded-3xl bg-[#F8F9FF] p-10 text-center">
              <h2 className="text-xl font-bold text-slate-950">Chưa có nội quy</h2>
              <p className="mt-2 text-sm text-slate-600">Cơ sở này chưa có nội quy đang hoạt động.</p>
            </div>
          )}

          {status === "success" && rules.length > 0 && (
            <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
              <aside className="h-fit rounded-3xl bg-[#F8F9FF] p-4 lg:sticky lg:top-24">
                <p className="px-3 text-xs font-bold uppercase tracking-[0.12em] text-[#7A8494]">Mục lục</p>
                <nav className="mt-3 grid gap-1" aria-label="Nhóm nội quy">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const isActive = category.id === activePublicCategory?.id;

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setActivePublicCategoryId(category.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                          isActive
                            ? "bg-[#232946] text-white shadow-md"
                            : "text-[#0B1C30] hover:bg-white"
                        }`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isActive ? "bg-white/15" : category.iconBox}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-bold">{category.title}</span>
                        <span className={`text-xs font-bold ${isActive ? "text-white/70" : "text-[#7A8494]"}`}>
                          {category.rules.length}
                        </span>
                      </button>
                    );
                  })}
                </nav>
                <div className="mt-4 border-t border-[#dce3ef] px-3 pt-4 text-xs leading-5 text-[#7A8494]">
                  <span className="font-bold text-[#0B1C30]">{rules.length} nội quy</span> đang được áp dụng tại cơ sở này.
                </div>
              </aside>

              {activePublicCategory ? (
                <PublicRuleCategoryPanel category={activePublicCategory} />
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function generateRuleCode(category, rules) {
  const prefix = String(category.codePrefix || "RULE").toUpperCase();
  const pattern = new RegExp(`^${prefix}_(\\d+)$`, "i");
  const nextIndex = rules.reduce((highest, rule) => {
    const match = String(rule.ruleCode || "").match(pattern);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0) + 1;

  return `${prefix}_${String(nextIndex).padStart(3, "0")}`;
}

function RuleFormModal({
  mode,
  categoryTitle = "",
  values,
  error,
  saving,
  onChange,
  onSubmit,
  onClose,
}) {
  const isEdit = mode === "edit";
  return (
    <Dialog open onOpenChange={(open) => (open || saving ? null : onClose())}>
      <DialogContent
        lockScroll={false}
        showCloseButton={false}
        overlayClassName="bg-slate-950/55 supports-backdrop-filter:backdrop-blur-sm"
        overlayProps={{
          "aria-hidden": true,
          onClick: () => (saving ? null : onClose()),
          onTouchMove: (event) => event.preventDefault(),
          onWheel: (event) => event.preventDefault(),
        }}
        className="w-full max-w-2xl gap-0 overflow-hidden rounded-lg border border-[#e2e8f0] bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-[#0f172a] sm:max-w-2xl"
      >
        <form onSubmit={onSubmit}>
          <DialogHeader className="flex-row items-center justify-between gap-3 border-b border-[#e2e8f0] px-5 py-4 text-left dark:border-white/10">
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white">
              {isEdit ? "Sửa nội quy" : "Thêm nội quy"}
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-white/5"
              title="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>
          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
            {categoryTitle ? (
              <div className="rounded-lg border border-[#e2e8f0] bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 sm:col-span-2">
                Nhóm: <span className="text-slate-950 dark:text-white">{categoryTitle}</span>
              </div>
            ) : null}
            <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 sm:col-span-2">
              Tiêu đề
              <input
                value={values.title}
                onChange={(event) => onChange("title", event.target.value)}
                className="h-10 rounded-lg border border-[#cbd5e1] px-3 text-sm outline-none focus:border-[#1e40af] dark:border-white/10 dark:bg-[#111827]"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 sm:col-span-2">
              Nội dung
              <textarea
                rows={4}
                value={values.description}
                onChange={(event) => onChange("description", event.target.value)}
                className="resize-none rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none focus:border-[#1e40af] dark:border-white/10 dark:bg-[#111827]"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
              Mức phạt mặc định
              <VietnameseMoneyInput
                value={values.defaultFineAmount}
                onValueChange={(value) => onChange("defaultFineAmount", value)}
                suffix="VNĐ"
                className="h-10 rounded-lg border border-[#cbd5e1] px-3 text-sm outline-none focus:border-[#1e40af] dark:border-white/10 dark:bg-[#111827]"
              />
            </label>
            {error ? (
              <div className="self-end rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-[#e2e8f0] px-5 py-4 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd5e1] px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1e40af] px-4 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DashboardRuleCategoryAccordion({
  category,
  canManage,
  deletingRuleId,
  draggingRuleId,
  orderingRuleId,
  onAdd,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  onDrop,
}) {
  const Icon = category.icon;

  return (
    <details
      className="group rounded-lg border border-[#e2e8f0] bg-white dark:border-white/10 dark:bg-[#0f172a]"
      open
    >
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
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
        <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700 dark:bg-white/5 dark:text-slate-300">
            {category.badgeLabel || category.title}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onAdd(category);
            }}
            disabled={!canManage}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Thêm
          </button>
          <ChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180 dark:text-slate-400" />
        </div>
      </summary>

      <div className="border-t border-[#e2e8f0] dark:border-white/10">
        {category.rules.length > 0 ? (
          category.rules.map((rule) => (
            <DashboardRuleRow
              key={rule.id || rule.ruleCode}
              rule={rule}
              deleting={deletingRuleId === rule.id}
              dragging={draggingRuleId === rule.id}
              ordering={orderingRuleId === rule.id}
              onEdit={onEdit}
              onDelete={onDelete}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDrop={(targetRule, event) => onDrop(category, targetRule, event)}
            />
          ))
        ) : (
          <p className="px-4 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Chưa có nội quy trong mục này.
          </p>
        )}
      </div>
    </details>
  );
}

function DashboardRuleRow({
  rule,
  deleting,
  dragging,
  ordering,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  onDrop,
}) {
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDrop(rule, event)}
      className={`grid min-h-20 gap-3 border-t border-[#e2e8f0] px-4 py-3 first:border-t-0 dark:border-white/10 md:grid-cols-[36px_minmax(0,1fr)_150px_88px] md:items-center ${
        dragging ? "opacity-50" : ""
      }`}
    >
      <div>
        <span
          draggable={Boolean(rule.id) && !ordering}
          onDragStart={(event) => onDragStart(rule, event)}
          onDragEnd={onDragEnd}
          className="inline-flex h-9 w-9 cursor-grab items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing dark:hover:bg-white/5 dark:hover:text-slate-200"
          title="Kéo để đổi thứ tự"
        >
          {ordering ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GripVertical className="h-4 w-4" />
          )}
        </span>
      </div>
      <div className="min-w-0">
        <p className="font-bold leading-6 text-slate-900 dark:text-white">{rule.title}</p>
        {rule.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {rule.description}
          </p>
        ) : null}
      </div>
      <div className="flex h-9 items-center md:justify-end">
        <span className="inline-flex w-full max-w-[150px] justify-end rounded-lg bg-amber-50 px-3 py-2 text-sm font-black text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
        {Number(rule.defaultFineAmount) > 0 ? formatCurrency(rule.defaultFineAmount) : "-"}
        </span>
      </div>
      <div className="flex h-9 gap-2 md:justify-end">
        <button
          type="button"
          onClick={() => onEdit(rule)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#cbd5e1] text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          title="Sửa"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(rule)}
          disabled={deleting}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/10"
          title="Xóa"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function PublicRuleCategoryPanel({ category }) {
  const Icon = category.icon;

  return (
    <article
      className={`group relative flex min-h-[520px] flex-col overflow-hidden rounded-3xl p-6 transition-all duration-300 xl:p-10 ${category.panel}`}
      style={{ boxShadow: "0px 10px 30px 0px rgba(10, 25, 47, 0.05)" }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${category.iconBox}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#7A8494]">Nhóm quy định</p>
            <h3 className="mt-1 truncate text-2xl font-semibold leading-snug text-[#0B1C30]">{category.title}</h3>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${category.badge}`}>
          {category.rules.length} nội quy
        </span>
      </div>
      <div className="mt-8 flex flex-1 flex-col">
        {category.rules.map((rule, index) => (
          <div
            key={rule.id || rule.ruleCode}
            className={`py-5 first:pt-0 ${index > 0 ? "border-t border-slate-900/10" : ""}`}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#232946]" />
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold leading-6 text-[#0B1C30]">{rule.title}</p>
                {rule.description ? (
                  <p className="mt-2 max-w-3xl text-[15px] leading-7 text-[#44474D]">{rule.description}</p>
                ) : null}
                {isFineRule(rule) ? (
                  <span className="mt-3 inline-flex items-center rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-black text-amber-900 ring-1 ring-amber-200">
                    Mức phạt: {formatCurrency(rule.defaultFineAmount)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
