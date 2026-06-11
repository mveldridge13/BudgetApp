'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { storage } from '@/lib/storage';
import { API_CONFIG } from '@/config/api.config';
import { useAuth } from './AuthContext';

interface AppSettings {
  currency: string;
  notifications: boolean;
  darkMode: boolean;
  compactView: boolean;
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
      setSettings({ ...defaultSettings, ...savedSettings });
    }
    setIsLoaded(true);
  }, []);

  // Sync currency from user profile (backend is source of truth)
  useEffect(() => {
    if (user?.currency && !initializedFromUser.current) {
      setSettings((prev) => ({ ...prev, currency: user.currency }));
      initializedFromUser.current = true;
    }
  }, [user?.currency]);

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
