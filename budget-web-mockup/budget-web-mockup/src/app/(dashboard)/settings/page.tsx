'use client';

import {useEffect, useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {useAppSettings} from '@/contexts/AppSettingsContext';
import {useUser} from '@/hooks/useUser';
import {authService} from '@/services/auth.service';
import CustomDropdown from '@/components/ui/CustomDropdown';

type TabId =
  | 'profile'
  | 'notifications'
  | 'appearance'
  | 'billing'
  | 'modules'
  | 'security';

const TABS: {id: TabId; label: string; icon: React.ReactNode}[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828L13 14.586"
        />
      </svg>
    ),
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
  },
  {
    id: 'modules',
    label: 'Additional Modules',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    ),
  },
  {
    id: 'security',
    label: 'Security',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3l7 4v5c0 4.418-3.134 8.166-7 9-3.866-.834-7-4.582-7-9V7l7-4z"
        />
      </svg>
    ),
  },
];

export default function SettingsPage() {
  const {user, updateProfile, isUpdatingProfile} = useAuth();
  const {settings, updateSettings} = useAppSettings();
  const {income, updateIncome} = useUser();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  // Inline profile editing (merged from the former /settings/profile page).
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // `user` loads asynchronously, so sync the editable fields once it arrives
  // (and whenever the saved name changes). Depend only on the name fields so an
  // unrelated profile update doesn't discard in-progress edits.
  useEffect(() => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
  }, [user?.firstName, user?.lastName]);

  // Only the name fields belong to the Save Changes button (currency/pay period
  // auto-save). The button stays grey until one of them differs from the saved value.
  const isProfileDirty =
    firstName !== (user?.firstName || '') ||
    lastName !== (user?.lastName || '');

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    if (!firstName || !lastName) {
      setProfileError('Please fill in all fields');
      return;
    }

    try {
      await updateProfile({firstName, lastName});
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'Failed to update profile',
      );
    }
  };

  // Change password (Security tab) — hits the same POST /auth/change-password
  // endpoint as the mobile app.
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const isPasswordDirty =
    currentPassword !== '' || newPassword !== '' || confirmPassword !== '';

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all fields');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordSaving(true);
    try {
      await authService.changePassword({currentPassword, newPassword});
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : 'Failed to change password',
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account and preferences.
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 -mb-px">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'text-indigo-600 border-indigo-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}>
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <form
          onSubmit={handleProfileSubmit}
          className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Profile Information
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Update your personal information and preferences.
            </p>
          </div>

          {profileError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-6">
              Profile updated successfully!
            </div>
          )}

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-600 font-bold text-xl">
                {firstName?.[0] || 'U'}
                {lastName?.[0] || ''}
              </span>
            </div>
            <div>
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Change Photo
              </button>
              <p className="text-xs text-gray-500 mt-1.5">
                JPG, PNG or GIF. Max 2MB.
              </p>
            </div>
          </div>

          {/* Name + email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">
                Email cannot be changed
              </p>
            </div>
          </div>

          {/* Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Currency
              </label>
              <CustomDropdown
                value={settings.currency}
                options={[
                  {value: 'AUD', label: 'AUD ($)'},
                  {value: 'USD', label: 'USD ($)'},
                  {value: 'EUR', label: 'EUR (€)'},
                  {value: 'GBP', label: 'GBP (£)'},
                  {value: 'CAD', label: 'CAD ($)'},
                  {value: 'NZD', label: 'NZD ($)'},
                ]}
                onChange={async value => {
                  try {
                    await updateSettings({currency: value});
                  } catch (error) {
                    console.error('Failed to update currency:', error);
                    alert('Failed to update currency. Please try again.');
                  }
                }}
              />
            </div>

            {/* Pay Period (from backend income frequency) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Pay Period
              </label>
              <CustomDropdown
                value={
                  income?.incomeFrequency || income?.frequency || 'MONTHLY'
                }
                options={[
                  {value: 'WEEKLY', label: 'Weekly'},
                  {value: 'FORTNIGHTLY', label: 'Fortnightly'},
                  {value: 'MONTHLY', label: 'Monthly'},
                  {value: 'YEARLY', label: 'Yearly'},
                ]}
                onChange={async value => {
                  const newFrequency = value as
                    | 'WEEKLY'
                    | 'FORTNIGHTLY'
                    | 'MONTHLY'
                    | 'YEARLY';
                  if (income) {
                    try {
                      await updateIncome({
                        amount: income.income || income.amount,
                        income: income.income || income.amount,
                        incomeFrequency: newFrequency,
                        source: income.source,
                        nextPayDate: income.nextPayDate,
                      });
                    } catch (error) {
                      console.error('Failed to update pay period:', error);
                      alert('Failed to update pay period. Please try again.');
                    }
                  }
                }}
                disabled={!income}
              />
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={!isProfileDirty || isUpdatingProfile}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                isProfileDirty && !isUpdatingProfile
                  ? 'text-white hover:shadow-lg cursor-pointer'
                  : 'text-gray-500 bg-gray-200 cursor-not-allowed'
              }`}
              style={
                isProfileDirty && !isUpdatingProfile
                  ? {
                      backgroundColor: '#6366f1',
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)',
                    }
                  : undefined
              }>
              {isUpdatingProfile ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* Notifications tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Notifications
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Choose how you want to be notified.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Budget alerts</p>
              <p className="text-sm text-gray-500">Receive budget alerts</p>
            </div>
            <button
              onClick={() =>
                updateSettings({notifications: !settings.notifications})
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notifications ? 'bg-indigo-600' : 'bg-gray-200'
              }`}>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Appearance tab */}
      {activeTab === 'appearance' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Customize how the app looks and feels.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Compact View</p>
              <p className="text-sm text-gray-500">Show more items per page</p>
            </div>
            <button
              onClick={() =>
                updateSettings({compactView: !settings.compactView})
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.compactView ? 'bg-indigo-600' : 'bg-gray-200'
              }`}>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.compactView ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Billing tab */}
      {activeTab === 'billing' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Billing</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage your plan and payment methods.
            </p>
          </div>
          <div className="text-center py-8 text-sm text-gray-500">
            Billing options will be available here soon.
          </div>
        </div>
      )}

      {/* Additional Modules tab */}
      {activeTab === 'modules' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Additional Modules
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Enable optional features to tailor the app to how you use it.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3h14a1 1 0 011 1v3a4 4 0 01-4 4h-1.528a4.002 4.002 0 01-2.944 2.92V17h3a1 1 0 011 1v2a1 1 0 01-1 1H7a1 1 0 01-1-1v-2a1 1 0 011-1h3v-3.08A4.002 4.002 0 017.528 11H6a4 4 0 01-4-4V4a1 1 0 011-1z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Poker Tracker</p>
                <p className="text-sm text-gray-500">
                  Track poker tournaments, events, and profitability.
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                updateSettings({
                  modules: {
                    ...settings.modules,
                    pokerTracker: !settings.modules.pokerTracker,
                  },
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                settings.modules.pokerTracker ? 'bg-indigo-600' : 'bg-gray-200'
              }`}>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.modules.pokerTracker
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Security tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Change Password */}
          <form
            onSubmit={handlePasswordSubmit}
            className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Change Password
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Update the password you use to sign in.
              </p>
            </div>

            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-6">
                Password changed successfully!
              </div>
            )}

            <div className="space-y-4">
              <div className="max-w-sm">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="submit"
                disabled={!isPasswordDirty || passwordSaving}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                  isPasswordDirty && !passwordSaving
                    ? 'text-white hover:shadow-lg cursor-pointer'
                    : 'text-gray-500 bg-gray-200 cursor-not-allowed'
                }`}
                style={
                  isPasswordDirty && !passwordSaving
                    ? {
                        backgroundColor: '#6366f1',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)',
                      }
                    : undefined
                }>
                {passwordSaving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>

          {/* Danger Zone */}
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-red-600">
                Danger Zone
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage your data and account.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Export Data</p>
                  <p className="text-sm text-gray-500">
                    Download all your data
                  </p>
                </div>
                <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Export
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Delete Account</p>
                  <p className="text-sm text-gray-500">
                    Permanently delete your account
                  </p>
                </div>
                <button className="px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
