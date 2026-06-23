'use client';

import {useState} from 'react';

interface DonutCategory {
  categoryId: string;
  categoryName: string;
  categoryColor?: string;
  amount: number;
}

interface CategoryDonutProps {
  categories: DonutCategory[];
  /** How many of the largest slices to draw (default 6). */
  maxSlices?: number;
}

const formatAmount = (n: number) =>
  n.toLocaleString('en-AU', {style: 'currency', currency: 'AUD'});

// Cutout donut chart (filled annular wedges with white separators) matching the
// Discretionary Spending breakdown: per-slice percentage labels on each section
// and the category count in the center cutout.
export default function CategoryDonut({
  categories,
  maxSlices = 6,
}: CategoryDonutProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const OUTER_R = 47;
  const INNER_R = 27;
  const LABEL_R = (OUTER_R + INNER_R) / 2;
  const total = categories.reduce((sum, cat) => sum + cat.amount, 0);

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

  // Aggregate everything beyond the top slices into an "Other" wedge so the
  // donut always closes the full circle (no white gap from the missing arc).
  const shown = categories.slice(0, maxSlices);
  const restAmount = categories
    .slice(maxSlices)
    .reduce((sum, cat) => sum + cat.amount, 0);
  const sliceData =
    restAmount > 0
      ? [
          ...shown,
          {
            categoryId: '__other__',
            categoryName: 'Other',
            categoryColor: '#9CA3AF',
            amount: restAmount,
          },
        ]
      : shown;

  let acc = 0; // cumulative percentage before the current slice
  const segments = sliceData.map((cat) => {
    const percentage = total > 0 ? (cat.amount / total) * 100 : 0;
    const startDeg = acc * 3.6;
    const endDeg = (acc + percentage) * 3.6;
    acc += percentage;
    const theta = toRad((startDeg + endDeg) / 2); // mid-angle, clockwise from top
    return {
      id: cat.categoryId,
      name: cat.categoryName,
      amount: cat.amount,
      // Same color contract as the Discretionary Spending Breakdown donut:
      // raw category color, indigo fallback.
      color: cat.categoryColor || '#6366F1',
      percentage,
      d: arcPath(startDeg, endDeg),
      labelX: 50 + LABEL_R * Math.sin(theta),
      labelY: 50 - LABEL_R * Math.cos(theta),
    };
  });

  const hovered = hoveredId
    ? segments.find((s) => s.id === hoveredId)
    : null;

  return (
    <div className="relative w-full max-w-[280px] aspect-square">
      <svg viewBox="0 0 100 100" className="w-full h-full">
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
                onMouseEnter={() => setHoveredId(seg.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="cursor-pointer transition-opacity"
                style={{
                  opacity: hoveredId && hoveredId !== seg.id ? 0.45 : 1,
                }}
              />
            ) : null,
          )}
        </g>
      </svg>

      {/* Per-slice percentage labels, sitting on each section */}
      {segments.map((seg) =>
        seg.percentage >= 7 ? (
          <span
            key={`label-${seg.id}`}
            className="absolute text-xs font-semibold text-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: `${seg.labelX}%`,
              top: `${seg.labelY}%`,
              textShadow: '0 1px 2px rgba(0,0,0,0.35)',
            }}
          >
            {seg.percentage.toFixed(0)}%
          </span>
        ) : null,
      )}

      {/* Center cutout — shows the hovered category, or the total count */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        {hovered ? (
          <div className="max-w-[58%]">
            <p className="text-sm font-semibold text-gray-900 leading-tight break-words">
              {hovered.name}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {formatAmount(hovered.amount)}
            </p>
            <p className="text-xs text-gray-400">
              {hovered.percentage.toFixed(0)}%
            </p>
          </div>
        ) : (
          <>
            <span className="text-3xl font-bold text-gray-900 leading-none">
              {categories.length}
            </span>
            <span className="text-sm text-gray-500 mt-1">Categories</span>
          </>
        )}
      </div>
    </div>
  );
}
