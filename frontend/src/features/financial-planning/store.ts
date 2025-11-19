import { create } from "zustand";

export interface ProjectionSettings {
  currentAge: number;
  retirementAge: number;
  projectionYears: number;
  inflationRate: number;
  averageReturnRate: number;
}

interface FinancialPlanningState {
  projectionSettings: ProjectionSettings;
  lastInvalidatedAt: number;
  updateProjectionSettings: (settings: Partial<ProjectionSettings>) => void;
  invalidateFinancialData: () => void;
}

const DEFAULT_PROJECTION_SETTINGS: ProjectionSettings = {
  currentAge: 30,
  retirementAge: 65,
  projectionYears: 35,
  inflationRate: 0.03,
  averageReturnRate: 0.07,
};

export const useFinancialPlanningStore = create<FinancialPlanningState>((set) => ({
  projectionSettings: DEFAULT_PROJECTION_SETTINGS,
  lastInvalidatedAt: Date.now(),
  updateProjectionSettings: (settings) =>
    set((state) => ({
      projectionSettings: { ...state.projectionSettings, ...settings },
    })),
  invalidateFinancialData: () =>
    set({
      lastInvalidatedAt: Date.now(),
    }),
}));
