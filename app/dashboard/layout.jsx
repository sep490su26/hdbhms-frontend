import { DashboardLayoutClient } from "./DashboardLayout";

export const metadata = {
  title: "H\u1ec7 th\u1ed1ng qu\u1ea3n l\u00fd",
  description: "Property Management",
};

export default function RootLayout({ children }) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
