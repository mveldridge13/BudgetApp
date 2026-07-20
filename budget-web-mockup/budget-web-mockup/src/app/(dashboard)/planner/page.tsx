'use client';

import {useMemo, useState} from 'react';
import useSWR from 'swr';
import {Plus, TrendingUp, AlertTriangle, Pencil} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {plannerService} from '@/services/planner.service';
import {formatCurrency} from '@/lib/formatters';
import {CreatePlanData, ForecastHorizonDays, Plan} from '@/types';
import ForecastChart from '@/components/planner/ForecastChart';
import PlanFormModal from '@/components/planner/PlanFormModal';
import ImpactSummaryCard from '@/components/planner/ImpactSummaryCard';
import MoneyTimeline from '@/components/planner/MoneyTimeline';

const HORIZONS: ForecastHorizonDays[] = [30, 60, 90];

export default function PlannerPage() {
  const {user} = useAuth();
  const currency = user?.currency || 'USD';

  const [horizon, setHorizon] = useState<ForecastHorizonDays>(30);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [bufferDraft, setBufferDraft] = useState('');
  const [activeTab, setActiveTab] = useState<'whatif' | 'moneyIn' | 'moneyOut'>('whatif');

  const {
    data: forecast,
    isLoading: forecastLoading,
    mutate: mutateForecast,
  } = useSWR(['planner-forecast', horizon], () =>
    plannerService.getForecast(horizon),
  );

  const {
    data: plans = [],
    mutate: mutatePlans,
  } = useSWR('planner-plans', () => plannerService.getPlans());

  const {data: settings, mutate: mutateSettings} = useSWR(
    'planner-settings',
    () => plannerService.getSettings(),
  );

  const activePlans = useMemo(
    () => plans.filter((p) => p.status === 'DRAFT' || p.status === 'PLANNED'),
    [plans],
  );

  const today = new Date().toISOString().slice(0, 10);
  const duePlans = useMemo(
    () =>
      plans.filter(
        (p) => p.status === 'PLANNED' && p.plannedDate.slice(0, 10) <= today,
      ),
    [plans, today],
  );

  const moneyInEvents = useMemo(
    () => (forecast?.events || []).filter((e) => e.direction === 'INFLOW'),
    [forecast],
  );
  const moneyOutEvents = useMemo(
    () => (forecast?.events || []).filter((e) => e.direction === 'OUTFLOW'),
    [forecast],
  );

  const refreshAll = () =>
    Promise.all([mutateForecast(), mutatePlans(), mutateSettings()]);

  const handleSavePlan = async (data: CreatePlanData) => {
    if (editingPlan) {
      await plannerService.updatePlan(editingPlan.id, data);
    } else {
      await plannerService.createPlan(data);
    }
    await refreshAll();
  };

  const handlePromote = async (id: string) => {
    await plannerService.promotePlan(id);
    await refreshAll();
  };

  const handleCancel = async (id: string) => {
    await plannerService.cancelPlan(id);
    await refreshAll();
  };

  const handleDelete = async (id: string) => {
    await plannerService.deletePlan(id);
    await refreshAll();
  };

  const handleComplete = async (id: string) => {
    await plannerService.completePlan(id);
    await refreshAll();
  };

  const openSettingsEditor = () => {
    setBufferDraft(settings?.safetyBufferAmount != null ? String(settings.safetyBufferAmount) : '');
    setEditingSettings(true);
  };

  const handleSaveSettings = async () => {
    const parsed = parseFloat(bufferDraft);
    if (bufferDraft === '' || Number.isNaN(parsed)) {
      setEditingSettings(false);
      return;
    }
    await plannerService.updateSettings({safetyBufferAmount: parsed});
    setEditingSettings(false);
    await mutateSettings();
    await mutateForecast();
  };

  const handleClearSettings = async () => {
    // Unconditional - ignores whatever's currently in the field. The editor
    // pre-fills with the current value, so relying on the user to manually
    // produce a truly-empty string (vs. leaving a stray "0") to signal
    // "clear" is fragile; this button removes that ambiguity entirely.
    await plannerService.updateSettings({clearSafetyBuffer: true});
    setBufferDraft('');
    setEditingSettings(false);
    await mutateSettings();
    await mutateForecast();
  };

  const todaysBalance = forecast?.dailyBalances[0]?.balance ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Planner</h1>
          <p className="text-sm text-gray-500">
            See how your balance is projected to change, and test what-if
            decisions before you make them.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPlan(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
        >
          <Plus className="h-4 w-4" />
          Add plan
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-gray-500">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              <span className="text-sm">Today&apos;s balance</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatCurrency(todaysBalance, currency)}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              Left to Spend + income-source surplus — updates automatically
            </p>
          </div>
          {editingSettings ? (
            <div className="flex items-end gap-3">
              <div>
                <label
                  htmlFor="safety-buffer-input"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Safety buffer
                </label>
                <input
                  id="safety-buffer-input"
                  name="safetyBuffer"
                  type="number"
                  step="0.01"
                  value={bufferDraft}
                  onChange={(e) => setBufferDraft(e.target.value)}
                  placeholder="0.00"
                  className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleSaveSettings}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
              >
                Save
              </button>
              {settings?.safetyBufferAmount != null && (
                <button
                  onClick={handleClearSettings}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setEditingSettings(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="text-right">
              <p className="text-sm text-gray-500">
                Safety buffer:{' '}
                <span className="font-medium text-gray-900">
                  {settings?.safetyBufferAmount != null
                    ? formatCurrency(settings.safetyBufferAmount, currency)
                    : 'Not set'}
                </span>
              </p>
              <button
                onClick={openSettingsEditor}
                className="mt-1 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            </div>
          )}
        </div>
      </div>

      {duePlans.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="text-sm font-medium">
              {duePlans.length} planned item{duePlans.length > 1 ? 's' : ''}{' '}
              {duePlans.length > 1 ? 'have' : 'has'} arrived
            </h3>
          </div>
          <ul className="mt-2 space-y-1.5">
            {duePlans.map((plan) => (
              <li
                key={plan.id}
                className="flex items-center justify-between text-sm text-amber-900"
              >
                <span>
                  {plan.description || plan.type} —{' '}
                  {formatCurrency(plan.amount, currency)}
                </span>
                <button
                  onClick={() => handleComplete(plan.id)}
                  className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200"
                >
                  Mark as completed
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Cash flow chart
          </h2>
          <div className="flex gap-2">
            {HORIZONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  horizon === h
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {h}D
              </button>
            ))}
          </div>
        </div>
        {forecastLoading ? (
          <div className="h-[320px] w-full animate-pulse rounded-lg bg-gray-50" />
        ) : (
          <ForecastChart
            dailyBalances={forecast?.dailyBalances || []}
            events={forecast?.events || []}
            safetyBufferAmount={settings?.safetyBufferAmount ?? null}
            plans={activePlans}
            currency={currency}
          />
        )}
        {forecast && forecast.breaches.length > 0 && (
          <p className="mt-3 text-sm text-red-600">
            Your projected balance dips below your safety buffer on{' '}
            {forecast.breaches.length} day
            {forecast.breaches.length > 1 ? 's' : ''} in this window.
          </p>
        )}
      </div>

      <ImpactSummaryCard
        forecast={forecast}
        activePlans={activePlans}
        currency={currency}
      />

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex border-b border-gray-100 px-6 pt-4">
          {(
            [
              {id: 'whatif' as const, label: 'What if'},
              {id: 'moneyIn' as const, label: 'Money in'},
              {id: 'moneyOut' as const, label: 'Money out'},
            ]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'whatif' &&
            (activePlans.length === 0 ? (
              <p className="text-sm text-gray-500">
                No plans yet. Add one to see how it changes your forecast.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {activePlans.map((plan) => (
                  <li
                    key={plan.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          plan.status === 'DRAFT'
                            ? 'border-2 border-indigo-300 bg-white'
                            : 'bg-indigo-500'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {plan.description || plan.type}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(plan.plannedDate).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          ·{' '}
                          {plan.direction === 'OUTFLOW' ? '-' : '+'}
                          {formatCurrency(plan.amount, currency)} ·{' '}
                          {plan.status === 'DRAFT' ? 'Exploring' : 'Planned'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {plan.status === 'DRAFT' && (
                        <button
                          onClick={() => handlePromote(plan.id)}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          Plan it
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingPlan(plan);
                          setShowForm(true);
                        }}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleCancel(plan.id)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="text-xs font-medium text-red-500 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ))}

          {activeTab === 'moneyIn' && (
            <MoneyTimeline events={moneyInEvents} plans={plans} currency={currency} />
          )}

          {activeTab === 'moneyOut' && (
            <MoneyTimeline events={moneyOutEvents} plans={plans} currency={currency} />
          )}
        </div>
      </div>

      <PlanFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSavePlan}
        editingPlan={editingPlan}
      />
    </div>
  );
}
