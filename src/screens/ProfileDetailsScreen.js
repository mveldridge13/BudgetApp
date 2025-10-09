import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Share,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles';
import TrendAPIService from '../services/TrendAPIService';
import BiometricAuth from '../services/BiometricAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserProfileCache from '../services/UserProfileCache';

const ProfileDetailsScreen = ({navigation, route}) => {
  const {userProfile} = route.params || {};
  const insets = useSafeAreaInsets();

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const [lastName, setLastName] = useState(userProfile?.lastName || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Toggle password change with animation
  const togglePasswordChange = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowPasswordChange(!showPasswordChange);
  }, [showPasswordChange]);

  // Handle profile update - Cache first, background sync
  const handleSaveProfile = useCallback(async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    setIsSaving(true);

    try {
      // Update cache immediately for instant UI feedback
      const updatedProfile = {
        ...userProfile,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      };

      if (userProfile?.id) {
        await UserProfileCache.set(userProfile.id, updatedProfile);
      }

      // Show success immediately
      Alert.alert('Success', 'Your profile has been updated.');
      setIsEditing(false);
      setIsSaving(false);

      // Background sync to server
      TrendAPIService.updateUserProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      }).catch(error => {
        console.error('Background sync error:', error);
        // Silently fail - user already saw success
      });
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
      setIsSaving(false);
    }
  }, [firstName, lastName, email, userProfile]);

  // Handle password change
  const handleChangePassword = useCallback(async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation Error', 'Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(
        'Validation Error',
        'New password must be at least 8 characters long.',
      );
      return;
    }

    setIsSaving(true);
    try {
      await TrendAPIService.changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });

      Alert.alert('Success', 'Your password has been changed.');
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password change error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message ||
          'Failed to change password. Please check your current password and try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  // Handle data export (GDPR Article 20 - Right to Data Portability)
  // Cache first: Use locally cached data, then optionally sync from server
  const handleDataExport = useCallback(async () => {
    Alert.alert(
      'Export Your Data',
      'This will export all your personal and financial data in JSON format.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Export',
          onPress: async () => {
            setIsExporting(true);
            try {
              // Gather all cached local data first
              const [
                transactionsData,
                goalsData,
                budgetsData,
                categoriesData,
                userProfileData,
              ] = await Promise.all([
                AsyncStorage.getItem('transactions'),
                AsyncStorage.getItem('goals'),
                AsyncStorage.getItem('budgets'),
                AsyncStorage.getItem('categories'),
                AsyncStorage.getItem(`userProfile_${userProfile?.id}`),
              ]);

              const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                source: 'local_cache',
                user: userProfileData
                  ? JSON.parse(userProfileData)
                  : userProfile,
                transactions: transactionsData
                  ? JSON.parse(transactionsData)
                  : [],
                goals: goalsData ? JSON.parse(goalsData) : [],
                budgets: budgetsData ? JSON.parse(budgetsData) : [],
                categories: categoriesData ? JSON.parse(categoriesData) : [],
              };

              // Convert to formatted JSON string
              const dataString = JSON.stringify(exportData, null, 2);

              // Share using React Native's built-in Share
              await Share.share({
                message: dataString,
                title: 'Trend Budget Data Export',
              });

              Alert.alert(
                'Success',
                'Your data has been exported successfully. The file contains all your transactions, goals, budgets, and personal information.',
              );
            } catch (error) {
              console.error('Data export error:', error);
              if (error.message !== 'User did not share') {
                Alert.alert(
                  'Error',
                  'Failed to export data. Please try again or contact support.',
                );
              }
            } finally {
              setIsExporting(false);
            }
          },
        },
      ],
    );
  }, [userProfile]);

  const confirmAccountDeletion = useCallback(() => {
    Alert.alert(
      'Final Confirmation Required',
      'Are you absolutely sure you want to delete your account?\n\nThis will:\n• Permanently delete all your data\n• Remove your account from our servers within 30 days\n• Cannot be undone\n\nTo confirm, please type DELETE below.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Permanently Delete Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              // Call backend to delete account
              await TrendAPIService.deleteAccount();

              // Clear all local data
              await AsyncStorage.clear();

              // Reset biometric auth
              await BiometricAuth.reset();

              // Navigate to auth screen
              navigation.reset({
                index: 0,
                routes: [{name: 'Auth'}],
              });

              // Show final confirmation
              Alert.alert(
                'Account Deleted',
                'Your account has been permanently deleted. All data will be removed from our servers within 30 days as required by GDPR.\n\nThank you for using Trend Budget.',
              );
            } catch (error) {
              console.error('Account deletion error:', error);
              Alert.alert(
                'Error',
                'Failed to delete account. Please try again or contact support at support@trendbudget.com.',
              );
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }, [navigation]);

  // Handle account deletion (GDPR Article 17 - Right to Erasure)
  const handleDeleteAccount = useCallback(async () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data from our servers.\n\nThis includes:\n• All transactions and budgets\n• Goals and analytics\n• Personal information\n• Account history\n\nThis action cannot be undone.\n\nWould you like to export your data before deletion?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Export & Delete',
          onPress: async () => {
            // First export the data
            setIsExporting(true);
            try {
              const exportData = await TrendAPIService.exportUserData();
              const dataString = JSON.stringify(exportData, null, 2);

              await Share.share({
                message: dataString,
                title: 'Final Data Export Before Account Deletion',
              });

              // Wait a moment, then confirm deletion
              setTimeout(() => confirmAccountDeletion(), 1000);
            } catch (error) {
              console.error('Export before deletion error:', error);
              Alert.alert(
                'Error',
                'Failed to export data. Would you still like to delete your account?',
                [
                  {text: 'Cancel', style: 'cancel'},
                  {
                    text: 'Delete Anyway',
                    style: 'destructive',
                    onPress: confirmAccountDeletion,
                  },
                ],
              );
            } finally {
              setIsExporting(false);
            }
          },
        },
        {
          text: 'Delete Without Export',
          style: 'destructive',
          onPress: confirmAccountDeletion,
        },
      ],
    );
  }, [confirmAccountDeletion]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 20}]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Icon name="chevron-left" size={24} color={colors.textWhite} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account & Privacy</Text>
          {isEditing ? (
            <TouchableOpacity
              onPress={handleSaveProfile}
              style={styles.saveButton}
              disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.textWhite} />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              style={styles.editButton}>
              <Icon name="edit-2" size={18} color={colors.textWhite} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter first name"
                placeholderTextColor={colors.textSecondary}
                editable={isEditing}
              />
            </View>

            <View style={styles.inputDivider} />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter last name"
                placeholderTextColor={colors.textSecondary}
                editable={isEditing}
              />
            </View>

            <View style={styles.inputDivider} />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={isEditing}
              />
            </View>
          </View>

          {isEditing && (
            <Text style={styles.helpText}>
              Note: Changing your email will require verification.
            </Text>
          )}
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={togglePasswordChange}>
              <View style={styles.actionLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    {backgroundColor: colors.primaryLight},
                  ]}>
                  <Icon name="lock" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.actionLabel}>Change Password</Text>
                  <Text style={styles.actionDescription}>
                    Update your account password
                  </Text>
                </View>
              </View>
              <Icon
                name={showPasswordChange ? 'chevron-up' : 'chevron-right'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {showPasswordChange && (
              <>
                <View style={styles.inputDivider} />

                <View style={styles.passwordChangeForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Current Password</Text>
                    <TextInput
                      style={styles.input}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Enter current password"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputDivider} />

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password (min 8 characters)"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputDivider} />

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter new password"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.passwordSubmitButton}
                    onPress={handleChangePassword}
                    disabled={isSaving}>
                    {isSaving ? (
                      <ActivityIndicator size="small" color={colors.textWhite} />
                    ) : (
                      <Text style={styles.passwordSubmitText}>
                        Update Password
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Data & Privacy Section (GDPR Compliance) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          <Text style={styles.sectionSubtitle}>
            Your rights under GDPR and CCPA
          </Text>

          <View style={styles.card}>
            {/* Export Data */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleDataExport}
              disabled={isExporting}>
              <View style={styles.actionLeft}>
                <View style={[styles.iconContainer, styles.exportIconBg]}>
                  <Icon name="download" size={18} color="#2196F3" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionLabel}>Export My Data</Text>
                  <Text style={styles.actionDescription}>
                    Download all your data in JSON format
                  </Text>
                </View>
              </View>
              {isExporting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon
                  name="chevron-right"
                  size={20}
                  color={colors.textSecondary}
                />
              )}
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            {/* Delete Account */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleDeleteAccount}
              disabled={isDeleting}>
              <View style={styles.actionLeft}>
                <View style={[styles.iconContainer, styles.deleteIconBg]}>
                  <Icon name="trash-2" size={18} color={colors.danger} />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionLabel, {color: colors.danger}]}>
                    Delete My Account
                  </Text>
                  <Text style={styles.actionDescription}>
                    Permanently delete all your data
                  </Text>
                </View>
              </View>
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Icon name="chevron-right" size={20} color={colors.danger} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.privacyNote}>
            <Icon name="shield" size={16} color={colors.textSecondary} />
            <Text style={styles.privacyNoteText}>
              Your data is stored securely and will never be sold to third
              parties. You have full control over your information at all times.
            </Text>
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Created</Text>
              <Text style={styles.infoValue}>
                {userProfile?.createdAt
                  ? new Date(userProfile.createdAt).toLocaleDateString(
                      'en-AU',
                      {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      },
                    )
                  : 'N/A'}
              </Text>
            </View>

            <View style={styles.inputDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue}>{userProfile?.id || 'N/A'}</Text>
            </View>

            <View style={styles.inputDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Currency</Text>
              <Text style={styles.infoValue}>
                {userProfile?.currency || 'AUD'}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
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
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textWhite,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  editButton: {
    padding: 4,
  },
  saveButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.overlayLight,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputGroup: {
    paddingVertical: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.text,
    paddingVertical: 8,
  },
  inputDisabled: {
    color: colors.textSecondary,
  },
  inputDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  helpText: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.text,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  gdprNote: {
    fontSize: 11,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.primary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  passwordChangeForm: {
    paddingTop: 8,
  },
  passwordFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  passwordFormTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.text,
  },
  passwordSubmitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  passwordSubmitText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.text,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.text,
  },
  exportIconBg: {
    backgroundColor: '#E3F2FD',
  },
  deleteIconBg: {
    backgroundColor: '#FFEBEE',
  },
  bottomSpacer: {
    height: 400,
  },
});

export default ProfileDetailsScreen;
