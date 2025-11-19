import { financialClient } from "@/lib/financial/client";
import type { Expense, IncomeCreatePayload } from "@/lib/financial/types";
import {
  CPF_EMPLOYEE_CONTRIBUTION_CATEGORY,
  CPF_EMPLOYEE_CONTRIBUTION_SOURCE,
  CPF_EMPLOYER_CONTRIBUTION_CATEGORY,
  CPF_EMPLOYER_CONTRIBUTION_SOURCE,
  isCPFEmployeeContributionName,
  isCPFEmployerContributionName,
} from "./constants";
import { calculateCPFContribution, getCPFContributionDescription } from "./calculator";

interface CPFAutoContributionParams {
  monthlySalary: number;
  age?: number;
  userAge?: number;
}

export async function createCPFContributions({
  monthlySalary,
  age = 32,
}: CPFAutoContributionParams) {
  const cpfCalculation = calculateCPFContribution(monthlySalary, age);
  const description = getCPFContributionDescription(monthlySalary, age);

  const employerContribution: IncomeCreatePayload = {
    source: CPF_EMPLOYER_CONTRIBUTION_SOURCE,
    amount: cpfCalculation.employerAmount,
    frequency: "monthly",
    startDate: new Date().toISOString(),
    category: CPF_EMPLOYER_CONTRIBUTION_CATEGORY,
    notes: description,
  };

  const employeeContribution: IncomeCreatePayload = {
    source: CPF_EMPLOYEE_CONTRIBUTION_SOURCE,
    amount: cpfCalculation.employeeAmount,
    frequency: "monthly",
    startDate: new Date().toISOString(),
    category: CPF_EMPLOYEE_CONTRIBUTION_CATEGORY,
    notes: description,
  };

  try {
    const [employerResult, employeeResult] = await Promise.all([
      financialClient.incomes.create(employerContribution),
      financialClient.incomes.create(employeeContribution),
    ]);

    return {
      employerContribution: employerResult,
      employeeContribution: employeeResult,
      calculation: cpfCalculation,
    };
  } catch (error) {
    console.error("Failed to create CPF contributions:", error);
    throw error;
  }
}

export async function checkExistingCPFContributions(): Promise<boolean> {
  try {
    const incomes = await financialClient.incomes.list();

    const hasCPFEmployerIncome = incomes.some((income) =>
      isCPFEmployerContributionName(income.source)
    );

    const hasCPFEmployeeIncome = incomes.some((income) =>
      isCPFEmployeeContributionName(income.source)
    );

    return hasCPFEmployerIncome && hasCPFEmployeeIncome;
  } catch (error) {
    console.error("Failed to check existing CPF contributions:", error);
    return false;
  }
}

export async function updateCPFContributions(
  newMonthlySalary: number,
  age: number = 32
) {
  try {
    const [incomes, expenses] = await Promise.all([
      financialClient.incomes.list(),
      financialClient.expenses.list(),
    ]);

    const cpfCalculation = calculateCPFContribution(newMonthlySalary, age);
    const description = getCPFContributionDescription(newMonthlySalary, age);

    const cpfIncome = incomes.find((income) =>
      isCPFEmployerContributionName(income.source)
    );

    const cpfEmployeeIncome = incomes.find((income) =>
      isCPFEmployeeContributionName(income.source)
    );

    const updatePromises = [] as Array<Promise<unknown>>;

    if (cpfIncome) {
      updatePromises.push(
        financialClient.incomes.update({
          id: cpfIncome.id,
          source: CPF_EMPLOYER_CONTRIBUTION_SOURCE,
          amount: cpfCalculation.employerAmount,
          frequency: "monthly",
          startDate: cpfIncome.startDate,
          category: CPF_EMPLOYER_CONTRIBUTION_CATEGORY,
          notes: description,
        })
      );
    } else {
      updatePromises.push(
        financialClient.incomes.create({
          source: CPF_EMPLOYER_CONTRIBUTION_SOURCE,
          amount: cpfCalculation.employerAmount,
          frequency: "monthly",
          startDate: new Date().toISOString(),
          category: CPF_EMPLOYER_CONTRIBUTION_CATEGORY,
          notes: description,
        })
      );
    }

    if (cpfEmployeeIncome) {
      updatePromises.push(
        financialClient.incomes.update({
          id: cpfEmployeeIncome.id,
          source: CPF_EMPLOYEE_CONTRIBUTION_SOURCE,
          amount: cpfCalculation.employeeAmount,
          frequency: "monthly",
          startDate: cpfEmployeeIncome.startDate,
          category: CPF_EMPLOYEE_CONTRIBUTION_CATEGORY,
          notes: description,
        })
      );
    } else {
      updatePromises.push(
        financialClient.incomes.create({
          source: CPF_EMPLOYEE_CONTRIBUTION_SOURCE,
          amount: cpfCalculation.employeeAmount,
          frequency: "monthly",
          startDate: new Date().toISOString(),
          category: CPF_EMPLOYEE_CONTRIBUTION_CATEGORY,
          notes: description,
        })
      );
    }

    const legacyExpenses = expenses.filter((expense: Expense) =>
      isCPFEmployeeContributionName(expense.payee)
    );
    for (const legacy of legacyExpenses) {
      updatePromises.push(financialClient.expenses.delete(legacy.id));
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    return cpfCalculation;
  } catch (error) {
    console.error("Failed to update CPF contributions:", error);
    throw error;
  }
}
