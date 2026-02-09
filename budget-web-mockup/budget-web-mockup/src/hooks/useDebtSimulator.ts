import { useState, useEffect } from 'react';
import { GoalDisplay } from '@/types';

interface SimulatorState {
  monthlyPayment: number;
  payoffDate: string;
  monthsToPayoff: number;
  totalInterestPaid: number;
  interestSaved: number;
  timeSavedMonths: number;
}

interface PayoffSchedulePoint {
  month: number;
  balance: number;
  interest: number;
  principal: number;
}

export function useDebtSimulator(goal: GoalDisplay) {
  const principal = goal.current || 0;
  const annualRate = goal.interestRate || 0;
  const originalAmount = goal.originalAmount || principal;

  // Calculate minimum payment based on original loan terms
  const calculateMinimumPayment = (): number => {
    // Use the goal's minimumPayment if it exists
    if (goal.minimumPayment && goal.minimumPayment > 0) {
      return goal.minimumPayment;
    }

    // Otherwise calculate from target date
    if (!goal.deadline || principal <= 0) return 0;

    const targetDate = new Date(goal.deadline);
    const today = new Date();
    const monthsRemaining = Math.max(
      1,
      (targetDate.getFullYear() - today.getFullYear()) * 12 +
      (targetDate.getMonth() - today.getMonth())
    );

    const monthlyRate = annualRate / 100 / 12;

    if (monthlyRate === 0) {
      return principal / monthsRemaining;
    }

    return principal * (monthlyRate * Math.pow(1 + monthlyRate, monthsRemaining)) /
           (Math.pow(1 + monthlyRate, monthsRemaining) - 1);
  };

  const minimumPayment = calculateMinimumPayment();
  const currentPayment = goal.autoContribute || minimumPayment || 0;
  const [monthlyPayment, setMonthlyPayment] = useState(currentPayment);

  // Helper to round to cents
  const round = (value: number): number => {
    return Math.round(value * 100) / 100;
  };

  // Calculate payoff schedule
  const calculatePayoffSchedule = (payment: number): PayoffSchedulePoint[] => {
    const monthlyRate = annualRate / 100 / 12;
    let balance = round(principal);
    const schedule: PayoffSchedulePoint[] = [];
    let month = 0;

    // Check if payment is too low to reduce balance (payment <= first month's interest)
    const firstMonthInterest = round(balance * monthlyRate);
    if (payment <= firstMonthInterest) {
      // Return a schedule showing payment is too low
      return [{
        month: 0,
        balance: balance,
        interest: firstMonthInterest,
        principal: 0,
      }];
    }

    // Add month 0 (current balance) so both lines start at the same point
    schedule.push({
      month: 0,
      balance: balance,
      interest: 0,
      principal: 0,
    });

    while (balance > 0 && month < 600) {
      const interestCharge = round(balance * monthlyRate);

      // If payment covers balance + interest, treat as immediate payoff (UX improvement)
      if (payment >= balance + interestCharge) {
        month++;
        schedule.push({
          month: month,
          balance: 0,
          interest: interestCharge,
          principal: balance,
        });
        break; // Paid off this month
      }

      // Handle last payment - don't overshoot
      let actualPayment = payment;
      if (balance + interestCharge < payment) {
        actualPayment = balance + interestCharge;
      }

      const principalPayment = round(actualPayment - interestCharge);

      month++;
      balance = round(balance - principalPayment);

      schedule.push({
        month: month,
        balance: Math.max(0, balance),
        interest: interestCharge,
        principal: principalPayment,
      });

      if (balance <= 0) break;
    }

    return schedule;
  };

  // Calculate simulation results
  const calculateSimulation = (payment: number): SimulatorState => {
    const currentSchedule = calculatePayoffSchedule(payment);
    const minimumSchedule = calculatePayoffSchedule(minimumPayment);

    // Subtract 1 because month 0 is just the starting point, not a payment month
    const monthsToPayoff = currentSchedule.length - 1;
    const totalInterest = currentSchedule.reduce((sum, point) => sum + point.interest, 0);
    const minimumTotalInterest = minimumSchedule.reduce((sum, point) => sum + point.interest, 0);

    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + monthsToPayoff);

    return {
      monthlyPayment: payment,
      payoffDate: payoffDate.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      }),
      monthsToPayoff,
      totalInterestPaid: totalInterest,
      interestSaved: Math.max(0, minimumTotalInterest - totalInterest),
      timeSavedMonths: Math.max(0, (minimumSchedule.length - 1) - (currentSchedule.length - 1)),
    };
  };

  const [simulation, setSimulation] = useState<SimulatorState>(
    calculateSimulation(minimumPayment)
  );

  // Initialize monthly payment when goal changes
  useEffect(() => {
    const initialPayment = goal.autoContribute || minimumPayment;
    if (initialPayment > 0) {
      setMonthlyPayment(initialPayment);
    }
  }, [goal.id]);

  // Recalculate when monthly payment changes
  useEffect(() => {
    const effectivePayment = Math.max(monthlyPayment, minimumPayment || 0);
    setSimulation(calculateSimulation(effectivePayment));
  }, [monthlyPayment, minimumPayment]);

  const updateMonthlyPayment = (amount: number) => {
    const clampedAmount = Math.max(minimumPayment, amount);
    setMonthlyPayment(clampedAmount);
  };

  const reset = () => {
    setMonthlyPayment(minimumPayment);
  };

  // Get schedule for graphing
  const getPayoffSchedule = (payment: number): PayoffSchedulePoint[] => {
    return calculatePayoffSchedule(payment);
  };

  return {
    // Input
    monthlyPayment,
    updateMonthlyPayment,
    minimumPayment,

    // Calculated results
    simulation,
    getPayoffSchedule,

    // Actions
    reset,

    // Metadata
    principal,
    annualRate,
  };
}
