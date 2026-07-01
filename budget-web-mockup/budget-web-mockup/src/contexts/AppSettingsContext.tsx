'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { storage } from '@/lib/storage';
import { API_CONFIG } from '@/config/api.config';
import { useAuth } from './AuthContext';

interface ModuleSettings {
  pokerTracker: boolean;
}

interface AppSettings {
  currency: string;
  notifications: boolean;
  darkMode: boolean;
  compactView: boolean;
  modules: ModuleSettings;
}

interface AppSettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => void;
}

const defaultSettings: AppSettings = {
  currency: 'AUD',
  notifications: true,
  darkMode: false,
  compactView: false,
  modules: {
    pokerTracker: false,
  },
};

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, updateProfile } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const initializedFromUser = useRef(false);

  // Load settings from storage on mount
  useEffect(() => {
    const savedSettings = storage.get<AppSettings>(API_CONFIG.storageKeys.appSettings);
    if (savedSettings) {
      // Deep-merge `modules` so new modules added later keep their defaults
      // even when older saved settings predate them.
      setSettings({
        ...defaultSettings,
        ...savedSettings,
        modules: { ...defaultSettings.modules, ...savedSettings.modules },
      });
    }
    setIsLoaded(true);
  }, []);

  // Sync currency and module toggles from the user profile (backend is the
  // source of truth, so settings carry across devices and platforms).
  useEffect(() => {
    if (!user || initializedFromUser.current) return;
    setSettings((prev) => ({
      ...prev,
      ...(user.currency ? { currency: user.currency } : {}),
      modules: { ...prev.modules, ...(user.moduleSettings || {}) },
    }));
    // Only mark settings "initialized" once the authoritative profile (which
    // carries moduleSettings) has loaded. Some auth responses omit it, and
    // latching on that empty value would pin module toggles to their defaults.
    if (user.moduleSettings) {
      initializedFromUser.current = true;
    }
  }, [user]);

  // Save non-backend settings to storage when they change
  useEffect(() => {
    if (isLoaded) {
      storage.set(API_CONFIG.storageKeys.appSettings, settings);
    }
  }, [settings, isLoaded]);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    // If currency is being updated, sync to backend
    if (updates.currency && updates.currency !== settings.currency) {
      try {
        await updateProfile({ currency: updates.currency });
      } catch (error) {
        console.error('Failed to update currency on backend:', error);
        throw error;
      }
    }
    // Persist module toggles to the backend so they sync across devices and
    // platforms (the backend merges last-write-wins per module).
    if (updates.modules) {
      try {
        await updateProfile({ moduleSettings: { ...updates.modules } });
      } catch (error) {
        console.error('Failed to update module settings on backend:', error);
        throw error;
      }
    }
    setSettings((prev) => ({ ...prev, ...updates }));
  }, [settings.currency, updateProfile]);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    storage.remove(API_CONFIG.storageKeys.appSettings);
  }, []);

  const value: AppSettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
  };

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsContextType {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}
