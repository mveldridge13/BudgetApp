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
  Linking,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles';
import {Platform} from 'react-native';

const SettingsScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();

  // User settings state
  const [userProfile, setUserProfile] = useState(null);
  const [appSettings, setAppSettings] = useState({
    notifications: true,
    biometricAuth: false,
    darkMode: false,
    currency: 'AUD',
    budgetPeriod: 'monthly',
    dataBackup: true,
    expenseCategories: true,
  });

  // App state tracking
  const [appVersion] = useState('1.0');
  const [dataSize, setDataSize] = useState(0);
  const [lastBackup, setLastBackup] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refs for component lifecycle
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  // Load all settings data
  const loadSettingsData = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;

    try {
      const [userSetup, storedSettings, backupInfo, transactions, goals] =
        await Promise.all([
          AsyncStorage.getItem('userSetup'),
          AsyncStorage.getItem('appSettings'),
          AsyncStorage.getItem('lastBackup'),
          AsyncStorage.getItem('transactions'),
          AsyncStorage.getItem('goals'),
        ]);

      if (isMountedRef.current) {
        // Set user profile
        if (userSetup) {
          setUserProfile(JSON.parse(userSetup));
        }

        // Set app settings
        if (storedSettings) {
          setAppSettings(prev => ({...prev, ...JSON.parse(storedSettings)}));
        }

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
      console.error('Error loading settings:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        isLoadingRef.current = false;
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;
    loadSettingsData();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadSettingsData]);

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      if (isMountedRef.current) {
        loadSettingsData();
      }
    }, [loadSettingsData]),
  );

  // Save app settings
  const saveAppSettings = useCallback(async newSettings => {
    try {
      await AsyncStorage.setItem('appSettings', JSON.stringify(newSettings));
      setAppSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  }, []);

  // Settings handlers
  const handleToggleSetting = useCallback(
    key => {
      const newSettings = {...appSettings, [key]: !appSettings[key]};
      saveAppSettings(newSettings);
    },
    [appSettings, saveAppSettings],
  );

  const handleEditProfile = useCallback(() => {
    navigation.navigate('IncomeSetup', {editMode: true});
  }, [navigation]);

  const handleManageCategories = useCallback(() => {
    Alert.alert(
      'Coming Soon',
      'Category management will be available in a future update.',
    );
  }, []);

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

  const handleContactSupport = useCallback(() => {
    const email = 'support@budgetapp.com';
    const subject = 'Budget App Support Request';
    const body = `App Version: ${appVersion}\nDevice: ${Platform.OS}\n\nDescribe your issue:\n`;

    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  }, [appVersion]);

  const handleRateApp = useCallback(() => {
    Alert.alert(
      'Rate App',
      'Thank you for using our app! Please rate us on the App Store.',
    );
  }, []);

  const handlePrivacyPolicy = useCallback(() => {
    Linking.openURL('https://budgetapp.com/privacy');
  }, []);

  const handleTermsOfService = useCallback(() => {
    Linking.openURL('https://budgetapp.com/terms');
  }, []);

  const formatCurrency = useCallback(
    amount => {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: appSettings.currency,
        minimumFractionDigits: 0,
      }).format(amount || 0);
    },
    [appSettings.currency],
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 20}]}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Customize your app experience</Text>

        {/* User Profile Card */}
        {userProfile && (
          <TouchableOpacity
            style={styles.profileCard}
            onPress={handleEditProfile}>
            <View style={styles.profileInfo}>
              <View style={styles.profileAvatar}>
                <Icon name="user" size={24} color={colors.textWhite} />
              </View>
              <View style={styles.profileDetails}>
                <Text style={styles.profileName}>
                  {userProfile.name || 'User'}
                </Text>
                <Text style={styles.profileIncome}>
                  {formatIncomeDisplay(userProfile)}
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textWhite} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        {/* App Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>

          <View style={styles.settingCard}>
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
                value={appSettings.notifications}
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
                value={appSettings.biometricAuth}
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

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconContainer}>
                  <Icon name="moon" size={18} color={colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Dark Mode</Text>
                  <Text style={styles.settingDescription}>
                    Use dark theme throughout the app
                  </Text>
                </View>
              </View>
              <Switch
                value={appSettings.darkMode}
                onValueChange={() => handleToggleSetting('darkMode')}
                trackColor={{
                  false: colors.border,
                  true: colors.primary,
                }}
                thumbColor={
                  appSettings.darkMode ? colors.textWhite : colors.textSecondary
                }
                ios_backgroundColor={colors.border}
              />
            </View>

            <View style={styles.settingDivider} />

            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleManageCategories}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconContainer}>
                  <Icon name="tag" size={18} color={colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Expense Categories</Text>
                  <Text style={styles.settingDescription}>
                    Manage spending categories
                  </Text>
                </View>
              </View>
              <Icon
                name="chevron-right"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Data & Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>

          <View style={styles.settingCard}>
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
                <Text style={styles.dataSize}>{formatDataSize(dataSize)}</Text>
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
                  <Text style={[styles.settingLabel, {color: colors.danger}]}>
                    Clear All Data
                  </Text>
                  <Text style={styles.settingDescription}>
                    Permanently delete all app data
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>

          <View style={styles.settingCard}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleContactSupport}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconContainer}>
                  <Icon name="mail" size={18} color={colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Contact Support</Text>
                  <Text style={styles.settingDescription}>
                    Get help with the app
                  </Text>
                </View>
              </View>
              <Icon
                name="chevron-right"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity style={styles.settingRow} onPress={handleRateApp}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconContainer}>
                  <Icon name="star" size={18} color={colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Rate App</Text>
                  <Text style={styles.settingDescription}>
                    Leave a review on the App Store
                  </Text>
                </View>
              </View>
              <Icon
                name="chevron-right"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <View style={styles.settingCard}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handlePrivacyPolicy}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconContainer}>
                  <Icon name="shield" size={18} color={colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Privacy Policy</Text>
                </View>
              </View>
              <Icon
                name="chevron-right"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleTermsOfService}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconContainer}>
                  <Icon name="file-text" size={18} color={colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Terms of Service</Text>
                </View>
              </View>
              <Icon
                name="chevron-right"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    marginBottom: 20,
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
    marginBottom: 20,
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
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.text,
    marginBottom: 2,
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
});

export default React.memo(SettingsScreen);
