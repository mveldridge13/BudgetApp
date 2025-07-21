/* eslint-disable react/no-unstable-nested-components */
// screens/SettingsScreen.js
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  Share,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles';
import TrendAPIService from '../services/TrendAPIService';
import UserProfileCache from '../services/UserProfileCache';
import BiometricAuth from '../services/BiometricAuth';
import {useAppSettings} from '../contexts/AppSettingsContext';
import {formatCurrencySync} from '../utils/currencyHelper';

const SettingsScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();

  // Get settings from context
  const {
    appSettings,
    userProfile,
    isPro,
    updateAppSettings,
    updateProStatus,
    refreshUserProfile,
    toggleAppSetting,
  } = useAppSettings();

  // App state tracking
  const [appVersion] = useState('1.0');
  const [dataSize, setDataSize] = useState(0);
  const [lastBackup, setLastBackup] = useState(null);

  // Refs for component lifecycle
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  // Load additional data (data size, backup info)
  const loadAdditionalData = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;

    try {
      // Load additional data for data size calculation
      const [backupInfo, transactions, goals] = await Promise.all([
        AsyncStorage.getItem('lastBackup'),
        AsyncStorage.getItem('transactions'),
        AsyncStorage.getItem('goals'),
      ]);

      if (isMountedRef.current) {
        // Calculate data size
        const transactionSize = transactions
          ? JSON.stringify(transactions).length
          : 0;
        const goalsSize = goals ? JSON.stringify(goals).length : 0;
        const totalSize = (transactionSize + goalsSize) / 1024; // KB
        setDataSize(totalSize);

        // Set last backup
        if (backupInfo) {
          setLastBackup(new Date(JSON.parse(backupInfo)));
        }
      }
    } catch (error) {
      console.error('Error loading additional settings data:', error);
    } finally {
      if (isMountedRef.current) {
        isLoadingRef.current = false;
      }
    }
  }, []);

  // Initial load - context handles settings, we just load additional data
  useEffect(() => {
    isMountedRef.current = true;
    loadAdditionalData();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadAdditionalData]);

  // Reload on focus - refresh profile and additional data
  useFocusEffect(
    useCallback(() => {
      if (isMountedRef.current) {
        refreshUserProfile();
        loadAdditionalData();
      }
    }, [refreshUserProfile, loadAdditionalData]),
  );

  // Toggle Pro status
  const handleTogglePro = useCallback(async () => {
    try {
      const newProStatus = !isPro;
      await updateProStatus(newProStatus);

      Alert.alert(
        'Pro Status Updated',
        `Pro features are now ${
          newProStatus ? 'enabled' : 'disabled'
        }. This change will take effect throughout the app.`,
        [{text: 'OK'}],
      );
    } catch (error) {
      console.error('Error toggling Pro status:', error);
      Alert.alert('Error', 'Failed to update Pro status. Please try again.');
    }
  }, [isPro, updateProStatus]);

  // Settings handlers
  const handleToggleSetting = useCallback(
    async key => {
      // Don't allow toggling if settings aren't loaded yet
      if (!appSettings) {
        console.warn('Settings not loaded yet, ignoring toggle');
        return;
      }

      // Special handling for biometric authentication
      if (key === 'biometricAuth') {
        try {
          const isSupported = await BiometricAuth.isBiometricSupported();

          if (!isSupported) {
            Alert.alert(
              'Biometric Authentication Unavailable',
              'Your device does not support biometric authentication or it is not set up.',
              [{text: 'OK'}],
            );
            return;
          }

          const newValue = !appSettings[key];

          if (newValue) {
            // Enabling biometric auth - test it first
            const authResult = await BiometricAuth.promptBiometricAuth(
              'Enable biometric authentication',
            );

            if (authResult.success) {
              await BiometricAuth.setBiometricEnabled(true);
              await updateAppSettings({[key]: true});
            } else {
              Alert.alert(
                'Authentication Failed',
                'Biometric authentication is required to enable this feature.',
                [{text: 'OK'}],
              );
            }
          } else {
            // Disabling biometric auth
            await BiometricAuth.setBiometricEnabled(false);
            await updateAppSettings({[key]: false});
          }
        } catch (error) {
          console.error('Error handling biometric toggle:', error);
          Alert.alert(
            'Error',
            'Failed to update biometric authentication setting. Please try again.',
            [{text: 'OK'}],
          );
        }
      } else {
        // Normal setting toggle using context
        await toggleAppSetting(key);
      }
    },
    [appSettings, updateAppSettings, toggleAppSetting],
  );

  const handleEditProfile = useCallback(async () => {
    // Clear cache before editing to ensure fresh data when returning
    await UserProfileCache.clear();
    navigation.navigate('IncomeSetup', {editMode: true});
  }, [navigation]);

  const handleCurrencySelection = useCallback(() => {
    const currencies = [
      {code: 'AUD', name: 'Australian Dollar', symbol: '$'},
      {code: 'USD', name: 'US Dollar', symbol: '$'},
      {code: 'EUR', name: 'Euro', symbol: '€'},
      {code: 'GBP', name: 'British Pound', symbol: '£'},
      {code: 'CAD', name: 'Canadian Dollar', symbol: '$'},
      {code: 'JPY', name: 'Japanese Yen', symbol: '¥'},
      {code: 'NZD', name: 'New Zealand Dollar', symbol: '$'},
    ];

    const buttons = currencies.map(currency => ({
      text: `${currency.symbol} ${currency.code} - ${currency.name}`,
      onPress: () => {
        updateAppSettings({currency: currency.code});
      },
    }));

    buttons.push({text: 'Cancel', style: 'cancel'});

    Alert.alert(
      'Select Currency',
      'Choose your preferred currency for transactions and balance display',
      buttons,
      {cancelable: true},
    );
  }, [updateAppSettings]);

  const handleAdditionalModule = useCallback(() => {
    navigation.navigate('Modules');
  }, [navigation]);

  const handleExportData = useCallback(async () => {
    try {
      const [transactions, goals, userSetup] = await Promise.all([
        AsyncStorage.getItem('transactions'),
        AsyncStorage.getItem('goals'),
        AsyncStorage.getItem('userSetup'),
      ]);

      const exportData = {
        transactions: transactions ? JSON.parse(transactions) : [],
        goals: goals ? JSON.parse(goals) : [],
        userSetup: userSetup ? JSON.parse(userSetup) : null,
        exportDate: new Date().toISOString(),
        appVersion,
      };

      const dataString = JSON.stringify(exportData, null, 2);

      await Share.share({
        message: dataString,
        title: 'Budget App Data Export',
      });

      // Update last backup
      await AsyncStorage.setItem(
        'lastBackup',
        JSON.stringify(new Date().toISOString()),
      );
      setLastBackup(new Date());
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    }
  }, [appVersion]);

  const handleClearData = useCallback(() => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your transactions, goals, and settings. This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'transactions',
                'goals',
                'userSetup',
                'appSettings',
                'hasSeenBalanceCardTour',
                'hasSeenAddTransactionTour',
                'hasSeenTransactionSwipeTour',
                'lastBackup',
                'isPro',
              ]);

              Alert.alert('Success', 'All data has been cleared.', [
                {
                  text: 'OK',
                  onPress: () =>
                    navigation.reset({
                      index: 0,
                      routes: [{name: 'Welcome'}],
                    }),
                },
              ]);
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            }
          },
        },
      ],
    );
  }, [navigation]);

  const handleLogout = useCallback(() => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await TrendAPIService.logout();
            navigation.reset({
              index: 0,
              routes: [{name: 'Auth'}],
            });
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to log out. Please try again.');
          }
        },
      },
    ]);
  }, [navigation]);

  const formatCurrency = useCallback(
    amount => {
      const currency = appSettings?.currency || 'AUD';
      return formatCurrencySync(amount, currency);
    },
    [appSettings?.currency],
  );

  const formatIncomeDisplay = useCallback(
    incomeData => {
      if (!incomeData || !incomeData.monthlyIncome) {
        return '';
      }

      const amount = incomeData.monthlyIncome;
      const period = incomeData.payPeriod || 'monthly';

      switch (period) {
        case 'weekly':
          return `${formatCurrency(amount / 4.33)} / week`;
        case 'bi-weekly':
          return `${formatCurrency(amount / 2.17)} / bi-weekly`;
        case 'monthly':
          return `${formatCurrency(amount)} / month`;
        case 'annually':
          return `${formatCurrency(amount * 12)} / year`;
        default:
          return `${formatCurrency(amount)} / month`;
      }
    },
    [formatCurrency],
  );

  const formatDataSize = useCallback(sizeInKB => {
    if (sizeInKB < 1) {
      return '< 1 KB';
    }
    if (sizeInKB < 1024) {
      return `${sizeInKB.toFixed(1)} KB`;
    }
    return `${(sizeInKB / 1024).toFixed(1)} MB`;
  }, []);

  // Pro Badge Component
  const ProBadge = ({size = 'small'}) => (
    <View
      style={[
        styles.proBadge,
        size === 'large' ? styles.proBadgeLarge : styles.proBadgeSmall,
      ]}>
      <Text
        style={[
          styles.proBadgeText,
          size === 'large'
            ? styles.proBadgeTextLarge
            : styles.proBadgeTextSmall,
        ]}>
        PRO
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 20}]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>
              Customize your app experience
            </Text>
          </View>
          {isPro && <ProBadge size="large" />}
        </View>

        {/* User Profile Card - Always visible to prevent flicker */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={userProfile ? handleEditProfile : undefined}
          disabled={!userProfile}>
          <View style={styles.profileInfo}>
            <View style={styles.profileAvatar}>
              <Icon name="user" size={24} color={colors.textWhite} />
            </View>
            <View style={styles.profileDetails}>
              {userProfile ? (
                <>
                  <Text style={styles.profileName}>
                    {userProfile.firstName && userProfile.lastName
                      ? `${userProfile.firstName} ${userProfile.lastName}`
                      : userProfile.name || userProfile.email || 'User'}
                  </Text>
                  {userProfile.email && (
                    <Text style={styles.profileEmail}>{userProfile.email}</Text>
                  )}
                  <Text style={styles.profileIncome}>
                    {formatIncomeDisplay(userProfile)}
                  </Text>
                </>
              ) : (
                <>
                  <View style={[styles.skeletonText, styles.skeletonName]} />
                  <View style={[styles.skeletonText, styles.skeletonEmail]} />
                  <View style={[styles.skeletonText, styles.skeletonIncome]} />
                </>
              )}
            </View>
          </View>
          <Icon
            name="chevron-right"
            size={20}
            color={userProfile ? colors.textWhite : colors.textGray}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        {/* Pro Features Section - Testing Only */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pro Features (Testing)</Text>

          <View style={styles.settingCard}>
            {isPro !== null ? (
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <View
                    style={[
                      styles.settingIconContainer,
                      styles.proIconContainer,
                    ]}>
                    <Icon name="star" size={18} color={colors.warning} />
                  </View>
                  <View style={styles.settingText}>
                    <View style={styles.settingLabelRow}>
                      <Text style={styles.settingLabel}>Pro Mode</Text>
                      {isPro && <ProBadge />}
                    </View>
                    <Text style={styles.settingDescription}>
                      {isPro
                        ? 'Advanced analytics and features enabled'
                        : 'Enable to test Pro features and analytics'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isPro || false}
                  onValueChange={handleTogglePro}
                  trackColor={{
                    false: colors.border,
                    true: colors.warning,
                  }}
                  thumbColor={isPro ? colors.textWhite : colors.textSecondary}
                  ios_backgroundColor={colors.border}
                />
              </View>
            ) : (
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <View
                    style={[
                      styles.settingIconContainer,
                      styles.skeletonIcon,
                      styles.proIconContainer,
                    ]}
                  />
                  <View style={styles.settingText}>
                    <View
                      style={[styles.skeletonText, styles.skeletonSettingLabel]}
                    />
                    <View
                      style={[
                        styles.skeletonText,
                        styles.skeletonSettingDescription,
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.skeletonSwitch} />
              </View>
            )}
          </View>
        </View>

        {/* App Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>

          <View style={styles.settingCard}>
            {appSettings ? (
              <>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View style={styles.settingIconContainer}>
                      <Icon name="bell" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={styles.settingLabel}>Notifications</Text>
                      <Text style={styles.settingDescription}>
                        Receive reminders and updates
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={appSettings.notifications || false}
                    onValueChange={() => handleToggleSetting('notifications')}
                    trackColor={{
                      false: colors.border,
                      true: colors.primary,
                    }}
                    thumbColor={
                      appSettings.notifications
                        ? colors.textWhite
                        : colors.textSecondary
                    }
                    ios_backgroundColor={colors.border}
                  />
                </View>

                <View style={styles.settingDivider} />

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View style={styles.settingIconContainer}>
                      <Icon name="shield" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={styles.settingLabel}>
                        Biometric Authentication
                      </Text>
                      <Text style={styles.settingDescription}>
                        Use fingerprint or face unlock
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={appSettings.biometricAuth || false}
                    onValueChange={() => handleToggleSetting('biometricAuth')}
                    trackColor={{
                      false: colors.border,
                      true: colors.primary,
                    }}
                    thumbColor={
                      appSettings.biometricAuth
                        ? colors.textWhite
                        : colors.textSecondary
                    }
                    ios_backgroundColor={colors.border}
                  />
                </View>

                <View style={styles.settingDivider} />

                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => handleCurrencySelection()}>
                  <View style={styles.settingInfo}>
                    <View style={styles.settingIconContainer}>
                      <Icon
                        name="dollar-sign"
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={styles.settingLabel}>Currency</Text>
                      <Text style={styles.settingDescription}>
                        Default currency for transactions
                      </Text>
                    </View>
                  </View>
                  <View style={styles.settingMeta}>
                    <Text style={styles.currencyDisplay}>
                      {appSettings.currency || 'AUD'}
                    </Text>
                    <Icon
                      name="chevron-right"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>

                <View style={styles.settingDivider} />

                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => handleAdditionalModule()}>
                  <View style={styles.settingInfo}>
                    <View style={styles.settingIconContainer}>
                      <Icon name="package" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={styles.settingLabel}>Additional Module</Text>
                      <Text style={styles.settingDescription}>
                        Access additional features and modules
                      </Text>
                    </View>
                  </View>
                  <Icon
                    name="chevron-right"
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Skeleton for Notifications setting */}
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View
                      style={[styles.settingIconContainer, styles.skeletonIcon]}
                    />
                    <View style={styles.settingText}>
                      <View
                        style={[
                          styles.skeletonText,
                          styles.skeletonSettingLabel,
                        ]}
                      />
                      <View
                        style={[
                          styles.skeletonText,
                          styles.skeletonSettingDescription,
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.skeletonSwitch} />
                </View>

                <View style={styles.settingDivider} />

                {/* Skeleton for Biometric Auth setting */}
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View
                      style={[styles.settingIconContainer, styles.skeletonIcon]}
                    />
                    <View style={styles.settingText}>
                      <View
                        style={[
                          styles.skeletonText,
                          styles.skeletonSettingLabel,
                        ]}
                      />
                      <View
                        style={[
                          styles.skeletonText,
                          styles.skeletonSettingDescription,
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.skeletonSwitch} />
                </View>

                <View style={styles.settingDivider} />

                {/* Skeleton for Currency setting */}
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View
                      style={[styles.settingIconContainer, styles.skeletonIcon]}
                    />
                    <View style={styles.settingText}>
                      <View
                        style={[
                          styles.skeletonText,
                          styles.skeletonSettingLabel,
                        ]}
                      />
                      <View
                        style={[
                          styles.skeletonText,
                          styles.skeletonSettingDescription,
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.skeletonCurrency} />
                </View>

                <View style={styles.settingDivider} />

                {/* Skeleton for Additional Module */}
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View
                      style={[styles.settingIconContainer, styles.skeletonIcon]}
                    />
                    <View style={styles.settingText}>
                      <View
                        style={[
                          styles.skeletonText,
                          styles.skeletonSettingLabel,
                        ]}
                      />
                      <View
                        style={[
                          styles.skeletonText,
                          styles.skeletonSettingDescription,
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.skeletonText} />
                </View>
              </>
            )}
          </View>
        </View>

        {/* Data & Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>

          <View style={styles.settingCard}>
            {dataSize !== undefined && lastBackup !== undefined ? (
              <>
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={handleExportData}>
                  <View style={styles.settingInfo}>
                    <View style={styles.settingIconContainer}>
                      <Icon name="download" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={styles.settingLabel}>Export Data</Text>
                      <Text style={styles.settingDescription}>
                        Backup your transactions and goals
                      </Text>
                    </View>
                  </View>
                  <View style={styles.settingMeta}>
                    <Text style={styles.dataSize}>
                      {formatDataSize(dataSize)}
                    </Text>
                    <Icon
                      name="chevron-right"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>

                <View style={styles.settingDivider} />

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View style={styles.settingIconContainer}>
                      <Icon name="cloud" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={styles.settingLabel}>Last Backup</Text>
                      <Text style={styles.settingDescription}>
                        {lastBackup
                          ? lastBackup.toLocaleDateString('en-AU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Never'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.settingDivider} />

                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={handleClearData}>
                  <View style={styles.settingInfo}>
                    <View style={styles.settingIconContainer}>
                      <Icon name="trash-2" size={18} color={colors.danger} />
                    </View>
                    <View style={styles.settingText}>
                      <Text
                        style={[styles.settingLabel, {color: colors.danger}]}>
                        Clear All Data
                      </Text>
                      <Text style={styles.settingDescription}>
                        Permanently delete all app data
                      </Text>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={18} color={colors.danger} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Skeleton for Export Data */}
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View
                      style={[styles.settingIconContainer, styles.skeletonIcon]}
                    />
                    <View style={styles.settingText}>
                      <View
                        style={[
                          styles.skeletonText,
                          styles.skeletonSettingLabel,
                        ]}
                      />
                      <View
                        style={[
                          styles.skeletonText,
                          styles.skeletonSettingDescription,
                        ]}
                      />
                    </View>
                  </View>
                  <View
                    style={[styles.skeletonText, styles.skeletonDataSize]}
                  />
                </View>

                <View style={styles.settingDivider} />

                {/* Skeleton for Last Backup */}
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View
                      style={[styles.settingIconContainer, styles.skeletonIcon]}
                    />
                    <View style={styles.settingText}>
                      <View
                        style={[
                          styles.skeletonText,
                          styles.skeletonSettingLabel,
                        ]}
                      />
                      <View
                        style={[
                          styles.skeletonText,
                          styles.skeletonSettingDescription,
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.settingDivider} />

                {/* Skeleton for Clear Data */}
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View
                      style={[styles.settingIconContainer, styles.skeletonIcon]}
                    />
                    <View style={styles.settingText}>
                      <View
                        style={[
                          styles.skeletonText,
                          styles.skeletonSettingLabel,
                        ]}
                      />
                      <View
                        style={[
                          styles.skeletonText,
                          styles.skeletonSettingDescription,
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.settingCard}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <View style={styles.settingInfo}>
              <View style={styles.settingIconContainer}>
                <Icon name="log-out" size={18} color={colors.error} />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingLabel, styles.logoutText]}>
                  Log Out
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfoCard}>
          <Text style={styles.appVersion}>Version {appVersion}</Text>
          <Text style={styles.appCopyright}>
            © 2025 Trend. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textWhite,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.9,
    letterSpacing: -0.1,
  },
  proBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proBadgeSmall: {
    backgroundColor: colors.warning || '#F59E0B',
  },
  proBadgeLarge: {
    backgroundColor: colors.warning || '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  proBadgeText: {
    fontWeight: 'bold',
    color: colors.textWhite || '#FFFFFF',
    fontFamily: 'System',
  },
  proBadgeTextSmall: {
    fontSize: 10,
  },
  proBadgeTextLarge: {
    fontSize: 12,
  },
  profileCard: {
    backgroundColor: colors.overlayLight,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.overlayDark,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.overlayDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.7,
    marginBottom: 2,
  },
  profileIncome: {
    fontSize: 14,
    fontFamily: 'System',
    color: colors.textWhite,
    opacity: 0.8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 16,
  },
  settingCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  proIconContainer: {
    backgroundColor: colors.warningLight || '#FEF3C7',
  },
  settingText: {
    flex: 1,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.text,
  },
  settingDescription: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  settingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dataSize: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  currencyDisplay: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 68,
  },
  appInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appVersion: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.text,
    marginBottom: 8,
  },
  appCopyright: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  logoutButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  logoutText: {
    color: colors.error,
    fontWeight: '600',
  },
  // Skeleton loading styles
  skeletonText: {
    backgroundColor: colors.textGray + '30', // 30% opacity
    borderRadius: 4,
  },
  skeletonName: {
    height: 20,
    width: '60%',
    marginBottom: 6,
  },
  skeletonEmail: {
    height: 14,
    width: '75%',
    marginBottom: 6,
  },
  skeletonIncome: {
    height: 16,
    width: '40%',
  },
  skeletonIcon: {
    backgroundColor: colors.textGray + '20',
  },
  skeletonSettingLabel: {
    height: 16,
    width: '70%',
    marginBottom: 4,
  },
  skeletonSettingDescription: {
    height: 14,
    width: '90%',
  },
  skeletonSwitch: {
    width: 50,
    height: 30,
    backgroundColor: colors.textGray + '20',
    borderRadius: 15,
  },
  skeletonCurrency: {
    height: 16,
    width: 40,
    borderRadius: 4,
  },
  skeletonDataSize: {
    height: 16,
    width: 50,
    borderRadius: 4,
  },
});

export default React.memo(SettingsScreen);
