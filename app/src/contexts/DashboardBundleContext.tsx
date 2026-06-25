import { createContext, useContext, type ReactNode } from "react";
import { useDashboardBundle } from "../hooks/useDashboardBundle";

type DashboardBundleValue = ReturnType<typeof useDashboardBundle>;

const DashboardBundleContext = createContext<DashboardBundleValue | null>(null);

export function DashboardBundleProvider({ children }: { children: ReactNode }) {
  const bundle = useDashboardBundle();
  return (
    <DashboardBundleContext.Provider value={bundle}>
      {children}
    </DashboardBundleContext.Provider>
  );
}

export function useDashboardBundleContext() {
  return useContext(DashboardBundleContext);
}
