'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, ArrowLeftRight, Target, Tag } from 'lucide-react';
import Fuse from 'fuse.js';
import { transactionService, categoryService, goalService } from '@/services';
import type { Transaction, Category, GoalDisplay } from '@/types';

const MAX_PER_GROUP = 5;

// Shared fuzzy-match config: typo-tolerant but still precise, and matches
// anywhere in the string (not just near the start).
const FUSE_OPTIONS = { threshold: 0.3, ignoreLocation: true, minMatchCharLength: 2 };

export default function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<GoalDisplay[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy-load the datasets the first time the user focuses the search, so the
  // header doesn't fetch on every page load.
  const loadData = async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const [txns, cats, gls] = await Promise.all([
        transactionService.getTransactions().catch(() => [] as Transaction[]),
        categoryService.getCategories().catch(() => [] as Category[]),
        goalService.getGoals().catch(() => [] as GoalDisplay[]),
      ]);
      setTransactions(txns);
      setCategories(cats.filter((c) => !c.isArchived));
      setGoals(gls);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  // Mirror the active search term from the URL. This clears the input when the
  // user navigates to a page without a search filter (or clears the filter),
  // and keeps it in sync when viewing results for a given term.
  useEffect(() => {
    setQuery(urlQuery);
    setOpen(false);
  }, [pathname, urlQuery]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // The raw /transactions response only carries categoryId/subcategoryId; the
  // human-readable names live on the categories list, so resolve them here.
  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const txnCategoryName = (t: Transaction) =>
    t.categoryName ||
    categoryNameById.get((t.categoryId || t.category) as string);
  const txnSubcategoryName = (t: Transaction) =>
    t.subcategoryName ||
    categoryNameById.get((t.subcategoryId || t.subcategory) as string);

  // Enrich transactions with resolved category names so Fuse can match on them.
  const enrichedTransactions = useMemo(
    () =>
      transactions.map((t) => ({
        ...t,
        searchCategoryName: txnCategoryName(t) || '',
        searchSubcategoryName: txnSubcategoryName(t) || '',
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, categoryNameById],
  );

  const txnFuse = useMemo(
    () =>
      new Fuse(enrichedTransactions, {
        ...FUSE_OPTIONS,
        keys: ['description', 'searchCategoryName', 'searchSubcategoryName'],
      }),
    [enrichedTransactions],
  );
  const goalFuse = useMemo(
    () => new Fuse(goals, { ...FUSE_OPTIONS, keys: ['title'] }),
    [goals],
  );
  const categoryFuse = useMemo(
    () => new Fuse(categories, { ...FUSE_OPTIONS, keys: ['name'] }),
    [categories],
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return { transactions: [], goals: [], categories: [] };
    return {
      transactions: txnFuse.search(q).slice(0, MAX_PER_GROUP).map((r) => r.item),
      goals: goalFuse.search(q).slice(0, MAX_PER_GROUP).map((r) => r.item),
      categories: categoryFuse.search(q).slice(0, MAX_PER_GROUP).map((r) => r.item),
    };
  }, [query, txnFuse, goalFuse, categoryFuse]);

  const hasResults =
    results.transactions.length > 0 ||
    results.goals.length > 0 ||
    results.categories.length > 0;

  const go = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  const formatAmount = (amount: number) =>
    `$${Math.abs(amount).toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const q = encodeURIComponent(query.trim());

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          placeholder="Search transactions, goals, categories..."
          onFocus={() => {
            setOpen(true);
            loadData();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              e.currentTarget.blur();
            } else if (e.key === 'Enter') {
              const term = query.trim();
              if (!term) return;
              setOpen(false);
              e.currentTarget.blur();
              router.push(`/search?q=${encodeURIComponent(term)}`);
            }
          }}
          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {open && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50 max-h-[70vh] overflow-y-auto">
          {loading && !loaded ? (
            <p className="px-4 py-3 text-sm text-gray-500">Searching…</p>
          ) : !hasResults ? (
            <p className="px-4 py-3 text-sm text-gray-500">
              No results for &ldquo;{query.trim()}&rdquo;
            </p>
          ) : (
            <>
              {results.transactions.length > 0 && (
                <div className="py-1">
                  <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Transactions
                  </p>
                  {results.transactions.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => go(`/transactions?q=${q}`)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <ArrowLeftRight className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="flex-1 truncate text-sm text-gray-900">
                        {t.description || 'Transaction'}
                        {(txnSubcategoryName(t) || txnCategoryName(t)) && (
                          <span className="text-gray-400">
                            {' · '}
                            {txnSubcategoryName(t) || txnCategoryName(t)}
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-medium text-gray-700 shrink-0">
                        {formatAmount(t.amount)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {results.goals.length > 0 && (
                <div className="py-1">
                  <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Goals
                  </p>
                  {results.goals.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => go(`/goals?q=${q}`)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <Target className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="flex-1 truncate text-sm text-gray-900">
                        {g.title}
                      </span>
                      <span className="text-xs text-gray-400 capitalize shrink-0">
                        {g.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {results.categories.length > 0 && (
                <div className="py-1">
                  <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Categories
                  </p>
                  {results.categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => go(`/categories?q=${q}`)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <Tag className="w-4 h-4 shrink-0" style={{ color: c.color || '#9ca3af' }} />
                      <span className="flex-1 truncate text-sm text-gray-900">
                        {c.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={() => go(`/search?q=${q}`)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors">
                  <Search className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="flex-1 truncate text-sm font-medium text-indigo-600">
                    See all results for &ldquo;{query.trim()}&rdquo;
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
