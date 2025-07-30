// screens/ModulesScreen.js
import React, {useCallback} from 'react';
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
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles';
import {useAppSettings} from '../contexts/AppSettingsContext';

const ModulesScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();

  // Get module settings from context
  const {moduleSettings, updateModuleSettings, isLoading} = useAppSettings();
  const pokerTrackerEnabled = moduleSettings?.pokerTracker || false;

  const handlePokerTrackerToggle = useCallback(async () => {
    try {
      const newValue = !pokerTrackerEnabled;
      await updateModuleSettings({pokerTracker: newValue});
    } catch (error) {
      console.error('Error toggling Poker Tracker:', error);
      Alert.alert('Error', 'Failed to update module setting. Please try again.');
    }
  }, [pokerTrackerEnabled, updateModuleSettings]);

  const moduleItems = [
    {
      id: 'poker-tracker',
      title: 'Poker Tracker',
      description: 'Track poker tournaments, cash games, and gambling performance',
      icon: 'award',
      enabled: pokerTrackerEnabled,
      onToggle: handlePokerTrackerToggle,
      comingSoon: false,
    },
    // Future modules can be added here
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 20}]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={colors.textWhite} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modules</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.content}>
          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>
              For users who need more than day‑to‑day budgeting, Trend offers specialized add‑on modules that can be purchased individually without upgrading to Pro.
            </Text>
          </View>

          {/* Available Modules */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Modules</Text>

            {moduleItems.map((module) => (
              <View key={module.id} style={styles.moduleCard}>
                <TouchableOpacity
                  style={styles.moduleContent}
                  onPress={module.onToggle}
                  disabled={module.comingSoon && !module.enabled}>
                  <View style={styles.moduleInfo}>
                    <View style={styles.moduleIconContainer}>
                      <Icon
                        name={module.icon}
                        size={20}
                        color={module.enabled ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.moduleText}>
                      <View style={styles.moduleTitleRow}>
                        <Text style={styles.moduleTitle}>{module.title}</Text>
                        {module.comingSoon && !module.enabled && (
                          <View style={styles.comingSoonBadge}>
                            <Text style={styles.comingSoonText}>Coming Soon</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.moduleDescription}>
                        {module.description}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={module.enabled}
                    onValueChange={module.onToggle}
                    trackColor={{
                      false: colors.border,
                      true: colors.primary,
                    }}
                    thumbColor={module.enabled ? colors.textWhite : colors.textSecondary}
                    ios_backgroundColor={colors.border}
                    disabled={(module.comingSoon && !module.enabled) || isLoading}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Help Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Need Help?</Text>
            <View style={styles.helpCard}>
              <Text style={styles.helpText}>
                Modules add extra functionality to your budget app. You can enable or disable them at any time.
                Some modules may require additional setup.
              </Text>
            </View>
          </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textWhite,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  descriptionContainer: {
    marginBottom: 30,
  },
  descriptionText: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 15,
  },
  moduleCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moduleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  moduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  moduleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  moduleText: {
    flex: 1,
  },
  moduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  moduleDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  comingSoonBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  comingSoonText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
  },
  helpCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helpText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default ModulesScreen;
