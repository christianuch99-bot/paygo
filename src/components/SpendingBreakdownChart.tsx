import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { ArrowUpRight, BarChart3, ChevronLeft, ChevronRight, PieChart as PieChartIcon } from 'lucide-react';
import { Transaction, ViewState } from '../types';

interface SpendingBreakdownChartProps {
  transactions: Transaction[];
  onNavigate: (view: ViewState) => void;
}

type SpendingCategoryKey =
  | 'Transfer'
  | 'Bill Payment'
  | 'Gift Card Purchase'
  | 'PAY ID Purchase'
  | 'Account Upgrade'
  | 'Other Spending';

interface CategoryMeta {
  key: SpendingCategoryKey;
  label: string;
  color: string;
}

const SPENDING_CATEGORIES: CategoryMeta[] = [
  { key: 'Transfer', label: 'Transfers', color: '#F59E0B' },
  { key: 'Bill Payment', label: 'Bill Payments', color: '#10B981' },
  { key: 'Gift Card Purchase', label: 'Gift Cards', color: '#A855F7' },
  { key: 'PAY ID Purchase', label: 'PAY ID', color: '#38BDF8' },
  { key: 'Account Upgrade', label: 'Tier Upgrades', color: '#F43F5E' },
  { key: 'Other Spending', label: 'Other', color: '#94A3B8' },
];

const CREDIT_TYPES = new Set([
  'Welcome Bonus',
  'Card Deposit',
  'ATM Card Deposit',
  'Referral Withdrawal',
]);

const normalizeSpendingCategory = (type: string): SpendingCategoryKey | null => {
  if (CREDIT_TYPES.has(type)) return null;
  if (type === 'Transfer') return 'Transfer';
  if (type === 'Bill Payment') return 'Bill Payment';
  if (type === 'Gift Card Purchase') return 'Gift Card Purchase';
  if (type === 'PAY ID Purchase' || type === 'PAY ID Verification' || type === 'PAY ID Card Purchase') {
    return 'PAY ID Purchase';
  }
  if (type === 'Account Upgrade') return 'Account Upgrade';
  return 'Other Spending';
};

const parseTransactionDate = (rawDate: string): Date => {
  const parsed = new Date(rawDate);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  // Fallback for DD/MM/YYYY locales
  const match = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const d = new Date(year, month, day);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
};

const toMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const formatMonthLabel = (monthKey: string, style: 'long' | 'short' = 'long'): string => {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const d = new Date(year, month, 1);
  return d.toLocaleDateString('en-US', {
    month: style === 'long' ? 'long' : 'short',
    year: style === 'long' ? 'numeric' : '2-digit',
  });
};

const formatCurrency = (val: number): string =>
  `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    payload?: {
      label?: string;
      amount?: number;
      percent?: number;
      count?: number;
      monthLabel?: string;
      color?: string;
    };
  }>;
  label?: string;
}

const CategoryTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-xl px-3.5 py-2.5 shadow-xl text-xs text-slate-100">
      <div className="flex items-center space-x-2 font-semibold text-white mb-1">
        <span
          className="w-2.5 h-2.5 rounded-sm shrink-0"
          style={{ backgroundColor: item.color || payload[0]?.color }}
        />
        <span>{item.label}</span>
      </div>
      <div className="font-mono tabular-nums font-bold text-white">
        {formatCurrency(item.amount ?? 0)}
      </div>
      <div className="text-[11px] text-slate-400 tabular-nums mt-0.5">
        {(item.percent ?? 0).toFixed(1)}% · {item.count ?? 0}{' '}
        {item.count === 1 ? 'transaction' : 'transactions'}
      </div>
    </div>
  );
};

const MonthlyTrendTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  const nonZero = payload.filter((entry) => (entry.value ?? 0) > 0);
  const total = nonZero.reduce((sum, entry) => sum + (entry.value ?? 0), 0);

  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-xl px-3.5 py-2.5 shadow-xl text-xs text-slate-100 min-w-[170px]">
      <div className="font-semibold text-white mb-1.5 pb-1.5 border-b border-white/10">
        {label}
      </div>
      {nonZero.length === 0 ? (
        <p className="text-slate-400">No spending recorded</p>
      ) : (
        <div className="space-y-1">
          {nonZero.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <span className="flex items-center space-x-1.5 text-slate-300">
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span>{entry.name}</span>
              </span>
              <span className="font-mono tabular-nums font-semibold text-white">
                {formatCurrency(entry.value ?? 0)}
              </span>
            </div>
          ))}
          <div className="pt-1.5 mt-1 border-t border-white/10 flex items-center justify-between gap-4 font-bold text-white">
            <span>Total</span>
            <span className="font-mono tabular-nums">{formatCurrency(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const SpendingBreakdownChart: React.FC<SpendingBreakdownChartProps> = ({
  transactions,
  onNavigate,
}) => {
  const [chartView, setChartView] = useState<'category' | 'trend'>('category');
  const [activeCategory, setActiveCategory] = useState<SpendingCategoryKey | null>(null);

  const currentMonthKey = useMemo(() => toMonthKey(new Date()), []);

  const spendingEntries = useMemo(() => {
    return transactions
      .map((tx) => {
        const category = normalizeSpendingCategory(tx.type);
        if (!category) return null;
        const dateObj = parseTransactionDate(tx.date);
        return {
          ...tx,
          category,
          monthKey: toMonthKey(dateObj),
          dateObj,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null && item.amount > 0);
  }, [transactions]);

  const availableMonths = useMemo(() => {
    const keys = new Set<string>([currentMonthKey]);
    spendingEntries.forEach((entry) => keys.add(entry.monthKey));
    return Array.from(keys).sort((a, b) => a.localeCompare(b));
  }, [spendingEntries, currentMonthKey]);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonthKey);

  const effectiveMonthKey = availableMonths.includes(selectedMonthKey)
    ? selectedMonthKey
    : availableMonths[availableMonths.length - 1];

  const monthIndex = availableMonths.indexOf(effectiveMonthKey);

  const monthlyCategoryData = useMemo(() => {
    const monthTx = spendingEntries.filter((entry) => entry.monthKey === effectiveMonthKey);
    const totalSpent = monthTx.reduce((sum, entry) => sum + entry.amount, 0);

    const grouped = SPENDING_CATEGORIES.map((meta) => {
      const matching = monthTx.filter((entry) => entry.category === meta.key);
      const amount = matching.reduce((sum, entry) => sum + entry.amount, 0);
      return {
        key: meta.key,
        label: meta.label,
        color: meta.color,
        amount,
        count: matching.length,
        percent: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
      };
    }).filter((item) => item.amount > 0);

    grouped.sort((a, b) => b.amount - a.amount);

    return {
      totalSpent,
      txCount: monthTx.length,
      categories: grouped,
      topCategory: grouped[0] || null,
    };
  }, [spendingEntries, effectiveMonthKey]);

  const monthlyTrendData = useMemo(() => {
    // Show up to the last 6 months (ending with latest available month)
    const now = new Date();
    const recentMonths: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      recentMonths.push(toMonthKey(d));
    }
    const mergedKeys = Array.from(new Set([...recentMonths, ...availableMonths]))
      .sort((a, b) => a.localeCompare(b))
      .slice(-6);

    return mergedKeys.map((mKey) => {
      const monthTx = spendingEntries.filter((entry) => entry.monthKey === mKey);
      const row: Record<string, string | number> = {
        monthKey: mKey,
        monthLabel: formatMonthLabel(mKey, 'short'),
      };
      for (const cat of SPENDING_CATEGORIES) {
        row[cat.key] = monthTx
          .filter((entry) => entry.category === cat.key)
          .reduce((sum, entry) => sum + entry.amount, 0);
      }
      return row;
    });
  }, [spendingEntries, availableMonths]);

  const handlePrevMonth = () => {
    if (monthIndex > 0) {
      setSelectedMonthKey(availableMonths[monthIndex - 1]);
      setActiveCategory(null);
    }
  };

  const handleNextMonth = () => {
    if (monthIndex < availableMonths.length - 1) {
      setSelectedMonthKey(availableMonths[monthIndex + 1]);
      setActiveCategory(null);
    }
  };

  const displayedCategories = activeCategory
    ? monthlyCategoryData.categories.filter((c) => c.key === activeCategory)
    : monthlyCategoryData.categories;

  return (
    <section
      aria-label="Monthly Spending Breakdown"
      className="bg-black/50 backdrop-blur-md rounded-2xl p-5 shadow-lg shadow-black/30 border border-white/10"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Monthly Spending Habits</h3>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 mt-1 tabular-nums">
            <span>{formatMonthLabel(effectiveMonthKey, 'long')}</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-200 font-semibold font-mono">
              {formatCurrency(monthlyCategoryData.totalSpent)} spent
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {monthlyCategoryData.txCount}{' '}
              {monthlyCategoryData.txCount === 1 ? 'transaction' : 'transactions'}
            </span>
          </div>
        </div>

        {/* Interactive Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/70 border border-white/10 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChartView('category')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              chartView === 'category'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            <span>By Category</span>
          </button>
          <button
            type="button"
            onClick={() => setChartView('trend')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              chartView === 'trend'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Monthly Trend</span>
          </button>
        </div>
      </div>

      {/* Month Navigator (when viewing By Category) */}
      {chartView === 'category' && availableMonths.length > 1 && (
        <div className="flex items-center justify-between py-2.5 border-b border-white/10 text-xs">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={monthIndex <= 0}
            className="min-h-[36px] px-2.5 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-35 disabled:pointer-events-none flex items-center space-x-1 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev Month</span>
          </button>
          <span className="font-semibold text-slate-200">
            {formatMonthLabel(effectiveMonthKey, 'long')}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            disabled={monthIndex >= availableMonths.length - 1}
            className="min-h-[36px] px-2.5 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-35 disabled:pointer-events-none flex items-center space-x-1 transition-colors cursor-pointer"
          >
            <span>Next Month</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Body Content */}
      {chartView === 'category' ? (
        monthlyCategoryData.categories.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-200">
              No spending recorded for {formatMonthLabel(effectiveMonthKey, 'long')}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Your monthly breakdown updates automatically whenever you pay bills, purchase gift cards, upgrade tiers, or transfer funds.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('bills')}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Pay a Bill
              </button>
              <button
                type="button"
                onClick={() => onNavigate('gift-cards')}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Buy Gift Card
              </button>
              <button
                type="button"
                onClick={() => onNavigate('transfer')}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-xs font-bold text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Make Transfer
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-5">
            {/* Donut Chart */}
            <div className="md:col-span-5 relative h-[220px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayedCategories}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={86}
                    paddingAngle={displayedCategories.length > 1 ? 3 : 0}
                    stroke="none"
                  >
                    {displayedCategories.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CategoryTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Summary Metric */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <span className="text-[11px] font-medium text-slate-400">
                  {activeCategory
                    ? SPENDING_CATEGORIES.find((c) => c.key === activeCategory)?.label
                    : 'Total Spent'}
                </span>
                <span className="text-base sm:text-lg font-black text-white font-mono tabular-nums mt-0.5">
                  {formatCurrency(
                    activeCategory
                      ? displayedCategories[0]?.amount ?? 0
                      : monthlyCategoryData.totalSpent
                  )}
                </span>
              </div>
            </div>

            {/* Category Breakdown Table */}
            <div className="md:col-span-7 divide-y divide-white/10">
              {monthlyCategoryData.categories.map((cat) => {
                const isSelected = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveCategory(isSelected ? null : cat.key)}
                    className={`w-full py-2.5 px-2 -mx-2 rounded-xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                      isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {cat.label}
                        </div>
                        <div className="text-xs text-slate-400 tabular-nums">
                          {cat.count} {cat.count === 1 ? 'item' : 'items'} · {cat.percent.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-white font-mono tabular-nums">
                        {formatCurrency(cat.amount)}
                      </div>
                    </div>
                  </button>
                );
              })}

              <div className="pt-3 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {activeCategory
                    ? 'Showing selected category'
                    : monthlyCategoryData.topCategory
                    ? `Top category: ${monthlyCategoryData.topCategory.label}`
                    : ''}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('transaction-history')}
                  className="text-amber-300 hover:text-amber-200 font-semibold flex items-center space-x-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Full History</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="pt-5 space-y-4">
          <div className="h-[230px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyTrendData}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`
                  }
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  content={<MonthlyTrendTooltip />}
                />
                {SPENDING_CATEGORIES.filter((c) => c.key !== 'Other Spending').map((cat) => (
                  <Bar
                    key={cat.key}
                    dataKey={cat.key}
                    name={cat.label}
                    stackId="spending"
                    fill={cat.color}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={36}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-300">
              {SPENDING_CATEGORIES.filter((c) => c.key !== 'Other Spending').map((cat) => (
                <span key={cat.key} className="inline-flex items-center space-x-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{cat.label}</span>
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onNavigate('transaction-history')}
              className="text-amber-300 hover:text-amber-200 font-semibold flex items-center space-x-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Full History</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
