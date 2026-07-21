'use client';

import {useMemo} from 'react';
import {CheckCircle2, AlertTriangle, Info, Sparkles} from 'lucide-react';
import {ForecastResult, Plan, PlanInsight, InsightSeverity} from '@/types';

interface ImpactSummaryCardProps {
  forecast?: ForecastResult;
  activePlans: Plan[];
  currency?: string;
  // Live, client-computed insights for whichever plan is currently being
  // dragged on the chart - shown in addition to (not replacing) that plan's
  // committed insights, since the drag hasn't been saved yet.
  livePreview?: {planId: string; insights: PlanInsight[]} | null;
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

// Same boxed treatment as the live drag-preview callout - warning-severity
// insights (risk of some kind) get called out visually instead of blending
// into the plain bullet list, whether they're a committed or a preview
// insight.
function InsightGroup({insights}: {insights: PlanInsight[]}) {
  const warnings = insights.filter((i) => i.severity === 'warning');
  const others = insights.filter((i) => i.severity !== 'warning');
  return (
    <>
      {others.length > 0 && (
        <ul className="space-y-1">
          {others.map((insight, i) => (
            <InsightRow key={i} insight={insight} />
          ))}
        </ul>
      )}
      {warnings.length > 0 && (
        <div
          className={`rounded-lg border border-dashed border-indigo-200 bg-indigo-50/60 px-2.5 py-2 ${others.length > 0 ? 'mt-1.5' : ''}`}
        >
          <ul className="space-y-1">
            {warnings.map((insight, i) => (
              <InsightRow key={i} insight={insight} />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export default function ImpactSummaryCard({
  forecast,
  activePlans,
  livePreview,
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
          const preview = livePreview?.planId === plan.id ? livePreview.insights : [];
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
                <div className="pl-3.5">
                  <InsightGroup insights={planInsights} />
                </div>
              ) : preview.length === 0 ? (
                <p className="pl-3.5 text-sm text-gray-400">
                  No notable schedule effects from this change.
                </p>
              ) : null}
              {preview.length > 0 && (
                <div className="mt-1.5 ml-3.5 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/60 px-2.5 py-2">
                  <p className="mb-1 text-xs font-medium text-indigo-600">While dragging</p>
                  <ul className="space-y-1">
                    {preview.map((insight, i) => (
                      <InsightRow key={i} insight={insight} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {scenarioInsights.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <InsightGroup insights={scenarioInsights} />
        </div>
      )}
    </div>
  );
}
