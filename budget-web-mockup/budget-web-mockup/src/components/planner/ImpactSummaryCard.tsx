'use client';

import {useMemo} from 'react';
import {CheckCircle2, AlertTriangle, Info, Sparkles} from 'lucide-react';
import {ForecastResult, Plan, PlanInsight, InsightSeverity} from '@/types';

interface ImpactSummaryCardProps {
  forecast?: ForecastResult;
  activePlans: Plan[];
  currency?: string;
}

const SEVERITY_ICON: Record<InsightSeverity, typeof CheckCircle2> = {
  positive: CheckCircle2,
  warning: AlertTriangle,
  neutral: Info,
};

const SEVERITY_COLOR: Record<InsightSeverity, string> = {
  positive: 'text-emerald-600',
  warning: 'text-amber-600',
  neutral: 'text-gray-500',
};

function InsightRow({insight}: {insight: PlanInsight}) {
  const Icon = SEVERITY_ICON[insight.severity];
  return (
    <li className="flex items-start gap-2 text-sm text-gray-700">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${SEVERITY_COLOR[insight.severity]}`} />
      <span>{insight.message}</span>
    </li>
  );
}

export default function ImpactSummaryCard({
  forecast,
  activePlans,
}: ImpactSummaryCardProps) {
  const insightsByPlan = useMemo(() => {
    const map = new Map<string, PlanInsight[]>();
    for (const insight of forecast?.insights || []) {
      const bucket = map.get(insight.planId) ?? [];
      bucket.push(insight);
      map.set(insight.planId, bucket);
    }
    return map;
  }, [forecast]);

  if (activePlans.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 text-gray-500">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm">
            No what-if plans yet. Add one to see how it changes your cash flow.
          </span>
        </div>
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="h-32 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
    );
  }

  const scenarioInsights = insightsByPlan.get('') || [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-medium text-gray-500">Plan Impact</h2>

      <div className="space-y-4">
        {activePlans.map((plan) => {
          const planInsights = insightsByPlan.get(plan.id) || [];
          return (
            <div key={plan.id}>
              <p className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-900">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    plan.status === 'DRAFT' ? 'border border-indigo-300 bg-white' : 'bg-indigo-500'
                  }`}
                />
                {plan.description || plan.type}
              </p>
              {planInsights.length > 0 ? (
                <ul className="space-y-1 pl-3.5">
                  {planInsights.map((insight, i) => (
                    <InsightRow key={i} insight={insight} />
                  ))}
                </ul>
              ) : (
                <p className="pl-3.5 text-sm text-gray-400">
                  No notable schedule effects from this change.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {scenarioInsights.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-gray-100 pt-3">
          {scenarioInsights.map((insight, i) => (
            <InsightRow key={i} insight={insight} />
          ))}
        </ul>
      )}
    </div>
  );
}
