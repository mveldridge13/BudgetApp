import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles';
import {StorageCoordinator} from '../services/storage/StorageCoordinator';

// ProBadge component
const ProBadge = React.memo(({size = 'small'}) => (
  <View
    style={[
      styles.proBadge,
      size === 'large' ? styles.proBadgeLarge : styles.proBadgeSmall,
    ]}>
    <Text
      style={[
        styles.proBadgeText,
        size === 'large' ? styles.proBadgeTextLarge : styles.proBadgeTextSmall,
      ]}>
      PRO
    </Text>
  </View>
));

const SettingsScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();

  const [userProfile, setUserProfile] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [appVersion] = useState('1.0');
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState(null);

  // Memoize storage instances
  const storageCoordinator = useMemo(
    () => StorageCoordinator.getInstance(),
    [],
  );
  const userStorageManager = useMemo(
    () => storageCoordinator.getUserStorageManager(),
    [storageCoordinator],
  );

  const isMountedRef = useRef(true);

  // Progressive storage ready check
  const checkStorageReady = useCallback(async () => {
    const maxRetries = 15;
    let retries = 0;

    return new Promise(resolve => {
      const check = () => {
        const isReady =
          storageCoordinator.isUserStorageInitialized() && userStorageManager;

        if (isReady) {
          resolve(true);
        } else if (retries >= maxRetries) {
          setStorageError('Storage initialization timeout');
          resolve(false);
        } else {
          retries++;

          // Progressive retry intervals
          let delay;
          if (retries <= 3) {
            delay = 50;
          } else if (retries <= 8) {
            delay = 200;
          } else {
            delay = 500;
          }

          setTimeout(check, delay);
        }
      };
      check();
    });
  }, [storageCoordinator, userStorageManager]);

  // Simple data loading - only what we actually use
  const loadSettingsData = useCallback(async () => {
    try {
      const isStorageReady = await checkStorageReady();

      if (!isStorageReady || !isMountedRef.current) {
        return;
      }

      // Load only essential data
      const [userSetup, proStatus] = await Promise.all([
        userStorageManager.getUserData('user_setup').catch(() => null),
        userStorageManager.getUserData('isPro').catch(() => false),
      ]);

      if (!isMountedRef.current) {
        return;
      }

      // Update UI
      if (userSetup) {
        setUserProfile(userSetup);
      }

      setIsPro(proStatus === true || proStatus === 'true');
      setLoading(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      setStorageError('Failed to load settings');
      setLoading(false);
    }
  }, [checkStorageReady, userStorageManager]);

  useEffect(() => {
    isMountedRef.current = true;
    loadSettingsData();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadSettingsData]);

  // Focus effect - reload user profile on focus
  useFocusEffect(
    useCallback(() => {
      if (isMountedRef.current && userStorageManager) {
        const timeoutId = setTimeout(() => {
          userStorageManager
            .getUserData('user_setup')
            .then(userSetup => {
              if (isMountedRef.current && userSetup) {
                setUserProfile(userSetup);
              }
            })
            .catch(console.error);
        }, 100);

        return () => clearTimeout(timeoutId);
      }
    }, [userStorageManager]),
  );

  const handleTogglePro = useCallback(async () => {
    try {
      if (!userStorageManager) {
        Alert.alert('Error', 'Storage not ready. Please try again.');
        return;
      }

      const newProStatus = !isPro;

      // Update UI immediately
      setIsPro(newProStatus);

      const success = await userStorageManager.setUserData(
        'isPro',
        newProStatus,
      );

      if (success) {
        Alert.alert(
          'Pro Status Updated',
          `Pro features are now ${
            newProStatus ? 'enabled' : 'disabled'
          }. This change will take effect throughout the app.`,
          [{text: 'OK'}],
        );
      } else {
        // Revert on failure
        setIsPro(!newProStatus);
        throw new Error('Failed to save Pro status to user storage');
      }
    } catch (error) {
      console.error('Error toggling Pro status:', error);
      Alert.alert('Error', 'Failed to update Pro status. Please try again.');
    }
  }, [isPro, userStorageManager]);

  const handleEditProfile = useCallback(() => {
    navigation.navigate('IncomeSetup', {editMode: true});
  }, [navigation]);

  // Format currency
  const formatCurrency = useCallback(amount => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  }, []);

  // Format income display
  const formatIncomeDisplay = useCallback(
    incomeData => {
      if (!incomeData || !incomeData.income) {
        return '';
      }

      const amount = incomeData.income;
      const frequency = incomeData.frequency || 'monthly';

      switch (frequency) {
        case 'weekly':
          return `${formatCurrency(amount)} / week`;
        case 'fortnightly':
          return `${formatCurrency(amount)} / fortnight`;
        case 'monthly':
          return `${formatCurrency(amount)} / month`;
        default:
          return `${formatCurrency(amount)} / month`;
      }
    },
    [formatCurrency],
  );

  const handleRetry = useCallback(() => {
    setStorageError(null);
    setLoading(true);
    loadSettingsData();
  }, [loadSettingsData]);

  // Show error state
  if (storageError) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Icon name="alert-circle" size={48} color={colors.danger} />
        <Text style={styles.errorText}>{storageError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Simple loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, {paddingTop: insets.top + 20}]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Settings</Text>
              <Text style={styles.headerSubtitle}>Loading...</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pro Features</Text>
          <View style={styles.settingCard}>
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
                      : 'Enable advanced features and analytics'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isPro}
                onValueChange={handleTogglePro}
                trackColor={{
                  false: colors.border,
                  true: colors.warning,
                }}
                thumbColor={isPro ? colors.textWhite : colors.textSecondary}
                ios_backgroundColor={colors.border}
              />
            </View>
          </View>
        </View>

        <View style={styles.placeholderSection}>
          <Text style={styles.placeholderText}>
            More settings will be added here as features are developed.
          </Text>
        </View>

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
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'System',
    color: colors.danger,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
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
  placeholderSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: 'System',
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
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
