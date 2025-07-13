// screens/BiometricUnlockScreen.js
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {colors} from '../styles';
import BiometricAuth from '../services/BiometricAuth';

const BiometricUnlockScreen = ({onUnlock}) => {
  const insets = useSafeAreaInsets();
  const [biometryType, setBiometryType] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  
  // Animation values
  const iconScale = new Animated.Value(1);
  const pulseAnim = new Animated.Value(1);
  const fadeAnim = new Animated.Value(1);

  // Load biometry type on mount
  useEffect(() => {
    const loadBiometryInfo = async () => {
      try {
        const type = await BiometricAuth.getBiometryType();
        setBiometryType(type);
        console.log('🔐 BiometricUnlock: Biometry type:', type);
      } catch (error) {
        console.error('🔐 BiometricUnlock: Error loading biometry info:', error);
      }
    };

    loadBiometryInfo();
  }, []);

  // Start pulse animation
  useEffect(() => {
    const startPulse = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startPulse();
  }, [pulseAnim]);

  // Get biometric icon and text based on type
  const getBiometricInfo = useCallback(() => {
    switch (biometryType) {
      case 'FaceID':
        return {
          icon: 'smile',
          title: 'Face ID',
          subtitle: 'Look at your device to unlock',
        };
      case 'TouchID':
      case 'Fingerprint':
        return {
          icon: 'fingerprint',
          title: 'Touch ID',
          subtitle: 'Touch the fingerprint sensor',
        };
      case 'Biometrics':
        return {
          icon: 'shield',
          title: 'Biometric Authentication',
          subtitle: 'Use your biometric to unlock',
        };
      default:
        return {
          icon: 'lock',
          title: 'Unlock Required',
          subtitle: 'Tap to authenticate',
        };
    }
  }, [biometryType]);

  // Handle biometric authentication
  const handleBiometricAuth = useCallback(async () => {
    if (isAuthenticating) {
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    // Scale animation for user feedback
    Animated.sequence([
      Animated.timing(iconScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(iconScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const result = await BiometricAuth.promptBiometricAuth('Unlock Budget App');
      
      if (result.success) {
        console.log('🔐 BiometricUnlock: Authentication successful');
        setIsUnlocking(true);
        
        // Start data pre-loading immediately
        onUnlock?.();
        
        // Fade out animation with slightly longer duration for smoother transition
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        console.log('🔐 BiometricUnlock: Authentication failed:', result.error);
        setError(result.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('🔐 BiometricUnlock: Authentication error:', error);
      setError('Authentication failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, iconScale, onUnlock]);

  // Auto-trigger biometric prompt on mount
  useEffect(() => {
    // Small delay to ensure smooth screen transition
    const timer = setTimeout(() => {
      handleBiometricAuth();
    }, 500);

    return () => clearTimeout(timer);
  }, [handleBiometricAuth]);

  const biometricInfo = getBiometricInfo();

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      {/* Background Gradient Effect */}
      <View style={styles.backgroundGradient} />
      
      {/* Content with fade animation */}
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* App Logo/Title */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Budget App</Text>
          <Text style={styles.subtitle}>Secure Access Required</Text>
        </View>

        {/* Biometric Icon */}
        <Animated.View 
          style={[
            styles.biometricContainer,
            {
              transform: [
                {scale: pulseAnim},
                {scale: iconScale},
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricAuth}
            disabled={isAuthenticating}
            activeOpacity={0.8}
          >
            <Icon 
              name={biometricInfo.icon} 
              size={48} 
              color={colors.primary} 
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.title}>{biometricInfo.title}</Text>
          <Text style={styles.description}>
            {isUnlocking 
              ? 'Unlocking...' 
              : isAuthenticating 
                ? 'Authenticating...' 
                : biometricInfo.subtitle
            }
          </Text>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Manual Unlock Button */}
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleBiometricAuth}
          disabled={isAuthenticating || isUnlocking}
        >
          <Text style={styles.retryButtonText}>
            {isUnlocking 
              ? 'Unlocking...' 
              : isAuthenticating 
                ? 'Authenticating...' 
                : 'Try Again'
            }
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Your data is protected with biometric authentication
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: colors.primary,
    opacity: 0.05,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '300',
    fontFamily: 'System',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  biometricContainer: {
    marginBottom: 40,
  },
  biometricButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  instructions: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.danger,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
    color: colors.textWhite,
  },
  footer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'System',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default BiometricUnlockScreen;