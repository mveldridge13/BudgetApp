'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { useUser } from '@/hooks/useUser';
import Link from 'next/link';

export default function SettingsPage() {
  const { user } = useAuth();
  const { settings, updateSettings } = useAppSettings();
  const { income, updateIncome } = useUser();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences.</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
          <Link
            href="/settings/profile"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Edit
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-bold text-xl">
              {user?.firstName?.[0] || 'U'}
              {user?.lastName?.[0] || ''}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h2>
        <div className="space-y-4">
          {/* Currency */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Currency</p>
              <p className="text-sm text-gray-500">Your preferred currency</p>
            </div>
            <select
              value={settings.currency}
              onChange={(e) => updateSettings({ currency: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="USD">USD ($)</option>
              <option value="AUD">AUD ($)</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>

          {/* Pay Period (from backend income frequency) */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Pay Period</p>
              <p className="text-sm text-gray-500">How often you get paid</p>
            </div>
            <select
              value={income?.frequency || 'MONTHLY'}
              onChange={async (e) => {
                const newFrequency = e.target.value as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'YEARLY';
                if (income) {
                  try {
                    await updateIncome({
                      amount: income.amount,
                      frequency: newFrequency,
                      source: income.source,
                    });
                  } catch (error) {
                    console.error('Failed to update pay period:', error);
                    alert('Failed to update pay period. Please try again.');
                  }
                }
              }}
              disabled={!income}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="WEEKLY">Weekly</option>
              <option value="FORTNIGHTLY">Fortnightly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Notifications</p>
              <p className="text-sm text-gray-500">Receive budget alerts</p>
            </div>
            <button
              onClick={() => updateSettings({ notifications: !settings.notifications })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notifications ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Compact View */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Compact View</p>
              <p className="text-sm text-gray-500">Show more items per page</p>
            </div>
            <button
              onClick={() => updateSettings({ compactView: !settings.compactView })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.compactView ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.compactView ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Export Data</p>
              <p className="text-sm text-gray-500">Download all your data</p>
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Export
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Delete Account</p>
              <p className="text-sm text-gray-500">Permanently delete your account</p>
            </div>
            <button className="px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
