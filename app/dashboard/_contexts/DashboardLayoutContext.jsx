"use client";

import { createContext, useContext } from "react";

const DashboardLayoutContext = createContext(null);

export function DashboardLayoutProvider({ value, children }) {
  return (
    <DashboardLayoutContext.Provider value={value}>
      {children}
    </DashboardLayoutContext.Provider>
  );
}

export function useDashboardLayout() {
  const context = useContext(DashboardLayoutContext);

  if (!context) {
    throw new Error("useDashboardLayout must be used within DashboardLayoutProvider");
  }

  return context;
}
