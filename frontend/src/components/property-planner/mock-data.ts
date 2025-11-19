import { buildMortgageScenario } from "./calculations";

import type {
  MortgageInputs,
  PropertyPlannerInsight,
  PropertyPlannerMilestone,
  PropertyPlannerScenario,
  PropertyPlannerSummary,
  PropertyPlannerTimelinePoint,
} from "@/lib/financial/types";

export type PropertyPlannerType = "hdb" | "condo" | "landed";

const CURRENT_YEAR = new Date().getFullYear();

const DEFAULT_INPUTS: Record<PropertyPlannerType, MortgageInputs> = {
  hdb: {
    loanAmount: 0,
    loanTermYears: 0,
    borrowerType: "single",
    loanStartMonth: "",
    fixedYears: 0,
    fixedRate: 0,
    floatingRate: 0,
    householdIncome: 0,
    otherDebt: 0,
  },
  condo: {
    loanAmount: 0,
    loanTermYears: 0,
    borrowerType: "single",
    loanStartMonth: "",
    fixedYears: 0,
    fixedRate: 0,
    floatingRate: 0,
    householdIncome: 0,
    otherDebt: 0,
  },
  landed: {
    loanAmount: 0,
    loanTermYears: 0,
    borrowerType: "single",
    loanStartMonth: "",
    fixedYears: 0,
    fixedRate: 0,
    floatingRate: 0,
    householdIncome: 0,
    otherDebt: 0,
  },
};

type ScenarioSeed = {
  headline: string;
  subheadline: string;
  lastRefreshed: string;
  summary: PropertyPlannerSummary[];
  timeline: PropertyPlannerTimelinePoint[];
  milestones: PropertyPlannerMilestone[];
  insights: PropertyPlannerInsight[];
  inputs?: MortgageInputs;
};

function buildScenario(
  type: PropertyPlannerType,
  seed: ScenarioSeed
): PropertyPlannerScenario {
  const inputs = seed.inputs ?? DEFAULT_INPUTS[type];
  const { amortization, snapshot } = buildMortgageScenario(inputs);
  return {
    id: "",
    type,
    headline: seed.headline,
    subheadline: seed.subheadline,
    lastRefreshed: seed.lastRefreshed,
    inputs,
    amortization,
    snapshot,
    summary: seed.summary,
    timeline: seed.timeline,
    milestones: seed.milestones,
    insights: seed.insights,
    updatedAt: new Date().toISOString(),
  };
}

export const PROPERTY_TYPES: Array<{
  id: PropertyPlannerType;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: "hdb",
    label: "HDB (BTO / Resale)",
    description: "Grants, MSR/TDSR guardrails, CPF-heavy funding",
    icon: "🏢",
  },
  {
    id: "condo",
    label: "Condo",
    description: "Private loan flexibility, ABSD/LTV tiers",
    icon: "🏙️",
  },
  {
    id: "landed",
    label: "Landed",
    description: "Land/reno reserves, staggered cash calls",
    icon: "🏡",
  },
];

export const PROPERTY_PLANNER_MOCKS: Record<
  PropertyPlannerType,
  PropertyPlannerScenario
> = {
  hdb: buildScenario("hdb", {
    headline: "4-Room BTO in Tampines North",
    subheadline: "Ballot in 2025, key collection projected for mid-2028",
    lastRefreshed: "Sample data synced 2 days ago",
    summary: [
      {
        id: "cash",
        label: "Cash Buffer Needed",
        value: 58_000,
        helper: "5% minimum cash + legal/renovation buffer",
        emphasis: "Includes S$12K reno reserve",
      },
      {
        id: "loan",
        label: "HDB Loan Amount",
        value: 480_000,
        helper: "25-year tenure at 2.6%",
      },
      {
        id: "grant",
        label: "BTO Grant Stack",
        value: 85_000,
        helper: "EHG + PHG + Flexi grant combo",
      },
      {
        id: "cashflow",
        label: "Monthly Cashflow Impact",
        value: 1_750,
        helper: "Mortgage + conservancy after CPF",
      },
    ],
    timeline: [
      {
        id: "t0",
        year: CURRENT_YEAR,
        label: "Ballot",
        cashOutlay: 10_000,
        cpfUsage: 0,
        loanBalance: 0,
        valuation: 0,
      },
      {
        id: "t1",
        year: CURRENT_YEAR + 1,
        label: "Agreement for Lease",
        cashOutlay: 15_000,
        cpfUsage: 20_000,
        loanBalance: 0,
        valuation: 0,
      },
      {
        id: "t2",
        year: CURRENT_YEAR + 3,
        label: "Key Collection",
        cashOutlay: 33_000,
        cpfUsage: 60_000,
        loanBalance: 480_000,
        valuation: 520_000,
      },
      {
        id: "t3",
        year: CURRENT_YEAR + 5,
        label: "MOP Midpoint",
        cashOutlay: 8_000,
        cpfUsage: 12_000,
        loanBalance: 410_000,
        valuation: 600_000,
      },
    ],
    milestones: [
      {
        id: "m0",
        title: "Ballot submission",
        description: "Submit BTO ballot with 2-room flexi grant declaration",
        timeframe: `Q3 ${CURRENT_YEAR}`,
        tone: "info",
      },
      {
        id: "m1",
        title: "Key collection buffer",
        description: "Ensure S$30K cash buffer ahead of key collection (2028)",
        timeframe: `Q2 ${CURRENT_YEAR + 3}`,
        tone: "warning",
      },
      {
        id: "m2",
        title: "CPF replenishment",
        description: "Top-up OA by S$12K/year to stay on track for retirement",
        timeframe: "Annual",
        tone: "success",
      },
    ],
    insights: [
      {
        id: "i0",
        title: "MSR remains safe",
        detail: "Projected mortgage is 26% of income, below the 30% MSR limit.",
        tone: "info",
      },
      {
        id: "i1",
        title: "CPF dip in 2028",
        detail:
          "OA balance drops to S$8K at key collection. Recommend replenishing within 18 months.",
        tone: "warning",
      },
    ],
  }),
  condo: buildScenario("condo", {
    headline: "2-Bedroom Condo in Queenstown",
    subheadline: "Immediate resale purchase with bank loan structure",
    lastRefreshed: "Scenario synced yesterday",
    summary: [
      {
        id: "cash",
        label: "Cash Buffer Needed",
        value: 120_000,
        helper: "25% down payment + taxes + reno buffer",
      },
      {
        id: "loan",
        label: "Bank Loan Amount",
        value: 1_050_000,
        helper: "30-year tenure at blended 3.4%",
      },
      {
        id: "stamp",
        label: "Buyer Stamp Duty",
        value: 52_600,
        helper: "ABSD exempt (owner-occupied)",
      },
      {
        id: "cashflow",
        label: "Monthly Cashflow Impact",
        value: 5_800,
        helper: "Mortgage + fees after rental offset",
      },
    ],
    timeline: [
      {
        id: "t0",
        year: CURRENT_YEAR,
        label: "Offer Accepted",
        cashOutlay: 40_000,
        cpfUsage: 60_000,
        loanBalance: 0,
        valuation: 0,
      },
      {
        id: "t1",
        year: CURRENT_YEAR,
        label: "Completion",
        cashOutlay: 80_000,
        cpfUsage: 120_000,
        loanBalance: 1_050_000,
        valuation: 1_200_000,
      },
      {
        id: "t2",
        year: CURRENT_YEAR + 5,
        label: "Stabilised Rental Yield",
        cashOutlay: 20_000,
        cpfUsage: 24_000,
        loanBalance: 920_000,
        valuation: 1_320_000,
      },
      {
        id: "t3",
        year: CURRENT_YEAR + 10,
        label: "Year 10 Projection",
        cashOutlay: 24_000,
        cpfUsage: 24_000,
        loanBalance: 770_000,
        valuation: 1_460_000,
      },
    ],
    milestones: [
      {
        id: "m3",
        title: "ABSD remission filing",
        description: "Submit within 2 weeks of completion to recover 20%",
        timeframe: "Within 14 days of completion",
        tone: "warning",
      },
      {
        id: "m4",
        title: "Rental onboarding",
        description: "Line up tenant search 2 months before TOP",
        timeframe: "Q4 " + CURRENT_YEAR,
        tone: "info",
      },
    ],
    insights: [
      {
        id: "i2",
        title: "Rental offsets 60% of mortgage",
        detail:
          "Projected rental covers majority of mortgage. Maintain 3-month vacancy buffer.",
        tone: "info",
      },
      {
        id: "i3",
        title: "Cash call in year 3",
        detail: "Condo repainting and MCST fund top-ups require S$18K cash.",
        tone: "warning",
      },
    ],
  }),
  landed: buildScenario("landed", {
    headline: "Corner Terrace in Serangoon",
    subheadline: "10-year plan with reno and equity buffer",
    lastRefreshed: "Scenario refreshed last week",
    summary: [
      {
        id: "cash",
        label: "Cash Buffer Needed",
        value: 310_000,
        helper: "40% down payment + stamp duties + reno",
      },
      {
        id: "loan",
        label: "Bank Loan Amount",
        value: 1_900_000,
        helper: "25-year tenure at blended 3.6%",
      },
      {
        id: "equity",
        label: "Equity Release Buffer",
        value: 250_000,
        helper: "Available via refinancing from year 5",
      },
      {
        id: "cashflow",
        label: "Monthly Cashflow Impact",
        value: 7_200,
        helper: "Mortgage + maintenance",
      },
    ],
    timeline: [
      {
        id: "t0",
        year: CURRENT_YEAR,
        label: "Offer & Option",
        cashOutlay: 150_000,
        cpfUsage: 60_000,
        loanBalance: 0,
        valuation: 0,
      },
      {
        id: "t1",
        year: CURRENT_YEAR,
        label: "Completion",
        cashOutlay: 160_000,
        cpfUsage: 200_000,
        loanBalance: 1_900_000,
        valuation: 2_200_000,
      },
      {
        id: "t2",
        year: CURRENT_YEAR + 3,
        label: "Reno & Equity Buffer",
        cashOutlay: 80_000,
        cpfUsage: 0,
        loanBalance: 1_820_000,
        valuation: 2_360_000,
      },
      {
        id: "t3",
        year: CURRENT_YEAR + 10,
        label: "Year 10 Outlook",
        cashOutlay: 60_000,
        cpfUsage: 0,
        loanBalance: 1_350_000,
        valuation: 2_800_000,
      },
    ],
    milestones: [
      {
        id: "m5",
        title: "Reno phase",
        description: "Allocate S$120K reno budget with 15% contingency",
        timeframe: "Months 1-6 post-completion",
        tone: "warning",
      },
      {
        id: "m6",
        title: "Equity buffer",
        description: "Prep refinancing paperwork by year 5 for equity draw",
        timeframe: `Year ${CURRENT_YEAR + 5}`,
        tone: "info",
      },
    ],
    insights: [
      {
        id: "i4",
        title: "Equity unlock available",
        detail:
          "Projected valuation allows S$250K equity release while staying under 75% LTV.",
        tone: "info",
      },
      {
        id: "i5",
        title: "Maintenance buffer",
        detail: "Set aside S$12K/year for upkeep. Adjust cashflow accordingly.",
        tone: "warning",
      },
    ],
  }),
};
