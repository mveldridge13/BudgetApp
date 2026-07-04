'use client';

import {useState, useCallback} from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {transactionService} from '@/services/transaction.service';
import type {DiscretionaryBreakdown} from '@/types/transaction.types';
import {useAnalyticsData} from '@/hooks/useAnalyticsData';
import Modal from '@/components/ui/Modal';
import DatePicker from '@/components/ui/DatePicker';
import CategoryDonut from '@/components/analytics/CategoryDonut';

// Re-export for convenience (backend now handles pay period filtering)

// Types
interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryColor?: string;
  amount: number;
  percentage: number;
  transactionCount?: number;
}

interface DailyTrend {
  date: string;
  income: number;
  expenses: number;
  discretionaryExpenses?: number;
}

interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  discretionaryExpenses: number;
  net: number;
  transactionCount: number;
}

interface SpendingVelocity {
  currentMonthSpent: number;
  daysElapsed: number;
  daysInMonth: number;
  dailyAverage: number;
  projectedMonthlySpending: number;
  monthlyBudget?: number;
  velocityStatus: 'ON_TRACK' | 'SLIGHTLY_HIGH' | 'HIGH' | 'VERY_HIGH';
  daysToOverspend?: number;
  recommendedDailySpending: number;
}

interface DailyBurnRate {
  currentDailyBurnRate: number;
  sustainableDailyRate: number;
  daysUntilBudgetExceeded: number | null;
  recommendedDailySpending: number;
  burnRateStatus: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  weeklyTrend: number[];
  weeklyTrendWithLabels: {day: string; amount: number; isToday: boolean}[];
  projectedMonthlySpending: number;
  monthlyIncomeCapacity: number;
}

interface TransactionAnalytics {
  totalIncome: number;
  totalExpenses: number;
  netIncome?: number;
  transactionCount?: number;
  averageTransaction?: number;
  averagePeriodSpending?: number;
  previousPeriodExpenses?: number;
  previousPeriodDiscretionary?: number;
  expensesPercentageChange?: number;
  categoryBreakdown: CategoryBreakdown[];
  monthlyTrends?: MonthlyTrend[];
  dailyTrend?: DailyTrend[];
  spendingVelocity?: SpendingVelocity;
  dailyBurnRate?: DailyBurnRate;
}

interface IncomeBySource {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  percentage: number;
  color?: string;
}

interface IncomeBreakdown {
  recurring: {amount: number; percentage: number};
  adhoc: {amount: number; percentage: number};
}

interface IncomeInsights {
  consistencyScore: number;
  growthTrend: 'growing' | 'declining' | 'stable';
  primaryIncomeSource?: string;
}

interface RecentIncomeEntry {
  id: string;
  categoryName?: string;
  description: string;
  date: string;
  amount: number;
}

interface IncomeAnalytics {
  totalIncomeThisMonth: number;
  totalIncomeThisPayPeriod: number;
  totalIncomeThisWeek: number;
  monthChangePercentage?: number;
  // Year-to-date income (anniversary-based), matching the mobile app.
  totalIncomeYTD?: number;
  ytdChangePercentage?: number;
  hasYearOverYearData?: boolean;
  anniversaryStartDate?: string | null;
  payPeriodInfo?: {frequency: string};
  incomeBySource: IncomeBySource[];
  incomeBreakdown?: IncomeBreakdown;
  recentIncomeEntries: RecentIncomeEntry[];
  insights?: IncomeInsights;
}

// Time horizons: 7D (short-term signal), 30D (behavioural trend — the default),
// 12M (financial overview). 7D/30D are daily points; 12M is monthly aggregates.
type PeriodType = '7d' | '30d' | '12m';
type TabType = 'spending' | 'income' | 'bills';

// Bills analytics response type (from backend)
interface BillsAnalyticsResponse {
  period?: {
    start: string;
    end: string;
    isPayPeriod: boolean;
    frequency: string | null;
  };
  totalBills: number;
  paidBills: number;
  unpaidBills: number;
  overdueBills: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  overdueAmount: number;
  progress: number;
  upcomingBills: Array<{
    id: string;
    description: string;
    amount: number;
    dueDate?: string;
    status: string;
    category?: {name: string} | null;
  }>;
  paidBillsList: Array<{
    id: string;
    description: string;
    amount: number;
    dueDate?: string;
    status: string;
    category?: {name: string} | null;
  }>;
  overdueBillsList: Array<{
    id: string;
    description: string;
    amount: number;
    dueDate?: string;
    status: string;
    category?: {name: string} | null;
  }>;
}

export default function AnalyticsPage() {
  // State
  const [selectedTab, setSelectedTab] = useState<TabType>('spending');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('30d');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Cached, per-period analytics (SWR keeps the cache across mounts so
  // revisiting the page is instant; it revalidates in the background).
  const {data: analyticsData, isLoading, refresh} =
    useAnalyticsData(selectedPeriod);
  const analytics = (analyticsData?.analytics ?? null) as TransactionAnalytics | null;
  const incomeAnalytics =
    (analyticsData?.incomeAnalytics ?? null) as IncomeAnalytics | null;
  const billsAnalytics =
    (analyticsData?.billsAnalytics ?? null) as BillsAnalyticsResponse | null;
  const payPeriodStatus = analyticsData?.payPeriodStatus ?? null;

  // Modal state
  const [showDiscretionaryBreakdown, setShowDiscretionaryBreakdown] =
    useState(false);
  const [discretionaryDetail, setDiscretionaryDetail] =
    useState<DiscretionaryBreakdown | null>(null);
  const [discretionaryDetailLoading, setDiscretionaryDetailLoading] =
    useState(false);
  // The reference day (YYYY-MM-DD) the breakdown modal is showing; user-changeable via the calendar.
  const [discretionaryDate, setDiscretionaryDate] = useState('');
  // The donut slice the user clicked, to show its subcategory breakdown on the right.
  const [selectedDonutCategoryId, setSelectedDonutCategoryId] = useState<
    string | null
  >(null);
  const [showVelocityBreakdown, setShowVelocityBreakdown] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch the discretionary breakdown for the period (day/week/month per the
  // active tab) containing the given day. Mirrors the mobile app's
  // createLocalDateRange so the backend scopes to that exact period and returns
  // discretionary-only categories — instead of the whole-range categoryBreakdown.
  const loadDiscretionaryBreakdown = useCallback(
    async (isoDate: string) => {
      setSelectedDonutCategoryId(null);
      if (!isoDate) {
        setDiscretionaryDetail(null);
        return;
      }

      const [y, m, d] = isoDate.split('-').map(Number);
      const base = new Date(y, m - 1, d);
      let start: Date;
      let end: Date;

      if (selectedPeriod === '12m') {
        // First to last day of the month (the highest-spend month).
        start = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
        end = new Date(
          base.getFullYear(),
          base.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );
      } else {
        // 7d / 30d — a single day (the highest-spend day).
        start = new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          0,
          0,
          0,
          0,
        );
        end = new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          23,
          59,
          59,
          999,
        );
      }

      try {
        setDiscretionaryDetailLoading(true);
        const detail = await transactionService.getDiscretionaryBreakdown({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        });
        setDiscretionaryDetail(detail);
      } catch (error) {
        console.error('Error fetching discretionary breakdown:', error);
        setDiscretionaryDetail(null);
      } finally {
        setDiscretionaryDetailLoading(false);
      }
    },
    [selectedPeriod],
  );

  // Open the breakdown modal anchored to a given day (defaults to today).
  const openDiscretionaryBreakdown = useCallback(
    (rawDate?: string) => {
      // rawDate may be 'YYYY-MM-DD', 'YYYY-MM', or a full ISO string; normalise to a day.
      let iso = '';
      if (rawDate) {
        if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
          iso = rawDate.slice(0, 10);
        } else if (/^\d{4}-\d{2}$/.test(rawDate)) {
          iso = `${rawDate}-01`;
        } else {
          const dt = new Date(rawDate);
          iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
            2,
            '0',
          )}-${String(dt.getDate()).padStart(2, '0')}`;
        }
      }
      setDiscretionaryDate(iso);
      setShowDiscretionaryBreakdown(true);
      loadDiscretionaryBreakdown(iso);
    },
    [loadDiscretionaryBreakdown],
  );

  // Calendar change inside the modal: switch the day and refetch.
  const handleDiscretionaryDateChange = useCallback(
    (isoDate: string) => {
      if (!isoDate) return;
      setDiscretionaryDate(isoDate);
      loadDiscretionaryBreakdown(isoDate);
    },
    [loadDiscretionaryBreakdown],
  );

  const todayISO = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(t.getDate()).padStart(2, '0')}`;
  })();

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Due: Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Due: Tomorrow';
    } else if (date < today) {
      return `Overdue: ${formatDate(dueDate)}`;
    } else {
      return `Due: ${formatDate(dueDate)}`;
    }
  };

  const getVelocityStatusColor = (status: string) => {
    switch (status) {
      case 'ON_TRACK':
        return 'text-green-600';
      case 'SLIGHTLY_HIGH':
        return 'text-yellow-600';
      case 'HIGH':
        return 'text-orange-600';
      case 'VERY_HIGH':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getVelocityStatusBorder = (status: string) => {
    switch (status) {
      case 'ON_TRACK':
        return 'border-l-green-500';
      case 'SLIGHTLY_HIGH':
        return 'border-l-yellow-500';
      case 'HIGH':
        return 'border-l-orange-500';
      case 'VERY_HIGH':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-500';
    }
  };

  // Calculate statistics from monthlyTrends (matches mobile app approach)
  // Backend returns monthlyTrends for all periods - grouped by day/week/month based on date range
  const totalDiscretionaryExpenses =
    analytics?.monthlyTrends?.reduce(
      (sum, trend) => sum + (trend.discretionaryExpenses || 0),
      0,
    ) || 0;

  const averageDiscretionaryPerPeriod = analytics?.monthlyTrends?.length
    ? totalDiscretionaryExpenses / analytics.monthlyTrends.length
    : 0;

  // Calculate discretionary percentage change
  const previousDiscretionary = analytics?.previousPeriodDiscretionary || 0;
  const discretionaryPercentageChange =
    previousDiscretionary > 0
      ? ((totalDiscretionaryExpenses - previousDiscretionary) /
          previousDiscretionary) *
        100
      : 0;

  // Build chart data from monthlyTrends (contains discretionary data)
  const chartData =
    analytics?.monthlyTrends?.map(trend => {
      const date = new Date(trend.month);
      let label;

      if (selectedPeriod === '12m') {
        label = date.toLocaleDateString('en-AU', {month: 'short'});
      } else if (selectedPeriod === '7d') {
        label = date.toLocaleDateString('en-AU', {weekday: 'short'});
      } else {
        // 30d — day + short month (axis is thinned so labels stay readable)
        label = date.toLocaleDateString('en-AU', {
          day: 'numeric',
          month: 'short',
        });
      }

      return {
        date: label,
        rawDate: trend.month,
        expenses: trend.expenses || 0,
        income: trend.income || 0,
        discretionary: trend.discretionaryExpenses || 0,
      };
    }) || [];

  const statistics = {
    currentTotal: analytics?.totalExpenses || 0,
    averageSpending: analytics?.averagePeriodSpending || 0,
    percentageChange: analytics?.expensesPercentageChange || 0,
    currentDiscretionary: totalDiscretionaryExpenses,
    averageDiscretionary: averageDiscretionaryPerPeriod,
    discretionaryPercentageChange,
    highestSpendingPeriod:
      chartData.length > 0
        ? chartData.reduce((max, curr) =>
            curr.expenses > max.expenses ? curr : max,
          )
        : null,
    highestDiscretionaryPeriod:
      chartData.length > 0
        ? chartData.reduce((max, curr) =>
            curr.discretionary > max.discretionary ? curr : max,
          )
        : null,
  };

  // Backend may omit categoryBreakdown when there's no spend; normalise to an array.
  const discretionaryCategories = discretionaryDetail?.categoryBreakdown ?? [];

  // Donut geometry: each slice is a filled annular wedge (matching the mobile
  // app) with a white stroke between sections for the cutout look. Wedges are
  // drawn in a center-origin group; angles run clockwise from the top.
  const donutSegments = (() => {
    const OUTER_R = 47;
    const INNER_R = 27;
    const LABEL_R = (OUTER_R + INNER_R) / 2;
    const total = discretionaryCategories.reduce(
      (sum, cat) => sum + cat.amount,
      0,
    );

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const arcPath = (startDeg: number, endDeg: number) => {
      const sweep = endDeg - startDeg;
      if (sweep < 0.1) return '';
      // Full circle: draw the outer and inner rings as a single annulus.
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

    let acc = 0; // cumulative percentage before the current slice
    return discretionaryCategories.slice(0, 6).map(cat => {
      const percentage = total > 0 ? (cat.amount / total) * 100 : 0;
      const startDeg = acc * 3.6;
      const endDeg = (acc + percentage) * 3.6;
      acc += percentage;
      const theta = toRad((startDeg + endDeg) / 2); // mid-angle, clockwise from top
      return {
        id: cat.categoryId,
        color: cat.categoryColor || '#6366F1',
        percentage,
        d: arcPath(startDeg, endDeg),
        // As a percentage of the (square) container box.
        labelX: 50 + LABEL_R * Math.sin(theta),
        labelY: 50 - LABEL_R * Math.cos(theta),
      };
    });
  })();

  // The category whose slice is selected, plus its individual line items (the
  // backend returns one subcategory entry per transaction).
  const selectedDonutCategory =
    discretionaryCategories.find(
      c => c.categoryId === selectedDonutCategoryId,
    ) ?? null;

  const selectedLineItems = (() => {
    if (!selectedDonutCategory?.subcategories) return [];
    return selectedDonutCategory.subcategories
      .map((sub, i) => {
        const tx = sub.transactions?.[0];
        return {
          key: `${sub.subcategoryId ?? sub.subcategoryName ?? 'item'}-${i}`,
          label:
            tx?.description ||
            tx?.merchant ||
            sub.subcategoryName ||
            'Other',
          amount: sub.amount,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  })();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Track your spending patterns</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50">
          <svg
            className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {(['spending', 'income', 'bills'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
              selectedTab === tab
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Spending Tab */}
      {selectedTab === 'spending' && (
        <>
          {/* Period Selector */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex space-x-2">
                  {(['7d', '30d', '12m'] as PeriodType[]).map(period => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedPeriod === period
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>
                      {period.toUpperCase()}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  {selectedPeriod === '7d'
                    ? 'Last 7 days'
                    : selectedPeriod === '30d'
                    ? 'Rolling 30 days'
                    : 'Last 12 months'}
                </p>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={comparisonMode}
                  onChange={e => setComparisonMode(e.target.checked)}
                  className="w-4 h-4 text-indigo-500 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">
                  Compare with previous period
                </span>
              </label>
            </div>
          </div>

          {/* Stats Cards - Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">
                Total Spending
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(statistics.currentTotal)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">
                {selectedPeriod === '12m' ? 'Monthly Average' : 'Daily Average'}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(statistics.averageSpending)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">
                vs Previous Period
              </p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  statistics.percentageChange >= 0
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}>
                {statistics.percentageChange >= 0 ? '+' : ''}
                {statistics.percentageChange.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Stats Cards - Row 2 (Discretionary) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">
                Discretionary Spending
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(statistics.currentDiscretionary)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">
                Discretionary Average
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(statistics.averageDiscretionary)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">
                Discretionary vs Previous
              </p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  statistics.discretionaryPercentageChange >= 0
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}>
                {statistics.discretionaryPercentageChange >= 0 ? '+' : ''}
                {statistics.discretionaryPercentageChange.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Spending Over Time & Spending by Category, side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Spending Over Time
              </h3>
              <div className="flex-1 flex items-center">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{top: 8, right: 20, left: 8, bottom: 4}}>
                    <defs>
                      <linearGradient
                        id="expensesFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1">
                        <stop
                          offset="5%"
                          stopColor="#6366F1"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#6366F1"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="discretionaryFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1">
                        <stop
                          offset="5%"
                          stopColor="#10B981"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10B981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      tick={{fontSize: 12, fill: '#6B7280'}}
                      tickLine={false}
                      interval={selectedPeriod === '30d' ? 4 : 0}
                      minTickGap={8}
                    />
                    <YAxis
                      tick={{fontSize: 12, fill: '#6B7280'}}
                      tickLine={false}
                      tickFormatter={value => `$${value}`}
                    />
                    <Tooltip
                      formatter={value => [formatCurrency(Number(value)), '']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="#6366F1"
                      strokeWidth={3}
                      fill="url(#expensesFill)"
                      dot={{fill: '#6366F1', strokeWidth: 2, r: 4}}
                      activeDot={{r: 6}}
                      name="Expenses"
                    />
                    {comparisonMode && (
                      <Area
                        type="monotone"
                        dataKey="discretionary"
                        stroke="#10B981"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        fill="url(#discretionaryFill)"
                        dot={{fill: '#10B981', strokeWidth: 2, r: 3}}
                        name="Discretionary"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          {analytics?.categoryBreakdown &&
            analytics.categoryBreakdown.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                  Spending by Category
                </h3>
                <div className="flex items-center justify-center py-2">
                  <CategoryDonut categories={analytics.categoryBreakdown} />
                </div>
              </div>
            )}
          </div>

          {/* Key Insights */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Key Insights
            </h3>
            <div className="space-y-3">
              {statistics.highestSpendingPeriod && (
                <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-l-indigo-500">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">
                      Highest total spending:
                    </span>{' '}
                    {statistics.highestSpendingPeriod.date} with{' '}
                    {formatCurrency(statistics.highestSpendingPeriod.expenses)}
                  </p>
                </div>
              )}

              {statistics.highestDiscretionaryPeriod &&
                statistics.highestDiscretionaryPeriod.discretionary > 0 && (
                  <div
                    className="p-3 bg-gray-50 rounded-lg border-l-4 border-l-green-500 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() =>
                      openDiscretionaryBreakdown(
                        statistics.highestDiscretionaryPeriod?.rawDate,
                      )
                    }>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">
                        Highest discretionary spending:
                      </span>{' '}
                      {statistics.highestDiscretionaryPeriod.date} with{' '}
                      {formatCurrency(
                        statistics.highestDiscretionaryPeriod.discretionary,
                      )}
                    </p>
                    <p className="text-xs text-indigo-600 mt-1 italic">
                      Click for details
                    </p>
                  </div>
                )}

              <div
                className={`p-3 bg-gray-50 rounded-lg border-l-4 ${
                  statistics.percentageChange >= 0
                    ? 'border-l-red-500'
                    : 'border-l-green-500'
                }`}>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Total spending trend:</span>{' '}
                  You&apos;re spending{' '}
                  {Math.abs(statistics.percentageChange).toFixed(1)}%{' '}
                  {statistics.percentageChange >= 0 ? 'more' : 'less'} than last
                  period
                </p>
              </div>

              {analytics?.spendingVelocity && (
                <div
                  className={`p-3 bg-gray-50 rounded-lg border-l-4 ${getVelocityStatusBorder(
                    analytics.spendingVelocity.velocityStatus,
                  )} cursor-pointer hover:bg-gray-100 transition-colors`}
                  onClick={() => setShowVelocityBreakdown(true)}>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Spending Velocity:</span>{' '}
                    <span
                      className={getVelocityStatusColor(
                        analytics.spendingVelocity.velocityStatus,
                      )}>
                      {analytics.spendingVelocity.velocityStatus.replace(
                        '_',
                        ' ',
                      )}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Daily average:{' '}
                    {formatCurrency(analytics.spendingVelocity.dailyAverage)} |
                    Recommended:{' '}
                    {formatCurrency(
                      analytics.spendingVelocity.recommendedDailySpending,
                    )}
                  </p>
                  <p className="text-xs text-indigo-600 mt-1 italic">
                    Click for details
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Income Tab */}
      {selectedTab === 'income' && (
        <>
          {/* Income Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">
                Year to Date
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(incomeAnalytics?.totalIncomeYTD || 0)}
              </p>
              {incomeAnalytics?.hasYearOverYearData &&
              incomeAnalytics?.ytdChangePercentage !== undefined ? (
                <p
                  className={`text-sm mt-1 ${
                    incomeAnalytics.ytdChangePercentage >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                  {incomeAnalytics.ytdChangePercentage >= 0 ? '+' : ''}
                  {incomeAnalytics.ytdChangePercentage.toFixed(1)}% vs last year
                </p>
              ) : (
                <p className="text-sm text-gray-500 mt-1">
                  Since{' '}
                  {incomeAnalytics?.anniversaryStartDate
                    ? new Date(
                        incomeAnalytics.anniversaryStartDate,
                      ).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'signup'}
                </p>
              )}
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">
                This Pay Period
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(incomeAnalytics?.totalIncomeThisPayPeriod || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {incomeAnalytics?.payPeriodInfo?.frequency || 'Monthly'}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">This Week</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(incomeAnalytics?.totalIncomeThisWeek || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">7 days</p>
            </div>
          </div>

          {/* Income by Source */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Income by Source
            </h3>
            {incomeAnalytics?.incomeBySource &&
            incomeAnalytics.incomeBySource.length > 0 ? (
              <div className="space-y-4">
                {incomeAnalytics.incomeBySource.map((source, index) => (
                  <div key={source.categoryId || index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{backgroundColor: source.color || '#6366F1'}}
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {source.categoryName}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(source.totalAmount)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${source.percentage}%`,
                          backgroundColor: source.color || '#6366F1',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                No income sources found for this month
              </p>
            )}
          </div>

          {/* Recurring vs Ad-hoc */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recurring vs Ad-hoc Income
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-gray-500 mb-2">
                  Recurring
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(
                    incomeAnalytics?.incomeBreakdown?.recurring?.amount || 0,
                  )}
                </p>
                <p className="text-sm text-indigo-600 mt-1">
                  {incomeAnalytics?.incomeBreakdown?.recurring?.percentage?.toFixed(
                    0,
                  ) || 0}
                  %
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-gray-500 mb-2">Ad-hoc</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(
                    incomeAnalytics?.incomeBreakdown?.adhoc?.amount || 0,
                  )}
                </p>
                <p className="text-sm text-indigo-600 mt-1">
                  {incomeAnalytics?.incomeBreakdown?.adhoc?.percentage?.toFixed(
                    0,
                  ) || 0}
                  %
                </p>
              </div>
            </div>
          </div>

          {/* Recent Income Entries */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Income Entries
            </h3>
            {incomeAnalytics?.recentIncomeEntries &&
            incomeAnalytics.recentIncomeEntries.length > 0 ? (
              <div className="space-y-3">
                {incomeAnalytics.recentIncomeEntries.map((entry, index) => (
                  <div
                    key={entry.id || index}
                    className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {entry.categoryName || entry.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.date).toLocaleDateString('en-AU', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-green-600">
                      {formatCurrency(entry.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                No recent income entries found
              </p>
            )}
          </div>

          {/* Income Insights */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Income Insights
            </h3>
            <div className="space-y-3">
              {incomeAnalytics?.insights ? (
                <>
                  <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-l-green-500">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Income consistency:</span>{' '}
                      Your income consistency score is{' '}
                      {incomeAnalytics.insights.consistencyScore}%
                      {incomeAnalytics.insights.consistencyScore >= 80
                        ? ' - Excellent!'
                        : incomeAnalytics.insights.consistencyScore >= 60
                        ? ' - Good'
                        : ' - Room for improvement'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-l-indigo-500">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Income trend:</span> Your
                      income is{' '}
                      {incomeAnalytics.insights.growthTrend === 'growing'
                        ? 'growing'
                        : incomeAnalytics.insights.growthTrend === 'declining'
                        ? 'declining'
                        : 'stable'}
                      {incomeAnalytics.insights.primaryIncomeSource &&
                        ` with ${incomeAnalytics.insights.primaryIncomeSource} as your primary source`}
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-l-indigo-500">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Get started:</span> Add
                    income transactions to see detailed insights about your
                    income patterns and trends.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Bills Tab */}
      {selectedTab === 'bills' && (
        <>
          {/* Pay Period Info Banner */}
          {billsAnalytics?.period?.isPayPeriod && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg
                  className="w-5 h-5 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-indigo-900">
                    {payPeriodStatus || 'Current Pay Period'}
                  </p>
                  <p className="text-xs text-indigo-700">
                    Bills filtered by your pay period
                  </p>
                </div>
              </div>
              {billsAnalytics.period.frequency && (
                <span className="text-xs font-medium px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full capitalize">
                  {billsAnalytics.period.frequency}
                </span>
              )}
            </div>
          )}

          {/* Bills Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">
                Total Bills This Pay Period
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(billsAnalytics?.totalAmount || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {billsAnalytics?.totalBills || 0} bills total
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">Paid</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(billsAnalytics?.paidAmount || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {billsAnalytics?.paidBills || 0} of{' '}
                {billsAnalytics?.totalBills || 0} bills
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">
                {(billsAnalytics?.overdueBills || 0) > 0 ? 'Overdue' : 'Unpaid'}
              </p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  (billsAnalytics?.overdueBills || 0) > 0
                    ? 'text-red-600'
                    : 'text-yellow-600'
                }`}>
                {formatCurrency(
                  (billsAnalytics?.overdueBills || 0) > 0
                    ? billsAnalytics?.overdueAmount || 0
                    : billsAnalytics?.unpaidAmount || 0,
                )}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {(billsAnalytics?.overdueBills || 0) > 0
                  ? `${billsAnalytics?.overdueBills} overdue`
                  : `${billsAnalytics?.unpaidBills || 0} remaining`}
              </p>
            </div>
          </div>

          {/* Bills Progress */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Bills Progress
            </h3>
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">
                {billsAnalytics?.paidBills || 0} of{' '}
                {billsAnalytics?.totalBills || 0} bills paid •{' '}
                {formatCurrency(billsAnalytics?.paidAmount || 0)} of{' '}
                {formatCurrency(billsAnalytics?.totalAmount || 0)} settled
              </p>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-green-500 transition-all"
                  style={{width: `${billsAnalytics?.progress || 0}%`}}
                />
              </div>
              <p className="text-sm font-medium text-gray-900">
                {billsAnalytics?.progress || 0}% complete
              </p>
            </div>
          </div>

          {/* Upcoming Bills */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upcoming Bills
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Due within the next 7 days
            </p>
            {billsAnalytics?.upcomingBills &&
            billsAnalytics.upcomingBills.length > 0 ? (
              <div className="space-y-3">
                {billsAnalytics.upcomingBills.map((bill, index) => (
                  <div
                    key={bill.id || index}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {bill.description || bill.category?.name || 'Bill'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {bill.category?.name || 'General'}
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        {bill.dueDate
                          ? formatDueDate(bill.dueDate)
                          : 'No due date'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(Math.abs(bill.amount))}
                      </p>
                      <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 mt-1">
                        Due Soon
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No upcoming bills</p>
            )}
          </div>

          {/* Paid Bills */}
          {billsAnalytics?.paidBillsList &&
            billsAnalytics.paidBillsList.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Paid Bills
                </h3>
                <div className="space-y-3">
                  {billsAnalytics.paidBillsList.map((bill, index) => (
                    <div
                      key={bill.id || index}
                      className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {bill.description || bill.category?.name || 'Bill'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {bill.category?.name || 'General'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Paid:{' '}
                          {bill.dueDate
                            ? new Date(bill.dueDate).toLocaleDateString(
                                'en-AU',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                },
                              )
                            : 'Unknown'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(Math.abs(bill.amount))}
                        </p>
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 mt-1">
                          Paid
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Overdue Bills */}
          {billsAnalytics?.overdueBillsList &&
            billsAnalytics.overdueBillsList.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Overdue Bills
                </h3>
                <div className="space-y-3">
                  {billsAnalytics.overdueBillsList.map((bill, index) => (
                    <div
                      key={bill.id || index}
                      className="flex items-center justify-between p-4 border border-red-100 rounded-lg bg-red-50">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {bill.description || bill.category?.name || 'Bill'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {bill.category?.name || 'General'}
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          {bill.dueDate
                            ? formatDueDate(bill.dueDate)
                            : 'No due date'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(Math.abs(bill.amount))}
                        </p>
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 mt-1">
                          Overdue
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Bills Insights */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Bills Insights
            </h3>
            <div className="space-y-3">
              {billsAnalytics?.upcomingBills &&
                billsAnalytics.upcomingBills.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-l-yellow-500">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Upcoming deadlines:</span>{' '}
                      You have {billsAnalytics.upcomingBills.length}{' '}
                      {billsAnalytics.upcomingBills.length === 1
                        ? 'upcoming bill'
                        : 'upcoming bills'}{' '}
                      totaling{' '}
                      {formatCurrency(
                        billsAnalytics.upcomingBills.reduce(
                          (sum, bill) => sum + Math.abs(bill.amount),
                          0,
                        ),
                      )}
                      .
                    </p>
                  </div>
                )}

              {(billsAnalytics?.totalBills || 0) > 0 && (
                <div
                  className={`p-3 bg-gray-50 rounded-lg border-l-4 ${
                    (billsAnalytics?.progress || 0) >= 50
                      ? 'border-l-green-500'
                      : 'border-l-yellow-500'
                  }`}>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">
                      {(billsAnalytics?.progress || 0) >= 80
                        ? 'Excellent progress:'
                        : (billsAnalytics?.progress || 0) >= 50
                        ? 'Good progress:'
                        : 'Room for improvement:'}
                    </span>{' '}
                    You&apos;ve paid {billsAnalytics?.progress || 0}% of your
                    monthly bills.
                    {(billsAnalytics?.progress || 0) >= 80
                      ? ' Keep up the great work!'
                      : (billsAnalytics?.progress || 0) >= 50
                      ? " You're on track!"
                      : ' Consider setting up automatic payments to stay on top of your bills.'}
                  </p>
                </div>
              )}

              {(!billsAnalytics?.totalBills ||
                billsAnalytics.totalBills === 0) && (
                <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-l-indigo-500">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Get started:</span> Add your
                    recurring bills and expenses with due dates to track them
                    here. This helps you stay on top of your financial
                    obligations.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Discretionary Breakdown Modal */}
      <Modal
        isOpen={showDiscretionaryBreakdown}
        onClose={() => {
          setShowDiscretionaryBreakdown(false);
          setDiscretionaryDetail(null);
          setDiscretionaryDate('');
          setSelectedDonutCategoryId(null);
        }}
        title="Discretionary Spending Breakdown"
        size="xl">
        <div className="p-6 space-y-6">
          {/* Date selector — change the day to view other periods */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Viewing
            </label>
            <DatePicker
              value={discretionaryDate}
              onChange={handleDiscretionaryDateChange}
              max={todayISO}
              placeholder="Select a date"
            />
          </div>

          {/* Summary Card — scoped to the selected period */}
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-indigo-700">
              {formatCurrency(
                discretionaryDetail?.totalDiscretionaryAmount ?? 0,
              )}
            </p>
            <p className="text-sm text-indigo-600 mt-1">
              in discretionary spending
            </p>
          </div>

          {discretionaryDetailLoading ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Loading breakdown…
            </div>
          ) : discretionaryCategories.length > 0 ? (
            <>
              {/* Category Breakdown with Visual Chart */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4">
                  Category Breakdown
                </h4>

                <div className="flex flex-col sm:flex-row gap-5">
                  {/* Cutout Donut — click a slice to drill into its subcategories */}
                  <div className="relative w-44 h-44 shrink-0 mx-auto sm:mx-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <g transform="translate(50 50)">
                        {donutSegments.map(seg =>
                          seg.d ? (
                            <path
                              key={seg.id}
                              d={seg.d}
                              fill={seg.color}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                              strokeLinejoin="round"
                              onClick={() =>
                                setSelectedDonutCategoryId(prev =>
                                  prev === seg.id ? null : seg.id,
                                )
                              }
                              className="cursor-pointer transition-opacity"
                              style={{
                                opacity:
                                  selectedDonutCategoryId &&
                                  selectedDonutCategoryId !== seg.id
                                    ? 0.3
                                    : 1,
                              }}
                            />
                          ) : null,
                        )}
                      </g>
                    </svg>

                    {/* Per-slice percentage labels, sitting on each section */}
                    {donutSegments.map(seg =>
                      seg.percentage >= 7 ? (
                        <span
                          key={`label-${seg.id}`}
                          className="absolute text-[10px] font-semibold text-white -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity"
                          style={{
                            left: `${seg.labelX}%`,
                            top: `${seg.labelY}%`,
                            textShadow: '0 1px 2px rgba(0,0,0,0.35)',
                            opacity:
                              selectedDonutCategoryId &&
                              selectedDonutCategoryId !== seg.id
                                ? 0.3
                                : 1,
                          }}>
                          {seg.percentage.toFixed(0)}%
                        </span>
                      ) : null,
                    )}

                    {/* Center cutout */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-gray-900 leading-none">
                        {discretionaryCategories.length}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        Categories
                      </span>
                    </div>
                  </div>

                  {/* Right panel: category list, or selected category's subcategories */}
                  <div className="flex-1 min-w-0">
                    {selectedDonutCategory ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => setSelectedDonutCategoryId(null)}
                          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 mb-3">
                          <ChevronLeft className="w-3.5 h-3.5" />
                          All categories
                        </button>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2 min-w-0">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  selectedDonutCategory.categoryColor ||
                                  '#6366F1',
                              }}
                            />
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {selectedDonutCategory.categoryName}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 shrink-0">
                            {formatCurrency(selectedDonutCategory.amount)}
                          </span>
                        </div>
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {selectedLineItems.length > 0 ? (
                            selectedLineItems.map(item => (
                              <div
                                key={item.key}
                                className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                                <span className="text-sm text-gray-700 truncate">
                                  {item.label}
                                </span>
                                <span className="text-sm font-medium text-gray-900 shrink-0 ml-2">
                                  {formatCurrency(item.amount)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 py-4 text-center">
                              No line items for this category.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {discretionaryCategories.slice(0, 8).map(category => (
                          <button
                            type="button"
                            key={category.categoryId}
                            onClick={() =>
                              setSelectedDonutCategoryId(category.categoryId)
                            }
                            className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div
                                className="w-4 h-4 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    category.categoryColor || '#6366F1',
                                }}
                              />
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {category.categoryName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-sm font-semibold text-gray-900">
                                {formatCurrency(category.amount)}
                              </span>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Spending Insights */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Insights
                </h4>
                <div className="space-y-2">
                  <div className="p-3 bg-amber-50 rounded-lg border-l-4 border-l-amber-500">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Top category:</span>{' '}
                      {discretionaryCategories[0].categoryName} accounts for{' '}
                      {discretionaryCategories[0].percentage.toFixed(0)}% of
                      your discretionary spending
                    </p>
                  </div>
                  {discretionaryDetail?.previousPeriod &&
                    discretionaryDetail.previousPeriod.percentageChange !==
                      0 && (
                      <div
                        className={`p-3 rounded-lg border-l-4 ${
                          discretionaryDetail.previousPeriod.percentageChange >
                          0
                            ? 'bg-red-50 border-l-red-500'
                            : 'bg-green-50 border-l-green-500'
                        }`}>
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Trend:</span>{' '}
                          Discretionary spending is{' '}
                          {Math.abs(
                            discretionaryDetail.previousPeriod.percentageChange,
                          ).toFixed(1)}
                          %{' '}
                          {discretionaryDetail.previousPeriod.percentageChange >
                          0
                            ? 'higher'
                            : 'lower'}{' '}
                          than the previous period
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-sm text-gray-500">
              No discretionary spending found for this period.
            </div>
          )}
        </div>
      </Modal>

      {/* Spending Velocity Breakdown Modal */}
      <Modal
        isOpen={showVelocityBreakdown}
        onClose={() => setShowVelocityBreakdown(false)}
        title="Spending Velocity Details"
        size="lg">
        <div className="p-6 space-y-6">
          {analytics?.spendingVelocity && (
            <>
              {/* Status Badge */}
              <div className="flex justify-center">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    analytics.spendingVelocity.velocityStatus === 'ON_TRACK'
                      ? 'bg-green-100 text-green-700'
                      : analytics.spendingVelocity.velocityStatus ===
                        'SLIGHTLY_HIGH'
                      ? 'bg-yellow-100 text-yellow-700'
                      : analytics.spendingVelocity.velocityStatus === 'HIGH'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                  {analytics.spendingVelocity.velocityStatus.replace('_', ' ')}
                </span>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">
                    Current Month Spent
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(
                      analytics.spendingVelocity.currentMonthSpent,
                    )}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">
                    Projected Monthly
                  </p>
                  <p className="text-xl font-bold text-indigo-600">
                    {formatCurrency(
                      analytics.spendingVelocity.projectedMonthlySpending,
                    )}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Daily Average</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(analytics.spendingVelocity.dailyAverage)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-green-600 mb-1">
                    Recommended Daily
                  </p>
                  <p className="text-xl font-bold text-green-700">
                    {formatCurrency(
                      analytics.spendingVelocity.recommendedDailySpending,
                    )}
                  </p>
                </div>
              </div>

              {/* Progress Indicator */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Day {analytics.spendingVelocity.daysElapsed}</span>
                  <span>Day {analytics.spendingVelocity.daysInMonth}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-indigo-500 transition-all"
                    style={{
                      width: `${
                        (analytics.spendingVelocity.daysElapsed /
                          analytics.spendingVelocity.daysInMonth) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {analytics.spendingVelocity.daysInMonth -
                    analytics.spendingVelocity.daysElapsed}{' '}
                  days remaining this month
                </p>
              </div>

              {/* Daily Burn Rate (if available) */}
              {analytics.dailyBurnRate && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Daily Burn Rate
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Current Rate</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(
                          analytics.dailyBurnRate.currentDailyBurnRate,
                        )}
                        /day
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Sustainable Rate</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(
                          analytics.dailyBurnRate.sustainableDailyRate,
                        )}
                        /day
                      </p>
                    </div>
                  </div>
                  {analytics.dailyBurnRate.daysUntilBudgetExceeded !== null && (
                    <div
                      className={`mt-3 p-3 rounded-lg ${
                        analytics.dailyBurnRate.daysUntilBudgetExceeded <= 7
                          ? 'bg-red-50 border border-red-200'
                          : analytics.dailyBurnRate.daysUntilBudgetExceeded <=
                            14
                          ? 'bg-yellow-50 border border-yellow-200'
                          : 'bg-green-50 border border-green-200'
                      }`}>
                      <p className="text-sm text-center">
                        At current rate, budget will be exceeded in{' '}
                        <span className="font-bold">
                          {analytics.dailyBurnRate.daysUntilBudgetExceeded} days
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Recommendations */}
              <div className="bg-indigo-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-indigo-900 mb-2">
                  Recommendation
                </h4>
                <p className="text-sm text-indigo-700">
                  {analytics.spendingVelocity.velocityStatus === 'ON_TRACK'
                    ? "You're doing great! Keep maintaining your current spending pace."
                    : analytics.spendingVelocity.velocityStatus ===
                      'SLIGHTLY_HIGH'
                    ? `Try to keep daily spending under ${formatCurrency(
                        analytics.spendingVelocity.recommendedDailySpending,
                      )} to stay on track.`
                    : `Consider reducing daily spending to ${formatCurrency(
                        analytics.spendingVelocity.recommendedDailySpending,
                      )} to avoid overspending this month.`}
                </p>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
