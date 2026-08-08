import { API_BASE_URL, authenticatedFetch } from "@/services/identityAccessService";

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value, fallback = "") {
  return value === null || value === undefined ? fallback : String(value);
}

function normalizeRevenuePoint(item = {}) {
  return {
    period: textValue(item.period),
    label: textValue(item.label),
    amount: numberValue(item.amount),
    percentOfPeak: numberValue(item.percentOfPeak ?? item.percent_of_peak),
  };
}

function normalizeRecentActivity(item = {}) {
  return {
    id: item.id ?? item.activityId ?? item.activity_id ?? null,
    type: textValue(item.type),
    title: textValue(item.title),
    time: textValue(item.time),
    tone: textValue(item.tone, "info"),
    occurredAt: item.occurredAt ?? item.occurred_at ?? null,
  };
}

function normalizeExpiringTenant(item = {}) {
  return {
    fullName: textValue(item.fullName ?? item.full_name),
    initials: textValue(item.initials, "?"),
    roomName: textValue(item.roomName ?? item.room_name),
    endDate: item.endDate ?? item.end_date ?? null,
  };
}

export async function getDashboardOverview() {
  const data = await authenticatedFetch(`${API_BASE_URL}/dashboard`, {
    method: "GET",
  });
  const utilityUsage = data?.utilityUsage ?? data?.utility_usage ?? {};
  const expiringContractSummary =
    data?.expiringContractSummary ?? data?.expiring_contract_summary ?? {};
  const actionSummary = data?.actionSummary ?? data?.action_summary ?? {};

  return {
    totalRoomCount: numberValue(data?.totalRoomCount ?? data?.total_room_count),
    totalOccupiedRoomCount: numberValue(
      data?.totalOccupiedRoomCount ?? data?.total_occupied_room_count,
    ),
    totalVacantRoomCount: numberValue(
      data?.totalVacantRoomCount ?? data?.total_vacant_room_count,
    ),
    floorEfficiencies: Array.isArray(data?.floorEfficiencies)
      ? data.floorEfficiencies.map((floor) => ({
          propertyId: floor.propertyId ?? floor.property_id ?? null,
          propertyName: floor.propertyName ?? floor.property_name ?? "",
          floorId: floor.floorId ?? floor.floor_id ?? null,
          floorName: floor.floorName ?? floor.floor_name ?? "",
          roomCount: numberValue(floor.roomCount ?? floor.room_count),
          vacantRoomCount: numberValue(
            floor.vacantRoomCount ?? floor.vacant_room_count,
          ),
        }))
      : [],
    currentMonthRevenue: numberValue(
      data?.currentMonthRevenue ?? data?.current_month_revenue,
    ),
    previousMonthRevenue: numberValue(
      data?.previousMonthRevenue ?? data?.previous_month_revenue,
    ),
    revenueGrowthPercent: numberValue(
      data?.revenueGrowthPercent ?? data?.revenue_growth_percent,
    ),
    revenueSeries: Array.isArray(data?.revenueSeries ?? data?.revenue_series)
      ? (data?.revenueSeries ?? data?.revenue_series).map(normalizeRevenuePoint)
      : [],
    totalDebtAmount: numberValue(data?.totalDebtAmount ?? data?.total_debt_amount),
    debtWarningRoomCount: numberValue(
      data?.debtWarningRoomCount ?? data?.debt_warning_room_count,
    ),
    utilityUsage: {
      period: textValue(utilityUsage.period),
      electricityUsage: numberValue(
        utilityUsage.electricityUsage ?? utilityUsage.electricity_usage,
      ),
      waterUsage: numberValue(utilityUsage.waterUsage ?? utilityUsage.water_usage),
    },
    expiringContractSummary: {
      count: numberValue(expiringContractSummary.count),
      tenants: Array.isArray(expiringContractSummary.tenants)
        ? expiringContractSummary.tenants.map(normalizeExpiringTenant)
        : [],
    },
    actionSummary: {
      viewingPendingCount: numberValue(
        actionSummary.viewingPendingCount ?? actionSummary.viewing_pending_count,
      ),
      maintenancePendingCount: numberValue(
        actionSummary.maintenancePendingCount ?? actionSummary.maintenance_pending_count,
      ),
      billingPeriod: textValue(
        actionSummary.billingPeriod ?? actionSummary.billing_period,
      ),
      billingPaidRoomCount: numberValue(
        actionSummary.billingPaidRoomCount ?? actionSummary.billing_paid_room_count,
      ),
      billingTotalRoomCount: numberValue(
        actionSummary.billingTotalRoomCount ?? actionSummary.billing_total_room_count,
      ),
      expiringContractCount: numberValue(
        actionSummary.expiringContractCount ?? actionSummary.expiring_contract_count,
      ),
    },
    recentActivities: Array.isArray(data?.recentActivities ?? data?.recent_activities)
      ? (data?.recentActivities ?? data?.recent_activities).map(normalizeRecentActivity)
      : [],
  };
}

export const roles = [
  {
    id: "owner",
    label: "Chủ trọ",
    description: "Theo dõi và quản lý toàn bộ hoạt động hệ thống.",
  },
  {
    id: "manager",
    label: "Quản lý",
    description: "Quản lý phòng, khách thuê, hợp đồng và bảo trì.",
  },
  {
    id: "accountant",
    label: "Kế toán",
    description: "Theo dõi nghiệp vụ thu chi và báo cáo tài chính.",
  },
];
