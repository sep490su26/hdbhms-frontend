import RulesClient from "../../rules/RulesClient";

export const metadata = {
  title: "Quản lý nội quy | Hệ thống quản lý",
  description: "Quản lý nội quy theo từng cơ sở.",
};

export default function DashboardRulesPage() {
  return <RulesClient variant="dashboard" />;
}
