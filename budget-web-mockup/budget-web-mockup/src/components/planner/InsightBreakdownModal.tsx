'use client';

import {useState} from 'react';
import Modal from '@/components/ui/Modal';
import {formatCurrency} from '@/lib/formatters';
import {PlanInsight, PlanInsightBreakdownItem} from '@/types';

const COMMITTED_COLOR = '#EF4444';
const DISCRETIONARY_COLOR = '#6366F1';

interface DonutSegment {
  id: string;
  color: string;
  percentage: number;
  d: string;
  labelX: number;
  labelY: number;
}

// Cutout donut geometry - each slice is a filled annular wedge with a white
// stroke between sections. Same shape/math as the Discretionary Spending and
// Highest Earning Period breakdowns on the Analytics page (not shared code -
// that geometry isn't exported anywhere - just the same visual result).
function buildDonutSegments(items: PlanInsightBreakdownItem[]): DonutSegment[] {
  const OUTER_R = 47;
  const INNER_R = 27;
  const LABEL_R = (OUTER_R + INNER_R) / 2;
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (startDeg: number, endDeg: number) => {
    const sweep = endDeg - startDeg;
    if (sweep < 0.1) return '';
    if (sweep >= 359.9) {
      return `M 0,${-OUTER_R} A ${OUTER_R},${OUTER_R} 0 1,1 0,${OUTER_R} A ${OUTER_R},${OUTER_R} 0 1,1 0,${-OUTER_R} M 0,${-INNER_R} A ${INNER_R},${INNER_R} 0 1,0 0,${INNER_R} A ${INNER_R},${INNER_R} 0 1,0 0,${-INNER_R} Z`;
    }
    const s = toRad(startDeg - 90);
    const e = toRad(endDeg - 90);
    const x1 = (Math.cos(s) * OUTER_R).toFixed(2);
    const y1 = (Math.sin(s) * OUTER_R).toFixed(2);
    const x2 = (Math.cos(e) * OUTER_R).toFixed(2);
    const y2 = (Math.sin(e) * OUTER_R).toFixed(2);
    const x3 = (Math.cos(e) * INNER_R).toFixed(2);
    const y3 = (Math.sin(e) * INNER_R).toFixed(2);
    const x4 = (Math.cos(s) * INNER_R).toFixed(2);
    const y4 = (Math.sin(s) * INNER_R).toFixed(2);
    const large = sweep > 180 ? 1 : 0;
    return `M ${x1},${y1} A ${OUTER_R},${OUTER_R} 0 ${large},1 ${x2},${y2} L ${x3},${y3} A ${INNER_R},${INNER_R} 0 ${large},0 ${x4},${y4} Z`;
  };

  let acc = 0;
  return items.slice(0, 6).map((item) => {
    const percentage = total > 0 ? (item.amount / total) * 100 : 0;
    const startDeg = acc * 3.6;
    const endDeg = (acc + percentage) * 3.6;
    acc += percentage;
    const theta = toRad((startDeg + endDeg) / 2);
    return {
      id: item.id,
      color: item.kind === 'committed' ? COMMITTED_COLOR : DISCRETIONARY_COLOR,
      percentage,
      d: arcPath(startDeg, endDeg),
      labelX: 50 + LABEL_R * Math.sin(theta),
      labelY: 50 - LABEL_R * Math.cos(theta),
    };
  });
}

interface InsightBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  insight: PlanInsight | null;
  currency?: string;
}

export default function InsightBreakdownModal({
  isOpen,
  onClose,
  insight,
  currency = 'USD',
}: InsightBreakdownModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = insight?.breakdown ?? [];
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const segments = buildDonutSegments(items);

  const handleClose = () => {
    onClose();
    setSelectedId(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Payments this week" size="xl">
      <div className="space-y-6 p-6">
        <div className="rounded-lg bg-indigo-50 p-4 text-center">
          <p className="text-3xl font-bold text-indigo-700">{formatCurrency(total, currency)}</p>
          <p className="mt-1 text-sm text-indigo-600">
            across {items.length} payment{items.length === 1 ? '' : 's'} this week
          </p>
        </div>

        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="relative mx-auto h-44 w-44 shrink-0 sm:mx-0">
            <svg viewBox="0 0 100 100" className="h-full w-full">
              <g transform="translate(50 50)">
                {segments.map((seg) =>
                  seg.d ? (
                    <path
                      key={seg.id}
                      d={seg.d}
                      fill={seg.color}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      onClick={() => setSelectedId((prev) => (prev === seg.id ? null : seg.id))}
                      className="cursor-pointer transition-opacity"
                      style={{opacity: selectedId && selectedId !== seg.id ? 0.3 : 1}}
                    />
                  ) : null,
                )}
              </g>
            </svg>
            {segments.map((seg) =>
              seg.percentage >= 7 ? (
                <span
                  key={`label-${seg.id}`}
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold text-white transition-opacity"
                  style={{
                    left: `${seg.labelX}%`,
                    top: `${seg.labelY}%`,
                    textShadow: '0 1px 2px rgba(0,0,0,0.35)',
                    opacity: selectedId && selectedId !== seg.id ? 0.3 : 1,
                  }}
                >
                  {seg.percentage.toFixed(0)}%
                </span>
              ) : null,
            )}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold leading-none text-gray-900">{items.length}</span>
              <span className="mt-1 text-xs text-gray-500">Payments</span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId((prev) => (prev === item.id ? null : item.id))}
                className="flex w-full items-center justify-between rounded-lg bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100"
                style={{opacity: selectedId && selectedId !== item.id ? 0.5 : 1}}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: item.kind === 'committed' ? COMMITTED_COLOR : DISCRETIONARY_COLOR,
                    }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(item.date).toLocaleDateString('en-US', {day: 'numeric', month: 'short'})} ·{' '}
                      {item.kind === 'committed' ? 'Committed' : 'Discretionary'}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-gray-900">
                  {formatCurrency(item.amount, currency)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
