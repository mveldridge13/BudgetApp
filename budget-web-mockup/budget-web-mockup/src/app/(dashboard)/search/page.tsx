'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {ArrowLeftRight, Target, Tag} from 'lucide-react';
import Fuse from 'fuse.js';
import {transactionService, categoryService, goalService} from '@/services';
import {Spinner} from '@/components/ui';
import type {Transaction, Category, GoalDisplay} from '@/types';

// Shared fuzzy-match config: typo-tolerant but still precise, and matches
// anywhere in the string (not just near the start).
const FUSE_OPTIONS = {threshold: 0.3, ignoreLocation: true, minMatchCharLength: 2};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') || '').trim();

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<GoalDisplay[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [txns, cats, gls] = await Promise.all([
        transactionService.getTransactions().catch(() => [] as Transaction[]),
        categoryService.getCategories().catch(() => [] as Category[]),
        goalService.getGoals().catch(() => [] as GoalDisplay[]),
      ]);
      if (!active) return;
      setTransactions(txns);
      setCategories(cats.filter((c) => !c.isArchived));
      setGoals(gls);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
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
    () => new Fuse(goals, {...FUSE_OPTIONS, keys: ['title', 'description']}),
    [goals],
  );
  const categoryFuse = useMemo(
    () => new Fuse(categories, {...FUSE_OPTIONS, keys: ['name']}),
    [categories],
  );

  const results = useMemo(() => {
    if (!query) return {transactions: [], goals: [], categories: []};
    return {
      transactions: txnFuse.search(query).map((r) => r.item),
      goals: goalFuse.search(query).map((r) => r.item),
      categories: categoryFuse.search(query).map((r) => r.item),
    };
  }, [query, txnFuse, goalFuse, categoryFuse]);

  const total =
    results.transactions.length +
    results.goals.length +
    results.categories.length;

  const q = encodeURIComponent(query);

  const formatAmount = (amount: number) =>
    `$${Math.abs(amount).toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // Format a transaction date for the results list. Returns '' for missing or
  // unparseable dates so the row omits the date rather than showing "Invalid Date".
  const formatDate = (date?: string) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Search</h1>
        <p className="text-gray-600 mt-1">
          {query ? (
            <>
              {total} result{total === 1 ? '' : 's'} for{' '}
              <span className="font-medium text-gray-900">
                &ldquo;{query}&rdquo;
              </span>
            </>
          ) : (
            'Type a search term in the bar above to find transactions, goals, and categories.'
          )}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : !query ? null : total === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          No results for &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div className="space-y-6">
          {results.transactions.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Transactions ({results.transactions.length})
                </h2>
                <Link
                  href={`/transactions?q=${q}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  View in Transactions
                </Link>
              </div>
              <ul className="divide-y divide-gray-50">
                {results.transactions.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/transactions?txn=${t.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <ArrowLeftRight className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-sm text-gray-900">
                          {t.description || 'Transaction'}
                          {(txnSubcategoryName(t) || txnCategoryName(t)) && (
                            <span className="text-gray-400">
                              {' · '}
                              {txnSubcategoryName(t) || txnCategoryName(t)}
                            </span>
                          )}
                        </span>
                        {formatDate(t.date) && (
                          <span className="block text-xs text-gray-400">
                            {formatDate(t.date)}
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-medium text-gray-700 shrink-0">
                        {formatAmount(t.amount)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.goals.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Goals ({results.goals.length})
                </h2>
                <Link
                  href={`/goals?q=${q}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  View in Goals
                </Link>
              </div>
              <ul className="divide-y divide-gray-50">
                {results.goals.map((g) => (
                  <li key={g.id}>
                    <Link
                      href={`/goals?q=${q}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <Target className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="flex-1 truncate text-sm text-gray-900">
                        {g.title}
                      </span>
                      <span className="text-xs text-gray-400 capitalize shrink-0">
                        {g.type}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.categories.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Categories ({results.categories.length})
                </h2>
                <Link
                  href={`/categories?q=${q}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  View in Categories
                </Link>
              </div>
              <ul className="divide-y divide-gray-50">
                {results.categories.map((c) => {
                  const parentName = c.parentId
                    ? categoryNameById.get(c.parentId)
                    : undefined;
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/categories?q=${q}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                        <Tag
                          className="w-4 h-4 shrink-0"
                          style={{color: c.color || '#9ca3af'}}
                        />
                        <span className="flex-1 truncate text-sm text-gray-900">
                          {c.name}
                          {parentName && (
                            <span className="text-gray-400">
                              {' · in '}
                              {parentName}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-gray-400 shrink-0">
                          {c.parentId ? 'Subcategory' : 'Category'}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
