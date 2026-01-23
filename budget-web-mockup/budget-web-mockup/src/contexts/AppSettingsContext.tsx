'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';
import { API_CONFIG } from '@/config/api.config';

interface AppSettings {
  currency: string;
  budgetPeriod: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';
  notifications: boolean;
  darkMode: boolean;
  compactView: boolean;
}

interface AppSettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: AppSettings = {
  currency: 'USD',
  budgetPeriod: 'MONTHLY',
  notifications: true,
  darkMode: false,
  compactView: false,
};

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from storage on mount
  useEffect(() => {
    const savedSettings = storage.get<AppSettings>(API_CONFIG.storageKeys.appSettings);
    if (savedSettings) {
      setSettings({ ...defaultSettings, ...savedSettings });
    }
    setIsLoaded(true);
  }, []);

  // Save settings to storage when they change
  useEffect(() => {
    if (isLoaded) {
      storage.set(API_CONFIG.storageKeys.appSettings, settings);
    }
  }, [settings, isLoaded]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

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
