'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
  MouseHandlerDataParam,
} from 'recharts';
import {formatCurrency, formatCurrencyCompact} from '@/lib/formatters';
import {DailyBalance, FinancialEvent, FinancialEventSourceType, Plan, PlanStatus} from '@/types';

interface PlanMarker {
  id: string;
  date: string;
  balance: number;
  status: PlanStatus;
  index: number;
}

interface EventMarker {
  key: string;
  date: string;
  balance: number;
  description: string;
  amount: number;
}

const BALANCE_COLOR = '#6366F1';
const BUFFER_COLOR = '#F87171';
const DRAFT_COLOR = '#A5B4FC';
const PLANNED_COLOR = '#6366F1';
const INCOME_COLOR = '#10B981';
const BILL_COLOR = '#EF4444';

const SOURCE_LABELS: Record<FinancialEventSourceType, string> = {
  PRIMARY_INCOME: 'Salary',
  INCOME_SOURCE: 'Income',
  RECURRING_BILL: 'Bill',
  PLAN: 'Plan',
};

interface ForecastChartProps {
  dailyBalances: DailyBalance[];
  events: FinancialEvent[];
  safetyBufferAmount: number | null;
  plans: Plan[];
  currency?: string;
  // Called when a plan dot is dragged to a new day and dropped there.
  onPlanDateChange?: (planId: string, newDate: string) => void;
}

export default function ForecastChart({
  dailyBalances,
  events,
  safetyBufferAmount,
  plans,
  currency = 'USD',
  onPlanDateChange,
}: ForecastChartProps) {
  const chartData = useMemo(
    () =>
      dailyBalances.map((d) => ({
        date: d.date,
        label: new Date(d.date).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
        }),
        balance: d.balance,
      })),
    [dailyBalances],
  );

  const balanceByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of dailyBalances) map.set(d.date, d.balance);
    return map;
  }, [dailyBalances]);

  // Active plans that land on a day the forecast covers, so we can mark
  // Draft (dashed/lighter) vs Planned (solid) points on the balance line.
  const planMarkers = useMemo(() => {
    const markers: PlanMarker[] = [];
    for (const p of plans) {
      if (p.status !== 'DRAFT' && p.status !== 'PLANNED') continue;
      const date = p.plannedDate.slice(0, 10);
      const balance = balanceByDate.get(date);
      if (balance === undefined) continue;
      const index = chartData.findIndex((c) => c.date === date);
      if (index === -1) continue;
      markers.push({id: p.id, date, balance, status: p.status, index});
    }
    return markers;
  }, [plans, balanceByDate, chartData]);

  // Lets the hover cursor line (rendered per chartData index) look up whether
  // the day it's over has a draggable plan on it.
  const planMarkerByIndex = useMemo(() => {
    const map = new Map<number, PlanMarker>();
    for (const m of planMarkers) map.set(m.index, m);
    return map;
  }, [planMarkers]);

  // Dragging a plan dot reschedules it: dragPlanIdRef/dragIndexRef track the
  // in-progress drag imperatively (read from event handlers and the window
  // mouseup fallback without stale closures), while dragPreview state drives
  // the ghost dot's position during the drag.
  const dragPlanIdRef = useRef<string | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const [dragPreview, setDragPreview] = useState<{planId: string; index: number} | null>(null);

  const beginDrag = (marker: PlanMarker) => {
    dragPlanIdRef.current = marker.id;
    dragIndexRef.current = marker.index;
    setDragPreview({planId: marker.id, index: marker.index});
  };

  const endDrag = () => {
    const planId = dragPlanIdRef.current;
    const index = dragIndexRef.current;
    dragPlanIdRef.current = null;
    dragIndexRef.current = null;
    setDragPreview(null);
    if (planId === null || index === null) return;
    const point = chartData[index];
    const original = plans.find((p) => p.id === planId);
    if (!point || !original) return;
    if (point.date !== original.plannedDate.slice(0, 10)) {
      onPlanDateChange?.(planId, point.date);
    }
  };

  const handleChartMouseMove = (state: MouseHandlerDataParam) => {
    if (!dragPlanIdRef.current) return;
    if (!state.isTooltipActive || state.activeTooltipIndex == null) return;
    // activeTooltipIndex is a string in Recharts v3 (TooltipIndex = string | null),
    // not a number - it must be parsed before use as a chartData index.
    const index = Number(state.activeTooltipIndex);
    if (Number.isNaN(index)) return;
    dragIndexRef.current = index;
    setDragPreview({planId: dragPlanIdRef.current, index});
  };

  const handleChartMouseUp = () => {
    if (dragPlanIdRef.current) endDrag();
  };

  // Fallback for a mouseup outside the chart's own mouse-tracking area
  // (e.g. the cursor overshoots past the plot before the button is released).
  useEffect(() => {
    const onWindowMouseUp = () => {
      if (dragPlanIdRef.current) endDrag();
    };
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => window.removeEventListener('mouseup', onWindowMouseUp);
  }, [chartData, plans, onPlanDateChange]);

  // Money coming in (salary + income sources), so it's visible on the chart
  // when income arrives relative to bills/plans, not just the balance line.
  const incomeMarkers = useMemo(() => {
    const markers: EventMarker[] = [];
    events.forEach((e, i) => {
      if (e.direction !== 'INFLOW') return;
      const balance = balanceByDate.get(e.date);
      if (balance === undefined) return;
      markers.push({
        key: `${e.sourceId}-${e.date}-${i}`,
        date: e.date,
        balance,
        description: e.description,
        amount: e.amount,
      });
    });
    return markers;
  }, [events, balanceByDate]);

  // Scheduled/committed bills - real recurring bills, not what-if plans
  // (those already get an indigo dot via planMarkers).
  const billMarkers = useMemo(() => {
    const markers: EventMarker[] = [];
    events.forEach((e, i) => {
      if (e.sourceType !== 'RECURRING_BILL') return;
      const balance = balanceByDate.get(e.date);
      if (balance === undefined) return;
      markers.push({
        key: `${e.sourceId}-${e.date}-${i}`,
        date: e.date,
        balance,
        description: e.description,
        amount: e.amount,
      });
    });
    return markers;
  }, [events, balanceByDate]);

  // Every event grouped by date, for the hover tooltip - so hovering a day
  // shows what actually happened (Salary, Phone Bill, etc.), not just the
  // resulting balance number.
  const eventsByDate = useMemo(() => {
    const map = new Map<string, FinancialEvent[]>();
    for (const e of events) {
      const bucket = map.get(e.date) ?? [];
      bucket.push(e);
      map.set(e.date, bucket);
    }
    return map;
  }, [events]);

  // Recharts' own hover guide line - draggable when the hovered day has a
  // plan on it, so the line (not just the tiny dot) is a grab handle too.
  // `points`/`payloadIndex` are injected by Recharts' Tooltip cursor plumbing.
  const DraggableCursor = (cursorProps: {points?: {x: number; y: number}[]; payloadIndex?: string}) => {
    const {points, payloadIndex} = cursorProps;
    if (!points || points.length < 2) return null;
    const [p1, p2] = points;
    const index = Number(payloadIndex);
    const marker = Number.isNaN(index) ? undefined : planMarkerByIndex.get(index);
    const draggable = Boolean(marker && onPlanDateChange);
    return (
      <g>
        <line
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={draggable ? PLANNED_COLOR : '#ccc'}
          strokeWidth={draggable ? 2 : 1}
          strokeDasharray={draggable ? undefined : '3 3'}
        />
        {draggable && marker && (
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="transparent"
            strokeWidth={24}
            style={{cursor: dragPreview?.planId === marker.id ? 'grabbing' : 'grab'}}
            onMouseDown={(e) => {
              e.preventDefault();
              beginDrag(marker);
            }}
          />
        )}
      </g>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="flex h-[320px] w-full items-center justify-center text-sm text-gray-500">
        No forecast data yet.
      </div>
    );
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{top: 8, right: 8, left: 0, bottom: 0}}
          onMouseMove={handleChartMouseMove}
          onMouseUp={handleChartMouseUp}
        >
          <defs>
            <linearGradient id="planner-balance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={BALANCE_COLOR} stopOpacity={0.25} />
              <stop offset="95%" stopColor={BALANCE_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{fontSize: 12, fill: '#9CA3AF'}}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{fontSize: 12, fill: '#9CA3AF'}}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value) => formatCurrencyCompact(Number(value), currency)}
          />
          <Tooltip
            cursor={<DraggableCursor />}
            content={({active, payload}) => {
              if (!active || !payload || payload.length === 0) return null;
              const point = payload[0].payload as {date: string; balance: number};
              const dayEvents = eventsByDate.get(point.date) || [];
              return (
                <div
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px',
                    padding: '8px 12px',
                    minWidth: '170px',
                  }}
                >
                  <p style={{fontWeight: 600, color: '#111827', margin: '0 0 4px'}}>
                    {formatCurrency(point.balance, currency)}
                  </p>
                  {dayEvents.length === 0 ? (
                    <p style={{color: '#9CA3AF', margin: 0}}>No activity this day</p>
                  ) : (
                    <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                      {dayEvents.map((e, i) => (
                        <li
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 12,
                            color: e.direction === 'INFLOW' ? '#059669' : '#DC2626',
                          }}
                        >
                          <span style={{color: '#6B7280'}}>
                            {SOURCE_LABELS[e.sourceType]}: {e.description}
                          </span>
                          <span>
                            {e.direction === 'INFLOW' ? '+' : '-'}
                            {formatCurrency(e.amount, currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            }}
          />
          {safetyBufferAmount !== null && (
            <ReferenceLine
              y={safetyBufferAmount}
              stroke={BUFFER_COLOR}
              strokeDasharray="4 4"
              label={{
                value: 'Safety buffer',
                position: 'insideTopLeft',
                fill: BUFFER_COLOR,
                fontSize: 11,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="balance"
            stroke={BALANCE_COLOR}
            strokeWidth={2.5}
            fill="url(#planner-balance)"
            dot={false}
            activeDot={{r: 4}}
          />
          {planMarkers.map((marker) => {
            const dragging = dragPreview?.planId === marker.id;
            const point = chartData[dragging ? dragPreview.index : marker.index];
            if (!point) return null;
            return (
              <ReferenceDot
                key={marker.id}
                x={point.label}
                y={dragging ? point.balance : marker.balance}
                r={dragging ? 6 : 5}
                // Custom shape so the draggable hit area (20px radius) is much
                // bigger than the visible dot (5-6px) - grabbing the visual dot
                // precisely was too finicky otherwise.
                shape={(dotProps: {cx?: number; cy?: number}) => (
                  <g
                    style={onPlanDateChange ? {cursor: dragging ? 'grabbing' : 'grab'} : undefined}
                    onMouseDown={
                      onPlanDateChange
                        ? (e: React.MouseEvent) => {
                            e.preventDefault();
                            beginDrag(marker);
                          }
                        : undefined
                    }
                  >
                    {onPlanDateChange && (
                      <circle cx={dotProps.cx} cy={dotProps.cy} r={20} fill="transparent" />
                    )}
                    <circle
                      cx={dotProps.cx}
                      cy={dotProps.cy}
                      r={dragging ? 6 : 5}
                      fill={marker.status === 'DRAFT' ? 'white' : PLANNED_COLOR}
                      stroke={marker.status === 'DRAFT' ? DRAFT_COLOR : PLANNED_COLOR}
                      strokeWidth={2}
                      strokeDasharray={marker.status === 'DRAFT' ? '2 2' : undefined}
                    />
                  </g>
                )}
              />
            );
          })}
          {incomeMarkers.map((marker) => (
            <ReferenceDot
              key={marker.key}
              x={chartData.find((c) => c.date === marker.date)?.label ?? marker.date}
              y={marker.balance}
              r={4}
              fill={INCOME_COLOR}
              stroke="white"
              strokeWidth={1.5}
            />
          ))}
          {billMarkers.map((marker) => (
            <ReferenceDot
              key={marker.key}
              x={chartData.find((c) => c.date === marker.date)?.label ?? marker.date}
              y={marker.balance}
              r={4}
              fill={BILL_COLOR}
              stroke="white"
              strokeWidth={1.5}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      {(incomeMarkers.length > 0 || billMarkers.length > 0) && (
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          {incomeMarkers.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full border border-white"
                style={{backgroundColor: INCOME_COLOR}}
              />
              Money in
            </span>
          )}
          {billMarkers.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full border border-white"
                style={{backgroundColor: BILL_COLOR}}
              />
              Committed bills
            </span>
          )}
        </div>
      )}
    </div>
  );
}
