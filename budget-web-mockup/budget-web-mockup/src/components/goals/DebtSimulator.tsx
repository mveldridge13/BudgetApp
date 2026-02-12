'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { GoalDisplay } from '@/types';
import { useDebtSimulator } from '@/hooks/useDebtSimulator';

interface DebtSimulatorProps {
  goal: GoalDisplay;
  visible: boolean;
  onClose: () => void;
}

export default function DebtSimulator({
  goal,
  visible,
  onClose,
}: DebtSimulatorProps) {
  const {
    monthlyPayment,
    updateMonthlyPayment,
    minimumPayment,
    simulation,
    getPayoffSchedule,
    principal,
  } = useDebtSimulator(goal);

  // Local state for input to allow empty string while typing
  const [inputValue, setInputValue] = useState('');

  // Don't auto-sync - let user control the input
  useEffect(() => {
    // Only reset when goal changes
    setInputValue('');
  }, [goal.id]);

  // Lock body scroll when modal is visible
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ backgroundColor: '#6366f1' }}>
          <div>
            <h2 className="text-xl font-semibold text-white">{goal.title}</h2>
            <p className="text-sm text-blue-100 mt-0.5">Adjust your payment to see how fast you can clear this debt</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 overscroll-contain">
          <div className="space-y-6">
            {/* Current Debt Info */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Current Balance</p>
                  <p className="text-lg font-semibold text-gray-900">${principal.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Interest Rate</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {goal.interestRate ? `${goal.interestRate.toFixed(2)}%` : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Minimum Payment</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {minimumPayment > 0 ? `$${minimumPayment.toFixed(2)}` : 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            {/* Monthly Payment Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Payment
              </label>
              <div className="relative max-w-xs">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg pointer-events-none">
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={inputValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty or valid number input
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setInputValue(value);
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue > 0) {
                        updateMonthlyPayment(numValue);
                      }
                    }
                  }}
                  onBlur={() => {
                    // On blur, if empty or invalid, don't default to minimum
                    const numValue = parseFloat(inputValue);
                    if (isNaN(numValue) || inputValue === '') {
                      setInputValue('');
                    }
                  }}
                  placeholder={minimumPayment > 0 ? minimumPayment.toFixed(2) : '0.00'}
                  className="w-full pl-10 pr-4 py-2.5 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                Minimum payment: ${minimumPayment.toFixed(2)}
              </p>
              {monthlyPayment > 0 && (() => {
                const testSchedule = getPayoffSchedule(monthlyPayment);
                if (testSchedule.length === 1) {
                  return (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      ⚠️ Payment too low - must be at least ${(testSchedule[0].interest + 0.01).toFixed(2)} to reduce balance
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            {/* Payoff Timeline Graph */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Payoff Timeline</h3>
                {/* Legend */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-0.5 bg-indigo-500"></div>
                    <span className="text-gray-600">Current Track</span>
                  </div>
                  {monthlyPayment > 0 && Math.abs(monthlyPayment - minimumPayment) > 0.01 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-0.5 bg-green-500" style={{ borderTop: '2px dashed #10b981', background: 'none' }}></div>
                      <span className="text-gray-600">Simulation</span>
                    </div>
                  )}
                </div>
              </div>
              {monthlyPayment > 0 && simulation.monthsToPayoff > 0 && simulation.monthsToPayoff < 600 ? (
                <>
                  {/* Graph */}
                  <div className="bg-white rounded-lg p-4 mb-4">
                    {(() => {
                      const minimumSchedule = getPayoffSchedule(minimumPayment);
                      const simulationSchedule = monthlyPayment > 0 ? getPayoffSchedule(monthlyPayment) : null;

                      // Check if payment is too low (schedule only has month 0)
                      const minimumTooLow = minimumSchedule.length === 1;
                      const simulationTooLow = simulationSchedule && simulationSchedule.length === 1;

                      // If minimum payment is too low, show error
                      if (minimumTooLow) {
                        const requiredMinimum = minimumSchedule[0].interest + 0.01;
                        return (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                            <p className="text-sm font-medium text-red-900 mb-2">Payment Too Low</p>
                            <p className="text-xs text-red-700">
                              The minimum payment (${minimumPayment.toFixed(2)}) is less than the monthly interest charge (${minimumSchedule[0].interest.toFixed(2)}).
                              The balance will never decrease. Minimum required: ${requiredMinimum.toFixed(2)}
                            </p>
                          </div>
                        );
                      }

                      const maxBalance = principal;
                      const maxMonths = Math.max(
                        minimumSchedule.length,
                        simulationSchedule?.length || 0
                      );

                      const chartWidth = 600;
                      const chartHeight = 200;
                      const padding = { top: 20, right: 40, bottom: 30, left: 60 };
                      const graphWidth = chartWidth - padding.left - padding.right;
                      const graphHeight = chartHeight - padding.top - padding.bottom;

                      // Check if user has entered a simulation payment
                      const hasSimulation = simulationSchedule && Math.abs(monthlyPayment - minimumPayment) > 0.01;

                      // Helper to create path from schedule
                      const createPath = (schedule: typeof minimumSchedule) => {
                        const sampleRate = Math.max(1, Math.ceil(schedule.length / 24));
                        const sampledSchedule = schedule.filter((_, i) => i % sampleRate === 0 || i === schedule.length - 1);

                        const points = sampledSchedule.map((point) => {
                          const x = padding.left + (point.month / maxMonths) * graphWidth;
                          const y = padding.top + ((maxBalance - point.balance) / maxBalance) * graphHeight;
                          return { x, y };
                        });

                        const pathD = points.map((p, i) =>
                          `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
                        ).join(' ');

                        return { pathD, points };
                      };

                      const minimumPath = createPath(minimumSchedule);
                      const simulationPath = simulationSchedule ? createPath(simulationSchedule) : null;

                      // Area fill path - use simulation if exists, otherwise minimum
                      const primaryPath = simulationPath || minimumPath;
                      const areaD = `${primaryPath.pathD} L ${primaryPath.points[primaryPath.points.length - 1].x} ${chartHeight - padding.bottom} L ${padding.left} ${chartHeight - padding.bottom} Z`;

                      return (
                        <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
                          {/* Grid lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                            <g key={ratio}>
                              <line
                                x1={padding.left}
                                y1={padding.top + ratio * graphHeight}
                                x2={chartWidth - padding.right}
                                y2={padding.top + ratio * graphHeight}
                                stroke={ratio === 1 ? "#d1d5db" : "#e5e7eb"}
                                strokeWidth={ratio === 1 ? "1.5" : "1"}
                                strokeDasharray={ratio === 1 ? "0" : "4 4"}
                                opacity={ratio === 1 ? "1" : "0.6"}
                              />
                              <text
                                x={padding.left - 10}
                                y={padding.top + ratio * graphHeight + 4}
                                textAnchor="end"
                                fontSize="11"
                                fill="#6b7280"
                                fontWeight={ratio === 1 ? "600" : "400"}
                              >
                                ${((1 - ratio) * maxBalance).toFixed(0)}
                              </text>
                            </g>
                          ))}

                          {/* Gradient definition */}
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor={hasSimulation ? "#10b981" : "#6366f1"} stopOpacity="0.3" />
                              <stop offset="100%" stopColor={hasSimulation ? "#10b981" : "#6366f1"} stopOpacity="0.05" />
                            </linearGradient>
                          </defs>

                          {/* Area under primary curve */}
                          <path
                            d={areaD}
                            fill="url(#gradient)"
                            opacity="0.4"
                          />

                          {/* Minimum payment line (blue solid) */}
                          <path
                            d={minimumPath.pathD}
                            fill="none"
                            stroke="#6366f1"
                            strokeWidth={hasSimulation ? "2.5" : "3"}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={hasSimulation ? "0.7" : "1"}
                          />

                          {/* Simulation line (green dotted) - only show if user entered a payment */}
                          {simulationPath && hasSimulation && (
                            <path
                              d={simulationPath.pathD}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="3"
                              strokeDasharray="6 4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}

                          {/* X-axis labels */}
                          {(() => {
                            const formatDate = (date: Date) => {
                              return date.toLocaleDateString('en-US', {
                                month: 'short',
                                year: '2-digit'
                              });
                            };

                            // Use maxMonths - 1 for X-axis (subtract 1 because month 0 is just the starting point)
                            const actualMaxMonths = maxMonths - 1;

                            // Determine how many labels to show (max 6)
                            const maxLabels = 6;
                            const labelInterval = Math.max(1, Math.ceil(actualMaxMonths / (maxLabels - 1)));
                            const labels = [];

                            for (let i = 0; i <= actualMaxMonths; i += labelInterval) {
                              const date = new Date();
                              date.setMonth(date.getMonth() + i);
                              const x = padding.left + (i / actualMaxMonths) * graphWidth;
                              labels.push({ x, date, month: i });
                            }

                            // Always include the final month if not already included
                            if (labels[labels.length - 1].month !== actualMaxMonths) {
                              const finalDate = new Date();
                              finalDate.setMonth(finalDate.getMonth() + actualMaxMonths);
                              labels.push({
                                x: chartWidth - padding.right,
                                date: finalDate,
                                month: actualMaxMonths
                              });
                            }

                            return (
                              <>
                                {labels.map((label, i) => (
                                  <text
                                    key={i}
                                    x={label.x}
                                    y={chartHeight - 10}
                                    textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}
                                    fontSize="11"
                                    fill="#6b7280"
                                  >
                                    {formatDate(label.date)}
                                  </text>
                                ))}
                              </>
                            );
                          })()}
                        </svg>
                      );
                    })()}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/60 backdrop-blur rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Payoff Date</p>
                      <p className="text-sm font-semibold text-gray-900">{simulation.payoffDate}</p>
                    </div>
                    <div className="bg-white/60 backdrop-blur rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Time to Payoff</p>
                      <p className="text-sm font-semibold text-gray-900">{simulation.monthsToPayoff} months</p>
                    </div>
                    <div className="bg-white/60 backdrop-blur rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Total Interest</p>
                      <p className="text-sm font-semibold text-gray-900">${simulation.totalInterestPaid.toFixed(2)}</p>
                    </div>
                    {simulation.interestSaved > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-xs text-green-700 mb-1">You Save</p>
                        <p className="text-sm font-semibold text-green-900">
                          ${simulation.interestSaved.toFixed(2)} • {simulation.timeSavedMonths}mo
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-lg p-8 text-center">
                  <p className="text-sm text-gray-500">
                    Enter a monthly payment amount to see your payoff timeline
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg font-medium text-white"
            style={{ backgroundColor: '#6366f1' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
